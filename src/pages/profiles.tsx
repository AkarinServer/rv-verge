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
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";

import { BasePage } from "@/components/base";
import { ProfileItem } from "@/components/profile/profile-item";
import { importProfile, getProfiles, patchProfile, type IProfilesConfig, type IProfileItem } from "@/services/cmds";
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

  // 只显示主配置文件（remote 和 local 类型），过滤掉增强配置文件（rules, proxies, groups, script, merge）
  const mainProfiles = useMemo(() => {
    const items = profilesConfig?.items || [];
    // 只显示 remote 和 local 类型的主配置文件
    return items.filter(
      (profile) => 
        profile.type === "remote" || profile.type === "local"
    );
  }, [profilesConfig?.items]);

  const hasProfiles = mainProfiles.length > 0;

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

  // 生成唯一的配置名称（如果重名则添加 (1), (2) 等后缀）
  // 规则：第一次导入是 a.yaml，第二次是 a(1).yaml，第三次是 a(2).yaml
  const generateUniqueName = useCallback((baseName: string, existingProfiles: IProfileItem[]): string => {
    const existingNames = new Set(existingProfiles.map(p => p.name || p.uid || ""));
    
    // 去除 .yaml 或 .yml 后缀来获取基础名称
    const baseNameWithoutExt = baseName.replace(/\.(yaml|yml)$/i, "");
    const ext = baseName.match(/\.(yaml|yml)$/i)?.[0] || "";
    
    // 检查原始名称（带扩展名）是否已存在
    if (!existingNames.has(baseName)) {
      return baseName;
    }

    // 如果重名，尝试添加 (1), (2) 等后缀
    let counter = 1;
    let newName = `${baseNameWithoutExt} (${counter})${ext}`;
    while (existingNames.has(newName)) {
      counter++;
      newName = `${baseNameWithoutExt} (${counter})${ext}`;
    }
    return newName;
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
      
      // 导入成功后，刷新列表并检查重名
      const updatedProfiles = await getProfiles();
      const allProfiles = updatedProfiles.items || [];
      // 只获取主配置文件（remote 和 local 类型）
      const mainProfilesList = allProfiles.filter(
        p => p.type === "remote" || p.type === "local"
      );
      
      // 找到刚导入的配置（通过 URL 匹配，或者取最后一个主配置）
      const normalizedUrl = url.trim().split('?')[0];
      const importedProfile = mainProfilesList.find(p => 
        p.url && p.url.split('?')[0] === normalizedUrl
      ) || mainProfilesList[mainProfilesList.length - 1];
      
      if (importedProfile && importedProfile.uid) {
        const baseName = importedProfile.name || importedProfile.uid;
        const uniqueName = generateUniqueName(
          baseName, 
          mainProfilesList.filter(p => p.uid !== importedProfile.uid)
        );
        
        // 如果名称需要修改，则更新
        if (uniqueName !== baseName) {
          await patchProfile(importedProfile.uid, { name: uniqueName });
        }
      }
      
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
        
        // 导入成功后，刷新列表并检查重名
        const updatedProfiles = await getProfiles();
        const allProfiles = updatedProfiles.items || [];
        // 只获取主配置文件（remote 和 local 类型）
        const mainProfilesList = allProfiles.filter(
          p => p.type === "remote" || p.type === "local"
        );
        
        // 找到刚导入的配置
        const normalizedUrl = url.trim().split('?')[0];
        const importedProfile = mainProfilesList.find(p => 
          p.url && p.url.split('?')[0] === normalizedUrl
        ) || mainProfilesList[mainProfilesList.length - 1];
        
        if (importedProfile && importedProfile.uid) {
          const baseName = importedProfile.name || importedProfile.uid;
          const uniqueName = generateUniqueName(
            baseName, 
            mainProfilesList.filter(p => p.uid !== importedProfile.uid)
          );
          
          // 如果名称需要修改，则更新
          if (uniqueName !== baseName) {
            await patchProfile(importedProfile.uid, { name: uniqueName });
          }
        }
        
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
  }, [url, t, generateUniqueName]);

  // Show loading state if i18n is not ready
  if (!ready) {
    return (
      <BasePage title={t("shared.messages.loading")} contentStyle={{ padding: 2 }}>
        <div>{t("shared.messages.loading")}</div>
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
            {t("profiles.page.profilesList")} ({mainProfiles.length})
          </Typography>
          {mainProfiles.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {mainProfiles.map((profile: IProfileItem) => (
                <ProfileItem
                  key={profile.uid}
                  profile={profile}
                  isCurrent={profile.uid === profilesConfig?.current}
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

