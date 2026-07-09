use std::{
    io::Error,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    time::{Duration, Instant},
};

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, Sample, SizedSample,
};

use crate::audio_toolkit::{
    audio::{AudioVisualiser, FrameResampler},
    constants,
    vad::{self, VadFrame},
    VoiceActivityDetector,
};

enum Cmd {
    /// Begin capturing. Carries the send timestamp so the consumer can log how
    /// long the command sat in the channel (and how much audio was dropped
    /// before it was seen).
    Start(VadPolicy, Instant),
    Stop(mpsc::Sender<Vec<f32>>),
    Shutdown,
}

enum AudioChunk {
    Samples(Vec<f32>),
    EndOfStream,
}

/// How 16 kHz mono frames should be filtered for one recording session.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum VadPolicy {
    /// Bypass VAD and forward every frame.
    Disabled,
    /// Current offline-tuned VAD profile.
    Offline,
    /// VAD profile with a longer post-speech tail for streaming-capable models.
    Streaming,
}

/// A single VAD engine plus the two hangover-tail lengths its smoothing wrapper
/// should use. The offline and streaming policies are never active
/// concurrently, so one detector is reconfigured per session (see `Cmd::Start`)
/// rather than kept as two resident engines.
#[derive(Clone)]
struct VadConfig {
    detector: Arc<Mutex<Box<dyn vad::VoiceActivityDetector>>>,
    offline_hangover_frames: usize,
    streaming_hangover_frames: usize,
}

impl VadConfig {
    /// Post-speech hangover tail (in 30 ms frames) for the given policy.
    /// `Disabled` never reaches the detector, so it maps to the offline value.
    fn hangover_for(&self, policy: VadPolicy) -> usize {
        match policy {
            VadPolicy::Streaming => self.streaming_hangover_frames,
            VadPolicy::Offline | VadPolicy::Disabled => self.offline_hangover_frames,
        }
    }
}

/// Callback invoked with each 16 kHz mono frame that passes the active capture
/// policy while recording. Used to feed a live streaming transcription as audio arrives.
pub type AudioFrameCallback = Arc<dyn Fn(&[f32]) + Send + Sync + 'static>;

pub struct AudioRecorder {
    device: Option<Device>,
    cmd_tx: Option<mpsc::Sender<Cmd>>,
    worker_handle: Option<std::thread::JoinHandle<()>>,
    vad: Option<VadConfig>,
    level_cb: Option<Arc<dyn Fn(Vec<f32>) + Send + Sync + 'static>>,
    audio_cb: Option<AudioFrameCallback>,
    pause_flag: Option<Arc<AtomicBool>>,
    selected_channel: Option<usize>,
    /// Preferred stream config cached per device name. The HAL property queries
    /// in `get_preferred_config` are on the keypress-to-capture path in
    /// on-demand mode, so cache the accepted config and clear it on open failure.
    config_cache: Arc<Mutex<Option<(String, cpal::SupportedStreamConfig)>>>,
}

