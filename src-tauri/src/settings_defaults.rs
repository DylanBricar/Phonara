use std::collections::HashMap;

use crate::settings_types::*;

pub const APPLE_INTELLIGENCE_PROVIDER_ID: &str = "apple_intelligence";
pub const APPLE_INTELLIGENCE_DEFAULT_MODEL_ID: &str = "Apple Intelligence";

pub fn default_model() -> String {
    String::new()
}

pub fn default_whisper_use_gpu() -> bool {
    true
}

pub fn default_always_on_microphone() -> bool {
    false
}

pub fn default_translate_to_english() -> bool {
    false
}

pub fn default_start_hidden() -> bool {
    false
}

pub fn default_autostart_enabled() -> bool {
    false
}

pub fn default_update_checks_enabled() -> bool {
    true
}

pub fn default_selected_language() -> String {
    "auto".to_string()
}

pub fn default_secondary_selected_language() -> String {
    "auto".to_string()
}

pub fn default_overlay_position() -> OverlayPosition {
    #[cfg(target_os = "linux")]
    return OverlayPosition::None;
    #[cfg(not(target_os = "linux"))]
    return OverlayPosition::Bottom;
}

pub fn default_debug_mode() -> bool {
    false
}

pub fn default_log_level() -> LogLevel {
    LogLevel::Debug
}

pub fn default_word_correction_threshold() -> f64 {
    0.18
}

pub fn default_paste_delay_ms() -> u64 {
    100
}

pub fn default_auto_submit() -> bool {
    false
}

pub fn default_history_limit() -> usize {
    5
}

pub fn default_recording_retention_period() -> RecordingRetentionPeriod {
    RecordingRetentionPeriod::PreserveLimit
}

pub fn default_audio_feedback_volume() -> f32 {
    1.0
}

pub fn default_sound_theme() -> SoundTheme {
    SoundTheme::Marimba
}

pub fn default_post_process_enabled() -> bool {
    false
}

pub fn default_app_language() -> String {
    tauri_plugin_os::locale()
        .map(|l| l.replace('_', "-"))
        .unwrap_or_else(|| "en".to_string())
}

pub fn default_show_tray_icon() -> bool {
    true
}

pub fn default_post_process_provider_id() -> String {
    "openai".to_string()
}

