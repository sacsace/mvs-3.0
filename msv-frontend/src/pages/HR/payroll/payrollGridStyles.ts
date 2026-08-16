import type { SxProps, Theme } from '@mui/material/styles';

/** 급여 그리드 열 색상 — 저채도 슬레이트 톤 (그룹 구분만 은은하게) */
const PAYROLL_COL = {
  salary: { bg: '#FAFBFC', head: '#EEF1F5', text: '#475569', accent: '#CBD5E1' },
  salaryTotal: { bg: '#F6F8FA', head: '#E8ECF1', text: '#475569', accent: '#CBD5E1' },
  days: { bg: '#F9FAFB', head: '#EDF0F3', text: '#475569', accent: '#CBD5E1' },
  attendance: { bg: '#FAFAF9', head: '#F0EFED', text: '#475569', accent: '#CBD5E1' },
  extra: { bg: '#FFFFFF', head: '#F4F6F8', text: '#475569', accent: '#CBD5E1' },
  sum: { bg: '#F3F5F8', head: '#E4E9EF', text: '#334155', accent: '#94A3B8' },
  employer: { bg: '#F8F8FA', head: '#EEEEF2', text: '#475569', accent: '#CBD5E1' },
  employee: { bg: '#FAF9F9', head: '#F0EEEE', text: '#475569', accent: '#CBD5E1' },
  net: { bg: '#F4F6F5', head: '#E6EBE8', text: '#1E293B', accent: '#94A3B8' }
} as const;

