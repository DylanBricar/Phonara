use log::info;
use std::process::Command;

const GSETTINGS_SCHEMA: &str = "org.gnome.settings-daemon.plugins.media-keys";
const CUSTOM_KEYBINDING_BASE: &str = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/phonara0/";

pub fn register_gnome_shortcut(shortcut_key: &str) -> Result<(), String> {
    let _custom_path = format!("{}custom-keybindings", GSETTINGS_SCHEMA.replace('.', "/").replace("org/", "/org/"));

    let current = Command::new("gsettings")
        .args(["get", GSETTINGS_SCHEMA, "custom-keybindings"])
        .output()
        .map_err(|e| format!("gsettings not available: {}", e))?;

    let current_str = String::from_utf8_lossy(&current.stdout).trim().to_string();
    let binding_path = format!("'{}'", CUSTOM_KEYBINDING_BASE);

    let new_list = if current_str == "@as []" || current_str.is_empty() {
        format!("[{}]", binding_path)
    } else if !current_str.contains(CUSTOM_KEYBINDING_BASE) {
        let trimmed = current_str.trim_end_matches(']');
        format!("{}, {}]", trimmed, binding_path)
    } else {
        current_str
    };

    run_gsettings("set", GSETTINGS_SCHEMA, "custom-keybindings", &new_list)?;

    let schema = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding";
    run_gsettings_with_path("set", schema, CUSTOM_KEYBINDING_BASE, "name", "Phonara Transcribe")?;
    run_gsettings_with_path("set", schema, CUSTOM_KEYBINDING_BASE, "command", "pkill -SIGUSR2 -n phonara")?;
    run_gsettings_with_path("set", schema, CUSTOM_KEYBINDING_BASE, "binding", shortcut_key)?;

    info!("Registered GNOME shortcut: {}", shortcut_key);
    Ok(())
}

pub fn unregister_gnome_shortcut() -> Result<(), String> {
    let current = Command::new("gsettings")
        .args(["get", GSETTINGS_SCHEMA, "custom-keybindings"])
        .output()
        .map_err(|e| format!("gsettings not available: {}", e))?;

    let current_str = String::from_utf8_lossy(&current.stdout).trim().to_string();
    if current_str.contains(CUSTOM_KEYBINDING_BASE) {
        let new_list = current_str
            .replace(&format!("'{}'", CUSTOM_KEYBINDING_BASE), "")
            .replace(", ,", ",")
            .replace("[,", "[")
            .replace(",]", "]")
            .replace("[, ", "[");

        let new_list = if new_list.trim() == "[]" || new_list.trim() == "[,]" {
            "@as []".to_string()
        } else {
            new_list
        };

        run_gsettings("set", GSETTINGS_SCHEMA, "custom-keybindings", &new_list)?;
    }

    info!("Unregistered GNOME shortcut");
    Ok(())
}

fn run_gsettings(action: &str, schema: &str, key: &str, value: &str) -> Result<(), String> {
    let output = Command::new("gsettings")
        .args([action, schema, key, value])
        .output()
        .map_err(|e| format!("gsettings {} failed to spawn: {}", action, e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("gsettings {} {}.{} failed: {}", action, schema, key, stderr.trim()));
    }
    Ok(())
}

fn run_gsettings_with_path(action: &str, schema: &str, path: &str, key: &str, value: &str) -> Result<(), String> {
    let output = Command::new("gsettings")
        .args([action, &format!("{}:{}", schema, path), key, value])
        .output()
        .map_err(|e| format!("gsettings {} failed to spawn: {}", action, e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("gsettings {} {}:{}.{} failed: {}", action, schema, path, key, stderr.trim()));
    }
    Ok(())
}

pub fn is_gnome_session() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP")
        .map(|d| d.to_lowercase().contains("gnome"))
        .unwrap_or(false)
}
