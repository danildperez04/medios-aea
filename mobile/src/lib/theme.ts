/**
 * Identidad de Ayuda en Acción (manual de marca) para la app.
 * Mismos valores que el panel web (web/src/design-system/theme/theme.ts).
 *
 * Regla de contraste: los colores cálidos (naranja, amarillo, verde) llevan
 * texto negro lavado (≥ 5:1); nunca blanco (< 3:1). El turquesa fuerte es el
 * único que sirve como texto o enlace sobre blanco (6.4:1).
 */
export const colors = {
  naranja: '#F87C56',
  naranjaFuerte: '#E5554F',
  amarillo: '#FFC658',
  verde: '#71B790',
  turquesaFuerte: '#006975',
  negroLavado: '#382E2C',
  crema: '#FDF0D5',
  linea: '#E4DCD3',
  tintaSuave: '#6E625F',
  blanco: '#FFFFFF',
} as const;

/**
 * Tipografía de marca. La principal es Bogart (de pago); mientras la fundación
 * no comparta la licencia se usa Fraunces, serif libre de proporciones parecidas.
 * DM Mono, la secundaria del manual, se reserva para datos técnicos.
 */
export const fonts = {
  regular: 'Fraunces_400Regular',
  medium: 'Fraunces_500Medium',
  semibold: 'Fraunces_600SemiBold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** En campo, con sol directo: texto base de 17 px y áreas táctiles de 48 px o más. */
export const type = {
  body: 17,
  small: 15,
  title: 28,
  display: 34,
} as const;

export const touchTarget = 48;
