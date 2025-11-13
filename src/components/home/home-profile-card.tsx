import {
  CloudUploadOutlined,
  DnsOutlined,
  EventOutlined,
  LaunchOutlined,
  StorageOutlined,
  UpdateOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  LinearProgress,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useLockFn } from "ahooks";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { getProfiles, type IProfileItem, type IProfilesConfig } from "@/services/cmds";
import useSWR from "swr";

import { EnhancedCard } from "./enhanced-card";

// 辅助函数解析URL和过期时间
const parseUrl = (url?: string) => {
  if (!url) return "-";
  if (url.startsWith("http")) return new URL(url).host;
  return "local";
};

const parseExpire = (expire?: number) => {
  if (!expire) return "-";
  return dayjs(expire * 1000).format("YYYY-MM-DD");
};

// 格式化流量
const formatTraffic = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

interface ProfileExtra {
  upload: number;
  download: number;
  total: number;
  expire: number;
}

// 配置文件卡片组件
export const HomeProfileCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: profilesConfig } = useSWR<IProfilesConfig>(
    "getProfiles",
    getProfiles,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const current = useMemo(() => {
    if (!profilesConfig?.current || !profilesConfig?.items) return null;
    return profilesConfig.items.find(
      (item) => item.uid === profilesConfig.current
    );
  }, [profilesConfig]);

  const [updating, setUpdating] = useState(false);

  const onUpdateProfile = useLockFn(async () => {
    if (!current?.uid) return;

    setUpdating(true);
    try {
      // TODO: 实现更新配置文件的功能
      // await updateProfile(current.uid, current.option);
      console.log("Update profile:", current.uid);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setUpdating(false);
    }
  });

  const goToProfiles = useCallback(() => {
    navigate("/profiles");
  }, [navigate]);

  const openWebUrl = useCallback((url: string) => {
    // TODO: 实现打开网页的功能
    console.log("Open URL:", url);
  }, []);

  // 将所有 hooks 移到条件返回之前，确保 hooks 数量一致
  const usedTraffic = useMemo(() => {
    if (!current) return 0;
    const extra = current.extra as ProfileExtra | undefined;
    if (!extra) return 0;
    return extra.upload + extra.download;
  }, [current]);

  const trafficPercentage = useMemo(() => {
    if (!current) return 0;
    const extra = current.extra as ProfileExtra | undefined;
    if (!extra || !extra.total || extra.total <= 0) return 0;
    return Math.min(Math.round((usedTraffic / extra.total) * 100), 100);
  }, [current, usedTraffic]);

  const cardTitle = useMemo(() => {
    if (!current) return t("home.components.profileCard.title");
    if (!current.home) return current.name || t("home.components.profileCard.title");

    return (
      <Link
        component="button"
        variant="h6"
        fontWeight="medium"
        fontSize={18}
        onClick={() => current.home && openWebUrl(current.home)}
        sx={{
          color: "inherit",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          maxWidth: "100%",
          "& > span": {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          },
        }}
        title={current.name}
      >
        <span>{current.name}</span>
        <LaunchOutlined
          fontSize="inherit"
          sx={{
            ml: 0.5,
            fontSize: "0.8rem",
            opacity: 0.7,
            flexShrink: 0,
          }}
        />
      </Link>
    );
  }, [current, t, openWebUrl]);

  // 如果没有配置文件
  if (!current) {
    return (
      <EnhancedCard
        title={t("home.components.profileCard.title")}
        icon={<StorageOutlined />}
        iconColor="primary"
        action={
          <Button
            variant="outlined"
            size="small"
            onClick={goToProfiles}
            endIcon={<StorageOutlined fontSize="small" />}
            sx={{ borderRadius: 1.5 }}
          >
            {t("home.components.profileCard.actions.manage")}
          </Button>
        }
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t("home.components.profileCard.labels.noProfile")}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={goToProfiles}
            sx={{ mt: 2 }}
          >
            {t("home.components.profileCard.actions.import")}
          </Button>
        </Box>
      </EnhancedCard>
    );
  }

  return (
    <EnhancedCard
      title={cardTitle}
      icon={<StorageOutlined />}
      iconColor="primary"
      action={
        <Button
          variant="outlined"
          size="small"
          onClick={goToProfiles}
          endIcon={<StorageOutlined fontSize="small" />}
          sx={{ borderRadius: 1.5 }}
        >
          {t("home.components.profileCard.actions.manage")}
        </Button>
      }
    >
      <Stack spacing={2}>
        {current.url && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <DnsOutlined fontSize="small" color="action" />
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ display: "flex", alignItems: "center" }}
            >
              <span style={{ flexShrink: 0 }}>
                {t("home.components.profileCard.labels.from")}:{" "}
              </span>
              {current.home ? (
                <Link
                  component="button"
                  fontWeight="medium"
                  onClick={() => current.home && openWebUrl(current.home)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    minWidth: 0,
                    maxWidth: "calc(100% - 40px)",
                    ml: 0.5,
                  }}
                  title={parseUrl(current.url)}
                >
                  <Typography
                    component="span"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {parseUrl(current.url)}
                  </Typography>
                  <LaunchOutlined
                    fontSize="inherit"
                    sx={{
                      ml: 0.5,
                      fontSize: "0.8rem",
                      opacity: 0.7,
                      flexShrink: 0,
                    }}
                  />
                </Link>
              ) : (
                <Typography
                  component="span"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    ml: 0.5,
                  }}
                >
                  {parseUrl(current.url)}
                </Typography>
              )}
            </Typography>
          </Stack>
        )}

        {current.updated && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <EventOutlined fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {t("home.components.profileCard.labels.updated")}:{" "}
              {dayjs(current.updated * 1000).format("YYYY-MM-DD HH:mm:ss")}
            </Typography>
          </Stack>
        )}

        {current.extra && (current.extra as ProfileExtra).total > 0 && (
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                {t("home.components.profileCard.labels.traffic")}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatTraffic(usedTraffic)} / {formatTraffic((current.extra as ProfileExtra).total)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={trafficPercentage}
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>
        )}

        {(current.extra as ProfileExtra | undefined)?.expire && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <EventOutlined fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {t("home.components.profileCard.labels.expire")}:{" "}
              {parseExpire((current.extra as ProfileExtra).expire)}
            </Typography>
          </Stack>
        )}

        {current.url && (
          <Button
            variant="outlined"
            size="small"
            fullWidth
            startIcon={<UpdateOutlined />}
            onClick={onUpdateProfile}
            disabled={updating}
            sx={{ borderRadius: 1.5 }}
          >
            {updating
              ? t("home.components.profileCard.actions.updating")
              : t("home.components.profileCard.actions.update")}
          </Button>
        )}
      </Stack>
    </EnhancedCard>
  );
};

