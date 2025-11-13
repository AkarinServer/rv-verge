use tauri::{Manager, WebviewWindow};

use crate::{
    config::Config,
    core::handle,
    logging, logging_error,
    utils::{
        logging::Type,
        resolve::window_script::{INITIAL_LOADING_OVERLAY, WINDOW_INITIAL_SCRIPT},
    },
};

// 定义默认窗口尺寸常量
const DEFAULT_WIDTH: f64 = 940.0;
const DEFAULT_HEIGHT: f64 = 700.0;

const MINIMAL_WIDTH: f64 = 520.0;
const MINIMAL_HEIGHT: f64 = 520.0;

/// 构建新的 WebView 窗口
pub async fn build_new_window() -> Result<WebviewWindow, String> {
    logging!(info, Type::Window, "开始构建新窗口...");
    let app_handle = handle::Handle::app_handle();

    // 检查窗口是否已存在（可能从配置文件创建）
    if let Some(existing_window) = app_handle.get_webview_window("main") {
        logging!(info, Type::Window, "窗口已从配置文件创建，直接返回");
        return Ok(existing_window);
    }

    let config = Config::verge().await;
    let latest = config.latest_arc();
    let start_page = latest.start_page.as_deref().unwrap_or("/");
    logging!(info, Type::Window, "起始页面: {}", start_page);

    match tauri::WebviewWindowBuilder::new(
        app_handle,
        "main", /* the unique window label */
        tauri::WebviewUrl::App(start_page.into()),
    )
    .title("RV Verge")
    .center()
    // Using WindowManager::prefer_system_titlebar to control if show system built-in titlebar
    // .decorations(true)
    .fullscreen(false)
    .inner_size(DEFAULT_WIDTH, DEFAULT_HEIGHT)
    .min_inner_size(MINIMAL_WIDTH, MINIMAL_HEIGHT)
    .visible(true) // 立即显示窗口，避免用户等待
    .initialization_script(WINDOW_INITIAL_SCRIPT)
    .build()
    {
        Ok(window) => {
            logging!(info, Type::Window, "窗口构建成功");
            logging_error!(Type::Window, window.eval(INITIAL_LOADING_OVERLAY));
            Ok(window)
        }
        Err(e) => {
            logging!(error, Type::Window, "窗口构建失败: {}", e);
            Err(e.to_string())
        }
    }
}
