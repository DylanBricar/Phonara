use super::policy::{
    classify, endpoints_for_container, parse_product_reply, Observation, Query, Reply, Tracker,
    POLL_INTERVAL, RECEIVER_PRODUCT,
};
use hidapi::{HidApi, HidDevice};
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use windows::core::GUID;
use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_ContainerId;
use windows::Win32::Foundation::RPC_E_CHANGED_MODE;
use windows::Win32::Media::Audio::{
    eCapture, IMMDeviceEnumerator, MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
};
use windows::Win32::System::Com::StructuredStorage::{PropVariantClear, PropVariantToGUID};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
    COINIT_MULTITHREADED, STGM_READ,
};

const VENDOR_ID: u16 = 0x1b1c;
const USAGE_PAGE: u16 = 0xff42;
const HID_INTERFACE: i32 = 3;
const QUERY_TIMEOUT: Duration = Duration::from_millis(500);
const MAX_DRAIN_REPORTS: usize = 32;
const MAX_REPLY_REPORTS: usize = 128;

#[derive(Clone, Hash, PartialEq, Eq)]
struct ReceiverKey {
    path: Vec<u8>,
    container: u128,
}

#[derive(Default)]
struct ReceiverState {
    presence: Tracker,
    endpoints: Vec<String>,
}

#[derive(Default)]
struct PollState {
    last_started: Option<Instant>,
    trackers: HashMap<ReceiverKey, ReceiverState>,
}

static POLL: OnceLock<Mutex<PollState>> = OnceLock::new();
static SNAPSHOT: OnceLock<Mutex<HashMap<String, Instant>>> = OnceLock::new();

pub(super) fn unavailable_endpoints() -> HashSet<String> {
    let snapshot = SNAPSHOT
        .get_or_init(Mutex::default)
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    fresh_endpoints(&snapshot, Instant::now())
}

fn fresh_endpoints(snapshot: &HashMap<String, Instant>, now: Instant) -> HashSet<String> {
    snapshot
        .iter()
        .filter(|(_, expiry)| **expiry >= now)
        .map(|(endpoint, _)| endpoint.clone())
        .collect()
}

fn collect_unavailable(
    trackers: &HashMap<ReceiverKey, ReceiverState>,
    now: Instant,
) -> HashMap<String, Instant> {
    let mut unavailable = HashMap::new();
    for state in trackers.values() {
        if let Some(expiry) = state.presence.unreachable_until(now) {
            for endpoint in &state.endpoints {
                unavailable.insert(endpoint.clone(), expiry);
            }
        }
    }
    unavailable
}

pub(super) fn refresh() {
    // This lock is independent of capture state and the tiny read-only snapshot.
    // A stuck driver cannot block another refresh caller or audio enumeration.
    let Ok(mut poll) = POLL.get_or_init(Mutex::default).try_lock() else {
        return;
    };
    let now = Instant::now();
    if poll
        .last_started
        .is_some_and(|last| now.duration_since(last) < POLL_INTERVAL)
    {
        return;
    }
    poll.last_started = Some(now);
    if let Err(reason) = probe_receivers(&mut poll.trackers) {
        log::debug!("Wireless microphone presence: observation=Unknown, reason={reason}");
        // The last exact mapping and negative proof may bridge a short failure.
        // Unknown resets confirmation attempts but never renews the proof's TTL.
        mark_all_unknown(&mut poll.trackers, Instant::now());
    }
    let now = Instant::now();
    let unavailable = collect_unavailable(&poll.trackers, now);
    let mut snapshot = SNAPSHOT
        .get_or_init(Mutex::default)
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    if fresh_endpoints(&snapshot, now) != fresh_endpoints(&unavailable, now) {
        log::debug!(
            "Wireless microphone presence: {} unavailable input endpoint(s)",
            unavailable.len()
        );
    }
    // Publish each proof's actual expiry, never this publication's timestamp.
    // This also bounds grace if the next driver call stalls indefinitely.
    *snapshot = unavailable;
}

