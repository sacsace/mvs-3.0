import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import {
  Warning as WarningIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: 'primary' | 'error' | 'warning';
}

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
  const { t } = useTranslation();
  const titleText = title ?? t('common.confirm');
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 1,
          borderBottom: '2px solid',
          borderColor: confirmColor === 'error' ? 'error.main' : confirmColor === 'warning' ? 'warning.main' : 'primary.main'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <WarningIcon 
            sx={{ 
              color: confirmColor === 'error' ? 'error.main' : confirmColor === 'warning' ? 'warning.main' : 'primary.main',
              fontSize: 24
            }} 
          />
          <Typography variant="h6" sx={{ 
            color: confirmColor === 'error' ? 'error.main' : confirmColor === 'warning' ? 'warning.main' : 'primary.main',
            fontWeight: 600 
          }}>
            {titleText}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onCancel}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.6 }}>
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            px: 3,
            py: 1
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            px: 3,
            py: 1
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;





