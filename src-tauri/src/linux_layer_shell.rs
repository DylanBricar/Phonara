//! Minimal GTK3 layer-shell bridge used until Tauri's GTK4 backend is released.
//!
//! The former Rust bindings are unmaintained. Keeping this small FFI surface
//! local preserves the existing overlay behavior without carrying those two
//! crates. Tauri still owns the GTK3 window and remains the blocker for the
//! broader GTK4/WebKitGTK 6 migration.

use gtk::glib::translate::ToGlibPtr;
use gtk::prelude::Cast;
use std::ffi::c_int;

#[derive(Clone, Copy)]
#[repr(i32)]
pub(crate) enum Edge {
    Top = 2,
    Bottom = 3,
}

unsafe extern "C" {
    fn gtk_layer_init_for_window(window: *mut gtk::ffi::GtkWindow);
    fn gtk_layer_is_layer_window(window: *mut gtk::ffi::GtkWindow) -> c_int;
    fn gtk_layer_is_supported() -> c_int;
    fn gtk_layer_set_anchor(window: *mut gtk::ffi::GtkWindow, edge: c_int, anchor_to_edge: c_int);
    fn gtk_layer_set_exclusive_zone(window: *mut gtk::ffi::GtkWindow, exclusive_zone: c_int);
    fn gtk_layer_set_keyboard_mode(window: *mut gtk::ffi::GtkWindow, mode: c_int);
    fn gtk_layer_set_layer(window: *mut gtk::ffi::GtkWindow, layer: c_int);
    fn gtk_layer_set_margin(window: *mut gtk::ffi::GtkWindow, edge: c_int, margin_size: c_int);
}

fn assert_gtk_main_thread() {
    assert!(
        gtk::is_initialized_main_thread(),
        "GTK layer-shell calls must run on the GTK main thread"
    );
}

fn window_pointer(window: &gtk::ApplicationWindow) -> *mut gtk::ffi::GtkWindow {
    let window: &gtk::Window = window.upcast_ref();
    window.to_glib_none().0
}

pub(crate) fn is_supported() -> bool {
    assert_gtk_main_thread();
    // SAFETY: this process has initialized GTK on its main thread.
    unsafe { gtk_layer_is_supported() != 0 }
}

pub(crate) fn initialize(window: &gtk::ApplicationWindow) {
    assert_gtk_main_thread();
    // SAFETY: the pointer belongs to a live GTK window and the call runs before
    // the window is realized, as required by gtk-layer-shell.
    unsafe { gtk_layer_init_for_window(window_pointer(window)) };
}

pub(crate) fn is_layer_window(window: &gtk::ApplicationWindow) -> bool {
    assert_gtk_main_thread();
    // SAFETY: the pointer belongs to a live GTK window on the GTK main thread.
    unsafe { gtk_layer_is_layer_window(window_pointer(window)) != 0 }
}

pub(crate) fn set_anchor(window: &gtk::ApplicationWindow, edge: Edge, anchored: bool) {
    assert_gtk_main_thread();
    // SAFETY: the pointer belongs to a live initialized layer-shell window.
    unsafe {
        gtk_layer_set_anchor(
            window_pointer(window),
            edge as c_int,
            if anchored { 1 } else { 0 },
        )
    };
}

pub(crate) fn set_exclusive_zone(window: &gtk::ApplicationWindow, exclusive_zone: i32) {
    assert_gtk_main_thread();
    // SAFETY: the pointer belongs to a live initialized layer-shell window.
    unsafe { gtk_layer_set_exclusive_zone(window_pointer(window), exclusive_zone) };
}

pub(crate) fn disable_keyboard_input(window: &gtk::ApplicationWindow) {
    const KEYBOARD_MODE_NONE: c_int = 0;

    assert_gtk_main_thread();
    // SAFETY: the pointer belongs to a live initialized layer-shell window.
    unsafe { gtk_layer_set_keyboard_mode(window_pointer(window), KEYBOARD_MODE_NONE) };
}

pub(crate) fn set_overlay_layer(window: &gtk::ApplicationWindow) {
    const LAYER_OVERLAY: c_int = 3;

    assert_gtk_main_thread();
    // SAFETY: the pointer belongs to a live initialized layer-shell window.
    unsafe { gtk_layer_set_layer(window_pointer(window), LAYER_OVERLAY) };
}

pub(crate) fn set_margin(window: &gtk::ApplicationWindow, edge: Edge, margin: i32) {
    assert_gtk_main_thread();
    // SAFETY: the pointer belongs to a live initialized layer-shell window.
    unsafe { gtk_layer_set_margin(window_pointer(window), edge as c_int, margin) };
}

#[cfg(test)]
mod tests {
    use super::Edge;

    #[test]
    fn edge_values_match_the_gtk_layer_shell_abi() {
        assert_eq!(Edge::Top as i32, 2);
        assert_eq!(Edge::Bottom as i32, 3);
    }
}
