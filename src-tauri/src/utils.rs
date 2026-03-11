use crate::managers::audio::AudioRecordingManager;
use crate::managers::transcription::TranscriptionManager;
use crate::shortcut;
use crate::TranscriptionCoordinator;
use log::info;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager};

// Re-export all utility modules for easy access
// pub use crate::audio_feedback::*;
pub use crate::clipboard::*;
pub use crate::overlay::*;
pub use crate::tray::*;

/// Guard to prevent re-entrant cancel operations (e.g. user spamming Escape).
static CANCEL_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

/// Centralized cancellation function that can be called from anywhere in the app.
/// Handles cancelling both recording and transcription operations and updates UI state.
///
/// ALL work is dispatched to a background task so the shortcut handler callback
/// (which runs on the main/UI thread) returns immediately.  This prevents:
/// 1. Deadlocks where rec.stop() blocks waiting for the audio callback thread
///    which itself waits for the main thread to process emitted events.
/// 2. Re-entrant crashes from rapid Escape presses triggering overlapping cancels.
pub fn cancel_current_operation(app: &AppHandle) {
    // Prevent re-entrant calls — if a cancel is already in progress, ignore.
    if CANCEL_IN_PROGRESS.swap(true, Ordering::SeqCst) {
        return;
    }

    info!("Initiating operation cancellation...");

    // Reset cancel confirmation state (lightweight, safe on main thread)
    crate::shortcut::handler::reset_cancel_confirmation();

    // Capture everything we need, then dispatch ALL work to a background task.
    // This frees the main thread (and the shortcut handler callback) immediately.
    let audio_manager = Arc::clone(&app.state::<Arc<AudioRecordingManager>>());
    let recording_was_active = audio_manager.is_recording();
    let tm = Arc::clone(&app.state::<Arc<TranscriptionManager>>());
    let app_clone = app.clone();

    tauri::async_runtime::spawn(async move {
        // Unregister shortcuts (these internally spawn async tasks already,
        // but calling from async context avoids main-thread contention)
        shortcut::unregister_cancel_shortcut(&app_clone);
        shortcut::unregister_pause_shortcut(&app_clone);
        shortcut::unregister_action_shortcuts(&app_clone);

        // Update UI
        change_tray_icon(&app_clone, crate::tray::TrayIconState::Idle);
        hide_recording_overlay(&app_clone);

        // cancel_recording acquires mutexes and calls rec.stop() which can block
        let am = Arc::clone(&audio_manager);
        tokio::task::spawn_blocking(move || {
            am.cancel_recording();
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

        CANCEL_IN_PROGRESS.store(false, Ordering::SeqCst);
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
