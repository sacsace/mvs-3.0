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
  py: { xs: '16px', sm: '24px', md: '32px' },
  px: { xs: '12px', sm: '24px', md: '40px' },
};

export const mvsMainSurfaceSx: SxProps<Theme> = {
  backgroundColor: '#FFFFFF',
  borderRadius: '10px',
  padding: { xs: '16px', sm: '24px', md: '32px' },
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
  border: '1px solid #D0DBE8',
  boxSizing: 'border-box',
};

export const mvsSectionGroupSx: SxProps<Theme> = {
  backgroundColor: '#F0F4F8',
  borderRadius: '10px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #D0DBE8',
  boxShadow: 'none',
};

export const mvsInnerCardSx: SxProps<Theme> = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '18px',
  border: '1px solid #D0DBE8',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
};

export const mvsFilterToolbarSx: MvsStyleObject = {
  backgroundColor: '#F0F4F8',
  borderRadius: '8px',
  padding: { xs: '12px', sm: '16px' },
  marginBottom: { xs: '16px', sm: '24px' },
  border: '1px solid #D0DBE8',
  boxShadow: 'none',
};

/** 검색·필터 입력(TextField·Select·Autocomplete) 테두리 — 페이지 sx에 spread */
export const mvsSearchFieldSx: MvsStyleObject = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    bgcolor: 'background.paper',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#D0DBE8',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#B8C4D0',
    },
    '& fieldset': {
      borderColor: '#D0DBE8',
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
  borderRadius: '10px',
  padding: { xs: '12px', sm: '18px' },
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
  border: '1px solid #D0DBE8',
};

/** KPI·요약 카드 — 재고·회계 등 목록 상단 통계 */
export const mvsKpiCardSx: SxProps<Theme> = (theme) => ({
  borderRadius: '8px',
  border: '1px solid',
  borderColor: theme.palette.mode === 'light' ? '#D0DBE8' : 'divider',
  boxShadow:
    theme.palette.mode === 'light' ? '0 1px 2px rgba(15, 23, 42, 0.05)' : '0 1px 2px rgba(0,0,0,0.25)',
  bgcolor: 'background.paper',
});

/** 필터 입력 높이(40px) — mvsSearchFieldSx와 함께 spread */
export const mvsFilterFieldHeightSx: MvsStyleObject = {
  '& .MuiOutlinedInput-root': {
    height: 40,
    '& .MuiOutlinedInput-input': { py: 0 },
  },
};

/** 모바일에서 넓은 테이블 가로 스크롤 */
export const mvsTableScrollSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
};

/** 필터 아래 테이블을 살짝 띄워 구분 (전자결재·고객정보 등과 동일 계열) */
export const mvsTableWellSx: SxProps<Theme> = (theme) => ({
  mt: 2.5,
  pt: 2.5,
  borderTop: '1px solid',
  borderColor:
    theme.palette.mode === 'dark' ? theme.palette.divider : '#D0DBE8',
  borderRadius: 0,
});

export const mvsTableInsetWrapSx: SxProps<Theme> = (theme) => ({
  borderRadius: '10px',
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
  const headBorder = light ? '#A8B4C0' : theme.palette.divider;
  return {
    bgcolor: headBg,
    '& .MuiTableCell-head': {
      bgcolor: headBg,
      color: headFg,
      fontWeight: 600,
      fontSize: '0.8125rem',
      textTransform: 'none',
      letterSpacing: '0.02em',
      overflow: 'hidden',
      borderBottom: `1px solid ${headBorder}`,
      borderTop: '2px solid',
      borderTopColor: 'primary.main',
      py: 1.5,
    },
    '& .MuiTableCell-head.MuiTableCell-paddingCheckbox': {
      overflow: 'visible',
      width: 56,
      minWidth: 56,
      maxWidth: 56,
      pl: { xs: 1.5, sm: 2 },
      pr: 1,
      boxSizing: 'border-box',
    },
  };
};

/** Body 페이지네이션 — 배경·외곽 박스 없음 */
export const mvsBodyPaginationSx: MvsStyleObject = {
  display: 'flex',
  justifyContent: 'center',
  py: 2,
  bgcolor: 'transparent',
};

/** Body 리스트 영역 — 외곽 박스·배경 없음 (컨트롤 카드 아래) */
export const mvsBodyListZoneSx: MvsStyleObject = {
  width: '100%',
  bgcolor: 'transparent',
  mt: { xs: 2, sm: 2.5 },
};

/** Body 카드·리스트 공통 외곽 톤 */
export const mvsBodyFrameBorder = '1px solid #D0DBE8';
export const mvsBodyFrameShadow = '0 4px 14px rgba(15, 23, 42, 0.07)';
export const mvsBodyFrameRadius = { xs: '14px', sm: '20px' } as const;

/** Body 리스트 테이블 래퍼 — 컨트롤 카드와 동일 외곽 톤 */
export const mvsBodyListTableSx: MvsStyleObject = {
  width: '100%',
  maxWidth: '100%',
  overflow: 'auto',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  bgcolor: '#FFFFFF',
  borderRadius: mvsBodyFrameRadius,
  border: mvsBodyFrameBorder,
  boxShadow: mvsBodyFrameShadow,
  '& .MuiTableHead-root .MuiTableRow-root .MuiTableCell-head:first-of-type': {
    borderTopLeftRadius: { xs: '12px', sm: '18px' },
  },
  '& .MuiTableHead-root .MuiTableRow-root .MuiTableCell-head:last-of-type': {
    borderTopRightRadius: { xs: '12px', sm: '18px' },
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-body:first-of-type': {
    borderBottomLeftRadius: { xs: '12px', sm: '18px' },
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-body:last-of-type': {
    borderBottomRightRadius: { xs: '12px', sm: '18px' },
  },
};

/** ── Body 영역 표준 (KPI 아래 리스트·테이블 본문) ── */

/** Body 카드 — 흰색 외곽 컨테이너 */
export const mvsBodyCardSx: MvsStyleObject = {
  backgroundColor: '#FFFFFF',
  borderRadius: mvsBodyFrameRadius,
  boxShadow: mvsBodyFrameShadow,
  border: mvsBodyFrameBorder,
  overflow: 'hidden',
};

/** Body 섹션 헤더 — 제목 + 주요 액션 */
export const mvsBodySectionHeaderSx: MvsStyleObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 1.5,
  px: { xs: 2, sm: 2.5 },
  py: 2,
  borderBottom: '1px solid #D0DBE8',
  bgcolor: '#FFFFFF',
};

