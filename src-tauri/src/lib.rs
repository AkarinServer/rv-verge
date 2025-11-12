#![allow(non_snake_case)]
#![recursion_limit = "512"]

use tauri::Manager;

pub fn run() {
    // Minimal Tauri application setup
    // This is a simplified version for testing
    // Full implementation will be added in next steps

    let builder = tauri::Builder::default()
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
