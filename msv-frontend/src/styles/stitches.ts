import { createStitches } from '@stitches/react';

const { globalCss } = createStitches({
  theme: {
    colors: {
      bgCanvas: '#F5F6F8',
      bgSurface: '#ffffff',
      bgMuted: '#F7F8FA',
      textStrong: '#111827',
      textMuted: '#6B7280',
      borderSubtle: '#E5E7EB',
      borderStrong: '#D1D5DB',
      primary: '#007A83',
      primaryHover: '#00656D',
      focusRing: 'rgba(0, 122, 131, 0.22)',
    },
    radii: {
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '16px',
      full: '9999px',
    },
    shadows: {
      card: '0 10px 28px rgba(15, 23, 42, 0.05)',
      cardHover: '0 12px 32px rgba(15, 23, 42, 0.07)',
    },
    fonts: {
      body:
        '"Pretendard Variable", Pretendard, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    },
  },
});

const applyGlobalStyles = globalCss({
  'html, body, #root': {
    minHeight: '100%',
  },
  body: {
    margin: 0,
    backgroundColor: '$bgCanvas',
    color: '$textStrong',
    fontFamily: '$body',
    lineHeight: 1.6,
    fontSize: '13.5px',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  '.MuiPaper-root': {
    border: '1px solid rgba(15, 23, 42, 0.06)',
    backgroundImage: 'none',
    boxShadow: '$card',
  },
  '.MuiCard-root': {
    borderRadius: '20px',
    boxShadow: '$card',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '$cardHover',
      transform: 'translateY(-1px)',
    },
  },
  '.MuiCard-root.MuiPaper-outlined': {
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
  },
  '.MuiButton-root': {
    textTransform: 'none',
    fontWeight: 500,
    borderRadius: '$md',
  },
  '.MuiButton-contained': {
    boxShadow: '0 4px 12px rgba(0, 122, 131, 0.2)',
    '&:hover': {
      boxShadow: '0 6px 16px rgba(0, 122, 131, 0.26)',
      transform: 'translateY(-1px)',
    },
  },
  '.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1px',
  },
});

let injected = false;

export const injectStitchesGlobalStyles = (): void => {
  if (injected) return;
  applyGlobalStyles();
  injected = true;
};
