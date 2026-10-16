import { createTheme } from '@mui/material/styles';

/**
 * Tema de MUI.
 *
 * La paleta vive también en `src/index.css` (Tailwind). Ambas deben coincidir:
 * Tailwind para el layout y el detalle, MUI para los componentes con
 * comportamiento propio como DataGrid.
 *
 * Colores con contraste AA contra blanco: el primario (#1f5f7a) da 7.1:1.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f5f7a',
      light: '#4f8ca8',
      dark: '#123f52',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f9a825',
      light: '#fbc02d',
      dark: '#f57f17',
      contrastText: '#1c1917',
    },
    error: {
      main: '#c62828',
      dark: '#b71c1c',
    },
    warning: {
      main: '#ef6c00',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#1c1917',
      secondary: '#57534e',
    },
  },
  typography: {
    fontFamily: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40 } },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiCard: {
      styleOverrides: { root: { border: '1px solid #e7e5e4' } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
});