impl AudioRecorder {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(AudioRecorder {
            device: None,
            cmd_tx: None,
            worker_handle: None,
            vad: None,
            level_cb: None,
            audio_cb: None,
            pause_flag: None,
            selected_channel: None,
            config_cache: Arc::new(Mutex::new(None)),
        })
    }

    /// Attach a single VAD engine, reconfigured per session for the offline vs
    /// streaming hangover tail. The two policies are mutually exclusive within a
    /// recording, so one engine covers both instead of two resident instances.
    pub fn with_vad(
        mut self,
        detector: Box<dyn VoiceActivityDetector>,
        offline_hangover_frames: usize,
        streaming_hangover_frames: usize,
    ) -> Self {
        self.vad = Some(VadConfig {
            detector: Arc::new(Mutex::new(detector)),
            offline_hangover_frames,
            streaming_hangover_frames,
        });
        self
    }

    pub fn with_level_callback<F>(mut self, cb: F) -> Self
    where
        F: Fn(Vec<f32>) + Send + Sync + 'static,
    {
        self.level_cb = Some(Arc::new(cb));
        self
    }

    /// Register a callback that receives real-time 16 kHz frames after the active
    /// VAD policy has been applied. Keep the callback cheap so it never stalls capture.
    pub fn with_audio_callback<F>(mut self, cb: F) -> Self
    where
        F: Fn(&[f32]) + Send + Sync + 'static,
    {
        self.audio_cb = Some(Arc::new(cb));
        self
    }

    pub fn with_pause_flag(mut self, flag: Arc<AtomicBool>) -> Self {
        self.pause_flag = Some(flag);
        self
    }

    pub fn with_selected_channel(mut self, channel: Option<u16>) -> Self {
        self.selected_channel = channel.map(|c| c as usize);
        self
    }

    pub fn open(&mut self, device: Option<Device>) -> Result<(), Box<dyn std::error::Error>> {
        if self.worker_handle.is_some() {
            return Ok(()); // already open
        }

        let (sample_tx, sample_rx) = mpsc::channel::<AudioChunk>();
        let (cmd_tx, cmd_rx) = mpsc::channel::<Cmd>();
        let (init_tx, init_rx) = mpsc::sync_channel::<Result<(), String>>(1);

        let host = crate::audio_toolkit::get_cpal_host();
        let device = match device {
            Some(dev) => dev,
            None => host
                .default_input_device()
                .ok_or_else(|| Error::new(std::io::ErrorKind::NotFound, "No input device found"))?,
        };

        let thread_device = device.clone();
        let vad = self.vad.clone();
        let level_cb = self.level_cb.clone();
        let audio_cb = self.audio_cb.clone();
        let pause_flag = self.pause_flag.clone();
        let selected_channel = self.selected_channel;
        let config_cache = Arc::clone(&self.config_cache);

        let worker = std::thread::spawn(move || {
            let stop_flag = Arc::new(AtomicBool::new(false));
            let stop_flag_for_stream = stop_flag.clone();
            let init_result = (|| -> Result<(cpal::Stream, u32), String> {
                let config_started = Instant::now();
                let device_name = thread_device.name().unwrap_or_default();
                let cached_config = config_cache
                    .lock()
                    .unwrap()
                    .as_ref()
                    .filter(|(name, _)| !device_name.is_empty() && *name == device_name)
                    .map(|(_, cfg)| cfg.clone());
                let config_was_cached = cached_config.is_some();
                let config = match cached_config {
                    Some(cfg) => cfg,
                    None => AudioRecorder::get_preferred_config(&thread_device)
                        .map_err(|e| format!("Failed to fetch preferred config: {e}"))?,
                };
                let config_elapsed = config_started.elapsed();

                let sample_rate = config.sample_rate().0;
                let channels = config.channels() as usize;

                log::info!(
                    "Using device: {:?}\nSample rate: {}\nChannels: {}\nFormat: {:?}",
                    thread_device.name(),
                    sample_rate,
                    channels,
                    config.sample_format()
                );

                let sample_tx_i16 = sample_tx.clone();
                let stop_i16 = stop_flag_for_stream.clone();

                let build_started = Instant::now();
                let stream_result = match config.sample_format() {
                    cpal::SampleFormat::U8 => AudioRecorder::build_stream::<u8>(
                        &thread_device,
                        &config,
                        sample_tx,
                        channels,
                        stop_flag_for_stream,
                        selected_channel,
                        pause_flag.clone(),
                    ),
                    cpal::SampleFormat::I8 => AudioRecorder::build_stream::<i8>(
                        &thread_device,
                        &config,
                        sample_tx,
                        channels,
                        stop_flag_for_stream,
                        selected_channel,
                        pause_flag.clone(),
                    ),
                    cpal::SampleFormat::I16 => AudioRecorder::build_stream::<i16>(
                        &thread_device,
                        &config,
                        sample_tx,
                        channels,
                        stop_flag_for_stream,
                        selected_channel,
                        pause_flag.clone(),
                    ),
                    cpal::SampleFormat::I32 => AudioRecorder::build_stream::<i32>(
                        &thread_device,
                        &config,
                        sample_tx,
                        channels,
                        stop_flag_for_stream,
                        selected_channel,
                        pause_flag.clone(),
                    ),
                    cpal::SampleFormat::F32 => AudioRecorder::build_stream::<f32>(
                        &thread_device,
                        &config,
                        sample_tx,
                        channels,
                        stop_flag_for_stream,
                        selected_channel,
                        pause_flag.clone(),
                    ),
                    sample_format => {
                        return Err(format!("Unsupported sample format: {sample_format:?}"));
                    }
                };
                let build_elapsed = build_started.elapsed();

                let stream = match stream_result {
                    Ok(s) => s,
                    Err(e) if config.sample_format() != cpal::SampleFormat::I16 => {
                        log::warn!(
                            "Failed with {:?} format, retrying with I16: {e}",
                            config.sample_format()
                        );
                        AudioRecorder::build_stream::<i16>(
                            &thread_device,
                            &config,
                            sample_tx_i16,
                            channels,
                            stop_i16,
                            selected_channel,
                            pause_flag.clone(),
                        )
                        .map_err(|e| format!("Failed to build input stream: {e}"))?
                    }
                    Err(e) => return Err(format!("Failed to build input stream: {e}")),
                };

                let play_started = Instant::now();
                stream
                    .play()
                    .map_err(|e| format!("Failed to start microphone stream: {e}"))?;
                log::debug!(
                    "mic worker init: fetch_config={:?} (cached={}) build_stream={:?} play={:?}",
                    config_elapsed,
                    config_was_cached,
                    build_elapsed,
                    play_started.elapsed()
                );

                // The device accepted this config; remember it so the next
                // open skips the HAL property queries entirely.
                if !config_was_cached && !device_name.is_empty() {
                    *config_cache.lock().unwrap() = Some((device_name, config));
                }

                Ok((stream, sample_rate))
            })();

            match init_result {
                Ok((stream, sample_rate)) => {
                    let _ = init_tx.send(Ok(()));
                    let stream_running_at = Instant::now();
                    run_consumer(
                        sample_rate,
                        vad,
                        sample_rx,
                        cmd_rx,
                        level_cb,
                        audio_cb,
                        stop_flag,
                        stream_running_at,
                    );
                    drop(stream);
                }
                Err(error_message) => {
                    // A failed open may mean the cached config went stale
                    // (device re-plugged, rate/format changed in the OS).
                    // Drop it so the next attempt re-queries the device.
                    *config_cache.lock().unwrap() = None;
                    log::error!("{error_message}");
                    let _ = init_tx.send(Err(error_message));
                }
            }
        });

        match init_rx.recv() {
            Ok(Ok(())) => {
                self.device = Some(device);
                self.cmd_tx = Some(cmd_tx);
                self.worker_handle = Some(worker);
                Ok(())
            }
            Ok(Err(error_message)) => {
                let _ = worker.join();
                let kind = if is_microphone_access_denied(&error_message) {
                    std::io::ErrorKind::PermissionDenied
                } else {
                    std::io::ErrorKind::Other
                };
                Err(Box::new(Error::new(kind, error_message)))
            }
            Err(recv_error) => {
                let _ = worker.join();
                Err(Box::new(Error::other(format!(
                    "Failed to initialize microphone worker: {recv_error}"
                ))))
            }
        }
    }

    pub fn start(&self, vad_policy: VadPolicy) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(tx) = &self.cmd_tx {
            tx.send(Cmd::Start(vad_policy, Instant::now()))?;
        }
        Ok(())
    }

    pub fn stop(&self) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let (resp_tx, resp_rx) = mpsc::channel();
        if let Some(tx) = &self.cmd_tx {
            tx.send(Cmd::Stop(resp_tx))?;
        }
        Ok(resp_rx.recv()?) // wait for the samples
    }

    pub fn close(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(tx) = self.cmd_tx.take() {
            let _ = tx.send(Cmd::Shutdown);
        }
        if let Some(h) = self.worker_handle.take() {
            let _ = h.join();
        }
        self.device = None;
        Ok(())
    }

    fn build_stream<T>(
        device: &cpal::Device,
        config: &cpal::SupportedStreamConfig,
        sample_tx: mpsc::Sender<AudioChunk>,
        channels: usize,
        stop_flag: Arc<AtomicBool>,
        selected_channel: Option<usize>,
        pause_flag: Option<Arc<AtomicBool>>,
    ) -> Result<cpal::Stream, cpal::BuildStreamError>
    where
        T: Sample + SizedSample + Send + 'static,
        f32: cpal::FromSample<T>,
    {
        // Resolve the effective channel index (clamp to valid range)
        let effective_channel = selected_channel.and_then(|ch| {
            if ch < channels {
                Some(ch)
            } else {
                log::warn!(
                    "Selected channel {} exceeds device channels {}, averaging all",
                    ch,
                    channels
                );
                None
            }
        });

        let mut output_buffer = Vec::new();
        let mut eos_sent = false;

        let stream_cb = move |data: &[T], _: &cpal::InputCallbackInfo| {
            if stop_flag.load(Ordering::Relaxed) {
                if !eos_sent {
                    let _ = sample_tx.send(AudioChunk::EndOfStream);
                    eos_sent = true;
                }
                return;
            }
            eos_sent = false;

            // When paused, discard incoming audio samples
            if pause_flag
                .as_ref()
                .map(|f| f.load(Ordering::Relaxed))
                .unwrap_or(false)
            {
                return;
            }

            if channels == 1 {
                output_buffer.extend(data.iter().map(|&sample| sample.to_sample::<f32>()));
            } else if let Some(ch) = effective_channel {
                // Extract a single channel
                let frame_count = data.len() / channels;
                output_buffer.reserve(frame_count);
                for frame in data.chunks_exact(channels) {
                    output_buffer.push(frame[ch].to_sample::<f32>());
                }
            } else {
                // Average all channels
                let frame_count = data.len() / channels;
                output_buffer.reserve(frame_count);

                for frame in data.chunks_exact(channels) {
                    let mono_sample = frame
                        .iter()
                        .map(|&sample| sample.to_sample::<f32>())
                        .sum::<f32>()
                        / channels as f32;
                    output_buffer.push(mono_sample);
                }
            }

            if sample_tx
                .send(AudioChunk::Samples(std::mem::take(&mut output_buffer)))
                .is_err()
            {
                log::error!("Failed to send samples");
            }
        };

        device.build_input_stream(
            &config.clone().into(),
            stream_cb,
            |err| log::error!("Stream error: {}", err),
            None,
        )
    }

    fn get_preferred_config(
        device: &cpal::Device,
    ) -> Result<cpal::SupportedStreamConfig, Box<dyn std::error::Error>> {
        // Always use the device's default config for shared-mode compatibility.
        // The FrameResampler in run_consumer() handles downsampling to 16 kHz.
        Ok(device.default_input_config()?)
    }
}

