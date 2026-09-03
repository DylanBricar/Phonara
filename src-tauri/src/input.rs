#[cfg(not(target_os = "windows"))]
use enigo::Key;
use enigo::{Enigo, Keyboard, Settings};
use std::sync::Mutex;
use tauri::AppHandle;

#[cfg(target_os = "macos")]
mod macos {
    use super::Key;
    use log::{debug, warn};
    use std::ffi::c_void;

    type TisInputSourceRef = *const c_void;
    type CfDataRef = *const c_void;
    type CfStringRef = *const c_void;

    // kVK_ANSI_V. This is the behavior Handy used before layout-aware
    // resolution and remains the safest fallback if macOS cannot expose the
    // active layout.
    const ANSI_V_KEYCODE: u16 = 9;
    const KEYCODE_COUNT: u16 = 128;
    const UC_KEY_ACTION_DISPLAY: u16 = 3;
    const UC_KEY_TRANSLATE_NO_DEAD_KEYS_MASK: u32 = 1;
    // Carbon's cmdKey is bit 8. UCKeyTranslate expects Carbon modifiers shifted
    // right by 8, so Command is represented by bit 0 here.
    const COMMAND_MODIFIER_STATE: u32 = 1;

    #[link(name = "Carbon", kind = "framework")]
    unsafe extern "C" {
        fn TISCopyCurrentKeyboardLayoutInputSource() -> TisInputSourceRef;
        fn TISGetInputSourceProperty(
            input_source: TisInputSourceRef,
            property_key: CfStringRef,
        ) -> CfDataRef;
        static kTISPropertyUnicodeKeyLayoutData: CfStringRef;
        fn UCKeyTranslate(
            key_layout: *const u8,
            virtual_key_code: u16,
            key_action: u16,
            modifier_key_state: u32,
            keyboard_type: u32,
            key_translate_options: u32,
            dead_key_state: *mut u32,
            max_string_length: usize,
            actual_string_length: *mut usize,
            unicode_string: *mut u16,
        ) -> i32;
        fn LMGetKbdType() -> u8;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    unsafe extern "C" {
        fn CFDataGetBytePtr(data: CfDataRef) -> *const u8;
        fn CFRelease(value: *const c_void);
    }

    struct InputSource(TisInputSourceRef);

    impl Drop for InputSource {
        fn drop(&mut self) {
            if !self.0.is_null() {
                // SAFETY: TISCopyCurrentKeyboardLayoutInputSource returned this
                // retained reference, so this balances that ownership.
                unsafe { CFRelease(self.0) };
            }
        }
    }

    fn find_keycode(mut matches: impl FnMut(u16) -> bool) -> Option<u16> {
        (0..KEYCODE_COUNT).find(|&keycode| matches(keycode))
    }

    /// Resolves the physical key that macOS interprets as `v` while Command is
    /// held. Including Command is important: non-Latin layouts commonly map
    /// Cmd shortcuts to their ANSI equivalents, while standard Dvorak does not.
    ///
    /// TIS APIs must run on the main thread. Handy's paste path already enters
    /// through `AppHandle::run_on_main_thread` before reaching this function.
    fn resolve_command_v_keycode() -> Result<u16, String> {
        // SAFETY: This function is called on the macOS main thread. The returned
        // source follows the Create Rule and is released by InputSource::drop.
        let source = InputSource(unsafe { TISCopyCurrentKeyboardLayoutInputSource() });
        if source.0.is_null() {
            return Err("macOS returned no current keyboard layout input source".into());
        }

        // SAFETY: The source remains retained for the duration of the scan and
        // the property constant is provided by Carbon.
        let layout_data =
            unsafe { TISGetInputSourceProperty(source.0, kTISPropertyUnicodeKeyLayoutData) };
        if layout_data.is_null() {
            return Err("current macOS keyboard layout has no Unicode layout data".into());
        }

        // SAFETY: layout_data is a CFData owned by the retained input source and
        // remains valid until source is dropped after the scan.
        let layout = unsafe { CFDataGetBytePtr(layout_data) };
        if layout.is_null() {
            return Err("current macOS keyboard layout data is empty".into());
        }

        // SAFETY: LMGetKbdType has no arguments and returns the current physical
        // keyboard type used by UCKeyTranslate.
        let keyboard_type = unsafe { LMGetKbdType() } as u32;
        let keycode = find_keycode(|keycode| {
            let mut dead_key_state = 0;
            let mut chars = [0_u16; 4];
            let mut length = 0_usize;

            // SAFETY: layout points to valid UCKeyboardLayout bytes while source
            // is retained. All output pointers reference initialized local
            // storage of the declared sizes.
            let status = unsafe {
                UCKeyTranslate(
                    layout,
                    keycode,
                    UC_KEY_ACTION_DISPLAY,
                    COMMAND_MODIFIER_STATE,
                    keyboard_type,
                    UC_KEY_TRANSLATE_NO_DEAD_KEYS_MASK,
                    &mut dead_key_state,
                    chars.len(),
                    &mut length,
                    chars.as_mut_ptr(),
                )
            };

            status == 0 && length == 1 && chars[0] == u16::from(b'v')
        })
        .ok_or_else(|| "could not map Cmd+V in the current macOS keyboard layout".to_string())?;

        Ok(keycode)
    }

    pub(super) fn command_v_key() -> Key {
        match resolve_command_v_keycode() {
            Ok(keycode) => {
                debug!("Resolved Cmd+V for the active macOS layout to keycode {keycode}");
                Key::Other(u32::from(keycode))
            }
            Err(error) => {
                warn!(
                    "Could not resolve Cmd+V for the active macOS layout ({error}); using ANSI V keycode {ANSI_V_KEYCODE}"
                );
                Key::Other(u32::from(ANSI_V_KEYCODE))
            }
        }
    }
}

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

/// Sends a Ctrl+V or Cmd+V paste command using platform-specific virtual key codes.
/// This ensures the paste works regardless of keyboard layout (e.g., Russian, AZERTY, DVORAK).
/// Note: On Wayland, this may not work - callers should check for Wayland and use alternative methods.
///
/// `hold_ms` is how long the modifier stays held after the V click before being
/// released. Most applications read the modifier from the V event's flags and
/// need no hold at all, but applications that poll global keyboard state when
/// handling the key need the modifier to still be down — the hold insures
/// against those. Callers that can detect a failed chord (e.g. the
/// receipt-sequenced paste path) may use a much shorter hold.
pub fn send_paste_ctrl_v(enigo: &mut Enigo, hold_ms: u64) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = enigo;
        let result = win_sendinput::ctrl_v();
        std::thread::sleep(std::time::Duration::from_millis(hold_ms));
        result
    }

    #[cfg(not(target_os = "windows"))]
    {
        #[cfg(target_os = "macos")]
        let (modifier_key, v_key_code) = (Key::Meta, macos::command_v_key());
        #[cfg(target_os = "linux")]
        let (modifier_key, v_key_code) = (Key::Control, Key::Unicode('v'));

        enigo
            .key(modifier_key, enigo::Direction::Press)
            .map_err(|e| format!("Failed to press modifier key: {}", e))?;
        enigo
            .key(v_key_code, enigo::Direction::Click)
            .map_err(|e| format!("Failed to click V key: {}", e))?;
        std::thread::sleep(std::time::Duration::from_millis(hold_ms));

        enigo
            .key(modifier_key, enigo::Direction::Release)
            .map_err(|e| format!("Failed to release modifier key: {}", e))?;

        Ok(())
    }
}

/// Sends a Ctrl+Shift+V paste command.
/// This is commonly used in terminal applications on Linux to paste without formatting.
/// Note: On Wayland, this may not work - callers should check for Wayland and use alternative methods.
pub fn send_paste_ctrl_shift_v(enigo: &mut Enigo, hold_ms: u64) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = enigo;
        let result = win_sendinput::ctrl_shift_v();
        std::thread::sleep(std::time::Duration::from_millis(hold_ms));
        result
    }

    #[cfg(not(target_os = "windows"))]
    {
        #[cfg(target_os = "macos")]
        let (modifier_key, v_key_code) = (Key::Meta, macos::command_v_key());
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
        std::thread::sleep(std::time::Duration::from_millis(hold_ms));

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
pub fn send_paste_shift_insert(enigo: &mut Enigo, hold_ms: u64) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = enigo;
        let result = win_sendinput::shift_insert();
        std::thread::sleep(std::time::Duration::from_millis(hold_ms));
        result
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

        std::thread::sleep(std::time::Duration::from_millis(hold_ms));

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

        result
    }

    #[cfg(not(target_os = "windows"))]
    {
        enigo
            .text(text)
            .map_err(|e| format!("Failed to send text directly: {}", e))?;

        Ok(())
    }
}