/** MVS Body 리스트 헤더 톤 + 급여 그리드 열 강조 */
export const payrollDataGridSx: SxProps<Theme> = (theme) => {
  const light = theme.palette.mode === 'light';
  const headBg = light ? '#F1F5F9' : theme.palette.grey[800];
  const headFg = light ? '#475569' : theme.palette.grey[200];
  const headBorder = light ? '#A8B4C0' : theme.palette.divider;

  return {
    border: 'none',
    borderRadius: 0,
    fontSize: '0.8125rem',
    outline: 'none',
    '& .MuiDataGrid-main': { borderRadius: 0 },
    '& .MuiDataGrid-virtualScroller': {
      minHeight: 'unset !important',
      overflowX: 'hidden !important',
      overflowY: 'hidden !important'
    },
    '& .MuiDataGrid-virtualScrollerContent': { minHeight: 'unset !important' },
    '& .MuiDataGrid-scrollbar--horizontal': { display: 'none !important' },
    '& .MuiDataGrid-scrollbarFiller': { display: 'none !important' },
    '& .MuiDataGrid-columnHeaders': {
      backgroundColor: headBg,
      color: headFg,
      borderBottom: `1px solid ${headBorder}`,
      borderTop: 'none',
      fontSize: '0.75rem',
      minHeight: 56,
      borderRadius: 0
    },
    '& .MuiDataGrid-columnHeader': {
      backgroundColor: headBg,
      color: headFg,
      minHeight: '56px !important',
      maxHeight: 'none !important',
      py: 0.5,
      alignItems: 'center',
      borderRadius: 0,
      '&:focus, &:focus-within': { backgroundColor: headBg }
    },
    '& .MuiDataGrid-columnHeaderTitleContainer': {
      alignItems: 'center',
      justifyContent: 'center'
    },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontWeight: 600,
      whiteSpace: 'pre-line',
      lineHeight: 1.2,
      textAlign: 'center',
      fontSize: '0.7rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    '& .MuiDataGrid-cell': {
      py: 0.25,
      fontSize: '0.8125rem',
      display: 'flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    '& .MuiDataGrid-row': { maxHeight: 'none' },
    '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: '#FFFFFF' },
    '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: '#FFFFFF' },
    /* 호버 시 한 줄 전체가 선택된 것처럼 선명하게 (컬럼 배경보다 우선) */
    '& .MuiDataGrid-row:hover': {
      backgroundColor: light ? '#DCEEFF' : theme.palette.action.selected,
      outline: light ? '1px solid #7EB6E8' : `1px solid ${theme.palette.primary.main}`,
      outlineOffset: '-1px',
      zIndex: 1,
      '& .MuiDataGrid-cell': {
        backgroundColor: `${light ? '#DCEEFF' : theme.palette.action.selected} !important`
      }
    },
    '& .MuiDataGrid-row.Mui-hovered': {
      backgroundColor: light ? '#DCEEFF' : theme.palette.action.selected,
      '& .MuiDataGrid-cell': {
        backgroundColor: `${light ? '#DCEEFF' : theme.palette.action.selected} !important`
      }
    },
    '& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover': {
      backgroundColor: light ? '#C8E4FF' : theme.palette.action.selected,
      '& .MuiDataGrid-cell': {
        backgroundColor: `${light ? '#C8E4FF' : theme.palette.action.selected} !important`
      }
    },
    '& .MuiDataGrid-row:last-child .MuiDataGrid-cell:first-of-type': {
      borderBottomLeftRadius: { xs: '12px', sm: '18px' }
    },
    '& .MuiDataGrid-row:last-child .MuiDataGrid-cell:last-of-type': {
      borderBottomRightRadius: { xs: '12px', sm: '18px' }
    },

    /* 기본급 · HRA · 기타 수당 */
    '& .MuiDataGrid-cell.payroll-col-salary, & .MuiDataGrid-columnHeader.payroll-col-salary': {
      backgroundColor: light ? PAYROLL_COL.salary.bg : 'rgba(2, 132, 199, 0.14)',
      color: light ? PAYROLL_COL.salary.text : theme.palette.info.light
    },
    '& .MuiDataGrid-columnHeader.payroll-col-salary': {
      backgroundColor: light ? PAYROLL_COL.salary.head : 'rgba(2, 132, 199, 0.22)',
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-salary-start, & .MuiDataGrid-columnHeader.payroll-col-salary-start': {
      borderLeft: '2px solid',
      borderLeftColor: light ? PAYROLL_COL.salary.accent : theme.palette.divider
    },

    /* 급여 합계 (동일 그룹, 약간 진함) */
    '& .MuiDataGrid-cell.payroll-col-salary-total, & .MuiDataGrid-columnHeader.payroll-col-salary-total': {
      backgroundColor: light ? PAYROLL_COL.salaryTotal.bg : 'rgba(3, 105, 161, 0.16)',
      color: light ? PAYROLL_COL.salaryTotal.text : theme.palette.info.light,
      fontWeight: 600
    },
    '& .MuiDataGrid-columnHeader.payroll-col-salary-total': {
      backgroundColor: light ? PAYROLL_COL.salaryTotal.head : 'rgba(3, 105, 161, 0.24)',
      fontWeight: 600
    },

    /* 근무일 */
    '& .MuiDataGrid-cell.payroll-col-days, & .MuiDataGrid-columnHeader.payroll-col-days': {
      backgroundColor: light ? PAYROLL_COL.days.bg : 'rgba(13, 148, 136, 0.16)',
      color: light ? PAYROLL_COL.days.text : theme.palette.info.light,
      justifyContent: 'center'
    },
    '& .MuiDataGrid-columnHeader.payroll-col-days': {
      backgroundColor: light ? PAYROLL_COL.days.head : 'rgba(13, 148, 136, 0.24)',
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-days .MuiInputBase-input': { textAlign: 'center' },
    '& .MuiDataGrid-cell.payroll-col-days-start, & .MuiDataGrid-columnHeader.payroll-col-days-start': {
      borderLeft: '2px solid',
      borderLeftColor: light ? PAYROLL_COL.days.accent : theme.palette.divider
    },

    /* OT */
    '& .MuiDataGrid-cell.payroll-col-attendance, & .MuiDataGrid-columnHeader.payroll-col-attendance': {
      backgroundColor: light ? PAYROLL_COL.attendance.bg : 'rgba(217, 119, 6, 0.14)',
      color: light ? PAYROLL_COL.attendance.text : theme.palette.warning.light
    },
    '& .MuiDataGrid-columnHeader.payroll-col-attendance': {
      backgroundColor: light ? PAYROLL_COL.attendance.head : 'rgba(217, 119, 6, 0.22)',
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-attendance-start, & .MuiDataGrid-columnHeader.payroll-col-attendance-start': {
      borderLeft: '2px solid',
      borderLeftColor: light ? PAYROLL_COL.attendance.accent : theme.palette.divider
    },

    /* 추가 수당 */
    '& .MuiDataGrid-cell.payroll-col-extra, & .MuiDataGrid-columnHeader.payroll-col-extra': {
      backgroundColor: light ? PAYROLL_COL.extra.bg : 'rgba(148, 163, 184, 0.12)',
      color: light ? PAYROLL_COL.extra.text : theme.palette.text.secondary
    },
    '& .MuiDataGrid-columnHeader.payroll-col-extra': {
      backgroundColor: light ? PAYROLL_COL.extra.head : 'rgba(148, 163, 184, 0.2)',
      fontWeight: 600
    },

    /* 지급 합계 */
    '& .MuiDataGrid-cell.payroll-col-sum, & .MuiDataGrid-columnHeader.payroll-col-sum': {
      backgroundColor: light ? PAYROLL_COL.sum.bg : 'rgba(29, 78, 124, 0.16)',
      color: light ? PAYROLL_COL.sum.text : theme.palette.text.primary,
      fontWeight: 600
    },
    '& .MuiDataGrid-columnHeader.payroll-col-sum': {
      backgroundColor: light ? PAYROLL_COL.sum.head : 'rgba(29, 78, 124, 0.24)',
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-sum-start, & .MuiDataGrid-columnHeader.payroll-col-sum-start': {
      borderLeft: '2px solid',
      borderLeftColor: light ? PAYROLL_COL.sum.accent : theme.palette.divider
    },

    /* 사업주 */
    '& .MuiDataGrid-cell.payroll-col-employer, & .MuiDataGrid-columnHeader.payroll-col-employer': {
      backgroundColor: light ? PAYROLL_COL.employer.bg : 'rgba(124, 58, 237, 0.16)',
      color: light ? PAYROLL_COL.employer.text : theme.palette.text.primary,
      fontWeight: 500
    },
    '& .MuiDataGrid-columnHeader.payroll-col-employer': {
      backgroundColor: light ? PAYROLL_COL.employer.head : 'rgba(124, 58, 237, 0.24)',
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-employer-start, & .MuiDataGrid-columnHeader.payroll-col-employer-start': {
      borderLeft: '2px solid',
      borderLeftColor: light ? PAYROLL_COL.employer.accent : theme.palette.divider
    },

    /* 직원 공제 */
    '& .MuiDataGrid-cell.payroll-col-employee, & .MuiDataGrid-columnHeader.payroll-col-employee': {
      backgroundColor: light ? PAYROLL_COL.employee.bg : 'rgba(225, 29, 72, 0.14)',
      color: light ? PAYROLL_COL.employee.text : theme.palette.text.primary,
      fontWeight: 500
    },
    '& .MuiDataGrid-columnHeader.payroll-col-employee': {
      backgroundColor: light ? PAYROLL_COL.employee.head : 'rgba(225, 29, 72, 0.22)',
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-employee-start, & .MuiDataGrid-columnHeader.payroll-col-employee-start': {
      borderLeft: '2px solid',
      borderLeftColor: light ? PAYROLL_COL.employee.accent : theme.palette.divider
    },
    '& .MuiDataGrid-cell.payroll-col-employee .MuiInputBase-input': {
      color: light ? PAYROLL_COL.employee.text : theme.palette.text.primary
    },

    /* 실수령 */
    '& .MuiDataGrid-cell.payroll-col-net, & .MuiDataGrid-columnHeader.payroll-col-net': {
      backgroundColor: light ? PAYROLL_COL.net.bg : 'rgba(234, 88, 12, 0.16)',
      color: light ? PAYROLL_COL.net.text : theme.palette.text.primary,
      fontWeight: 600
    },
    '& .MuiDataGrid-columnHeader.payroll-col-net': {
      backgroundColor: light ? PAYROLL_COL.net.head : 'rgba(234, 88, 12, 0.24)',
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-net-start, & .MuiDataGrid-columnHeader.payroll-col-net-start': {
      borderLeft: '2px solid',
      borderLeftColor: light ? PAYROLL_COL.net.accent : theme.palette.divider
    },
    '& .MuiDataGrid-cell.payroll-col-net .MuiInputBase-input': {
      color: light ? PAYROLL_COL.net.text : theme.palette.text.primary,
      fontWeight: 600
    },

    /* 사용자 입력 — Unpaid Leave, OT Hours, Extra Allowance */
    '& .MuiDataGrid-cell.payroll-col-user-input': {
      color: `${light ? '#B91C1C' : theme.palette.error.light} !important`,
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-user-input .MuiInputBase-input': {
      color: `${light ? '#B91C1C' : theme.palette.error.light} !important`,
      fontWeight: 600
    },
    '& .MuiDataGrid-cell.payroll-col-user-input .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: light ? 'rgba(239, 68, 68, 0.45)' : theme.palette.error.dark
      },
      '&:hover fieldset': {
        borderColor: light ? 'rgba(239, 68, 68, 0.65)' : theme.palette.error.main
      },
      '&.Mui-focused fieldset': {
        borderColor: light ? '#DC2626' : theme.palette.error.main
      }
    },

    '& .MuiDataGrid-footerContainer': { display: 'none' },
    '& .MuiDataGrid-filler': { display: 'none !important' },
    '& .MuiDataGrid-bottomContainer': { display: 'none' }
  };
};
