# Sistema de Diseño — Medios AeA

**Versión:** 1.0.0
**Fecha:** 18 de octubre de 2026
**Fuente:** _Brandbook resumido AEA_ (manual de marca de Ayuda en Acción)

---

## 1. Identidad

El sistema es un **proyecto de Ayuda en Acción**, así que sigue la regla de
arquitectura de marca del manual: logotipo de la fundación y, separado por una línea,
el nombre del proyecto en un nivel jerárquico inferior → **Ayuda en Acción | Medios**
(`BrandLockup` en web y móvil).

El nombre es "Medios", no "Vehículos": el sistema está pensado para cualquier medio que
se presta (hoy vehículos; en la fase 2 proyectores, laptops, equipo de sonido). Ningún
texto general de la interfaz debe asumir que un medio es un vehículo.

## 2. Color

| Token           | Hex       | Uso                                                           |
| --------------- | --------- | ------------------------------------------------------------- |
| Blanco          | `#FFFFFF` | Fondo general (color principal de mayor uso del manual)       |
| Naranja Ayuda   | `#F87C56` | Acción principal, viaje en curso, panel de marca del login    |
| Negro lavado    | `#382E2C` | Texto                                                         |
| Amarillo Ayuda  | `#FFC658` | Pendiente de decisión                                         |
| Verde brillante | `#71B790` | Aprobado / asignado                                           |
| Turquesa fuerte | `#006975` | Enlaces y anillo de foco                                      |
| Naranja fuerte  | `#E5554F` | Choques, rechazos, errores, línea de "ahora"                  |
| Crema           | `#FDF0D5` | Fondo de tablas y de la agenda (como los gráficos del manual) |

**Regla de contraste (WCAG AA, calculada):**

| Combinación                                   | Contraste       | Uso permitido                       |
| --------------------------------------------- | --------------- | ----------------------------------- |
| Negro lavado sobre naranja / amarillo / verde | 5.0 / 8.4 / 5.6 | Texto de cualquier tamaño           |
| Blanco sobre naranja / amarillo / verde       | 2.6 / 1.6 / 2.4 | **Nunca**                           |
| Turquesa fuerte sobre blanco                  | 6.4             | Texto, enlaces, foco                |
| Naranja fuerte o turquesa medio sobre blanco  | 3.6–3.7         | Solo bordes, bloques y texto grande |

## 3. Tipografía

| Rol                       | Fuente                 | Nota                                                                                                 |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Principal (todo el texto) | **Bogart** (ZetaFonts) | De pago. Mientras no haya licencia web: **Fraunces** (libre, serif suave, ejes `SOFT 100`, `WONK 0`) |
| Datos técnicos            | **DM Mono**            | Placas, códigos de inventario, códigos de proyecto, horas                                            |

- Las fuentes se empaquetan con la app (`@fontsource` en web, `@expo-google-fonts` en
  móvil): no dependen de la conexión en campo.
- **Para usar Bogart:** copiar `Bogart-Regular.woff2` y `Bogart-Medium.woff2` en
  `web/public/fonts/` y agregar al inicio de `web/src/index.css`:

  ```css
  @font-face {
    font-family: 'Bogart';
    src: url('/fonts/Bogart-Regular.woff2') format('woff2');
    font-weight: 400;
    font-display: swap;
  }
  @font-face {
    font-family: 'Bogart';
    src: url('/fonts/Bogart-Medium.woff2') format('woff2');
    font-weight: 500 700;
    font-display: swap;
  }
  ```

  La familia ya está primera en `--font-serif` y en el tema de MUI. No declarar el
  `@font-face` sin los archivos: el servidor respondería con la página de la app y el
  navegador la rechazaría como fuente en cada carga.

- Escala web 1.25 sobre 15 px; en móvil texto base de 17 px (lectura con sol directo).
- Sin MAYÚSCULAS en etiquetas ni rótulos sobre los títulos.

## 4. Componentes de marca (web: `web/src/design-system/ui`)

| Componente    | Qué es                                                                                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BrandLockup` | Ayuda en Acción \| Medios. Usa `public/brand/logo-aea.svg` si existe; si no, texto.                                                                                                                                                                       |
| `ResourceTag` | Identificador de cualquier medio: placa o código en DM Mono + nombre. `layout="stacked"` para columnas angostas.                                                                                                                                          |
| `AgendaBoard` | **El elemento distintivo.** Una fila por medio, tiempo en horizontal, fondo crema y filetes del manual. Estados: asignado (verde), en curso (naranja), pendiente (amarillo con trama), no disponible (gris con trama), línea de "ahora" (naranja fuerte). |
| `StatusBadge` | Estado de una solicitud: relleno para lo que pide atención, solo borde para lo cerrado.                                                                                                                                                                   |
| `ActiveBadge` | Activo / inactivo con texto, nunca solo color.                                                                                                                                                                                                            |
| `DataTable`   | Tabla con encabezado crema; en pantallas angostas se convierte en lista. Sin scroll horizontal de página.                                                                                                                                                 |

## 5. Principios

1. **La agenda es lo memorable; todo lo demás es sobrio.** Nada de tarjetas de
   indicadores repetidas ni gradientes.
2. **El color dice estado, no decora.** Amarillo = falta decidir, verde = asignado,
   naranja fuerte = problema.
3. **Íconos solo cuando aportan contexto** (regla del manual). El menú es solo texto.
4. **Se escribe para quien usa el sistema:** "Todavía no hay medios registrados", nunca
   "Disponible en el Sprint 3". Los errores dicen qué pasó y cómo resolverlo, sin
   prefijos genéricos.
5. **Calidad mínima siempre:** foco visible con teclado (turquesa fuerte), contraste AA,
   `prefers-reduced-motion` respetado, sin scroll horizontal a 390 px.

## 6. Pendiente con comunicación de la fundación

- Archivo oficial del logotipo (`logo-aea.svg`) para `web/public/brand/` y la app.
- Licencia web/app de Bogart, o confirmación de que Fraunces es aceptable.
- Ilustraciones del manual para estados vacíos importantes (opcional).

## Historial

| Versión | Fecha       | Autor        | Cambio                                |
| ------- | ----------- | ------------ | ------------------------------------- |
| 1.0.0   | 18 oct 2026 | Danild Pérez | Creación a partir del manual de marca |
