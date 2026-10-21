use crate::cli::CliArgs;
use crate::input::{self, EnigoState};
#[cfg(target_os = "linux")]
use crate::settings::TypingTool;
use crate::settings::{get_settings, AppSettings, AutoSubmitKey, ClipboardHandling, PasteMethod};
use enigo::{Direction, Enigo, Key, Keyboard};
use log::info;
use once_cell::sync::Lazy;
#[cfg(target_os = "linux")]
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
#[cfg(target_os = "linux")]
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;

const EXTERNAL_SCRIPT_TIMEOUT: Duration = Duration::from_secs(30);
const CANCELLATION_POLL_INTERVAL: Duration = Duration::from_millis(25);

// A paste owns the clipboard from its snapshot through restoration, including
// the asynchronous receipt-based backend. Waiting for this lock never blocks
// the event loop or consumes a blocking-pool thread.
static PASTE_LOCK: Lazy<Arc<tokio::sync::Mutex<()>>> =
    Lazy::new(|| Arc::new(tokio::sync::Mutex::new(())));

pub(crate) type CancellationCheck = Arc<dyn Fn() -> bool + Send + Sync>;

struct CancelPasteOnDrop(Arc<AtomicBool>);

impl Drop for CancelPasteOnDrop {
    fn drop(&mut self) {
        // spawn_blocking cannot be aborted. Its queued input callbacks must
        // also observe the caller abandoning this future.
        self.0.store(true, Ordering::Release);
    }
}

async fn acquire_paste_lock(
    lock: Arc<tokio::sync::Mutex<()>>,
    is_cancelled: &(dyn Fn() -> bool + Sync),
) -> Option<tokio::sync::OwnedMutexGuard<()>> {
    let pending = lock.lock_owned();
    tokio::pin!(pending);
    loop {
        if is_cancelled() {
            return None;
        }
        if let Ok(guard) = tokio::time::timeout(CANCELLATION_POLL_INTERVAL, pending.as_mut()).await
        {
            return (!is_cancelled()).then_some(guard);
        }
    }
}

fn wait_unless_cancelled(delay: Duration, is_cancelled: &dyn Fn() -> bool) -> bool {
    let started = Instant::now();
    while let Some(remaining) = delay.checked_sub(started.elapsed()) {
        if is_cancelled() {
            return false;
        }
        std::thread::sleep(remaining.min(CANCELLATION_POLL_INTERVAL));
    }
    !is_cancelled()
}

#[cfg(target_os = "linux")]
use crate::utils::{is_gnome_wayland, is_kde_wayland, is_wayland};

/// Only macOS input injection needs the main thread (Carbon keyboard layout
/// APIs). Clipboard access and all paste delays stay on the worker.
fn with_enigo<T: Send + 'static>(
    app_handle: &AppHandle,
    f: impl FnOnce(&mut Enigo) -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    #[cfg(target_os = "macos")]
    {
        let (sender, receiver) = std::sync::mpsc::sync_channel(1);
        let app = app_handle.clone();
        app_handle
            .run_on_main_thread(move || {
                let _ = sender.send(with_enigo_here(&app, f));
            })
            .map_err(|error| format!("Failed to run input on the main thread: {error}"))?;
        receiver
            .recv()
            .map_err(|_| "Main thread dropped the input request".to_string())?
    }
    #[cfg(not(target_os = "macos"))]
    with_enigo_here(app_handle, f)
}

