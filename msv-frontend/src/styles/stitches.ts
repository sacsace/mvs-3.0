import { createStitches } from '@stitches/react';

const { globalCss } = createStitches({
  theme: {
    colors: {
      bgCanvas: '#f5f7fb',
      bgSurface: '#ffffff',
      bgMuted: '#eef2f8',
      textStrong: '#0f172a',
      textMuted: '#5b6b80',
      borderSubtle: '#d0d9e7',
      borderStrong: '#b8c6da',
      primary: '#0d8aff',
      primaryHover: '#0066cc',
      focusRing: 'rgba(13, 138, 255, 0.22)',
    },
    radii: {
      sm: '6px',
      md: '10px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    shadows: {
      card: '0 1px 3px rgba(15, 23, 42, 0.08)',
      cardHover: '0 3px 10px rgba(15, 23, 42, 0.12)',
    },
    fonts: {
      body: '"Inter", "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
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
    lineHeight: 1.5,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  },
  '.MuiPaper-root': {
    border: '1px solid $borderSubtle',
    backgroundImage: 'none',
  },
  '.MuiCard-root': {
    borderRadius: '$lg',
    boxShadow: '$card',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    '&:hover': {
      boxShadow: '$cardHover',
      borderColor: '$borderStrong',
    },
  },
  '.MuiButton-root': {
    textTransform: 'none',
    fontWeight: 600,
    borderRadius: '$md',
  },
  '.MuiButton-contained': {
    boxShadow: 'none',
    '&:hover': {
      boxShadow: 'none',
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
