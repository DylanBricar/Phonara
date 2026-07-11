use tauri::AppHandle;

use crate::settings;

#[tauri::command]
#[specta::specta]
pub fn update_text_replacements(
    app: AppHandle,
    replacements: Vec<settings::TextReplacement>,
) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.text_replacements = replacements;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_whisper_initial_prompt_setting(
    app: AppHandle,
    prompt: Option<String>,
) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.whisper_initial_prompt = prompt;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_whisper_use_gpu_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let accelerator = if enabled {
        settings::TranscribeAcceleratorSetting::Gpu
    } else {
        settings::TranscribeAcceleratorSetting::Cpu
    };
    super::update_accelerator_and_reload_next_use(&app, |current| {
        super::apply_transcribe_acceleration_settings(
            current,
            accelerator,
            if enabled { 0 } else { -1 },
        )
    })
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
    if !(1..=9).contains(&key) {
        return Err("Action key must be between 1 and 9".to_string());
    }

    settings::try_update_settings(&app, |settings| {
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
        Ok(action)
    })
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
    settings::try_update_settings(&app, |settings| {
        if let Some(action) = settings
            .post_process_actions
            .iter_mut()
            .find(|a| a.key == key)
        {
            action.name = name;
            action.prompt = prompt;
            action.model = model.filter(|m| !m.trim().is_empty());
            action.provider_id = provider_id.filter(|p| !p.trim().is_empty());
            Ok(())
        } else {
            Err(format!("Action with key {} not found", key))
        }
    })
}

#[tauri::command]
#[specta::specta]
pub fn delete_post_process_action(app: AppHandle, key: u8) -> Result<(), String> {
    settings::try_update_settings(&app, |settings| {
        let original_len = settings.post_process_actions.len();
        settings.post_process_actions.retain(|a| a.key != key);

        if settings.post_process_actions.len() == original_len {
            return Err(format!("Action with key {} not found", key));
        }

        Ok(())
    })
}

#[tauri::command]
#[specta::specta]
pub fn add_saved_processing_model(
    app: AppHandle,
    provider_id: String,
    model_id: String,
    label: String,
) -> Result<settings::SavedProcessingModel, String> {
    settings::try_update_settings(&app, |settings| {
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
        Ok(model)
    })
}

#[tauri::command]
#[specta::specta]
pub fn delete_saved_processing_model(app: AppHandle, id: String) -> Result<(), String> {
    settings::try_update_settings(&app, |settings| {
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

        Ok(())
    })
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_high_visibility_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.overlay_high_visibility = enabled;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_long_audio_model_setting(
    app: AppHandle,
    model_id: Option<String>,
) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.long_audio_model = model_id;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_long_audio_threshold_setting(app: AppHandle, threshold: f32) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.long_audio_threshold_seconds = threshold;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_border_color_setting(
    app: AppHandle,
    color: Option<String>,
) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.overlay_border_color = color;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_background_color_setting(
    app: AppHandle,
    color: Option<String>,
) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.overlay_background_color = color;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_border_width_setting(app: AppHandle, width: u8) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.overlay_border_width = width.min(10);
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_custom_width_setting(app: AppHandle, width: u16) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.overlay_custom_width = width.clamp(120, 500);
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_overlay_custom_height_setting(app: AppHandle, height: u16) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.overlay_custom_height = height.clamp(30, 80);
    });
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
    settings::update_settings(&app, |settings| {
        let parsed = match mode.as_str() {
            "light" => settings::ThemeMode::Light,
            "dark" => settings::ThemeMode::Dark,
            "system" => settings::ThemeMode::System,
            _ => settings::ThemeMode::System,
        };
        settings.theme_mode = parsed;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_accent_color_setting(app: AppHandle, color: String) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
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
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn get_recordings_directory(app: AppHandle) -> Result<Option<String>, String> {
    let settings = settings::get_settings(&app);
    Ok(settings.custom_recordings_directory)
}

#[tauri::command]
#[specta::specta]
pub fn set_recordings_directory(app: AppHandle, path: String) -> Result<(), String> {
    let dir = std::path::Path::new(&path);
    if !dir.is_dir() {
        return Err(format!("Directory does not exist: {}", path));
    }
    settings::update_settings(&app, |settings| {
        settings.custom_recordings_directory = Some(path);
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn clear_recordings_directory(app: AppHandle) -> Result<(), String> {
    settings::update_settings(&app, |settings| {
        settings.custom_recordings_directory = None;
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_custom_sound_path(
    app: AppHandle,
    sound_type: String,
    path: String,
) -> Result<(), String> {
    let file = std::path::Path::new(&path);
    if !file.is_file() {
        return Err(format!("File does not exist: {}", path));
    }
    settings::try_update_settings(&app, |settings| {
        match sound_type.as_str() {
            "start" => settings.custom_start_sound = Some(path),
            "stop" => settings.custom_stop_sound = Some(path),
            _ => return Err(format!("Invalid sound type: {}", sound_type)),
        }
        Ok(())
    })
}

#[tauri::command]
#[specta::specta]
pub fn clear_custom_sound_path(app: AppHandle, sound_type: String) -> Result<(), String> {
    settings::try_update_settings(&app, |settings| {
        match sound_type.as_str() {
            "start" => settings.custom_start_sound = None,
            "stop" => settings.custom_stop_sound = None,
            _ => return Err(format!("Invalid sound type: {}", sound_type)),
        }
        Ok(())
    })
}
