import { useState, useCallback, useRef } from 'react';

/**
 * 확인 모달 상태 훅. UI는 반드시 `components/Common/ConfirmDialog` 를 렌더링하고
 * 스타일은 `mvsDialogShell.ts` 기본값을 따릅니다.
 */
interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
}

export interface ConfirmDialogState {
  open: boolean;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
}

const closedState: ConfirmDialogState = {
  open: false,
  message: ''
};

export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(closedState);
  const onConfirmRef = useRef<(() => void) | null>(null);

  const showConfirm = useCallback(
    (message: string, onConfirm: () => void, options?: Omit<ConfirmDialogOptions, 'message'>) => {
      onConfirmRef.current = onConfirm;
      setDialogState({
        open: true,
        message,
        title: options?.title,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        confirmColor: options?.confirmColor
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    onConfirmRef.current?.();
    onConfirmRef.current = null;
    setDialogState(closedState);
  }, []);

  const handleCancel = useCallback(() => {
    onConfirmRef.current = null;
    setDialogState(closedState);
  }, []);

  return {
    dialogState,
    showConfirm,
    handleConfirm,
    handleCancel
  };
};





