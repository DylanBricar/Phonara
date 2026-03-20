use crate::audio_toolkit::constants::WHISPER_SAMPLE_RATE;
use crate::audio_toolkit::{apply_custom_words, apply_text_replacements, filter_transcription_output};
use crate::managers::model::{EngineType, ModelManager};
use crate::settings::{get_settings, ModelUnloadTimeout};
use anyhow::Result;
use log::{debug, error, info, warn};
use serde::Serialize;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter, Manager};
use transcribe_rs::{
    engines::{
        moonshine::{
            ModelVariant, MoonshineEngine, MoonshineModelParams, MoonshineStreamingEngine,
            StreamingModelParams,
        },
        parakeet::{
            ParakeetEngine, ParakeetInferenceParams, ParakeetModelParams, TimestampGranularity,
        },
        sense_voice::{
            Language as SenseVoiceLanguage, SenseVoiceEngine, SenseVoiceInferenceParams,
            SenseVoiceModelParams,
        },
        whisper::{WhisperEngine, WhisperInferenceParams},
    },
    TranscriptionEngine,
};

#[derive(Clone, Debug, Serialize)]
pub struct ModelStateEvent {
    pub event_type: String,
    pub model_id: Option<String>,
    pub model_name: Option<String>,
    pub error: Option<String>,
}

enum LoadedEngine {
    Whisper(WhisperEngine),
    Parakeet(ParakeetEngine),
    Moonshine(MoonshineEngine),
    MoonshineStreaming(MoonshineStreamingEngine),
    SenseVoice(SenseVoiceEngine),
    GeminiApi,
    OpenAiApi,
}

fn load_engine_with_recovery<F>(
    app_handle: &AppHandle,
    model_id: &str,
    model_name: &str,
    engine_label: &str,
    loader: F,
) -> Result<LoadedEngine>
where
    F: FnOnce() -> Result<LoadedEngine> + std::panic::UnwindSafe,
{
    match catch_unwind(loader) {
        Ok(Ok(engine)) => Ok(engine),
        Ok(Err(e)) => {
            let _ = app_handle.emit(
                "model-state-changed",
                ModelStateEvent {
                    event_type: "loading_failed".to_string(),
                    model_id: Some(model_id.to_string()),
                    model_name: Some(model_name.to_string()),
                    error: Some(e.to_string()),
                },
            );
            Err(e)
        }
        Err(_) => {
            let error_msg = format!(
                "{} model loading crashed - model file may be corrupted or incompatible with your system",
                engine_label
            );
            log::error!("{}", error_msg);
            let _ = app_handle.emit(
                "model-state-changed",
                ModelStateEvent {
                    event_type: "loading_failed".to_string(),
                    model_id: Some(model_id.to_string()),
                    model_name: Some(model_name.to_string()),
                    error: Some(error_msg.clone()),
                },
            );
            Err(anyhow::anyhow!("{}. Try re-downloading the model.", error_msg))
        }
    }
}

const MAX_CHUNK_SECS: f32 = 25.0;
const CHUNK_THRESHOLD_SECS: f32 = 28.0;
const OVERLAP_SAMPLES: usize = 8000;
const TARGET_RMS: f32 = 0.05;
const MIN_RMS_FOR_NORMALIZATION: f32 = 0.02;

fn normalize_audio(samples: Vec<f32>) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }
    let rms = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    if rms < 1e-6 {
        return Vec::new();
    }
    if rms >= MIN_RMS_FOR_NORMALIZATION {
        return samples;
    }
    let gain = TARGET_RMS / rms;
    debug!("Normalizing audio: rms={:.4} -> {:.4} (gain={:.1}x)", rms, TARGET_RMS, gain);
    samples.iter().map(|s| (s * gain).clamp(-1.0, 1.0)).collect()
}

fn apply_post_processing(text: &str, settings: &crate::settings::AppSettings) -> String {
    let corrected = if !settings.custom_words.is_empty() {
        apply_custom_words(text, &settings.custom_words, settings.word_correction_threshold)
    } else {
        text.to_string()
    };
    let replaced = apply_text_replacements(&corrected, &settings.text_replacements);
    filter_transcription_output(&replaced)
}

