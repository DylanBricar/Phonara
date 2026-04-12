#[cfg(not(target_os = "windows"))]
use enigo::Key;
use enigo::{Enigo, Keyboard, Settings};
use std::sync::Mutex;
use tauri::AppHandle;

pub struct EnigoState(pub Mutex<Enigo>);

impl EnigoState {
    pub fn new() -> Result<Self, String> {
        let enigo = Enigo::new(&Settings::default())
            .map_err(|e| format!("Failed to initialize Enigo: {}", e))?;
        Ok(Self(Mutex::new(enigo)))
    }
}

pub fn get_cursor_position(app_handle: &AppHandle) -> Option<(i32, i32)> {
    let cursor_pos = app_handle.cursor_position().ok()?;
    Some((cursor_pos.x.round() as i32, cursor_pos.y.round() as i32))
}

#[cfg(target_os = "windows")]
mod win_sendinput {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
        VK_CONTROL, VK_INSERT, VK_SHIFT, VK_V,
    };

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

    fn send(inputs: &[INPUT]) -> Result<(), String> {
        let sent = unsafe { SendInput(inputs, std::mem::size_of::<INPUT>() as i32) };
        if sent == 0 {
            let err = std::io::Error::last_os_error();
            return Err(format!(
                "Paste blocked by Windows UIPI (target window may be running as administrator): {}",
                err
            ));
        }
        Ok(())
    }

    pub fn ctrl_v() -> Result<(), String> {
        let inputs = [
            kbd_input(VK_CONTROL.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_V.0, KEYBD_EVENT_FLAGS(0)),
            kbd_input(VK_V.0, KEYEVENTF_KEYUP),
            kbd_input(VK_CONTROL.0, KEYEVENTF_KEYUP),
        ];
        send(&inputs)
    }

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

pub fn send_paste_ctrl_v(enigo: &mut Enigo) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = enigo;
        let result = win_sendinput::ctrl_v();
        std::thread::sleep(std::time::Duration::from_millis(100));
        return result;
    }

    #[cfg(not(target_os = "windows"))]
    {
        #[cfg(target_os = "macos")]
        let (modifier_key, v_key_code) = (Key::Meta, Key::Other(9));
        #[cfg(target_os = "linux")]
        let (modifier_key, v_key_code) = (Key::Control, Key::Unicode('v'));

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
        #[cfg(target_os = "macos")]
        let (modifier_key, v_key_code) = (Key::Meta, Key::Other(9));
        #[cfg(target_os = "linux")]
        let (modifier_key, v_key_code) = (Key::Control, Key::Unicode('v'));

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
        let insert_key_code = Key::Other(0x76);

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

pub fn paste_text_direct(enigo: &mut Enigo, text: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let result = enigo
            .text(text)
            .map_err(|e| format!("Failed to send text directly: {}", e));

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
