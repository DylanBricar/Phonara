//! Compatibility adapter over handy-recorder's bounded real-time capture path.
//!
//! Keep Phonara's public recorder API and device identities while delegating
//! native capture, the ring, resampling, watchdog and bounded teardown upstream.

use std::{
    io::Error,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
};

use cpal::traits::DeviceTrait;
use handy_recorder::{Channels, EndReason, ErrorKind, Recorder, RecorderConfig, Stopped};

use crate::audio_toolkit::VoiceActivityDetector;

pub use super::sink::{AudioFrameCallback, VadPolicy};
use super::sink::{CaptureSink, CaptureVad, LevelCallback};

enum Session {
    Idle(Option<CaptureVad>),
    Recording,
    /// Keep the real PCM/VAD here while an empty sink drains native audio.
    /// Stopping that discard sink is the public ring barrier before resume.
    Paused {
        sink: Box<CaptureSink>,
        draining: bool,
    },
    /// The delivery worker could not return its sink; never reuse its detector.
    Lost,
}

pub struct AudioRecorder {
    recorder: Option<Recorder<CaptureSink>>,
    session: Mutex<Session>,
    frame_samples: usize,
    level_cb: Option<LevelCallback>,
    audio_cb: Option<AudioFrameCallback>,
    pause_flag: Option<Arc<AtomicBool>>,
    selected_channel: Option<u16>,
    stream_error: Arc<AtomicBool>,
    rebuild_required: AtomicBool,
}

