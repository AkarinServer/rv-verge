import { listen } from "@tauri-apps/api/event";
import React, { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  getBaseConfig,
  getRuleProviders,
  getRules,
} from "tauri-plugin-mihomo-api";

import { useVerge } from "@/hooks/use-verge";
import {
  calcuProxies,
  calcuProxyProviders,
  getAppUptime,
  getRuntimeConfig,
  getRunningMode,
  getSystemProxy,
  startCore,
} from "@/services/cmds";
import { SWR_DEFAULTS, SWR_REALTIME, SWR_SLOW_POLL } from "@/services/config";

import { AppDataContext, AppDataContextType } from "./app-data-context";

export const AppDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { verge } = useVerge();

  const { data: proxiesData, mutate: refreshProxy } = useSWR(
    "getProxies",
    async () => {
      try {
        return await calcuProxies();
      } catch (error) {
        console.warn("[DataProvider] calcuProxies failed:", error);
        // Return default proxy structure
        return {
          global: {
            name: "GLOBAL",
            type: "select",
            all: [],
            now: "",
          },
          direct: {
            name: "DIRECT",
            type: "direct",
          },
          groups: [],
          records: {},
          proxies: [],
        };
      }
    },
    {
      ...SWR_REALTIME,
      onError: (err) => console.warn("[DataProvider] Proxy fetch failed:", err),
    },
  );

  const { data: clashConfig, mutate: refreshClashConfig } = useSWR(
    "getClashConfig",
    async () => {
      // 添加超时机制，避免长时间等待
      const timeout = (ms: number) => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timeout")), ms)
        );

      try {
        // Try to get config from mihomo API first with timeout
        return await Promise.race([
          getBaseConfig(),
          timeout(5000), // 5秒超时
        ]);
      } catch (error) {
        console.warn("[DataProvider] getBaseConfig failed, using runtime config:", error);
        // Fallback to runtime config from Rust backend
        try {
          return await Promise.race([
            getRuntimeConfig(),
            timeout(3000), // 3秒超时
          ]);
        } catch (err) {
          console.warn("[DataProvider] getRuntimeConfig failed:", err);
          // Return default config as last resort
          // 在启动阶段，返回默认配置而不是抛出错误
          return {
            port: 7890,
            "socks-port": 7891,
            "mixed-port": 7897,
            "allow-lan": false,
            mode: "rule",
            "log-level": "info",
          } as any;
        }
      }
    },
    {
      ...SWR_SLOW_POLL,
      // 关键修复：启动时快速重试，不要等待太久
      errorRetryCount: 10, // 增加重试次数，但缩短间隔
      errorRetryInterval: 500, // 从2秒减少到500ms，快速重试
      // 启动时不立即失败，等待重试
      shouldRetryOnError: true,
      // 启动时立即尝试，不要等待refreshInterval
      revalidateOnMount: true,
      revalidateOnReconnect: true,
    },
  );

  const { data: proxyProviders, mutate: refreshProxyProviders } = useSWR(
    "getProxyProviders",
    async () => {
      try {
        return await calcuProxyProviders();
      } catch (error) {
        console.warn("[DataProvider] calcuProxyProviders failed:", error);
        return {};
      }
    },
    SWR_DEFAULTS,
  );

  const { data: ruleProviders, mutate: refreshRuleProviders } = useSWR(
    "getRuleProviders",
    async () => {
      try {
        return await getRuleProviders();
      } catch (error) {
        console.warn("[DataProvider] getRuleProviders failed:", error);
        return { providers: {} } as any;
      }
    },
    SWR_DEFAULTS,
  );

  const { data: rulesData, mutate: refreshRules } = useSWR(
    "getRules",
    async () => {
      try {
        return await getRules();
      } catch (error) {
        console.warn("[DataProvider] getRules failed:", error);
        return { rules: [] } as any;
      }
    },
    SWR_DEFAULTS,
  );

  useEffect(() => {
    let isUnmounted = false;
    const cleanupFns: Array<() => void> = [];

    const registerCleanup = (fn: () => void) => {
      if (isUnmounted) {
        try {
          fn();
        } catch (error) {
          console.error("[DataProvider] Immediate cleanup failed:", error);
        }
      } else {
        cleanupFns.push(fn);
      }
    };

    const handleRefreshClash = () => {
      refreshProxy().catch((error) =>
        console.error("[DataProvider] Proxy refresh failed:", error),
      );
    };

    const handleRefreshProxy = () => {
      refreshProxy().catch((error) =>
        console.warn("[DataProvider] Proxy refresh failed:", error),
      );
    };

    const initializeListeners = async () => {
      try {
        const unlistenClash = await listen(
          "verge://refresh-clash-config",
          handleRefreshClash,
        );
        const unlistenProxy = await listen(
          "verge://refresh-proxy-config",
          handleRefreshProxy,
        );

        registerCleanup(() => {
          unlistenClash();
          unlistenProxy();
        });
      } catch (error) {
        console.warn("[AppDataProvider] 设置 Tauri 事件监听器失败:", error);
      }
    };

    void initializeListeners();

    // 确保核心在应用启动时被启动
    const ensureCoreStarted = async () => {
      try {
        const runningMode = await getRunningMode();
        if (runningMode === "NotRunning") {
          console.log("[AppDataProvider] 核心未运行，尝试启动...");
          await startCore();
          console.log("[AppDataProvider] 核心启动命令已发送");
        } else {
          console.log("[AppDataProvider] 核心运行状态:", runningMode);
        }
      } catch (error) {
        console.warn("[AppDataProvider] 检查/启动核心失败:", error);
      }
    };

    // 延迟启动核心，确保后端已完全初始化
    const startCoreTimeout = setTimeout(() => {
      void ensureCoreStarted();
    }, 2000); // 2秒后尝试启动核心

    return () => {
      clearTimeout(startCoreTimeout);
      isUnmounted = true;
      cleanupFns.splice(0).forEach((fn) => {
        try {
          fn();
        } catch (error) {
          console.error("[DataProvider] Cleanup error:", error);
        }
      });
    };
  }, [refreshProxy]);

  const { data: sysproxy, mutate: refreshSysproxy } = useSWR(
    "getSystemProxy",
    getSystemProxy,
    SWR_DEFAULTS,
  );

  const { data: runningMode } = useSWR(
    "getRunningMode",
    getRunningMode,
    SWR_DEFAULTS,
  );

  const { data: uptimeData } = useSWR("appUptime", getAppUptime, {
    ...SWR_DEFAULTS,
    refreshInterval: 1000, // 1秒刷新一次，让uptime显示更实时
    dedupingInterval: 500, // 减少去重间隔，确保刷新及时
    errorRetryCount: 1,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshProxy(),
      refreshClashConfig(),
      refreshRules(),
      refreshSysproxy(),
      refreshProxyProviders(),
      refreshRuleProviders(),
    ]);
  }, [
    refreshProxy,
    refreshClashConfig,
    refreshRules,
    refreshSysproxy,
    refreshProxyProviders,
    refreshRuleProviders,
  ]);

  const value = useMemo(() => {
    const calculateSystemProxyAddress = () => {
      if (!verge || !clashConfig) return "-";

      const isPacMode = verge.proxy_auto_config ?? false;

      if (isPacMode) {
        const proxyHost = verge.proxy_host || "127.0.0.1";
        const proxyPort =
          verge.verge_mixed_port || clashConfig.mixedPort || 7897;
        return `${proxyHost}:${proxyPort}`;
      } else {
        const systemServer = sysproxy?.server;
        if (
          systemServer &&
          systemServer !== "-" &&
          !systemServer.startsWith(":")
        ) {
          return systemServer;
        } else {
          const proxyHost = verge.proxy_host || "127.0.0.1";
          const proxyPort =
            verge.verge_mixed_port || clashConfig.mixedPort || 7897;
          return `${proxyHost}:${proxyPort}`;
        }
      }
    };

    return {
      proxies: proxiesData,
      clashConfig: clashConfig || null,
      rules: rulesData?.rules || [],
      sysproxy,
      runningMode,
      uptime: uptimeData || 0,
      proxyProviders: proxyProviders || {},
      ruleProviders: ruleProviders?.providers || {},
      systemProxyAddress: calculateSystemProxyAddress(),
      refreshProxy,
      refreshClashConfig,
      refreshRules,
      refreshSysproxy,
      refreshProxyProviders,
      refreshRuleProviders,
      refreshAll,
    } as AppDataContextType;
  }, [
    proxiesData,
    clashConfig,
    rulesData,
    sysproxy,
    runningMode,
    uptimeData,
    proxyProviders,
    ruleProviders,
    verge,
    refreshProxy,
    refreshClashConfig,
    refreshRules,
    refreshSysproxy,
    refreshProxyProviders,
    refreshRuleProviders,
    refreshAll,
  ]);

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
};
