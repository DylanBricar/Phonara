use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, specta::Type)]
pub struct MicrophonePreference {
    pub id: Option<String>,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq, specta::Type)]
pub struct MicrophoneDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq, specta::Type)]
pub struct MicrophoneStatus {
    pub revision: u32,
    pub devices: Vec<MicrophoneDevice>,
    pub active: Option<MicrophoneDevice>,
    pub next: Option<MicrophoneDevice>,
    pub is_recording: bool,
    pub error: Option<String>,
}

/// An ID is authoritative. A legacy name is safe only while it has one match.
pub(crate) fn resolve_preference<'a>(
    preference: &MicrophonePreference,
    devices: &'a [MicrophoneDevice],
) -> Option<&'a MicrophoneDevice> {
    if let Some(id) = &preference.id {
        return devices.iter().find(|device| device.id == *id);
    }
    let mut matches = devices
        .iter()
        .filter(|device| device.name == preference.name);
    let first = matches.next()?;
    matches.next().is_none().then_some(first)
}

pub(crate) fn bind_legacy_preferences(
    preferences: &mut Vec<MicrophonePreference>,
    devices: &[MicrophoneDevice],
) -> bool {
    let mut changed = false;
    for preference in preferences.iter_mut() {
        if preference.id.is_none() {
            if let Some(device) = resolve_preference(preference, devices) {
                preference.id = Some(device.id.clone());
                changed = true;
            }
        }
    }
    // Resolving a formerly ambiguous name can point at an ID already ranked
    // below it. Keep the first occurrence so the saved order remains unique.
    let mut seen_ids = std::collections::HashSet::new();
    preferences.retain(|preference| {
        let keep = preference
            .id
            .as_ref()
            .is_none_or(|id| seen_ids.insert(id.clone()));
        changed |= !keep;
        keep
    });
    changed
}

/// Produces the complete fallback order without changing saved preferences.
pub(crate) fn ordered_candidates(
    preferences: &[MicrophonePreference],
    devices: &[MicrophoneDevice],
    clamshell_name: Option<&str>,
) -> Vec<MicrophoneDevice> {
    let mut candidates = Vec::new();
    let mut append = |device: &MicrophoneDevice| {
        if !candidates
            .iter()
            .any(|existing: &MicrophoneDevice| existing.id == device.id)
        {
            candidates.push(device.clone());
        }
    };
    if let Some(name) = clamshell_name {
        if let Some(device) = resolve_preference(
            &MicrophonePreference {
                id: None,
                name: name.into(),
            },
            devices,
        ) {
            append(device);
        }
    }
    for preference in preferences {
        if let Some(device) = resolve_preference(preference, devices) {
            append(device);
        }
    }
    if let Some(device) = devices.iter().find(|device| device.is_default) {
        append(device);
    }
    candidates
}

pub(crate) fn first_usable<T>(
    candidates: &[MicrophoneDevice],
    mut open: impl FnMut(&MicrophoneDevice) -> Result<T, String>,
) -> Result<(MicrophoneDevice, T), String> {
    let mut failures = Vec::new();
    for candidate in candidates {
        match open(candidate) {
            Ok(opened) => return Ok((candidate.clone(), opened)),
            Err(error) => failures.push(format!("{}: {error}", candidate.name)),
        }
    }
    if failures.is_empty() {
        Err("No input device found".into())
    } else {
        Err(format!(
            "Failed to open a microphone: {}",
            failures.join("; ")
        ))
    }
}

