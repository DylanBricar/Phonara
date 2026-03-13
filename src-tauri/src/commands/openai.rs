use tauri::AppHandle;

#[tauri::command]
#[specta::specta]
pub fn change_openai_api_key_setting(app: AppHandle, api_key: String) -> Result<(), String> {
    let mut settings = crate::settings::get_settings(&app);
    settings.openai_api_key = if api_key.is_empty() {
        None
    } else {
        Some(api_key)
    };
    crate::settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn change_openai_model_setting(app: AppHandle, model: String) -> Result<(), String> {
    let mut settings = crate::settings::get_settings(&app);
    settings.openai_model = model;
    crate::settings::write_settings(&app, settings);
    Ok(())
}
