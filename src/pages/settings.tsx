import { Warning } from "@mui/icons-material";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mutate } from "swr";

import { BasePage } from "@/components/base";
import { clearAllData, getProfiles } from "@/services/cmds";

const SettingsPage = () => {
  const { t } = useTranslation();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearAllData = async () => {
    setClearing(true);
    try {
      await clearAllData();
      // 清空后刷新所有数据
      await mutate("getProfiles", getProfiles());
      // 可以刷新页面或跳转到首页
      window.location.reload();
    } catch (err) {
      console.error("清空数据失败:", err);
      alert(t("settings.clearData.errors.failed", { error: String(err) }));
    } finally {
      setClearing(false);
      setClearDialogOpen(false);
    }
  };

  return (
    <BasePage title={t("settings.page.title")} contentStyle={{ padding: 2 }}>
      <Stack spacing={2}>
        {/* 危险操作区域 */}
        <Card
          sx={{
            border: "1px solid",
            borderColor: "error.main",
            bgcolor: "error.light",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: "error.main" }}>
              {t("settings.dangerZone.title")}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              {t("settings.dangerZone.description")}
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<Warning />}
              onClick={() => setClearDialogOpen(true)}
            >
              {t("settings.dangerZone.clearAllData")}
            </Button>
          </CardContent>
        </Card>
      </Stack>

      {/* 清空数据确认对话框 */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => !clearing && setClearDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "error.main",
          }}
        >
          <Warning />
          {t("settings.clearData.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.clearData.confirm")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setClearDialogOpen(false)}
            disabled={clearing}
          >
            {t("shared.actions.cancel")}
          </Button>
          <Button
            onClick={handleClearAllData}
            variant="contained"
            color="error"
            disabled={clearing}
          >
            {clearing ? t("settings.clearData.clearing") : t("settings.clearData.confirmButton")}
          </Button>
        </DialogActions>
      </Dialog>
    </BasePage>
  );
};

export default SettingsPage;

