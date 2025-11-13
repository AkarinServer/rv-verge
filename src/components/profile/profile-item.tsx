import {
  CheckCircle,
  Delete,
  Edit,
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

import { deleteProfile, getProfiles, switchProfile } from "@/services/cmds";
import type { IProfileItem } from "@/types";

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
  const [deleting, setDeleting] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleSwitch = async () => {
    if (!profile.uid || switching || isCurrent) return;

    setSwitching(true);
    try {
      const success = await switchProfile(profile.uid);
      if (success) {
        await mutate("getProfiles", getProfiles());
        onSwitch?.();
      } else {
        console.error("切换配置文件失败");
      }
    } catch (err) {
      console.error("切换配置文件错误:", err);
    } finally {
      setSwitching(false);
      handleMenuClose();
    }
  };

  const handleDelete = async () => {
    if (!profile.uid || deleting || isCurrent) return;

    if (!confirm(t("profiles.delete.confirm", { name: profile.name || profile.uid }))) {
      return;
    }

    setDeleting(true);
    try {
      await deleteProfile(profile.uid);
      await mutate("getProfiles", getProfiles());
      onDelete?.();
    } catch (err) {
      console.error("删除配置文件错误:", err);
    } finally {
      setDeleting(false);
      handleMenuClose();
    }
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

  return (
    <Card
      sx={{
        position: "relative",
        border: isCurrent ? 2 : 1,
        borderColor: isCurrent ? "primary.main" : "divider",
        bgcolor: isCurrent ? "action.selected" : "background.paper",
        transition: "all 0.2s",
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

          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
            {!isCurrent && (
              <Tooltip title={t("profiles.actions.switch")}>
                <IconButton
                  size="small"
                  onClick={handleSwitch}
                  disabled={switching}
                >
                  <Update fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <IconButton size="small" onClick={handleMenuOpen}>
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
          <MenuItem onClick={handleSwitch} disabled={switching}>
            <Update fontSize="small" sx={{ mr: 1 }} />
            {t("profiles.actions.switch")}
          </MenuItem>
        )}
        <MenuItem onClick={handleDelete} disabled={deleting || isCurrent}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          {t("profiles.actions.delete")}
        </MenuItem>
      </Menu>
    </Card>
  );
};

