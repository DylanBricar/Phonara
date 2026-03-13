use crate::input;
use crate::settings;
use crate::settings::OverlayPosition;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};

#[cfg(not(target_os = "macos"))]
use tauri::WebviewWindowBuilder;

#[cfg(target_os = "macos")]
use tauri::WebviewUrl;

#[cfg(target_os = "macos")]
use tauri_nspanel::{tauri_panel, CollectionBehavior, PanelBuilder, PanelLevel};

#[cfg(target_os = "linux")]
use gtk_layer_shell::{Edge, KeyboardMode, Layer, LayerShell};
#[cfg(target_os = "linux")]
use std::env;

#[cfg(target_os = "macos")]
tauri_panel! {
    panel!(RecordingOverlayPanel {
        config: {
            can_become_key_window: false,
            is_floating_panel: true
        }
    })
}

const OVERLAY_WIDTH: f64 = 210.0;
const OVERLAY_HEIGHT: f64 = 44.0;

#[cfg(target_os = "macos")]
const OVERLAY_TOP_OFFSET: f64 = 46.0;
#[cfg(any(target_os = "windows", target_os = "linux"))]
const OVERLAY_TOP_OFFSET: f64 = 4.0;

#[cfg(target_os = "macos")]
const OVERLAY_BOTTOM_OFFSET: f64 = 15.0;

#[cfg(any(target_os = "windows", target_os = "linux"))]
const OVERLAY_BOTTOM_OFFSET: f64 = 40.0;

#[cfg(target_os = "linux")]
fn update_gtk_layer_shell_anchors(overlay_window: &tauri::webview::WebviewWindow) {
    let window_clone = overlay_window.clone();
    let _ = overlay_window.run_on_main_thread(move || {
        if let Ok(gtk_window) = window_clone.gtk_window() {
            let settings = settings::get_settings(window_clone.app_handle());
            match settings.overlay_position {
                OverlayPosition::Top => {
                    gtk_window.set_anchor(Edge::Top, true);
                    gtk_window.set_anchor(Edge::Bottom, false);
                }
                OverlayPosition::Bottom | OverlayPosition::None => {
                    gtk_window.set_anchor(Edge::Bottom, true);
                    gtk_window.set_anchor(Edge::Top, false);
                }
            }
        }
    });
}

#[cfg(target_os = "linux")]
fn init_gtk_layer_shell(overlay_window: &tauri::webview::WebviewWindow) -> bool {
    let is_wayland = env::var("WAYLAND_DISPLAY").is_ok()
        || env::var("XDG_SESSION_TYPE")
            .map(|v| v.eq_ignore_ascii_case("wayland"))
            .unwrap_or(false);
    let is_kde = env::var("XDG_CURRENT_DESKTOP")
        .map(|v| v.to_uppercase().contains("KDE"))
        .unwrap_or(false)
        || env::var("KDE_SESSION_VERSION").is_ok();
    if is_wayland && is_kde {
        return false;
    }

    if !gtk_layer_shell::is_supported() {
        return false;
    }

    if let Ok(gtk_window) = overlay_window.gtk_window() {
        gtk_window.init_layer_shell();
        gtk_window.set_layer(Layer::Overlay);
        gtk_window.set_keyboard_mode(KeyboardMode::None);
        gtk_window.set_exclusive_zone(0);

        update_gtk_layer_shell_anchors(overlay_window);

        return true;
    }
    false
}

#[cfg(target_os = "windows")]
fn force_overlay_topmost(overlay_window: &tauri::webview::WebviewWindow) {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, SetWindowPos, GWL_EXSTYLE, HWND_TOPMOST, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
    };

    let overlay_clone = overlay_window.clone();

    let _ = overlay_clone.clone().run_on_main_thread(move || {
        if let Ok(hwnd) = overlay_clone.hwnd() {
            unsafe {
                let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
                let new_style = ex_style | WS_EX_NOACTIVATE.0 | WS_EX_TOOLWINDOW.0;
                SetWindowLongW(hwnd, GWL_EXSTYLE, new_style as i32);

                let _ = SetWindowPos(
                    hwnd,
                    Some(HWND_TOPMOST),
                    0,
                    0,
                    0,
                    0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
                );
            }
        }
    });
}

fn is_point_within_monitor(
    mouse_pos: (i32, i32),
    monitor_pos: &PhysicalPosition<i32>,
    monitor_size: &PhysicalSize<u32>,
) -> bool {
    let (mouse_x, mouse_y) = mouse_pos;
    let PhysicalPosition {
        x: monitor_x,
        y: monitor_y,
    } = *monitor_pos;
    let PhysicalSize {
        width: monitor_width,
        height: monitor_height,
    } = *monitor_size;

    mouse_x >= monitor_x
        && mouse_x < (monitor_x + monitor_width as i32)
        && mouse_y >= monitor_y
        && mouse_y < (monitor_y + monitor_height as i32)
}

