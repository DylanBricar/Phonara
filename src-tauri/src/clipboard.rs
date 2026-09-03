use crate::cli::CliArgs;
use crate::input::{self, EnigoState};
#[cfg(target_os = "linux")]
use crate::settings::TypingTool;
use crate::settings::{get_settings, AutoSubmitKey, ClipboardHandling, PasteMethod};
use enigo::{Direction, Enigo, Key, Keyboard};
use log::info;
use std::process::Command;
#[cfg(target_os = "linux")]
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

#[cfg(target_os = "linux")]
use crate::utils::{is_gnome_wayland, is_kde_wayland, is_wayland};

fn with_enigo<T>(
    app_handle: &AppHandle,
    f: impl FnOnce(&mut Enigo) -> Result<T, String>,
) -> Result<T, String> {
    let enigo_state = app_handle
        .try_state::<EnigoState>()
        .ok_or("Enigo state not initialized")?;
    let mut enigo = enigo_state
        .0
        .lock()
        .map_err(|e| format!("Failed to lock Enigo: {}", e))?;
    f(&mut enigo)
}

fn write_text_to_clipboard(app_handle: &AppHandle, text: &str) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    if is_wayland() && is_wl_copy_available() {
        info!("Using wl-copy for clipboard write on Wayland");
        return write_clipboard_via_wl_copy(text);
    }

    let clipboard = app_handle.clipboard();
    let mut last_error = None;
    for attempt in 0..=2 {
        match clipboard.write_text(text) {
            Ok(()) => {
                std::thread::sleep(Duration::from_millis(10));
                if matches!(clipboard.read_text(), Ok(current) if current == text) {
                    return Ok(());
                }
                last_error = Some("clipboard read-back did not match".to_string());
            }
            Err(error) => last_error = Some(error.to_string()),
        }
        if attempt < 2 {
            std::thread::sleep(Duration::from_millis(30));
        }
    }
    Err(format!(
        "Failed to write and verify clipboard contents: {}",
        last_error.unwrap_or_else(|| "unknown clipboard error".to_string())
    ))
}

fn finish_clipboard_paste(
    paste_result: Result<(), String>,
    paste_delay_after_ms: u64,
    restore_clipboard: impl FnOnce(),
) -> Result<(), String> {
    std::thread::sleep(Duration::from_millis(paste_delay_after_ms));
    restore_clipboard();
    paste_result
}

fn paste_via_clipboard(
    text: &str,
    app_handle: &AppHandle,
    paste_method: &PasteMethod,
    paste_delay_ms: u64,
    paste_delay_after_ms: u64,
) -> Result<(), String> {
    let clipboard = app_handle.clipboard();
    let saved_text = clipboard.read_text().ok().filter(|t| !t.is_empty());
    // Only probe for an image when there is no text to restore. Text is by far the
    // common case, and reading an image decodes the full bitmap, so this keeps the
    // text path exactly as cheap as it was before.
    let saved_image = if saved_text.is_none() {
        clipboard.read_image().ok().map(|image| image.to_owned())
    } else {
        None
    };

    // Write text to clipboard first
    write_text_to_clipboard(app_handle, text)?;

    std::thread::sleep(Duration::from_millis(paste_delay_ms));

    // Capture key injection errors so the original clipboard is restored before
    // propagating them to the caller.
    let paste_result = (|| -> Result<(), String> {
        // Send paste key combo
        #[cfg(target_os = "linux")]
        let key_combo_sent = try_send_key_combo_linux(paste_method)?;

        #[cfg(not(target_os = "linux"))]
        let key_combo_sent = false;

        // Fall back to enigo if no native tool handled it
        if !key_combo_sent {
            with_enigo(app_handle, |enigo| match paste_method {
                // The legacy path cannot detect a mistimed chord, so it keeps the
                // conservative 100ms modifier hold.
                PasteMethod::CtrlV => input::send_paste_ctrl_v(enigo, 100),
                PasteMethod::CtrlShiftV => input::send_paste_ctrl_shift_v(enigo, 100),
                PasteMethod::ShiftInsert => input::send_paste_shift_insert(enigo, 100),
                _ => Err("Invalid paste method for clipboard paste".into()),
            })?;
        }

        Ok(())
    })();

    finish_clipboard_paste(paste_result, paste_delay_after_ms, || {
        // Restore original clipboard content even when key injection failed.
        // Text takes priority so this path stays identical to the previous behavior;
        // an image is only restored when the clipboard held no text at all, which is
        // the case that used to silently wipe screenshots.
        if let Some(clipboard_content) = saved_text {
            let _ = write_text_to_clipboard(app_handle, &clipboard_content);
        } else if let Some(image) = saved_image {
            info!("Restoring image to clipboard");
            let _ = clipboard.write_image(&image);
        } else {
            // Nothing was there to begin with — don't leave the transcription behind.
            let _ = clipboard.clear();
        }
    })
}

