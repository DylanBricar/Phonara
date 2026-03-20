use crate::audio_toolkit::{list_input_devices, vad::SmoothedVad, AudioRecorder, SileroVad};
use crate::helpers::clamshell;
use crate::settings::{get_settings, AppSettings};
use crate::utils;
use log::error;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Manager;

fn set_mute(mute: bool) {
    #[cfg(target_os = "windows")]
    {
        unsafe {
            use windows::Win32::{
                Media::Audio::{
                    eMultimedia, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator,
                    MMDeviceEnumerator,
                },
                System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED},
            };

            macro_rules! unwrap_or_return {
                ($expr:expr) => {
                    match $expr {
                        Ok(val) => val,
                        Err(_) => return,
                    }
                };
            }

            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

            let all_devices: IMMDeviceEnumerator =
                unwrap_or_return!(CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL));
            let default_device =
                unwrap_or_return!(all_devices.GetDefaultAudioEndpoint(eRender, eMultimedia));
            let volume_interface = unwrap_or_return!(
                default_device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None)
            );

            let _ = volume_interface.SetMute(mute, std::ptr::null());
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;

        let mute_val = if mute { "1" } else { "0" };
        let amixer_state = if mute { "mute" } else { "unmute" };

        if Command::new("wpctl")
            .args(["set-mute", "@DEFAULT_AUDIO_SINK@", mute_val])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return;
        }

        if Command::new("pactl")
            .args(["set-sink-mute", "@DEFAULT_SINK@", mute_val])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return;
        }

        let _ = Command::new("amixer")
            .args(["set", "Master", amixer_state])
            .output();
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let script = format!(
            "set volume output muted {}",
            if mute { "true" } else { "false" }
        );
        let _ = Command::new("osascript").args(["-e", &script]).output();
    }
}

#[cfg(target_os = "macos")]
#[allow(dead_code)]
fn is_system_already_muted() -> bool {
    use std::process::Command;

    let result = Command::new("osascript")
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
            false
        }
        Err(_) => false,
    }
}

#[cfg(target_os = "windows")]
fn is_system_already_muted() -> bool {
    unsafe {
        use windows::Win32::{
            Media::Audio::{
                eMultimedia, eRender, Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator,
                MMDeviceEnumerator,
            },
            System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED},
        };

        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            match CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) {
                Ok(e) => e,
                Err(_) => return false,
            };
        let device = match enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia) {
            Ok(d) => d,
            Err(_) => return false,
        };
        let volume: IAudioEndpointVolume =
            match device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) {
                Ok(v) => v,
                Err(_) => return false,
            };

        volume.GetMute().unwrap_or(false.into()).as_bool()
    }
}

#[cfg(target_os = "linux")]
fn is_system_already_muted() -> bool {
    false
}

const WHISPER_SAMPLE_RATE: usize = 16000;

#[derive(Clone, Debug)]
pub enum RecordingState {
    Idle,
    Recording { binding_id: String },
}

#[derive(Clone, Debug)]
pub enum MicrophoneMode {
    AlwaysOn,
    OnDemand,
}

fn create_audio_recorder(
    vad_path: &str,
    app_handle: &tauri::AppHandle,
    is_paused: Arc<AtomicBool>,
) -> Result<AudioRecorder, anyhow::Error> {
    let silero = SileroVad::new(vad_path, 0.3)
        .map_err(|e| anyhow::anyhow!("Failed to create SileroVad: {}", e))?;
    let smoothed_vad = SmoothedVad::new(Box::new(silero), 15, 15, 2);

    let recorder = AudioRecorder::new()
        .map_err(|e| anyhow::anyhow!("Failed to create AudioRecorder: {}", e))?
        .with_vad(Box::new(smoothed_vad))
        .with_pause_flag(is_paused.clone())
        .with_level_callback({
            let app_handle = app_handle.clone();
            let is_paused = is_paused.clone();
            move |levels| {
                if is_paused.load(Ordering::Relaxed) {
                    let zero_levels = vec![0.0f32; levels.len()];
                    utils::emit_levels(&app_handle, &zero_levels);
                } else {
                    utils::emit_levels(&app_handle, &levels);
                }
            }
        });

    Ok(recorder)
}

