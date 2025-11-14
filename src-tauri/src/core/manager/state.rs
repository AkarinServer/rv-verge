use super::{CoreManager, RunningMode};
use crate::{
    AsyncHandler,
    config::Config,
    core::{handle, logger::CLASH_LOGGER, service},
    logging,
    process::CommandChildGuard,
    utils::{
        dirs,
        init::sidecar_writer,
        logging::{SharedWriter, Type, write_sidecar_log},
    },
};
use anyhow::Result;
use compact_str::CompactString;
use flexi_logger::DeferredNow;
use log::Level;
use scopeguard::defer;
use tauri_plugin_shell::ShellExt as _;

impl CoreManager {
    pub async fn get_clash_logs(&self) -> Result<Vec<CompactString>> {
        match *self.get_running_mode() {
            RunningMode::Service => service::get_clash_logs_by_service().await,
            RunningMode::Sidecar => Ok(CLASH_LOGGER.get_logs().await),
            RunningMode::NotRunning => Ok(Vec::new()),
        }
    }

    pub(super) async fn start_core_by_sidecar(&self) -> Result<()> {
        logging!(info, Type::Core, "Starting core in sidecar mode");

        let config_file = Config::generate_file(crate::config::ConfigType::Run).await?;
        let app_handle = handle::Handle::app_handle();
        let clash_core = Config::verge().await.latest_arc().get_valid_clash_core();
        let config_dir = dirs::app_home_dir()?;

        let (mut rx, child) = app_handle
            .shell()
            .sidecar(clash_core.as_str())?
            .args([
                "-d",
                dirs::path_to_str(&config_dir)?,
                "-f",
                dirs::path_to_str(&config_file)?,
            ])
            .spawn()?;

        let pid = child.pid();
        logging!(trace, Type::Core, "Sidecar started with PID: {}", pid);

        self.set_running_child_sidecar(CommandChildGuard::new(child));
        self.set_running_mode(RunningMode::Sidecar);

        // 关键修复：核心启动后，主动检测连接就绪，而不是等待健康检查
        // 这可以大大减少启动时的等待时间
        let socket_path_str = crate::config::IClashTemp::guard_external_controller_ipc();
        let socket_path = std::path::PathBuf::from(&socket_path_str);
        AsyncHandler::spawn(move || async move {
            use crate::utils::logging::Type;
            use crate::logging;
            use std::time::{Duration, Instant};
            
            logging!(info, Type::Core, "等待核心 socket 就绪: {:?}", socket_path);
            let start = Instant::now();
            let max_wait = Duration::from_secs(10); // 最多等待10秒
            
            // 每200ms检查一次socket是否就绪
            while start.elapsed() < max_wait {
                if socket_path.exists() {
                    // Socket文件存在，再等待一小段时间确保核心完全启动
                    tokio::time::sleep(Duration::from_millis(200)).await;
                    logging!(info, Type::Core, "核心 socket 已就绪，耗时: {:?}", start.elapsed());
                    
                    // 主动触发一次连接尝试，加速连接建立
                    // 使用异步方式获取 mihomo 实例并尝试连接
                    let mihomo = handle::Handle::mihomo().await;
                    // 尝试获取配置来触发连接建立，忽略错误（连接可能还未完全就绪）
                    let _ = mihomo.get_base_config().await;
                    
                    // 关键修复：核心启动后，重新加载配置以确保端口正确监听
                    // 因为核心启动时可能配置没有完全应用
                    // 使用 reload_config 来重新加载配置文件
                    let config_file_str = match dirs::path_to_str(&config_file) {
                        Ok(s) => s.to_string(),
                        Err(e) => {
                            logging!(warn, Type::Core, "无法获取配置文件路径: {}", e);
                            break;
                        }
                    };
                    AsyncHandler::spawn(move || async move {
                        use crate::logging;
                        use crate::utils::logging::Type;
                        use crate::core::handle;
                        
                        // 等待一小段时间确保核心完全启动
                        tokio::time::sleep(Duration::from_millis(500)).await;
                        
                        // 重新加载配置
                        let mihomo_for_reload = handle::Handle::mihomo().await;
                        match mihomo_for_reload.reload_config(true, &config_file_str).await {
                            Ok(_) => {
                                logging!(info, Type::Core, "核心启动后配置已重新加载");
                            }
                            Err(e) => {
                                logging!(warn, Type::Core, "核心启动后重新加载配置失败: {}", e);
                            }
                        }
                    });
                    
                    break;
                }
                tokio::time::sleep(Duration::from_millis(200)).await;
            }
            
            if !socket_path.exists() {
                logging!(warn, Type::Core, "核心 socket 在 {:?} 后仍未就绪", start.elapsed());
            }
        });

        let shared_writer: SharedWriter =
            std::sync::Arc::new(tokio::sync::Mutex::new(sidecar_writer().await?));

        AsyncHandler::spawn(move || async move {
            while let Some(event) = rx.recv().await {
                match event {
                    tauri_plugin_shell::process::CommandEvent::Stdout(line)
                    | tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                        let mut now = DeferredNow::default();
                        let message = CompactString::from(String::from_utf8_lossy(&line).as_ref());
                        write_sidecar_log(
                            shared_writer.lock().await,
                            &mut now,
                            Level::Error,
                            &message,
                        );
                        CLASH_LOGGER.append_log(message).await;
                    }
                    tauri_plugin_shell::process::CommandEvent::Terminated(term) => {
                        let mut now = DeferredNow::default();
                        let message = if let Some(code) = term.code {
                            CompactString::from(format!("Process terminated with code: {}", code))
                        } else if let Some(signal) = term.signal {
                            CompactString::from(format!("Process terminated by signal: {}", signal))
                        } else {
                            CompactString::from("Process terminated")
                        };
                        write_sidecar_log(
                            shared_writer.lock().await,
                            &mut now,
                            Level::Info,
                            &message,
                        );
                        CLASH_LOGGER.clear_logs().await;
                        
                        // 关键修复：进程终止时，更新运行状态为 NotRunning
                        use crate::core::manager::CoreManager;
                        use crate::core::manager::RunningMode;
                        use crate::logging;
                        use crate::utils::logging::Type;
                        CoreManager::global().set_running_mode(RunningMode::NotRunning);
                        logging!(info, Type::Core, "Sidecar进程已终止，运行状态已更新为NotRunning");
                        
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(())
    }

    pub(super) fn stop_core_by_sidecar(&self) -> Result<()> {
        logging!(info, Type::Core, "Stopping sidecar");
        defer! {
            self.set_running_mode(RunningMode::NotRunning);
        }
        if let Some(child) = self.take_child_sidecar() {
            let pid = child.pid();
            drop(child);
            logging!(trace, Type::Core, "Sidecar stopped (PID: {:?})", pid);
        }
        Ok(())
    }

    pub(super) async fn start_core_by_service(&self) -> Result<()> {
        logging!(info, Type::Core, "Starting core in service mode");
        let config_file = Config::generate_file(crate::config::ConfigType::Run).await?;
        service::run_core_by_service(&config_file).await?;
        self.set_running_mode(RunningMode::Service);
        Ok(())
    }

    pub(super) async fn stop_core_by_service(&self) -> Result<()> {
        logging!(info, Type::Core, "Stopping service");
        defer! {
            self.set_running_mode(RunningMode::NotRunning);
        }
        service::stop_core_by_service().await?;
        Ok(())
    }
}