fn get_fallback_monitor(
    app_handle: &AppHandle,
    monitors: &[tauri::Monitor],
) -> Option<tauri::Monitor> {
    if let Some(main_window) = app_handle.get_webview_window("main") {
        if let Ok(Some(monitor)) = main_window.current_monitor() {
            return Some(monitor);
        }
    }

    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        if let Ok(Some(monitor)) = overlay_window.current_monitor() {
            return Some(monitor);
        }
    }

    if let Some(monitor) = monitors.iter().max_by_key(|m| {
        let area = m.work_area();
        area.size.width as u64 * area.size.height as u64
    }) {
        return Some(monitor.clone());
    }

    app_handle.primary_monitor().ok().flatten()
}

fn get_monitor_with_cursor(app_handle: &AppHandle) -> Option<tauri::Monitor> {
    let monitors = app_handle.available_monitors().unwrap_or_default();

    if let Some((mouse_x, mouse_y)) = input::get_cursor_position(app_handle) {
        if let Ok(Some(monitor)) = app_handle.monitor_from_point(mouse_x as f64, mouse_y as f64) {
            return Some(monitor);
        }

        for monitor in &monitors {
            if is_point_within_monitor((mouse_x, mouse_y), monitor.position(), monitor.size()) {
                return Some(monitor.clone());
            }
        }

        #[cfg(target_os = "macos")]
        {
            for monitor in &monitors {
                let scale = monitor.scale_factor();
                let pos = monitor.position();
                let size = monitor.size();

                let logical_pos = PhysicalPosition {
                    x: (pos.x as f64 / scale).round() as i32,
                    y: (pos.y as f64 / scale).round() as i32,
                };
                let logical_size = PhysicalSize {
                    width: (size.width as f64 / scale).round() as u32,
                    height: (size.height as f64 / scale).round() as u32,
                };

                if is_point_within_monitor((mouse_x, mouse_y), &logical_pos, &logical_size) {
                    return Some(monitor.clone());
                }

                let scaled_cursor = (
                    (mouse_x as f64 * scale).round() as i32,
                    (mouse_y as f64 * scale).round() as i32,
                );
                if is_point_within_monitor(scaled_cursor, monitor.position(), monitor.size()) {
                    return Some(monitor.clone());
                }
            }
        }
    }

    get_fallback_monitor(app_handle, &monitors)
}

fn calculate_overlay_position(app_handle: &AppHandle) -> Option<(f64, f64)> {
    if let Some(monitor) = get_monitor_with_cursor(app_handle) {
        let scale = monitor.scale_factor();
        let monitor_x = monitor.position().x as f64 / scale;
        let monitor_y = monitor.position().y as f64 / scale;
        let monitor_width = monitor.size().width as f64 / scale;
        let monitor_height = monitor.size().height as f64 / scale;

        let work_area = monitor.work_area();
        let wa_x = work_area.position.x as f64 / scale;
        let wa_y = work_area.position.y as f64 / scale;
        let wa_w = work_area.size.width as f64 / scale;
        let wa_h = work_area.size.height as f64 / scale;

        let wa_bottom = wa_y + wa_h;
        let monitor_bottom = monitor_y + monitor_height;
        let work_area_valid =
            wa_y >= monitor_y && wa_bottom <= monitor_bottom + 1.0 && wa_w <= monitor_width + 1.0;

        let (area_x, area_y, area_w, area_h) = if work_area_valid {
            (wa_x, wa_y, wa_w, wa_h)
        } else {
            let menu_bar_offset = 25.0;
            (
                monitor_x,
                monitor_y + menu_bar_offset,
                monitor_width,
                monitor_height - menu_bar_offset,
            )
        };

        let settings = settings::get_settings(app_handle);
        let (ow, oh) = get_overlay_dimensions(&settings);

        let x = area_x + (area_w - ow) / 2.0;
        let y = match settings.overlay_position {
            OverlayPosition::Top => area_y + OVERLAY_TOP_OFFSET,
            OverlayPosition::Bottom | OverlayPosition::None => {
                area_y + area_h - oh - OVERLAY_BOTTOM_OFFSET
            }
        };

        return Some((x, y));
    }
    None
}