const LAZY_CLOSE_SECS: u64 = 30;

#[derive(Clone)]
pub struct AudioRecordingManager {
    state: Arc<Mutex<RecordingState>>,
    mode: Arc<Mutex<MicrophoneMode>>,
    app_handle: tauri::AppHandle,

    recorder: Arc<Mutex<Option<AudioRecorder>>>,
    is_open: Arc<Mutex<bool>>,
    is_recording: Arc<Mutex<bool>>,
    is_paused: Arc<AtomicBool>,
    did_mute: Arc<Mutex<bool>>,
    lazy_close_gen: Arc<AtomicU64>,
}

impl AudioRecordingManager {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, anyhow::Error> {
        let settings = get_settings(app);
        let mode = if settings.always_on_microphone {
            MicrophoneMode::AlwaysOn
        } else {
            MicrophoneMode::OnDemand
        };

        let manager = Self {
            state: Arc::new(Mutex::new(RecordingState::Idle)),
            mode: Arc::new(Mutex::new(mode.clone())),
            app_handle: app.clone(),

            recorder: Arc::new(Mutex::new(None)),
            is_open: Arc::new(Mutex::new(false)),
            is_recording: Arc::new(Mutex::new(false)),
            is_paused: Arc::new(AtomicBool::new(false)),
            did_mute: Arc::new(Mutex::new(false)),
            lazy_close_gen: Arc::new(AtomicU64::new(0)),
        };

        if matches!(mode, MicrophoneMode::AlwaysOn) {
            manager.start_microphone_stream()?;
        }

        Ok(manager)
    }

    pub fn new_without_mic(app: &tauri::AppHandle) -> Self {
        Self {
            state: Arc::new(Mutex::new(RecordingState::Idle)),
            mode: Arc::new(Mutex::new(MicrophoneMode::OnDemand)),
            app_handle: app.clone(),

            recorder: Arc::new(Mutex::new(None)),
            is_open: Arc::new(Mutex::new(false)),
            is_recording: Arc::new(Mutex::new(false)),
            is_paused: Arc::new(AtomicBool::new(false)),
            did_mute: Arc::new(Mutex::new(false)),
            lazy_close_gen: Arc::new(AtomicU64::new(0)),
        }
    }

    fn get_effective_microphone_device(&self, settings: &AppSettings) -> Option<cpal::Device> {
        let use_clamshell_mic = if let Ok(is_clamshell) = clamshell::is_clamshell() {
            is_clamshell && settings.clamshell_microphone.is_some()
        } else {
            false
        };

        let device_name = if use_clamshell_mic {
            settings.clamshell_microphone.as_ref().unwrap()
        } else {
            settings.selected_microphone.as_ref()?
        };

        match list_input_devices() {
            Ok(devices) => devices
                .into_iter()
                .find(|d| d.name == *device_name)
                .map(|d| d.device),
            Err(_) => None,
        }
    }

