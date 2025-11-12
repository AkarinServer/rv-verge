#![allow(non_snake_case)]
#![recursion_limit = "512"]

use tauri::Manager;

pub fn run() {
    // Minimal Tauri application setup for testing
    // Full implementation will be added in next steps

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_http::init())
        // TODO: Add mihomo plugin when config module is ready
        // .plugin(tauri_plugin_mihomo::Builder::new()...)
        .setup(|app| {
            // Basic setup - just log that app is starting
            println!("RV Verge - Application starting...");
            
            // Get the main window and set title
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("RV Verge");
            }
            
            Ok(())
        });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

