import { createStitches } from '@stitches/react';

const { globalCss } = createStitches({
  theme: {
    colors: {
      bgCanvas: '#F0F4F9',
      bgSurface: '#ffffff',
      bgMuted: '#F3F7FB',
      textStrong: '#243447',
      textMuted: '#6B7C8F',
      borderSubtle: '#D0DBE8',
      borderStrong: '#BCC9DA',
      primary: '#7BA3C4',
      primaryHover: '#5A849E',
      focusRing: 'rgba(123, 163, 196, 0.24)',
    },
    radii: {
      sm: '6px',
      md: '8px',
      lg: '8px',
      xl: '10px',
      full: '9999px',
    },
    shadows: {
      card: '0 1px 2px rgba(36, 52, 71, 0.05)',
      cardHover: '0 1px 2px rgba(36, 52, 71, 0.05)',
    },
    fonts: {
      body:
        '"NanumSquare", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
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
    border: '1px solid #D0DBE8',
    backgroundImage: 'none',
    boxShadow: '$card',
  },
  '.MuiCard-root': {
    borderRadius: '8px',
    boxShadow: '$card',
    border: '1px solid #D0DBE8',
    transition: 'border-color 0.15s ease',
    '&:hover': {
      borderColor: '#BCC9DA',
    },
  },
  '.MuiCard-root:has([data-testid="SearchIcon"])': {
    border: '1px solid #D0DBE8 !important',
    backgroundColor: '#F0F4F8',
    boxShadow: 'none !important',
    '&:hover': {
      transform: 'none',
    },
  },
  '.MuiOutlinedInput-root:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
    borderColor: '#D0DBE8',
  },
  '.MuiOutlinedInput-root:not(.Mui-disabled):hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#B8C4D0',
  },
  '.MuiCard-root.MuiPaper-outlined': {
    borderRadius: '8px',
    boxShadow: '$card',
  },
  '.MuiButton-root': {
    textTransform: 'none',
    fontWeight: 500,
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