fn with_enigo_here<T>(
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
    is_cancelled: CancellationCheck,
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

    // Capture key injection errors so the original clipboard is restored before
    // propagating them to the caller.
    let mut injection_attempted = false;
    let paste_result = (|| -> Result<(), String> {
        write_text_to_clipboard(app_handle, text)?;
        if !wait_unless_cancelled(Duration::from_millis(paste_delay_ms), &*is_cancelled) {
            return Ok(());
        }
        // Send paste key combo
        injection_attempted = true;
        #[cfg(target_os = "linux")]
        let key_combo_sent = try_send_key_combo_linux(paste_method)?;

        #[cfg(not(target_os = "linux"))]
        let key_combo_sent = false;

        // Fall back to enigo if no native tool handled it
        if !key_combo_sent {
            let paste_method = *paste_method;
            let is_cancelled = Arc::clone(&is_cancelled);
            with_enigo(app_handle, move |enigo| {
                if is_cancelled() {
                    return Ok(());
                }
                match paste_method {
                    // The legacy path cannot detect a mistimed chord, so it keeps the
                    // conservative 100ms modifier hold.
                    PasteMethod::CtrlV => input::send_paste_ctrl_v(enigo, 100),
                    PasteMethod::CtrlShiftV => input::send_paste_ctrl_shift_v(enigo, 100),
                    PasteMethod::ShiftInsert => input::send_paste_shift_insert(enigo, 100),
                    _ => Err("Invalid paste method for clipboard paste".into()),
                }
            })?;
        }

        Ok(())
    })();

    // Once input was queued, the target still needs its normal read window
    // even if cancellation arrives. Restoring early can paste stale content.
    let restore_delay = if injection_attempted {
        paste_delay_after_ms
    } else {
        0
    };
    finish_clipboard_paste(paste_result, restore_delay, || {
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

async fn run_external_script(
    mut command: tokio::process::Command,
    text: &str,
    timeout: Duration,
) -> Result<(), String> {
    use std::process::Stdio;
    use tokio::io::AsyncWriteExt;

    command
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.as_std_mut().creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    // The same deadline covers both stdin backpressure and process exit. Dropping
    // the timed-out future kills the owned child rather than leaving it running.
    tokio::time::timeout(timeout, async move {
        let mut child = command
            .spawn()
            .map_err(|error| format!("Failed to execute external script: {error}"))?;
        let stdin_result = if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(text.as_bytes()).await
        } else {
            Ok(())
        };
        let status = child
            .wait()
            .await
            .map_err(|error| format!("Failed to wait for external script: {error}"))?;

        if !status.success() {
            return Err(format!(
                "External script failed with exit code {:?}",
                status.code()
            ));
        }

        // A successful script may exit without consuming stdin (BrokenPipe).
        if let Err(error) = stdin_result {
            if error.kind() != std::io::ErrorKind::BrokenPipe {
                return Err(format!("Failed to write to script stdin: {error}"));
            }
        }
        Ok(())
    })
    .await
    .map_err(|_| {
        format!(
            "External script timed out after {:.1} seconds",
            timeout.as_secs_f64()
        )
    })?
}

async fn paste_via_external_script(text: &str, script_path: &str) -> Result<(), String> {
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
    run_external_script(
        tokio::process::Command::new(canonical),
        text,
        EXTERNAL_SCRIPT_TIMEOUT,
    )
    .await
}

fn paste_direct(
    text: &str,
    app_handle: &AppHandle,
    is_cancelled: CancellationCheck,
    #[cfg(target_os = "linux")] typing_tool: TypingTool,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        if try_direct_typing_linux(text, typing_tool)? {
            return Ok(());
        }
    }

    let text = text.to_string();
    with_enigo(app_handle, move |enigo| {
        if is_cancelled() {
            return Ok(());
        }
        input::paste_text_direct(enigo, &text)
    })
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
    // External scripts can run long enough for focus to move to another app.
    // They own their input delivery and must not receive a delayed Enter here.
    auto_submit
        && allow_auto_submit
        && !matches!(
            paste_method,
            PasteMethod::None | PasteMethod::ExternalScript
        )
}

/// Resolve runtime overrides and the output safety policy before choosing a
/// paste backend. A backend completing asynchronously must get the same policy.
fn resolve_auto_submit(
    configured: bool,
    configured_key: AutoSubmitKey,
    cli_override: Option<&str>,
    allow_auto_submit: bool,
    paste_method: PasteMethod,
) -> (bool, AutoSubmitKey) {
    let (enabled, key) = match cli_override {
        Some(key) => (
            true,
            match key.to_lowercase().as_str() {
                "ctrl+enter" | "ctrl_enter" => AutoSubmitKey::CtrlEnter,
                "cmd+enter" | "cmd_enter" => AutoSubmitKey::CmdEnter,
                _ => AutoSubmitKey::Enter,
            },
        ),
        None => (configured, configured_key),
    };
    (
        should_send_auto_submit(enabled, allow_auto_submit, paste_method),
        key,
    )
}

