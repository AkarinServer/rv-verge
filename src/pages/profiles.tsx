import {
  ContentPasteRounded,
  ClearRounded,
  CloudDownloadRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";

import { BasePage } from "@/components/base";
import { ProfileItem } from "@/components/profile/profile-item";
import { importProfile, getProfiles, type IProfilesConfig, type IProfileItem } from "@/services/cmds";
import useSWR from "swr";
import type { IProfileOption } from "@/types";

const ProfilesPage = () => {
  const { t, ready } = useTranslation();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profilesConfig } = useSWR<IProfilesConfig>(
    "getProfiles",
    getProfiles,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const hasProfiles = profilesConfig?.items && profilesConfig.items.length > 0;

  const handlePaste = useCallback(async () => {
    try {
      const text = await readText();
      if (text) {
        setUrl(text);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!url.trim()) {
      setError(t("profiles.import.errors.emptyUrl"));
      return;
    }

    // 验证 URL 格式
    if (!/^https?:\/\//i.test(url.trim())) {
      setError(t("profiles.import.errors.invalidUrl"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 尝试正常导入
      await importProfile(url.trim());
      setUrl("");
      await mutate("getProfiles", getProfiles());
    } catch (initialErr: any) {
      console.warn("[导入订阅] 首次导入失败:", initialErr);

      try {
        // 使用自身代理尝试导入
        const option: IProfileOption = {
          with_proxy: false,
          self_proxy: true,
        };
        await importProfile(url.trim(), option);
        setUrl("");
        await mutate("getProfiles", getProfiles());
      } catch (retryErr: any) {
        // 回退导入也失败
        setError(
          retryErr?.message ||
            t("profiles.import.errors.importFailed", {
              error: String(retryErr),
            }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [url, t]);

  // Show loading state if i18n is not ready
  if (!ready) {
    return (
      <BasePage title="加载中..." contentStyle={{ padding: 2 }}>
        <div>正在加载...</div>
      </BasePage>
    );
  }

  // 如果没有配置文件，显示导入界面
  if (!hasProfiles) {
    return (
      <BasePage title={t("profiles.page.title")} contentStyle={{ padding: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 3,
          }}
        >
          <CloudDownloadRounded
            sx={{
              fontSize: 120,
              color: "primary.main",
              opacity: 0.8,
            }}
          />
          <Typography variant="h5" fontWeight="medium">
            {t("profiles.import.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("profiles.import.clickToImport")}
          </Typography>

          <Box sx={{ width: "100%", maxWidth: 600, mt: 2 }}>
            {error && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: "error.light",
                  color: "error.contrastText",
                  borderRadius: 1,
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </Box>
            )}

            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    if (url.trim() && !loading) {
                      e.preventDefault();
                      handleImport();
                    }
                  }
                }}
                placeholder={t("profiles.import.placeholder")}
                variant="outlined"
                disabled={loading}
                InputProps={{
                  endAdornment: url ? (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setUrl("");
                        setError(null);
                      }}
                      disabled={loading}
                    >
                      <ClearRounded fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={handlePaste}
                      disabled={loading}
                      title={t("profiles.import.paste")}
                    >
                      <ContentPasteRounded fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
              <Button
                disabled={!url.trim() || loading}
                variant="contained"
                size="large"
                onClick={handleImport}
                startIcon={
                  loading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CloudDownloadRounded />
                  )
                }
                sx={{ minWidth: 120 }}
              >
                {loading ? t("profiles.import.importing") : t("profiles.import.import")}
              </Button>
            </Stack>
          </Box>
        </Box>
      </BasePage>
    );
  }

  // 有配置文件时，显示列表和导入表单
  return (
    <BasePage title={t("profiles.page.title")} contentStyle={{ padding: 2 }}>
      <Stack spacing={2}>
        {/* 导入表单 */}
        <Box
          sx={{
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  if (url.trim() && !loading) {
                    e.preventDefault();
                    handleImport();
                  }
                }
              }}
              placeholder={t("profiles.import.placeholder")}
              variant="outlined"
              size="small"
              disabled={loading}
              error={!!error}
              helperText={error}
              InputProps={{
                endAdornment: url ? (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setUrl("");
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    <ClearRounded fontSize="small" />
                  </IconButton>
                ) : (
                  <IconButton
                    size="small"
                    onClick={handlePaste}
                    disabled={loading}
                    title={t("profiles.import.paste")}
                  >
                    <ContentPasteRounded fontSize="small" />
                  </IconButton>
                ),
              }}
            />
            <Button
              disabled={!url.trim() || loading}
              variant="contained"
              size="small"
              onClick={handleImport}
              startIcon={
                loading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <CloudDownloadRounded />
                )
              }
            >
              {loading ? t("profiles.import.importing") : t("profiles.import.import")}
            </Button>
          </Stack>
        </Box>

        {/* 配置文件列表 */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {t("profiles.page.profilesList")} ({profilesConfig?.items?.length || 0})
          </Typography>
          {profilesConfig?.items && profilesConfig.items.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {profilesConfig.items.map((profile: IProfileItem) => (
                <ProfileItem
                  key={profile.uid}
                  profile={profile}
                  isCurrent={profile.uid === profilesConfig.current}
                  onSwitch={() => {
                    // 刷新列表
                    mutate("getProfiles", getProfiles());
                  }}
                  onDelete={() => {
                    // 刷新列表
                    mutate("getProfiles", getProfiles());
                  }}
                />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                color: "text.secondary",
              }}
            >
              <Typography variant="body2">
                {t("profiles.page.noProfiles")}
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </BasePage>
  );
};

export default ProfilesPage;

