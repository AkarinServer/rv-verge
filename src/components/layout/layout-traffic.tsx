import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
} from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useTrafficData } from "@/hooks/use-traffic-data";
import parseTraffic from "@/utils/parse-traffic";

// 简化的流量显示组件
export const LayoutTraffic = () => {
  const { t } = useTranslation();

  const {
    response: { data: traffic },
  } = useTrafficData();

  // 使用parseTraffic统一处理转换
  const [up, upUnit] = parseTraffic(traffic?.up || 0);
  const [down, downUnit] = parseTraffic(traffic?.down || 0);

  const boxStyle: any = {
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  };
  const iconStyle: any = {
    sx: { mr: "8px", fontSize: 16 },
  };
  const valStyle: any = {
    component: "span",
    textAlign: "center",
    sx: { flex: "1 1 56px", userSelect: "none" },
  };
  const unitStyle: any = {
    component: "span",
    color: "grey.500",
    fontSize: "12px",
    textAlign: "right",
    sx: { flex: "0 1 27px", userSelect: "none" },
  };

  return (
    <Box position="relative">
      <Box display="flex" flexDirection="column" gap={0.75}>
        <Box
          title={t("home.components.traffic.metrics.uploadSpeed")}
          {...boxStyle}
        >
          <ArrowUpwardRounded
            {...iconStyle}
            color={(traffic?.up || 0) > 0 ? "secondary" : "disabled"}
          />
          <Typography {...valStyle} color="secondary">
            {up}
          </Typography>
          <Typography {...unitStyle}>{upUnit}/s</Typography>
        </Box>

        <Box
          title={t("home.components.traffic.metrics.downloadSpeed")}
          {...boxStyle}
        >
          <ArrowDownwardRounded
            {...iconStyle}
            color={(traffic?.down || 0) > 0 ? "primary" : "disabled"}
          />
          <Typography {...valStyle} color="primary">
            {down}
          </Typography>
          <Typography {...unitStyle}>{downUnit}/s</Typography>
        </Box>
      </Box>
    </Box>
  );
};