fn finish_paste(
    app_handle: &AppHandle,
    text: &str,
    auto_submit: bool,
    submit_key: AutoSubmitKey,
    clipboard_handling: ClipboardHandling,
    paste_error: Option<String>,
    is_cancelled: CancellationCheck,
) -> Result<(), String> {
    if is_cancelled() {
        return Ok(());
    }
    // Don't submit when the paste itself failed — there is nothing to submit.
    if paste_error.is_none() && auto_submit {
        if !wait_unless_cancelled(Duration::from_millis(50), &*is_cancelled) {
            return Ok(());
        }
        let cancelled_before_submit = Arc::clone(&is_cancelled);
        if let Err(error) = with_enigo(app_handle, move |enigo| {
            if cancelled_before_submit() {
                return Ok(());
            }
            send_return_key(enigo, submit_key)
        }) {
            log::warn!("Paste succeeded, but auto-submit failed: {error}");
        }
    }

    if !is_cancelled() && clipboard_handling == ClipboardHandling::CopyToClipboard {
        write_text_to_clipboard(app_handle, text)?;
    }

    // Surface the deferred paste failure after the clipboard fallback has run.
    match paste_error {
        Some(error) => Err(error),
        None => Ok(()),
    }
}

/// Run script execution asynchronously and blocking paste steps on a worker.
/// The caller retains its pipeline guard through clipboard restoration.
pub async fn paste_with_auto_submit(
    text: String,
    app_handle: AppHandle,
    allow_auto_submit: bool,
    is_cancelled: impl Fn() -> bool + Send + Sync + 'static,
) -> Result<(), String> {
    let abandoned = Arc::new(AtomicBool::new(false));
    let _cancel_on_drop = CancelPasteOnDrop(Arc::clone(&abandoned));
    let is_cancelled: CancellationCheck =
        Arc::new(move || abandoned.load(Ordering::Acquire) || is_cancelled());
    let Some(permit) = acquire_paste_lock(Arc::clone(&PASTE_LOCK), &*is_cancelled).await else {
        return Ok(());
    };
    let settings = get_settings(&app_handle);
    let text = if settings.append_trailing_space {
        format!("{} ", text)
    } else {
        text
    };
    if is_cancelled() {
        return Ok(());
    }
    let script_result = if settings.paste_method == PasteMethod::ExternalScript {
        let script_path = settings
            .external_script_path
            .as_ref()
            .filter(|path| !path.is_empty())
            .ok_or("External script path is not configured")?;
        let operation = paste_via_external_script(&text, script_path);
        tokio::pin!(operation);
        loop {
            if is_cancelled() {
                // Dropping the child future kills the script, including a
                // process blocked writing to stdin (kill_on_drop is set).
                return Ok(());
            }
            if let Ok(result) =
                tokio::time::timeout(CANCELLATION_POLL_INTERVAL, operation.as_mut()).await
            {
                break Some(result);
            }
        }
    } else {
        None
    };
    if is_cancelled() {
        return Ok(());
    }

    run_paste_worker(permit, Arc::clone(&is_cancelled), move |permit| {
        paste_on_worker(
            text,
            app_handle,
            allow_auto_submit,
            settings,
            script_result,
            is_cancelled,
            permit,
        )
    })
    .await
}

async fn run_paste_worker(
    permit: tokio::sync::OwnedMutexGuard<()>,
    is_cancelled: CancellationCheck,
    operation: impl FnOnce(tokio::sync::OwnedMutexGuard<()>) -> Result<(), String> + Send + 'static,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if is_cancelled() {
            return Ok(());
        }
        operation(permit)
    })
    .await
    .map_err(|error| format!("Paste worker did not complete: {error}"))?
}

