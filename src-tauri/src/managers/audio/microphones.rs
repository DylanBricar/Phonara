use super::{AudioRecordingManager, MicrophoneMode, MicrophoneStatus, RecordingState};
use crate::audio_toolkit::audio::{input_state::input_states, list_raw_input_device_identities};
use crate::audio_toolkit::CpalInputDevice;
use crate::helpers::clamshell;
use crate::microphone::{
    bind_legacy_preferences, first_usable, ordered_candidates, should_reconcile_stream,
    usable_microphones, MicrophoneDevice, MicrophonePreference, MicrophoneUnavailableReason,
    UnavailableMicrophone,
};
use crate::settings::{get_settings, update_settings};
use crate::transcription_coordinator::TranscriptionCoordinator;
use std::collections::HashSet;
use std::sync::{atomic::Ordering, Arc, MutexGuard};
use std::time::Duration;
use tauri::{Emitter, Manager};

#[derive(PartialEq, Eq)]
struct MicrophoneFingerprint {
    devices: Vec<MicrophoneDevice>,
    preferences: Vec<MicrophonePreference>,
    clamshell_name: Option<String>,
    unavailable: Vec<UnavailableMicrophone>,
}

#[derive(Default)]
pub(super) struct MicrophoneTracking {
    status: MicrophoneStatus,
    /// Failed opens are retried on a new dictation or an inventory/preference
    /// change, avoiding repeated teardown of a working fallback every poll.
    failed_ids: HashSet<String>,
    fingerprint: Option<MicrophoneFingerprint>,
    open_error: Option<String>,
}

impl AudioRecordingManager {
    /// A cached snapshot: never enumerates devices or waits on the capture lock.
    pub fn microphone_status(&self) -> MicrophoneStatus {
        self.microphones
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .status
            .clone()
    }

    fn update_microphone_status(&self, update: impl FnOnce(&mut MicrophoneTracking)) {
        let changed = {
            let mut tracking = self.microphones.lock().unwrap_or_else(|e| e.into_inner());
            let previous = tracking.status.clone();
            update(&mut tracking);
            if previous == tracking.status {
                None
            } else {
                tracking.status.revision = previous.revision.saturating_add(1);
                Some(tracking.status.clone())
            }
        };
        if let Some(status) = changed {
            let _ = self.app_handle.emit("microphone-status-changed", status);
        }
    }

    pub(super) fn publish_recording_status(&self, is_recording: bool) {
        self.update_microphone_status(|tracking| tracking.status.is_recording = is_recording);
    }

    pub(super) fn publish_closed_microphone(&self) {
        self.update_microphone_status(|tracking| tracking.status.active = None);
    }

    pub(super) fn publish_microphone_error(&self, error: String) {
        self.update_microphone_status(|tracking| tracking.status.error = Some(error));
    }

