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

#[allow(deprecated)]
pub fn list_input_device_identities() -> Result<Vec<CpalInputDevice>, Box<dyn std::error::Error>> {
    let host = crate::audio_toolkit::get_cpal_host();
    let default_id = host
        .default_input_device()
        .map(|device| device.id())
        .transpose()?;

    let unavailable = super::wireless::unavailable_endpoints();
    let mut out = Vec::new();

    for device in host.input_devices()? {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());
        let id = device.id()?;
        if unavailable.contains(&id.to_string()) {
            continue;
        }
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
pub fn list_output_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    let host = crate::audio_toolkit::get_cpal_host();
    let default_device = host.default_output_device();
    let default_id = default_device.as_ref().and_then(|device| device.id().ok());
    let default_name = default_device.and_then(|device| device.name().ok());

    let mut out = Vec::<CpalDeviceInfo>::new();

    for (index, device) in host.output_devices()?.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown".into());
        let id = device.id().ok();
        let is_default = match (&id, &default_id) {
            (Some(id), Some(default_id)) => id == default_id,
            _ => Some(&name) == default_name.as_ref(),
        };
        let channels = device
            .default_output_config()
            .map(|c| c.channels())
            .unwrap_or(1);

        out.push(CpalDeviceInfo {
            // Output identities are not persisted by microphone preferences.
            id: id
                .map(|id| id.to_string())
                .unwrap_or_else(|| format!("output:{index}")),
            index: index.to_string(),
            name,
            is_default,
            channels,
            device,
        });
    }

    Ok(out)
}
