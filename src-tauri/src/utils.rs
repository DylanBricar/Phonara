use crate::managers::audio::AudioRecordingManager;
use crate::managers::transcription::TranscriptionManager;
use crate::shortcut;
use crate::TranscriptionCoordinator;
use log::info;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

// Re-export all utility modules for easy access
// pub use crate::audio_feedback::*;
pub use crate::clipboard::*;
pub use crate::overlay::*;
pub use crate::tray::*;

/// Centralized cancellation function that can be called from anywhere in the app.
/// Handles cancelling both recording and transcription operations and updates UI state.
///
/// The blocking work (stopping the audio recorder, unloading the model) is moved
/// to a background task so the main/UI thread is never blocked.  This prevents a
/// deadlock where the main thread waits for `rec.stop()` while the audio callback
/// thread waits for the main thread to process emitted events.
pub fn cancel_current_operation(app: &AppHandle) {
    info!("Initiating operation cancellation...");

    // Reset cancel confirmation state (lightweight, safe on main thread)
    crate::shortcut::handler::reset_cancel_confirmation();

    shortcut::unregister_cancel_shortcut(app);
    shortcut::unregister_pause_shortcut(app);
    shortcut::unregister_action_shortcuts(app);

    // Update UI immediately (non-blocking)
    change_tray_icon(app, crate::tray::TrayIconState::Idle);
    hide_recording_overlay(app);

    // Move the potentially-blocking operations to a background task so the
    // main thread stays responsive and the audio callback can still emit events.
    let audio_manager = app.state::<Arc<AudioRecordingManager>>();
    let recording_was_active = audio_manager.is_recording();
    let audio_manager = Arc::clone(&audio_manager);
    let tm = Arc::clone(&app.state::<Arc<TranscriptionManager>>());
    let app_clone = app.clone();

    tauri::async_runtime::spawn(async move {
        // cancel_recording acquires mutexes and calls rec.stop() which can block
        tokio::task::spawn_blocking({
            let audio_manager = Arc::clone(&audio_manager);
            move || {
                audio_manager.cancel_recording();
            }
        })
        .await
        .ok();

        // Unload model if immediate unload is enabled
        let tm_clone = Arc::clone(&tm);
        tokio::task::spawn_blocking(move || {
            tm_clone.maybe_unload_immediately("cancellation");
        })
        .await
        .ok();

        // Notify coordinator so it can keep lifecycle state coherent.
        if let Some(coordinator) = app_clone.try_state::<TranscriptionCoordinator>() {
            coordinator.notify_cancel(recording_was_active);
        }

        info!("Operation cancellation completed - returned to idle state");
    });
}

/// Check if using the Wayland display server protocol
#[cfg(target_os = "linux")]
pub fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
        || std::env::var("XDG_SESSION_TYPE")
            .map(|v| v.to_lowercase() == "wayland")
            .unwrap_or(false)
}

/// Check if running on KDE Plasma desktop environment
#[cfg(target_os = "linux")]
pub fn is_kde_plasma() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP")
        .map(|v| v.to_uppercase().contains("KDE"))
        .unwrap_or(false)
        || std::env::var("KDE_SESSION_VERSION").is_ok()
}

/// Check if running on KDE Plasma with Wayland
#[cfg(target_os = "linux")]
pub fn is_kde_wayland() -> bool {
    is_wayland() && is_kde_plasma()
}