pub(crate) fn should_reconcile_stream(
    is_recording: bool,
    is_open: bool,
    always_on: bool,
    active_id: Option<&str>,
    next_id: Option<&str>,
    failed: bool,
) -> bool {
    !is_recording && (is_open || always_on) && (failed || active_id != next_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn device(id: &str, name: &str, is_default: bool) -> MicrophoneDevice {
        MicrophoneDevice {
            id: id.into(),
            name: name.into(),
            is_default,
        }
    }

    fn preference(id: Option<&str>, name: &str) -> MicrophonePreference {
        MicrophonePreference {
            id: id.map(str::to_string),
            name: name.into(),
        }
    }

    #[test]
    fn preferred_microphone_returns_after_reconnection_without_erasing_order() {
        let priorities = vec![
            preference(Some("usb"), "Studio"),
            preference(Some("headset"), "Headset"),
        ];
        let headset = device("headset", "Headset", false);
        let system = device("internal", "Built-in", true);
        assert_eq!(
            ordered_candidates(&priorities, &[headset.clone(), system.clone()], None),
            vec![headset.clone(), system.clone()]
        );
        let studio = device("usb", "Studio", false);
        assert_eq!(
            ordered_candidates(
                &priorities,
                &[headset.clone(), system.clone(), studio.clone()],
                None
            ),
            vec![studio, headset, system]
        );
        assert_eq!(priorities[0].id.as_deref(), Some("usb"));
    }

    #[test]
    fn stable_ids_distinguish_identically_named_microphones() {
        let devices = vec![
            device("a", "USB Microphone", false),
            device("b", "USB Microphone", true),
        ];
        assert_eq!(
            resolve_preference(&preference(Some("b"), "USB Microphone"), &devices),
            Some(&devices[1])
        );
        assert_eq!(
            resolve_preference(&preference(Some("gone"), "USB Microphone"), &devices),
            None
        );
        assert_eq!(
            resolve_preference(&preference(None, "USB Microphone"), &devices),
            None
        );
    }

    #[test]
    fn binds_legacy_name_only_when_unique_and_keeps_offline_preferences() {
        let mut preferences = vec![preference(None, "Headset"), preference(None, "Offline")];
        assert!(bind_legacy_preferences(
            &mut preferences,
            &[device("usb", "Headset", true)]
        ));
        assert_eq!(
            preferences,
            vec![
                preference(Some("usb"), "Headset"),
                preference(None, "Offline")
            ]
        );
        assert!(!bind_legacy_preferences(&mut preferences, &[]));
    }

    #[test]
    fn binding_an_unambiguous_legacy_name_removes_duplicate_id_at_lower_priority() {
        let mut preferences = vec![
            preference(None, "USB"),
            preference(Some("a"), "USB renamed"),
            preference(Some("b"), "USB"),
        ];
        let both = vec![device("a", "USB", true), device("b", "USB", false)];
        assert!(!bind_legacy_preferences(&mut preferences, &both));
        assert!(bind_legacy_preferences(&mut preferences, &both[..1]));
        assert_eq!(
            preferences,
            vec![preference(Some("a"), "USB"), preference(Some("b"), "USB")]
        );
        assert!(!bind_legacy_preferences(&mut preferences, &both[..1]));
    }

    #[test]
    fn clamshell_override_falls_back_to_priority_and_default_is_not_duplicated() {
        let devices = vec![device("a", "Studio", false), device("b", "Headset", true)];
        let preferences = vec![
            preference(Some("a"), "Studio"),
            preference(Some("b"), "Headset"),
        ];
        assert_eq!(
            ordered_candidates(&preferences, &devices, Some("Headset")),
            vec![devices[1].clone(), devices[0].clone()]
        );
        assert_eq!(
            ordered_candidates(&preferences, &devices, Some("Offline")),
            devices
        );
    }

    #[test]
    fn absent_system_default_does_not_select_an_arbitrary_microphone() {
        assert!(ordered_candidates(&[], &[device("a", "USB", false)], None).is_empty());
        assert!(ordered_candidates(&[preference(Some("gone"), "Old")], &[], None).is_empty());
    }

    #[test]
    fn default_changes_are_resolved_fresh_while_explicit_priority_stays_authoritative() {
        let before = vec![device("a", "Built-in", true), device("b", "Headset", false)];
        let after = vec![device("a", "Built-in", false), device("b", "Headset", true)];
        assert_eq!(
            ordered_candidates(&[], &before, None),
            vec![before[0].clone()]
        );
        assert_eq!(
            ordered_candidates(&[], &after, None),
            vec![after[1].clone()]
        );
        assert_eq!(
            ordered_candidates(&[preference(Some("a"), "Built-in")], &after, None),
            after
        );
    }

    #[test]
    fn open_failure_tries_following_favorites_then_system_default() {
        let devices = vec![
            device("a", "Studio", false),
            device("b", "Headset", false),
            device("c", "Internal", true),
        ];
        let mut attempts = Vec::new();
        let opened = first_usable(&devices, |candidate| {
            attempts.push(candidate.id.clone());
            if candidate.is_default {
                Ok(())
            } else {
                Err("unavailable".into())
            }
        })
        .expect("fallback opens");
        assert_eq!(opened.0, devices[2]);
        assert_eq!(attempts, vec!["a", "b", "c"]);
    }

    #[test]
    fn microphone_changes_are_deferred_during_capture_and_on_demand_idle_stays_closed() {
        assert!(!should_reconcile_stream(
            true,
            true,
            false,
            Some("a"),
            Some("b"),
            false
        ));
        assert!(!should_reconcile_stream(
            false,
            false,
            false,
            None,
            Some("a"),
            false
        ));
        assert!(should_reconcile_stream(
            false,
            true,
            false,
            Some("a"),
            Some("b"),
            false
        ));
        assert!(should_reconcile_stream(
            false,
            false,
            true,
            None,
            Some("a"),
            false
        ));
        assert!(should_reconcile_stream(
            false,
            true,
            false,
            Some("a"),
            Some("a"),
            true
        ));
        assert!(!should_reconcile_stream(
            false,
            true,
            false,
            Some("a"),
            Some("a"),
            false
        ));
    }
}
