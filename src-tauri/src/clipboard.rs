use crate::input::{self, EnigoState};
use crate::cli::CliArgs;
#[cfg(target_os = "linux")]
use crate::settings::TypingTool;
use crate::settings::{get_settings, AutoSubmitKey, ClipboardHandling, PasteMethod};
use enigo::{Direction, Enigo, Key, Keyboard};
use std::process::Command;
#[cfg(target_os = "linux")]
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

#[cfg(target_os = "linux")]
use crate::utils::{is_kde_wayland, is_wayland};

enum SavedClipboardContent {
    Text(String),
    Image(arboard::ImageData<'static>),
    Empty,
}

fn save_clipboard_content() -> SavedClipboardContent {
    let mut clipboard = match arboard::Clipboard::new() {
        Ok(c) => c,
        Err(_) => {
            return SavedClipboardContent::Empty;
        }
    };

    if let Ok(text) = clipboard.get_text() {
        if !text.is_empty() {
            return SavedClipboardContent::Text(text);
        }
    }

    if let Ok(img) = clipboard.get_image() {
        return SavedClipboardContent::Image(img.to_owned_img());
    }

    SavedClipboardContent::Empty
}

fn restore_clipboard_content(saved: SavedClipboardContent) {
    match saved {
        SavedClipboardContent::Text(text) => {
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                let _ = clipboard.set_text(&text);
            }
        }
        SavedClipboardContent::Image(img) => {
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                let _ = clipboard.set_image(img);
            }
        }
        SavedClipboardContent::Empty => {
            if let Ok(mut clipboard) = arboard::Clipboard::new() {
                let _ = clipboard.clear();
            }
        }
    }
}

fn write_and_verify_clipboard(
    app_handle: &AppHandle,
    text: &str,
    #[cfg(target_os = "linux")] use_wl_copy: bool,
    max_retries: u32,
) -> Result<(), String> {
    let clipboard = app_handle.clipboard();

    for attempt in 0..=max_retries {
        #[cfg(target_os = "linux")]
        let write_result = if use_wl_copy {
            write_clipboard_via_wl_copy(text)
        } else {
            clipboard
                .write_text(text)
                .map_err(|e| format!("Failed to write to clipboard: {}", e))
        };

        #[cfg(not(target_os = "linux"))]
        let write_result = clipboard
            .write_text(text)
            .map_err(|e| format!("Failed to write to clipboard: {}", e));

        if let Err(e) = write_result {
            if attempt < max_retries {
                std::thread::sleep(Duration::from_millis(30));
                continue;
            }
            return Err(e);
        }

        std::thread::sleep(Duration::from_millis(10));

        let readback = clipboard.read_text().unwrap_or_default();
        if readback == text {
            return Ok(());
        }

        if attempt < max_retries {
            std::thread::sleep(Duration::from_millis(30));
        }
    }

    Ok(())
}

