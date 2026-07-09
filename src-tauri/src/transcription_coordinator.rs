use crate::actions::{ActiveActionState, ACTION_MAP};
use crate::managers::audio::AudioRecordingManager;
use log::{debug, error, warn};
use std::sync::mpsc::{self, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

const DEBOUNCE: Duration = Duration::from_millis(30);
const RELEASE_GRACE: Duration = Duration::from_millis(50);
const MODIFIER_TAP_MAX_DURATION: Duration = Duration::from_millis(250);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PttAction {
    Passthrough,
    DeferRelease,
    CancelRelease,
}

struct PendingRelease {
    binding_id: String,
    hotkey_string: String,
    deadline: Instant,
}

/// Commands processed sequentially by the coordinator thread.
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

/// Pipeline lifecycle, owned exclusively by the coordinator thread.
enum Stage {
    Idle,
    Recording {
        binding_id: String,
        selected_action: Option<u8>,
    },
    Processing,
}

fn classify_ptt_event(
    pending_release_binding: Option<&str>,
    is_pressed: bool,
    push_to_talk: bool,
    binding_id: &str,
    recording_binding: Option<&str>,
) -> PttAction {
    if !push_to_talk {
        return PttAction::Passthrough;
    }

    if is_pressed {
        if pending_release_binding == Some(binding_id) {
            PttAction::CancelRelease
        } else {
            PttAction::Passthrough
        }
    } else if recording_binding == Some(binding_id) && pending_release_binding.is_none() {
        PttAction::DeferRelease
    } else {
        PttAction::Passthrough
    }
}

/// Serialises all transcription lifecycle events through a single thread
/// to eliminate race conditions between keyboard shortcuts, signals, and
/// the async transcribe-paste pipeline.
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
                let mut pending_release: Option<PendingRelease> = None;
                let mut modifier_only_press: Option<(String, Instant)> = None;

                loop {
                    let cmd = if let Some(pending) = &pending_release {
                        match rx.recv_timeout(
                            pending.deadline.saturating_duration_since(Instant::now()),
                        ) {
                            Ok(cmd) => cmd,
                            Err(mpsc::RecvTimeoutError::Timeout) => {
                                if let Some(pending) = pending_release.take() {
                                    if matches!(
                                        &stage,
                                        Stage::Recording { binding_id, .. }
                                            if binding_id == &pending.binding_id
                                    ) {
                                        stop(
                                            &app,
                                            &mut stage,
                                            &pending.binding_id,
                                            &pending.hotkey_string,
                                        );
                                    }
                                }
                                continue;
                            }
                            Err(mpsc::RecvTimeoutError::Disconnected) => break,
                        }
                    } else {
                        match rx.recv() {
                            Ok(cmd) => cmd,
                            Err(_) => break,
                        }
                    };

                    match cmd {
                        Command::Input {
                            binding_id,
                            hotkey_string,
                            is_pressed,
                            push_to_talk,
                        } => {
                            let pending_release_binding = pending_release
                                .as_ref()
                                .map(|pending| pending.binding_id.as_str());
                            let recording_binding = match &stage {
                                Stage::Recording { binding_id, .. } => Some(binding_id.as_str()),
                                _ => None,
                            };

                            match classify_ptt_event(
                                pending_release_binding,
                                is_pressed,
                                push_to_talk,
                                &binding_id,
                                recording_binding,
                            ) {
                                PttAction::CancelRelease => {
                                    pending_release = None;
                                    continue;
                                }
                                PttAction::DeferRelease => {
                                    pending_release = Some(PendingRelease {
                                        binding_id,
                                        hotkey_string,
                                        deadline: Instant::now() + RELEASE_GRACE,
                                    });
                                    continue;
                                }
                                PttAction::Passthrough => {}
                            }

                            // Debounce rapid-fire press events (key repeat / double-tap).
                            // Push-to-talk releases may be deferred above to absorb X11 auto-repeat.
                            if is_pressed {
                                let now = Instant::now();
                                if last_press.is_some_and(|t| now.duration_since(t) < DEBOUNCE) {
                                    debug!("Debounced press for '{binding_id}'");
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
                            } else if is_modifier_only_hotkey(&hotkey_string) {
                                if is_pressed {
                                    modifier_only_press =
                                        Some((binding_id.clone(), Instant::now()));
                                    continue;
                                }

                                let Some((pressed_binding_id, pressed_at)) =
                                    modifier_only_press.as_ref()
                                else {
                                    continue;
                                };

                                if pressed_binding_id != &binding_id {
                                    debug!(
                                        "Ignoring release for '{binding_id}' because the active modifier tap belongs to '{pressed_binding_id}'"
                                    );
                                    continue;
                                }

                                let pressed_at = *pressed_at;
                                modifier_only_press = None;

                                let now = Instant::now();
                                if !is_quick_modifier_tap(pressed_at, now) {
                                    debug!(
                                        "Ignoring modifier-only shortcut hold for '{binding_id}' after {:?}",
                                        now.duration_since(pressed_at)
                                    );
                                    continue;
                                }

                                toggle(&app, &mut stage, &binding_id, &hotkey_string);
                            } else if is_pressed {
                                toggle(&app, &mut stage, &binding_id, &hotkey_string);
                            }
                        }
                        Command::Cancel {
                            recording_was_active,
                        } => {
                            pending_release = None;
                            modifier_only_press = None;
                            // Don't reset during processing - wait for the pipeline to finish.
                            if !matches!(stage, Stage::Processing)
                                && (recording_was_active
                                    || matches!(stage, Stage::Recording { .. }))
                            {
                                stage = Stage::Idle;
                            }
                        }
                        Command::ProcessingFinished => {
                            modifier_only_press = None;
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
                                    debug!("Action {} deselected during recording", key);
                                } else {
                                    *selected_action = Some(key);
                                    debug!("Action {} selected during recording", key);
                                }
                            } else {
                                debug!("Action selection ignored: not in recording state");
                            }
                        }
                    }
                }
                debug!("Transcription coordinator exited");
            }));
            if let Err(e) = result {
                error!("Transcription coordinator panicked: {e:?}");
            }
        });

        Self { tx }
    }

    /// Send a keyboard/signal input event for a transcribe binding.
    /// For signal-based toggles, use `is_pressed: true` and `push_to_talk: false`.
    pub fn send_input(
        &self,
        binding_id: &str,
        hotkey_string: &str,
        is_pressed: bool,
        push_to_talk: bool,
    ) {
        if self
            .tx
            .send(Command::Input {
                binding_id: binding_id.to_string(),
                hotkey_string: hotkey_string.to_string(),
                is_pressed,
                push_to_talk,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_cancel(&self, recording_was_active: bool) {
        if self
            .tx
            .send(Command::Cancel {
                recording_was_active,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_processing_finished(&self) {
        if self.tx.send(Command::ProcessingFinished).is_err() {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn select_action(&self, key: u8) {
        if self.tx.send(Command::SelectAction { key }).is_err() {
            warn!("Transcription coordinator channel closed");
        }
    }
}

fn toggle(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    match &stage {
        Stage::Idle => {
            start(app, stage, binding_id, hotkey_string);
        }
        Stage::Recording {
            binding_id: ref bid,
            ..
        } if bid == binding_id => {
            stop(app, stage, binding_id, hotkey_string);
        }
        _ => debug!("Ignoring press for '{binding_id}': pipeline busy"),
    }
}

fn is_modifier_only_hotkey(hotkey_string: &str) -> bool {
    hotkey_string
        .parse::<handy_keys::Hotkey>()
        .map(|hotkey| hotkey.key.is_none())
        .unwrap_or(false)
}

fn is_quick_modifier_tap(pressed_at: Instant, released_at: Instant) -> bool {
    released_at.duration_since(pressed_at) <= MODIFIER_TAP_MAX_DURATION
}

fn start(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    action.start(app, binding_id, hotkey_string);
    if app
        .try_state::<Arc<AudioRecordingManager>>()
        .is_some_and(|a| a.is_recording())
    {
        *stage = Stage::Recording {
            binding_id: binding_id.to_string(),
            selected_action: None,
        };
    } else {
        debug!("Start for '{binding_id}' did not begin recording; staying idle");
    }
}

fn stop(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    // Store selected action in managed state before calling stop
    if let Stage::Recording {
        selected_action, ..
    } = &stage
    {
        if let Some(state) = app.try_state::<ActiveActionState>() {
            *state.0.lock().unwrap() = *selected_action;
        }
    }

    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    action.stop(app, binding_id, hotkey_string);
    *stage = Stage::Processing;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn push_to_talk_release_while_recording_defers_release() {
        assert_eq!(
            classify_ptt_event(None, false, true, "transcribe", Some("transcribe")),
            PttAction::DeferRelease
        );
    }

    #[test]
    fn push_to_talk_press_matching_pending_release_cancels_release() {
        assert_eq!(
            classify_ptt_event(
                Some("transcribe"),
                true,
                true,
                "transcribe",
                Some("transcribe")
            ),
            PttAction::CancelRelease
        );
    }

    #[test]
    fn toggle_mode_events_pass_through_ptt_classifier() {
        assert_eq!(
            classify_ptt_event(
                Some("transcribe"),
                true,
                false,
                "transcribe",
                Some("transcribe")
            ),
            PttAction::Passthrough
        );
        assert_eq!(
            classify_ptt_event(None, false, false, "transcribe", Some("transcribe")),
            PttAction::Passthrough
        );
    }

    #[test]
    fn modifier_tap_duration_accepts_quick_taps_only() {
        let pressed_at = Instant::now();
        assert!(is_quick_modifier_tap(
            pressed_at,
            pressed_at + MODIFIER_TAP_MAX_DURATION
        ));
        assert!(!is_quick_modifier_tap(
            pressed_at,
            pressed_at + MODIFIER_TAP_MAX_DURATION + Duration::from_millis(1)
        ));
    }
}
