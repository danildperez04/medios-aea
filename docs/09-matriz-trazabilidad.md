# Matriz de Trazabilidad — Medios AeA

**Versión:** 1.1.0
**Fecha:** 16 de octubre de 2026

Relaciona cada requisito con su historia, el código que lo implementa y las pruebas
que lo verifican. Estados: `PENDIENTE` · `IMPLEMENTADO` (código y pruebas en verde,
aún sin merge) · `VERIFICADO` (validado en revisión de sprint / UAT).

| RF / RN  | HU    | Implementación                                                                                         | Pruebas                                                                                    | Estado            |
| -------- | ----- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------- |
| RF-01    | HU-01 | `api/src/modules/auth/*` · `web/src/features/auth` · `mobile/src/features/auth`                        | `auth.service.spec.ts` · `auth.e2e-spec.ts` (login, mayúsculas, 401/403, token manipulado) | IMPLEMENTADO      |
| RF-02    | HU-01 | `common/guards/jwt-auth.guard.ts` (`RolesGuard`) · `@Roles()` en controladores · `RequireAdmin` en web | `roles.guard.spec.ts` · `users-projects.e2e-spec.ts` (403 de REQUESTER)                    | IMPLEMENTADO      |
| RF-03    | HU-02 | `api/src/modules/users/*` · `web/src/features/users`                                                   | `users.service.spec.ts` · `users-projects.e2e-spec.ts` §HU-02 · `user.schema.test.ts`      | IMPLEMENTADO      |
| RF-04    | HU-03 | `api/src/modules/projects/*` · `web/src/features/projects`                                             | `projects.service.spec.ts` · `users-projects.e2e-spec.ts` §HU-03 · `user.schema.test.ts`   | IMPLEMENTADO      |
| RF-05    | HU-04 | `PATCH /auth/password` · `ChangePasswordDialog`                                                        | `auth.service.spec.ts` · `auth.e2e-spec.ts` §RF-05                                         | IMPLEMENTADO      |
| RN-01    | HU-11 | Migración inicial: `ex_assignment_resource_overlap`                                                    | `schema.e2e-spec.ts` (PT-11)                                                               | IMPLEMENTADO (BD) |
| RN-02    | HU-11 | Migración inicial: `ex_assignment_driver_overlap`                                                      | `schema.e2e-spec.ts` (PT-11)                                                               | IMPLEMENTADO (BD) |
| RN-03    | HU-11 | `common/utils/time-range.ts` · `tstzrange '[)'`                                                        | `time-range.spec.ts` · `schema.e2e-spec.ts` (contiguos)                                    | IMPLEMENTADO      |
| RN-06    | HU-09 | `ck_request_dates` en la migración                                                                     | `schema.e2e-spec.ts`                                                                       | IMPLEMENTADO (BD) |
| RF-06…28 | —     | —                                                                                                      | —                                                                                          | PENDIENTE         |

## Decisiones tomadas en el Sprint 1

| Decisión                                                                          | Motivo                                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Contraseña actual incorrecta en `PATCH /auth/password` responde **400**, no 401   | Con 401 la web y la app interpretan "sesión vencida" y sacan al usuario del sistema |
| Un ADMIN no puede desactivarse ni quitarse el rol a sí mismo                      | Evitar que la fundación se quede sin nadie que apruebe solicitudes                  |
| Los no ADMIN solo ven proyectos activos aunque pidan `isActive=false`             | Un técnico no debe poder cargar un viaje a un proyecto cerrado                      |
| El panel web rechaza en el login a REQUESTER y DRIVER y los dirige a la app móvil | El panel es de la coordinación; el server igual responde 403 a sus endpoints        |
| El seeder no corre con `NODE_ENV=production`                                      | Sus usuarios comparten una contraseña pública                                       |