pub fn default_post_process_providers() -> Vec<PostProcessProvider> {
    let mut providers = vec![
        PostProcessProvider {
            id: "openai".to_string(),
            label: "OpenAI".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            allow_base_url_edit: false,
            models_endpoint: Some("/models".to_string()),
            supports_structured_output: true,
            requires_api_key: true,
        },
        PostProcessProvider {
            id: "zai".to_string(),
            label: "Z.AI".to_string(),
            base_url: "https://api.z.ai/api/paas/v4".to_string(),
            allow_base_url_edit: false,
            models_endpoint: Some("/models".to_string()),
            supports_structured_output: true,
            requires_api_key: true,
        },
        PostProcessProvider {
            id: "openrouter".to_string(),
            label: "OpenRouter".to_string(),
            base_url: "https://openrouter.ai/api/v1".to_string(),
            allow_base_url_edit: false,
            models_endpoint: Some("/models".to_string()),
            supports_structured_output: true,
            requires_api_key: true,
        },
        PostProcessProvider {
            id: "anthropic".to_string(),
            label: "Anthropic".to_string(),
            base_url: "https://api.anthropic.com/v1".to_string(),
            allow_base_url_edit: false,
            models_endpoint: Some("/models".to_string()),
            supports_structured_output: false,
            requires_api_key: true,
        },
        PostProcessProvider {
            id: "groq".to_string(),
            label: "Groq".to_string(),
            base_url: "https://api.groq.com/openai/v1".to_string(),
            allow_base_url_edit: false,
            models_endpoint: Some("/models".to_string()),
            supports_structured_output: false,
            requires_api_key: true,
        },
        PostProcessProvider {
            id: "cerebras".to_string(),
            label: "Cerebras".to_string(),
            base_url: "https://api.cerebras.ai/v1".to_string(),
            allow_base_url_edit: false,
            models_endpoint: Some("/models".to_string()),
            supports_structured_output: true,
            requires_api_key: true,
        },
    ];

    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        providers.push(PostProcessProvider {
            id: APPLE_INTELLIGENCE_PROVIDER_ID.to_string(),
            label: "Apple Intelligence".to_string(),
            base_url: "apple-intelligence://local".to_string(),
            allow_base_url_edit: false,
            models_endpoint: None,
            supports_structured_output: true,
            requires_api_key: false,
        });
    }

    providers.push(PostProcessProvider {
        id: "gemini".to_string(),
        label: "Gemini".to_string(),
        base_url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
        allow_base_url_edit: false,
        models_endpoint: None,
        supports_structured_output: false,
        requires_api_key: true,
    });

    providers.push(PostProcessProvider {
        id: "ollama".to_string(),
        label: "Ollama".to_string(),
        base_url: "http://localhost:11434/v1".to_string(),
        allow_base_url_edit: true,
        models_endpoint: Some("/models".to_string()),
        supports_structured_output: false,
        requires_api_key: false,
    });

    providers.push(PostProcessProvider {
        id: "custom".to_string(),
        label: "Custom".to_string(),
        base_url: "http://localhost:11434/v1".to_string(),
        allow_base_url_edit: true,
        models_endpoint: Some("/models".to_string()),
        supports_structured_output: false,
        requires_api_key: false,
    });

    providers
}

pub fn default_post_process_api_keys() -> HashMap<String, String> {
    let mut map = HashMap::new();
    for provider in default_post_process_providers() {
        map.insert(provider.id, String::new());
    }
    map
}

pub fn default_model_for_provider(provider_id: &str) -> String {
    if provider_id == APPLE_INTELLIGENCE_PROVIDER_ID {
        return APPLE_INTELLIGENCE_DEFAULT_MODEL_ID.to_string();
    }
    String::new()
}

pub fn default_post_process_models() -> HashMap<String, String> {
    let mut map = HashMap::new();
    for provider in default_post_process_providers() {
        map.insert(
            provider.id.clone(),
            default_model_for_provider(&provider.id),
        );
    }
    map
}

pub fn default_post_process_prompts() -> Vec<LLMPrompt> {
    vec![LLMPrompt {
        id: "default_improve_transcriptions".to_string(),
        name: "Improve Transcriptions".to_string(),
        prompt: "Clean this transcript:\n1. Fix spelling, capitalization, and punctuation errors\n2. Convert number words to digits (twenty-five → 25, ten percent → 10%, five dollars → $5)\n3. Replace spoken punctuation with symbols (period → ., comma → ,, question mark → ?)\n4. Remove filler words (um, uh, like as filler)\n5. Keep the language in the original version (if it was french, keep it in french for example)\n\nPreserve exact meaning and word order. Do not paraphrase or reorder content.\n\nReturn only the cleaned transcript.\n\nTranscript:\n${output}".to_string(),
    }]
}

pub fn default_typing_tool() -> TypingTool {
    TypingTool::Auto
}

pub fn default_long_audio_threshold_seconds() -> f32 {
    10.0
}

pub fn default_gemini_model() -> String {
    "gemini-2.0-flash".to_string()
}

pub fn default_openai_model() -> String {
    "gpt-4o-mini-transcribe".to_string()
}

pub fn default_overlay_border_width() -> u8 {
    1
}

pub fn default_overlay_width() -> u16 {
    200
}

pub fn default_overlay_height() -> u16 {
    40
}

pub fn default_extra_recording_buffer_ms() -> u64 {
    0
}

pub fn default_api_server_enabled() -> bool {
    false
}

