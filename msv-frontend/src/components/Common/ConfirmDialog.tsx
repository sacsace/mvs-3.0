import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  useTheme
} from '@mui/material';
import {
  HelpOutline as HelpOutlineIcon,
  WarningAmber as WarningAmberIcon,
  ErrorOutline as ErrorOutlineIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  MVS_CONFIRM_DIALOG_MAX_WIDTH,
  getMvsDialogActionsSx,
  getMvsDialogCancelButtonSx,
  getMvsDialogDangerConfirmButtonSx,
  getMvsDialogIconBoxSx,
  getMvsDialogMessageContentSx,
  getMvsDialogPaperSx,
  getMvsDialogPrimaryConfirmButtonSx,
  getMvsDialogTitleRowSx
} from './mvsDialogShell';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** primary: 일반 확인 / error·warning: 삭제·위험 작업 */
  confirmColor?: 'primary' | 'error' | 'warning';
}

/**
 * MVS **기본 확인 다이얼로그** (앱 전역 단일 스타일).
 *
 * 신규 페이지에서는 반드시 이 컴포넌트와 `useConfirmDialog` 를 사용하세요.
 * 레이아웃·색·버튼 형태는 `mvsDialogShell.ts` 에서만 조정합니다.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmColor = 'primary'
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const titleText = title ?? t('common.confirm');
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');

  const isDanger = confirmColor === 'error' || confirmColor === 'warning';
  const accent =
    confirmColor === 'error'
      ? theme.palette.error.main
      : confirmColor === 'warning'
        ? theme.palette.warning.main
        : theme.palette.primary.main;

  const titleIcon =
    confirmColor === 'error' ? (
      <ErrorOutlineIcon sx={{ fontSize: 22 }} />
    ) : confirmColor === 'warning' ? (
      <WarningAmberIcon sx={{ fontSize: 22 }} />
    ) : (
      <HelpOutlineIcon sx={{ fontSize: 22 }} />
    );

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth={MVS_CONFIRM_DIALOG_MAX_WIDTH}
      fullWidth
      scroll="paper"
      aria-labelledby="mvs-confirm-title"
      aria-describedby="mvs-confirm-message"
      slotProps={{
        backdrop: {
          sx: { backgroundColor: 'rgba(15, 23, 42, 0.35)' }
        }
      }}
      PaperProps={{
        sx: getMvsDialogPaperSx(theme)
      }}
    >
      <DialogTitle id="mvs-confirm-title" sx={getMvsDialogTitleRowSx(theme)}>
        <Box sx={getMvsDialogIconBoxSx(theme, accent, { tone: isDanger ? 'danger' : 'brand' })}>{titleIcon}</Box>
        <Typography
          component="span"
          variant="subtitle1"
          sx={{ fontWeight: 700, color: 'text.primary', flex: 1, pr: 1 }}
        >
          {titleText}
        </Typography>
        <IconButton size="small" onClick={onCancel} aria-label={cancelLabel} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent id="mvs-confirm-message" sx={getMvsDialogMessageContentSx(theme)}>
        <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={getMvsDialogActionsSx(theme)}>
        <Button onClick={onCancel} variant="outlined" sx={getMvsDialogCancelButtonSx(theme)}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          sx={isDanger ? getMvsDialogDangerConfirmButtonSx() : getMvsDialogPrimaryConfirmButtonSx()}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
