#![allow(non_snake_case)]
#![recursion_limit = "512"]

mod cmd;

use tauri::Manager;

pub fn run() {
    // Minimal Tauri application setup for testing
    // Full implementation will be added in next steps

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        // TODO: Add updater plugin when update server is ready
        // .plugin(tauri_plugin_updater::Builder::new().build())
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
        .invoke_handler(tauri::generate_handler![
            cmd::get_verge_config,
            cmd::patch_verge_config,
            cmd::get_runtime_config,
            cmd::patch_clash_config,
            cmd::patch_clash_mode,
            cmd::get_profiles,
            cmd::patch_profiles_config,
            cmd::create_profile,
            cmd::delete_profile,
            cmd::get_clash_logs,
            cmd::clear_logs,
            cmd::get_sys_proxy,
            cmd::get_running_mode,
            cmd::get_app_uptime,
            cmd::restart_app,
            cmd::exit_app,
            cmd::get_app_dir,
            cmd::open_app_dir,
        ])
        .setup(|_app| {
            // Basic setup - just log that app is starting
            println!("RV Verge - Application starting...");
            Ok(())
        });

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Create window on app ready event (like clash-verge-rev does)
    app.run(|app_handle, event| {
        match event {
            tauri::RunEvent::Ready | tauri::RunEvent::Resumed => {
                // Create the main window when app is ready
                // This ensures the window uses WebviewUrl::App("/") to load index.html
                if app_handle.get_webview_window("main").is_none() {
                    match tauri::WebviewWindowBuilder::new(
                        app_handle,
                        "main",
                        tauri::WebviewUrl::App("/".into()),
                    )
                    .title("RV Verge")
                    .inner_size(1200.0, 800.0)
                    .resizable(true)
                    .fullscreen(false)
                    .visible(true)
                    .build()
                    {
                        Ok(window) => {
                            println!("RV Verge - Main window created successfully: {:?}", window.label());
                        }
                        Err(e) => {
                            eprintln!("RV Verge - Failed to create main window: {}", e);
                        }
                    }
                }
            }
            _ => {}
        }
    });
}

