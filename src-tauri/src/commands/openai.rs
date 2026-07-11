use tauri::AppHandle;

#[tauri::command]
#[specta::specta]
pub fn change_openai_api_key_setting(app: AppHandle, api_key: String) -> Result<(), String> {
    crate::settings::update_settings(&app, |settings| {
        settings.openai_api_key = if api_key.is_empty() {
            None
        } else {
            Some(api_key)
        };
    });
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_openai_model_setting(app: AppHandle, model: String) -> Result<(), String> {
    crate::settings::update_settings(&app, |settings| {
        settings.openai_model = model;
    });
    Ok(())
}
