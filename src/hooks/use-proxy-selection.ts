import { useLockFn } from "ahooks";
import { useCallback } from "react";
import { selectNodeForGroup } from "tauri-plugin-mihomo-api";
import { mutate } from "swr";

import { syncTrayProxySelection } from "@/services/cmds";
import { calcuProxies } from "@/services/cmds";

interface ProxySelectionOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

// 代理选择 Hook
export const useProxySelection = (options: ProxySelectionOptions = {}) => {
  const { onSuccess, onError } = options;

  // 切换节点
  const changeProxy = useLockFn(
    async (groupName: string, proxyName: string) => {
      console.log(`[ProxySelection] 代理切换: ${groupName} -> ${proxyName}`);

      try {
        await selectNodeForGroup(groupName, proxyName);
        await syncTrayProxySelection();
        
        // 刷新代理列表
        await mutate("getProxies", calcuProxies());
        
        console.log(`[ProxySelection] 代理切换成功`);
        onSuccess?.();
      } catch (error) {
        console.error(`[ProxySelection] 代理切换失败:`, error);
        onError?.(error);
        throw error;
      }
    }
  );

  // 切换代理组
  const handleProxyGroupChange = useCallback(
    async (groupName: string, proxyName: string) => {
      await changeProxy(groupName, proxyName);
    },
    [changeProxy]
  );

  return {
    changeProxy,
    handleProxyGroupChange,
  };
};