pub fn default_api_server_port() -> u16 {
    8787
}

pub fn default_wake_word_sensitivity() -> f32 {
    0.5
}

pub fn default_live_transcription_mode() -> LiveTranscriptionMode {
    LiveTranscriptionMode::Off
}

pub fn ensure_post_process_defaults(settings: &mut AppSettings) -> bool {
    let mut changed = false;
    for provider in default_post_process_providers() {
        match settings
            .post_process_providers
            .iter_mut()
            .find(|p| p.id == provider.id)
        {
            Some(existing) => {
                if existing.supports_structured_output != provider.supports_structured_output {
                    existing.supports_structured_output = provider.supports_structured_output;
                    changed = true;
                }
            }
            None => {
                settings.post_process_providers.push(provider.clone());
                changed = true;
            }
        }

        if !settings.post_process_api_keys.contains_key(&provider.id) {
            settings
                .post_process_api_keys
                .insert(provider.id.clone(), String::new());
            changed = true;
        }

        let default_model = default_model_for_provider(&provider.id);
        match settings.post_process_models.get_mut(&provider.id) {
            Some(existing) => {
                if existing.is_empty() && !default_model.is_empty() {
                    *existing = default_model.clone();
                    changed = true;
                }
            }
            None => {
                settings
                    .post_process_models
                    .insert(provider.id.clone(), default_model);
                changed = true;
            }
        }
    }

    changed
}

