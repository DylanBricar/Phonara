use crate::managers::audio::AudioRecordingManager;
use crate::managers::transcription::TranscriptionManager;
use crate::shortcut;
use crate::TranscriptionCoordinator;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager};

pub use crate::clipboard::*;
pub use crate::overlay::*;
pub use crate::tray::*;

static CANCEL_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

pub fn cancel_current_operation(app: &AppHandle) {
    if CANCEL_IN_PROGRESS.swap(true, Ordering::SeqCst) {
        return;
    }

    crate::shortcut::handler::reset_cancel_confirmation();

    shortcut::unregister_cancel_shortcut(app);
    shortcut::unregister_pause_shortcut(app);
    shortcut::unregister_action_shortcuts(app);

    let audio_manager = Arc::clone(&app.state::<Arc<AudioRecordingManager>>());
    let recording_was_active = audio_manager.is_recording();
    let tm = Arc::clone(&app.state::<Arc<TranscriptionManager>>());
    let app_clone = app.clone();

    tauri::async_runtime::spawn(async move {
        change_tray_icon(&app_clone, crate::tray::TrayIconState::Idle);
        hide_recording_overlay(&app_clone);

        let am = Arc::clone(&audio_manager);
        tokio::task::spawn_blocking(move || {
            am.cancel_recording();
        })
        .await
        .ok();

        let tm_clone = Arc::clone(&tm);
        tokio::task::spawn_blocking(move || {
            tm_clone.maybe_unload_immediately("cancellation");
        })
        .await
        .ok();

        if let Some(coordinator) = app_clone.try_state::<TranscriptionCoordinator>() {
            coordinator.notify_cancel(recording_was_active);
        }

        CANCEL_IN_PROGRESS.store(false, Ordering::SeqCst);
        crate::shortcut::handler::reset_cancel_suppression();
    });
}

#[cfg(target_os = "linux")]
pub fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
        || std::env::var("XDG_SESSION_TYPE")
            .map(|v| v.to_lowercase() == "wayland")
            .unwrap_or(false)
}

#[cfg(target_os = "linux")]
pub fn is_kde_plasma() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP")
        .map(|v| v.to_uppercase().contains("KDE"))
        .unwrap_or(false)
        || std::env::var("KDE_SESSION_VERSION").is_ok()
}

#[cfg(target_os = "linux")]
pub fn is_kde_wayland() -> bool {
    is_wayland() && is_kde_plasma()
}