#[cfg(not(target_os = "macos"))]
pub fn create_recording_overlay(app_handle: &AppHandle) {
    let position = calculate_overlay_position(app_handle);

    #[cfg(not(target_os = "linux"))]
    if position.is_none() {
        return;
    }

    let mut builder = WebviewWindowBuilder::new(
        app_handle,
        "recording_overlay",
        tauri::WebviewUrl::App("src/overlay/index.html".into()),
    )
    .title("Recording")
    .resizable(false)
    .inner_size(OVERLAY_WIDTH, OVERLAY_HEIGHT)
    .shadow(false)
    .maximizable(false)
    .minimizable(false)
    .closable(false)
    .accept_first_mouse(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .transparent(true)
    .focused(false)
    .visible(false);

    if let Some((x, y)) = position {
        builder = builder.position(x, y);
    }

    match builder.build() {
        Ok(_window) => {
            #[cfg(target_os = "linux")]
            {
                init_gtk_layer_shell(&_window);
            }
        }
        Err(_) => {}
    }
}

#[cfg(target_os = "macos")]
pub fn create_recording_overlay(app_handle: &AppHandle) {
    if let Some((x, y)) = calculate_overlay_position(app_handle) {
        match PanelBuilder::<_, RecordingOverlayPanel>::new(app_handle, "recording_overlay")
            .url(WebviewUrl::App("src/overlay/index.html".into()))
            .title("Recording")
            .position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
            .level(PanelLevel::Status)
            .size(tauri::Size::Logical(tauri::LogicalSize {
                width: OVERLAY_WIDTH,
                height: OVERLAY_HEIGHT,
            }))
            .has_shadow(false)
            .transparent(true)
            .no_activate(true)
            .corner_radius(0.0)
            .with_window(|w| w.decorations(false).transparent(true))
            .collection_behavior(
                CollectionBehavior::new()
                    .can_join_all_spaces()
                    .full_screen_auxiliary(),
            )
            .build()
        {
            Ok(panel) => {
                let _ = panel.hide();
            }
            Err(e) => {
                log::error!("Failed to create recording overlay panel: {}", e);
            }
        }
    }
}

fn sanitize_color(color: &Option<String>) -> Option<String> {
    color.as_ref().and_then(|c| {
        let trimmed = c.trim();
        if (trimmed.len() == 7 || trimmed.len() == 4)
            && trimmed.starts_with('#')
            && trimmed[1..].chars().all(|ch| ch.is_ascii_hexdigit())
        {
            Some(trimmed.to_string())
        } else {
            None
        }
    })
}

fn get_overlay_dimensions(settings: &settings::AppSettings) -> (f64, f64) {
    let w = (settings.overlay_custom_width.max(120).min(500) as f64) + 10.0;
    let h = (settings.overlay_custom_height.max(30).min(80) as f64) + 4.0;
    (w, h)
}

fn show_overlay_state(app_handle: &AppHandle, state: &str) {
    let settings = settings::get_settings(app_handle);
    if settings.overlay_position == OverlayPosition::None {
        return;
    }

    update_overlay_position(app_handle);

    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let (w, h) = get_overlay_dimensions(&settings);
        let _ = overlay_window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: w,
            height: h,
        }));

        let _ = overlay_window.show();

        #[cfg(target_os = "windows")]
        force_overlay_topmost(&overlay_window);

        let _ = overlay_window.emit(
            "show-overlay",
            serde_json::json!({
                "state": state,
                "borderColor": sanitize_color(&settings.overlay_border_color),
                "backgroundColor": sanitize_color(&settings.overlay_background_color),
                "borderWidth": settings.overlay_border_width.min(10),
                "customWidth": settings.overlay_custom_width.max(120).min(500),
                "customHeight": settings.overlay_custom_height.max(30).min(80)
            }),
        );
    }
}

pub fn show_recording_overlay(app_handle: &AppHandle) {
    show_overlay_state(app_handle, "recording");
}

pub fn show_transcribing_overlay(app_handle: &AppHandle) {
    show_overlay_state(app_handle, "transcribing");
}

pub fn show_processing_overlay(app_handle: &AppHandle) {
    show_overlay_state(app_handle, "processing");
}

pub fn preview_overlay(app_handle: &AppHandle) {
    show_overlay_state(app_handle, "recording");

    let app_clone = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;
        hide_recording_overlay(&app_clone);
    });
}

pub fn update_overlay_position(app_handle: &AppHandle) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        #[cfg(target_os = "linux")]
        {
            update_gtk_layer_shell_anchors(&overlay_window);
        }

        if let Some((x, y)) = calculate_overlay_position(app_handle) {
            let _ = overlay_window
                .set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
        }
    }
}

pub fn hide_recording_overlay(app_handle: &AppHandle) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let _ = overlay_window.emit("hide-overlay", ());
        let app_clone = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            if let Some(window) = app_clone.get_webview_window("recording_overlay") {
                let _ = window.hide();
            }
        });
    }
}

pub fn emit_action_selected(app_handle: &AppHandle, key: u8, name: &str) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let _ = overlay_window.emit(
            "action-selected",
            serde_json::json!({ "key": key, "name": name }),
        );
    }
}

pub fn emit_action_deselected(app_handle: &AppHandle) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let _ = overlay_window.emit("action-deselected", ());
    }
}

pub fn emit_recording_paused(app_handle: &AppHandle, paused: bool) {
    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let _ = overlay_window.emit("recording-paused", paused);
    }
}

pub fn emit_levels(app_handle: &AppHandle, levels: &Vec<f32>) {
    let _ = app_handle.emit("mic-level", levels);

    if let Some(overlay_window) = app_handle.get_webview_window("recording_overlay") {
        let _ = overlay_window.emit("mic-level", levels);
    }
}
