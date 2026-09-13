//! Radio presence for explicitly supported receivers. Unknown and stale results
//! leave normal OS device selection intact; audio enumeration never performs HID I/O.

#[cfg(any(windows, test))]
mod policy;
#[cfg(windows)]
mod windows;

/// Refresh only outside audio capture locks. Concurrent callers skip the probe.
pub(crate) fn refresh() {
    #[cfg(windows)]
    windows::refresh();
}

pub(super) fn unavailable_endpoints() -> std::collections::HashSet<String> {
    #[cfg(windows)]
    {
        windows::unavailable_endpoints()
    }
    #[cfg(not(windows))]
    {
        std::collections::HashSet::new()
    }
}
