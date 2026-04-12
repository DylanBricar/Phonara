use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

use crate::settings::{
    self, AutoSubmitKey, ClipboardHandling, LLMPrompt, OverlayPosition, PasteMethod, SoundTheme,
    TypingTool, APPLE_INTELLIGENCE_PROVIDER_ID,
};
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
use crate::settings::APPLE_INTELLIGENCE_DEFAULT_MODEL_ID;
use crate::tray;

use super::{register_shortcut, unregister_shortcut};

#[tauri::command]
#[specta::specta]
pub fn change_ptt_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.push_to_talk = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_audio_feedback_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.audio_feedback = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_audio_feedback_volume_setting(app: AppHandle, volume: f32) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.audio_feedback_volume = volume;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_sound_theme_setting(app: AppHandle, theme: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match theme.as_str() {
        "marimba" => SoundTheme::Marimba,
        "pop" => SoundTheme::Pop,
        "custom" => SoundTheme::Custom,
        _ => SoundTheme::Marimba,
    };
    settings.sound_theme = parsed;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_translate_to_english_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.translate_to_english = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_selected_language_setting(app: AppHandle, language: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.selected_language = language;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_position_setting(app: AppHandle, position: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match position.as_str() {
        "none" => OverlayPosition::None,
        "top" => OverlayPosition::Top,
        "bottom" => OverlayPosition::Bottom,
        _ => OverlayPosition::Bottom,
    };
    settings.overlay_position = parsed;
    settings::write_settings(&app, settings);

    crate::utils::update_overlay_position(&app);

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_debug_mode_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.debug_mode = enabled;
    settings::write_settings(&app, settings);

    let _ = app.emit(
        "settings-changed",
        serde_json::json!({
            "setting": "debug_mode",
            "value": enabled
        }),
    );

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_start_hidden_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.start_hidden = enabled;
    settings::write_settings(&app, settings);

    let _ = app.emit(
        "settings-changed",
        serde_json::json!({
            "setting": "start_hidden",
            "value": enabled
        }),
    );

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_autostart_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.autostart_enabled = enabled;
    settings::write_settings(&app, settings);

    let autostart_manager = app.autolaunch();
    if enabled {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }

    let _ = app.emit(
        "settings-changed",
        serde_json::json!({
            "setting": "autostart_enabled",
            "value": enabled
        }),
    );

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_update_checks_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.update_checks_enabled = enabled;
    settings::write_settings(&app, settings);

    let _ = app.emit(
        "settings-changed",
        serde_json::json!({
            "setting": "update_checks_enabled",
            "value": enabled
        }),
    );

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn update_custom_words(app: AppHandle, words: Vec<String>) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.custom_words = words;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn update_text_replacements(
    app: AppHandle,
    replacements: Vec<settings::TextReplacement>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.text_replacements = replacements;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_whisper_initial_prompt_setting(
    app: AppHandle,
    prompt: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.whisper_initial_prompt = prompt;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_whisper_use_gpu_setting(
    app: AppHandle,
    enabled: bool,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.whisper_use_gpu = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_word_correction_threshold_setting(
    app: AppHandle,
    threshold: f64,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.word_correction_threshold = threshold;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_paste_method_setting(app: AppHandle, method: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match method.as_str() {
        "ctrl_v" => PasteMethod::CtrlV,
        "direct" => PasteMethod::Direct,
        "none" => PasteMethod::None,
        "shift_insert" => PasteMethod::ShiftInsert,
        "ctrl_shift_v" => PasteMethod::CtrlShiftV,
        "external_script" => PasteMethod::ExternalScript,
        _ => PasteMethod::CtrlV,
    };
    settings.paste_method = parsed;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_available_typing_tools() -> Vec<String> {
    #[cfg(target_os = "linux")]
    {
        crate::clipboard::get_available_typing_tools()
    }
    #[cfg(not(target_os = "linux"))]
    {
        vec!["auto".to_string()]
    }
}

#[tauri::command]
#[specta::specta]
pub fn change_typing_tool_setting(app: AppHandle, tool: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match tool.as_str() {
        "auto" => TypingTool::Auto,
        "wtype" => TypingTool::Wtype,
        "kwtype" => TypingTool::Kwtype,
        "dotool" => TypingTool::Dotool,
        "ydotool" => TypingTool::Ydotool,
        "xdotool" => TypingTool::Xdotool,
        _ => TypingTool::Auto,
    };
    settings.typing_tool = parsed;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_external_script_path_setting(
    app: AppHandle,
    path: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.external_script_path = path;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_clipboard_handling_setting(app: AppHandle, handling: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match handling.as_str() {
        "dont_modify" => ClipboardHandling::DontModify,
        "copy_to_clipboard" => ClipboardHandling::CopyToClipboard,
        _ => ClipboardHandling::DontModify,
    };
    settings.clipboard_handling = parsed;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_auto_submit_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.auto_submit = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_auto_submit_key_setting(app: AppHandle, key: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match key.as_str() {
        "enter" => AutoSubmitKey::Enter,
        "ctrl_enter" => AutoSubmitKey::CtrlEnter,
        "cmd_enter" => AutoSubmitKey::CmdEnter,
        _ => AutoSubmitKey::Enter,
    };
    settings.auto_submit_key = parsed;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_post_process_enabled_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.post_process_enabled = enabled;
    settings::write_settings(&app, settings.clone());

    if let Some(binding) = settings
        .bindings
        .get("transcribe_with_post_process")
        .cloned()
    {
        if enabled {
            let _ = register_shortcut(&app, binding);
        } else {
            let _ = unregister_shortcut(&app, binding);
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_experimental_enabled_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.experimental_enabled = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_post_process_base_url_setting(
    app: AppHandle,
    provider_id: String,
    base_url: String,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let label = settings
        .post_process_provider(&provider_id)
        .map(|provider| provider.label.clone())
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;

    let provider = settings
        .post_process_provider_mut(&provider_id)
        .expect("Provider looked up above must exist");

    if provider.id != "custom" {
        return Err(format!(
            "Provider '{}' does not allow editing the base URL",
            label
        ));
    }

    provider.base_url = base_url;
    settings::write_settings(&app, settings);
    Ok(())
}

fn validate_provider_exists(
    settings: &settings::AppSettings,
    provider_id: &str,
) -> Result<(), String> {
    if !settings
        .post_process_providers
        .iter()
        .any(|provider| provider.id == provider_id)
    {
        return Err(format!("Provider '{}' not found", provider_id));
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_post_process_api_key_setting(
    app: AppHandle,
    provider_id: String,
    api_key: String,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    validate_provider_exists(&settings, &provider_id)?;
    settings.post_process_api_keys.insert(provider_id, api_key);
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_post_process_model_setting(
    app: AppHandle,
    provider_id: String,
    model: String,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    validate_provider_exists(&settings, &provider_id)?;
    settings.post_process_models.insert(provider_id, model);
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_post_process_provider(app: AppHandle, provider_id: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    validate_provider_exists(&settings, &provider_id)?;
    settings.post_process_provider_id = provider_id;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn add_post_process_prompt(
    app: AppHandle,
    name: String,
    prompt: String,
) -> Result<LLMPrompt, String> {
    let mut settings = settings::get_settings(&app);

    let id = format!("prompt_{}", chrono::Utc::now().timestamp_millis());

    let new_prompt = LLMPrompt {
        id: id.clone(),
        name,
        prompt,
    };

    settings.post_process_prompts.push(new_prompt.clone());
    settings::write_settings(&app, settings);

    Ok(new_prompt)
}

#[tauri::command]
#[specta::specta]
pub fn update_post_process_prompt(
    app: AppHandle,
    id: String,
    name: String,
    prompt: String,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);

    if let Some(existing_prompt) = settings
        .post_process_prompts
        .iter_mut()
        .find(|p| p.id == id)
    {
        existing_prompt.name = name;
        existing_prompt.prompt = prompt;
        settings::write_settings(&app, settings);
        Ok(())
    } else {
        Err(format!("Prompt with id '{}' not found", id))
    }
}

#[tauri::command]
#[specta::specta]
pub fn delete_post_process_prompt(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);

    if settings.post_process_prompts.len() <= 1 {
        return Err("Cannot delete the last prompt".to_string());
    }

    let original_len = settings.post_process_prompts.len();
    settings.post_process_prompts.retain(|p| p.id != id);

    if settings.post_process_prompts.len() == original_len {
        return Err(format!("Prompt with id '{}' not found", id));
    }

    if settings.post_process_selected_prompt_id.as_ref() == Some(&id) {
        settings.post_process_selected_prompt_id =
            settings.post_process_prompts.first().map(|p| p.id.clone());
    }

    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn add_post_process_action(
    app: AppHandle,
    key: u8,
    name: String,
    prompt: String,
    model: Option<String>,
    provider_id: Option<String>,
) -> Result<settings::PostProcessAction, String> {
    if key < 1 || key > 9 {
        return Err("Action key must be between 1 and 9".to_string());
    }

    let mut settings = settings::get_settings(&app);

    if settings.post_process_actions.iter().any(|a| a.key == key) {
        return Err(format!("Action with key {} already exists", key));
    }

    let action = settings::PostProcessAction {
        key,
        name,
        prompt,
        model: model.filter(|m| !m.trim().is_empty()),
        provider_id: provider_id.filter(|p| !p.trim().is_empty()),
    };

    settings.post_process_actions.push(action.clone());
    settings::write_settings(&app, settings);
    Ok(action)
}

#[tauri::command]
#[specta::specta]
pub fn update_post_process_action(
    app: AppHandle,
    key: u8,
    name: String,
    prompt: String,
    model: Option<String>,
    provider_id: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);

    if let Some(action) = settings
        .post_process_actions
        .iter_mut()
        .find(|a| a.key == key)
    {
        action.name = name;
        action.prompt = prompt;
        action.model = model.filter(|m| !m.trim().is_empty());
        action.provider_id = provider_id.filter(|p| !p.trim().is_empty());
        settings::write_settings(&app, settings);
        Ok(())
    } else {
        Err(format!("Action with key {} not found", key))
    }
}

#[tauri::command]
#[specta::specta]
pub fn delete_post_process_action(app: AppHandle, key: u8) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);

    let original_len = settings.post_process_actions.len();
    settings.post_process_actions.retain(|a| a.key != key);

    if settings.post_process_actions.len() == original_len {
        return Err(format!("Action with key {} not found", key));
    }

    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn add_saved_processing_model(
    app: AppHandle,
    provider_id: String,
    model_id: String,
    label: String,
) -> Result<settings::SavedProcessingModel, String> {
    let mut settings = settings::get_settings(&app);
    let id = format!("{}:{}", provider_id, model_id);

    if settings.saved_processing_models.iter().any(|m| m.id == id) {
        return Err(format!("Model '{}' is already saved", label));
    }

    let model = settings::SavedProcessingModel {
        id,
        provider_id,
        model_id,
        label,
    };

    settings.saved_processing_models.push(model.clone());
    settings::write_settings(&app, settings);
    Ok(model)
}

#[tauri::command]
#[specta::specta]
pub fn delete_saved_processing_model(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let original_len = settings.saved_processing_models.len();
    settings.saved_processing_models.retain(|m| m.id != id);

    if settings.saved_processing_models.len() == original_len {
        return Err(format!("Saved model '{}' not found", id));
    }

    for action in &mut settings.post_process_actions {
        let matches = action.provider_id.as_deref() == Some(id.split(':').next().unwrap_or(""))
            && action.model.as_deref() == id.split(':').nth(1);
        if matches {
            action.model = None;
            action.provider_id = None;
        }
    }

    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_post_process_models(
    app: AppHandle,
    provider_id: String,
) -> Result<Vec<String>, String> {
    let settings = settings::get_settings(&app);

    let provider = settings
        .post_process_providers
        .iter()
        .find(|p| p.id == provider_id)
        .ok_or_else(|| format!("Provider '{}' not found", provider_id))?;

    if provider.id == APPLE_INTELLIGENCE_PROVIDER_ID {
        #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
        {
            return Ok(vec![APPLE_INTELLIGENCE_DEFAULT_MODEL_ID.to_string()]);
        }

        #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
        {
            return Err("Apple Intelligence is only available on Apple silicon Macs running macOS 15 or later.".to_string());
        }
    }

    let api_key = settings
        .post_process_api_keys
        .get(&provider_id)
        .cloned()
        .unwrap_or_default();

    if api_key.trim().is_empty() && provider.id != "custom" {
        return Err(format!(
            "API key is required for {}. Please add an API key to list available models.",
            provider.label
        ));
    }

    crate::llm_client::fetch_models(provider, api_key).await
}

#[tauri::command]
#[specta::specta]
pub fn set_post_process_selected_prompt(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);

    if !settings.post_process_prompts.iter().any(|p| p.id == id) {
        return Err(format!("Prompt with id '{}' not found", id));
    }

    settings.post_process_selected_prompt_id = Some(id);
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_mute_while_recording_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.mute_while_recording = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_append_trailing_space_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.append_trailing_space = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_high_visibility_setting(
    app: AppHandle,
    enabled: bool,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.overlay_high_visibility = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_app_language_setting(app: AppHandle, language: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.app_language = language.clone();
    settings::write_settings(&app, settings);

    tray::update_tray_menu(&app, Some(&language));

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_show_tray_icon_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.show_tray_icon = enabled;
    settings::write_settings(&app, settings);

    crate::TRAY_ICON_ENABLED.store(enabled, std::sync::atomic::Ordering::Relaxed);
    tray::set_tray_visibility(&app, enabled);

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_long_audio_model_setting(
    app: AppHandle,
    model_id: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.long_audio_model = model_id;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_long_audio_threshold_setting(app: AppHandle, threshold: f32) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.long_audio_threshold_seconds = threshold;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_border_color_setting(
    app: AppHandle,
    color: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.overlay_border_color = color;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_background_color_setting(
    app: AppHandle,
    color: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.overlay_background_color = color;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_border_width_setting(app: AppHandle, width: u8) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.overlay_border_width = width.min(10);
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_custom_width_setting(app: AppHandle, width: u16) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.overlay_custom_width = width.max(120).min(500);
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_custom_height_setting(app: AppHandle, height: u16) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.overlay_custom_height = height.max(30).min(80);
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn preview_overlay_settings(app: AppHandle) -> Result<(), String> {
    crate::overlay::preview_overlay(&app);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_theme_mode_setting(app: AppHandle, mode: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match mode.as_str() {
        "light" => settings::ThemeMode::Light,
        "dark" => settings::ThemeMode::Dark,
        "system" => settings::ThemeMode::System,
        _ => settings::ThemeMode::System,
    };
    settings.theme_mode = parsed;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_accent_color_setting(app: AppHandle, color: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let parsed = match color.as_str() {
        "blue" => settings::AccentColor::Blue,
        "green" => settings::AccentColor::Green,
        "red" => settings::AccentColor::Red,
        "purple" => settings::AccentColor::Purple,
        "orange" => settings::AccentColor::Orange,
        "pink" => settings::AccentColor::Pink,
        "teal" => settings::AccentColor::Teal,
        "yellow" => settings::AccentColor::Yellow,
        "system" => settings::AccentColor::System,
        _ => settings::AccentColor::System,
    };
    settings.accent_color = parsed;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_system_accent_color() -> Option<String> {
    get_os_accent_color()
}

#[cfg(target_os = "windows")]
fn get_os_accent_color() -> Option<String> {
    use std::process::Command;
    let output = Command::new("reg")
        .args([
            "query",
            "HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM",
            "/v",
            "AccentColor",
        ])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        if line.contains("AccentColor") {
            let hex = line.split_whitespace().last()?;
            let value = u32::from_str_radix(hex.trim_start_matches("0x"), 16).ok()?;
            let b = (value >> 16) & 0xFF;
            let g = (value >> 8) & 0xFF;
            let r = value & 0xFF;
            return Some(format!("#{:02x}{:02x}{:02x}", r, g, b));
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn get_os_accent_color() -> Option<String> {
    use std::process::Command;
    let output = Command::new("defaults")
        .args(["read", "-g", "AppleAccentColor"])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    match text.as_str() {
        "0" => Some("#ff3b30".into()),
        "1" => Some("#ff9500".into()),
        "2" => Some("#ffcc00".into()),
        "3" => Some("#28cd41".into()),
        "4" | "" => Some("#007aff".into()),
        "5" => Some("#af52de".into()),
        "6" => Some("#ff2d55".into()),
        "-1" => Some("#8e8e93".into()),
        _ => Some("#007aff".into()),
    }
}

#[cfg(target_os = "linux")]
fn get_os_accent_color() -> Option<String> {
    use std::process::Command;
    let output = Command::new("gsettings")
        .args(["get", "org.gnome.desktop.interface", "accent-color"])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let color = text.trim_matches('\'');
    match color {
        "blue" => Some("#3584e4".into()),
        "teal" => Some("#2190a4".into()),
        "green" => Some("#3a944a".into()),
        "yellow" => Some("#c88800".into()),
        "orange" => Some("#ed5317".into()),
        "red" => Some("#e62d42".into()),
        "pink" => Some("#d56199".into()),
        "purple" => Some("#9141ac".into()),
        "slate" => Some("#6f8396".into()),
        _ => None,
    }
}