fn paste_on_worker(
    text: String,
    app_handle: AppHandle,
    allow_auto_submit: bool,
    settings: AppSettings,
    script_result: Option<Result<(), String>>,
    is_cancelled: CancellationCheck,
    permit: tokio::sync::OwnedMutexGuard<()>,
) -> Result<(), String> {
    // The reliable backend takes this permit until its asynchronous restore
    // completes. Every other backend retains it through finish_paste below.
    let permit = Some(permit);
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    let mut permit = permit;
    let paste_method = settings.paste_method;
    let paste_delay_ms = settings.paste_delay_ms;
    let paste_delay_after_ms = settings.paste_delay_after_ms;
    let (auto_submit, submit_key) = {
        let cli_args = app_handle.try_state::<CliArgs>();
        resolve_auto_submit(
            settings.auto_submit,
            settings.auto_submit_key,
            cli_args
                .as_ref()
                .and_then(|args| args.auto_submit.as_deref()),
            allow_auto_submit,
            paste_method,
        )
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
                Arc::clone(&is_cancelled),
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
                let (transaction, completion) = crate::paste_tx::PasteTransaction::new(
                    permit.take(),
                    Arc::clone(&is_cancelled),
                );
                let reliable_transaction = Arc::clone(&transaction);
                let (text, app) = (text.clone(), app_handle.clone());
                let clipboard_handling = settings.clipboard_handling;
                let reliable_result = with_enigo(&app_handle, move |enigo| {
                    if reliable_transaction.is_cancelled() {
                        return Ok(false);
                    }
                    crate::paste_tx::try_reliable_paste(
                        &text,
                        &app,
                        &paste_method,
                        enigo,
                        crate::paste_tx::PasteOptions {
                            auto_submit,
                            auto_submit_key: submit_key,
                            clipboard_handling,
                        },
                        reliable_transaction,
                    )
                    .map(|()| true)
                });
                match reliable_result {
                    Ok(true) => {
                        return completion
                            .recv_timeout(crate::paste_tx::RESTORE_TIMEOUT + Duration::from_secs(2))
                            .map_err(|_| {
                                // Keep the permit with the platform transaction:
                                // a delayed main loop must restore before another
                                // paste can snapshot its intermediate clipboard.
                                transaction.cancel();
                                "Reliable paste did not finish restoring the clipboard".to_string()
                            })?;
                    }
                    Ok(false) => return Ok(()),
                    Err(e) => {
                        log::warn!("Reliable paste unavailable ({e}); falling back to legacy paste")
                    }
                }
                permit = transaction.take_permit();
            }
            if let Err(error) = paste_via_clipboard(
                &text,
                &app_handle,
                &paste_method,
                paste_delay_ms,
                paste_delay_after_ms,
                Arc::clone(&is_cancelled),
            ) {
                clipboard_paste_error = Some(error);
            }
        }
        PasteMethod::ExternalScript => {
            clipboard_paste_error = script_result
                .ok_or("External script was not executed before finalization")?
                .err();
        }
    }

    let result = finish_paste(
        &app_handle,
        &text,
        auto_submit,
        submit_key,
        settings.clipboard_handling,
        clipboard_paste_error,
        is_cancelled,
    );
    drop(permit);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    #[tokio::test(flavor = "current_thread")]
    async fn cancellation_while_waiting_for_paste_lock_does_not_wait_for_previous_paste() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let first_paste = lock.clone().lock_owned().await;
        let cancelled = AtomicBool::new(false);
        let check = || cancelled.load(Ordering::Acquire);
        let waiting = acquire_paste_lock(Arc::clone(&lock), &check);
        tokio::pin!(waiting);
        assert!(
            tokio::time::timeout(Duration::from_millis(50), waiting.as_mut())
                .await
                .is_err()
        );

        cancelled.store(true, Ordering::Release);
        assert!(
            tokio::time::timeout(Duration::from_secs(1), waiting.as_mut())
                .await
                .expect("cancelled waiter returns without clipboard access")
                .is_none()
        );
        assert!(
            lock.try_lock().is_err(),
            "the active paste still owns its snapshot"
        );
        drop(first_paste);
        assert!(lock.try_lock().is_ok());
    }

    #[tokio::test(flavor = "current_thread")]
    async fn blocking_paste_does_not_block_event_loop_and_releases_lock_on_error() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.clone().lock_owned().await;
        let caller_thread = std::thread::current().id();
        let (started_tx, started_rx) = tokio::sync::oneshot::channel();
        let (release_tx, release_rx) = std::sync::mpsc::channel();
        let worker = run_paste_worker(permit, Arc::new(|| false), move |_permit| {
            started_tx.send(std::thread::current().id()).unwrap();
            release_rx
                .recv_timeout(Duration::from_secs(2))
                .expect("event loop releases worker");
            Err("test input failure".to_string())
        });
        tokio::pin!(worker);
        let worker_thread = tokio::select! {
            result = worker.as_mut() => panic!("paste blocked the caller instead of waiting asynchronously: {result:?}"),
            thread = started_rx => thread.expect("worker starts"),
        };
        assert_ne!(worker_thread, caller_thread);
        assert!(lock.try_lock().is_err());
        tokio::time::sleep(Duration::from_millis(10)).await;
        release_tx.send(()).unwrap();
        assert_eq!(worker.await, Err("test input failure".to_string()));
        assert!(lock.try_lock().is_ok());
    }

    #[tokio::test]
    async fn cancelled_worker_never_runs_queued_input_and_releases_paste_lock() {
        let lock = Arc::new(tokio::sync::Mutex::new(()));
        let permit = lock.clone().lock_owned().await;
        run_paste_worker(permit, Arc::new(|| true), |_| {
            panic!("a cancelled queued paste must never produce input")
        })
        .await
        .expect("cancellation is not a paste failure");
        assert!(lock.try_lock().is_ok());
    }

    #[test]
    fn cancelled_paste_skips_long_delays() {
        let started = Instant::now();
        assert!(!wait_unless_cancelled(Duration::from_secs(60), &|| true));
        assert!(started.elapsed() < Duration::from_secs(1));
    }

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
    fn untrusted_output_blocks_settings_and_cli_submit_for_every_paste_method() {
        for paste_method in [
            PasteMethod::CtrlV,
            PasteMethod::CtrlShiftV,
            PasteMethod::ShiftInsert,
            PasteMethod::Direct,
            PasteMethod::ExternalScript,
            PasteMethod::None,
        ] {
            for configured in [false, true] {
                for cli_override in [None, Some("enter"), Some("ctrl+enter"), Some("cmd_enter")] {
                    let (enabled, _) = resolve_auto_submit(
                        configured,
                        AutoSubmitKey::Enter,
                        cli_override,
                        false,
                        paste_method,
                    );
                    assert!(!enabled, "untrusted output must never send a submit key");
                }
            }
        }
    }

    #[test]
    fn trusted_submit_uses_the_cli_key_before_the_configured_key() {
        assert_eq!(
            resolve_auto_submit(
                false,
                AutoSubmitKey::Enter,
                Some("CTRL+ENTER"),
                true,
                PasteMethod::CtrlV,
            ),
            (true, AutoSubmitKey::CtrlEnter)
        );
        assert_eq!(
            resolve_auto_submit(
                true,
                AutoSubmitKey::CmdEnter,
                None,
                true,
                PasteMethod::ShiftInsert,
            ),
            (true, AutoSubmitKey::CmdEnter)
        );
        assert!(
            !resolve_auto_submit(
                true,
                AutoSubmitKey::Enter,
                Some("enter"),
                true,
                PasteMethod::None,
            )
            .0
        );
    }

    #[test]
    fn auto_submit_skips_none_paste_method() {
        assert!(!should_send_auto_submit(true, true, PasteMethod::None));
    }

    #[test]
    fn external_scripts_never_inject_a_delayed_submit_key() {
        for configured in [false, true] {
            for cli_override in [None, Some("enter"), Some("ctrl+enter"), Some("cmd_enter")] {
                let (enabled, _) = resolve_auto_submit(
                    configured,
                    AutoSubmitKey::Enter,
                    cli_override,
                    true,
                    PasteMethod::ExternalScript,
                );
                assert!(
                    !enabled,
                    "script completion may occur after focus has changed"
                );
            }
        }
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

    #[cfg(any(unix, target_os = "windows"))]
    fn test_external_command(unix_script: &str, windows_script: &str) -> tokio::process::Command {
        #[cfg(unix)]
        {
            let _ = windows_script;
            let mut command = tokio::process::Command::new("sh");
            command.args(["-c", unix_script]);
            command
        }
        #[cfg(target_os = "windows")]
        {
            let _ = unix_script;
            let mut command = tokio::process::Command::new("powershell.exe");
            command.args(["-NoProfile", "-NonInteractive", "-Command", windows_script]);
            command
        }
    }

    #[cfg(any(unix, target_os = "windows"))]
    #[tokio::test]
    async fn external_script_delivers_text_via_stdin_without_shell_interpolation() {
        let directory = tempfile::tempdir().expect("create script output directory");
        let output = directory.path().join("script-input.txt");
        let mut command = test_external_command(
            "cat > \"$PHONARA_TEST_OUTPUT\"",
            "[IO.File]::WriteAllText($env:PHONARA_TEST_OUTPUT, [Console]::In.ReadToEnd())",
        );
        command.env("PHONARA_TEST_OUTPUT", &output);
        let text = "literal $(echo injected) `echo injected` ; & | < >\nsecond line";

        run_external_script(command, text, Duration::from_secs(10))
            .await
            .expect("script completes after receiving input");

        assert_eq!(
            std::fs::read_to_string(output).expect("read script input"),
            text
        );
    }

    #[cfg(any(unix, target_os = "windows"))]
    #[tokio::test]
    async fn external_script_timeout_also_bounds_blocked_stdin() {
        let command = test_external_command("exec sleep 10", "Start-Sleep -Seconds 10");
        let text = "x".repeat(4 * 1024 * 1024);
        let started = std::time::Instant::now();

        let error = run_external_script(command, &text, Duration::from_millis(250))
            .await
            .expect_err("a script that never consumes stdin must time out");

        assert!(error.contains("timed out"));
        assert!(started.elapsed() < Duration::from_secs(4));
    }

    #[cfg(any(unix, target_os = "windows"))]
    #[tokio::test]
    async fn cancelled_external_script_cannot_complete_later_in_the_background() {
        let directory = tempfile::tempdir().expect("create script marker directory");
        let ready = directory.path().join("ready.txt");
        let late_output = directory.path().join("late-output.txt");
        let mut command = test_external_command(
            "printf ready > \"$PHONARA_TEST_READY\"; sleep 0.5; printf late > \"$PHONARA_TEST_OUTPUT\"",
            "[IO.File]::WriteAllText($env:PHONARA_TEST_READY, 'ready'); Start-Sleep -Milliseconds 500; [IO.File]::WriteAllText($env:PHONARA_TEST_OUTPUT, 'late')",
        );
        command.env("PHONARA_TEST_READY", &ready);
        command.env("PHONARA_TEST_OUTPUT", &late_output);
        let task = tokio::spawn(async move {
            run_external_script(command, "test", Duration::from_secs(10)).await
        });
        tokio::time::timeout(Duration::from_secs(10), async {
            while !ready.exists() {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .expect("script reaches its cancellable wait");

        task.abort();
        assert!(task
            .await
            .expect_err("script future was cancelled")
            .is_cancelled());
        tokio::time::sleep(Duration::from_millis(750)).await;

        assert!(
            !late_output.exists(),
            "cancelled child must not perform delayed output"
        );
    }

    #[cfg(any(unix, target_os = "windows"))]
    #[tokio::test]
    async fn external_script_nonzero_exit_is_reported() {
        let command = test_external_command("exit 7", "exit 7");
        let error = run_external_script(command, "test", Duration::from_secs(10))
            .await
            .expect_err("failing script must not report a successful paste");
        assert!(error.contains("exit code Some(7)"));
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn external_script_does_not_wait_for_inherited_stdio() {
        use std::fs;
        use std::os::unix::fs::PermissionsExt;

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

        let result = tokio::time::timeout(
            Duration::from_secs(1),
            paste_via_external_script("test", script_path.to_str().unwrap()),
        )
        .await
        .expect("external script should return without waiting for its child");
        fs::remove_file(script_path).expect("remove external script");
        assert!(result.is_ok());
    }
}
