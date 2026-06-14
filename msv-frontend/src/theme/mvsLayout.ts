import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/** sx prop에 spread 가능한 plain object 토큰 */
export type MvsStyleObject = SystemStyleObject<Theme>;

/** MVS 공통 레이아웃 토큰 — 페이지에서 sx로 재사용 가능 (로직 변경 없음) */
export const mvsPageShellSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: '100%',
  margin: 0,
  boxSizing: 'border-box',
  py: '32px',
  px: { xs: '24px', sm: '40px' },
};

export const mvsMainSurfaceSx: SxProps<Theme> = {
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '32px',
  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.09)',
  border: '1px solid #B8C4D0',
  boxSizing: 'border-box',
};

export const mvsSectionGroupSx: SxProps<Theme> = {
  backgroundColor: '#F0F4F8',
  borderRadius: '20px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #C5CED9',
  boxShadow: 'none',
};

export const mvsInnerCardSx: SxProps<Theme> = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '18px',
  border: '1px solid #C5CED9',
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
};

export const mvsFilterToolbarSx: MvsStyleObject = {
  backgroundColor: '#F0F4F8',
  borderRadius: '18px',
  padding: '16px',
  marginBottom: '24px',
  border: '1px solid #C5CED9',
  boxShadow: 'none',
};

/** 검색·필터 입력(TextField·Select·Autocomplete) 테두리 — 페이지 sx에 spread */
export const mvsSearchFieldSx: MvsStyleObject = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    bgcolor: 'background.paper',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#C5CED9',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#B8C4D0',
    },
    '& fieldset': {
      borderColor: '#C5CED9',
    },
    '&:hover fieldset': {
      borderColor: '#B8C4D0',
    },
  },
};

/** 검색·필터 outlined 라벨 — 테두리 위 고정 (급여관리·근태관리 필터와 동일) */
export const mvsOutlinedLabelProps = {
  InputLabelProps: { shrink: true },
} as const;

/** 검색·필터 영역 래퍼(mvsFilterToolbarSx와 동일 계열) */
export const mvsSearchZoneSx: MvsStyleObject = mvsFilterToolbarSx;

export const mvsTableZoneSx: SxProps<Theme> = {
  backgroundColor: '#FFFFFF',
  borderRadius: '20px',
  padding: '18px',
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.07)',
  border: '1px solid #C5CED9',
};

/** 필터 아래 테이블을 살짝 띄워 구분 (전자결재·고객정보 등과 동일 계열) */
export const mvsTableWellSx: SxProps<Theme> = (theme) => ({
  mt: 2.5,
  pt: 2.5,
  borderTop: '1px solid',
  borderColor:
    theme.palette.mode === 'dark' ? theme.palette.divider : '#C5CED9',
  borderRadius: 0,
});

export const mvsTableInsetWrapSx: SxProps<Theme> = (theme) => ({
  borderRadius: '18px',
  p: { xs: 1, sm: 1.25 },
  bgcolor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : '#E8EDF3',
});

/** MuiTableCell head 기본이 transparent인 경우를 대비해 헤더 행을 확실히 구분 */
export const mvsTableHeadHighlightSx: SxProps<Theme> = (theme) => {
  const light = theme.palette.mode === 'light';
  const headBg = light ? '#F1F5F9' : theme.palette.grey[800];
  const headFg = light ? '#475569' : theme.palette.grey[200];
  const headBorder = light ? '#C5CED9' : theme.palette.divider;
  return {
    bgcolor: headBg,
    '& .MuiTableCell-head': {
      bgcolor: headBg,
      color: headFg,
      fontWeight: 600,
      fontSize: '0.8125rem',
      textTransform: 'none',
      letterSpacing: '0.02em',
      borderBottom: `1px solid ${headBorder}`,
      borderTop: '2px solid',
      borderTopColor: 'primary.main',
      py: 1.5,
    },
  };
};

export const mvsPageTitleSx: SxProps<Theme> = {
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: '-0.02em',
  color: '#111827',
  marginBottom: 0,
};

/** 모든 페이지 공통 루트 래퍼 — AppLayout 패딩 안에서 시작 위치 통일 */
export const mvsPageRootSx: SxProps<Theme> = {
  p: 0,
  width: '100%',
  maxWidth: '100%',
  minHeight: '100%',
  boxSizing: 'border-box',
  bgcolor: 'transparent',
};

export const mvsPageDescriptionSx: SxProps<Theme> = {
  fontSize: '13px',
  lineHeight: 1.6,
  color: '#6B7280',
};

export const mvsTitleBlockSx: SxProps<Theme> = {
  marginBottom: '24px',
};

/** 업무 관리(보드 목록·상세) 페이지 배경 그라데이션 */
export const mvsWorkBoardPageBg =
  'linear-gradient(145deg, #EEF2FA 0%, #E8EBF5 42%, #F4F6FB 100%)';

/** 대시보드 하단 위젯 그룹 배경 */
export const mvsDashboardWidgetGroupSx: SxProps<Theme> = {
  backgroundColor: '#F0F4F8',
  borderRadius: '22px',
  padding: '20px',
  gap: '20px',
  border: '1px solid #C5CED9',
  boxShadow: 'none',
};

/** 대시보드 개별 위젯 카드(내부 패딩은 CardContent 유지) */
export const mvsDashboardWidgetCardSx: SxProps<Theme> = {
  backgroundColor: '#FFFFFF',
  borderRadius: '18px',
  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.07)',
  border: '1px solid #C5CED9',
};
