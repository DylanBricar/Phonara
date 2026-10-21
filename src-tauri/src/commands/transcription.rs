use crate::managers::transcription::TranscriptionManager;
use crate::settings::{get_settings, update_settings, ModelUnloadTimeout};
use log::{debug, info};
use serde::Serialize;
use specta::Type;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize, Type)]
pub struct ModelLoadStatus {
    is_loaded: bool,
    current_model: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub fn set_model_unload_timeout(app: AppHandle, timeout: ModelUnloadTimeout) {
    update_settings(&app, |settings| {
        settings.model_unload_timeout = timeout;
    });
}

#[tauri::command]
#[specta::specta]
pub fn get_model_load_status(
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<ModelLoadStatus, String> {
    Ok(ModelLoadStatus {
        is_loaded: transcription_manager.is_model_loaded(),
        current_model: transcription_manager.get_current_model(),
    })
}

#[tauri::command]
#[specta::specta]
pub fn unload_model_manually(
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<(), String> {
    transcription_manager
        .unload_model()
        .map_err(|e| format!("Failed to unload model: {}", e))
}

const SUPPORTED_EXTENSIONS: &[&str] = &["wav"];

#[tauri::command]
#[specta::specta]
pub async fn transcribe_file(
    app: AppHandle,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
    file_path: String,
) -> Result<String, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();

    if !SUPPORTED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!(
            "Unsupported file format: .{}. Supported formats: {}",
            extension,
            SUPPORTED_EXTENSIONS.join(", ")
        ));
    }

    let _ = app.emit("file-transcription-progress", "loading");
    info!("Loading audio file for transcription: {}", file_path);

    let samples = match extension.as_str() {
        "wav" => load_and_resample_wav(path)?,
        _ => return Err(format!("Unsupported format: .{}", extension)),
    };

    if samples.is_empty() {
        return Err("Audio file contains no samples".to_string());
    }

    debug!(
        "Loaded {} samples from file (duration: {:.1}s)",
        samples.len(),
        samples.len() as f64 / 16000.0
    );

    let _ = app.emit("file-transcription-progress", "loading_model");

    if !transcription_manager.is_model_loaded() {
        let settings = get_settings(&app);
        transcription_manager
            .load_model(&settings.selected_model)
            .map_err(|e| format!("Failed to load model: {}", e))?;
    }

    let _ = app.emit("file-transcription-progress", "transcribing");

    let tm = transcription_manager.inner().clone();
    let result = tokio::task::spawn_blocking(move || tm.transcribe(samples))
        .await
        .map_err(|e| format!("Transcription task failed: {}", e))?
        .map_err(|e| format!("Transcription failed: {}", e))?;

    let _ = app.emit("file-transcription-progress", "done");

    info!("File transcription complete: {} chars", result.len());
    Ok(result)
}

