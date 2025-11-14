import {
  CheckCircle,
  Delete,
  MoreVert,
  RadioButtonUnchecked,
  Update,
} from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";

import { deleteProfile, getProfiles, switchProfile, updateProfile } from "@/services/cmds";
import type { IProfileItem } from "@/types";
import { DeleteProfileDialog } from "./delete-profile-dialog";

interface ProfileItemProps {
  profile: IProfileItem;
  isCurrent: boolean;
  onSwitch?: () => void;
  onDelete?: () => void;
}

export const ProfileItem = ({
  profile,
  isCurrent,
  onSwitch,
  onDelete,
}: ProfileItemProps) => {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [switching, setSwitching] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleSwitch = async () => {
    console.log("[ProfileSwitch] 开始切换:", {
      uid: profile.uid,
      name: profile.name,
      switching,
      isCurrent,
    });

    if (!profile.uid) {
      console.error("[ProfileSwitch] 错误: profile.uid 为空");
      return;
    }

    if (switching) {
      console.warn("[ProfileSwitch] 警告: 正在切换中，忽略重复请求");
      return;
    }

    if (isCurrent) {
      console.warn("[ProfileSwitch] 警告: 已经是当前配置，无需切换");
      return;
    }

    setSwitching(true);
    try {
      console.log("[ProfileSwitch] 调用 switchProfile:", profile.uid);
      const success = await switchProfile(profile.uid);
      console.log("[ProfileSwitch] switchProfile 返回结果:", success);
      
      if (success) {
        console.log("[ProfileSwitch] 切换成功，刷新配置列表");
        await mutate("getProfiles", getProfiles());
        onSwitch?.();
        console.log("[ProfileSwitch] 切换完成");
      } else {
        console.error("[ProfileSwitch] 切换失败: switchProfile 返回 false");
      }
    } catch (err) {
      console.error("[ProfileSwitch] 切换配置文件错误:", err);
      console.error("[ProfileSwitch] 错误详情:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setSwitching(false);
      handleMenuClose();
    }
  };

  const handleUpdate = async () => {
    if (!profile.uid || updating || profile.type !== "remote") return;

    setUpdating(true);
    handleMenuClose();
    try {
      // 尝试使用代理更新
      await updateProfile(profile.uid, { with_proxy: true });
      await mutate("getProfiles", getProfiles());
    } catch (err) {
      // 如果使用代理失败，尝试使用自身代理
      try {
        await updateProfile(profile.uid, { with_proxy: false, self_proxy: true });
        await mutate("getProfiles", getProfiles());
      } catch (retryErr) {
        console.error("更新配置文件失败:", retryErr);
        // 后端会通过事件系统发送错误通知，这里只记录日志
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profile.uid) {
      throw new Error(t("profiles.delete.errors.invalidProfile"));
    }

    await deleteProfile(profile.uid);
    await mutate("getProfiles", getProfiles());
    onDelete?.();
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return t("profiles.item.neverUpdated");
    return dayjs(timestamp * 1000).format("YYYY-MM-DD HH:mm:ss");
  };

  const getProfileTypeLabel = (type?: string) => {
    switch (type) {
      case "remote":
        return t("profiles.item.type.remote");
      case "local":
        return t("profiles.item.type.local");
      case "merge":
        return t("profiles.item.type.merge");
      case "script":
        return t("profiles.item.type.script");
      default:
        return type || t("profiles.item.type.unknown");
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    console.log("[ProfileCardClick] 卡片被点击:", {
      uid: profile.uid,
      name: profile.name,
      isCurrent,
      switching,
      target: e.target,
    });

    // 如果点击的是按钮或菜单，不触发切换
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('[role="button"]') || 
      target.closest('[role="menu"]') ||
      target.closest('[role="menuitem"]')
    ) {
      console.log("[ProfileCardClick] 点击的是按钮或菜单，忽略");
      return;
    }
    
    // 如果点击的不是当前配置，则切换
    if (!isCurrent && profile.uid && !switching) {
      console.log("[ProfileCardClick] 触发切换");
      handleSwitch();
    } else {
      console.log("[ProfileCardClick] 不满足切换条件:", {
        isCurrent,
        hasUid: !!profile.uid,
        switching,
      });
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      sx={{
        position: "relative",
        border: isCurrent ? 2 : 1,
        borderColor: isCurrent ? "primary.main" : "divider",
        bgcolor: isCurrent ? "action.selected" : "background.paper",
        transition: "all 0.2s",
        cursor: isCurrent ? "default" : "pointer",
        "&:hover": {
          boxShadow: 2,
        },
      }}
    >
      <CardContent sx={{ pb: "16px !important" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              {isCurrent ? (
                <CheckCircle color="primary" fontSize="small" />
              ) : (
                <RadioButtonUnchecked fontSize="small" color="disabled" />
              )}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: isCurrent ? 600 : 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.name || profile.uid || t("profiles.item.unnamed")}
              </Typography>
            </Box>

            {profile.desc && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {profile.desc}
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                mt: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t("profiles.item.type")}: {getProfileTypeLabel(profile.type)}
              </Typography>
              {profile.updated && (
                <Typography variant="caption" color="text.secondary">
                  {t("profiles.item.lastUpdated")}: {formatDate(profile.updated)}
                </Typography>
              )}
              {profile.url && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 200,
                  }}
                >
                  {t("profiles.item.url")}: {profile.url}
                </Typography>
              )}
            </Box>
          </Box>

          <Box 
            sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}
            onClick={(e) => {
              // 阻止事件冒泡，避免触发卡片点击
              e.stopPropagation();
            }}
          >
            {!isCurrent && (
              <Tooltip title={t("profiles.actions.switch")}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    console.log("[ProfileSwitchButton] Switch 按钮被点击");
                    e.stopPropagation();
                    handleSwitch();
                  }}
                  disabled={switching}
                >
                  <Update fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handleMenuOpen(e);
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        {!isCurrent && (
          <MenuItem 
            onClick={(e) => {
              e.stopPropagation();
              handleSwitch();
            }} 
            disabled={switching}
          >
            <Update fontSize="small" sx={{ mr: 1 }} />
            {t("profiles.actions.switch")}
          </MenuItem>
        )}
        {profile.type === "remote" && (
          <MenuItem 
            onClick={(e) => {
              e.stopPropagation();
              handleUpdate();
            }} 
            disabled={updating}
          >
            <Update fontSize="small" sx={{ mr: 1 }} />
            {updating ? t("profiles.actions.updating") : t("profiles.actions.update")}
          </MenuItem>
        )}
        <MenuItem 
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick();
          }} 
          disabled={isCurrent}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          {t("profiles.actions.delete")}
        </MenuItem>
      </Menu>

      <DeleteProfileDialog
        open={deleteDialogOpen}
        profileName={profile.name || profile.uid || t("profiles.item.unnamed")}
        isCurrent={isCurrent}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </Card>
  );
};