/** Body 보조 도구 버튼 줄 */
export const mvsBodyToolbarSx: MvsStyleObject = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 1,
  px: { xs: 2, sm: 2.5 },
  py: 1.5,
  bgcolor: '#F8FAFC',
  borderBottom: '1px solid #D0DBE8',
};

/** Body 보조 outlined 버튼 — primary(추가)와 구분되는 연한 슬레이트 톤 */
export const mvsBodyOutlinedBtnSx: MvsStyleObject = {
  textTransform: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.8125rem',
  minHeight: 36,
  px: 1.5,
  borderColor: '#B8C4D0',
  color: '#334155',
  bgcolor: '#F1F5F9',
  boxShadow: 'none',
  '& .MuiButton-startIcon': { mr: '6px', color: '#64748B' },
  '&:hover': {
    borderColor: '#94A3B8',
    bgcolor: '#E8EDF3',
    color: '#1E293B',
    '& .MuiButton-startIcon': { color: '#475569' },
  },
};

/** Body 통일 primary 버튼 */
export const mvsBodyPrimaryBtnSx: MvsStyleObject = {
  textTransform: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.8125rem',
  minHeight: 36,
  px: 2,
  boxShadow: 'none',
};

/** Body 필터 래퍼 */
export const mvsBodyFilterWrapSx: MvsStyleObject = {
  px: { xs: 2, sm: 2.5 },
  py: 2,
  bgcolor: '#F3F5F7',
};

/** Body 테이블 인셋 — 회색 배경, 좌우 대칭 패딩으로 리스트 중앙 정렬 */
export const mvsBodyTableInsetSx: MvsStyleObject = {
  px: { xs: 2, sm: 2.5 },
  py: { xs: 2, sm: 2.5 },
  bgcolor: '#EEF1F3',
};

/** Body 테이블 프레임 — 인셋 안 흰 테이블 카드 */
export const mvsBodyTableFrameSx: MvsStyleObject = {
  width: '100%',
  maxWidth: '100%',
  mx: 'auto',
  borderRadius: '8px',
  border: '1px solid #D0DBE8',
  overflow: 'hidden',
  bgcolor: '#FFFFFF',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
};

/** Body 테이블 바디 — 줄무늬 없음(전 행 흰색), hover만 구분 */
export const mvsTableBodyRowSx: SxProps<Theme> = (theme) => {
  const rowBg = theme.palette.mode === 'light' ? '#FFFFFF' : theme.palette.background.paper;
  const hover = theme.palette.mode === 'light' ? '#EFF6FF' : 'action.hover';
  const border = theme.palette.mode === 'light' ? '#D1DAE4' : theme.palette.divider;
  return {
    '& .MuiTableCell-body': {
      py: 1.5,
      px: 2,
      fontSize: '0.875rem',
      borderBottom: `1px solid ${border}`,
    },
    '& .MuiTableRow-root': {
      bgcolor: rowBg,
    },
    '& .MuiTableRow-root:hover': {
      bgcolor: hover,
    },
    '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
      borderBottom: 'none',
    },
  };
};

export const mvsPageTitleSx: SxProps<Theme> = {
  fontSize: { xs: '18px', sm: '20px', md: '22px' },
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

/** 업무 관리(보드 목록·상세) 페이지 배경 */
export const mvsWorkBoardPageBg = '#F0F4F9';

/** 대시보드 하단 위젯 그룹 배경 */
export const mvsDashboardWidgetGroupSx: SxProps<Theme> = {
  backgroundColor: '#EEF3F8',
  borderRadius: '10px',
  padding: '20px',
  gap: '20px',
  border: '1px solid #D0DBE8',
  boxShadow: 'none',
};

/** 대시보드 개별 위젯 카드(내부 패딩은 CardContent 유지) */
export const mvsDashboardWidgetCardSx: SxProps<Theme> = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
  border: '1px solid #D0DBE8',
};
