//! Read-only Windows hardware identities, including retained inactive endpoints.
//! Never match a replacement by its display name alone or open an input stream.
use std::collections::HashMap;

pub(crate) fn input_hardware_identities() -> HashMap<String, u128> {
    #[cfg(windows)]
    {
        input_endpoint_containers(true)
            .unwrap_or_else(|error| {
                log::debug!("Could not read microphone hardware identities: {error}");
                Vec::new()
            })
            .into_iter()
            .collect()
    }
    #[cfg(not(windows))]
    {
        HashMap::new()
    }
}

#[cfg(windows)]
mod native {
    use windows::Win32::Devices::FunctionDiscovery::PKEY_Device_ContainerId;
    use windows::Win32::Foundation::RPC_E_CHANGED_MODE;
    use windows::Win32::Media::Audio::{
        eCapture, IMMDeviceEnumerator, MMDeviceEnumerator, DEVICE_STATE, DEVICE_STATEMASK_ALL,
        DEVICE_STATE_ACTIVE,
    };
    use windows::Win32::System::Com::StructuredStorage::{PropVariantClear, PropVariantToGUID};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
        COINIT_MULTITHREADED, STGM_READ,
    };

    struct ComApartment(bool);

    impl Drop for ComApartment {
        fn drop(&mut self) {
            if self.0 {
                // SAFETY: balances this thread's successful CoInitializeEx only.
                unsafe { CoUninitialize() };
            }
        }
    }

    pub(crate) fn input_endpoint_containers(
        include_inactive: bool,
    ) -> windows::core::Result<Vec<(String, u128)>> {
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
            let devices = enumerator.EnumAudioEndpoints(
                eCapture,
                if include_inactive {
                    DEVICE_STATE(DEVICE_STATEMASK_ALL)
                } else {
                    DEVICE_STATE_ACTIVE
                },
            )?;
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
                    if container.to_u128() == 0 {
                        continue;
                    }
                    endpoints.push((
                        cpal::DeviceId::new(cpal::HostId::Wasapi, endpoint_id.as_str()).to_string(),
                        container.to_u128(),
                    ));
                }
            }
            Ok(endpoints)
        }
    }
}

#[cfg(windows)]
pub(crate) use native::input_endpoint_containers;
