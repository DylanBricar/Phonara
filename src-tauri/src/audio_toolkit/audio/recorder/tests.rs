use super::*;
use handy_recorder::testing::{FakeError, FakeMic};
use std::{
    thread,
    time::{Duration, Instant},
};

const WAIT: Duration = Duration::from_secs(5);

struct Harness {
    recorder: AudioRecorder,
    microphone: FakeMic,
    fed: Arc<Mutex<Vec<f32>>>,
    channels: usize,
}

fn harness(input_rate: u32, channels: u16, selected_channel: Option<u16>) -> Harness {
    let microphone = FakeMic::new(input_rate, channels);
    let fed = Arc::new(Mutex::new(Vec::new()));
    let mut recorder = AudioRecorder::new()
        .expect("create capture adapter")
        .with_selected_channel(selected_channel)
        .with_pause_flag(Arc::new(AtomicBool::new(false)))
        .with_audio_callback({
            let fed = Arc::clone(&fed);
            move |frame| fed.lock().unwrap().extend_from_slice(frame)
        });
    let failed = Arc::clone(&recorder.stream_error);
    recorder.recorder = Some(
        microphone
            .open(
                recording_config(None, selected_channel, recorder.frame_samples),
                Some(Box::new(move |_| failed.store(true, Ordering::Release))),
                Duration::from_secs(1),
            )
            .expect("open fake microphone"),
    );
    Harness {
        recorder,
        microphone,
        fed,
        channels: channels as usize,
    }
}

fn wait_until(message: &str, mut condition: impl FnMut() -> bool) {
    let deadline = Instant::now() + WAIT;
    while !condition() {
        assert!(Instant::now() < deadline, "timed out waiting for {message}");
        thread::sleep(Duration::from_millis(1));
    }
}

fn start(harness: &Harness) {
    let ready = harness
        .recorder
        .start(VadPolicy::Disabled)
        .expect("start capture");
    wait_until("first real capture frame", || {
        harness.microphone.push(&vec![0.0; 480 * harness.channels]);
        ready.try_recv().is_ok()
    });
}

fn with_callbacks<T: Send>(harness: &Harness, operation: impl FnOnce() -> T + Send) -> T {
    thread::scope(|scope| {
        let operation = scope.spawn(operation);
        wait_until("capture boundary", || {
            if operation.is_finished() {
                return true;
            }
            harness.microphone.push(&vec![0.0; 480 * harness.channels]);
            false
        });
        operation.join().expect("capture operation finishes")
    })
}

fn stop(harness: &Harness) -> Vec<f32> {
    with_callbacks(harness, || {
        harness.recorder.stop().map_err(|error| error.to_string())
    })
    .expect("stop capture")
}

fn push_marker(harness: &Harness, marker: f32, samples: usize) {
    assert!(harness
        .microphone
        .push(&vec![marker; samples * harness.channels]));
    wait_until("marker delivered to streaming callback", || {
        harness.fed.lock().unwrap().contains(&marker)
    });
}

#[test]
fn fresh_adapter_is_healthy_and_not_recording() {
    let recorder = AudioRecorder::new().expect("new recorder");
    assert!(!recorder.needs_reopen());
    assert!(!recorder.requires_rebuild());
    assert!(recorder.start(VadPolicy::Disabled).is_err());
}

#[test]
fn exact_pcm_and_streaming_survive_repeated_warm_recordings() {
    let h = harness(16000, 1, None);
    for marker in [0.25, 0.5] {
        h.fed.lock().unwrap().clear();
        start(&h);
        push_marker(&h, marker, 480);
        let samples = stop(&h);
        let recorded: Vec<_> = samples
            .iter()
            .copied()
            .filter(|sample| *sample != 0.0)
            .collect();
        let streamed: Vec<_> = h
            .fed
            .lock()
            .unwrap()
            .iter()
            .copied()
            .filter(|sample| *sample != 0.0)
            .collect();
        assert_eq!(recorded, vec![marker; 480]);
        assert_eq!(streamed, recorded);
        assert!(!h.recorder.needs_reopen());
    }
}

#[test]
fn disconnected_microphone_still_returns_captured_audio() {
    let h = harness(16000, 1, None);
    start(&h);
    push_marker(&h, 0.25, 480);
    assert!(h.microphone.report_error(FakeError::DeviceNotAvailable));
    wait_until("recorder failure", || h.recorder.needs_reopen());

    let samples = h
        .recorder
        .stop()
        .expect("recover recording after disconnect");

    assert_eq!(
        samples
            .into_iter()
            .filter(|sample| *sample != 0.0)
            .collect::<Vec<_>>(),
        vec![0.25; 480]
    );
    assert!(
        !h.recorder.requires_rebuild(),
        "healthy VAD can be reused after device loss"
    );
}

