use super::policy::{
    classify, endpoints_for_container, parse_product_reply, Observation, Query, Reply, Tracker,
    CACHE_TTL, POLL_INTERVAL, RECEIVER_PRODUCT,
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
struct PollState {
    last_started: Option<Instant>,
    trackers: HashMap<ReceiverKey, Tracker>,
}

#[derive(Default)]
struct Snapshot {
    checked_at: Option<Instant>,
    unavailable: HashSet<String>,
}

static POLL: OnceLock<Mutex<PollState>> = OnceLock::new();
static SNAPSHOT: OnceLock<Mutex<Snapshot>> = OnceLock::new();

pub(super) fn unavailable_endpoints() -> HashSet<String> {
    let snapshot = SNAPSHOT
        .get_or_init(Mutex::default)
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    if snapshot
        .checked_at
        .is_some_and(|checked| checked.elapsed() <= CACHE_TTL)
    {
        snapshot.unavailable.clone()
    } else {
        HashSet::new()
    }
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
    let unavailable = match probe_receivers(&mut poll.trackers) {
        Ok(unavailable) => unavailable,
        Err(()) => {
            // Access failure, an ambiguous receiver, or missing metadata is not
            // evidence that the headset is off. Keep any contradicted model
            // identity, while resetting the consecutive timeout evidence.
            for tracker in poll.trackers.values_mut() {
                tracker.observe(Observation::Unknown, Instant::now());
            }
            HashSet::new()
        }
    };
    let mut snapshot = SNAPSHOT
        .get_or_init(Mutex::default)
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    if snapshot.unavailable != unavailable {
        log::debug!(
            "Wireless microphone presence: {} unavailable input endpoint(s)",
            unavailable.len()
        );
    }
    snapshot.unavailable = unavailable;
    // Use the refresh start so a slow later receiver never extends the lifetime
    // of an earlier receiver's observation beyond the cache TTL.
    snapshot.checked_at = Some(now);
}

fn probe_receivers(trackers: &mut HashMap<ReceiverKey, Tracker>) -> Result<HashSet<String>, ()> {
    // Do not change hidapi's process-wide discovery setting: other consumers may
    // need it. Only the exact supported collection is ever opened or queried.
    let api = HidApi::new().map_err(|_| ())?;
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
    for info in devices {
        let Ok(handle) = api.open_path(info.path()) else {
            mark_path_unknown(trackers, info.path().to_bytes());
            continue;
        };
        let Ok(container) = handle.get_container_id() else {
            mark_path_unknown(trackers, info.path().to_bytes());
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
            mark_path_unknown(trackers, info.path().to_bytes());
            continue;
        }
        trackers.retain(|key, _| key.path != info.path().to_bytes() || key.container == container);
        receivers.push((
            ReceiverKey {
                path: info.path().to_bytes().to_vec(),
                container,
            },
            handle,
        ));
    }
    if receivers.is_empty() {
        return Ok(HashSet::new());
    }
    let endpoints = input_endpoint_containers().map_err(|_| ())?;
    let mut unavailable = HashSet::new();
    for (key, handle) in &receivers {
        let same_container = receivers
            .iter()
            .filter(|(other, _)| other.container == key.container)
            .count();
        let mapped = endpoints_for_container(&endpoints, key.container, same_container);
        if mapped.is_empty() {
            trackers
                .entry(key.clone())
                .or_default()
                .observe(Observation::Unknown, Instant::now());
            continue;
        }
        let receiver = query_product(handle, 0);
        let radio = query_product(handle, 1);
        let tracker = trackers.entry(key.clone()).or_default();
        let now = Instant::now();
        tracker.observe(classify(receiver, radio), now);
        if tracker.is_unreachable(now) {
            unavailable.extend(mapped);
        }
    }
    Ok(unavailable)
}

fn mark_path_unknown(trackers: &mut HashMap<ReceiverKey, Tracker>, path: &[u8]) {
    for (key, tracker) in trackers.iter_mut() {
        if key.path == path {
            tracker.observe(Observation::Unknown, Instant::now());
        }
    }
}

fn query_product(handle: &HidDevice, channel: u8) -> Query {
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
            Err(_) => return Query::Unknown,
        }
    }
    if !drained {
        return Query::Unknown;
    }
    // Independently verified on Virtuoso XT: report 2, receiver/radio channel,
    // read opcode 2, ProductID property 0x12. No mode or setting writes occur.
    let mut request = [0; 64];
    request[..4].copy_from_slice(&[2, 8 + channel, 2, 0x12]);
    let deadline = Instant::now() + QUERY_TIMEOUT;
    // windows-native may return Ok(0) after synchronous WriteFile success.
    if !matches!(handle.write(&request), Ok(0 | 64)) || Instant::now() >= deadline {
        return Query::Unknown;
    }
    let mut unrelated_response = false;
    for _ in 0..MAX_REPLY_REPORTS {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return if unrelated_response {
                Query::Unknown
            } else {
                Query::Timeout
            };
        }
        let timeout_ms = remaining.as_millis().clamp(1, 50) as i32;
        let count = match handle.read_timeout(&mut buffer, timeout_ms) {
            Ok(count) => count,
            Err(_) => return Query::Unknown,
        };
        if count == 0 {
            continue;
        }
        match parse_product_reply(&buffer[..count], channel) {
            Reply::Product(product) => return Query::Product(product),
            Reply::Malformed => return Query::Unknown,
            Reply::Unrelated => unrelated_response = true,
        }
    }
    Query::Unknown
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
