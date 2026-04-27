import { createTheme, Theme } from '@mui/material/styles';

// hex 색상을 RGB로 변환
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// RGB를 hex 색상으로 변환
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// 색상에서 밝기 계산
const getLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// primaryColor에서 light/dark 색상 생성
const generateColorVariants = (primaryColor: string) => {
  const rgb = hexToRgb(primaryColor);
  if (!rgb) {
    return {
      main: primaryColor,
      light: '#3da6ff',
      dark: '#0052a3',
      contrastText: '#ffffff',
    };
  }

  // Light 색상 생성 (밝게)
  const lightRgb = {
    r: Math.min(255, rgb.r + 40),
    g: Math.min(255, rgb.g + 40),
    b: Math.min(255, rgb.b + 40),
  };

  // Dark 색상 생성 (어둡게)
  const darkRgb = {
    r: Math.max(0, rgb.r - 40),
    g: Math.max(0, rgb.g - 40),
    b: Math.max(0, rgb.b - 40),
  };

  return {
    main: primaryColor,
    light: rgbToHex(lightRgb.r, lightRgb.g, lightRgb.b),
    dark: rgbToHex(darkRgb.r, darkRgb.g, darkRgb.b),
    contrastText: getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff',
  };
};

// 폰트 크기 설정
const getFontSizeMultiplier = (fontSize: string): number => {
  switch (fontSize) {
    case 'small':
      return 0.9;
    case 'medium':
      return 1.0;
    case 'large':
      return 1.1;
    default:
      return 1.0;
  }
};

// 동적 테마 생성 함수
type ThemePreset = 'light' | 'dark' | 'forest' | 'sunset' | 'lavender' | 'graphite';
type ThemePresetInput = ThemePreset | 'ocean';

const THEME_PRESETS: Record<
  ThemePreset,
  {
    mode: 'light' | 'dark';
    primaryColor: string;
    secondaryColor: string;
    backgroundDefault: string;
    backgroundPaper: string;
    workArea: { main: string; light: string; dark: string };
    bodyArea: { main: string; light: string; dark: string };
    textPrimary: string;
    textSecondary: string;
  }
> = {
  /** 모던 SaaS/ERP: 밝은 캔버스·얇은 보더·차분한 타이포 */
  light: {
    mode: 'light',
    primaryColor: '#156372',
    secondaryColor: '#0d9488',
    backgroundDefault: '#F3F4F6',
    backgroundPaper: '#FFFFFF',
    workArea: { main: '#FFFFFF', light: '#FAFAFA', dark: '#F4F4F5' },
    bodyArea: { main: '#F3F4F6', light: '#F9FAFB', dark: '#E5E7EB' },
    textPrimary: '#111827',
    textSecondary: '#6B7280'
  },
  dark: {
    mode: 'dark',
    primaryColor: '#3b82f6',
    secondaryColor: '#22c55e',
    backgroundDefault: '#0f172a',
    backgroundPaper: '#1e293b',
    workArea: { main: '#1e293b', light: '#334155', dark: '#0f172a' },
    bodyArea: { main: '#0f172a', light: '#1e293b', dark: '#020617' },
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8'
  },
  forest: {
    mode: 'dark',
    primaryColor: '#16a34a',
    secondaryColor: '#0ea5a4',
    backgroundDefault: '#0a1f14',
    backgroundPaper: '#123122',
    workArea: { main: '#123122', light: '#18432f', dark: '#0a1f14' },
    bodyArea: { main: '#0a1f14', light: '#123122', dark: '#06160d' },
    textPrimary: '#eafcf1',
    textSecondary: '#a5d8bd'
  },
  sunset: {
    mode: 'light',
    primaryColor: '#e76f51',
    secondaryColor: '#2a9d8f',
    backgroundDefault: '#fff7f2',
    backgroundPaper: '#ffffff',
    workArea: { main: '#ffffff', light: '#fff7f2', dark: '#ffe9de' },
    bodyArea: { main: '#fff7f2', light: '#fff1e8', dark: '#ffe3d4' },
    textPrimary: '#2f1b14',
    textSecondary: '#7d5d50'
  },
  lavender: {
    mode: 'light',
    primaryColor: '#8b5cf6',
    secondaryColor: '#06b6d4',
    backgroundDefault: '#f7f5ff',
    backgroundPaper: '#ffffff',
    workArea: { main: '#ffffff', light: '#f7f5ff', dark: '#ede9fe' },
    bodyArea: { main: '#f7f5ff', light: '#f1efff', dark: '#e8e3ff' },
    textPrimary: '#2e1f4f',
    textSecondary: '#6d5e95'
  },
  graphite: {
    mode: 'dark',
    primaryColor: '#60a5fa',
    secondaryColor: '#a3a3a3',
    backgroundDefault: '#111214',
    backgroundPaper: '#1a1c1f',
    workArea: { main: '#1a1c1f', light: '#23262a', dark: '#111214' },
    bodyArea: { main: '#111214', light: '#1a1c1f', dark: '#0b0c0d' },
    textPrimary: '#f5f5f5',
    textSecondary: '#b0b3b8'
  }
};