    pub fn apply_mute(&self) {
        let settings = get_settings(&self.app_handle);
        let mut did_mute_guard = self.did_mute.lock().unwrap();

        if settings.mute_while_recording && *self.is_open.lock().unwrap() {
            #[cfg(target_os = "macos")]
            {
                use std::process::Command;
                let result = Command::new("osascript")
                    .arg("-e")
                    .arg("set v to (get volume settings)\nif (output muted of v) is false and (output volume of v) > 0 then\nset volume output muted true\nreturn \"muted\"\nelse\nreturn \"skip\"\nend if")
                    .output();
                match result {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        if stdout.trim() == "muted" {
                            *did_mute_guard = true;
                            std::thread::spawn(move || {
                                std::thread::sleep(std::time::Duration::from_millis(100));
                                if let Ok(verify) = Command::new("osascript")
                                    .arg("-e")
                                    .arg("return (output muted of (get volume settings)) as text")
                                    .output()
                                {
                                    let mute_state = String::from_utf8_lossy(&verify.stdout);
                                    if mute_state.trim() != "true" {
                                        log::warn!("Mute verification failed: output device may not support software muting (USB audio interface limitation)");
                                    }
                                }
                            });
                        }
                    }
                    Err(_) => {}
                }
                return;
            }
            #[cfg(not(target_os = "macos"))]
            {
                if is_system_already_muted() {
                    return;
                }
                set_mute(true);
                *did_mute_guard = true;
            }
        }
    }

    pub fn remove_mute(&self) {
        let mut did_mute_guard = self.did_mute.lock().unwrap();
        if *did_mute_guard {
            set_mute(false);
            *did_mute_guard = false;
        }
    }

    pub fn start_microphone_stream(&self) -> Result<(), anyhow::Error> {
        let mut open_flag = self.is_open.lock().unwrap();
        if *open_flag {
            return Ok(());
        }

        let mut did_mute_guard = self.did_mute.lock().unwrap();
        *did_mute_guard = false;

        let vad_path = self
            .app_handle
            .path()
            .resolve(
                "resources/models/silero_vad_v4.onnx",
                tauri::path::BaseDirectory::Resource,
            )
            .map_err(|e| anyhow::anyhow!("Failed to resolve VAD path: {}", e))?;
        let mut recorder_opt = self.recorder.lock().unwrap();

        if recorder_opt.is_none() {
            *recorder_opt = Some(create_audio_recorder(
                vad_path.to_str().unwrap(),
                &self.app_handle,
                Arc::clone(&self.is_paused),
            )?);
        }

        let settings = get_settings(&self.app_handle);
        let selected_device = self.get_effective_microphone_device(&settings);

        if let Some(rec) = recorder_opt.as_mut() {
            rec.open(selected_device)
                .map_err(|e| anyhow::anyhow!("Failed to open recorder: {}", e))?;
        }

        *open_flag = true;
        Ok(())
    }

    pub fn stop_microphone_stream(&self) {
        let mut open_flag = self.is_open.lock().unwrap();
        if !*open_flag {
            return;
        }

        let mut did_mute_guard = self.did_mute.lock().unwrap();
        if *did_mute_guard {
            set_mute(false);
        }
        *did_mute_guard = false;

        if let Some(rec) = self.recorder.lock().unwrap().as_mut() {
            if *self.is_recording.lock().unwrap() {
                let _ = rec.stop();
                *self.is_recording.lock().unwrap() = false;
            }
            let _ = rec.close();
        }

        *open_flag = false;
    }

    fn schedule_lazy_close(&self) {
        let gen = self.lazy_close_gen.fetch_add(1, Ordering::SeqCst) + 1;
        let gen_arc = Arc::clone(&self.lazy_close_gen);
        let is_open = Arc::clone(&self.is_open);
        let is_recording = Arc::clone(&self.is_recording);
        let recorder = Arc::clone(&self.recorder);
        let did_mute = Arc::clone(&self.did_mute);

        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_secs(LAZY_CLOSE_SECS)).await;

            if gen_arc.load(Ordering::SeqCst) != gen {
                return;
            }

            tokio::task::spawn_blocking(move || {
                if *is_recording.lock().unwrap() {
                    return;
                }

                let mut open_flag = is_open.lock().unwrap();
                if !*open_flag {
                    return;
                }

                let mut did_mute_guard = did_mute.lock().unwrap();
                if *did_mute_guard {
                    set_mute(false);
                }
                *did_mute_guard = false;

                if let Some(rec) = recorder.lock().unwrap().as_mut() {
                    let _ = rec.close();
                }
                *open_flag = false;
            }).await.ok();
        });
    }

    pub fn update_mode(&self, new_mode: MicrophoneMode) -> Result<(), anyhow::Error> {
        let mode_guard = self.mode.lock().unwrap();
        let cur_mode = mode_guard.clone();

        match (cur_mode, &new_mode) {
            (MicrophoneMode::AlwaysOn, MicrophoneMode::OnDemand) => {
                if matches!(*self.state.lock().unwrap(), RecordingState::Idle) {
                    drop(mode_guard);
                    self.stop_microphone_stream();
                }
            }
            (MicrophoneMode::OnDemand, MicrophoneMode::AlwaysOn) => {
                drop(mode_guard);
                self.lazy_close_gen.fetch_add(1, Ordering::SeqCst);
                self.start_microphone_stream()?;
            }
            _ => {}
        }

        *self.mode.lock().unwrap() = new_mode;
        Ok(())
    }

    pub fn toggle_pause(&self) -> bool {
        let prev = self.is_paused.fetch_xor(true, Ordering::Relaxed);
        !prev
    }

    pub fn try_start_recording(&self, binding_id: &str) -> Result<(), String> {
        self.is_paused.store(false, Ordering::Relaxed);
        let mut state = self.state.lock().unwrap();

        if let RecordingState::Idle = *state {
            if matches!(*self.mode.lock().unwrap(), MicrophoneMode::OnDemand) {
                self.lazy_close_gen.fetch_add(1, Ordering::SeqCst);
                if let Err(e) = self.start_microphone_stream() {
                    let msg = format!("{e}");
                    error!("Failed to open microphone stream: {msg}");
                    return Err(msg);
                }
            }

            if let Some(rec) = self.recorder.lock().unwrap().as_ref() {
                if rec.start().is_ok() {
                    *self.is_recording.lock().unwrap() = true;
                    *state = RecordingState::Recording {
                        binding_id: binding_id.to_string(),
                    };
                    return Ok(());
                }
            }
            Err("Recorder not available".to_string())
        } else {
            Err("Already recording".to_string())
        }
    }

    pub fn update_selected_device(&self) -> Result<(), anyhow::Error> {
        if *self.is_open.lock().unwrap() {
            self.stop_microphone_stream();
            self.start_microphone_stream()?;
        }
        Ok(())
    }

    pub fn stop_recording(&self, binding_id: &str) -> Option<Vec<f32>> {
        self.is_paused.store(false, Ordering::Relaxed);
        let mut state = self.state.lock().unwrap();

        match *state {
            RecordingState::Recording {
                binding_id: ref active,
            } if active == binding_id => {
                *state = RecordingState::Idle;
                drop(state);

                let settings = get_settings(&self.app_handle);
                if settings.extra_recording_buffer_ms > 0 {
                    std::thread::sleep(Duration::from_millis(settings.extra_recording_buffer_ms));
                }

                let samples = if let Some(rec) = self.recorder.lock().unwrap().as_ref() {
                    match rec.stop() {
                        Ok(buf) => buf,
                        Err(e) => {
                            error!("stop() failed: {e}");
                            Vec::new()
                        }
                    }
                } else {
                    error!("Recorder not available");
                    Vec::new()
                };

                *self.is_recording.lock().unwrap() = false;

                if matches!(*self.mode.lock().unwrap(), MicrophoneMode::OnDemand) {
                    self.schedule_lazy_close();
                }

                let s_len = samples.len();
                if s_len < WHISPER_SAMPLE_RATE && s_len > 0 {
                    let mut padded = samples;
                    padded.resize(WHISPER_SAMPLE_RATE * 5 / 4, 0.0);
                    Some(padded)
                } else {
                    Some(samples)
                }
            }
            _ => None,
        }
    }
    pub fn is_recording(&self) -> bool {
        matches!(
            *self.state.lock().unwrap(),
            RecordingState::Recording { .. }
        )
    }

    pub fn cancel_recording(&self) {
        self.is_paused.store(false, Ordering::Relaxed);
        let mut state = self.state.lock().unwrap();

        if let RecordingState::Recording { .. } = *state {
            *state = RecordingState::Idle;
            drop(state);

            if let Some(rec) = self.recorder.lock().unwrap().as_ref() {
                let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    let _ = rec.stop();
                }));
                if let Err(e) = result {
                    error!("Panic in rec.stop() during cancel_recording: {:?}", e);
                }
            }

            *self.is_recording.lock().unwrap() = false;

            if matches!(*self.mode.lock().unwrap(), MicrophoneMode::OnDemand) {
                self.schedule_lazy_close();
            }
        }
    }
}