pub fn get_default_settings() -> AppSettings {
    #[cfg(target_os = "windows")]
    let default_shortcut = "ctrl+space";
    #[cfg(target_os = "macos")]
    let default_shortcut = "option+space";
    #[cfg(target_os = "linux")]
    let default_shortcut = "ctrl+space";
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let default_shortcut = "alt+space";

    let mut bindings = HashMap::new();
    bindings.insert(
        "transcribe".to_string(),
        ShortcutBinding {
            id: "transcribe".to_string(),
            name: "Transcribe".to_string(),
            description: "Converts your speech into text.".to_string(),
            default_binding: default_shortcut.to_string(),
            current_binding: default_shortcut.to_string(),
        },
    );

    #[cfg(target_os = "windows")]
    let default_post_process_shortcut = "ctrl+shift+space";
    #[cfg(target_os = "macos")]
    let default_post_process_shortcut = "option+shift+space";
    #[cfg(target_os = "linux")]
    let default_post_process_shortcut = "ctrl+shift+space";
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let default_post_process_shortcut = "alt+shift+space";

    bindings.insert(
        "transcribe_secondary".to_string(),
        ShortcutBinding {
            id: "transcribe_secondary".to_string(),
            name: "Transcribe Secondary".to_string(),
            description: "Converts your speech into text using the secondary language setting.".to_string(),
            default_binding: String::new(),
            current_binding: String::new(),
        },
    );

    bindings.insert(
        "transcribe_with_post_process".to_string(),
        ShortcutBinding {
            id: "transcribe_with_post_process".to_string(),
            name: "Transcribe with Post-Processing".to_string(),
            description: "Converts your speech into text and applies AI post-processing."
                .to_string(),
            default_binding: default_post_process_shortcut.to_string(),
            current_binding: default_post_process_shortcut.to_string(),
        },
    );
    bindings.insert(
        "cancel".to_string(),
        ShortcutBinding {
            id: "cancel".to_string(),
            name: "Cancel".to_string(),
            description: "Cancels the current recording.".to_string(),
            default_binding: "escape".to_string(),
            current_binding: "escape".to_string(),
        },
    );
    bindings.insert(
        "pause".to_string(),
        ShortcutBinding {
            id: "pause".to_string(),
            name: "Pause / Resume".to_string(),
            description: "Pauses or resumes the current recording.".to_string(),
            default_binding: "f6".to_string(),
            current_binding: "f6".to_string(),
        },
    );
    bindings.insert(
        "show_history".to_string(),
        ShortcutBinding {
            id: "show_history".to_string(),
            name: "Show History".to_string(),
            description: "Opens the app window and navigates to the History tab.".to_string(),
            default_binding: String::new(),
            current_binding: String::new(),
        },
    );
    bindings.insert(
        "copy_latest_history".to_string(),
        ShortcutBinding {
            id: "copy_latest_history".to_string(),
            name: "Copy Latest History".to_string(),
            description: "Copies the latest transcription entry to your clipboard.".to_string(),
            default_binding: String::new(),
            current_binding: String::new(),
        },
    );

    AppSettings {
        bindings,
        push_to_talk: true,
        audio_feedback: false,
        audio_feedback_volume: default_audio_feedback_volume(),
        sound_theme: default_sound_theme(),
        start_hidden: default_start_hidden(),
        autostart_enabled: default_autostart_enabled(),
        update_checks_enabled: default_update_checks_enabled(),
        selected_model: String::new(),
        always_on_microphone: false,
        selected_microphone: None,
        prioritized_microphones: Vec::new(),
        clamshell_microphone: None,
        selected_output_device: None,
        translate_to_english: false,
        selected_language: "auto".to_string(),
        secondary_selected_language: default_secondary_selected_language(),
        overlay_position: default_overlay_position(),
        overlay_high_visibility: false,
        debug_mode: false,
        log_level: default_log_level(),
        custom_words: Vec::new(),
        text_replacements: Vec::new(),
        model_unload_timeout: ModelUnloadTimeout::Never,
        word_correction_threshold: default_word_correction_threshold(),
        history_limit: default_history_limit(),
        recording_retention_period: default_recording_retention_period(),
        paste_method: PasteMethod::default(),
        clipboard_handling: ClipboardHandling::default(),
        auto_submit: default_auto_submit(),
        auto_submit_key: AutoSubmitKey::default(),
        post_process_enabled: default_post_process_enabled(),
        post_process_provider_id: default_post_process_provider_id(),
        post_process_providers: default_post_process_providers(),
        post_process_api_keys: default_post_process_api_keys(),
        post_process_models: default_post_process_models(),
        post_process_prompts: default_post_process_prompts(),
        post_process_selected_prompt_id: None,
        mute_while_recording: false,
        append_trailing_space: false,
        app_language: default_app_language(),
        experimental_enabled: false,
        keyboard_implementation: KeyboardImplementation::default(),
        show_tray_icon: default_show_tray_icon(),
        paste_delay_ms: default_paste_delay_ms(),
        typing_tool: default_typing_tool(),
        external_script_path: None,
        long_audio_model: None,
        long_audio_threshold_seconds: default_long_audio_threshold_seconds(),
        gemini_api_key: None,
        gemini_model: default_gemini_model(),
        openai_api_key: None,
        openai_model: default_openai_model(),
        post_process_actions: Vec::new(),
        saved_processing_models: Vec::new(),
        whisper_initial_prompt: None,
        whisper_use_gpu: default_whisper_use_gpu(),
        custom_start_sound: None,
        custom_stop_sound: None,
        custom_recordings_directory: None,
        overlay_border_color: None,
        overlay_background_color: None,
        overlay_border_width: default_overlay_border_width(),
        overlay_custom_width: default_overlay_width(),
        overlay_custom_height: default_overlay_height(),
        theme_mode: ThemeMode::default(),
        accent_color: AccentColor::default(),
        extra_recording_buffer_ms: default_extra_recording_buffer_ms(),
        api_server_enabled: default_api_server_enabled(),
        api_server_port: default_api_server_port(),
        api_server_token: None,
        wake_word_enabled: false,
        wake_word_sensitivity: default_wake_word_sensitivity(),
        wake_word_model: None,
        live_transcription_enabled: false,
        live_transcription_mode: default_live_transcription_mode(),
    }
}
