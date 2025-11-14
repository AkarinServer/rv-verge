import {
  Box,
  Grid,
  Tab,
  Tabs,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Speed } from "@mui/icons-material";
import { useLockFn } from "ahooks";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { delayGroup } from "tauri-plugin-mihomo-api";

import { useProxySelection } from "@/hooks/use-proxy-selection";
import { useVerge } from "@/hooks/use-verge";
import { calcuProxies } from "@/services/cmds";
import { SWR_DEFAULTS } from "@/services/config";
import delayManager from "@/services/delay";
import type { IProxyItem } from "@/types";
import { ProxyItemCard } from "./proxy-item-card";

interface Props {
  mode: string;
}

export const ProxyGroups = (props: Props) => {
  const { mode } = props;
  const { t } = useTranslation();
  const { verge } = useVerge();

  const { data: proxiesData, mutate } = useSWR(
    "getProxies",
    calcuProxies,
    {
      ...SWR_DEFAULTS,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  );

  const { handleProxyGroupChange } = useProxySelection({
    onSuccess: () => {
      mutate();
    },
  });

  const groups = useMemo(() => {
    if (!proxiesData) return [];
    
    // 根据模式过滤代理组
    if (mode === "direct") {
      return [];
    }
    
    if (mode === "global") {
      // 全局模式只显示 GLOBAL 组
      return proxiesData.groups.filter(
        (group) => group.name === "GLOBAL"
      );
    }
    
    // 规则模式显示所有代理组（除了 GLOBAL）
    return proxiesData.groups.filter(
      (group) => group.name !== "GLOBAL"
    );
  }, [proxiesData, mode]);

  // 默认选中第一个 group
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
  
  const selectedGroup = useMemo(() => {
    if (!groups.length) return null;
    const targetName = selectedGroupName || groups[0]?.name;
    return groups.find(g => g.name === targetName) || groups[0];
  }, [groups, selectedGroupName]);

  const handleGroupChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedGroupName(newValue);
  };

  // 批量测试延迟
  const timeout = verge?.default_latency_timeout || 10000;
  const onTestAll = useLockFn(async () => {
    if (!selectedGroup || !selectedGroup.all) return;
    
    const proxyNames = selectedGroup.all
      .filter(p => !["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"].includes(p.name))
      .map(p => p.name);
    
    if (proxyNames.length === 0) return;

    try {
      const url = "https://cp.cloudflare.com/generate_204";
      delayManager.setUrl(selectedGroup.name, url);
      
      // 同时调用 delayGroup（后端批量测试）和 checkListDelay（前端逐个测试并更新显示）
      await Promise.race([
        delayManager.checkListDelay(proxyNames, selectedGroup.name, timeout),
        delayGroup(selectedGroup.name, url, timeout).then((result) => {
          console.log(
            `[ProxyGroups] delayGroup返回结果数量:`,
            Object.keys(result || {}).length,
          );
        }),
      ]);
      
      mutate();
    } catch (error) {
      console.error("[ProxyGroups] 批量测试延迟失败:", error);
    }
  });

  if (!proxiesData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">{t("proxies.group.loading")}</Typography>
      </Box>
    );
  }

  if (groups.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          {t("proxies.group.empty")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Group Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Tabs
            value={selectedGroup?.name || groups[0]?.name}
            onChange={handleGroupChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 48 }}
          >
            {groups.map((group) => (
              <Tab
                key={group.name}
                label={group.name}
                value={group.name}
                sx={{ textTransform: "none", minHeight: 48 }}
              />
            ))}
          </Tabs>
          
          {/* 批量测试按钮 */}
          {selectedGroup && selectedGroup.all && selectedGroup.all.length > 0 && (
            <Tooltip title={t("proxies.group.testAllTooltip")}>
              <IconButton
                size="small"
                onClick={onTestAll}
                sx={{ ml: 1 }}
                aria-label={t("proxies.group.testAll")}
              >
                <Speed />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Proxy Cards Grid */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {selectedGroup && selectedGroup.all && selectedGroup.all.length > 0 ? (
          <Grid container spacing={2}>
            {selectedGroup.all.map((proxy: IProxyItem) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={proxy.name}>
                <ProxyItemCard
                  group={selectedGroup}
                  proxy={proxy}
                  selected={proxy.name === selectedGroup.now}
                  onClick={handleProxyGroupChange}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              {t("proxies.group.noProxies")}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
