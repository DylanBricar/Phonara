use super::*;
use std::sync::Mutex;

struct Detector {
    frames: usize,
    configured: Arc<Mutex<Vec<usize>>>,
    resets: Arc<Mutex<usize>>,
}

impl VoiceActivityDetector for Detector {
    fn push_frame<'a>(&'a mut self, frame: &'a [f32]) -> anyhow::Result<VadFrame<'a>> {
        assert_eq!(frame.len(), self.frames);
        Ok(if frame[0] == 0.0 {
            VadFrame::Noise
        } else {
            VadFrame::Speech(frame)
        })
    }
    fn frame_samples(&self) -> usize {
        self.frames
    }
    fn set_hangover_frames(&mut self, frames: usize) {
        self.configured.lock().unwrap().push(frames);
    }
    fn reset(&mut self) {
        *self.resets.lock().unwrap() += 1;
    }
}

struct Harness {
    sink: CaptureSink,
    ready: mpsc::Receiver<()>,
    fed: Arc<Mutex<Vec<f32>>>,
    configured: Arc<Mutex<Vec<usize>>>,
    resets: Arc<Mutex<usize>>,
    paused: Arc<AtomicBool>,
}

fn harness(policy: VadPolicy, frame_samples: usize) -> Harness {
    let configured = Arc::new(Mutex::new(Vec::new()));
    let resets = Arc::new(Mutex::new(0));
    let detector = Detector {
        frames: frame_samples,
        configured: Arc::clone(&configured),
        resets: Arc::clone(&resets),
    };
    let fed = Arc::new(Mutex::new(Vec::new()));
    let paused = Arc::new(AtomicBool::new(false));
    let audio: AudioFrameCallback = {
        let fed = Arc::clone(&fed);
        Arc::new(move |frame| fed.lock().unwrap().extend_from_slice(frame))
    };
    let (ready_tx, ready) = mpsc::channel();
    let sink = CaptureSink::new(
        Some(CaptureVad::new(Box::new(detector), 15, 55)),
        policy,
        None,
        Some(audio),
        Some(Arc::clone(&paused)),
        ready_tx,
    );
    Harness {
        sink,
        ready,
        fed,
        configured,
        resets,
        paused,
    }
}

fn chunk(samples: &[f32], valid_frames: usize) -> AudioChunk<'_> {
    AudioChunk {
        samples,
        sample_rate: 16000,
        channels: 1,
        valid_frames,
    }
}

#[test]
fn readiness_requires_a_real_chunk_but_not_speech() {
    let mut h = harness(VadPolicy::Offline, 4);
    h.sink.process_chunk(chunk(&[0.0; 4], 0));
    assert!(h.ready.try_recv().is_err());
    h.sink.process_chunk(chunk(&[0.0; 4], 4));
    h.sink.process_chunk(chunk(&[0.0; 4], 4));
    assert!(h.ready.try_recv().is_ok());
    assert_eq!(h.ready.try_recv(), Err(mpsc::TryRecvError::Disconnected));
}

#[test]
fn disabled_vad_keeps_exact_real_pcm_without_tail_padding() {
    let mut h = harness(VadPolicy::Disabled, 4);
    h.sink.process_chunk(chunk(&[0.1, 0.2, 0.3, 0.4], 4));
    h.sink.process_chunk(chunk(&[0.5, 0.0, 0.0, 0.0], 1));
    let expected = vec![0.1, 0.2, 0.3, 0.4, 0.5];
    assert_eq!(*h.fed.lock().unwrap(), expected);
    assert_eq!(h.sink.finish().0, expected);
    assert_eq!(*h.resets.lock().unwrap(), 0);
}

#[test]
fn vad_profiles_use_the_selected_backends_frame_size_and_hangover() {
    for frames in [256, 480] {
        for (policy, expected_hangover) in [(VadPolicy::Offline, 15), (VadPolicy::Streaming, 55)] {
            let mut h = harness(policy, frames);
            h.sink.process_chunk(chunk(&vec![0.25; frames], frames));
            h.sink.process_chunk(chunk(&vec![0.0; frames], frames));
            assert_eq!(*h.configured.lock().unwrap(), vec![expected_hangover]);
            assert_eq!(*h.resets.lock().unwrap(), 1);
            assert_eq!(h.sink.finish().0, vec![0.25; frames]);
        }
    }
}

#[test]
fn paused_chunks_never_reach_recording_stream_or_readiness() {
    let mut h = harness(VadPolicy::Disabled, 4);
    h.paused.store(true, Ordering::Release);
    h.sink.process_chunk(chunk(&[0.9; 4], 4));
    assert!(h.ready.try_recv().is_err());
    assert!(h.fed.lock().unwrap().is_empty());
    h.paused.store(false, Ordering::Release);
    h.sink.process_chunk(chunk(&[0.25; 4], 4));
    assert!(h.ready.try_recv().is_ok());
    assert_eq!(*h.fed.lock().unwrap(), vec![0.25; 4]);
    assert_eq!(h.sink.finish().0, vec![0.25; 4]);
}

#[test]
fn stopping_before_audio_drops_the_readiness_sender() {
    let h = harness(VadPolicy::Offline, 4);
    let _ = h.sink.finish();
    assert_eq!(h.ready.recv(), Err(mpsc::RecvError));
}
