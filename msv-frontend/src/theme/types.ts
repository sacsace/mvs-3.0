import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    workArea: {
      main: string;
      light: string;
      dark: string;
    };
    bodyArea: {
      main: string;
      light: string;
      dark: string;
    };
  }

  interface PaletteOptions {
    workArea?: {
      main?: string;
      light?: string;
      dark?: string;
    };
    bodyArea?: {
      main?: string;
      light?: string;
      dark?: string;
    };
  }
}
