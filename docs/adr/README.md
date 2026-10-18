# Decisiones de arquitectura (ADR)

Cada decisión que cambia cómo se construye el sistema queda registrada aquí, con su
contexto y las alternativas descartadas, para que dentro de un año se entienda por qué.

| ADR                                                  | Decisión                                     | Estado        |
| ---------------------------------------------------- | -------------------------------------------- | ------------- |
| [0001](0001-anti-choque-en-la-base-de-datos.md)      | La regla anti-choque vive en PostgreSQL      | Aceptada      |
| [0002](0002-monorepo-e-imagenes-portables.md)        | Monorepo pnpm e imágenes Docker portables    | Aceptada      |
| [0003](0003-almacenamiento-del-token-en-el-panel.md) | Dónde guarda el panel web el token de sesión | **Propuesta** |

## Cómo escribir uno

Copiar `plantilla.md` a `NNNN-titulo-corto.md` (número siguiente), completar y abrir un
PR. Estados: `Propuesta` → `Aceptada` o `Rechazada`; una decisión que se reemplaza
pasa a `Reemplazada por NNNN` (no se borra).