fn paste_via_clipboard(
    enigo: &mut Enigo,
    text: &str,
    app_handle: &AppHandle,
    paste_method: &PasteMethod,
    paste_delay_ms: u64,
) -> Result<(), String> {
    let saved_content = save_clipboard_content();

    let _ = enigo.key(Key::Shift, Direction::Release);
    let _ = enigo.key(Key::Alt, Direction::Release);
    let _ = enigo.key(Key::Control, Direction::Release);
    let _ = enigo.key(Key::Meta, Direction::Release);

    #[cfg(target_os = "linux")]
    let use_wl_copy = is_wayland() && is_wl_copy_available();

    write_and_verify_clipboard(
        app_handle,
        text,
        #[cfg(target_os = "linux")]
        use_wl_copy,
        2,
    )?;

    let mut elapsed = 0u64;
    let max_wait = paste_delay_ms.max(50);
    let clipboard = app_handle.clipboard();

    while elapsed < max_wait {
        std::thread::sleep(Duration::from_millis(5));
        elapsed += 5;

        if let Ok(current_content) = clipboard.read_text() {
            if current_content == text {
                break;
            }
        }
    }

    std::thread::sleep(Duration::from_millis(paste_delay_ms));

    #[cfg(target_os = "linux")]
    let key_combo_sent = try_send_key_combo_linux(paste_method)?;

    #[cfg(not(target_os = "linux"))]
    let key_combo_sent = false;

    if !key_combo_sent {
        match paste_method {
            PasteMethod::CtrlV => input::send_paste_ctrl_v(enigo)?,
            PasteMethod::CtrlShiftV => input::send_paste_ctrl_shift_v(enigo)?,
            PasteMethod::ShiftInsert => input::send_paste_shift_insert(enigo)?,
            _ => return Err("Invalid paste method for clipboard paste".into()),
        }
    }

    #[cfg(target_os = "macos")]
    std::thread::sleep(std::time::Duration::from_millis(200));
    #[cfg(not(target_os = "macos"))]
    std::thread::sleep(std::time::Duration::from_millis(100));

    #[cfg(target_os = "linux")]
    {
        let use_wl_for_restore = use_wl_copy
            && matches!(&saved_content, SavedClipboardContent::Text(_));
        if use_wl_for_restore {
            if let SavedClipboardContent::Text(ref text_content) = saved_content {
                let _ = write_clipboard_via_wl_copy(text_content);
            }
        } else {
            restore_clipboard_content(saved_content);
        }
    }

    #[cfg(not(target_os = "linux"))]
    restore_clipboard_content(saved_content);

    Ok(())
}

#[cfg(target_os = "linux")]
fn try_send_key_combo_linux(paste_method: &PasteMethod) -> Result<bool, String> {
    if is_wayland() {
        if !is_kde_wayland() && is_wtype_available() {
            match send_key_combo_via_wtype(paste_method) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("wtype failed, trying fallback: {}", e),
            }
        }
        if is_dotool_available() {
            match send_key_combo_via_dotool(paste_method) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("dotool failed, trying fallback: {}", e),
            }
        }
        if is_ydotool_available() {
            match send_key_combo_via_ydotool(paste_method) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("ydotool failed, trying fallback: {}", e),
            }
        }
    } else {
        if is_xdotool_available() {
            match send_key_combo_via_xdotool(paste_method) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("xdotool failed, trying fallback: {}", e),
            }
        }
        if is_ydotool_available() {
            match send_key_combo_via_ydotool(paste_method) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("ydotool failed, trying fallback: {}", e),
            }
        }
    }

    Ok(false)
}

#[cfg(target_os = "linux")]
fn try_direct_typing_linux(text: &str, preferred_tool: TypingTool) -> Result<bool, String> {
    if preferred_tool != TypingTool::Auto {
        return match preferred_tool {
            TypingTool::Wtype if is_wtype_available() => {
                match type_text_via_wtype(text) {
                    Ok(()) => Ok(true),
                    Err(e) => Err(format!("Wtype failed: {}", e)),
                }
            }
            TypingTool::Kwtype if is_kwtype_available() => {
                match type_text_via_kwtype(text) {
                    Ok(()) => Ok(true),
                    Err(e) => Err(format!("Kwtype failed: {}", e)),
                }
            }
            TypingTool::Dotool if is_dotool_available() => {
                match type_text_via_dotool(text) {
                    Ok(()) => Ok(true),
                    Err(e) => Err(format!("Dotool failed: {}", e)),
                }
            }
            TypingTool::Ydotool if is_ydotool_available() => {
                match type_text_via_ydotool(text) {
                    Ok(()) => Ok(true),
                    Err(e) => Err(format!("Ydotool failed: {}", e)),
                }
            }
            TypingTool::Xdotool if is_xdotool_available() => {
                match type_text_via_xdotool(text) {
                    Ok(()) => Ok(true),
                    Err(e) => Err(format!("Xdotool failed: {}", e)),
                }
            }
            _ => Err(format!(
                "Typing tool {:?} is not available on this system",
                preferred_tool
            )),
        };
    }

    if is_wayland() {
        if is_kde_wayland() && is_kwtype_available() {
            match type_text_via_kwtype(text) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("kwtype failed, trying fallback: {}", e),
            }
        }
        if !is_kde_wayland() && is_wtype_available() {
            match type_text_via_wtype(text) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("wtype failed, trying fallback: {}", e),
            }
        }
        if is_dotool_available() {
            match type_text_via_dotool(text) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("dotool failed, trying fallback: {}", e),
            }
        }
        if is_ydotool_available() {
            match type_text_via_ydotool(text) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("ydotool failed, trying fallback: {}", e),
            }
        }
    } else {
        if is_xdotool_available() {
            match type_text_via_xdotool(text) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("xdotool failed, trying fallback: {}", e),
            }
        }
        if is_ydotool_available() {
            match type_text_via_ydotool(text) {
                Ok(()) => return Ok(true),
                Err(e) => log::warn!("ydotool failed, trying fallback: {}", e),
            }
        }
    }

    Ok(false)
}

