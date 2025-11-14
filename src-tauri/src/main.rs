#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    // Output startup info to stderr immediately, so it's visible from command line
    eprintln!("========================================");
    eprintln!("[RV Verge] Rust backend starting...");
    eprintln!("========================================");
    
    // Output version info
    eprintln!("[RV Verge] Version: {}", env!("CARGO_PKG_VERSION"));
    
    #[cfg(feature = "tokio-trace")]
    {
        eprintln!("[RV Verge] Initializing tokio-trace...");
        console_subscriber::init();
    }

    // Check for --no-tray command line argument
    #[cfg(target_os = "linux")]
    if std::env::args().any(|x| x == "--no-tray") {
        eprintln!("[RV Verge] Detected --no-tray argument, disabling system tray");
        unsafe {
            std::env::set_var("CLASH_VERGE_DISABLE_TRAY", "1");
        }
    }
    
    eprintln!("[RV Verge] Calling app_lib::run()...");
    
    // Capture panic and output
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        eprintln!("[RV Verge] FATAL: Rust backend panicked!");
        eprintln!("[RV Verge] Location: {:?}", panic_info.location());
        eprintln!("[RV Verge] Message: {:?}", panic_info.payload().downcast_ref::<&str>());
        default_hook(panic_info);
    }));
    
    app_lib::run();
    
    eprintln!("[RV Verge] app_lib::run() returned");
}