fn chunk_audio_by_silence(audio: &[f32]) -> Vec<Vec<f32>> {
    let sample_rate = WHISPER_SAMPLE_RATE as usize;
    let max_chunk_samples = (MAX_CHUNK_SECS * sample_rate as f32) as usize;

    let duration_secs = audio.len() as f32 / sample_rate as f32;
    if duration_secs <= CHUNK_THRESHOLD_SECS {
        return vec![audio.to_vec()];
    }

    debug!(
        "Chunking {:.1}s audio into segments of max {:.0}s",
        duration_secs, MAX_CHUNK_SECS
    );

    let frame_size = sample_rate / 20;
    let silence_threshold = 0.005_f32;

    let mut chunks: Vec<Vec<f32>> = Vec::new();
    let mut chunk_start = 0;

    while chunk_start < audio.len() {
        let chunk_end = (chunk_start + max_chunk_samples).min(audio.len());

        if chunk_end == audio.len() {
            chunks.push(audio[chunk_start..chunk_end].to_vec());
            break;
        }

        let search_start = chunk_start + (max_chunk_samples * 70 / 100);
        let search_end = chunk_end;

        let mut best_split = chunk_end;
        let mut lowest_energy = f32::MAX;
        let mut found_silence = false;

        let mut pos = search_start;
        while pos + frame_size <= search_end {
            let frame = &audio[pos..pos + frame_size];
            let rms = (frame.iter().map(|s| s * s).sum::<f32>() / frame_size as f32).sqrt();

            if rms < lowest_energy {
                lowest_energy = rms;
                best_split = pos + frame_size / 2;
            }

            if rms < silence_threshold {
                best_split = pos + frame_size / 2;
                found_silence = true;
                break;
            }

            pos += frame_size;
        }

        chunks.push(audio[chunk_start..best_split].to_vec());

        let silence_overlap = OVERLAP_SAMPLES / 4;
        if found_silence {
            chunk_start = if best_split > silence_overlap {
                best_split - silence_overlap
            } else {
                best_split
            };
        } else {
            chunk_start = if best_split > OVERLAP_SAMPLES {
                best_split - OVERLAP_SAMPLES
            } else {
                best_split
            };
        }
    }

    debug!(
        "Audio split into {} chunks: [{}]",
        chunks.len(),
        chunks
            .iter()
            .map(|c| format!("{:.1}s", c.len() as f32 / sample_rate as f32))
            .collect::<Vec<_>>()
            .join(", ")
    );

    chunks
}

fn detect_language_from_text(text: &str) -> Option<String> {
    let lower = text.to_lowercase();
    let words: Vec<&str> = lower.split_whitespace().collect();
    if words.len() < 3 {
        return None;
    }

    let lang_markers: &[(&str, &[&str])] = &[
        ("fr", &["le", "la", "les", "de", "du", "des", "un", "une", "est", "et", "que", "qui", "dans", "pour", "avec", "pas", "sur", "ce", "sont", "nous", "vous", "ils", "elle", "mais", "ou", "donc", "c'est", "j'ai", "il", "je", "tu", "on"]),
        ("de", &["der", "die", "das", "ein", "eine", "ist", "und", "ich", "nicht", "sie", "auf", "mit", "den", "von", "dem", "dass", "wir", "aber", "auch", "noch", "wie"]),
        ("es", &["el", "la", "los", "las", "de", "del", "un", "una", "es", "en", "que", "por", "con", "para", "como", "pero", "más", "este", "esta", "están", "tiene", "muy"]),
        ("it", &["il", "lo", "la", "di", "del", "che", "è", "per", "non", "con", "una", "sono", "anche", "come", "più", "questo", "questa", "gli", "dei", "delle"]),
        ("pt", &["o", "os", "as", "de", "do", "da", "dos", "das", "um", "uma", "que", "não", "com", "para", "como", "mais", "por", "mas", "tem", "está", "são"]),
        ("nl", &["de", "het", "een", "van", "is", "en", "dat", "niet", "op", "met", "voor", "zijn", "maar", "ook", "nog", "wel", "dit", "die"]),
    ];

    let mut best_lang = None;
    let mut best_count = 0_usize;
    let total = words.len();

    for (lang, markers) in lang_markers {
        let count = words.iter().filter(|w| markers.contains(w)).count();
        if count > best_count {
            best_count = count;
            best_lang = Some(*lang);
        }
    }

    if best_count * 100 / total >= 15 {
        best_lang.map(|l| l.to_string())
    } else {
        None
    }
}

