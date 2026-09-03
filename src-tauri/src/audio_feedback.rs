use crate::settings::SoundTheme;
use crate::settings::{self, AppSettings};
use cpal::traits::{DeviceTrait, HostTrait};
use log::{debug, error, warn};
use rodio::DeviceSinkBuilder;
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub enum SoundType {
    Start,
    Stop,
}

static PLAYBACK_IN_FLIGHT: AtomicBool = AtomicBool::new(false);

struct PlaybackGuard;

impl PlaybackGuard {
    fn acquire() -> Option<Self> {
        PLAYBACK_IN_FLIGHT
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .ok()
            .map(|_| Self)
    }
}

impl Drop for PlaybackGuard {
    fn drop(&mut self) {
        PLAYBACK_IN_FLIGHT.store(false, Ordering::Release);
    }
}

fn resolve_sound_path(
    app: &AppHandle,
    settings: &AppSettings,
    sound_type: SoundType,
) -> Option<PathBuf> {
    let sound_file = get_sound_path(settings, sound_type);
    let base_dir = get_sound_base_dir(settings);
    match base_dir {
        tauri::path::BaseDirectory::AppData => {
            crate::portable::resolve_app_data(app, &sound_file).ok()
        }
        _ => app.path().resolve(&sound_file, base_dir).ok(),
    }
}

fn get_sound_path(settings: &AppSettings, sound_type: SoundType) -> String {
    match (settings.sound_theme, sound_type) {
        (SoundTheme::Custom, SoundType::Start) => "custom_start.wav".to_string(),
        (SoundTheme::Custom, SoundType::Stop) => "custom_stop.wav".to_string(),
        (_, SoundType::Start) => settings.sound_theme.to_start_path(),
        (_, SoundType::Stop) => settings.sound_theme.to_stop_path(),
    }
}

fn get_sound_base_dir(settings: &AppSettings) -> tauri::path::BaseDirectory {
    match settings.sound_theme {
        SoundTheme::Custom => tauri::path::BaseDirectory::AppData,
        _ => tauri::path::BaseDirectory::Resource,
    }
}

pub fn play_feedback_sound(app: &AppHandle, sound_type: SoundType) {
    let settings = settings::get_settings(app);
    if !settings.audio_feedback {
        return;
    }
    if is_system_muted() {
        debug!("System volume is muted, skipping audio feedback");
        return;
    }
    if let Some(path) = resolve_sound_path(app, &settings, sound_type) {
        play_sound_async(app, path);
    }
}

pub fn play_feedback_sound_blocking(app: &AppHandle, sound_type: SoundType) {
    let settings = settings::get_settings(app);
    if !settings.audio_feedback {
        return;
    }
    if is_system_muted() {
        debug!("System volume is muted, skipping audio feedback");
        return;
    }
    if let Some(path) = resolve_sound_path(app, &settings, sound_type) {
        play_sound_blocking(app, &path);
    }
}

pub fn play_test_sound(app: &AppHandle, sound_type: SoundType) {
    let settings = settings::get_settings(app);
    if let Some(path) = resolve_sound_path(app, &settings, sound_type) {
        play_sound_blocking(app, &path);
    }
}

fn play_sound_async(app: &AppHandle, path: PathBuf) {
    let Some(playback_guard) = PlaybackGuard::acquire() else {
        debug!("A feedback sound is already playing; skipping overlapping playback");
        return;
    };
    let app_handle = app.clone();
    thread::spawn(move || {
        let _playback_guard = playback_guard;
        if let Err(e) = play_sound_at_path(&app_handle, path.as_path()) {
            error!("Failed to play sound '{}': {}", path.display(), e);
        }
    });
}

fn play_sound_blocking(app: &AppHandle, path: &Path) {
    let Some(playback_guard) = PlaybackGuard::acquire() else {
        debug!("A feedback sound is already playing; skipping overlapping playback");
        return;
    };
    let app_handle = app.clone();
    let owned_path = path.to_path_buf();
    let display_path = owned_path.display().to_string();
    let (done_tx, done_rx) = mpsc::sync_channel(1);

    thread::spawn(move || {
        let _playback_guard = playback_guard;
        let result =
            play_sound_at_path(&app_handle, &owned_path).map_err(|error| error.to_string());
        let _ = done_tx.send(result);
    });

    match done_rx.recv_timeout(Duration::from_secs(5)) {
        Ok(Ok(())) => {}
        Ok(Err(error)) => error!("Failed to play sound '{}': {}", display_path, error),
        Err(mpsc::RecvTimeoutError::Timeout) => {
            warn!(
                "Feedback sound '{}' timed out after 5 seconds",
                display_path
            )
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            error!(
                "Feedback sound worker exited unexpectedly for '{}'",
                display_path
            )
        }
    }
}

fn play_sound_at_path(app: &AppHandle, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let settings = settings::get_settings(app);
    let volume = settings.audio_feedback_volume;
    let selected_device = settings.selected_output_device.clone();
    play_audio_file(path, selected_device, volume)
}

#[cfg(target_os = "macos")]
fn is_system_muted() -> bool {
    let result = std::process::Command::new("osascript")
        .arg("-e")
        .arg("set v to (get volume settings)\nreturn (output muted of v) as text & \",\" & (output volume of v) as text")
        .output();

    match result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = stdout.trim().split(',').collect();
            if parts.len() == 2 {
                let muted = parts[0].trim() == "true";
                let volume_zero = parts[1].trim().parse::<i32>().unwrap_or(100) == 0;
                return muted || volume_zero;
            }
            warn!(
                "Unexpected osascript output for volume settings: {}",
                stdout.trim()
            );
            false
        }
        Err(e) => {
            warn!("Failed to check system volume: {}", e);
            false
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn is_system_muted() -> bool {
    false
}

#[allow(deprecated)]
fn play_audio_file(
    path: &std::path::Path,
    selected_device: Option<String>,
    volume: f32,
) -> Result<(), Box<dyn std::error::Error>> {
    let stream_builder = if let Some(device_name) = selected_device {
        if device_name == "Default" {
            debug!("Using default device");
            DeviceSinkBuilder::from_default_device()?
        } else {
            let host = crate::audio_toolkit::get_cpal_host();

            if let Some(default_device) = host.default_output_device() {
                if default_device.name().ok().as_deref() == Some(device_name.as_str()) {
                    debug!(
                        "Selected device '{}' is the current default, using fast path",
                        device_name
                    );
                    return play_on_stream(
                        DeviceSinkBuilder::from_device(default_device)?,
                        path,
                        volume,
                    );
                }
            }

            let devices = host.output_devices()?;

            let mut found_device = None;
            for device in devices {
                if device.name()? == device_name {
                    found_device = Some(device);
                    break;
                }
            }

            match found_device {
                Some(device) => DeviceSinkBuilder::from_device(device)?,
                None => {
                    warn!("Device '{}' not found, using default device", device_name);
                    DeviceSinkBuilder::from_default_device()?
                }
            }
        }
    } else {
        debug!("Using default device");
        DeviceSinkBuilder::from_default_device()?
    };

    play_on_stream(stream_builder, path, volume)
}

fn play_on_stream(
    stream_builder: DeviceSinkBuilder,
    path: &std::path::Path,
    volume: f32,
) -> Result<(), Box<dyn std::error::Error>> {
    let stream_handle = stream_builder.open_stream()?;
    let mixer = stream_handle.mixer();

    let file = File::open(path)?;
    let buf_reader = BufReader::new(file);

    let sink = rodio::play(mixer, buf_reader)?;
    sink.set_volume(volume);
    sink.sleep_until_end();

    Ok(())
}