impl AudioRecorder {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            recorder: None,
            session: Mutex::new(Session::Idle(None)),
            frame_samples: 480,
            level_cb: None,
            audio_cb: None,
            pause_flag: None,
            selected_channel: None,
            stream_error: Arc::new(AtomicBool::new(false)),
            rebuild_required: AtomicBool::new(false),
        })
    }

    pub fn with_vad(
        mut self,
        detector: Box<dyn VoiceActivityDetector>,
        offline_hangover_frames: usize,
        streaming_hangover_frames: usize,
    ) -> Self {
        let vad = CaptureVad::new(detector, offline_hangover_frames, streaming_hangover_frames);
        self.frame_samples = vad.frame_samples;
        self.session = Mutex::new(Session::Idle(Some(vad)));
        self
    }

    pub fn with_level_callback<F>(mut self, callback: F) -> Self
    where
        F: Fn(Vec<f32>) + Send + Sync + 'static,
    {
        self.level_cb = Some(Arc::new(callback));
        self
    }

    pub fn with_audio_callback<F>(mut self, callback: F) -> Self
    where
        F: Fn(&[f32]) + Send + Sync + 'static,
    {
        self.audio_cb = Some(Arc::new(callback));
        self
    }

    pub fn with_selected_channel(mut self, channel: Option<u16>) -> Self {
        self.set_selected_channel(channel);
        self
    }

    pub fn with_pause_flag(mut self, flag: Arc<AtomicBool>) -> Self {
        self.pause_flag = Some(flag);
        self
    }

    pub fn set_selected_channel(&mut self, channel: Option<u16>) {
        self.selected_channel = channel;
    }

    pub fn open(&mut self, device: Option<cpal::Device>) -> Result<(), Box<dyn std::error::Error>> {
        if self.requires_rebuild() {
            return Err(Box::new(Error::other(
                "Capture adapter must be rebuilt after audio processing failed",
            )));
        }
        if self.recorder.is_some() {
            if !self.needs_reopen() {
                return Ok(());
            }
            let _ = self.close();
        }
        // Both CPAL versions expose the OS endpoint identity. Never resolve by
        // friendly name: two microphones can share it, and Corsair can rename it.
        let device_id = device
            .map(|device| device.id().map(|id| id.to_string()))
            .transpose()?;
        let open = |channel| {
            open_capture_attempt(
                recording_config(device_id.clone(), channel, self.frame_samples),
                Recorder::open_with_failure_handler,
            )
        };
        let (recorder, failed) =
            open_with_channel_fallback(self.selected_channel, open).map_err(capture_error)?;
        log::info!(
            "Opened handy-recorder microphone id={} native={}Hz/{}ch speech={}Hz/{}ch chunk={}",
            recorder.info().device.id,
            recorder.info().device_format.sample_rate,
            recorder.info().device_format.channels,
            recorder.info().format.sample_rate,
            recorder.info().format.channels,
            recorder.info().frames_per_chunk,
        );
        self.stream_error = failed;
        self.recorder = Some(recorder);
        Ok(())
    }

    pub fn start(
        &self,
        vad_policy: VadPolicy,
    ) -> Result<mpsc::Receiver<()>, Box<dyn std::error::Error>> {
        let recorder = self
            .recorder
            .as_ref()
            .ok_or_else(|| Error::other("Recorder is not open"))?;
        let mut session = self
            .session
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        let previous = std::mem::replace(&mut *session, Session::Lost);
        let vad = match previous {
            Session::Idle(vad) => vad,
            other => {
                *session = other;
                return Err(Box::new(Error::other(
                    "A recording is already active or unavailable",
                )));
            }
        };
        let (ready, receiver) = mpsc::channel();
        let sink = CaptureSink::new(
            vad,
            vad_policy,
            self.level_cb.clone(),
            self.audio_cb.clone(),
            self.pause_flag.clone(),
            ready,
        );
        match recorder.start(sink) {
            Ok(()) => {
                *session = Session::Recording;
                Ok(receiver)
            }
            Err(error) => {
                *session = Session::Idle(error.sink.into_vad());
                self.stream_error.store(true, Ordering::Release);
                Err(capture_error(error.error))
            }
        }
    }

    /// Bracket a pause using real recorder segments, so audio buffered while
    /// paused cannot leak through the ring after the user resumes.
    pub fn set_paused(&self, paused: bool) -> Result<(), Box<dyn std::error::Error>> {
        let recorder = self
            .recorder
            .as_ref()
            .ok_or_else(|| Error::other("Recorder is not open"))?;
        let mut session = self
            .session
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        let previous = std::mem::replace(&mut *session, Session::Lost);
        match (paused, previous) {
            (true, Session::Recording) => {
                match recorder.stop() {
                    Ok(stopped) => {
                        self.note_end(&stopped);
                        // First drain all audio captured before the pause
                        // boundary, including the resampler's partial tail.
                        self.store_pause(true);
                        let sink = Box::new(stopped.sink);
                        match recorder.start(CaptureSink::discard()) {
                            Ok(()) => {
                                *session = Session::Paused {
                                    sink,
                                    draining: true,
                                };
                                Ok(())
                            }
                            Err(error) => {
                                *session = Session::Paused {
                                    sink,
                                    draining: false,
                                };
                                self.stream_error.store(true, Ordering::Release);
                                Err(capture_error(error.error))
                            }
                        }
                    }
                    Err(error) => {
                        self.store_pause(true);
                        self.mark_lost();
                        Err(capture_error(error))
                    }
                }
            }
            (false, Session::Paused { mut sink, draining }) => {
                if draining {
                    match recorder.stop() {
                        Ok(stopped) => self.note_end(&stopped),
                        Err(error) => {
                            // The real sink is still owned here, so a later
                            // stop can recover its PCM even if the barrier fails.
                            *session = Session::Paused {
                                sink,
                                draining: false,
                            };
                            self.mark_lost();
                            return Err(capture_error(error));
                        }
                    }
                }
                sink.resume();
                self.store_pause(false);
                match recorder.start(*sink) {
                    Ok(()) => {
                        *session = Session::Recording;
                        Ok(())
                    }
                    Err(error) => {
                        self.store_pause(true);
                        *session = Session::Paused {
                            sink: Box::new(error.sink),
                            draining: false,
                        };
                        self.stream_error.store(true, Ordering::Release);
                        Err(capture_error(error.error))
                    }
                }
            }
            (_, other) => {
                *session = other;
                Ok(())
            }
        }
    }

    pub fn stop(&self) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let recorder = self
            .recorder
            .as_ref()
            .ok_or_else(|| Error::other("Recorder is not open"))?;
        let mut session = self
            .session
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        let previous = std::mem::replace(&mut *session, Session::Lost);
        let sink = match previous {
            Session::Recording => match recorder.stop() {
                Ok(stopped) => {
                    self.note_end(&stopped);
                    stopped.sink
                }
                Err(error) => {
                    self.mark_lost();
                    return Err(capture_error(error));
                }
            },
            Session::Paused { sink, draining } => {
                if draining {
                    match recorder.stop() {
                        Ok(stopped) => self.note_end(&stopped),
                        Err(error) => {
                            self.mark_lost();
                            log::warn!("Paused capture drain failed; preserving previously recorded audio: {error}");
                        }
                    }
                }
                *sink
            }
            other => {
                *session = other;
                return Err(Box::new(Error::other("There is no recording to stop")));
            }
        };
        let (samples, vad) = sink.finish();
        *session = Session::Idle(vad);
        self.store_pause(false);
        Ok(samples)
    }

    fn note_end(&self, stopped: &Stopped<CaptureSink>) {
        match &stopped.end_reason {
            EndReason::StopCalled => {}
            EndReason::RecorderFailed(error) => {
                self.stream_error.store(true, Ordering::Release);
                log::warn!(
                    "Recording ended after microphone failure; preserving captured audio: {error}"
                );
            }
            EndReason::SinkPanicked(message) => {
                self.rebuild_required.store(true, Ordering::Release);
                log::error!(
                    "Recording audio processing panicked; preserving captured audio: {message}"
                );
            }
        }
        if stopped.dropped_frames > 0 {
            log::warn!(
                "Microphone capture lost {} native frames because its bounded audio ring was full",
                stopped.dropped_frames,
            );
        }
    }

    fn mark_lost(&self) {
        self.stream_error.store(true, Ordering::Release);
        self.rebuild_required.store(true, Ordering::Release);
    }

    fn store_pause(&self, paused: bool) {
        if let Some(flag) = &self.pause_flag {
            flag.store(paused, Ordering::Release);
        }
    }

    pub fn needs_reopen(&self) -> bool {
        self.stream_error.load(Ordering::Acquire) || self.requires_rebuild()
    }

    /// A stalled/panicked sink must get a new VAD rather than borrowing a detector
    /// that may still belong to an abandoned native inference call.
    pub fn requires_rebuild(&self) -> bool {
        self.rebuild_required.load(Ordering::Acquire)
            || matches!(
                *self
                    .session
                    .lock()
                    .unwrap_or_else(|error| error.into_inner()),
                Session::Lost
            )
    }

    pub fn close(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let active = matches!(
            *self
                .session
                .lock()
                .unwrap_or_else(|error| error.into_inner()),
            Session::Recording | Session::Paused { .. }
        );
        let stop_error = if active { self.stop().err() } else { None };
        let close_result = match self.recorder.take() {
            Some(recorder) => recorder.close().map_err(capture_error),
            None => Ok(()),
        };
        if let Some(error) = stop_error {
            return Err(error);
        }
        close_result
    }

    pub fn preferred_input_channel_count(
        device: &cpal::Device,
    ) -> Result<u16, Box<dyn std::error::Error>> {
        // The new recorder runs at the OS's native format.
        Ok(device.default_input_config()?.channels())
    }
}

