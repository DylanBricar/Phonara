use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};

use crate::actions::ACTION_MAP;
use crate::managers::audio::AudioRecordingManager;
use crate::settings::get_settings;
use crate::transcription_coordinator::{
    is_action_binding, is_transcribe_binding, parse_action_key,
};
use crate::TranscriptionCoordinator;

static CANCEL_SUPPRESSED: AtomicBool = AtomicBool::new(false);

pub fn reset_cancel_suppression() {
    CANCEL_SUPPRESSED.store(false, Ordering::SeqCst);
}

const CANCEL_CONFIRM_TIMEOUT_MS: u128 = 1500;
static CANCEL_PENDING: Mutex<Option<Instant>> = Mutex::new(None);

pub fn reset_cancel_confirmation() {
    if let Ok(mut pending) = CANCEL_PENDING.lock() {
        *pending = None;
    }
}

pub fn handle_shortcut_event(
    app: &AppHandle,
    binding_id: &str,
    hotkey_string: &str,
    is_pressed: bool,
) {
    let settings = get_settings(app);

    if is_transcribe_binding(binding_id) {
        if let Some(coordinator) = app.try_state::<TranscriptionCoordinator>() {
            coordinator.send_input(binding_id, hotkey_string, is_pressed, settings.push_to_talk);
        }
        return;
    }

    if is_action_binding(binding_id) {
        if is_pressed {
            if let Some(key) = parse_action_key(binding_id) {
                if let Some(coordinator) = app.try_state::<TranscriptionCoordinator>() {
                    coordinator.select_action(key);
                }
            }
        }
        return;
    }

    if binding_id == "pause" {
        if is_pressed {
            let audio_manager = app.state::<Arc<AudioRecordingManager>>();
            if audio_manager.is_recording() {
                let paused = audio_manager.toggle_pause();
                crate::overlay::emit_recording_paused(app, paused);
            }
        }
        return;
    }

    if binding_id == "show_history" {
        if is_pressed {
            crate::show_main_window(app);
            let _ = app.emit("navigate-to-section", "history");
        }
        return;
    }

    if binding_id == "copy_latest_history" {
        if is_pressed {
            crate::tray::copy_last_transcript(app);
        }
        return;
    }

    let Some(action) = ACTION_MAP.get(binding_id) else {
        return;
    };

    if binding_id == "cancel" {
        if CANCEL_SUPPRESSED.load(Ordering::SeqCst) {
            return;
        }
        let audio_manager = app.state::<Arc<AudioRecordingManager>>();
        if audio_manager.is_recording() && is_pressed {
            let should_cancel = {
                let mut pending = CANCEL_PENDING.lock().unwrap_or_else(|e| e.into_inner());
                if let Some(first_press) = *pending {
                    if first_press.elapsed().as_millis() < CANCEL_CONFIRM_TIMEOUT_MS {
                        *pending = None;
                        true
                    } else {
                        *pending = Some(Instant::now());
                        false
                    }
                } else {
                    *pending = Some(Instant::now());
                    false
                }
            };
            if should_cancel {
                CANCEL_SUPPRESSED.store(true, Ordering::SeqCst);
                action.start(app, binding_id, hotkey_string);
            } else {
                let _ = app.emit("cancel-pending", ());
            }
        }
        return;
    }

    if is_pressed {
        action.start(app, binding_id, hotkey_string);
    } else {
        action.stop(app, binding_id, hotkey_string);
    }
}
