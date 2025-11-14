import { Warning } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DeleteProfileDialogProps {
  open: boolean;
  profileName: string;
  isCurrent: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteProfileDialog = ({
  open,
  profileName,
  isCurrent,
  onClose,
  onConfirm,
}: DeleteProfileDialogProps) => {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (isCurrent) {
      setError(t("profiles.delete.errors.cannotDeleteCurrent"));
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(
        err?.message ||
          t("profiles.delete.errors.deleteFailed", {
            error: String(err),
          }),
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          minWidth: 320,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pb: 1,
        }}
      >
        <Warning color="warning" />
        {t("profiles.delete.title")}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {isCurrent
            ? t("profiles.delete.cannotDeleteCurrent", { name: profileName })
            : t("profiles.delete.confirm", { name: profileName })}
        </DialogContentText>
        {error && (
          <Typography
            variant="body2"
            color="error"
            sx={{
              mt: 1,
              p: 1.5,
              bgcolor: "error.light",
              borderRadius: 1,
            }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={deleting}>
          {t("shared.actions.cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="error"
          disabled={deleting || isCurrent}
          startIcon={deleting ? undefined : <Warning />}
        >
          {deleting ? t("profiles.delete.deleting") : t("profiles.delete.confirmButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

