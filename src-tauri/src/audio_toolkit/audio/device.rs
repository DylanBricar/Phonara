use cpal::traits::{DeviceTrait, HostTrait};

pub struct CpalDeviceInfo {
    pub id: String,
    pub index: String,
    pub name: String,
    pub is_default: bool,
    pub channels: u16,
    pub device: cpal::Device,
}

/// Enumeration metadata only. Obtaining this does not open an input stream or
/// request its configuration, including while monitoring on-demand devices.
pub struct CpalInputDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub device: cpal::Device,
}

/// Feedback outputs belong to rodio's CPAL version. Microphone handles always
/// come from handy-cpal, the same backend used by handy-recorder.
pub struct OutputDeviceInfo {
    pub index: String,
    pub name: String,
    pub is_default: bool,
}

#[allow(deprecated)]
pub fn list_input_device_identities() -> Result<Vec<CpalInputDevice>, Box<dyn std::error::Error>> {
    let unavailable = super::wireless::unavailable_endpoints();
    Ok(list_raw_input_device_identities()?
        .into_iter()
        .filter(|input| !unavailable.contains(&input.id))
        .collect())
}

/// Raw OS inventory, before wireless availability policy is applied.
#[allow(deprecated)]
pub(crate) fn list_raw_input_device_identities(
) -> Result<Vec<CpalInputDevice>, Box<dyn std::error::Error>> {
    let host = crate::audio_toolkit::get_cpal_host();
    let default_id = host
        .default_input_device()
        .and_then(|device| device.id().ok());

    let mut out = Vec::new();

    for device in host.input_devices()? {
        let name = device
            .description()
            .map(|description| description.name().to_owned())
            .unwrap_or_else(|_| "Unknown".into());
        let id = match device.id() {
            Ok(id) => id,
            Err(error) => {
                log::warn!("Skipping an input endpoint with an unreadable identity: {error}");
                continue;
            }
        };
        let is_default = Some(&id) == default_id.as_ref();
        out.push(CpalInputDevice {
            id: id.to_string(),
            name,
            is_default,
            device,
        });
    }

    Ok(out)
}

pub fn list_input_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    Ok(list_input_device_identities()?
        .into_iter()
        .enumerate()
        .map(|(index, input)| {
            let channels = input
                .device
                .default_input_config()
                .map(|config| config.channels())
                .unwrap_or(1);
            CpalDeviceInfo {
                id: input.id,
                index: index.to_string(),
                name: input.name,
                is_default: input.is_default,
                channels,
                device: input.device,
            }
        })
        .collect())
}

#[allow(deprecated)]
pub fn list_output_devices() -> Result<Vec<OutputDeviceInfo>, Box<dyn std::error::Error>> {
    use rodio::cpal::traits::{DeviceTrait as _, HostTrait as _};
    let host = rodio::cpal::default_host();
    let default_device = host.default_output_device();
    let default_id = default_device.as_ref().and_then(|device| device.id().ok());
    let default_name = default_device.and_then(|device| device.name().ok());

    let mut out = Vec::<OutputDeviceInfo>::new();

    for (index, device) in host.output_devices()?.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());
        let id = device.id().ok();
        let is_default = match (&id, &default_id) {
            (Some(id), Some(default_id)) => id == default_id,
            _ => Some(&name) == default_name.as_ref(),
        };
        out.push(OutputDeviceInfo {
            index: index.to_string(),
            name,
            is_default,
        });
    }

    Ok(out)
}