    /// Caller holds `state`; enumeration errors preserve the last inventory.
    fn scan_microphone_candidates(
        &self,
        retry_failed: bool,
    ) -> Result<(Vec<CpalInputDevice>, Vec<MicrophoneDevice>), String> {
        let devices = list_raw_input_device_identities().map_err(|error| {
            let message = format!("Failed to list microphones: {error}");
            self.publish_microphone_error(message.clone());
            message
        })?;
        let mut available: Vec<_> = devices
            .iter()
            .map(|device| MicrophoneDevice {
                id: device.id.clone(),
                name: device.name.clone(),
                is_default: device.is_default,
            })
            .collect();
        available.sort_by(|left, right| left.id.cmp(&right.id));
        let radio_unavailable = crate::audio_toolkit::audio::wireless::unavailable_endpoints();
        let controls = input_states();
        let unavailable: Vec<_> = available
            .iter()
            .filter_map(|device| {
                let reason = if controls.get(&device.id).is_some_and(|state| state.muted) {
                    MicrophoneUnavailableReason::Muted
                } else if radio_unavailable.contains(&device.id) {
                    MicrophoneUnavailableReason::WirelessUnreachable
                } else {
                    return None;
                };
                Some(UnavailableMicrophone {
                    id: device.id.clone(),
                    reason,
                })
            })
            .collect();
        let usable = usable_microphones(&available, &unavailable);
        let mut settings = get_settings(&self.app_handle);
        let original_preferences = settings.microphone_priority.clone();
        if bind_legacy_preferences(&mut settings.microphone_priority, &available) {
            let bound = settings.microphone_priority.clone();
            let persisted = update_settings(&self.app_handle, |current| {
                if current.microphone_priority != original_preferences {
                    return false;
                }
                current.microphone_priority = bound.clone();
                true
            });
            if persisted {
                let _ = self.app_handle.emit(
                    "settings-changed",
                    serde_json::json!({
                        "setting": "microphone_priority", "value": bound
                    }),
                );
            } else {
                settings = get_settings(&self.app_handle);
            }
        }
        let clamshell_name = settings
            .clamshell_microphone
            .as_ref()
            .filter(|_| clamshell::is_clamshell().unwrap_or(false))
            .cloned();
        let mut candidates = ordered_candidates(
            &settings.microphone_priority,
            &usable,
            clamshell_name.as_deref(),
        );
        let fingerprint = MicrophoneFingerprint {
            devices: available.clone(),
            preferences: settings.microphone_priority,
            clamshell_name,
            unavailable: unavailable.clone(),
        };
        self.update_microphone_status(|tracking| {
            if retry_failed || tracking.fingerprint.as_ref() != Some(&fingerprint) {
                tracking.failed_ids.clear();
                tracking.open_error = None;
            }
            tracking.fingerprint = Some(fingerprint);
            candidates.retain(|device| !tracking.failed_ids.contains(&device.id));
            tracking.status.devices = available;
            tracking.status.unavailable = unavailable;
            tracking.status.next = candidates.first().cloned();
            tracking.status.error = tracking.open_error.clone();
            if let Some(active) = &mut tracking.status.active {
                if let Some(updated) = tracking
                    .status
                    .devices
                    .iter()
                    .find(|device| device.id == active.id)
                {
                    *active = updated.clone();
                }
            }
        });
        Ok((devices, candidates))
    }

    /// A fresh scan on every start also handles missed monitor ticks and defaults.
    pub fn start_microphone_stream(&self) -> Result<(), anyhow::Error> {
        let state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        self.start_microphone_stream_while_idle_under_state(&state)
    }

    pub(super) fn start_microphone_stream_while_idle_under_state(
        &self,
        state: &MutexGuard<'_, RecordingState>,
    ) -> Result<(), anyhow::Error> {
        if !matches!(**state, RecordingState::Idle) {
            return Err(anyhow::anyhow!(
                "Cannot reopen the microphone while recording or stopping"
            ));
        }
        let (devices, candidates) = self
            .scan_microphone_candidates(true)
            .map_err(anyhow::Error::msg)?;
        self.open_microphone_candidates(state, &devices, &candidates)
    }

    fn stream_has_failed(&self) -> bool {
        self.recorder
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .as_ref()
            .is_some_and(|recorder| recorder.needs_reopen())
    }

    fn open_microphone_candidates(
        &self,
        state: &MutexGuard<'_, RecordingState>,
        devices: &[CpalInputDevice],
        candidates: &[MicrophoneDevice],
    ) -> Result<(), anyhow::Error> {
        let status = self.microphone_status();
        let is_open = *self.is_open.lock().unwrap_or_else(|e| e.into_inner());
        if is_open
            && !self.stream_has_failed()
            && status.active.as_ref().map(|device| &device.id)
                == candidates.first().map(|device| &device.id)
        {
            return Ok(());
        }
        if is_open {
            self.stop_microphone_stream();
        }
        if candidates.is_empty() {
            let message = "No input device found".to_string();
            self.update_microphone_status(|tracking| {
                tracking.status.error = Some(message.clone());
                tracking.open_error = Some(message.clone());
            });
            return Err(anyhow::Error::msg(message));
        }
        self.preload_vad_while_idle_under_state(state)
            .inspect_err(|error| self.publish_microphone_error(error.to_string()))?;
        let mut recorder_guard = self.recorder.lock().unwrap_or_else(|e| e.into_inner());
        let recorder = recorder_guard
            .as_mut()
            .ok_or_else(|| anyhow::anyhow!("Recorder not available"))?;
        let mut failures = Vec::new();
        let result = first_usable(candidates, |candidate| {
            let device = devices
                .iter()
                .find(|device| device.id == candidate.id)
                .ok_or_else(|| "Microphone is no longer available".to_string())?;
            match recorder.open(Some(device.device.clone())) {
                Ok(()) => Ok(()),
                Err(error) => {
                    let message = error.to_string();
                    log::warn!("Cannot open microphone {}: {message}", candidate.name);
                    let _ = recorder.close();
                    failures.push((
                        candidate.id.clone(),
                        format!("{}: {message}", candidate.name),
                    ));
                    Err(message)
                }
            }
        });
        drop(recorder_guard);
        *self.is_open.lock().unwrap_or_else(|e| e.into_inner()) = result.is_ok();
        self.update_microphone_status(|tracking| {
            for (id, _) in &failures {
                tracking.failed_ids.insert(id.clone());
            }
            tracking.open_error = if failures.is_empty() {
                None
            } else {
                Some(
                    failures
                        .iter()
                        .map(|(_, error)| error.as_str())
                        .collect::<Vec<_>>()
                        .join("; "),
                )
            };
            match &result {
                Ok((device, ())) => {
                    tracking.status.active = Some(device.clone());
                    tracking.status.next = Some(device.clone());
                    tracking.status.error = tracking.open_error.clone();
                }
                Err(error) => {
                    tracking.status.active = None;
                    tracking.status.next = None;
                    tracking.status.error = Some(error.clone());
                    tracking.open_error = Some(error.clone());
                }
            }
        });
        result.map(|_| ()).map_err(anyhow::Error::msg)
    }

