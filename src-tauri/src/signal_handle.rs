use crate::TranscriptionCoordinator;

use tauri::{AppHandle, Manager};

#[cfg(unix)]
use signal_hook::consts::{SIGUSR1, SIGUSR2};
#[cfg(unix)]
use signal_hook::iterator::Signals;
#[cfg(unix)]
use std::thread;

pub fn send_transcription_input(app: &AppHandle, binding_id: &str, source: &str) {
    if let Some(c) = app.try_state::<TranscriptionCoordinator>() {
        c.send_input(binding_id, source, true, false);
    }
}

#[cfg(unix)]
pub fn setup_signal_handler(app_handle: AppHandle, mut signals: Signals) {
    thread::spawn(move || {
        for sig in signals.forever() {
            let (binding_id, signal_name) = match sig {
                SIGUSR1 => ("transcribe_with_post_process", "SIGUSR1"),
                SIGUSR2 => ("transcribe", "SIGUSR2"),
                _ => continue,
            };
            let app = app_handle.clone();
            let binding_id_copy = binding_id.to_string();
            let signal_name_copy = signal_name.to_string();
            let app_inner = app.clone();
            let _ = app.run_on_main_thread(move || {
                send_transcription_input(&app_inner, &binding_id_copy, &signal_name_copy);
            });
        }
    });
}