#[cfg(target_os = "linux")]
pub fn get_available_typing_tools() -> Vec<String> {
    let mut tools = vec!["auto".to_string()];
    if is_wtype_available() {
        tools.push("wtype".to_string());
    }
    if is_kwtype_available() {
        tools.push("kwtype".to_string());
    }
    if is_dotool_available() {
        tools.push("dotool".to_string());
    }
    if is_ydotool_available() {
        tools.push("ydotool".to_string());
    }
    if is_xdotool_available() {
        tools.push("xdotool".to_string());
    }
    tools
}

#[cfg(target_os = "linux")]
fn check_tool_available(tool_name: &str) -> bool {
    Command::new("which")
        .arg(tool_name)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "linux")]
fn is_wtype_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| check_tool_available("wtype"))
}

#[cfg(target_os = "linux")]
fn is_dotool_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| check_tool_available("dotool"))
}

#[cfg(target_os = "linux")]
fn is_ydotool_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| check_tool_available("ydotool"))
}

#[cfg(target_os = "linux")]
fn is_xdotool_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| check_tool_available("xdotool"))
}

#[cfg(target_os = "linux")]
fn is_kwtype_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| check_tool_available("kwtype"))
}

#[cfg(target_os = "linux")]
fn is_wl_copy_available() -> bool {
    static AVAILABLE: OnceLock<bool> = OnceLock::new();
    *AVAILABLE.get_or_init(|| check_tool_available("wl-copy"))
}

