# Revisión de Código — Medios AeA

**Versión:** 1.0.0
**Fecha:** 18 de octubre de 2026

---

## 1. Para qué se revisa

Para encontrar errores antes de que lleguen a la fundación, mantener las reglas del
sistema y que más de una persona entienda cada parte. No es para imponer gustos: lo
que puede comprobar una herramienta (formato, lint, tipos, cobertura) lo comprueba CI.

## 2. Antes de pedir revisión (autor)

- CI en verde. La revisión empieza cuando las máquinas ya no tienen nada que decir.
- Un solo propósito por PR y menos de ~400 líneas sin contar pruebas ni lockfile.
- La plantilla completa: qué cambia, cómo se probó, capturas si hay interfaz.
- Releer el propio diff en GitHub como si fuera de otra persona.

## 3. Qué mirar (revisión)

En este orden; lo primero es lo más caro de arreglar después.

1. **Comportamiento.** ¿Hace lo que pide la historia? ¿Los criterios de aceptación
   tienen pruebas? ¿Qué pasa con entradas vacías, `null`, horarios contiguos, dos
   personas a la vez?
2. **Reglas del sistema** (`AGENTS.md` §3). En particular: nada que debilite las
   restricciones anti-choque, periodos `[inicio, fin)`, asignaciones que no se borran,
   rol validado en el servidor.
3. **Datos.** Migraciones nuevas (nunca editar una aplicada), `down` que revierte de
   verdad, índices para las consultas nuevas, transacciones donde hay más de una escritura.
4. **Seguridad.** Endpoints nuevos con `@Roles()`; datos de otra persona que no se
   filtran (responder 404, no 403); validación en los DTO (`AGENTS.md` §4); nada de
   secretos ni datos personales en código, logs o pruebas.
5. **Interfaz** (`docs/16`). Contraste, foco visible, sin scroll horizontal a 390 px,
   textos para quien usa el sistema, errores que dicen cómo resolverlos.
6. **Mantenibilidad.** Nombres claros, comentarios que explican el porqué, código
   duplicado que debería reutilizar algo existente.

## 4. Código generado con asistentes de IA

Se revisa con el mismo estándar, con más atención a:

- **Pruebas que confirman el código en vez de la historia.** Comprobar que fallarían
  sin el cambio (pedir al autor que lo demuestre si no es evidente).
- **APIs que no existen o de otra versión** (librerías que cambiaron entre versiones
  mayores): CI lo atrapa casi siempre, pero no en la documentación.
- **Cambios fuera del alcance** del issue que se colaron en el diff.
- **Seguridad "por omisión":** validaciones o `@Roles()` ausentes porque nadie los pidió.

## 5. Cómo comentar

Prefijo que dice qué tan importante es:

| Prefijo       | Significado                                  | ¿Bloquea?             |
| ------------- | -------------------------------------------- | --------------------- |
| `bloqueante:` | Error, regla rota o riesgo de seguridad      | Sí                    |
| `pregunta:`   | No se entiende algo; puede esconder un error | Hasta que se responda |
| `sugerencia:` | Mejora opcional                              | No                    |
| `detalle:`    | Algo menor (nombre, comentario)              | No                    |

Comentar el código, no a la persona; proponer la alternativa cuando se pide un cambio.

## 6. Decisión y tiempos

- **Aprobar** cuando no quedan `bloqueante:` ni preguntas abiertas.
- **Pedir cambios** solo por `bloqueante:`.
- Primera respuesta en un día hábil. Un PR que espera más de tres días se menciona en
  la revisión del sprint.
- Con una sola persona desarrollando, la revisión la hace la tutoría de la pasantía o la
  coordinación técnica; si no hay disponibilidad, quien abrió el PR lo revisa al día siguiente
  con esta guía (la distancia ayuda a ver los errores).

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 18 oct 2026 | Danild Pérez | Creación inicial del documento |
