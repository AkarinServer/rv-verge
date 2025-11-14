#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    // 立即输出启动信息到 stderr，确保命令行能看到
    eprintln!("========================================");
    eprintln!("[RV Verge] Rust 后端启动中...");
    eprintln!("========================================");
    
    // 输出版本信息
    eprintln!("[RV Verge] 版本: {}", env!("CARGO_PKG_VERSION"));
    
    #[cfg(feature = "tokio-trace")]
    {
        eprintln!("[RV Verge] 初始化 tokio-trace...");
        console_subscriber::init();
    }

    // Check for --no-tray command line argument
    #[cfg(target_os = "linux")]
    if std::env::args().any(|x| x == "--no-tray") {
        eprintln!("[RV Verge] 检测到 --no-tray 参数，禁用系统托盘");
        unsafe {
            std::env::set_var("CLASH_VERGE_DISABLE_TRAY", "1");
        }
    }
    
    eprintln!("[RV Verge] 调用 app_lib::run()...");
    
    // 捕获 panic 并输出
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        eprintln!("[RV Verge] FATAL: Rust 后端发生 panic!");
        eprintln!("[RV Verge] 错误位置: {:?}", panic_info.location());
        eprintln!("[RV Verge] 错误信息: {:?}", panic_info.payload().downcast_ref::<&str>());
        default_hook(panic_info);
    }));
    
    app_lib::run();
    
    eprintln!("[RV Verge] app_lib::run() 已返回");
}
