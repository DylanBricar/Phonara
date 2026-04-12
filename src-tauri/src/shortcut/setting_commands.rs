use tauri::AppHandle;

use crate::settings;

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
    crate::overlay::show_recording_overlay(&app);
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
