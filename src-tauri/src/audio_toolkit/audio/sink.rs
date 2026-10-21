//! Phonara's VAD and streaming policy on handy-recorder's bounded delivery worker.

use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Arc,
};

use handy_recorder::{AudioChunk, Sink};

use crate::audio_toolkit::{
    constants,
    vad::{VadFrame, VoiceActivityDetector},
};

use super::AudioVisualiser;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum VadPolicy {
    Disabled,
    Offline,
    Streaming,
}

pub(super) type LevelCallback = Arc<dyn Fn(Vec<f32>) + Send + Sync + 'static>;
pub type AudioFrameCallback = Arc<dyn Fn(&[f32]) + Send + Sync + 'static>;

/// The application keeps its Earshot or Silero detector. Capture owns only the
/// device/ring/resampling; this detector is lent to one sink and returned at stop.
pub(super) struct CaptureVad {
    detector: Box<dyn VoiceActivityDetector>,
    pub frame_samples: usize,
    offline_hangover_frames: usize,
    streaming_hangover_frames: usize,
}

impl CaptureVad {
    pub fn new(
        detector: Box<dyn VoiceActivityDetector>,
        offline_hangover_frames: usize,
        streaming_hangover_frames: usize,
    ) -> Self {
        let frame_samples = detector.frame_samples();
        assert!(frame_samples > 0, "VAD frame size must be non-zero");
        Self {
            detector,
            frame_samples,
            offline_hangover_frames,
            streaming_hangover_frames,
        }
    }

    fn reset(&mut self, policy: VadPolicy) {
        if policy != VadPolicy::Disabled {
            let hangover = match policy {
                VadPolicy::Streaming => self.streaming_hangover_frames,
                VadPolicy::Offline | VadPolicy::Disabled => self.offline_hangover_frames,
            };
            self.detector.set_hangover_frames(hangover);
            self.detector.reset();
        }
    }
}

pub(super) struct CaptureSink {
    vad: Option<CaptureVad>,
    policy: VadPolicy,
    visualizer: AudioVisualiser,
    on_levels: Option<LevelCallback>,
    on_audio: Option<AudioFrameCallback>,
    pause_flag: Option<Arc<AtomicBool>>,
    ready: Option<mpsc::Sender<()>>,
    samples: Vec<f32>,
    discard: bool,
}

impl CaptureSink {
    pub fn new(
        mut vad: Option<CaptureVad>,
        policy: VadPolicy,
        on_levels: Option<LevelCallback>,
        on_audio: Option<AudioFrameCallback>,
        pause_flag: Option<Arc<AtomicBool>>,
        ready: mpsc::Sender<()>,
    ) -> Self {
        if let Some(vad) = &mut vad {
            vad.reset(policy);
        }
        Self {
            vad,
            policy,
            visualizer: AudioVisualiser::new(
                constants::WHISPER_SAMPLE_RATE,
                512,
                16,
                400.0,
                4000.0,
            ),
            on_levels,
            on_audio,
            pause_flag,
            ready: Some(ready),
            samples: Vec::new(),
            discard: false,
        }
    }

    /// Keep the delivery worker draining while paused. It borrows no detector,
    /// emits no stream/level/readiness callbacks, and stores no samples.
    pub fn discard() -> Self {
        let (sender, _) = mpsc::channel();
        let mut sink = Self::new(None, VadPolicy::Disabled, None, None, None, sender);
        sink.ready = None;
        sink.discard = true;
        sink
    }

    pub fn into_vad(self) -> Option<CaptureVad> {
        self.vad
    }

    pub fn resume(&mut self) {
        self.visualizer.reset();
    }

    pub fn finish(self) -> (Vec<f32>, Option<CaptureVad>) {
        if self.policy != VadPolicy::Disabled {
            if let Some(vad) = &self.vad {
                if let Some(report) = vad.detector.tail_report() {
                    log::debug!(
                        "VAD at stop: withheld tail {} frames (~{}ms, {} voiced), in_speech={}, onset_counter={}, hangover_counter={}",
                        report.withheld_frames,
                        report.withheld_frames * vad.frame_samples * 1000 / constants::WHISPER_SAMPLE_RATE as usize,
                        report.withheld_voiced_frames,
                        report.in_speech,
                        report.onset_counter,
                        report.hangover_counter,
                    );
                }
            }
        }
        (self.samples, self.vad)
    }
}

impl Sink for CaptureSink {
    fn process_chunk(&mut self, chunk: AudioChunk<'_>) {
        if self.discard {
            return;
        }
        // A normal pause removes this sink from delivery after draining its
        // boundary. Also honor explicit external pause flags before emitting.
        if self
            .pause_flag
            .as_ref()
            .is_some_and(|flag| flag.load(Ordering::Acquire))
        {
            return;
        }
        if chunk.sample_rate != constants::WHISPER_SAMPLE_RATE
            || chunk.channels != 1
            || chunk.valid_frames > chunk.samples.len()
        {
            log::error!("Recorder delivered an invalid speech-format chunk");
            return;
        }
        if chunk.valid_frames == 0 {
            return;
        }
        let real = &chunk.samples[..chunk.valid_frames];
        if let Some(levels) = self.visualizer.feed(real) {
            if let Some(on_levels) = &self.on_levels {
                on_levels(levels);
            }
        }

        let mut emit = |frame: &[f32]| {
            self.samples.extend_from_slice(frame);
            if let Some(on_audio) = &self.on_audio {
                on_audio(frame);
            }
        };
        if self.policy == VadPolicy::Disabled {
            // Real audio is exact: final chunk padding is never stored or fed.
            emit(real);
        } else if let Some(vad) = &mut self.vad {
            // Detectors need a full frame (Earshot 256, Silero V4 480). A final
            // partial frame is padded by handy-recorder, as the previous path did.
            match vad
                .detector
                .push_frame(chunk.samples)
                .unwrap_or(VadFrame::Speech(chunk.samples))
            {
                VadFrame::Speech(frame) => emit(frame),
                VadFrame::Noise => {}
            }
        } else {
            emit(real);
        }
        // A quiet microphone is ready too; readiness means audio is flowing.
        if let Some(ready) = self.ready.take() {
            let _ = ready.send(());
        }
    }
}

#[cfg(test)]
#[path = "sink/tests.rs"]
mod tests;
