import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  TextField,
  useTheme
} from '@mui/material';
import { EditNote as EditNoteIcon, Close as CloseIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  MVS_PROMPT_DIALOG_MAX_WIDTH,
  getMvsDialogActionsSx,
  getMvsDialogCancelButtonSx,
  getMvsDialogIconBoxSx,
  getMvsDialogPaperSx,
  getMvsDialogPrimaryConfirmButtonSx,
  getMvsDialogPromptContentSx,
  getMvsDialogTitleRowSx
} from './mvsDialogShell';

export interface PromptDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
  minRows?: number;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

/**
 * MVS **기본 입력 다이얼로그** (`window.prompt` 대체).
 * 레이아웃은 `ConfirmDialog` 와 동일 셸(`mvsDialogShell`)을 공유합니다.
 */
const PromptDialog: React.FC<PromptDialogProps> = ({
  open,
  title,
  message,
  label,
  defaultValue = '',
  placeholder,
  multiline = false,
  minRows = 3,
  confirmText,
  cancelText,
  required = true,
  onConfirm,
  onCancel
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  const titleText = title ?? t('common.input');
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');
  const canSubmit = !required || value.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(value.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth={MVS_PROMPT_DIALOG_MAX_WIDTH}
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: { backgroundColor: 'rgba(15, 23, 42, 0.35)' }
        }
      }}
      PaperProps={{
        sx: getMvsDialogPaperSx(theme)
      }}
    >
      <DialogTitle sx={getMvsDialogTitleRowSx(theme)}>
        <Box sx={getMvsDialogIconBoxSx(theme, theme.palette.primary.main, { tone: 'brand' })}>
          <EditNoteIcon sx={{ fontSize: 22 }} />
        </Box>
        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 700, flex: 1, pr: 1 }}>
          {titleText}
        </Typography>
        <IconButton size="small" onClick={onCancel} aria-label={cancelLabel} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={getMvsDialogPromptContentSx(theme)}>
        {message ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            {message}
          </Typography>
        ) : null}
        <TextField
          autoFocus
          fullWidth
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          multiline={multiline}
          minRows={multiline ? minRows : 1}
          size="small"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !multiline && canSubmit) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
      </DialogContent>

      <DialogActions sx={getMvsDialogActionsSx(theme)}>
        <Button onClick={onCancel} variant="outlined" sx={getMvsDialogCancelButtonSx(theme)}>
          {cancelLabel}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!canSubmit}
          sx={getMvsDialogPrimaryConfirmButtonSx()}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PromptDialog;