    pub fn refresh_microphone_devices(&self) -> Result<MicrophoneStatus, String> {
        // USB status queries may wait on a driver. Never run them while holding
        // capture state, recorder, or microphone snapshot locks.
        crate::audio_toolkit::audio::wireless::refresh();
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        let scan = self.scan_microphone_candidates(false);
        // A stream error remains authoritative even if enumeration itself failed.
        let stream_failed = self.stream_has_failed();
        let snapshot = self.microphone_status();
        let missing_active = scan.is_ok()
            && snapshot.active.as_ref().is_some_and(|active| {
                !snapshot.devices.iter().any(|device| device.id == active.id)
                    || snapshot
                        .unavailable
                        .iter()
                        .any(|device| device.id == active.id)
            });
        let interrupted = match &*state {
            RecordingState::Recording {
                binding_id,
                generation,
            } if (stream_failed || missing_active)
                && self.is_recording_readiness_current(*generation) =>
            {
                self.publish_microphone_error(
                    "The active microphone disconnected; the captured audio is being saved".into(),
                );
                if self
                    .disconnected_generation
                    .swap(*generation, Ordering::AcqRel)
                    != *generation
                {
                    Some((binding_id.clone(), *generation))
                } else {
                    None
                }
            }
            _ => None,
        };
        let result = match scan {
            Ok((devices, candidates)) => {
                let always_on = matches!(
                    *self.mode.lock().unwrap_or_else(|e| e.into_inner()),
                    MicrophoneMode::AlwaysOn
                );
                let is_open = *self.is_open.lock().unwrap_or_else(|e| e.into_inner());
                if should_reconcile_stream(
                    !matches!(*state, RecordingState::Idle),
                    is_open,
                    always_on,
                    snapshot.active.as_ref().map(|device| device.id.as_str()),
                    candidates.first().map(|device| device.id.as_str()),
                    stream_failed || missing_active,
                ) {
                    self.open_microphone_candidates(&state, &devices, &candidates)
                        .map_err(|error| error.to_string())
                } else {
                    Ok(())
                }
            }
            Err(error) => Err(error),
        };
        drop(state);
        if let Some((binding_id, generation)) = interrupted {
            if let Some(coordinator) = self.app_handle.try_state::<TranscriptionCoordinator>() {
                coordinator.notify_microphone_disconnected(&binding_id, generation);
            }
        }
        result.map(|()| self.microphone_status())
    }

    /// Polling covers every supported CPAL backend, including default changes.
    /// It only enumerates during on-demand idle: no microphone is opened.
    pub fn start_device_monitor(self: &Arc<Self>) {
        if self.device_monitor_started.swap(true, Ordering::AcqRel) {
            return;
        }
        let weak = Arc::downgrade(self);
        std::thread::spawn(move || loop {
            let Some(manager) = weak.upgrade() else {
                break;
            };
            if let Err(error) = manager.refresh_microphone_devices() {
                log::debug!("Microphone device refresh: {error}");
            }
            drop(manager);
            std::thread::sleep(Duration::from_secs(2));
        });
    }

    pub fn update_selected_device(&self) -> Result<(), anyhow::Error> {
        self.update_microphone_status(|tracking| {
            tracking.fingerprint = None;
        });
        self.refresh_microphone_devices()
            .map(|_| ())
            .map_err(anyhow::Error::msg)
    }
}