pub fn is_microphone_access_denied(error_message: &str) -> bool {
    let normalized = error_message.to_lowercase();
    normalized.contains("access is denied")
        || normalized.contains("permission denied")
        || normalized.contains("0x80070005")
}

pub fn is_no_input_device_error(error_message: &str) -> bool {
    let normalized = error_message.to_lowercase();
    normalized.contains("no input device found")
        || (normalized.contains("failed to fetch preferred config")
            && normalized.contains("coreaudio"))
}

#[cfg(test)]
mod error_detection_tests {
    use super::{is_microphone_access_denied, is_no_input_device_error};

    #[test]
    fn detects_access_is_denied() {
        assert!(is_microphone_access_denied("Access is denied"));
    }

    #[test]
    fn detects_permission_denied() {
        assert!(is_microphone_access_denied("permission denied"));
    }

    #[test]
    fn detects_windows_error_code() {
        assert!(is_microphone_access_denied("WASAPI error: 0x80070005"));
    }

    #[test]
    fn does_not_match_unrelated_errors() {
        assert!(!is_microphone_access_denied("device not found"));
    }

    #[test]
    fn detects_no_input_device() {
        assert!(is_no_input_device_error("No input device found"));
    }

    #[test]
    fn detects_coreaudio_config_error() {
        assert!(is_no_input_device_error(
            "Failed to fetch preferred config: A backend-specific error has occurred: An unknown error unknown to the coreaudio-rs API occurred"
        ));
    }