#[test]
fn pause_segments_keep_previous_audio_and_never_deliver_paused_audio() {
    let h = harness(16000, 1, None);
    start(&h);
    push_marker(&h, 0.25, 480);
    with_callbacks(&h, || {
        h.recorder
            .set_paused(true)
            .map_err(|error| error.to_string())
    })
    .expect("pause capture segment");
    assert!(h.microphone.push(&vec![0.9; 960]));
    assert!(h.microphone.push(&vec![0.9; 960]));
    let before_resume = h.fed.lock().unwrap().len();
    with_callbacks(&h, || {
        h.recorder
            .set_paused(false)
            .map_err(|error| error.to_string())
    })
    .expect("resume capture after draining the paused ring boundary");
    wait_until("resumed delivery", || {
        h.microphone.push(&[0.0; 480]);
        h.fed.lock().unwrap().len() > before_resume
    });
    push_marker(&h, 0.5, 480);
    let samples = stop(&h);

    let kept: Vec<_> = samples
        .into_iter()
        .filter(|sample| *sample != 0.0)
        .collect();
    assert_eq!(kept, [vec![0.25; 480], vec![0.5; 480]].concat());
    assert!(!h.fed.lock().unwrap().contains(&0.9));
}

#[test]
fn stopping_while_paused_preserves_audio_even_without_new_callbacks() {
    let h = harness(16000, 1, None);
    start(&h);
    push_marker(&h, 0.25, 480);
    with_callbacks(&h, || {
        h.recorder
            .set_paused(true)
            .map_err(|error| error.to_string())
    })
    .expect("pause capture segment");
    let samples = h.recorder.stop().expect("stop paused recording");
    assert_eq!(
        samples
            .into_iter()
            .filter(|sample| *sample != 0.0)
            .collect::<Vec<_>>(),
        vec![0.25; 480]
    );
}

#[test]
fn pause_preserves_real_pcm_in_a_partially_filled_chunk() {
    let h = harness(16000, 1, None);
    start(&h);
    push_marker(&h, 0.25, 480);
    // This half-frame cannot reach the sink yet. Pause must drain and flush it
    // before setting the public pause flag, rather than discard the tail.
    assert!(h.microphone.push(&[0.5; 240]));
    with_callbacks(&h, || {
        h.recorder
            .set_paused(true)
            .map_err(|error| error.to_string())
    })
    .expect("pause with pending partial chunk");
    let samples = h.recorder.stop().expect("finish paused capture");

    let real: Vec<_> = samples
        .into_iter()
        .filter(|sample| *sample != 0.0)
        .collect();
    assert_eq!(real, [vec![0.25; 480], vec![0.5; 240]].concat());
    assert_eq!(
        h.fed
            .lock()
            .unwrap()
            .iter()
            .filter(|sample| **sample == 0.5)
            .count(),
        240
    );
}

#[test]
fn selected_input_channel_is_preserved_in_the_new_capture_backend() {
    let h = harness(16000, 2, Some(1));
    start(&h);
    assert!(h.microphone.push(&[0.25, 0.75].repeat(480)));
    wait_until("selected channel", || h.fed.lock().unwrap().contains(&0.75));
    let samples = stop(&h);
    assert_eq!(
        samples
            .into_iter()
            .filter(|sample| *sample != 0.0)
            .collect::<Vec<_>>(),
        vec![0.75; 480]
    );
}

#[test]
fn invalid_channel_falls_back_to_mono_without_changing_device() {
    let microphone = FakeMic::new(16000, 2);
    let mut requested = Vec::new();
    let recorder: Recorder<CaptureSink> = open_with_channel_fallback(Some(4), |channel| {
        requested.push(channel);
        microphone.open(
            recording_config(Some("fake:mic".into()), channel, 480),
            None,
            Duration::from_secs(1),
        )
    })
    .expect("fallback to valid mono routing");
    assert_eq!(requested, [Some(4), None]);
    assert_eq!(recorder.info().format.channels, 1);
    assert_eq!(recorder.info().format.sample_rate, 16000);
}

#[test]
fn native_48khz_device_is_adapted_to_mono_16khz_speech() {
    let h = harness(48000, 2, None);
    let info = h.recorder.recorder.as_ref().unwrap().info();
    assert_eq!(info.device_format.sample_rate, 48000);
    assert_eq!(info.format.sample_rate, 16000);
    assert_eq!(info.format.channels, 1);
    start(&h);
    assert!(h.microphone.push(&[0.25; 9600]));
    wait_until("resampled speech", || {
        h.fed
            .lock()
            .unwrap()
            .iter()
            .any(|sample| sample.abs() > 0.1)
    });
    let samples = stop(&h);
    assert!(samples.iter().any(|sample| sample.abs() > 0.1));
    assert!(samples.iter().all(|sample| sample.is_finite()));
}

