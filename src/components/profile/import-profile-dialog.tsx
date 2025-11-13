import {
  ContentPasteRounded,
  ClearRounded,
  CloudDownloadRounded,
} from "@mui/icons-material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Alert,
} from "@mui/material";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { importProfile } from "@/services/cmds";
import type { IProfileOption } from "@/types";

interface ImportProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ImportProfileDialog = ({
  open,
  onClose,
  onSuccess,
}: ImportProfileDialogProps) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onSuccess?.();
      onClose();
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
        onSuccess?.();
        onClose();
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
  }, [url, t, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    if (!loading) {
      setUrl("");
      setError(null);
      onClose();
    }
  }, [loading, onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CloudDownloadRounded />
          <Typography variant="h6">
            {t("profiles.import.title")}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            {t("profiles.import.description")}
          </Typography>

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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t("shared.actions.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!url.trim() || loading}
          startIcon={<CloudDownloadRounded />}
        >
          {loading ? t("profiles.import.importing") : t("profiles.import.import")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

