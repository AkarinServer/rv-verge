import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { useEffect, useReducer } from "react";
import { useTranslation } from "react-i18next";

import { useVerge } from "@/hooks/use-verge";
import delayManager, { type DelayUpdate } from "@/services/delay";
import type { IProxyGroupItem, IProxyItem } from "@/types";

interface Props {
  group: IProxyGroupItem;
  proxy: IProxyItem;
  selected: boolean;
  onClick?: (groupName: string, proxyName: string) => void;
}

const presetList = ["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"];

export const ProxyItemCard = (props: Props) => {
  const { group, proxy, selected, onClick } = props;
  const { t } = useTranslation();
  const { verge } = useVerge();
  const timeout = verge?.default_latency_timeout || 10000;
  const isPreset = presetList.includes(proxy.name);

  // 延迟状态管理
  const [delayState, setDelayState] = useReducer(
    (_: DelayUpdate, next: DelayUpdate) => next,
    { delay: -1, updatedAt: 0 },
  );

  // 注册延迟监听器
  useEffect(() => {
    if (isPreset) return;
    delayManager.setListener(proxy.name, group.name, setDelayState);

    return () => {
      delayManager.removeListener(proxy.name, group.name);
    };
  }, [proxy.name, group.name, isPreset]);

  // 初始化延迟值 - 从 proxy 对象中获取延迟值（如果有）
  useEffect(() => {
    if (isPreset) return;
    // 如果 proxy 对象中有延迟值，使用它；否则初始化为 -1
    const initialDelay = proxy.history && proxy.history.length > 0 
      ? proxy.history[proxy.history.length - 1].delay 
      : -1;
    setDelayState({ delay: initialDelay, updatedAt: 0 });
  }, [proxy.name, group.name, isPreset, proxy.history]);

  const handleClick = () => {
    if (onClick && !selected) {
      onClick(group.name, proxy.name);
    }
  };

  const delayValue = delayState.delay;

  const formatDelay = (delayValue: number): string => {
    if (delayValue === -1) return t("proxies.item.notTested");
    if (delayValue === -2) return t("proxies.item.testing");
    if (delayValue === 0 || delayValue >= timeout) return t("proxies.item.timeout");
    if (delayValue > 1e5) return t("proxies.item.error");
    return `${delayValue} ${t("proxies.item.ms")}`;
  };

  const getDelayColor = (delayValue: number): string => {
    if (delayValue < 0) return "text.secondary";
    if (delayValue === 0 || delayValue >= timeout) return "error.main";
    if (delayValue >= 10000) return "error.main";
    if (delayValue >= 400) return "warning.main";
    if (delayValue >= 250) return "primary.main";
    return "success.main";
  };

  return (
    <Card
      onClick={handleClick}
      sx={{
        cursor: selected ? "default" : "pointer",
        border: selected ? 2 : 1,
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "action.selected" : "background.paper",
        transition: "all 0.2s",
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-2px)",
        },
        position: "relative",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          {selected && (
            <CheckCircle
              color="primary"
              sx={{ fontSize: 20, position: "absolute", top: 8, right: 8 }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {proxy.name}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Chip
                label={proxy.type}
                size="small"
                variant="outlined"
                sx={{ height: 24, fontSize: "0.75rem" }}
              />
              {!isPreset && (
                <Typography
                  variant="caption"
                  color={getDelayColor(delayValue)}
                  sx={{ fontWeight: 500 }}
                >
                  {formatDelay(delayValue)}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