fn probe_receivers(trackers: &mut HashMap<ReceiverKey, ReceiverState>) -> Result<(), &'static str> {
    // Do not change hidapi's process-wide discovery setting: other consumers may
    // need it. Only the exact supported collection is ever opened or queried.
    let api = HidApi::new().map_err(|_| "hid_enumeration_failed")?;
    let devices: Vec<_> = api
        .device_list()
        .filter(|info| {
            info.vendor_id() == VENDOR_ID
                && info.product_id() == RECEIVER_PRODUCT
                && info.interface_number() == HID_INTERFACE
                && info.usage_page() == USAGE_PAGE
                && info.usage() == 1
        })
        .collect();
    let present_paths: HashSet<_> = devices
        .iter()
        .map(|info| info.path().to_bytes().to_vec())
        .collect();
    // Only a successful enumeration proves a disappeared receiver. A temporary
    // open/property failure must not forget that a slot held a different model.
    trackers.retain(|key, _| present_paths.contains(&key.path));
    let mut receivers = Vec::new();
    for (index, info) in devices.into_iter().enumerate() {
        let Ok(handle) = api.open_path(info.path()) else {
            log::debug!(
                "Wireless microphone receiver {index}: observation=Unknown, reason=hid_open_failed"
            );
            mark_path_unknown(trackers, info.path().to_bytes(), Instant::now());
            continue;
        };
        let Ok(container) = handle.get_container_id() else {
            log::debug!("Wireless microphone receiver {index}: observation=Unknown, reason=container_read_failed");
            mark_path_unknown(trackers, info.path().to_bytes(), Instant::now());
            continue;
        };
        let container = GUID {
            data1: container.data1,
            data2: container.data2,
            data3: container.data3,
            data4: container.data4,
        }
        .to_u128();
        if container == 0 {
            log::debug!(
                "Wireless microphone receiver {index}: observation=Unknown, reason=empty_container"
            );
            for (_, state) in trackers
                .iter_mut()
                .filter(|(key, _)| key.path == info.path().to_bytes())
            {
                clear_mapping(state);
            }
            continue;
        }
        trackers.retain(|key, _| key.path != info.path().to_bytes() || key.container == container);
        let key = ReceiverKey {
            path: info.path().to_bytes().to_vec(),
            container,
        };
        trackers.entry(key.clone()).or_default();
        receivers.push((key, handle));
    }
    invalidate_ambiguous_mappings(trackers);
    if receivers.is_empty() {
        return Ok(());
    }
    let endpoints = input_endpoint_containers().map_err(|_| "audio_endpoint_enumeration_failed")?;
    for (index, (key, handle)) in receivers.iter().enumerate() {
        let same_container = trackers
            .keys()
            .filter(|other| other.container == key.container)
            .count();
        let mapped = endpoints_for_container(&endpoints, key.container, same_container);
        if mapped.is_empty() {
            log::debug!("Wireless microphone receiver {index}: observation=Unknown, reason=missing_or_ambiguous_endpoint_mapping");
            clear_mapping(trackers.entry(key.clone()).or_default());
            continue;
        }
        let receiver = query_product(handle, 0);
        let radio = query_product(handle, 1);
        let state = trackers.entry(key.clone()).or_default();
        state.endpoints = mapped;
        let now = Instant::now();
        let observation = classify(receiver.value, radio.value);
        state.presence.observe(observation, now);
        if matches!(observation, Observation::Unknown | Observation::OtherModel) {
            log::debug!("Wireless microphone receiver {index}: receiver_query={:?}, receiver_reason={}, radio_query={:?}, radio_reason={}, observation={observation:?}, retained_unavailable={}", receiver.value, receiver.reason, radio.value, radio.reason, state.presence.is_unreachable(now));
        } else {
            log::trace!(
                "Wireless microphone receiver {index}: observation={observation:?}, unavailable={}",
                state.presence.is_unreachable(now)
            );
        }
    }
    Ok(())
}

fn clear_mapping(state: &mut ReceiverState) {
    state.endpoints.clear();
    state.presence.clear_confirmation();
    state.presence.observe(Observation::Unknown, Instant::now());
}