#[test]
fn a_real_sink_panic_preserves_pcm_and_requires_a_fresh_detector() {
    let mut h = harness(16000, 1, None);
    let entered = Arc::new(AtomicBool::new(false));
    let panicked = Arc::clone(&entered);
    h.recorder.audio_cb = Some(Arc::new(move |frame| {
        if frame.contains(&0.25) {
            panicked.store(true, Ordering::Release);
            panic!("deliberate streaming callback panic for recorder recovery test");
        }
    }));
    start(&h);
    assert!(h.microphone.push(&[0.25; 480]));
    wait_until("audio callback panic", || entered.load(Ordering::Acquire));

    let samples = h
        .recorder
        .stop()
        .expect("recover sink after callback panic");

    assert_eq!(
        samples
            .into_iter()
            .filter(|sample| *sample != 0.0)
            .collect::<Vec<_>>(),
        vec![0.25; 480]
    );
    assert!(h.recorder.requires_rebuild());
    assert!(h.recorder.needs_reopen());
}

#[test]
fn permission_and_missing_device_errors_keep_the_existing_ui_classification() {
    for (fake_error, expected_permission, expected_missing) in [
        (FakeError::PermissionDenied, true, false),
        (FakeError::DeviceNotAvailable, false, true),
    ] {
        let microphone = FakeMic::new(16000, 1);
        microphone.fail_next_open(fake_error);
        let result: Result<Recorder<CaptureSink>, _> =
            microphone.open(RecorderConfig::speech(), None, Duration::from_secs(1));
        let error = match result {
            Err(error) => capture_error(error).to_string(),
            Ok(_) => panic!("fake open must fail"),
        };
        assert_eq!(is_microphone_access_denied(&error), expected_permission);
        assert_eq!(is_no_input_device_error(&error), expected_missing);
    }
}

#[test]
fn delayed_failure_from_an_old_open_cannot_mark_its_replacement_failed() {
    let old_microphone = FakeMic::new(16000, 1);
    let notification = Arc::new(Mutex::new(None::<CaptureFailureHandler>));
    let captured_notification = Arc::clone(&notification);
    let (old_recorder, old_failed) =
        open_capture_attempt(RecorderConfig::speech(), |config, handler| {
            *captured_notification.lock().unwrap() = Some(handler);
            old_microphone.open(config, None, Duration::from_secs(1))
        })
        .expect("open first recorder");
    old_recorder
        .close()
        .expect("close first recorder before its notification runs");
    let new_microphone = FakeMic::new(16000, 1);
    let (new_recorder, new_failed) =
        open_capture_attempt(RecorderConfig::speech(), |config, handler| {
            new_microphone.open(config, Some(handler), Duration::from_secs(1))
        })
        .expect("open replacement recorder");
    old_microphone.fail_next_open(FakeError::DeviceNotAvailable);
    let failed_open: Result<Recorder<CaptureSink>, _> =
        old_microphone.open(RecorderConfig::speech(), None, Duration::from_secs(1));
    let error = match failed_open {
        Err(error) => error,
        Ok(_) => panic!("old device is unavailable"),
    };

    notification
        .lock()
        .unwrap()
        .take()
        .expect("old delayed failure notification")(error);

    assert!(old_failed.load(Ordering::Acquire));
    assert!(!new_failed.load(Ordering::Acquire));
    new_recorder
        .close()
        .expect("close healthy replacement recorder");
}

#[test]
fn a_slow_sink_overruns_a_bounded_ring_instead_of_growing_the_queue() {
    let mut h = harness(16000, 1, None);
    let (entered_tx, entered_rx) = mpsc::channel();
    let (release_tx, release_rx) = mpsc::channel();
    let release_rx = Mutex::new(release_rx);
    let blocked_once = AtomicBool::new(false);
    h.recorder.audio_cb = Some(Arc::new(move |frame| {
        if frame.contains(&0.25) && !blocked_once.swap(true, Ordering::AcqRel) {
            entered_tx.send(()).expect("signal blocked consumer");
            release_rx
                .lock()
                .unwrap()
                .recv_timeout(WAIT)
                .expect("release consumer");
        }
    }));
    start(&h);
    h.microphone.push(&[0.25; 480]);
    entered_rx
        .recv_timeout(WAIT)
        .expect("consumer is deliberately stalled");
    // Much more than the recorder's two-second, 32,000-frame native ring.
    h.microphone.push(&vec![0.5; 100000]);
    release_tx.send(()).expect("resume consumer");
    let native = h.recorder.recorder.as_ref().unwrap();
    let stopped = with_callbacks(&h, || native.stop().map_err(|error| error.to_string()))
        .expect("stop while preserving the bounded ring contents");

    assert!(stopped.dropped_frames > 0, "overload must be observable");
    let (samples, vad) = stopped.sink.finish();
    *h.recorder.session.lock().unwrap() = Session::Idle(vad);
    assert!(
        samples.iter().filter(|sample| **sample != 0.0).count() < 100000,
        "the entire overrun cannot have been queued"
    );
    assert!(samples.contains(&0.25));
    assert!(samples.contains(&0.5));
}