#[cfg(target_os = "linux")]
fn try_send_key_combo_linux(paste_method: &PasteMethod) -> Result<bool, String> {
    if is_wayland() {
        // Wayland: prefer wtype (but not on KDE or GNOME), then dotool, then ydotool
        // Note: wtype doesn't work on KDE (no zwp_virtual_keyboard_manager_v1 support)
        // or on GNOME/Mutter (same reason — Mutter deliberately does not implement
        // the virtual-keyboard-v1 protocol).
        if !is_kde_wayland() && !is_gnome_wayland() && is_wtype_available() {
            info!("Using wtype for key combo");
            send_key_combo_via_wtype(paste_method)?;
            return Ok(true);
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
            TypingTool::Wtype if is_wtype_available() => match type_text_via_wtype(text) {
                Ok(()) => Ok(true),
                Err(e) => Err(format!("Wtype failed: {}", e)),
            },
            TypingTool::Kwtype if is_kwtype_available() => match type_text_via_kwtype(text) {
                Ok(()) => Ok(true),
                Err(e) => Err(format!("Kwtype failed: {}", e)),
            },
            TypingTool::Dotool if is_dotool_available() => match type_text_via_dotool(text) {
                Ok(()) => Ok(true),
                Err(e) => Err(format!("Dotool failed: {}", e)),
            },
            TypingTool::Ydotool if is_ydotool_available() => match type_text_via_ydotool(text) {
                Ok(()) => Ok(true),
                Err(e) => Err(format!("Ydotool failed: {}", e)),
            },
            TypingTool::Xdotool if is_xdotool_available() => match type_text_via_xdotool(text) {
                Ok(()) => Ok(true),
                Err(e) => Err(format!("Xdotool failed: {}", e)),
            },
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
        // Wayland: prefer wtype, then dotool, then ydotool
        // Note: wtype doesn't work on KDE (no zwp_virtual_keyboard_manager_v1 support)
        // or on GNOME/Mutter (same reason — Mutter deliberately does not implement
        // the virtual-keyboard-v1 protocol).
        if !is_kde_wayland() && !is_gnome_wayland() && is_wtype_available() {
            info!("Using wtype for direct text input");
            type_text_via_wtype(text)?;
            return Ok(true);
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
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum YdotoolKeySyntax {
    Symbolic,
    RawKeycodes,
}

#[cfg(target_os = "linux")]
const YDOTOOL_UNKNOWN_HELP_FALLBACK: YdotoolKeySyntax = YdotoolKeySyntax::RawKeycodes;

#[cfg(target_os = "linux")]
static YDOTOOL_KEY_SYNTAX: OnceLock<YdotoolKeySyntax> = OnceLock::new();

/// Classifies `ydotool key --help` output without relying on version or distro metadata.
#[cfg(target_os = "linux")]
fn classify_ydotool_key_syntax(help: &str) -> Option<YdotoolKeySyntax> {
    let help = help.to_ascii_lowercase();

    // Check modern markers first in case a future help message mentions the legacy syntax.
    if help.contains("syntax: <keycode>:<pressed>")
        || help.contains("[keycodes]")
        || help.contains("using raw keycodes")
    {
        Some(YdotoolKeySyntax::RawKeycodes)
    } else if help.contains("separated by plus (+)")
        || (help.contains("<key sequence>") && help.contains("alt+r"))
    {
        Some(YdotoolKeySyntax::Symbolic)
    } else {
        None
    }
}

/// Detects and caches a recognized ydotool key syntax. Unknown or failed probes are not cached,
/// allowing a transient daemon or PATH problem to recover on a later paste attempt.
#[cfg(target_os = "linux")]
fn detect_ydotool_key_syntax() -> YdotoolKeySyntax {
    if let Some(syntax) = YDOTOOL_KEY_SYNTAX.get() {
        return *syntax;
    }

    match Command::new("ydotool").args(["key", "--help"]).output() {
        Ok(output) => {
            // ydotool 0.x writes help to stderr and its exit status varies by build.
            let mut help = String::from_utf8_lossy(&output.stdout).into_owned();
            if !help.is_empty() && !output.stderr.is_empty() {
                help.push('\n');
            }
            help.push_str(&String::from_utf8_lossy(&output.stderr));

            if let Some(syntax) = classify_ydotool_key_syntax(&help) {
                *YDOTOOL_KEY_SYNTAX.get_or_init(|| {
                    info!("Detected ydotool key syntax: {:?}", syntax);
                    syntax
                })
            } else {
                // Preserve Handy's existing behavior and compatibility with current ydotool.
                log::warn!(
                    "Could not recognize ydotool key --help output (exit status {:?}); using raw-keycode syntax",
                    output.status.code()
                );
                YDOTOOL_UNKNOWN_HELP_FALLBACK
            }
        }
        Err(error) => {
            log::warn!(
                "Could not query ydotool key syntax: {}; using raw-keycode syntax",
                error
            );
            YDOTOOL_UNKNOWN_HELP_FALLBACK
        }
    }
}

/// Check if ydotool is available (uinput-based, works on both Wayland and X11)
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

    // `--clearmodifiers` restores the modifiers that were held when xdotool
    // started. If the user releases one while xdotool is typing, that synthetic
    // restore can leave the modifier latched on the XTEST keyboard (#1817).
    // Release both sides of Handy's supported push-style modifiers to clear any
    // stale restore. Lock keys are intentionally excluded because key events
    // toggle them.
    //
    // The release is unconditional, so it can make a modifier that is still
    // physically held appear released until the next physical event. This is
    // preferable to leaving a synthetic modifier latched system-wide.
    //
    // Clean up before checking the typing status because xdotool may have
    // changed modifier state before returning an error. Cleanup remains
    // best-effort because the text may already have been partially or fully
    // typed, but failures are logged so they can be diagnosed.
    match Command::new("xdotool")
        .arg("keyup")
        .args([
            "Control_L",
            "Control_R",
            "Shift_L",
            "Shift_R",
            "Alt_L",
            "Alt_R",
            "Super_L",
            "Super_R",
        ])
        .output()
    {
        Ok(cleanup_output) if !cleanup_output.status.success() => {
            let stderr = String::from_utf8_lossy(&cleanup_output.stderr);
            log::warn!(
                "xdotool modifier cleanup failed with status {:?}: {}",
                cleanup_output.status.code(),
                stderr.trim()
            );
        }
        Err(error) => log::warn!("Failed to execute xdotool modifier cleanup: {}", error),
        _ => {}
    }

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
        // Strip all control characters (including \n, \r, \0, \t, etc.) except space
        let sanitized: String = text
            .chars()
            .filter(|c| !c.is_control() || *c == ' ')
            .collect();
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
        PasteMethod::CtrlV => vec!["-M", "ctrl", "-k", "v", "-m", "ctrl"],
        PasteMethod::ShiftInsert => vec!["-M", "shift", "-k", "Insert", "-m", "shift"],
        PasteMethod::CtrlShiftV => vec![
            "-M", "ctrl", "-M", "shift", "-k", "v", "-m", "shift", "-m", "ctrl",
        ],
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
    let command = match paste_method {
        PasteMethod::CtrlV => "echo key ctrl+v | dotool",
        PasteMethod::ShiftInsert => "echo key shift+insert | dotool",
        PasteMethod::CtrlShiftV => "echo key ctrl+shift+v | dotool",
        _ => return Err("Unsupported paste method".into()),
    };
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
fn ydotool_key_args(
    paste_method: &PasteMethod,
    syntax: YdotoolKeySyntax,
) -> Result<&'static [&'static str], String> {
    let args = match (paste_method, syntax) {
        (PasteMethod::CtrlV, YdotoolKeySyntax::Symbolic) => &["key", "ctrl+v"][..],
        (PasteMethod::CtrlShiftV, YdotoolKeySyntax::Symbolic) => &["key", "ctrl+shift+v"][..],
        (PasteMethod::ShiftInsert, YdotoolKeySyntax::Symbolic) => &["key", "shift+insert"][..],
        (PasteMethod::CtrlV, YdotoolKeySyntax::RawKeycodes) => {
            &["key", "29:1", "47:1", "47:0", "29:0"][..]
        }
        (PasteMethod::CtrlShiftV, YdotoolKeySyntax::RawKeycodes) => {
            &["key", "29:1", "42:1", "47:1", "47:0", "42:0", "29:0"][..]
        }
        (PasteMethod::ShiftInsert, YdotoolKeySyntax::RawKeycodes) => {
            &["key", "42:1", "110:1", "110:0", "42:0"][..]
        }
        _ => return Err("Unsupported paste method".into()),
    };

    Ok(args)
}

/// Send a key combination (e.g., Ctrl+V) via ydotool (requires ydotoold daemon).
#[cfg(target_os = "linux")]
fn send_key_combo_via_ydotool(paste_method: &PasteMethod) -> Result<(), String> {
    let syntax = detect_ydotool_key_syntax();
    let args = ydotool_key_args(paste_method, syntax)?;

    let output = Command::new("ydotool")
        .args(args)
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
    let canonical = script
        .canonicalize()
        .map_err(|error| format!("Failed to resolve script path: {error}"))?;
    if !canonical.is_file() {
        return Err(format!("External script not found: {script_path}"));
    }

    // Pass untrusted transcription text over stdin, never as a command-line
    // argument. Do not capture stdout/stderr: a clipboard daemon forked by the
    // script may inherit those handles and otherwise keep wait blocked.
    let mut child = Command::new(&canonical)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to execute external script '{}': {}", script_path, e))?;

    let stdin_result = if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(text.as_bytes())
    } else {
        Ok(())
    };
    let status = child
        .wait()
        .map_err(|error| format!("Failed to wait for external script '{script_path}': {error}"))?;

    if !status.success() {
        return Err(format!(
            "External script '{}' failed with exit code {:?}",
            script_path,
            status.code()
        ));
    }

    // A successful script is allowed to exit without consuming stdin. In that
    // race the parent observes BrokenPipe even though the script completed its
    // work successfully. Other write failures still indicate a real delivery
    // problem and must be reported.
    if let Err(error) = stdin_result {
        if error.kind() != std::io::ErrorKind::BrokenPipe {
            return Err(format!("Failed to write to script stdin: {error}"));
        }
    }

    Ok(())
}

fn paste_direct(
    text: &str,
    app_handle: &AppHandle,
    #[cfg(target_os = "linux")] typing_tool: TypingTool,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        if try_direct_typing_linux(text, typing_tool)? {
            return Ok(());
        }
    }

    with_enigo(app_handle, |enigo| input::paste_text_direct(enigo, text))
}