fn invalidate_ambiguous_mappings(trackers: &mut HashMap<ReceiverKey, ReceiverState>) {
    let mut counts = HashMap::<u128, usize>::new();
    for key in trackers.keys() {
        *counts.entry(key.container).or_default() += 1;
    }
    for (key, state) in trackers.iter_mut() {
        if counts.get(&key.container).copied().unwrap_or(0) > 1 {
            clear_mapping(state);
        }
    }
}

fn mark_all_unknown(trackers: &mut HashMap<ReceiverKey, ReceiverState>, now: Instant) {
    for state in trackers.values_mut() {
        state.presence.observe(Observation::Unknown, now);
    }
}

fn mark_path_unknown(
    trackers: &mut HashMap<ReceiverKey, ReceiverState>,
    path: &[u8],
    now: Instant,
) {
    for (key, state) in trackers.iter_mut() {
        if key.path == path {
            state.presence.observe(Observation::Unknown, now);
        }
    }
}

#[derive(Debug)]
struct QueryResult {
    value: Query,
    reason: &'static str,
}

impl QueryResult {
    fn new(value: Query, reason: &'static str) -> Self {
        Self { value, reason }
    }
    fn unknown(reason: &'static str) -> Self {
        Self::new(Query::Unknown, reason)
    }
}

fn query_product(handle: &HidDevice, channel: u8) -> QueryResult {
    let mut buffer = [0; 64];
    // Drain the prior response queue before sending this single property read.
    // A continuously busy queue cannot establish response correlation.
    let mut drained = false;
    for _ in 0..MAX_DRAIN_REPORTS {
        match handle.read_timeout(&mut buffer, 0) {
            Ok(0) => {
                drained = true;
                break;
            }
            Ok(_) => {}
            Err(_) => return QueryResult::unknown("drain_read_failed"),
        }
    }
    if !drained {
        return QueryResult::unknown("prior_queue_still_busy");
    }
    // Independently verified on Virtuoso XT: report 2, receiver/radio channel,
    // read opcode 2, ProductID property 0x12. No mode or setting writes occur.
    let mut request = [0; 64];
    request[..4].copy_from_slice(&[2, 8 + channel, 2, 0x12]);
    let deadline = Instant::now() + QUERY_TIMEOUT;
    // windows-native may return Ok(0) after synchronous WriteFile success.
    match handle.write(&request) {
        Ok(0 | 64) => {}
        Ok(_) => return QueryResult::unknown("partial_write"),
        Err(_) => return QueryResult::unknown("write_failed"),
    }
    if Instant::now() >= deadline {
        return QueryResult::unknown("write_exceeded_deadline");
    }
    let mut unrelated_response = false;
    for _ in 0..MAX_REPLY_REPORTS {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return if unrelated_response {
                QueryResult::unknown("uncorrelated_reply")
            } else {
                QueryResult::new(Query::Timeout, "no_reply_before_deadline")
            };
        }
        let timeout_ms = remaining.as_millis().clamp(1, 50) as i32;
        let count = match handle.read_timeout(&mut buffer, timeout_ms) {
            Ok(count) => count,
            Err(_) => return QueryResult::unknown("reply_read_failed"),
        };
        if count == 0 {
            continue;
        }
        match parse_product_reply(&buffer[..count], channel) {
            Reply::Product(product) => {
                return QueryResult::new(Query::Product(product), "product_reply")
            }
            Reply::Malformed => return QueryResult::unknown("malformed_reply"),
            Reply::Unrelated => unrelated_response = true,
        }
    }
    QueryResult::unknown("reply_limit_exceeded")
}

struct ComApartment(bool);

impl Drop for ComApartment {
    fn drop(&mut self) {
        if self.0 {
            // SAFETY: balances this thread's successful CoInitializeEx only.
            unsafe { CoUninitialize() };
        }
    }
}