fn load_and_resample_wav(path: &Path) -> Result<Vec<f32>, String> {
    use hound::WavReader;

    let reader = WavReader::open(path).map_err(|e| format!("Failed to open WAV file: {}", e))?;
    let spec = reader.spec();
    let sample_rate = spec.sample_rate as usize;
    let channels = spec.channels as usize;
    if channels == 0 || sample_rate == 0 || sample_rate > 384_000 {
        return Err("Invalid WAV channel count or sample rate".into());
    }
    if (spec.sample_format == hound::SampleFormat::Int && !(1..=32).contains(&spec.bits_per_sample))
        || (spec.sample_format == hound::SampleFormat::Float && spec.bits_per_sample != 32)
    {
        return Err("Unsupported WAV sample format".into());
    }

    debug!(
        "WAV file: {} Hz, {} channels, {} bits",
        sample_rate, channels, spec.bits_per_sample
    );

    let raw_samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Int => {
            let max_val = (1i64 << (spec.bits_per_sample - 1)) as f32;
            reader
                .into_samples::<i32>()
                .map(|s| s.map(|v| v as f32 / max_val))
                .collect::<Result<Vec<f32>, _>>()
                .map_err(|e| format!("Failed to read WAV samples: {}", e))?
        }
        hound::SampleFormat::Float => reader
            .into_samples::<f32>()
            .collect::<Result<Vec<f32>, _>>()
            .map_err(|e| format!("Failed to read WAV samples: {}", e))?,
    };

    if raw_samples.is_empty() {
        return Ok(Vec::new());
    }

    let mono_samples = if channels > 1 {
        raw_samples
            .chunks(channels)
            .map(|frame| frame.iter().sum::<f32>() / channels as f32)
            .collect::<Vec<f32>>()
    } else {
        raw_samples
    };

    let target_rate = 16000;
    if sample_rate == target_rate {
        return Ok(mono_samples);
    }

    debug!("Resampling from {} Hz to {} Hz", sample_rate, target_rate);

    use rubato::{FftFixedIn, Resampler};

    let chunk_size = 1024;
    let mut resampler = FftFixedIn::<f32>::new(sample_rate, target_rate, chunk_size, 1, 1)
        .map_err(|e| format!("Failed to create resampler: {}", e))?;

    let mut output = Vec::new();
    let delay = resampler.output_delay();
    let expected = (mono_samples.len() * target_rate).div_ceil(sample_rate);
    for chunk in mono_samples.chunks(chunk_size) {
        let result = if chunk.len() == chunk_size {
            resampler.process(&[chunk], None)
        } else {
            resampler.process_partial(Some(&[chunk]), None)
        }
        .map_err(|error| format!("Resampling failed: {error}"))?;
        output.extend_from_slice(&result[0]);
    }
    // The FFT delay can contain the entire signal of a short file. Drain it
    // before trimming synthetic padding, then remove the leading filter delay.
    for _ in 0..16 {
        if output.len() >= expected + delay {
            break;
        }
        let result = resampler
            .process_partial::<&[f32]>(None, None)
            .map_err(|error| format!("Resampler flush failed: {error}"))?;
        output.extend_from_slice(&result[0]);
    }
    if output.len() < expected + delay {
        return Err("Resampler did not produce the complete recording".into());
    }
    Ok(output[delay..delay + expected].to_vec())
}

#[cfg(test)]
mod wav_import_tests {
    use super::load_and_resample_wav;

    fn write_wav(rate: u32, channels: u16, frames: &[f32]) -> tempfile::NamedTempFile {
        let file = tempfile::NamedTempFile::new().unwrap();
        let spec = hound::WavSpec {
            channels,
            sample_rate: rate,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };
        let mut writer = hound::WavWriter::create(file.path(), spec).unwrap();
        for sample in frames {
            for _ in 0..channels {
                writer.write_sample(*sample).unwrap();
            }
        }
        writer.finalize().unwrap();
        file
    }

    #[test]
    fn short_import_retains_signal_and_exact_duration_after_fft_delay() {
        for rate in [8_000, 22_050, 44_100, 48_000, 96_000] {
            let count = rate as usize / 200;
            let file = write_wav(rate, 2, &vec![0.5; count]);
            let output = load_and_resample_wav(file.path()).unwrap();
            assert_eq!(output.len(), (count * 16_000).div_ceil(rate as usize));
            let average = output.iter().sum::<f32>() / output.len() as f32;
            assert!(
                average > 0.35,
                "{rate}: short recording was lost ({average})"
            );
        }
    }

    #[test]
    fn import_preserves_the_last_audio_and_sixteen_kilohertz_samples() {
        let mut samples = vec![0.0; 4_800];
        samples[4_560..].fill(0.5);
        let file = write_wav(48_000, 1, &samples);
        let output = load_and_resample_wav(file.path()).unwrap();
        assert_eq!(output.len(), 1_600);
        assert!(output[1_540..].iter().sum::<f32>() / 60.0 > 0.35);
        let original = vec![0.1, -0.3, 0.7, 0.0];
        let file = write_wav(16_000, 1, &original);
        assert_eq!(load_and_resample_wav(file.path()).unwrap(), original);
    }
}
