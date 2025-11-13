import { Box, Typography } from "@mui/material";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";

import { getIpInfo, type IpInfo } from "@/services/api";

// 定义刷新时间（秒）
const IP_REFRESH_SECONDS = 300;

// 获取国旗表情
const getCountryFlag = (countryCode: string) => {
  if (!countryCode) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// 精简版 IP 信息卡片组件 - 只显示旗帜和 IP 地址
export interface IpInfoCardRef {
  refresh: () => void;
}

export const IpInfoCard = forwardRef<IpInfoCardRef>((_props, ref) => {
  const { t } = useTranslation();
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 获取IP信息
  const fetchIpInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getIpInfo();
      setIpInfo(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("home.components.ipInfo.errors.load"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: fetchIpInfo,
  }));

  // 组件加载时获取IP信息
  useEffect(() => {
    fetchIpInfo();

    // 自动刷新
    const timer = window.setInterval(() => {
      fetchIpInfo();
    }, IP_REFRESH_SECONDS * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [fetchIpInfo]);

  // 渲染加载状态
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 0.5,
            bgcolor: "action.disabledBackground",
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {t("home.components.ipInfo.loading")}
        </Typography>
      </Box>
    );
  }

  // 渲染错误状态
  if (error || !ipInfo) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 0.5,
            bgcolor: "error.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
          }}
        >
          !
        </Box>
        <Typography variant="body2" color="error">
          {error || t("home.components.ipInfo.errors.load")}
        </Typography>
      </Box>
    );
  }

  // 渲染正常数据 - 精简版：只显示旗帜和 IP 地址
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      {/* 国家/地区旗帜 */}
      <Box
        component="span"
        sx={{
          fontSize: "1.25rem",
          display: "inline-block",
          width: 24,
          height: 24,
          lineHeight: "24px",
          textAlign: "center",
          flexShrink: 0,
          fontFamily: '"twemoji mozilla", sans-serif',
        }}
      >
        {getCountryFlag(ipInfo.country_code || "")}
      </Box>

      {/* IP 地址 */}
      <Typography
        variant="body1"
        sx={{
          fontFamily: "monospace",
          fontSize: "0.875rem",
          fontWeight: 500,
          flex: 1,
        }}
      >
        {ipInfo.ip || "Unknown"}
      </Typography>
    </Box>
  );
});

IpInfoCard.displayName = "IpInfoCard";
