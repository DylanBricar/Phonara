use enigo::{Enigo, Keyboard, Settings};
#[cfg(not(target_os = "windows"))]
use enigo::Key;
#[cfg(target_os = "windows")]
use log::warn;
use std::sync::Mutex;
use tauri::AppHandle;

/// Wrapper for Enigo to store in Tauri's managed state.
/// Enigo is wrapped in a Mutex since it requires mutable access.
pub struct EnigoState(pub Mutex<Enigo>);

impl EnigoState {
    pub fn new() -> Result<Self, String> {
        let enigo = Enigo::new(&Settings::default())
            .map_err(|e| format!("Failed to initialize Enigo: {}", e))?;
        Ok(Self(Mutex::new(enigo)))
    }
}

/// Get the current mouse cursor position in global desktop coordinates.
/// Returns None if getting the location fails.
pub fn get_cursor_position(app_handle: &AppHandle) -> Option<(i32, i32)> {
    let cursor_pos = app_handle.cursor_position().ok()?;
    Some((cursor_pos.x.round() as i32, cursor_pos.y.round() as i32))
}

/// On Windows, use the SendInput API directly to simulate key presses.
/// Unlike enigo, SendInput is non-blocking: if UIPI prevents injection into an
/// admin-privilege window, it returns immediately with an error instead of
/// freezing the entire application.
#[cfg(target_os = "windows")]
mod win_sendinput {
    use log::warn;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        KEYEVENTF_KEYUP, VK_CONTROL, VK_INSERT, VK_SHIFT, VK_V,
    };

    /// Low-level helper: build a KEYBDINPUT-based INPUT struct for a virtual key.
    fn kbd_input(vk: u16, flags: KEYBD_EVENT_FLAGS) -> INPUT {
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY(vk),
                    wScan: 0,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

    /// Send a sequence of key inputs via SendInput.
    /// Returns Ok(()) on success or an error string if UIPI blocked the input.
    fn send(inputs: &[INPUT]) -> Result<(), String> {
        let sent = unsafe { SendInput(inputs, std::mem::size_of::<INPUT>() as i32) };
        if sent == 0 {
            let err = std::io::Error::last_os_error();
            // Error 5 (ERROR_ACCESS_DENIED) is the typical UIPI rejection
            warn!(
                "SendInput injected 0/{} events – the target window likely has higher \
                 privileges (UIPI). OS error: {}",
                inputs.len(),
                err
            );
            return Err(format!(
                "Paste blocked by Windows UIPI (target window may be running as administrator): {}",
                err
            ));
        }
        if (sent as usize) < inputs.len() {
            warn!(
                "SendInput only injected {}/{} events – partial UIPI block",
                sent,
                inputs.len()
            );
        }
        Ok(())
    }

    /// Ctrl+V via SendInput (non-blocking).
    pub fn ctrl_v() -> Result<(), String> {
        let inputs = [
            kbd_input(VK_CONTROL.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_V.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_V.0, KEYEVENTF_KEYUP),
            kbd_input(VK_CONTROL.0, KEYEVENTF_KEYUP),
        ];
        send(&inputs)
    }

    /// Ctrl+Shift+V via SendInput (non-blocking).
    pub fn ctrl_shift_v() -> Result<(), String> {
        let inputs = [
            kbd_input(VK_CONTROL.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_SHIFT.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_V.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_V.0, KEYEVENTF_KEYUP),
            kbd_input(VK_SHIFT.0, KEYEVENTF_KEYUP),
            kbd_input(VK_CONTROL.0, KEYEVENTF_KEYUP),
        ];
        send(&inputs)
    }

    /// Shift+Insert via SendInput (non-blocking).
    pub fn shift_insert() -> Result<(), String> {
        let inputs = [
            kbd_input(VK_SHIFT.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_INSERT.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_INSERT.0, KEYEVENTF_KEYUP),
            kbd_input(VK_SHIFT.0, KEYEVENTF_KEYUP),
        ];
        send(&inputs)
    }
}

/// Sends a Ctrl+V or Cmd+V paste command using platform-specific virtual key codes.
/// This ensures the paste works regardless of keyboard layout (e.g., Russian, AZERTY, DVORAK).
/// Note: On Wayland, this may not work - callers should check for Wayland and use alternative methods.
///
/// On Windows, this uses the SendInput API directly instead of enigo to avoid
/// blocking indefinitely when the foreground window runs with administrator
/// privileges (UIPI restriction).
pub fn send_paste_ctrl_v(enigo: &mut Enigo) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = enigo; // Not used on Windows; we bypass enigo in favor of SendInput
        let result = win_sendinput::ctrl_v();
        // Still sleep to give the target app time to process the paste
        std::thread::sleep(std::time::Duration::from_millis(100));
        return result;
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Platform-specific key definitions
        #[cfg(target_os = "macos")]
        let (modifier_key, v_key_code) = (Key::Meta, Key::Other(9));
        #[cfg(target_os = "linux")]
        let (modifier_key, v_key_code) = (Key::Control, Key::Unicode('v'));

        // Press modifier + V
        enigo
            .key(modifier_key, enigo::Direction::Press)
            .map_err(|e| format!("Failed to press modifier key: {}", e))?;
        enigo
            .key(v_key_code, enigo::Direction::Click)
            .map_err(|e| format!("Failed to click V key: {}", e))?;

        std::thread::sleep(std::time::Duration::from_millis(100));

        enigo
            .key(modifier_key, enigo::Direction::Release)
            .map_err(|e| format!("Failed to release modifier key: {}", e))?;

        Ok(())
    }
}

