use log::error;
use std::collections::HashMap;
use std::sync::RwLock;
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

pub use crate::settings_defaults::*;
pub use crate::settings_types::*;

pub struct SettingsCache {
    inner: RwLock<AppSettings>,
}

impl SettingsCache {
    pub fn new(settings: AppSettings) -> Self {
        Self {
            inner: RwLock::new(settings),
        }
    }

    pub fn get(&self) -> AppSettings {
        self.inner
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    pub fn update(&self, settings: &AppSettings) {
        let mut guard = self.inner.write().unwrap_or_else(|e| e.into_inner());
        *guard = settings.clone();
    }
}

pub const SETTINGS_STORE_PATH: &str = "settings_store.json";

pub fn load_or_create_app_settings(app: &AppHandle) -> AppSettings {
    let store = app
        .store(SETTINGS_STORE_PATH)
        .expect("failed to initialize store");

    let mut settings = if let Some(settings_value) = store.get("settings") {
        match serde_json::from_value::<AppSettings>(settings_value) {
            Ok(mut settings) => {
                let default_settings = get_default_settings();
                let mut updated = false;

                for (key, value) in default_settings.bindings {
                    if !settings.bindings.contains_key(&key) {
                        settings.bindings.insert(key, value);
                        updated = true;
                    }
                }

                if updated {
                    store.set("settings", serde_json::to_value(&settings).unwrap());
                }

                settings
            }
            Err(_) => {
                let default_settings = get_default_settings();
                store.set("settings", serde_json::to_value(&default_settings).unwrap());
                default_settings
            }
        }
    } else {
        let default_settings = get_default_settings();
        store.set("settings", serde_json::to_value(&default_settings).unwrap());
        default_settings
    };

    if ensure_post_process_defaults(&mut settings) {
        store.set("settings", serde_json::to_value(&settings).unwrap());
    }

    settings
}

pub fn get_settings(app: &AppHandle) -> AppSettings {
    if let Some(cache) = app.try_state::<SettingsCache>() {
        return cache.get();
    }

    get_settings_from_store(app)
}

fn get_settings_from_store(app: &AppHandle) -> AppSettings {
    let store = app
        .store(SETTINGS_STORE_PATH)
        .expect("failed to initialize store");

    let mut settings = if let Some(settings_value) = store.get("settings") {
        serde_json::from_value::<AppSettings>(settings_value).unwrap_or_else(|_| {
            let default_settings = get_default_settings();
            store.set("settings", serde_json::to_value(&default_settings).unwrap());
            default_settings
        })
    } else {
        let default_settings = get_default_settings();
        store.set("settings", serde_json::to_value(&default_settings).unwrap());
        default_settings
    };

    if ensure_post_process_defaults(&mut settings) {
        store.set("settings", serde_json::to_value(&settings).unwrap());
    }

    settings
}

pub fn write_settings(app: &AppHandle, settings: AppSettings) {
    if let Some(cache) = app.try_state::<SettingsCache>() {
        cache.update(&settings);
    }

    let store = match app.store(SETTINGS_STORE_PATH) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to open settings store for writing: {}", e);
            return;
        }
    };

    match serde_json::to_value(&settings) {
        Ok(value) => store.set("settings", value),
        Err(e) => error!("Failed to serialize settings: {}", e),
    }
}

pub fn get_bindings(app: &AppHandle) -> HashMap<String, ShortcutBinding> {
    get_settings(app).bindings
}

pub fn get_stored_binding(app: &AppHandle, id: &str) -> ShortcutBinding {
    let bindings = get_bindings(app);

    bindings.get(id).cloned().unwrap_or_else(|| {
        get_default_settings()
            .bindings
            .get(id)
            .cloned()
            .expect("binding ID must exist in defaults")
    })
}

pub fn get_history_limit(app: &AppHandle) -> usize {
    get_settings(app).history_limit
}

pub fn get_recording_retention_period(app: &AppHandle) -> RecordingRetentionPeriod {
    get_settings(app).recording_retention_period
}

pub fn get_custom_recordings_directory(app: &AppHandle) -> Option<String> {
    get_settings(app).custom_recordings_directory
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_disable_auto_submit() {
        let settings = get_default_settings();
        assert!(!settings.auto_submit);
        assert_eq!(settings.auto_submit_key, AutoSubmitKey::Enter);
    }
}
