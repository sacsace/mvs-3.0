import { useState, useCallback } from 'react';

interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
  onConfirm: (() => void) | null;
}

export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    open: false,
    message: '',
    onConfirm: null
  });

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    options?: Omit<ConfirmDialogOptions, 'message'>
  ) => {
    setDialogState({
      open: true,
      message,
      onConfirm,
      title: options?.title,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      confirmColor: options?.confirmColor
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState.onConfirm) {
      dialogState.onConfirm();
    }
    setDialogState(prev => ({ ...prev, open: false, onConfirm: null }));
  }, [dialogState.onConfirm]);

  const handleCancel = useCallback(() => {
    setDialogState(prev => ({ ...prev, open: false, onConfirm: null }));
  }, []);

  return {
    dialogState,
    showConfirm,
    handleConfirm,
    handleCancel
  };
};