    #[test]
    fn does_not_match_other_errors_for_no_device() {
        assert!(!is_no_input_device_error("permission denied"));
        assert!(!is_no_input_device_error("device not found"));
    }

    #[test]
    fn shutdown_command_exits_without_waiting_for_samples() {
        use super::{run_consumer, AudioChunk, Cmd};
        use std::sync::atomic::AtomicBool;
        use std::sync::Arc;
        use std::time::Instant;

        let (sample_tx, sample_rx) = std::sync::mpsc::channel::<AudioChunk>();
        let (cmd_tx, cmd_rx) = std::sync::mpsc::channel::<Cmd>();
        let stop_flag = Arc::new(AtomicBool::new(false));

        let worker = std::thread::spawn(move || {
            run_consumer(
                16_000,
                None,
                sample_rx,
                cmd_rx,
                None,
                None,
                stop_flag,
                Instant::now(),
            );
        });

        // Queue shutdown first so it's already on cmd_rx when the consumer
        // checks after processing the dummy sample (eliminates race).
        cmd_tx.send(Cmd::Shutdown).expect("send shutdown");
        // Unblock the consumer loop which blocks on sample_rx.recv() before
        // non-blockingly checking cmd_rx.
        sample_tx
            .send(AudioChunk::Samples(vec![0.0; 480]))
            .expect("send dummy sample");

        let (joined_tx, joined_rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let _ = worker.join();
            let _ = joined_tx.send(());
        });

