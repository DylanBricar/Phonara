use crate::managers::transcription::TranscriptionManager;
use crate::settings::{get_settings, write_settings, ModelUnloadTimeout};
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
    let mut settings = get_settings(&app);
    settings.model_unload_timeout = timeout;
    write_settings(&app, settings);
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
    let mut pos = 0;

    while pos + chunk_size <= mono_samples.len() {
        let chunk = &mono_samples[pos..pos + chunk_size];
        let result = resampler
            .process(&[chunk], None)
            .map_err(|e| format!("Resampling failed: {}", e))?;
        output.extend_from_slice(&result[0]);
        pos += chunk_size;
    }

    if pos < mono_samples.len() {
        let mut last_chunk = vec![0.0f32; chunk_size];
        let remaining = &mono_samples[pos..];
        last_chunk[..remaining.len()].copy_from_slice(remaining);
        let result = resampler
            .process(&[&last_chunk], None)
            .map_err(|e| format!("Resampling failed: {}", e))?;
        let expected = (remaining.len() as f64 * target_rate as f64 / sample_rate as f64).ceil()
            as usize;
        let take = expected.min(result[0].len());
        output.extend_from_slice(&result[0][..take]);
    }

    Ok(output)
}