#[derive(Clone)]
pub struct TranscriptionManager {
    engine: Arc<Mutex<Option<LoadedEngine>>>,
    model_manager: Arc<ModelManager>,
    app_handle: AppHandle,
    current_model_id: Arc<Mutex<Option<String>>>,
    last_activity: Arc<AtomicU64>,
    shutdown_signal: Arc<AtomicBool>,
    watcher_handle: Arc<Mutex<Option<thread::JoinHandle<()>>>>,
    is_loading: Arc<Mutex<bool>>,
    loading_condvar: Arc<Condvar>,
}

impl TranscriptionManager {
    pub fn new(app_handle: &AppHandle, model_manager: Arc<ModelManager>) -> Result<Self> {
        let manager = Self {
            engine: Arc::new(Mutex::new(None)),
            model_manager,
            app_handle: app_handle.clone(),
            current_model_id: Arc::new(Mutex::new(None)),
            last_activity: Arc::new(AtomicU64::new(
                SystemTime::now()
                    .duration_since(SystemTime::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
            )),
            shutdown_signal: Arc::new(AtomicBool::new(false)),
            watcher_handle: Arc::new(Mutex::new(None)),
            is_loading: Arc::new(Mutex::new(false)),
            loading_condvar: Arc::new(Condvar::new()),
        };

        {
            let app_handle_cloned = app_handle.clone();
            let manager_cloned = manager.clone();
            let shutdown_signal = manager.shutdown_signal.clone();
            let handle = thread::spawn(move || {
                let mut cached_timeout: Option<u64> = None;
                let mut cached_is_immediate = false;
                let mut iteration: u32 = 0;

                while !shutdown_signal.load(Ordering::Relaxed) {
                    thread::sleep(Duration::from_secs(10));

                    if shutdown_signal.load(Ordering::Relaxed) {
                        break;
                    }

                    if iteration % 6 == 0 {
                        let settings = get_settings(&app_handle_cloned);
                        cached_timeout = settings.model_unload_timeout.to_seconds();
                        cached_is_immediate =
                            settings.model_unload_timeout == ModelUnloadTimeout::Immediately;
                    }
                    iteration = iteration.wrapping_add(1);

                    if let Some(limit_seconds) = cached_timeout {
                        if cached_is_immediate {
                            continue;
                        }

                        let last = manager_cloned.last_activity.load(Ordering::Relaxed);
                        let now_ms = SystemTime::now()
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .unwrap()
                            .as_millis() as u64;

                        if now_ms.saturating_sub(last) > limit_seconds * 1000 {
                            let is_recording = app_handle_cloned
                                .try_state::<Arc<crate::managers::audio::AudioRecordingManager>>()
                                .map_or(false, |a: tauri::State<'_, Arc<crate::managers::audio::AudioRecordingManager>>| a.is_recording());
                            if is_recording {
                                manager_cloned.last_activity.store(
                                    SystemTime::now()
                                        .duration_since(SystemTime::UNIX_EPOCH)
                                        .unwrap()
                                        .as_millis() as u64,
                                    std::sync::atomic::Ordering::Relaxed,
                                );
                                continue;
                            }

                            if manager_cloned.is_model_loaded() {
                                let unload_start = std::time::Instant::now();
                                debug!("Starting to unload model due to inactivity");

                                if let Ok(()) = manager_cloned.unload_model() {
                                    let _ = app_handle_cloned.emit(
                                        "model-state-changed",
                                        ModelStateEvent {
                                            event_type: "unloaded".to_string(),
                                            model_id: None,
                                            model_name: None,
                                            error: None,
                                        },
                                    );
                                    let unload_duration = unload_start.elapsed();
                                    debug!(
                                        "Model unloaded due to inactivity (took {}ms)",
                                        unload_duration.as_millis()
                                    );
                                }
                            }
                        }
                    }
                }
                debug!("Idle watcher thread shutting down gracefully");
            });
            *manager.watcher_handle.lock().unwrap() = Some(handle);
        }

        Ok(manager)
    }

    fn lock_engine(&self) -> MutexGuard<'_, Option<LoadedEngine>> {
        self.engine.lock().unwrap_or_else(|poisoned| {
            warn!("Engine mutex was poisoned by a previous panic, recovering");
            poisoned.into_inner()
        })
    }

    pub fn is_model_loaded(&self) -> bool {
        let engine = self.lock_engine();
        engine.is_some()
    }

    pub fn unload_model(&self) -> Result<()> {
        let unload_start = std::time::Instant::now();
        debug!("Starting to unload model");

        {
            let mut engine = self.lock_engine();
            if let Some(ref mut loaded_engine) = *engine {
                match loaded_engine {
                    LoadedEngine::Whisper(ref mut e) => e.unload_model(),
                    LoadedEngine::Parakeet(ref mut e) => e.unload_model(),
                    LoadedEngine::Moonshine(ref mut e) => e.unload_model(),
                    LoadedEngine::MoonshineStreaming(ref mut e) => e.unload_model(),
                    LoadedEngine::SenseVoice(ref mut e) => e.unload_model(),
                    LoadedEngine::GeminiApi => {}
                    LoadedEngine::OpenAiApi => {}
                }
            }
            *engine = None;
        }
        {
            let mut current_model = self.current_model_id.lock().unwrap();
            *current_model = None;
        }

        let _ = self.app_handle.emit(
            "model-state-changed",
            ModelStateEvent {
                event_type: "unloaded".to_string(),
                model_id: None,
                model_name: None,
                error: None,
            },
        );

        let unload_duration = unload_start.elapsed();
        debug!(
            "Model unloaded manually (took {}ms)",
            unload_duration.as_millis()
        );
        Ok(())
    }

    pub fn maybe_unload_immediately(&self, context: &str) {
        let settings = get_settings(&self.app_handle);
        if settings.model_unload_timeout == ModelUnloadTimeout::Immediately
            && self.is_model_loaded()
        {
            info!("Immediately unloading model after {}", context);
            if let Err(e) = self.unload_model() {
                warn!("Failed to immediately unload model: {}", e);
            }
        }
    }

    pub fn load_model(&self, model_id: &str) -> Result<()> {
        let load_start = std::time::Instant::now();
        debug!("Starting to load model: {}", model_id);

        let _ = self.app_handle.emit(
            "model-state-changed",
            ModelStateEvent {
                event_type: "loading_started".to_string(),
                model_id: Some(model_id.to_string()),
                model_name: None,
                error: None,
            },
        );

        let model_info = self
            .model_manager
            .get_model_info(model_id)
            .ok_or_else(|| anyhow::anyhow!("Model not found: {}", model_id))?;

        if !model_info.is_downloaded {
            let error_msg = "Model not downloaded";
            let _ = self.app_handle.emit(
                "model-state-changed",
                ModelStateEvent {
                    event_type: "loading_failed".to_string(),
                    model_id: Some(model_id.to_string()),
                    model_name: Some(model_info.name.clone()),
                    error: Some(error_msg.to_string()),
                },
            );
            return Err(anyhow::anyhow!(error_msg));
        }

        let model_path = if matches!(model_info.engine_type, EngineType::GeminiApi | EngineType::OpenAiApi) {
            std::path::PathBuf::new()
        } else {
            self.model_manager.get_model_path(model_id)?
        };

        let loaded_engine = match model_info.engine_type {
            EngineType::Whisper => {
                let app_handle = &self.app_handle;
                let model_id_str = model_id.to_string();
                let model_name_str = model_info.name.clone();
                let mp = model_path.clone();
                load_engine_with_recovery(
                    app_handle, &model_id_str, &model_name_str, "Whisper",
                    AssertUnwindSafe(|| {
                        let mut engine = WhisperEngine::new();
                        let settings = get_settings(app_handle);
                        let whisper_params = transcribe_rs::engines::whisper::WhisperModelParams {
                            use_gpu: settings.whisper_use_gpu,
                            ..Default::default()
                        };
                        engine.load_model_with_params(&mp, whisper_params).map_err(|e| {
                            anyhow::anyhow!("Failed to load whisper model {}: {}", model_id_str, e)
                        })?;
                        Ok(LoadedEngine::Whisper(engine))
                    }),
                )?
            }
            EngineType::Parakeet => {
                let model_id_str = model_id.to_string();
                let mp = model_path.clone();
                load_engine_with_recovery(
                    &self.app_handle, &model_id_str, &model_info.name, "Parakeet",
                    AssertUnwindSafe(|| {
                        let mut engine = ParakeetEngine::new();
                        engine.load_model_with_params(&mp, ParakeetModelParams::int8()).map_err(|e| {
                            anyhow::anyhow!("Failed to load parakeet model {}: {}", model_id_str, e)
                        })?;
                        Ok(LoadedEngine::Parakeet(engine))
                    }),
                )?
            }
            EngineType::Moonshine => {
                let model_id_str = model_id.to_string();
                let mp = model_path.clone();
                load_engine_with_recovery(
                    &self.app_handle, &model_id_str, &model_info.name, "Moonshine",
                    AssertUnwindSafe(|| {
                        let mut engine = MoonshineEngine::new();
                        engine.load_model_with_params(&mp, MoonshineModelParams::variant(ModelVariant::Base)).map_err(|e| {
                            anyhow::anyhow!("Failed to load moonshine model {}: {}", model_id_str, e)
                        })?;
                        Ok(LoadedEngine::Moonshine(engine))
                    }),
                )?
            }
            EngineType::MoonshineStreaming => {
                let model_id_str = model_id.to_string();
                let mp = model_path.clone();
                load_engine_with_recovery(
                    &self.app_handle, &model_id_str, &model_info.name, "Moonshine streaming",
                    AssertUnwindSafe(|| {
                        let mut engine = MoonshineStreamingEngine::new();
                        engine.load_model_with_params(&mp, StreamingModelParams::default()).map_err(|e| {
                            anyhow::anyhow!("Failed to load moonshine streaming model {}: {}", model_id_str, e)
                        })?;
                        Ok(LoadedEngine::MoonshineStreaming(engine))
                    }),
                )?
            }
            EngineType::SenseVoice => {
                let model_id_str = model_id.to_string();
                let mp = model_path.clone();
                load_engine_with_recovery(
                    &self.app_handle, &model_id_str, &model_info.name, "SenseVoice",
                    AssertUnwindSafe(|| {
                        let mut engine = SenseVoiceEngine::new();
                        engine.load_model_with_params(&mp, SenseVoiceModelParams::int8()).map_err(|e| {
                            anyhow::anyhow!("Failed to load SenseVoice model {}: {}", model_id_str, e)
                        })?;
                        Ok(LoadedEngine::SenseVoice(engine))
                    }),
                )?
            }
            EngineType::GeminiApi => {
                let settings = get_settings(&self.app_handle);
                if settings.gemini_api_key.is_none()
                    || settings
                        .gemini_api_key
                        .as_ref()
                        .map_or(true, |k| k.is_empty())
                {
                    let error_msg = "Gemini API key not configured";
                    let _ = self.app_handle.emit(
                        "model-state-changed",
                        ModelStateEvent {
                            event_type: "loading_failed".to_string(),
                            model_id: Some(model_id.to_string()),
                            model_name: Some(model_info.name.clone()),
                            error: Some(error_msg.to_string()),
                        },
                    );
                    return Err(anyhow::anyhow!(error_msg));
                }
                LoadedEngine::GeminiApi
            }
            EngineType::OpenAiApi => {
                let settings = get_settings(&self.app_handle);
                if settings.openai_api_key.is_none()
                    || settings
                        .openai_api_key
                        .as_ref()
                        .map_or(true, |k| k.is_empty())
                {
                    let error_msg = "OpenAI API key not configured";
                    let _ = self.app_handle.emit(
                        "model-state-changed",
                        ModelStateEvent {
                            event_type: "loading_failed".to_string(),
                            model_id: Some(model_id.to_string()),
                            model_name: Some(model_info.name.clone()),
                            error: Some(error_msg.to_string()),
                        },
                    );
                    return Err(anyhow::anyhow!(error_msg));
                }
                LoadedEngine::OpenAiApi
            }
        };

        {
            let mut engine = self.lock_engine();
            *engine = Some(loaded_engine);
        }
        {
            let mut current_model = self.current_model_id.lock().unwrap();
            *current_model = Some(model_id.to_string());
        }

        let _ = self.app_handle.emit(
            "model-state-changed",
            ModelStateEvent {
                event_type: "loading_completed".to_string(),
                model_id: Some(model_id.to_string()),
                model_name: Some(model_info.name.clone()),
                error: None,
            },
        );

        let load_duration = load_start.elapsed();
        debug!(
            "Successfully loaded transcription model: {} (took {}ms)",
            model_id,
            load_duration.as_millis()
        );
        Ok(())
    }

    pub fn initiate_model_load(&self) {
        let mut is_loading = self.is_loading.lock().unwrap();
        if *is_loading || self.is_model_loaded() {
            return;
        }

        *is_loading = true;
        let self_clone = self.clone();
        thread::spawn(move || {
            let settings = get_settings(&self_clone.app_handle);
            if let Err(e) = self_clone.load_model(&settings.selected_model) {
                error!("Failed to load model: {}", e);
            }
            let mut is_loading = self_clone.is_loading.lock().unwrap();
            *is_loading = false;
            self_clone.loading_condvar.notify_all();
        });
    }

    pub fn get_current_model(&self) -> Option<String> {
        let current_model = self.current_model_id.lock().unwrap();
        current_model.clone()
    }

    pub fn get_current_model_name(&self) -> Option<String> {
        let model_id = self.get_current_model()?;
        self.model_manager
            .get_model_info(&model_id)
            .map(|info| info.name)
    }

    pub fn transcribe(&self, audio: Vec<f32>) -> Result<String> {
        self.last_activity.store(
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            Ordering::Relaxed,
        );

        let st = std::time::Instant::now();

        debug!("Audio vector length: {}", audio.len());

        if audio.is_empty() {
            debug!("Empty audio vector");
            self.maybe_unload_immediately("empty audio");
            return Ok(String::new());
        }

        let audio = normalize_audio(audio);

        if audio.is_empty() {
            debug!("Audio is near-silence after normalization, skipping transcription");
            self.maybe_unload_immediately("near-silence audio");
            return Ok(String::new());
        }

        let chunks = chunk_audio_by_silence(&audio);
        if chunks.len() > 1 {
            info!(
                "Long audio ({:.1}s) split into {} chunks for transcription",
                audio.len() as f32 / WHISPER_SAMPLE_RATE as f32,
                chunks.len()
            );
            let mut all_results = Vec::new();
            let mut forced_language: Option<String> = None;
            let total_chunks = chunks.len();
            for (i, chunk) in chunks.into_iter().enumerate() {
                let chunk_duration = chunk.len() as f32 / WHISPER_SAMPLE_RATE as f32;
                debug!("Transcribing chunk {}/{} ({:.1}s)", i + 1, total_chunks, chunk_duration);
                match self.transcribe_single(chunk, forced_language.clone()) {
                    Ok(text) if !text.is_empty() => {
                        use crate::audio_toolkit::text::filter_transcription_output;
                        let filtered = filter_transcription_output(&text);
                        if filtered.is_empty() {
                            debug!("Chunk {} discarded as hallucinated noise: {:?}", i + 1, text);
                        } else {
                        if i == 0 && forced_language.is_none() {
                            let settings = get_settings(&self.app_handle);
                            if settings.selected_language == "auto"
                                || settings.selected_language == "os-input"
                            {
                                if let Some(lang) = detect_language_from_text(&text) {
                                    info!("Auto-detected language '{}' from first chunk, forcing for remaining chunks", lang);
                                    forced_language = Some(lang);
                                }
                            }
                        }
                        all_results.push(text);
                        }
                    }
                    Ok(_) => debug!("Chunk {} returned empty result", i + 1),
                    Err(e) => warn!("Chunk {} transcription failed: {}", i + 1, e),
                }
            }
            let final_result = all_results.join(" ");
            let settings = get_settings(&self.app_handle);
            let final_result = apply_post_processing(&final_result, &settings);
            info!(
                "Chunked transcription completed in {}ms: {} chunks, {} chars",
                st.elapsed().as_millis(),
                all_results.len(),
                final_result.len()
            );
            self.maybe_unload_immediately("chunked transcription");
            return Ok(final_result);
        }

        self.transcribe_single(audio, None)
    }

    fn transcribe_single(&self, audio: Vec<f32>, language_override: Option<String>) -> Result<String> {
        let st = std::time::Instant::now();

        {
            let mut is_loading = self.is_loading.lock().unwrap();
            while *is_loading {
                is_loading = self.loading_condvar.wait(is_loading).unwrap();
            }

            let engine_guard = self.lock_engine();
            if engine_guard.is_none() {
                return Err(anyhow::anyhow!("Model is not loaded for transcription."));
            }
        }

        let mut settings = get_settings(&self.app_handle);

        if settings.selected_language == "os-input" {
            settings.selected_language = crate::commands::get_language_from_os_input()
                .unwrap_or_else(|| "auto".to_string());
            debug!("Resolved OS input language to: {}", settings.selected_language);
        }

        if let Some(ref lang) = language_override {
            debug!("Using language override: {}", lang);
            settings.selected_language = lang.clone();
        }

        {
            let engine_guard = self.lock_engine();
            if let Some(LoadedEngine::GeminiApi) = engine_guard.as_ref() {
                drop(engine_guard);
                let api_key = settings
                    .gemini_api_key
                    .as_ref()
                    .ok_or_else(|| anyhow::anyhow!("Gemini API key not configured"))?
                    .clone();
                let gemini_model = settings.gemini_model.clone();

                let result = tokio::task::block_in_place(|| {
                    tokio::runtime::Handle::current().block_on(
                        crate::gemini_client::transcribe_audio(&api_key, &gemini_model, &audio),
                    )
                })?;

                let final_result = apply_post_processing(&result, &settings);

                let et = std::time::Instant::now();
                info!(
                    "Gemini transcription completed in {}ms",
                    (et - st).as_millis()
                );

                self.maybe_unload_immediately("gemini transcription");
                return Ok(final_result);
            }
        }

        {
            let engine_guard = self.lock_engine();
            if let Some(LoadedEngine::OpenAiApi) = engine_guard.as_ref() {
                drop(engine_guard);
                let api_key = settings
                    .openai_api_key
                    .as_ref()
                    .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?
                    .clone();
                let openai_model = settings.openai_model.clone();
                let language = if settings.selected_language == "auto" {
                    None
                } else {
                    Some(settings.selected_language.clone())
                };

                let result = tokio::task::block_in_place(|| {
                    tokio::runtime::Handle::current().block_on(
                        crate::openai_client::transcribe_audio(
                            &api_key,
                            &openai_model,
                            &audio,
                            language.as_deref(),
                        ),
                    )
                })?;

                let final_result = apply_post_processing(&result, &settings);

                let et = std::time::Instant::now();
                info!(
                    "OpenAI transcription completed in {}ms",
                    (et - st).as_millis()
                );

                self.maybe_unload_immediately("openai transcription");
                return Ok(final_result);
            }
        }

        let result = {
            let mut engine_guard = self.lock_engine();

            let mut engine = match engine_guard.take() {
                Some(e) => e,
                None => {
                    return Err(anyhow::anyhow!(
                        "Model failed to load after auto-load attempt. Please check your model settings."
                    ));
                }
            };

            drop(engine_guard);

            let current_model_id = self.get_current_model();
            let model_manager = &self.model_manager;

            let transcribe_result = catch_unwind(AssertUnwindSafe(
                || -> Result<transcribe_rs::TranscriptionResult> {
                    match &mut engine {
                        LoadedEngine::Whisper(whisper_engine) => {
                            let mut whisper_language = if settings.selected_language == "auto" {
                                None
                            } else {
                                let normalized = if settings.selected_language == "zh-Hans"
                                    || settings.selected_language == "zh-Hant"
                                {
                                    "zh".to_string()
                                } else {
                                    settings.selected_language.clone()
                                };
                                Some(normalized)
                            };

                            if whisper_language.is_none() {
                                if let Some(model_id) = current_model_id.as_ref() {
                                    if let Some(info) = model_manager.get_model_info(model_id) {
                                        if info.supported_languages.len() == 1 {
                                            whisper_language = Some(info.supported_languages[0].clone());
                                        }
                                    }
                                }
                            }

                            let params = WhisperInferenceParams {
                                language: whisper_language,
                                translate: settings.translate_to_english,
                                initial_prompt: {
                                    let mut prompt_parts = Vec::new();
                                    if let Some(ref p) = settings.whisper_initial_prompt {
                                        if !p.trim().is_empty() {
                                            prompt_parts.push(p.clone());
                                        }
                                    }
                                    if !settings.custom_words.is_empty() {
                                        prompt_parts.push(settings.custom_words.join(", "));
                                    }
                                    if prompt_parts.is_empty() {
                                        None
                                    } else {
                                        Some(prompt_parts.join(". "))
                                    }
                                },
                                ..Default::default()
                            };

                            whisper_engine
                                .transcribe_samples(audio, Some(params))
                                .map_err(|e| anyhow::anyhow!("Whisper transcription failed: {}", e))
                        }
                        LoadedEngine::Parakeet(parakeet_engine) => {
                            let params = ParakeetInferenceParams {
                                timestamp_granularity: TimestampGranularity::Segment,
                                ..Default::default()
                            };
                            parakeet_engine
                                .transcribe_samples(audio, Some(params))
                                .map_err(|e| {
                                    anyhow::anyhow!("Parakeet transcription failed: {}", e)
                                })
                        }
                        LoadedEngine::Moonshine(moonshine_engine) => moonshine_engine
                            .transcribe_samples(audio, None)
                            .map_err(|e| anyhow::anyhow!("Moonshine transcription failed: {}", e)),
                        LoadedEngine::MoonshineStreaming(streaming_engine) => streaming_engine
                            .transcribe_samples(audio, None)
                            .map_err(|e| {
                                anyhow::anyhow!("Moonshine streaming transcription failed: {}", e)
                            }),
                        LoadedEngine::SenseVoice(sense_voice_engine) => {
                            let language = match settings.selected_language.as_str() {
                                "zh" | "zh-Hans" | "zh-Hant" => SenseVoiceLanguage::Chinese,
                                "en" => SenseVoiceLanguage::English,
                                "ja" => SenseVoiceLanguage::Japanese,
                                "ko" => SenseVoiceLanguage::Korean,
                                "yue" => SenseVoiceLanguage::Cantonese,
                                _ => SenseVoiceLanguage::Auto,
                            };
                            let params = SenseVoiceInferenceParams {
                                language,
                                use_itn: true,
                            };
                            sense_voice_engine
                                .transcribe_samples(audio, Some(params))
                                .map_err(|e| {
                                    anyhow::anyhow!("SenseVoice transcription failed: {}", e)
                                })
                        }
                        LoadedEngine::GeminiApi => {
                            unreachable!("GeminiApi handled before catch_unwind")
                        }
                        LoadedEngine::OpenAiApi => {
                            unreachable!("OpenAiApi handled before catch_unwind")
                        }
                    }
                },
            ));

            match transcribe_result {
                Ok(inner_result) => {
                    let mut engine_guard = self.lock_engine();
                    *engine_guard = Some(engine);
                    inner_result?
                }
                Err(panic_payload) => {
                    let panic_msg = if let Some(s) = panic_payload.downcast_ref::<&str>() {
                        s.to_string()
                    } else if let Some(s) = panic_payload.downcast_ref::<String>() {
                        s.clone()
                    } else {
                        "unknown panic".to_string()
                    };
                    error!(
                        "Transcription engine panicked: {}. Model has been unloaded.",
                        panic_msg
                    );

                    {
                        let mut current_model = self
                            .current_model_id
                            .lock()
                            .unwrap_or_else(|e| e.into_inner());
                        *current_model = None;
                    }

                    let _ = self.app_handle.emit(
                        "model-state-changed",
                        ModelStateEvent {
                            event_type: "unloaded".to_string(),
                            model_id: None,
                            model_name: None,
                            error: Some(format!("Engine panicked: {}", panic_msg)),
                        },
                    );

                    return Err(anyhow::anyhow!(
                        "Transcription engine panicked: {}. The model has been unloaded and will reload on next attempt.",
                        panic_msg
                    ));
                }
            }
        };

        let filtered_result = apply_post_processing(&result.text, &settings);

        let et = std::time::Instant::now();
        let translation_note = if settings.translate_to_english {
            " (translated)"
        } else {
            ""
        };
        info!(
            "Transcription completed in {}ms{}",
            (et - st).as_millis(),
            translation_note
        );

        let final_result = filtered_result;

        if final_result.is_empty() {
            info!("Transcription result is empty");
        } else {
            info!("Transcription result: {}", final_result);
        }

        self.maybe_unload_immediately("transcription");

        Ok(final_result)
    }
}

pub fn run_transcription_hook(app_handle: &AppHandle, text: &str) {
    use tauri::Manager;

    let data_dir = match app_handle.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return,
    };