        joined_rx
            .recv_timeout(std::time::Duration::from_secs(1))
            .expect("worker should exit after shutdown");

        drop(sample_tx);
    }
}

#[allow(clippy::too_many_arguments)]
fn run_consumer(
    in_sample_rate: u32,
    vad: Option<VadConfig>,
    sample_rx: mpsc::Receiver<AudioChunk>,
    cmd_rx: mpsc::Receiver<Cmd>,
    level_cb: Option<Arc<dyn Fn(Vec<f32>) + Send + Sync + 'static>>,
    audio_cb: Option<AudioFrameCallback>,
    stop_flag: Arc<AtomicBool>,
    stream_running_at: Instant,
) {
    let mut frame_resampler = FrameResampler::new(
        in_sample_rate as usize,
        constants::WHISPER_SAMPLE_RATE as usize,
        Duration::from_millis(30),
    );

    let mut processed_samples = Vec::<f32>::new();
    let mut recording = false;
    let mut vad_policy = VadPolicy::Offline;

    // ---------- latency instrumentation ---------------------------------- //
    // First-chunk arrival exposes the play()->samples-flowing gap; the
    // first-captured log confirms capture begins with the chunk in flight
    // when Cmd::Start lands.
    let mut first_chunk_logged = false;
    let mut awaiting_first_captured_chunk: Option<Instant> = None;

    // ---------- spectrum visualisation setup ---------------------------- //
    const BUCKETS: usize = 16;
    // Scale the FFT window to the device sample rate so the analysis window
    // (~33 ms) and frequency resolution (~30 Hz/bin) stay roughly constant
    // across devices. A fixed 512-sample window collapses the low vocal
    // buckets onto a single bin at 48 kHz (e.g. built-in laptop mics), and
    // would stutter at ~4-8 updates/sec on an 8-16 kHz Bluetooth headset.
    // Targets: 48 kHz -> 2048, 16 kHz -> 512, 8 kHz -> 256.
    let target_window = (f64::from(in_sample_rate) / 30.0).round() as usize;
    let window_size = [256usize, 512, 1024, 2048]
        .into_iter()
        .min_by_key(|w| w.abs_diff(target_window))
        .unwrap();
    let mut visualizer = AudioVisualiser::new(
        in_sample_rate,
        window_size,
        BUCKETS,
        400.0,  // vocal_min_hz
        4000.0, // vocal_max_hz
    );

    fn handle_frame(
        samples: &[f32],
        recording: bool,
        vad_policy: VadPolicy,
        vad: &Option<VadConfig>,
        audio_cb: &Option<AudioFrameCallback>,
        out_buf: &mut Vec<f32>,
    ) {
        if !recording {
            return;
        }

        let mut emit = |buf: &[f32]| {
            out_buf.extend_from_slice(buf);
            if let Some(cb) = audio_cb {
                cb(buf);
            }
        };

        if vad_policy == VadPolicy::Disabled {
            emit(samples);
            return;
        }

        if let Some(cfg) = vad {
            // Recover from a poisoned lock instead of panicking the consumer thread,
            // which would silently kill all further recordings this session.
            let mut det = cfg.detector.lock().unwrap_or_else(|e| e.into_inner());
            match det.push_frame(samples).unwrap_or(VadFrame::Speech(samples)) {
                VadFrame::Speech(buf) => emit(buf),
                VadFrame::Noise => {}
            }
        } else {
            emit(samples);
        }
    }

    loop {
        // Wait for an audio chunk with a timeout so Cmd::Shutdown and other
        // commands are still processed when no audio is flowing (mic idle,
        // test harness with no producer, etc.).
        let mut pending = match sample_rx.recv_timeout(Duration::from_millis(50)) {
            Ok(chunk) => Some(chunk),
            Err(mpsc::RecvTimeoutError::Timeout) => None,
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        };

        // non-blocking check for a command
        while let Ok(cmd) = cmd_rx.try_recv() {
            match cmd {
                Cmd::Start(policy, sent_at) => {
                    log::debug!(
                        "Cmd::Start processed {:?} after send; capture begins with the in-flight chunk",
                        sent_at.elapsed()
                    );
                    awaiting_first_captured_chunk = Some(Instant::now());
                    stop_flag.store(false, Ordering::Relaxed);
                    vad_policy = policy;
                    processed_samples.clear();
                    recording = true;
                    visualizer.reset();
                    // Flush the resampler's FFT filter delay-line so the tail of the
                    // previous utterance can't bleed into the next recording (#828).
                    frame_resampler.reset();
                    if vad_policy != VadPolicy::Disabled {
                        if let Some(cfg) = &vad {
                            let mut det = cfg.detector.lock().unwrap_or_else(|e| e.into_inner());
                            det.set_hangover_frames(cfg.hangover_for(vad_policy));
                            det.reset();
                        }
                    }
                }
                Cmd::Stop(reply_tx) => {
                    recording = false;
                    stop_flag.store(true, Ordering::Relaxed);

                    // The chunk in hand arrived before the stop; it belongs to
                    // the recording, so feed it ahead of the drain below.
                    if let Some(AudioChunk::Samples(raw)) = pending.take() {
                        frame_resampler.push(&raw, &mut |frame: &[f32]| {
                            handle_frame(
                                frame,
                                true,
                                vad_policy,
                                &vad,
                                &audio_cb,
                                &mut processed_samples,
                            )
                        });
                    }

                    // Drain all remaining audio until the producer confirms end-of-stream.
                    loop {
                        match sample_rx.recv_timeout(Duration::from_secs(2)) {
                            Ok(AudioChunk::Samples(remaining)) => {
                                frame_resampler.push(&remaining, &mut |frame: &[f32]| {
                                    handle_frame(
                                        frame,
                                        true,
                                        vad_policy,
                                        &vad,
                                        &audio_cb,
                                        &mut processed_samples,
                                    )
                                });
                            }
                            Ok(AudioChunk::EndOfStream) => break,
                            Err(_) => {
                                log::warn!("Timed out waiting for EndOfStream from audio callback");
                                break;
                            }
                        }
                    }

                    frame_resampler.finish(&mut |frame: &[f32]| {
                        handle_frame(
                            frame,
                            true,
                            vad_policy,
                            &vad,
                            &audio_cb,
                            &mut processed_samples,
                        )
                    });

                    let _ = reply_tx.send(std::mem::take(&mut processed_samples));

                    // Resume the audio callback so the consumer loop can continue
                    stop_flag.store(false, Ordering::Relaxed);
                }
                Cmd::Shutdown => {
                    stop_flag.store(true, Ordering::Relaxed);
                    return;
                }
            }
        }

        let raw = match pending.take() {
            Some(AudioChunk::Samples(s)) => s,
            // EndOfStream, or the chunk was consumed by a Stop above.
            _ => continue,
        };

        let chunk_ms = raw.len() as f64 * 1000.0 / in_sample_rate as f64;
        if !first_chunk_logged {
            first_chunk_logged = true;
            log::debug!(
                "first audio chunk arrived {:?} after stream start ({:.1}ms of audio)",
                stream_running_at.elapsed(),
                chunk_ms
            );
        }

        // ---------- spectrum processing ---------------------------------- //
        if let Some(buckets) = visualizer.feed(&raw) {
            if let Some(cb) = &level_cb {
                cb(buckets);
            }
        }

        // ---------- existing pipeline ------------------------------------ //
        frame_resampler.push(&raw, &mut |frame: &[f32]| {
            handle_frame(
                frame,
                recording,
                vad_policy,
                &vad,
                &audio_cb,
                &mut processed_samples,
            )
        });

        if recording {
            if let Some(started) = awaiting_first_captured_chunk.take() {
                log::debug!(
                    "first captured chunk ({:.1}ms of audio) processed {:?} after Cmd::Start",
                    chunk_ms,
                    started.elapsed()
                );
            }
        }
    }
}

#[cfg(test)]
mod consumer_tests {
    use super::{run_consumer, AudioChunk, Cmd};
    use std::sync::atomic::AtomicBool;
    use std::sync::{mpsc, Arc};
    use std::time::{Duration, Instant};

    #[test]
    fn shutdown_command_exits_without_waiting_for_samples() {
        let (sample_tx, sample_rx) = mpsc::channel::<AudioChunk>();
        let (cmd_tx, cmd_rx) = mpsc::channel::<Cmd>();
        let stop_flag = Arc::new(AtomicBool::new(false));

        let worker = std::thread::spawn({
            let stop_flag = stop_flag.clone();
            move || {
                run_consumer(
                    16_000,
                    None,
                    sample_rx,
                    cmd_rx,
                    None,
                    None,
                    stop_flag,
                    Instant::now(),
                );
            }
        });

        cmd_tx.send(Cmd::Shutdown).expect("send shutdown");

        let (joined_tx, joined_rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let _ = worker.join();
            let _ = joined_tx.send(());
        });

        joined_rx
            .recv_timeout(Duration::from_secs(1))
            .expect("worker should exit after shutdown");

        drop(sample_tx);
    }
}
