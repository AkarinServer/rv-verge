import { Box, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useTrafficData } from "@/hooks/use-traffic-data";

// 格式化流量大小
const formatTraffic = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// 格式化速度
const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatTraffic(bytesPerSecond)}/s`;
};

export const EnhancedTrafficStats = () => {
  const { t } = useTranslation();
  const { response } = useTrafficData();
  const traffic = response?.data || { up: 0, down: 0 };

  return (
    <Stack direction="row" spacing={3} sx={{ justifyContent: "space-around" }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {t("home.components.trafficStats.labels.download")}
        </Typography>
        <Typography variant="h6" color="primary.main" fontWeight="medium">
          {formatSpeed(traffic.down)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {t("home.components.trafficStats.labels.upload")}
        </Typography>
        <Typography variant="h6" color="secondary.main" fontWeight="medium">
          {formatSpeed(traffic.up)}
        </Typography>
      </Box>
    </Stack>
  );
};

