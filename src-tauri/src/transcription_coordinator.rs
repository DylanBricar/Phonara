use crate::actions::{ActiveActionState, ACTION_MAP};
use crate::managers::audio::AudioRecordingManager;
use crate::overlay::{emit_action_deselected, emit_action_selected};
use crate::settings::get_settings;
use log::error;
use std::sync::mpsc::{self, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const DEBOUNCE: Duration = Duration::from_millis(30);

enum Command {
    Input {
        binding_id: String,
        hotkey_string: String,
        is_pressed: bool,
        push_to_talk: bool,
    },
    Cancel {
        recording_was_active: bool,
    },
    ProcessingFinished,
    SelectAction {
        key: u8,
    },
}

enum Stage {
    Idle,
    Recording {
        binding_id: String,
        selected_action: Option<u8>,
    },
    Processing,
}

pub struct TranscriptionCoordinator {
    tx: Sender<Command>,
}

pub fn is_transcribe_binding(id: &str) -> bool {
    id == "transcribe" || id == "transcribe_with_post_process"
}

pub fn is_action_binding(id: &str) -> bool {
    id.starts_with("action_")
}

pub fn parse_action_key(id: &str) -> Option<u8> {
    id.strip_prefix("action_").and_then(|k| k.parse().ok())
}

impl TranscriptionCoordinator {
    pub fn new(app: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel();

        thread::spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let mut stage = Stage::Idle;
                let mut last_press: Option<Instant> = None;

                while let Ok(cmd) = rx.recv() {
                    match cmd {
                        Command::Input {
                            binding_id,
                            hotkey_string,
                            is_pressed,
                            push_to_talk,
                        } => {
                            if is_pressed {
                                let now = Instant::now();
                                if last_press.map_or(false, |t| now.duration_since(t) < DEBOUNCE) {
                                    continue;
                                }
                                last_press = Some(now);
                            }

                            if push_to_talk {
                                if is_pressed && matches!(stage, Stage::Idle) {
                                    start(&app, &mut stage, &binding_id, &hotkey_string);
                                } else if !is_pressed {
                                    if let Stage::Recording {
                                        binding_id: ref bid,
                                        ..
                                    } = stage
                                    {
                                        if bid == &binding_id {
                                            stop(&app, &mut stage, &binding_id, &hotkey_string);
                                        }
                                    }
                                }
                            } else if is_pressed {
                                match &stage {
                                    Stage::Idle => {
                                        start(&app, &mut stage, &binding_id, &hotkey_string);
                                    }
                                    Stage::Recording {
                                        binding_id: ref bid,
                                        ..
                                    } if bid == &binding_id => {
                                        stop(&app, &mut stage, &binding_id, &hotkey_string);
                                    }
                                    _ => {}
                                }
                            }
                        }
                        Command::Cancel {
                            recording_was_active,
                        } => {
                            if !matches!(stage, Stage::Processing)
                                && (recording_was_active
                                    || matches!(stage, Stage::Recording { .. }))
                            {
                                stage = Stage::Idle;
                            }
                        }
                        Command::ProcessingFinished => {
                            stage = Stage::Idle;
                        }
                        Command::SelectAction { key } => {
                            if let Stage::Recording {
                                ref mut selected_action,
                                ..
                            } = stage
                            {
                                if *selected_action == Some(key) {
                                    *selected_action = None;
                                    emit_action_deselected(&app);
                                } else {
                                    *selected_action = Some(key);
                                    let settings = get_settings(&app);
                                    if let Some(action) =
                                        settings.post_process_actions.iter().find(|a| a.key == key)
                                    {
                                        emit_action_selected(&app, key, &action.name);
                                    }
                                }
                            }
                        }
                    }
                }
            }));
            if let Err(e) = result {
                error!("Transcription coordinator panicked: {e:?}");
                let _ = app.emit("transcription-coordinator-crashed", "The transcription system crashed. Please restart the app.");
            }
        });

        Self { tx }
    }

    pub fn send_input(
        &self,
        binding_id: &str,
        hotkey_string: &str,
        is_pressed: bool,
        push_to_talk: bool,
    ) {
        let _ = self.tx.send(Command::Input {
            binding_id: binding_id.to_string(),
            hotkey_string: hotkey_string.to_string(),
            is_pressed,
            push_to_talk,
        });
    }

    pub fn notify_cancel(&self, recording_was_active: bool) {
        let _ = self.tx.send(Command::Cancel {
            recording_was_active,
        });
    }

    pub fn notify_processing_finished(&self) {
        let _ = self.tx.send(Command::ProcessingFinished);
    }

    pub fn select_action(&self, key: u8) {
        let _ = self.tx.send(Command::SelectAction { key });
    }
}

fn start(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        return;
    };
    action.start(app, binding_id, hotkey_string);
    if app
        .try_state::<Arc<AudioRecordingManager>>()
        .map_or(false, |a| a.is_recording())
    {
        *stage = Stage::Recording {
            binding_id: binding_id.to_string(),
            selected_action: None,
        };
    }
}

fn stop(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    if let Stage::Recording {
        selected_action, ..
    } = &stage
    {
        if let Some(state) = app.try_state::<ActiveActionState>() {
            *state.0.lock().unwrap() = *selected_action;
        }
    }

    let Some(action) = ACTION_MAP.get(binding_id) else {
        return;
    };
    action.stop(app, binding_id, hotkey_string);
    *stage = Stage::Processing;
}
