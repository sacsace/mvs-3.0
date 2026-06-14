import { createTheme } from '@mui/material/styles';
import './types';
import { injectStitchesGlobalStyles } from '../styles/stitches';

injectStitchesGlobalStyles();

/** 로그인 등 기본 테마 — 모던 SaaS/ERP(밝은 캔버스·얇은 보더·넉넉한 여백), 로그인 후 createDynamicTheme */
const theme = createTheme({
  palette: {
    primary: {
      50: '#E8F6F7',
      100: '#C5E8EB',
      200: '#8FD0D6',
      300: '#52B0BA',
      400: '#2A939E',
      500: '#007A83',
      600: '#006B74',
      700: '#00656D',
      800: '#004F55',
      900: '#00363A',
      main: '#007A83',
      light: '#2A939E',
      dark: '#00656D',
      contrastText: '#ffffff',
    },
    secondary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      main: '#22c55e',
      light: '#4ade80',
      dark: '#15803d',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#2563EB',
      light: '#60A5FA',
      dark: '#1D4ED8',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    divider: '#C5CED9',
    background: {
      default: '#E8EDF3',
      paper: '#FFFFFF',
    },
    workArea: {
      main: '#FFFFFF',
      light: '#F4F7FA',
      dark: '#E8EDF3',
    },
    bodyArea: {
      main: '#E8EDF3',
      light: '#F0F4F8',
      dark: '#DCE3ED',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  typography: {
    fontFamily:
      'Pretendard, "Pretendard Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif',
    /** 페이지 메인 타이틀 — 전 화면 동일 */
    h1: {
      fontSize: '22px',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#111827',
    },
    pageTitle: {
      fontSize: '22px',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#111827',
      marginBottom: '6px',
    },
    /** 섹션 제목 */
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.015em',
      color: '#111827',
    },
    /** 카드·위젯 헤더 타이틀 */
    cardTitle: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#111827',
    },
    /** 페이지 설명 문단 */
    pageDescription: {
      fontSize: '13px',
      lineHeight: 1.6,
      color: '#6B7280',
    },
    /** KPI 숫자 */
    kpiNumber: {
      fontSize: '22px',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#111827',
    },
    h2: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.015em',
      marginBottom: '12px',
      color: '#111827',
    },
    h3: {
      fontSize: '1.0625rem',
      fontWeight: 500,
      lineHeight: 1.45,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.45,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.0625rem',
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0',
    },
    body1: {
      fontSize: '13.5px',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0',
      color: '#111827',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.45,
      letterSpacing: '0',
    },
    caption: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0',
      color: '#6B7280',
    },
    subtitle1: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#111827',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.45,
      letterSpacing: '0',
    },
  },
  shape: {
    borderRadius: 16,
  },
  spacing: 8, // 8px 그리드 시스템
  shadows: [
    'none',
    '0 2px 8px rgba(0, 0, 0, 0.03)',
    '0 6px 20px rgba(0, 0, 0, 0.04)',
    '0 6px 20px rgba(0, 0, 0, 0.05)',
    '0 8px 24px rgba(0, 0, 0, 0.06)',
    '0 10px 28px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 12px 32px rgba(0, 0, 0, 0.06)',
    '0 24px 104px rgba(0, 0, 0, 0.1)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backgroundColor: '#F5F6F8',
          color: '#111827',
          fontSize: '13.5px',
        },
      },
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: {
          pageTitle: 'h1',
          sectionTitle: 'h2',
          cardTitle: 'h3',
          pageDescription: 'p',
          kpiNumber: 'div',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '13.5px',
          minHeight: 40,
          padding: '8px 16px',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&.Mui-disabled': {
            opacity: 0.5,
          },
        },
        outlined: {
          borderColor: '#E5E7EB',
          '&:hover': {
            borderColor: '#D1D5DB',
            backgroundColor: '#F9FAFB',
          },
        },
        contained: {
          backgroundColor: '#007A83',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(0, 122, 131, 0.2)',
          '&:hover': {
            backgroundColor: '#00656D',
            boxShadow: '0 6px 16px rgba(0, 122, 131, 0.26)',
          },
        },
        sizeSmall: {
          fontSize: '0.8125rem',
          minHeight: 34,
          padding: '6px 14px',
        },
        sizeLarge: {
          fontSize: '0.9375rem',
          minHeight: 44,
          padding: '10px 22px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const outlined = ownerState.variant === 'outlined';
          return {
            backgroundColor: '#FFFFFF',
            transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
            ...(outlined
              ? {
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                  border: '1px solid #C5CED9',
                  '&:hover': {
                    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                  },
                }
              : {
                  borderRadius: '18px',
                  border: '1px solid #C5CED9',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
                  },
                }),
          };
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const outlined = ownerState.variant === 'outlined';
          const elev =
            ownerState.variant === 'elevation' && typeof ownerState.elevation === 'number'
              ? ownerState.elevation
              : 0;
          /** 메뉴·다이얼로그 등 고 elevation — MUI 기본 그림자 유지 */
          if (ownerState.variant === 'elevation' && elev >= 8) {
            return { backgroundImage: 'none' };
          }
          return {
            backgroundImage: 'none',
            ...(outlined
              ? {
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                  border: '1px solid #C5CED9',
                }
              : {
                  borderRadius: '18px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
                  border: '1px solid #C5CED9',
                }),
          };
        },
      },
    },
    /** 다이얼로그 내부에서 폼 라벨이 잘리지 않도록 기본 글자 크기·overflow 보정 (body 전역 font-size 등과 분리) */
    MuiDialog: {
      styleOverrides: {
        paper: {
          fontSize: '1rem',
          lineHeight: 1.5
        }
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          overflow: 'visible'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            backgroundColor: '#FFFFFF',
            minHeight: 44,
            '& .MuiOutlinedInput-input': {
              paddingTop: '12px',
              paddingBottom: '12px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#C5CED9',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#B8C4D0',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#007A83',
              borderWidth: 2,
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: '#9CA3AF',
            opacity: 1,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '14px',
          backgroundColor: '#FFFFFF',
          minHeight: 44,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#C5CED9',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#B8C4D0',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#007A83',
            borderWidth: 2,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: '14px',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
            transform: 'none',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(15, 23, 42, 0.04)',
          boxShadow: 'none',
          backgroundColor: '#F7F8FA',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          color: '#111827',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(15, 23, 42, 0.04)',
          backdropFilter: 'blur(14px)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '10px',
          margin: '4px 8px',
          padding: '10px 12px',
          borderLeft: 'none',
          fontSize: '13px',
          color: '#4B5563',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(15, 23, 42, 0.04)',
            transform: 'translateY(-1px)',
          },
          '&.Mui-selected': {
            backgroundColor: '#EAF2FF',
            color: '#007A83',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: '#E0EBFA',
            },
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableHead-root': {
            backgroundColor: '#F8FAFC',
          },
          '& .MuiTableCell-head': {
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            lineHeight: 1.4,
          },
          '& .MuiTableRow-root': {
            height: 56,
          },
          '& .MuiTableRow-root:hover': {
            backgroundColor: '#F8FAFC',
          },
          '& .MuiTableCell-root': {
            borderBottom: '1px solid #EEF2F7',
            fontSize: '13.5px',
            lineHeight: 1.5,
            color: '#111827',
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#F8FAFC',
          '& .MuiTableCell-head': {
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            textTransform: 'none',
            letterSpacing: '0.02em',
            borderBottom: '1px solid #EEF2F7',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '13.5px',
          borderBottom: '1px solid #EEF2F7',
          padding: '14px 16px',
          color: '#111827',
          lineHeight: 1.5,
        },
        head: {
          color: '#475569',
          fontWeight: 600,
          fontSize: '12px',
          lineHeight: 1.4,
          borderBottom: '1px solid #EEF2F7',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          height: 56,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#F8FAFC',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          height: 26,
          borderRadius: 9999,
          fontWeight: 600,
        },
        colorSuccess: {
          backgroundColor: 'rgba(22, 163, 74, 0.12)',
          color: '#15803D',
        },
        colorWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.14)',
          color: '#B45309',
        },
        colorError: {
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          color: '#DC2626',
        },
        colorInfo: {
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          color: '#1D4ED8',
        },
        colorDefault: {
          backgroundColor: '#F3F4F6',
          color: '#4B5563',
        },
        colorPrimary: {
          backgroundColor: 'rgba(0, 122, 131, 0.12)',
          color: '#00656D',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '6px',
          transition: 'all 0.2s ease',
          color: '#64748B',
          '&:hover': {
            backgroundColor: 'rgba(15, 23, 42, 0.06)',
            color: '#007A83',
            transform: 'translateY(-1px)',
          },
        },
        colorPrimary: {
          color: '#64748B',
          '&:hover': {
            color: '#007A83',
            backgroundColor: 'rgba(0, 122, 131, 0.08)',
          },
        },
        colorSuccess: {
          color: '#64748B',
          '&:hover': {
            color: '#16A34A',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
          },
        },
        colorError: {
          color: '#94A3B8',
          '&:hover': {
            color: '#DC2626',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          backgroundColor: '#1e293b',
          borderRadius: 6,
        },
      },
    },
  },
});

export { theme };