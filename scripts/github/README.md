# Configuración de GitHub

`setup.mjs` deja el repositorio listo para el flujo de `docs/04-plan-scrum.md` §2.1 y
`docs/05-versionado-commits-y-ramas.md` §3. Es idempotente: se puede volver a ejecutar.

```bash
gh auth login                    # una vez
gh auth refresh -s project       # permiso para crear el tablero
pnpm github:setup --dry-run      # revisar qué haría
pnpm github:setup                # aplicar todo
pnpm github:setup --only issues  # o pasos sueltos
```

| Paso         | Qué hace                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labels`     | Etiquetas `tipo:`, `área:` y `prioridad:`                                                                                                                        |
| `milestones` | Sprint 3 a Sprint 6 con sus fechas de cierre                                                                                                                     |
| `issues`     | Historias HU-10…HU-25 y tareas técnicas de `backlog.json` (no duplica)                                                                                           |
| `repo`       | Squash + merge commit, sin rebase; borrar rama al mergear; escaneo de secretos con _push protection_; alertas de Dependabot; reporte privado de vulnerabilidades |
| `protection` | `develop` y `main`: PR obligatorio, checks requeridos, sin force-push; `develop` con historial lineal                                                            |
| `project`    | Tablero "Medios AeA" con el campo Estado y los issues agregados                                                                                                  |

**Orden:** `protection` exige los checks que crean los PR de CI (`ci/pipeline-hardening`)
y de seguridad (`chore/security-baseline`). Ejecutar ese paso **después** de mergearlos;
el resto se puede ejecutar ya.

Para agregar historias o tareas, editar `backlog.json` y volver a ejecutar `--only issues`.