impl Drop for AudioRecorder {
    fn drop(&mut self) {
        if let Err(error) = self.close() {
            log::warn!("Closing microphone capture adapter failed: {error}");
        }
    }
}

fn recording_config(
    device: Option<String>,
    channel: Option<u16>,
    frame_samples: usize,
) -> RecorderConfig {
    RecorderConfig {
        device,
        channels: channel.map_or(Channels::MixToMono, Channels::Only),
        frames_per_chunk: Some(frame_samples),
        ..RecorderConfig::speech()
    }
}

fn open_with_channel_fallback<T>(
    selected: Option<u16>,
    mut open: impl FnMut(Option<u16>) -> Result<T, handy_recorder::Error>,
) -> Result<T, handy_recorder::Error> {
    match open(selected) {
        Err(error) if error.kind() == ErrorKind::InvalidChannel => {
            log::warn!("Selected microphone channel is unavailable; averaging all channels");
            open(None)
        }
        result => result,
    }
}

type CaptureFailureHandler = Box<dyn FnOnce(handy_recorder::Error) + Send + 'static>;
type OpenCapture = (Recorder<CaptureSink>, Arc<AtomicBool>);

fn open_capture_attempt(
    config: RecorderConfig,
    open: impl FnOnce(
        RecorderConfig,
        CaptureFailureHandler,
    ) -> Result<Recorder<CaptureSink>, handy_recorder::Error>,
) -> Result<OpenCapture, handy_recorder::Error> {
    // Notification runs on its own thread and can outlive close. Each open,
    // including a channel fallback, needs a flag private to that attempt.
    let failed = Arc::new(AtomicBool::new(false));
    let callback_failed = Arc::clone(&failed);
    let recorder = open(
        config,
        Box::new(move |error| {
            log::warn!("Microphone capture failed: {error}");
            callback_failed.store(true, Ordering::Release);
        }),
    )?;
    Ok((recorder, failed))
}

fn capture_error(error: handy_recorder::Error) -> Box<dyn std::error::Error> {
    match error.kind() {
        ErrorKind::PermissionDenied => Box::new(Error::new(
            std::io::ErrorKind::PermissionDenied,
            format!("Microphone permission denied: {error}"),
        )),
        ErrorKind::DeviceUnavailable => Box::new(Error::new(
            std::io::ErrorKind::NotFound,
            format!("No input device found: {error}"),
        )),
        _ => Box::new(error),
    }
}

pub fn is_microphone_access_denied(error_message: &str) -> bool {
    let normalized = error_message.to_lowercase();
    normalized.contains("access is denied")
        || normalized.contains("access was denied")
        || normalized.contains("permission denied")
        || normalized.contains("0x80070005")
}

pub fn is_no_input_device_error(error_message: &str) -> bool {
    let normalized = error_message.to_lowercase();
    normalized.contains("no input device")
        || (normalized.contains("failed to fetch preferred config")
            && normalized.contains("coreaudio"))
}

#[cfg(test)]
#[path = "recorder/tests.rs"]
mod tests;