fn input_endpoint_containers() -> windows::core::Result<Vec<(String, u128)>> {
    // SAFETY: COM objects remain on this thread; allocated IDs and property
    // variants are freed before the apartment guard is dropped. No stream opens.
    unsafe {
        let initialized = CoInitializeEx(None, COINIT_MULTITHREADED);
        if initialized.is_err() && initialized != RPC_E_CHANGED_MODE {
            initialized.ok()?;
        }
        let _apartment = ComApartment(initialized.is_ok());
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let devices = enumerator.EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE)?;
        let mut endpoints = Vec::new();
        for index in 0..devices.GetCount()? {
            let device = devices.Item(index)?;
            let id = device.GetId()?;
            let endpoint_id = id.to_string();
            CoTaskMemFree(Some(id.0.cast()));
            let endpoint_id = endpoint_id?;
            let Ok(store) = device.OpenPropertyStore(STGM_READ) else {
                continue;
            };
            let Ok(mut property) = store.GetValue(&PKEY_Device_ContainerId) else {
                continue;
            };
            let container = PropVariantToGUID(&property);
            let _ = PropVariantClear(&mut property);
            if let Ok(container) = container {
                endpoints.push((
                    cpal::DeviceId(cpal::HostId::Wasapi, endpoint_id).to_string(),
                    container.to_u128(),
                ));
            }
        }
        Ok(endpoints)
    }
}

#[cfg(test)]
mod tests {
    use super::super::policy::CACHE_TTL;
    use super::*;

    fn confirmed_receiver(now: Instant) -> (ReceiverKey, ReceiverState) {
        let key = ReceiverKey {
            path: b"receiver-one".to_vec(),
            container: 1,
        };
        let mut state = ReceiverState {
            endpoints: vec!["endpoint-one".into()],
            ..Default::default()
        };
        for tick in 0..3 {
            state
                .presence
                .observe(Observation::RadioTimeout, now + POLL_INTERVAL * tick);
        }
        (key, state)
    }

    #[test]
    fn global_error_and_republication_keep_each_original_expiry() {
        let now = Instant::now();
        let mut trackers = HashMap::from([confirmed_receiver(now)]);
        let confirmed = now + POLL_INTERVAL * 2;
        let original = collect_unavailable(&trackers, confirmed);
        for tick in 1..4 {
            let uncertain = confirmed + POLL_INTERVAL * tick;
            mark_all_unknown(&mut trackers, uncertain);
            let republished = collect_unavailable(&trackers, uncertain);
            assert_eq!(republished, original);
            // Even if no later refresh completes, the snapshot expires on time.
            assert!(fresh_endpoints(
                &republished,
                confirmed + CACHE_TTL + Duration::from_millis(1)
            )
            .is_empty());
        }
    }

    #[test]
    fn temporary_open_or_container_failure_preserves_only_its_original_grace() {
        let now = Instant::now();
        let mut trackers = HashMap::from([confirmed_receiver(now)]);
        let confirmed = now + POLL_INTERVAL * 2;
        let original = collect_unavailable(&trackers, confirmed);
        mark_path_unknown(&mut trackers, b"receiver-one", confirmed + POLL_INTERVAL);
        assert_eq!(
            collect_unavailable(&trackers, confirmed + POLL_INTERVAL),
            original
        );
        assert!(
            collect_unavailable(&trackers, confirmed + CACHE_TTL + Duration::from_millis(1))
                .is_empty()
        );
    }

    #[test]
    fn ambiguous_mapping_clears_cached_absence_even_if_one_handle_failed() {
        let now = Instant::now();
        let mut trackers = HashMap::from([confirmed_receiver(now)]);
        let other = ReceiverKey {
            path: b"receiver-two".to_vec(),
            container: 1,
        };
        // This known, still-present identity participates even without an open handle.
        trackers.insert(other, ReceiverState::default());
        invalidate_ambiguous_mappings(&mut trackers);
        assert!(collect_unavailable(&trackers, now + POLL_INTERVAL * 2).is_empty());
        assert!(trackers.values().all(|state| state.endpoints.is_empty()));
    }

    #[test]
    fn removing_an_invalid_mapping_clears_confirmation_immediately() {
        let now = Instant::now();
        let (key, mut state) = confirmed_receiver(now);
        clear_mapping(&mut state);
        assert!(
            collect_unavailable(&HashMap::from([(key, state)]), now + POLL_INTERVAL * 2).is_empty()
        );
    }
}