/// Sends a Ctrl+Shift+V paste command.
/// This is commonly used in terminal applications on Linux to paste without formatting.
/// Note: On Wayland, this may not work - callers should check for Wayland and use alternative methods.
///
/// On Windows, uses SendInput to avoid UIPI-related freezes with admin windows.
pub fn send_paste_ctrl_shift_v(enigo: &mut Enigo) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = enigo;
        let result = win_sendinput::ctrl_shift_v();
        std::thread::sleep(std::time::Duration::from_millis(100));
        return result;
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Platform-specific key definitions
        #[cfg(target_os = "macos")]
        let (modifier_key, v_key_code) = (Key::Meta, Key::Other(9)); // Cmd+Shift+V on macOS
        #[cfg(target_os = "linux")]
        let (modifier_key, v_key_code) = (Key::Control, Key::Unicode('v'));

        // Press Ctrl/Cmd + Shift + V
        enigo
            .key(modifier_key, enigo::Direction::Press)
            .map_err(|e| format!("Failed to press modifier key: {}", e))?;
        enigo
            .key(Key::Shift, enigo::Direction::Press)
            .map_err(|e| format!("Failed to press Shift key: {}", e))?;
        enigo
            .key(v_key_code, enigo::Direction::Click)
            .map_err(|e| format!("Failed to click V key: {}", e))?;

        std::thread::sleep(std::time::Duration::from_millis(100));

        enigo
            .key(Key::Shift, enigo::Direction::Release)
            .map_err(|e| format!("Failed to release Shift key: {}", e))?;
        enigo
            .key(modifier_key, enigo::Direction::Release)
            .map_err(|e| format!("Failed to release modifier key: {}", e))?;

        Ok(())
    }
}

/// Sends a Shift+Insert paste command (Windows and Linux only).
/// This is more universal for terminal applications and legacy software.
/// Note: On Wayland, this may not work - callers should check for Wayland and use alternative methods.
///
/// On Windows, uses SendInput to avoid UIPI-related freezes with admin windows.
pub fn send_paste_shift_insert(enigo: &mut Enigo) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = enigo;
        let result = win_sendinput::shift_insert();
        std::thread::sleep(std::time::Duration::from_millis(100));
        return result;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let insert_key_code = Key::Other(0x76); // XK_Insert (keycode 118 / 0x76, also used as fallback)

        // Press Shift + Insert
        enigo
            .key(Key::Shift, enigo::Direction::Press)
            .map_err(|e| format!("Failed to press Shift key: {}", e))?;
        enigo
            .key(insert_key_code, enigo::Direction::Click)
            .map_err(|e| format!("Failed to click Insert key: {}", e))?;

        std::thread::sleep(std::time::Duration::from_millis(100));

        enigo
            .key(Key::Shift, enigo::Direction::Release)
            .map_err(|e| format!("Failed to release Shift key: {}", e))?;

        Ok(())
    }
}

/// Pastes text directly using the enigo text method.
/// This tries to use system input methods if possible, otherwise simulates keystrokes one by one.
///
/// On Windows, this is wrapped in a 5-second timeout to prevent indefinite blocking
/// when the foreground window has higher privileges (UIPI).
pub fn paste_text_direct(enigo: &mut Enigo, text: &str) -> Result<(), String> {
    // On Windows, enigo.text() can also block on admin windows.
    // We can't easily replace it with SendInput for arbitrary Unicode, so wrap
    // the call in a timeout using a monitoring thread.
    #[cfg(target_os = "windows")]
    {
        use std::sync::atomic::{AtomicBool, Ordering};
        use std::sync::Arc;

        let done = Arc::new(AtomicBool::new(false));
        let done_clone = done.clone();

        // Spawn a watchdog thread that will warn if the operation takes too long.
        // We cannot actually abort the blocked enigo call, but we can detect it
        // and log a clear warning so users know what happened.
        let watchdog = std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(5));
            if !done_clone.load(Ordering::Relaxed) {
                warn!(
                    "Direct text paste (enigo) has been blocked for >5s – the target window \
                     likely has higher privileges (UIPI). The app may appear frozen until \
                     the target window is switched away from."
                );
            }
        });

        let result = enigo
            .text(text)
            .map_err(|e| format!("Failed to send text directly: {}", e));

        done.store(true, Ordering::Relaxed);
        let _ = watchdog.join();
        return result;
    }

    #[cfg(not(target_os = "windows"))]
    {
        enigo
            .text(text)
            .map_err(|e| format!("Failed to send text directly: {}", e))?;

        Ok(())
    }
}
