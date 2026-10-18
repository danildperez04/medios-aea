import { createTheme } from '@mui/material/styles';

/**
 * Tema de MUI con la identidad de Ayuda en Acción (docs: Brandbook resumido AEA).
 *
 * Los mismos valores viven en src/index.css (@theme) para Tailwind. Reglas:
 * - Botón principal: fondo Naranja Ayuda con texto negro lavado (5.0:1), como el
 *   logo sobre naranja del manual. Nunca texto blanco sobre naranja (2.6:1).
 * - Enlaces y foco: turquesa fuerte (6.4:1 sobre blanco).
 * - Estados: amarillo = pendiente, verde = aprobado, naranja fuerte = choque/rechazo.
 */
export const brand = {
  naranja: '#F87C56',
  naranjaBrillante: '#FEAD77',
  naranjaFuerte: '#E5554F',
  amarillo: '#FFC658',
  verde: '#71B790',
  turquesa: '#009681',
  turquesaFuerte: '#006975',
  negroLavado: '#382E2C',
  crema: '#FDF0D5',
  linea: '#E4DCD3',
  tintaSuave: '#6E625F',
} as const;

const serif = ['Bogart', '"Fraunces Variable"', 'Georgia', 'serif'].join(',');
export const mono = ['"DM Mono"', 'ui-monospace', 'monospace'].join(',');

const focusRing = {
  outline: `3px solid ${brand.turquesaFuerte}`,
  outlineOffset: 2,
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brand.naranja,
      dark: '#E8693F',
      light: brand.naranjaBrillante,
      contrastText: brand.negroLavado,
    },
    secondary: {
      main: brand.turquesaFuerte,
      contrastText: '#FFFFFF',
    },
    error: { main: brand.naranjaFuerte, contrastText: brand.negroLavado },
    warning: { main: brand.amarillo, contrastText: brand.negroLavado },
    success: { main: brand.verde, contrastText: brand.negroLavado },
    info: { main: brand.turquesaFuerte, contrastText: '#FFFFFF' },
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    text: { primary: brand.negroLavado, secondary: brand.tintaSuave },
    divider: brand.linea,
  },
  typography: {
    fontFamily: serif,
    // Escala modular 1.25 sobre 15 px: 12 · 15 · 19 · 23 · 29 · 36
    fontSize: 15,
    h1: { fontSize: '2.25rem', fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.8rem', fontWeight: 500, lineHeight: 1.2 },
    h3: { fontSize: '1.45rem', fontWeight: 500, lineHeight: 1.25 },
    h4: { fontSize: '1.8rem', fontWeight: 500, lineHeight: 1.2 },
    h5: { fontSize: '1.45rem', fontWeight: 500, lineHeight: 1.25 },
    h6: { fontSize: '1.2rem', fontWeight: 500, lineHeight: 1.3 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    caption: { fontSize: '0.8rem', lineHeight: 1.4 },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.9375rem' },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        a: { color: brand.turquesaFuerte },
        '::selection': { background: brand.amarillo, color: brand.negroLavado },
      },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
      styleOverrides: { root: { '&.Mui-focusVisible': focusRing } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: { '&:hover': { backgroundColor: '#EF6E46' } },
        },
      ],
      styleOverrides: {
        root: { minHeight: 40, paddingInline: 18 },
        text: { color: brand.negroLavado },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { color: brand.negroLavado } },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: brand.turquesaFuerte,
            borderWidth: 2,
          },
        },
        notchedOutline: { borderColor: '#CFC5BB' },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: brand.turquesaFuerte } } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { outlined: { borderColor: brand.linea } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { border: `1px solid ${brand.linea}`, boxShadow: '0 18px 48px rgba(56,46,44,.18)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: brand.linea },
        head: {
          fontWeight: 600,
          color: brand.negroLavado,
          backgroundColor: brand.crema,
          borderBottom: `1px solid ${brand.negroLavado}`,
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 4 } } },
    MuiAlert: {
      variants: [
        {
          props: { variant: 'outlined', severity: 'error' },
          style: { borderColor: brand.naranjaFuerte, backgroundColor: '#FDECEB' },
        },
        {
          props: { severity: 'success' },
          style: { borderColor: brand.verde, backgroundColor: '#EEF7F2' },
        },
      ],
      styleOverrides: {
        root: { color: brand.negroLavado, alignItems: 'center' },
      },
    },
    MuiLink: { styleOverrides: { root: { color: brand.turquesaFuerte } } },
  },
});
