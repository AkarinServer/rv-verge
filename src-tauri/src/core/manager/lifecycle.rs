use super::{CoreManager, RunningMode};
use crate::config::{Config, ConfigType, IVerge};
use crate::{
    core::{
        logger::CLASH_LOGGER,
        service::{SERVICE_MANAGER, ServiceStatus},
    },
    logging,
    utils::logging::Type,
};
use anyhow::Result;
use smartstring::alias::String;

impl CoreManager {
    pub async fn start_core(&self) -> Result<()> {
        logging!(info, Type::Core, "[start_core] 开始执行核心启动流程");
        eprintln!("[Core Startup] Starting core startup process");
        
        logging!(info, Type::Core, "[start_core] 步骤1: 准备启动环境");
        eprintln!("[Core Startup] Step 1: Preparing startup environment");
        match self.prepare_startup().await {
            Ok(_) => {
                logging!(info, Type::Core, "[start_core] 步骤1完成: 启动环境准备成功");
                eprintln!("[Core Startup] Step 1 completed: Startup environment prepared successfully");
            }
            Err(e) => {
                logging!(error, Type::Core, "[start_core] 步骤1失败: 启动环境准备失败: {}", e);
                logging!(error, Type::Core, "[start_core] 步骤1失败详情: {:#}", e);
                eprintln!("[Core Startup] Step 1 failed: Failed to prepare startup environment: {}", e);
                eprintln!("[Core Startup] Step 1 failure details: {:#}", e);
                return Err(e);
            }
        }

        let running_mode = (*self.get_running_mode()).clone();
        logging!(info, Type::Core, "[start_core] 步骤2: 确定运行模式: {:?}", running_mode);
        eprintln!("[Core Startup] Step 2: Determined running mode: {:?}", running_mode);
        
        logging!(info, Type::Core, "[start_core] 步骤3: 根据运行模式启动核心");
        eprintln!("[Core Startup] Step 3: Starting core based on running mode");
        let result = match running_mode {
            RunningMode::Service => {
                logging!(info, Type::Core, "[start_core] 使用 Service 模式启动");
                eprintln!("[Core Startup] Using Service mode to start");
                self.start_core_by_service().await
            }
            RunningMode::NotRunning | RunningMode::Sidecar => {
                logging!(info, Type::Core, "[start_core] 使用 Sidecar 模式启动");
                eprintln!("[Core Startup] Using Sidecar mode to start");
                self.start_core_by_sidecar().await
            }
        };
        
        match &result {
            Ok(_) => {
                logging!(info, Type::Core, "[start_core] 步骤3完成: 核心启动成功");
                eprintln!("[Core Startup] Step 3 completed: Core started successfully");
            }
            Err(e) => {
                logging!(error, Type::Core, "[start_core] 步骤3失败: 核心启动失败: {}", e);
                logging!(error, Type::Core, "[start_core] 步骤3失败详情: {:#}", e);
                eprintln!("[Core Startup] Step 3 failed: Core startup failed: {}", e);
                eprintln!("[Core Startup] Step 3 failure details: {:#}", e);
            }
        }
        
        result
    }

    pub async fn stop_core(&self) -> Result<()> {
        CLASH_LOGGER.clear_logs().await;

        match *self.get_running_mode() {
            RunningMode::Service => self.stop_core_by_service().await,
            RunningMode::Sidecar => self.stop_core_by_sidecar(),
            RunningMode::NotRunning => Ok(()),
        }
    }

    pub async fn restart_core(&self) -> Result<()> {
        logging!(info, Type::Core, "Restarting core");
        self.stop_core().await?;

        if SERVICE_MANAGER.lock().await.init().await.is_ok() {
            let _ = SERVICE_MANAGER.lock().await.refresh().await;
        }

        self.start_core().await
    }

    pub async fn change_core(&self, clash_core: &String) -> Result<(), String> {
        if !IVerge::VALID_CLASH_CORES.contains(&clash_core.as_str()) {
            return Err(format!("Invalid clash core: {}", clash_core).into());
        }

        Config::verge().await.edit_draft(|d| {
            d.clash_core = Some(clash_core.to_owned());
        });
        Config::verge().await.apply();

        let verge_data = Config::verge().await.latest_arc();
        verge_data.save_file().await.map_err(|e| e.to_string())?;

        let run_path = Config::generate_file(ConfigType::Run)
            .await
            .map_err(|e| e.to_string())?;

        self.apply_config(run_path)
            .await
            .map_err(|e| e.to_string().into())
    }

    async fn prepare_startup(&self) -> Result<()> {
        logging!(info, Type::Core, "[prepare_startup] 开始准备启动环境");
        eprintln!("[Core Startup] [prepare_startup] Starting to prepare startup environment");
        
        #[cfg(target_os = "windows")]
        {
            logging!(info, Type::Core, "[prepare_startup] Windows平台: 检查是否需要等待服务");
            eprintln!("[Core Startup] [prepare_startup] Windows platform: Checking if service wait is needed");
            self.wait_for_service_if_needed().await;
        }

        logging!(info, Type::Core, "[prepare_startup] 检查服务管理器状态");
        eprintln!("[Core Startup] [prepare_startup] Checking service manager status");
        let value = SERVICE_MANAGER.lock().await.current();
        logging!(info, Type::Core, "[prepare_startup] 服务状态: {:?}", value);
        eprintln!("[Core Startup] [prepare_startup] Service status: {:?}", value);
        
        let mode = match value {
            ServiceStatus::Ready => {
                logging!(info, Type::Core, "[prepare_startup] 服务已就绪，使用 Service 模式");
                eprintln!("[Core Startup] [prepare_startup] Service is ready, using Service mode");
                RunningMode::Service
            }
            _ => {
                logging!(info, Type::Core, "[prepare_startup] 服务未就绪，使用 Sidecar 模式");
                eprintln!("[Core Startup] [prepare_startup] Service not ready, using Sidecar mode");
                RunningMode::Sidecar
            }
        };

        logging!(info, Type::Core, "[prepare_startup] 设置运行模式: {:?}", mode);
        eprintln!("[Core Startup] [prepare_startup] Setting running mode: {:?}", mode);
        self.set_running_mode(mode);
        logging!(info, Type::Core, "[prepare_startup] 启动环境准备完成");
        eprintln!("[Core Startup] [prepare_startup] Startup environment preparation completed");
        Ok(())
    }

    #[cfg(target_os = "windows")]
    async fn wait_for_service_if_needed(&self) {
        use crate::{config::Config, constants::timing};
        use backoff::{Error as BackoffError, ExponentialBackoff};

        let needs_service = Config::verge()
            .await
            .latest_arc()
            .enable_tun_mode
            .unwrap_or(false);

        if !needs_service {
            return;
        }

        let backoff = ExponentialBackoff {
            initial_interval: timing::SERVICE_WAIT_INTERVAL,
            max_interval: timing::SERVICE_WAIT_INTERVAL,
            max_elapsed_time: Some(timing::SERVICE_WAIT_MAX),
            multiplier: 1.0,
            randomization_factor: 0.0,
            ..Default::default()
        };

        let operation = || async {
            let mut manager = SERVICE_MANAGER.lock().await;

            if matches!(manager.current(), ServiceStatus::Ready) {
                return Ok(());
            }

            manager.init().await.map_err(BackoffError::transient)?;
            let _ = manager.refresh().await;

            if matches!(manager.current(), ServiceStatus::Ready) {
                Ok(())
            } else {
                Err(BackoffError::transient(anyhow::anyhow!(
                    "Service not ready"
                )))
            }
        };

        let _ = backoff::future::retry(backoff, operation).await;
    }
}