pub(crate) fn send_return_key(enigo: &mut Enigo, key_type: AutoSubmitKey) -> Result<(), String> {
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

fn should_send_auto_submit(
    auto_submit: bool,
    allow_auto_submit: bool,
    paste_method: PasteMethod,
) -> bool {
    auto_submit && allow_auto_submit && paste_method != PasteMethod::None
}

pub fn paste_with_auto_submit(
    text: String,
    app_handle: AppHandle,
    allow_auto_submit: bool,
) -> Result<(), String> {
    let settings = get_settings(&app_handle);
    let paste_method = settings.paste_method;
    let paste_delay_ms = settings.paste_delay_ms;
    let paste_delay_after_ms = settings.paste_delay_after_ms;

    let text = if settings.append_trailing_space {
        format!("{} ", text)
    } else {
        text
    };

    info!(
        "Using paste method: {:?}, delay before: {}ms, delay after: {}ms",
        paste_method, paste_delay_ms, paste_delay_after_ms
    );

    // Defer a clipboard-paste error until the CopyToClipboard fallback has run.
    let mut clipboard_paste_error: Option<String> = None;

    // Perform the paste operation
    match paste_method {
        PasteMethod::None => {}
        PasteMethod::Direct => {
            paste_direct(
                &text,
                &app_handle,
                #[cfg(target_os = "linux")]
                settings.typing_tool,
            )?;
        }
        PasteMethod::CtrlV | PasteMethod::CtrlShiftV | PasteMethod::ShiftInsert => {
            // Debug-gated receipt-sequenced paste (#502): restore the clipboard
            // after the target actually reads the transcript, not on a timer.
            // On success it fully handles the paste (including auto-submit and
            // clipboard handling) asynchronously; on failure fall through to
            // the legacy path untouched.
            #[cfg(any(target_os = "macos", target_os = "windows"))]
            if settings.reliable_paste {
                let reliable_result = with_enigo(&app_handle, |enigo| {
                    crate::paste_tx::try_reliable_paste(
                        &text,
                        &app_handle,
                        &paste_method,
                        enigo,
                        settings.auto_submit,
                        settings.auto_submit_key,
                        settings.clipboard_handling,
                    )
                });
                match reliable_result {
                    Ok(()) => return Ok(()),
                    Err(e) => {
                        log::warn!("Reliable paste unavailable ({e}); falling back to legacy paste")
                    }
                }
            }
            if let Err(error) = paste_via_clipboard(
                &text,
                &app_handle,
                &paste_method,
                paste_delay_ms,
                paste_delay_after_ms,
            ) {
                clipboard_paste_error = Some(error);
            }
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

    let (auto_submit, submit_key) = if let Some(cli_args) = app_handle.try_state::<CliArgs>() {
        if let Some(ref key_str) = cli_args.auto_submit {
            let key = match key_str.to_lowercase().as_str() {
                "ctrl+enter" | "ctrl_enter" => AutoSubmitKey::CtrlEnter,
                "cmd+enter" | "cmd_enter" => AutoSubmitKey::CmdEnter,
                _ => AutoSubmitKey::Enter,
            };
            (true, key)
        } else {
            (settings.auto_submit, settings.auto_submit_key)
        }
    } else {
        (settings.auto_submit, settings.auto_submit_key)
    };

    // Don't submit when the paste itself failed — there is nothing to submit.
    if clipboard_paste_error.is_none()
        && should_send_auto_submit(auto_submit, allow_auto_submit, paste_method)
    {
        std::thread::sleep(Duration::from_millis(50));
        if let Err(error) = with_enigo(&app_handle, |enigo| send_return_key(enigo, submit_key)) {
            log::warn!("Paste succeeded, but auto-submit failed: {error}");
        }
    }

    if settings.clipboard_handling == ClipboardHandling::CopyToClipboard {
        write_text_to_clipboard(&app_handle, &text)?;
    }

    // Surface a deferred clipboard-paste failure now that the fallback has run.
    if let Some(e) = clipboard_paste_error {
        return Err(e);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    #[cfg(target_os = "linux")]
    const YDOTOOL_0_1_8_HELP: &str = r#"
Usage: key [--delay <ms>] [--key-delay <ms>] [--repeat <times>] [--repeat-delay <ms>] <key sequence> ...
Each key sequence can be any number of modifiers and keys, separated by plus (+)
For example: alt+r Alt+F4 CTRL+alt+f3 aLT+1+2+3 ctrl+Backspace
"#;

    #[cfg(target_os = "linux")]
    const YDOTOOL_1_0_4_HELP: &str = r#"
Usage: key [OPTION]... [KEYCODES]...
Since there's no way to know how many keyboard layouts are there in the world,
we're using raw keycodes now.
Syntax: <keycode>:<pressed>
e.g. 28:1 28:0 means pressing on the Enter button on a standard US keyboard.
"#;

    #[cfg(target_os = "linux")]
    #[test]
    fn classifies_ydotool_0_1_8_symbolic_help() {
        assert_eq!(
            classify_ydotool_key_syntax(YDOTOOL_0_1_8_HELP),
            Some(YdotoolKeySyntax::Symbolic)
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn classifies_ydotool_1_0_4_raw_keycode_help() {
        assert_eq!(
            classify_ydotool_key_syntax(YDOTOOL_1_0_4_HELP),
            Some(YdotoolKeySyntax::RawKeycodes)
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn unknown_ydotool_help_falls_back_to_raw_keycodes() {
        let syntax = classify_ydotool_key_syntax("unrecognized help output")
            .unwrap_or(YDOTOOL_UNKNOWN_HELP_FALLBACK);

        assert_eq!(syntax, YdotoolKeySyntax::RawKeycodes);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn generates_symbolic_ydotool_arguments_for_all_paste_methods() {
        assert_eq!(
            ydotool_key_args(&PasteMethod::CtrlV, YdotoolKeySyntax::Symbolic).unwrap(),
            ["key", "ctrl+v"]
        );
        assert_eq!(
            ydotool_key_args(&PasteMethod::CtrlShiftV, YdotoolKeySyntax::Symbolic).unwrap(),
            ["key", "ctrl+shift+v"]
        );
        assert_eq!(
            ydotool_key_args(&PasteMethod::ShiftInsert, YdotoolKeySyntax::Symbolic).unwrap(),
            ["key", "shift+insert"]
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn generates_raw_ydotool_arguments_for_all_paste_methods() {
        assert_eq!(
            ydotool_key_args(&PasteMethod::CtrlV, YdotoolKeySyntax::RawKeycodes).unwrap(),
            ["key", "29:1", "47:1", "47:0", "29:0"]
        );
        assert_eq!(
            ydotool_key_args(&PasteMethod::CtrlShiftV, YdotoolKeySyntax::RawKeycodes).unwrap(),
            ["key", "29:1", "42:1", "47:1", "47:0", "42:0", "29:0"]
        );
        assert_eq!(
            ydotool_key_args(&PasteMethod::ShiftInsert, YdotoolKeySyntax::RawKeycodes).unwrap(),
            ["key", "42:1", "110:1", "110:0", "42:0"]
        );
    }

    #[test]
    fn auto_submit_requires_setting_enabled() {
        assert!(!should_send_auto_submit(false, true, PasteMethod::CtrlV));
        assert!(!should_send_auto_submit(false, true, PasteMethod::Direct));
    }

    #[test]
    fn auto_submit_can_be_blocked_for_untrusted_output() {
        assert!(!should_send_auto_submit(true, false, PasteMethod::CtrlV));
    }

    #[test]
    fn auto_submit_skips_none_paste_method() {
        assert!(!should_send_auto_submit(true, true, PasteMethod::None));
    }

    #[test]
    fn auto_submit_runs_for_active_paste_methods() {
        assert!(should_send_auto_submit(true, true, PasteMethod::CtrlV));
        assert!(should_send_auto_submit(true, true, PasteMethod::Direct));
        assert!(should_send_auto_submit(true, true, PasteMethod::CtrlShiftV));
        assert!(should_send_auto_submit(
            true,
            true,
            PasteMethod::ShiftInsert
        ));
    }

    #[test]
    fn clipboard_is_restored_before_key_injection_error_is_returned() {
        let restored = Cell::new(false);
        let result = finish_clipboard_paste(Err("input failed".into()), 0, || {
            restored.set(true);
        });

        assert_eq!(result.unwrap_err(), "input failed");
        assert!(restored.get());
    }

    #[cfg(unix)]
    #[test]
    fn external_script_does_not_wait_for_inherited_stdio() {
        use std::fs;
        use std::os::unix::fs::PermissionsExt;
        use std::sync::mpsc;
        use std::thread;

        let script_path = std::env::temp_dir().join(format!(
            "handy-external-script-{}-{}.sh",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system clock should be after UNIX_EPOCH")
                .as_nanos()
        ));
        fs::write(&script_path, "#!/bin/sh\nsleep 3 &\nexit 0\n").expect("write external script");
        let mut permissions = fs::metadata(&script_path)
            .expect("read external script metadata")
            .permissions();
        permissions.set_mode(0o700);
        fs::set_permissions(&script_path, permissions).expect("make external script executable");

        let (sender, receiver) = mpsc::channel();
        let script_path_for_thread = script_path.clone();
        thread::spawn(move || {
            let result =
                paste_via_external_script("test", script_path_for_thread.to_str().unwrap());
            sender.send(result).expect("send script result");
        });

        let result = receiver
            .recv_timeout(Duration::from_secs(1))
            .expect("external script should return without waiting for its child");
        fs::remove_file(script_path).expect("remove external script");
        assert!(result.is_ok());
    }
}
