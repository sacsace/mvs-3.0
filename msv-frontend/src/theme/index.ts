import { createTheme } from '@mui/material/styles';
import './types';
import { injectStitchesGlobalStyles } from '../styles/stitches';

injectStitchesGlobalStyles();

/** 로그인 등 기본 테마 — 모던 SaaS/ERP(밝은 캔버스·얇은 보더·넉넉한 여백), 로그인 후 createDynamicTheme */
const theme = createTheme({
  palette: {
    primary: {
      50: '#F3F7FB',
      100: '#E4EEF6',
      200: '#C5D9E8',
      300: '#A3C2D8',
      400: '#8FB4CE',
      500: '#7BA3C4',
      600: '#6A92B0',
      700: '#5A849E',
      800: '#476C86',
      900: '#355468',
      main: '#7BA3C4',
      light: '#8FB4CE',
      dark: '#5A849E',
      contrastText: '#ffffff',
    },
    secondary: {
      50: '#F4F8F5',
      100: '#E6F0E8',
      200: '#CDDDCF',
      300: '#B5C9B8',
      400: '#A3BBA8',
      500: '#8FA994',
      600: '#76907C',
      700: '#5F7566',
      800: '#4A5C50',
      900: '#36453C',
      main: '#A3BBA8',
      light: '#B5C9B8',
      dark: '#76907C',
      contrastText: '#ffffff',
    },
    error: {
      main: '#D4A0A0',
      light: '#E0BABA',
      dark: '#B87F7F',
    },
    warning: {
      main: '#D4B888',
      light: '#E0CBA8',
      dark: '#B89A68',
    },
    info: {
      main: '#9AABC5',
      light: '#B8C5D9',
      dark: '#7F91A9',
    },
    success: {
      main: '#8FB89A',
      light: '#B0D0B8',
      dark: '#769A80',
    },
    divider: '#D0DBE8',
    background: {
      default: '#F0F4F9',
      paper: '#FFFFFF',
    },
    workArea: {
      main: '#FFFFFF',
      light: '#F5F8FC',
      dark: '#F0F4F9',
    },
    bodyArea: {
      main: '#F0F4F9',
      light: '#F3F7FB',
      dark: '#E2EAF3',
    },
    text: {
      primary: '#243447',
      secondary: '#6B7C8F',
    },
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7C8F',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#243447',
    },
  },
  typography: {
    fontFamily:
      '"NanumSquare", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    /** 페이지 메인 타이틀 — 전 화면 동일 */
    h1: {
      fontSize: '22px',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#243447',
    },
    pageTitle: {
      fontSize: '22px',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#243447',
      marginBottom: '6px',
    },
    /** 섹션 제목 */
    sectionTitle: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.015em',
      color: '#243447',
    },
    /** 카드·위젯 헤더 타이틀 */
    cardTitle: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#243447',
    },
    /** 페이지 설명 문단 */
    pageDescription: {
      fontSize: '13px',
      lineHeight: 1.6,
      color: '#6B7C8F',
    },
    /** KPI 숫자 */
    kpiNumber: {
      fontSize: '22px',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: '#243447',
    },
    h2: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.015em',
      marginBottom: '12px',
      color: '#243447',
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
      color: '#243447',
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
      color: '#6B7C8F',
    },
    subtitle1: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#243447',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.45,
      letterSpacing: '0',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8, // 8px 그리드 시스템
  shadows: [
    'none',
    '0 1px 2px rgba(15, 23, 42, 0.05)',
    '0 1px 2px rgba(15, 23, 42, 0.06)',
    '0 1px 3px rgba(15, 23, 42, 0.07)',
    '0 2px 4px rgba(15, 23, 42, 0.07)',
    '0 2px 4px rgba(15, 23, 42, 0.08)',
    '0 2px 6px rgba(15, 23, 42, 0.08)',
    '0 2px 6px rgba(15, 23, 42, 0.08)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 4px 10px rgba(15, 23, 42, 0.1)',
    '0 8px 20px rgba(15, 23, 42, 0.12)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backgroundColor: '#F0F4F9',
          color: '#243447',
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
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '13.5px',
          minHeight: 40,
          padding: '8px 16px',
          boxShadow: 'none',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
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
          backgroundColor: '#7BA3C4',
          color: '#FFFFFF',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#5A849E',
            boxShadow: 'none',
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
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D0DBE8',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
          transition: 'border-color 0.15s ease',
          '&:hover': {
            borderColor: '#BCC9DA',
          },
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
            borderRadius: '8px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
            border: '1px solid #D0DBE8',
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
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            minHeight: 44,
            '& .MuiOutlinedInput-input': {
              paddingTop: '12px',
              paddingBottom: '12px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#D0DBE8',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#BCC9DA',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#7BA3C4',
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
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          minHeight: 44,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#D0DBE8',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#BCC9DA',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#7BA3C4',
            borderWidth: 2,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 8,
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
          borderRight: '1px solid #D5E0EB',
          boxShadow: 'none',
          backgroundColor: '#F6F9FC',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#243447',
          boxShadow: 'none',
          borderBottom: '1px solid #D0DBE8',
          backdropFilter: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 8px',
          padding: '10px 12px',
          borderLeft: 'none',
          fontSize: '13.5px',
          color: '#4B5563',
          transition: 'background-color 0.15s ease, color 0.15s ease',
          '&:hover': {
            backgroundColor: 'rgba(15, 23, 42, 0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(123, 163, 196, 0.14)',
            color: '#5A849E',
            fontWeight: 600,
            borderLeft: 'none',
            '&:hover': {
              backgroundColor: 'rgba(123, 163, 196, 0.2)',
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
            color: '#243447',
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
          color: '#243447',
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
          transition: 'background-color 0.15s ease',
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
          borderRadius: 6,
          fontWeight: 600,
        },
        colorSuccess: {
          backgroundColor: 'rgba(127, 168, 138, 0.18)',
          color: '#557A60',
        },
        colorWarning: {
          backgroundColor: 'rgba(196, 165, 116, 0.2)',
          color: '#8A7048',
        },
        colorError: {
          backgroundColor: 'rgba(196, 137, 137, 0.2)',
          color: '#9A6565',
        },
        colorInfo: {
          backgroundColor: 'rgba(138, 155, 181, 0.2)',
          color: '#5F708A',
        },
        colorDefault: {
          backgroundColor: '#EEF3F8',
          color: '#5B6B7A',
        },
        colorPrimary: {
          backgroundColor: 'rgba(123, 163, 196, 0.16)',
          color: '#5A849E',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '6px',
          transition: 'background-color 0.15s ease, color 0.15s ease',
          color: '#64748B',
          '&:hover': {
            backgroundColor: 'rgba(15, 23, 42, 0.05)',
            color: '#7BA3C4',
          },
        },
        colorPrimary: {
          color: '#64748B',
          '&:hover': {
            color: '#7BA3C4',
            backgroundColor: 'rgba(123, 163, 196, 0.1)',
          },
        },
        colorSuccess: {
          color: '#64748B',
          '&:hover': {
            color: '#8FB89A',
            backgroundColor: 'rgba(127, 168, 138, 0.14)',
          },
        },
        colorError: {
          color: '#94A3B8',
          '&:hover': {
            color: '#D4A0A0',
            backgroundColor: 'rgba(196, 137, 137, 0.14)',
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