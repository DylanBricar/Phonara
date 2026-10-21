use super::CpalInputDevice;
use cpal::traits::{DeviceTrait, StreamTrait};
use std::sync::{Arc, Mutex};

/// Exercise the production recorder, including the bounded ring and resampling.
/// Captured PCM lives only until these counters are computed; nothing is saved.
pub(crate) fn probe_recorder(input: &CpalInputDevice) -> Result<serde_json::Value, String> {
    use super::recorder::{AudioRecorder, VadPolicy};

    let callbacks = Arc::new(std::sync::atomic::AtomicU64::new(0));
    let delivered = Arc::clone(&callbacks);
    let mut recorder = AudioRecorder::new()
        .map_err(|error| error.to_string())?
        .with_audio_callback(move |_| {
            delivered.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        });
    recorder
        .open(Some(input.device.clone()))
        .map_err(|error| error.to_string())?;
    let _started = recorder
        .start(VadPolicy::Disabled)
        .map_err(|error| error.to_string())?;
    std::thread::sleep(std::time::Duration::from_millis(1500));
    let samples = recorder.stop().map_err(|error| error.to_string())?;
    let capture_failed = recorder.needs_reopen();
    recorder.close().map_err(|error| error.to_string())?;
    let peak = samples
        .iter()
        .copied()
        .filter(|sample| sample.is_finite())
        .map(f32::abs)
        .fold(0.0f32, f32::max);
    Ok(serde_json::json!({
        "id": input.id, "name": input.name, "sample_rate": 16000,
        "channels": 1, "callbacks": callbacks.load(std::sync::atomic::Ordering::Relaxed),
        "samples": samples.len(), "peak": peak,
        "error": capture_failed.then_some("Recorder reported interrupted capture"),
    }))
}

/// Local capture proof: retains only counters and a peak, never audio samples.
pub(crate) fn probe_input_device(input: &CpalInputDevice) -> Result<serde_json::Value, String> {
    let config = input
        .device
        .default_input_config()
        .map_err(|error| error.to_string())?;
    let format = config.sample_format();
    let stats = Arc::new(Mutex::new((0u64, 0u64, 0.0f32, None::<String>)));
    let captured = Arc::clone(&stats);
    let errors = Arc::clone(&stats);
    let stream = input
        .device
        .build_input_stream_raw(
            config.config(),
            format,
            move |data, _| {
                let mut stats = captured.lock().unwrap_or_else(|error| error.into_inner());
                stats.0 += 1;
                stats.1 += data.len() as u64;
                macro_rules! peak {
                    ($sample:ty) => {
                        data.as_slice::<$sample>()
                            .map(|samples| {
                                samples
                                    .iter()
                                    .map(|sample| {
                                        use cpal::Sample;
                                        sample.to_sample::<f32>().abs()
                                    })
                                    .filter(|value| value.is_finite())
                                    .fold(0.0f32, f32::max)
                            })
                            .unwrap_or(0.0)
                    };
                }
                let peak = match format {
                    cpal::SampleFormat::F32 => peak!(f32),
                    cpal::SampleFormat::F64 => peak!(f64),
                    cpal::SampleFormat::I8 => peak!(i8),
                    cpal::SampleFormat::I16 => peak!(i16),
                    cpal::SampleFormat::I32 => peak!(i32),
                    cpal::SampleFormat::I64 => peak!(i64),
                    cpal::SampleFormat::U8 => peak!(u8),
                    cpal::SampleFormat::U16 => peak!(u16),
                    cpal::SampleFormat::U32 => peak!(u32),
                    cpal::SampleFormat::U64 => peak!(u64),
                    _ => 0.0,
                };
                stats.2 = stats.2.max(peak);
            },
            move |error| {
                errors.lock().unwrap_or_else(|error| error.into_inner()).3 =
                    Some(error.to_string());
            },
            None,
        )
        .map_err(|error| error.to_string())?;
    stream.play().map_err(|error| error.to_string())?;
    std::thread::sleep(std::time::Duration::from_millis(1500));
    drop(stream);
    let stats = stats.lock().unwrap_or_else(|error| error.into_inner());
    Ok(
        serde_json::json!({"id": input.id, "name": input.name, "sample_rate": config.sample_rate(), "channels": config.channels(), "sample_format": format.to_string(), "callbacks": stats.0, "samples": stats.1, "peak": stats.2, "error": stats.3}),
    )
}