#[cfg(target_os = "linux")]
fn type_text_via_wtype(text: &str) -> Result<(), String> {
    let output = Command::new("wtype")
        .arg("--")
        .arg(text)
        .output()
        .map_err(|e| format!("Failed to execute wtype: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("wtype failed: {}", stderr));
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn type_text_via_xdotool(text: &str) -> Result<(), String> {
    let output = Command::new("xdotool")
        .arg("type")
        .arg("--clearmodifiers")
        .arg("--")
        .arg(text)
        .output()
        .map_err(|e| format!("Failed to execute xdotool: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("xdotool failed: {}", stderr));
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn type_text_via_dotool(text: &str) -> Result<(), String> {
    use std::io::Write;
    use std::process::Stdio;

    let mut child = Command::new("dotool")
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn dotool: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        let sanitized = text.replace('\n', " ").replace('\r', " ");
        writeln!(stdin, "type {}", sanitized)
            .map_err(|e| format!("Failed to write to dotool stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for dotool: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("dotool failed: {}", stderr));
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn type_text_via_ydotool(text: &str) -> Result<(), String> {
    let output = Command::new("ydotool")
        .arg("type")
        .arg("--")
        .arg(text)
        .output()
        .map_err(|e| format!("Failed to execute ydotool: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ydotool failed: {}", stderr));
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn type_text_via_kwtype(text: &str) -> Result<(), String> {
    let output = Command::new("kwtype")
        .arg("--")
        .arg(text)
        .output()
        .map_err(|e| format!("Failed to execute kwtype: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("kwtype failed: {}", stderr));
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn write_clipboard_via_wl_copy(text: &str) -> Result<(), String> {
    use std::process::Stdio;
    let status = Command::new("wl-copy")
        .arg("--")
        .arg(text)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| format!("Failed to execute wl-copy: {}", e))?;

    if !status.success() {
        return Err("wl-copy failed".into());
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn send_key_combo_via_wtype(paste_method: &PasteMethod) -> Result<(), String> {
    let args: Vec<&str> = match paste_method {
        PasteMethod::CtrlV => vec!["-M", "ctrl", "-k", "v"],
        PasteMethod::ShiftInsert => vec!["-M", "shift", "-k", "Insert"],
        PasteMethod::CtrlShiftV => vec!["-M", "ctrl", "-M", "shift", "-k", "v"],
        _ => return Err("Unsupported paste method".into()),
    };

    let output = Command::new("wtype")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute wtype: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("wtype failed: {}", stderr));
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn send_key_combo_via_dotool(paste_method: &PasteMethod) -> Result<(), String> {
    let command;
    match paste_method {
        PasteMethod::CtrlV => command = "echo key ctrl+v | dotool",
        PasteMethod::ShiftInsert => command = "echo key shift+insert | dotool",
        PasteMethod::CtrlShiftV => command = "echo key ctrl+shift+v | dotool",
        _ => return Err("Unsupported paste method".into()),
    }
    use std::process::Stdio;
    let status = Command::new("sh")
        .arg("-c")
        .arg(command)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| format!("Failed to execute dotool: {}", e))?;
    if !status.success() {
        return Err("dotool failed".into());
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn send_key_combo_via_ydotool(paste_method: &PasteMethod) -> Result<(), String> {
    let args: Vec<&str> = match paste_method {
        PasteMethod::CtrlV => vec!["key", "29:1", "47:1", "47:0", "29:0"],
        PasteMethod::ShiftInsert => vec!["key", "42:1", "110:1", "110:0", "42:0"],
        PasteMethod::CtrlShiftV => vec!["key", "29:1", "42:1", "47:1", "47:0", "42:0", "29:0"],
        _ => return Err("Unsupported paste method".into()),
    };

    let output = Command::new("ydotool")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute ydotool: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ydotool failed: {}", stderr));
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn send_key_combo_via_xdotool(paste_method: &PasteMethod) -> Result<(), String> {
    let key_combo = match paste_method {
        PasteMethod::CtrlV => "ctrl+v",
        PasteMethod::CtrlShiftV => "ctrl+shift+v",
        PasteMethod::ShiftInsert => "shift+Insert",
        _ => return Err("Unsupported paste method".into()),
    };

    let output = Command::new("xdotool")
        .arg("key")
        .arg("--clearmodifiers")
        .arg(key_combo)
        .output()
        .map_err(|e| format!("Failed to execute xdotool: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("xdotool failed: {}", stderr));
    }

    Ok(())
}

fn paste_via_external_script(text: &str, script_path: &str) -> Result<(), String> {
    use std::io::Write;
    use std::process::Stdio;

    let script = std::path::Path::new(script_path);
    if !script.is_file() {
        return Err(format!("External script not found or not a file: '{}'", script_path));
    }

    let mut child = Command::new(script_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to execute external script '{}': {}", script_path, e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to script stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to wait for external script '{}': {}", script_path, e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "External script '{}' failed with exit code {:?}. stderr: {}, stdout: {}",
            script_path,
            output.status.code(),
            stderr.trim(),
            stdout.trim()
        ));
    }

    Ok(())
}

fn paste_direct(
    enigo: &mut Enigo,
    text: &str,
    #[cfg(target_os = "linux")] typing_tool: TypingTool,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        if try_direct_typing_linux(text, typing_tool)? {
            return Ok(());
        }
    }

    input::paste_text_direct(enigo, text)
}

fn send_return_key(enigo: &mut Enigo, key_type: AutoSubmitKey) -> Result<(), String> {
    match key_type {
        AutoSubmitKey::Enter => {
            enigo
                .key(Key::Return, Direction::Press)
                .map_err(|e| format!("Failed to press Return key: {}", e))?;
            enigo
                .key(Key::Return, Direction::Release)
                .map_err(|e| format!("Failed to release Return key: {}", e))?;
        }
        AutoSubmitKey::CtrlEnter => {
            enigo
                .key(Key::Control, Direction::Press)
                .map_err(|e| format!("Failed to press Control key: {}", e))?;
            enigo
                .key(Key::Return, Direction::Press)
                .map_err(|e| format!("Failed to press Return key: {}", e))?;
            enigo
                .key(Key::Return, Direction::Release)
                .map_err(|e| format!("Failed to release Return key: {}", e))?;
            enigo
                .key(Key::Control, Direction::Release)
                .map_err(|e| format!("Failed to release Control key: {}", e))?;
        }
        AutoSubmitKey::CmdEnter => {
            enigo
                .key(Key::Meta, Direction::Press)
                .map_err(|e| format!("Failed to press Meta/Cmd key: {}", e))?;
            enigo
                .key(Key::Return, Direction::Press)
                .map_err(|e| format!("Failed to press Return key: {}", e))?;
            enigo
                .key(Key::Return, Direction::Release)
                .map_err(|e| format!("Failed to release Return key: {}", e))?;
            enigo
                .key(Key::Meta, Direction::Release)
                .map_err(|e| format!("Failed to release Meta/Cmd key: {}", e))?;
        }
    }

    Ok(())
}

fn should_send_auto_submit(auto_submit: bool, paste_method: PasteMethod) -> bool {
    auto_submit && paste_method != PasteMethod::None
}

pub fn paste(text: String, app_handle: AppHandle) -> Result<(), String> {
    let settings = get_settings(&app_handle);
    let paste_method = settings.paste_method;
    let paste_delay_ms = settings.paste_delay_ms;

    let text = if settings.append_trailing_space {
        format!("{} ", text)
    } else {
        text
    };

    let enigo_state = app_handle
        .try_state::<EnigoState>()
        .ok_or("Enigo state not initialized")?;
    let mut enigo = enigo_state
        .0
        .lock()
        .map_err(|e| format!("Failed to lock Enigo: {}", e))?;

    match paste_method {
        PasteMethod::None => {}
        PasteMethod::Direct => {
            paste_direct(
                &mut enigo,
                &text,
                #[cfg(target_os = "linux")]
                settings.typing_tool,
            )?;
        }
        PasteMethod::CtrlV | PasteMethod::CtrlShiftV | PasteMethod::ShiftInsert => {
            paste_via_clipboard(
                &mut enigo,
                &text,
                &app_handle,
                &paste_method,
                paste_delay_ms,
            )?
        }
        PasteMethod::ExternalScript => {
            let script_path = settings
                .external_script_path
                .as_ref()
                .filter(|p| !p.is_empty())
                .ok_or("External script path is not configured")?;
            paste_via_external_script(&text, script_path)?;
        }
    }

    let auto_submit = if let Some(cli_args) = app_handle.try_state::<CliArgs>() {
        cli_args.auto_submit.is_some() || settings.auto_submit
    } else {
        settings.auto_submit
    };

    if should_send_auto_submit(auto_submit, paste_method) {
        std::thread::sleep(Duration::from_millis(50));
        send_return_key(&mut enigo, settings.auto_submit_key)?;
    }

    if settings.clipboard_handling == ClipboardHandling::CopyToClipboard {
        let clipboard = app_handle.clipboard();
        clipboard
            .write_text(&text)
            .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_submit_requires_setting_enabled() {
        assert!(!should_send_auto_submit(false, PasteMethod::CtrlV));
        assert!(!should_send_auto_submit(false, PasteMethod::Direct));
    }

    #[test]
    fn auto_submit_skips_none_paste_method() {
        assert!(!should_send_auto_submit(true, PasteMethod::None));
    }

    #[test]
    fn auto_submit_runs_for_active_paste_methods() {
        assert!(should_send_auto_submit(true, PasteMethod::CtrlV));
        assert!(should_send_auto_submit(true, PasteMethod::Direct));
        assert!(should_send_auto_submit(true, PasteMethod::CtrlShiftV));
        assert!(should_send_auto_submit(true, PasteMethod::ShiftInsert));
    }
}
