pub mod audio;
pub mod gemini;
pub mod history;
pub mod models;
pub mod transcription;

use crate::settings::{get_settings, write_settings, AppSettings, LogLevel};
use crate::utils::cancel_current_operation;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
#[specta::specta]
pub fn cancel_operation(app: AppHandle) {
    cancel_current_operation(&app);
}

#[tauri::command]
#[specta::specta]
pub fn toggle_pause(app: AppHandle) -> bool {
    let audio_manager =
        app.state::<std::sync::Arc<crate::managers::audio::AudioRecordingManager>>();
    if !audio_manager.is_recording() {
        return false;
    }
    let paused = audio_manager.toggle_pause();
    crate::overlay::emit_recording_paused(&app, paused);
    paused
}

#[tauri::command]
#[specta::specta]
pub fn get_app_dir_path(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    Ok(get_settings(&app))
}

#[tauri::command]
#[specta::specta]
pub fn get_default_settings() -> Result<AppSettings, String> {
    Ok(crate::settings::get_default_settings())
}

#[tauri::command]
#[specta::specta]
pub fn get_log_dir_path(app: AppHandle) -> Result<String, String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    Ok(log_dir.to_string_lossy().to_string())
}

#[specta::specta]
#[tauri::command]
pub fn set_log_level(app: AppHandle, level: LogLevel) -> Result<(), String> {
    let tauri_log_level: tauri_plugin_log::LogLevel = level.into();
    let log_level: log::Level = tauri_log_level.into();
    // Update the file log level atomic so the filter picks up the new level
    crate::FILE_LOG_LEVEL.store(
        log_level.to_level_filter() as u8,
        std::sync::atomic::Ordering::Relaxed,
    );

    let mut settings = get_settings(&app);
    settings.log_level = level;
    write_settings(&app, settings);

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_recordings_folder(app: AppHandle) -> Result<(), String> {
    let history_manager =
        app.state::<std::sync::Arc<crate::managers::history::HistoryManager>>();
    let recordings_dir = history_manager.get_recordings_dir();

    let path = recordings_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open recordings folder: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn set_recordings_directory(app: AppHandle, path: String) -> Result<(), String> {
    // Validate the path exists and is a directory
    let dir_path = std::path::Path::new(&path);
    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }
    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Validate the directory is writable by attempting to create a temp file
    let test_file = dir_path.join(".phonara_write_test");
    match std::fs::write(&test_file, b"test") {
        Ok(_) => {
            let _ = std::fs::remove_file(&test_file);
        }
        Err(e) => {
            return Err(format!("Directory is not writable: {}", e));
        }
    }

    // Save to settings
    let mut settings = get_settings(&app);
    settings.custom_recordings_directory = Some(path.clone());
    write_settings(&app, settings);

    log::info!("Custom recordings directory set to: {}", path);

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn clear_recordings_directory(app: AppHandle) -> Result<(), String> {
    let mut settings = get_settings(&app);
    settings.custom_recordings_directory = None;
    write_settings(&app, settings);

    log::info!("Custom recordings directory cleared, using default");

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn get_recordings_directory(app: AppHandle) -> Result<String, String> {
    let history_manager =
        app.state::<std::sync::Arc<crate::managers::history::HistoryManager>>();
    let recordings_dir = history_manager.get_recordings_dir();
    Ok(recordings_dir.to_string_lossy().to_string())
}

#[specta::specta]
#[tauri::command]
pub fn open_log_dir(app: AppHandle) -> Result<(), String> {
    let log_dir = app
        .path()
        .app_log_dir()
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    let path = log_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open log directory: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_app_data_dir(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let path = app_data_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open app data directory: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn export_settings(app: AppHandle, path: String) -> Result<(), String> {
    let settings = get_settings(&app);
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, json)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    log::info!("Settings exported to {}", path);
    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn import_settings(app: AppHandle, path: String) -> Result<(), String> {
    let json = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    let settings: AppSettings = serde_json::from_str(&json)
        .map_err(|e| format!("Invalid settings file: {}", e))?;
    write_settings(&app, settings);
    log::info!("Settings imported from {}", path);
    Ok(())
}

/// Get the language code from the current OS keyboard input method.
/// Returns a language code (e.g., "en", "fr", "de") or None if detection fails.
#[specta::specta]
#[tauri::command]
pub fn get_language_from_os_input() -> Option<String> {
    get_os_input_language()
}

#[cfg(target_os = "windows")]
fn get_os_input_language() -> Option<String> {
    use windows::Win32::UI::Input::KeyboardAndMouse::GetKeyboardLayout;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        let thread_id = GetWindowThreadProcessId(hwnd, None);
        let layout = GetKeyboardLayout(thread_id);
        // The low word of the keyboard layout handle is the language identifier (LANGID)
        let lang_id = (layout.0 as u32) & 0xFFFF;
        // Primary language is the low 10 bits
        let primary_lang = lang_id & 0x3FF;
        keyboard_lang_id_to_code(primary_lang)
    }
}

#[cfg(target_os = "macos")]
fn get_os_input_language() -> Option<String> {
    use std::process::Command;
    // Use defaults to read the current input source
    let output = Command::new("defaults")
        .args(["read", "com.apple.HIToolbox", "AppleSelectedInputSources"])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    // Look for "KeyboardLayout Name" pattern - extract language from it
    // The input source ID typically contains the language code
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.contains("KeyboardLayout Name") {
            // Extract the value after "="
            if let Some(name) = trimmed.split('=').nth(1) {
                let name = name.trim().trim_matches('"').trim_matches(';').trim();
                return input_source_to_lang(name);
            }
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn get_os_input_language() -> Option<String> {
    use std::process::Command;
    // Try setxkbmap on X11
    if let Ok(output) = Command::new("setxkbmap").args(["-query"]).output() {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if line.starts_with("layout:") {
                let layout = line.trim_start_matches("layout:").trim();
                // Take first layout if multiple
                let primary = layout.split(',').next().unwrap_or(layout).trim();
                return xkb_layout_to_lang(primary);
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn keyboard_lang_id_to_code(primary_lang: u32) -> Option<String> {
    // Windows primary language IDs (SUBLANG-neutral)
    match primary_lang {
        0x09 => Some("en".into()),
        0x0C => Some("fr".into()),
        0x07 => Some("de".into()),
        0x0A => Some("es".into()),
        0x10 => Some("it".into()),
        0x16 => Some("pt".into()),
        0x13 => Some("nl".into()),
        0x19 => Some("ru".into()),
        0x11 => Some("ja".into()),
        0x04 => Some("zh".into()),
        0x12 => Some("ko".into()),
        0x1E => Some("th".into()),
        0x2A => Some("vi".into()),
        0x01 => Some("ar".into()),
        0x0D => Some("he".into()),
        0x39 => Some("hi".into()),
        0x15 => Some("pl".into()),
        0x05 => Some("cs".into()),
        0x1B => Some("sk".into()),
        0x0E => Some("hu".into()),
        0x18 => Some("ro".into()),
        0x02 => Some("bg".into()),
        0x1A => Some("hr".into()),
        0x24 => Some("sl".into()),
        0x27 => Some("lt".into()),
        0x26 => Some("lv".into()),
        0x25 => Some("et".into()),
        0x0B => Some("fi".into()),
        0x1D => Some("sv".into()),
        0x14 => Some("no".into()),
        0x06 => Some("da".into()),
        0x08 => Some("el".into()),
        0x1F => Some("tr".into()),
        0x21 => Some("id".into()),
        0x3E => Some("ms".into()),
        0x20 => Some("ur".into()),
        0x29 => Some("fa".into()),
        0x0F => Some("is".into()),
        0x03 => Some("ca".into()),
        0x36 => Some("af".into()),
        0x22 => Some("uk".into()),
        0x41 => Some("sw".into()),
        _ => None,
    }
}

#[cfg(target_os = "macos")]
fn input_source_to_lang(name: &str) -> Option<String> {
    let lower = name.to_lowercase();
    // Common macOS keyboard layout names
    if lower.contains("french") || lower == "azerty" {
        Some("fr".into())
    } else if lower.contains("german") || lower == "qwertz" {
        Some("de".into())
    } else if lower.contains("spanish") {
        Some("es".into())
    } else if lower.contains("italian") {
        Some("it".into())
    } else if lower.contains("portuguese") {
        Some("pt".into())
    } else if lower.contains("russian") {
        Some("ru".into())
    } else if lower.contains("japanese") || lower == "kana" || lower == "romaji" {
        Some("ja".into())
    } else if lower.contains("chinese") || lower.contains("pinyin") || lower.contains("zhuyin") {
        Some("zh".into())
    } else if lower.contains("korean") {
        Some("ko".into())
    } else if lower.contains("arabic") {
        Some("ar".into())
    } else if lower.contains("hebrew") {
        Some("he".into())
    } else if lower.contains("hindi") {
        Some("hi".into())
    } else if lower.contains("thai") {
        Some("th".into())
    } else if lower.contains("vietnamese") {
        Some("vi".into())
    } else if lower.contains("turkish") {
        Some("tr".into())
    } else if lower.contains("polish") {
        Some("pl".into())
    } else if lower.contains("dutch") {
        Some("nl".into())
    } else if lower.contains("us") || lower.contains("abc") || lower.contains("british") || lower.contains("australian") || lower.contains("canadian") {
        Some("en".into())
    } else {
        None
    }
}

#[cfg(target_os = "linux")]
fn xkb_layout_to_lang(layout: &str) -> Option<String> {
    match layout {
        "us" | "gb" => Some("en".into()),
        "fr" => Some("fr".into()),
        "de" => Some("de".into()),
        "es" => Some("es".into()),
        "it" => Some("it".into()),
        "pt" => Some("pt".into()),
        "ru" => Some("ru".into()),
        "jp" => Some("ja".into()),
        "cn" => Some("zh".into()),
        "kr" => Some("ko".into()),
        "nl" => Some("nl".into()),
        "pl" => Some("pl".into()),
        "tr" => Some("tr".into()),
        "ar" => Some("ar".into()),
        "il" => Some("he".into()),
        "th" => Some("th".into()),
        "vn" => Some("vi".into()),
        "in" => Some("hi".into()),
        "cz" => Some("cs".into()),
        "sk" => Some("sk".into()),
        "hu" => Some("hu".into()),
        "ro" => Some("ro".into()),
        "bg" => Some("bg".into()),
        "hr" => Some("hr".into()),
        "si" => Some("sl".into()),
        "lt" => Some("lt".into()),
        "lv" => Some("lv".into()),
        "ee" => Some("et".into()),
        "fi" => Some("fi".into()),
        "se" => Some("sv".into()),
        "no" => Some("no".into()),
        "dk" => Some("da".into()),
        "gr" => Some("el".into()),
        "id" => Some("id".into()),
        "my" => Some("ms".into()),
        "ua" => Some("uk".into()),
        "ir" => Some("fa".into()),
        "is" => Some("is".into()),
        "za" => Some("af".into()),
        _ => None,
    }
}

/// Check if Apple Intelligence is available on this device.
/// Called by the frontend when the user selects Apple Intelligence provider.
#[specta::specta]
#[tauri::command]
pub fn check_apple_intelligence_available() -> bool {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        crate::apple_intelligence::check_apple_intelligence_availability()
    }
    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    {
        false
    }
}

/// Try to initialize Enigo (keyboard/mouse simulation).
/// On macOS, this will return an error if accessibility permissions are not granted.
#[specta::specta]
#[tauri::command]
pub fn initialize_enigo(app: AppHandle) -> Result<(), String> {
    use crate::input::EnigoState;

    // Check if already initialized
    if app.try_state::<EnigoState>().is_some() {
        log::debug!("Enigo already initialized");
        return Ok(());
    }

    // Try to initialize
    match EnigoState::new() {
        Ok(enigo_state) => {
            app.manage(enigo_state);
            log::info!("Enigo initialized successfully after permission grant");
            Ok(())
        }
        Err(e) => {
            if cfg!(target_os = "macos") {
                log::warn!(
                    "Failed to initialize Enigo: {} (accessibility permissions may not be granted)",
                    e
                );
            } else {
                log::warn!("Failed to initialize Enigo: {}", e);
            }
            Err(format!("Failed to initialize input system: {}", e))
        }
    }
}

/// Marker state to track if shortcuts have been initialized.
pub struct ShortcutsInitialized;

/// Initialize keyboard shortcuts.
/// On macOS, this should be called after accessibility permissions are granted.
/// This is idempotent - calling it multiple times is safe.
#[specta::specta]
#[tauri::command]
pub fn initialize_shortcuts(app: AppHandle) -> Result<(), String> {
    // Check if already initialized
    if app.try_state::<ShortcutsInitialized>().is_some() {
        log::debug!("Shortcuts already initialized");
        return Ok(());
    }

    // Initialize shortcuts
    crate::shortcut::init_shortcuts(&app);

    // Mark as initialized
    app.manage(ShortcutsInitialized);

    log::info!("Shortcuts initialized successfully");
    Ok(())
}
