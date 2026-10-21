#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::Parser;
use phonara_app_lib::CliArgs;

fn main() {
    // Handle the private inference protocol before clap/Tauri initialization.
    // The child must never open a webview, settings store, or single-instance IPC.
    if phonara_app_lib::engine_supervisor::is_worker_invocation() {
        std::process::exit(phonara_app_lib::engine_supervisor::run_worker());
    }

    let cli_args = CliArgs::parse();

    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    phonara_app_lib::run(cli_args)
}
