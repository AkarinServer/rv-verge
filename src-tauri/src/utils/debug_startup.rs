/// 启动诊断工具 - 检测启动过程中的阻塞点
use crate::logging;
use crate::utils::logging::Type;
use std::time::{Duration, Instant};

pub struct StartupProfiler {
    stages: Vec<(String, Instant, Option<Duration>)>,
}

impl StartupProfiler {
    pub fn new() -> Self {
        Self {
            stages: Vec::new(),
        }
    }

    pub fn start_stage(&mut self, name: &str) {
        let now = Instant::now();
        self.stages.push((name.to_string(), now, None));
        eprintln!("[启动诊断] 开始阶段: {}", name);
        logging!(info, Type::Setup, "[启动诊断] 开始阶段: {}", name);
    }

    pub fn end_stage(&mut self, name: &str) {
        let now = Instant::now();
        if let Some(stage) = self.stages.iter_mut().find(|s| s.0 == name && s.2.is_none()) {
            let duration = now.duration_since(stage.1);
            stage.2 = Some(duration);
            eprintln!("[启动诊断] 完成阶段: {} (耗时: {:?})", name, duration);
            logging!(info, Type::Setup, "[启动诊断] 完成阶段: {} (耗时: {:?})", name, duration);
            
            // 如果某个阶段耗时超过 1 秒，发出警告
            if duration > Duration::from_secs(1) {
                eprintln!("[启动诊断] ⚠️  警告: {} 耗时过长: {:?}", name, duration);
                logging!(warn, Type::Setup, "[启动诊断] ⚠️  警告: {} 耗时过长: {:?}", name, duration);
            }
        }
    }

    pub fn print_summary(&self) {
        eprintln!("\n[启动诊断] ========== 启动性能摘要 ==========");
        logging!(info, Type::Setup, "\n[启动诊断] ========== 启动性能摘要 ==========");
        
        let mut total = Duration::ZERO;
        for (name, start, duration) in &self.stages {
            if let Some(dur) = duration {
                total += *dur;
                eprintln!("[启动诊断] {}: {:?}", name, dur);
                logging!(info, Type::Setup, "[启动诊断] {}: {:?}", name, dur);
            } else {
                eprintln!("[启动诊断] {}: 进行中... (已运行: {:?})", name, start.elapsed());
                logging!(warn, Type::Setup, "[启动诊断] {}: 进行中... (已运行: {:?})", name, start.elapsed());
            }
        }
        
        eprintln!("[启动诊断] 总耗时: {:?}", total);
        eprintln!("[启动诊断] ======================================\n");
        logging!(info, Type::Setup, "[启动诊断] 总耗时: {:?}", total);
    }
}

impl Default for StartupProfiler {
    fn default() -> Self {
        Self::new()
    }
}

/// 带超时的异步函数执行包装器
pub async fn with_timeout<F, T>(
    name: &str,
    timeout: Duration,
    future: F,
) -> Result<T, String>
where
    F: std::future::Future<Output = T>,
{
    let start = Instant::now();
    eprintln!("[启动诊断] 开始执行: {} (超时: {:?})", name, timeout);
    
    match tokio::time::timeout(timeout, future).await {
        Ok(result) => {
            let elapsed = start.elapsed();
            eprintln!("[启动诊断] ✓ {} 完成 (耗时: {:?})", name, elapsed);
            Ok(result)
        }
        Err(_) => {
            let elapsed = start.elapsed();
            eprintln!("[启动诊断] ✗ {} 超时 (已运行: {:?}, 超时限制: {:?})", name, elapsed, timeout);
            Err(format!("{} 超时 (已运行: {:?})", name, elapsed))
        }
    }
}