    let hook_path = data_dir.join("hooks").join("transcription");

    #[cfg(target_os = "windows")]
    let hook_path = {
        if hook_path.exists() {
            hook_path
        } else {
            let extensions = ["exe", "bat", "cmd"];
            extensions
                .iter()
                .map(|ext| hook_path.with_extension(ext))
                .find(|p| p.exists())
                .unwrap_or(hook_path)
        }
    };

    if !hook_path.exists() {
        return;
    }

    let text = text.to_string();
    let hook = hook_path.clone();
    std::thread::spawn(move || {
        use std::io::Write;
        use std::process::{Command, Stdio};

        let mut child = match Command::new(&hook)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                warn!("Failed to run transcription hook {:?}: {}", hook, e);
                return;
            }
        };

        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(text.as_bytes());
        }

        match child.wait() {
            Ok(status) => {
                if !status.success() {
                    warn!("Transcription hook exited with status: {}", status);
                }
            }
            Err(e) => warn!("Failed to wait for transcription hook: {}", e),
        }
    });
}

impl Drop for TranscriptionManager {
    fn drop(&mut self) {
        debug!("Shutting down TranscriptionManager");

        self.shutdown_signal.store(true, Ordering::Relaxed);

        if let Some(handle) = self.watcher_handle.lock().unwrap().take() {
            if let Err(e) = handle.join() {
                warn!("Failed to join idle watcher thread: {:?}", e);
            } else {
                debug!("Idle watcher thread joined successfully");
            }
        }
    }
}