export const createDynamicTheme = (appearanceSettings: {
  theme?: ThemePresetInput;
  primaryColor?: string;
  fontSize?: 'small' | 'medium' | 'large';
}): Theme => {
  const {
    theme: selectedTheme = 'light',
    primaryColor,
    fontSize = 'medium',
  } = appearanceSettings;

  const normalizedTheme: ThemePreset = selectedTheme === 'ocean' ? 'forest' : selectedTheme;
  const preset = THEME_PRESETS[normalizedTheme] || THEME_PRESETS.light;
  const mode = preset.mode;
  const isForestTheme = normalizedTheme === 'forest';
  const resolvedPrimaryColor = primaryColor || preset.primaryColor;
  const fontSizeMultiplier = getFontSizeMultiplier(fontSize);
  const primaryColors = generateColorVariants(resolvedPrimaryColor);
  const secondaryColors = generateColorVariants(preset.secondaryColor);
  const isLightMode = mode === 'light';
  const dividerColor = isForestTheme ? '#2d6a4f' : mode === 'dark' ? '#475569' : '#E5E7EB';
  const actionActiveColor = isForestTheme
    ? 'rgba(218, 248, 230, 0.78)'
    : mode === 'dark'
      ? 'rgba(248, 250, 252, 0.72)'
      : 'rgba(15, 23, 42, 0.62)';
  const actionHoverColor = isForestTheme
    ? 'rgba(34, 197, 94, 0.16)'
    : mode === 'dark'
      ? 'rgba(148, 163, 184, 0.16)'
      : 'rgba(17, 24, 39, 0.04)';
  const actionSelectedColor = isForestTheme
    ? 'rgba(34, 197, 94, 0.26)'
    : mode === 'dark'
      ? 'rgba(148, 163, 184, 0.24)'
      : 'rgba(37, 99, 235, 0.14)';
  const actionDisabledColor = isForestTheme
    ? 'rgba(147, 197, 163, 0.52)'
    : mode === 'dark'
      ? 'rgba(148, 163, 184, 0.46)'
      : 'rgba(100, 116, 139, 0.38)';
  const actionDisabledBgColor = isForestTheme
    ? 'rgba(147, 197, 163, 0.14)'
    : mode === 'dark'
      ? 'rgba(148, 163, 184, 0.12)'
      : 'rgba(100, 116, 139, 0.12)';
  const actionFocusColor = isForestTheme
    ? 'rgba(34, 197, 94, 0.32)'
    : mode === 'dark'
      ? 'rgba(148, 163, 184, 0.28)'
      : 'rgba(13, 138, 255, 0.22)';
  const cardBorderColor = isForestTheme ? '#2d6a4f' : mode === 'dark' ? '#52647a' : '#E5E7EB';
  const cardHoverBorderColor = isForestTheme ? '#3b8f66' : mode === 'dark' ? '#64748b' : '#E5E7EB';
  const cardShadow = mode === 'dark' ? '0 2px 8px rgba(2, 6, 23, 0.32)' : '0 1px 3px rgba(15, 23, 42, 0.04)';
  const cardHoverShadow = mode === 'dark' ? '0 4px 12px rgba(2, 6, 23, 0.4)' : '0 4px 12px rgba(15, 23, 42, 0.06)';
  const appBarBackground = mode === 'dark' ? '#253345' : '#FFFFFF';
  const appBarTextColor = isForestTheme ? '#eafcf1' : mode === 'dark' ? '#f8fafc' : '#111827';
  const appBarBorderColor = isForestTheme ? '#2d6a4f' : mode === 'dark' ? '#52647a' : '#E5E7EB';
  const listHoverBg = isForestTheme ? 'rgba(34, 197, 94, 0.2)' : mode === 'dark' ? '#334155' : '#F3F4F6';
  const listSelectedBg = isForestTheme ? 'rgba(34, 197, 94, 0.34)' : mode === 'dark' ? '#475569' : 'rgba(21, 99, 114, 0.08)';
  const listSelectedHoverBg = isForestTheme ? 'rgba(74, 222, 128, 0.42)' : mode === 'dark' ? '#64748b' : 'rgba(21, 99, 114, 0.12)';

  return createTheme({
    palette: {
      mode,
      common: {
        black: '#000000',
        white: '#ffffff',
      },
      primary: primaryColors,
      secondary: {
        main: secondaryColors.main,
        light: secondaryColors.light,
        dark: secondaryColors.dark,
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
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      success: {
        main: '#22c55e',
        light: '#4ade80',
        dark: '#16a34a',
      },
      background: {
        default: preset.backgroundDefault,
        paper: preset.backgroundPaper,
      },
      workArea: preset.workArea,
      bodyArea: preset.bodyArea,
      text: {
        primary: preset.textPrimary,
        secondary: preset.textSecondary,
      },
      divider: dividerColor,
      action: {
        active: actionActiveColor,
        hover: actionHoverColor,
        selected: actionSelectedColor,
        disabled: actionDisabledColor,
        disabledBackground: actionDisabledBgColor,
        focus: actionFocusColor,
        hoverOpacity: 0.08,
        disabledOpacity: 0.38,
        activatedOpacity: 0.12,
        focusOpacity: 0.12,
        selectedOpacity: 0.12
      },
      grey: {
        50: isForestTheme ? '#113726' : mode === 'dark' ? '#1e293b' : '#f8fafc',
        100: isForestTheme ? '#194b34' : mode === 'dark' ? '#334155' : '#f1f5f9',
        200: isForestTheme ? '#236145' : mode === 'dark' ? '#475569' : '#e2e8f0',
        300: isForestTheme ? '#2f7d5a' : mode === 'dark' ? '#64748b' : '#cbd5e1',
        400: isForestTheme ? '#44a072' : mode === 'dark' ? '#94a3b8' : '#94a3b8',
        500: isForestTheme ? '#6bb894' : mode === 'dark' ? '#cbd5e1' : '#64748b',
        600: isForestTheme ? '#96d0b5' : mode === 'dark' ? '#e2e8f0' : '#475569',
        700: isForestTheme ? '#b9e3d2' : mode === 'dark' ? '#f1f5f9' : '#334155',
        800: isForestTheme ? '#d7f1e4' : mode === 'dark' ? '#f8fafc' : '#1e293b',
        900: isForestTheme ? '#edfbf3' : mode === 'dark' ? '#ffffff' : '#0f172a',
      },
    },
    typography: {
      fontFamily: '"Lato", "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: {
        fontSize: `${1.75 * fontSizeMultiplier}rem`,
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.03em',
      },
      h2: {
        fontSize: `${1.5 * fontSizeMultiplier}rem`,
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontSize: `${1.25 * fontSizeMultiplier}rem`,
        fontWeight: 600,
        lineHeight: 1.35,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontSize: `${1.125 * fontSizeMultiplier}rem`,
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontSize: `${1 * fontSizeMultiplier}rem`,
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.015em',
      },
      h6: {
        fontSize: `${0.9375 * fontSizeMultiplier}rem`,
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '-0.01em',
      },
      body1: {
        fontSize: `${0.875 * fontSizeMultiplier}rem`,
        lineHeight: 1.65,
        letterSpacing: '0.01em',
      },
      body2: {
        fontSize: `${0.8125 * fontSizeMultiplier}rem`,
        lineHeight: 1.55,
        letterSpacing: '0.01em',
      },
      caption: {
        fontSize: `${0.75 * fontSizeMultiplier}rem`,
        lineHeight: 1.5,
        letterSpacing: '0.02em',
      },
      subtitle1: {
        fontSize: `${0.9375 * fontSizeMultiplier}rem`,
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '-0.01em',
      },
      subtitle2: {
        fontSize: `${0.875 * fontSizeMultiplier}rem`,
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '0.005em',
      },
    },
    shape: {
      borderRadius: isLightMode ? 12 : 12,
    },
    spacing: 8,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: `${0.875 * fontSizeMultiplier}rem`,
            padding: '8px 16px',
            boxShadow: 'none',
            transform: 'none',
            transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
            ...(isLightMode && {
              '&:hover': { transform: 'none' }
            })
          },
          outlined: isLightMode
            ? {
                borderColor: '#E5E7EB',
                '&:hover': {
                  borderColor: '#D1D5DB',
                  backgroundColor: '#F9FAFB',
                },
              }
            : {},
          contained: {
            background: primaryColors.main,
            boxShadow: isLightMode ? '0 1px 2px rgba(15, 23, 42, 0.06)' : undefined,
            '&:hover': {
              background: primaryColors.dark,
              boxShadow: isLightMode ? '0 2px 6px rgba(15, 23, 42, 0.1)' : undefined,
              transform: 'none'
            }
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: cardShadow,
            border: `1px solid ${cardBorderColor}`,
            backgroundColor: mode === 'dark' ? preset.backgroundPaper : '#ffffff',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            '&:hover': {
              boxShadow: cardHoverShadow,
              borderColor: cardHoverBorderColor,
              ...(isLightMode && { transform: 'none' })
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 24,
            '&:last-child': {
              paddingBottom: 24,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${dividerColor}`,
            backgroundColor: mode === 'dark' ? preset.backgroundPaper : '#ffffff',
            backgroundImage: 'none',
            borderRadius: isLightMode ? 12 : undefined,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: dividerColor,
            opacity: isLightMode ? 1 : 0.9,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: isLightMode ? '#ffffff' : preset.backgroundPaper,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: dividerColor,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isLightMode ? '#94a3b8' : '#64748b',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: primaryColors.main,
              borderWidth: 1,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: isLightMode ? '1px solid #F3F4F6' : `1px solid ${dividerColor}`,
            ...(isLightMode && { fontSize: '0.875rem', padding: '12px 16px' }),
          },
          head: {
            backgroundColor: isLightMode ? '#F9FAFB' : '#2b3a4f',
            color: preset.textSecondary,
            fontWeight: 600,
            fontSize: isLightMode ? '0.75rem' : undefined,
            letterSpacing: isLightMode ? '0.04em' : undefined,
            textTransform: isLightMode ? 'uppercase' : undefined,
            borderBottom: `1px solid ${dividerColor}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${dividerColor}`,
            backgroundColor: mode === 'dark' ? '#1b2738' : '#FAFAFA',
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: appBarBackground,
            color: appBarTextColor,
            boxShadow: isLightMode
              ? '0 4px 12px -2px rgba(15, 23, 42, 0.08)'
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            borderBottom: isLightMode ? '1px solid #D1D5DB' : `1px solid ${appBarBorderColor}`,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: isLightMode ? '10px' : 8,
            margin: isLightMode ? '2px 10px' : '2px 8px',
            padding: isLightMode ? '10px 12px' : undefined,
            borderLeft: isLightMode ? '3px solid transparent' : undefined,
            '&:hover': {
              backgroundColor: listHoverBg,
            },
            '&.Mui-selected': {
              backgroundColor: listSelectedBg,
              ...(isLightMode && {
                borderLeft: `3px solid ${primaryColors.main}`,
              }),
              '&:hover': {
                backgroundColor: listSelectedHoverBg,
              },
            },
          },
        },
      },
    },
  });
};

