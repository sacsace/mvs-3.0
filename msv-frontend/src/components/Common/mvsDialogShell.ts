import type { SxProps, Theme } from '@mui/material/styles';
import { lighten, alpha } from '@mui/material/styles';

/**
 * MVS 공통 모달(확인·입력) 시각 토큰.
 *
 * - 신규 **확인** UI: `ConfirmDialog` + `useConfirmDialog` 만 사용합니다.
 * - 신규 **문자 입력** UI: `PromptDialog` + `usePromptDialog` 를 사용합니다.
 * - 페이지/기능별로 `Dialog` + 커스텀 `PaperProps` 로 확인창을 새로 만들지 마세요. (디자인 드리프트 방지)
 */

export const MVS_CONFIRM_DIALOG_MAX_WIDTH = 'xs' as const;
export const MVS_PROMPT_DIALOG_MAX_WIDTH = 'sm' as const;

export function getMvsDialogPaperSx(theme: Theme): SxProps<Theme> {
  return {
    borderRadius: theme.spacing(3),
    overflow: 'hidden',
    boxShadow: '0 20px 48px rgba(15, 74, 82, 0.18)',
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper
  };
}

export function getMvsDialogTitleRowSx(theme: Theme): SxProps<Theme> {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    py: theme.spacing(2),
    px: theme.spacing(2.5),
    bgcolor: theme.palette.background.paper,
    borderBottom: '1px solid',
    borderColor: 'divider'
  };
}

export function getMvsDialogIconBoxSx(
  theme: Theme,
  accent: string,
  options: { tone: 'brand' | 'danger' }
): SxProps<Theme> {
  return {
    width: 40,
    height: 40,
    borderRadius: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: accent,
    bgcolor:
      options.tone === 'danger' ? alpha(accent, 0.14) : alpha(theme.palette.primary.main, 0.12)
  };
}

export function getMvsDialogMessageContentSx(theme: Theme): SxProps<Theme> {
  return {
    px: theme.spacing(2.5),
    pt: theme.spacing(2.5),
    pb: theme.spacing(1)
  };
}

/** PromptDialog 본문(설명 + 입력) */
export function getMvsDialogPromptContentSx(theme: Theme): SxProps<Theme> {
  return {
    px: theme.spacing(2.5),
    pt: theme.spacing(2),
    pb: theme.spacing(1)
  };
}

export function getMvsDialogActionsSx(theme: Theme): SxProps<Theme> {
  return {
    px: theme.spacing(2.5),
    pb: theme.spacing(2.5),
    pt: theme.spacing(1),
    gap: theme.spacing(1.5),
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  };
}

/** 취소 — 연한 primary 톤, pill */
export function getMvsDialogCancelButtonSx(theme: Theme): SxProps<Theme> {
  return {
    borderRadius: 999,
    textTransform: 'none',
    px: 3,
    py: 1,
    minWidth: 100,
    borderColor: theme.palette.primary.light,
    color: theme.palette.primary.dark,
    bgcolor: lighten(theme.palette.primary.main, 0.88),
    '&:hover': {
      borderColor: theme.palette.primary.main,
      bgcolor: lighten(theme.palette.primary.main, 0.82)
    }
  };
}

/** 확인(primary) — 흰 테두리 링 / danger 는 MUI `color`에 맡김 */
export function getMvsDialogPrimaryConfirmButtonSx(): SxProps<Theme> {
  return {
    borderRadius: 999,
    textTransform: 'none',
    px: 3,
    py: 1,
    minWidth: 100,
    boxShadow: 'none',
    border: '2px solid rgba(255,255,255,0.45)'
  };
}

export function getMvsDialogDangerConfirmButtonSx(): SxProps<Theme> {
  return {
    borderRadius: 999,
    textTransform: 'none',
    px: 3,
    py: 1,
    minWidth: 100,
    boxShadow: 'none'
  };
}
