//! Read-only endpoint controls. Reading mute never opens an audio capture stream.
use std::collections::HashMap;

#[derive(Clone, Copy, Debug, serde::Serialize)]
pub(crate) struct InputState {
    pub muted: bool,
}

pub(crate) fn input_states() -> HashMap<String, InputState> {
    #[cfg(windows)]
    {
        read_windows_states().unwrap_or_else(|error| {
            log::debug!("Could not read microphone mute controls: {error}");
            HashMap::new()
        })
    }
    #[cfg(not(windows))]
    {
        HashMap::new()
    }
}

#[cfg(windows)]
fn read_windows_states() -> windows::core::Result<HashMap<String, InputState>> {
    use windows::Win32::{
        Foundation::RPC_E_CHANGED_MODE,
        Media::Audio::{
            eCapture, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator, MMDeviceEnumerator,
            DEVICE_STATE_ACTIVE,
        },
        System::Com::{
            CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
            COINIT_MULTITHREADED,
        },
    };
    struct Apartment(bool);
    impl Drop for Apartment {
        fn drop(&mut self) {
            if self.0 {
                unsafe {
                    CoUninitialize();
                }
            }
        }
    }
    // SAFETY: COM values stay on this thread; the apartment guard balances only
    // a successful initialization. GetMute reads a control, never changes it.
    unsafe {
        let initialized = CoInitializeEx(None, COINIT_MULTITHREADED);
        if initialized.is_err() && initialized != RPC_E_CHANGED_MODE {
            initialized.ok()?;
        }
        let _apartment = Apartment(initialized.is_ok());
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let devices = enumerator.EnumAudioEndpoints(eCapture, DEVICE_STATE_ACTIVE)?;
        let mut states = HashMap::new();
        for index in 0..devices.GetCount()? {
            let device = devices.Item(index)?;
            let id = device.GetId()?;
            let endpoint = id.to_string();
            CoTaskMemFree(Some(id.0.cast()));
            let endpoint = endpoint?;
            if let Ok(volume) = device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) {
                if let Ok(muted) = volume.GetMute() {
                    states.insert(
                        cpal::DeviceId::new(cpal::HostId::Wasapi, endpoint.as_str()).to_string(),
                        InputState {
                            muted: muted.as_bool(),
                        },
                    );
                }
            }
        }
        Ok(states)
    }
}
