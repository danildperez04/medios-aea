import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import type { Driver } from '#modules/drivers/entities/driver.entity.js';
import type { Project } from '#modules/projects/entities/project.entity.js';
import { Vehicle } from '#modules/resources/entities/vehicle.entity.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';
import { createDriver, createProject, createUser, createVehicle, signToken } from './fixtures.js';

/**
 * HU-15 — historial de decisiones de una solicitud (RF-17): quién aprobó, rechazó,
 * canceló o reasignó, y cuándo. Lee lo que cada operación dejó en `audit_log`.
 */
describe('Historial de decisiones (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let admin: User;
  let otherAdmin: User;
  let ana: User;
  let anaDriver: Driver;
  let luis: Driver;
  let project: Project;
  const tokens: Record<string, string> = {};
  const api = '/api/v1';
  const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
  const http = () => request(app.getHttpServer());

  const window = (days: number) => {
    const start = new Date(Date.now() + days * 86_400_000);
    start.setUTCHours(14, 0, 0, 0);
    return {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 4 * 3_600_000).toISOString(),
    };
  };

  const pending = async (days: number) => {
    const response = await http()
      .post(`${api}/reservations`)
      .set(as('ana'))
      .send({
        projectId: project.id,
        purpose: 'Taller de liderazgo juvenil',
        destination: 'Comunidad El Rosario',
        passengers: 3,
        ...window(days),
      })
      .expect(201);
    return response.body as { id: string };
  };

  const history = (id: string, who = 'admin') =>
    http().get(`${api}/reservations/${id}/history`).set(as(who));

  const label = async (resource: { id: string; name: string }) => {
    const vehicle = await dataSource
      .getRepository(Vehicle)
      .findOneByOrFail({ resourceId: resource.id });
    return `${resource.name} (${vehicle.plate})`;
  };

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
    admin = await createUser(dataSource, UserRole.ADMIN, { fullName: 'Marta Coordinación' });
    otherAdmin = await createUser(dataSource, UserRole.ADMIN, { fullName: 'Pedro Logística' });
    ana = await createUser(dataSource, UserRole.REQUESTER, { fullName: 'Ana Martínez' });
    anaDriver = await createDriver(dataSource, '2035-12-31', ana);
    luis = await createDriver(
      dataSource,
      '2035-12-31',
      await createUser(dataSource, UserRole.DRIVER, { fullName: 'Luis Pérez' }),
    );
    project = await createProject(dataSource);
    for (const [name, user] of Object.entries({ admin, otherAdmin, ana })) {
      tokens[name] = await signToken(app, user);
    }
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  it('una solicitud sin decidir no tiene historial', async () => {
    const created = await pending(20);
    const response = await history(created.id).expect(200);
    expect(response.body).toEqual([]);
  });

  it('cuenta en orden quien aprobo, quien reasigno y quien cancelo, con fecha', async () => {
    const hilux = await createVehicle(dataSource);
    const prado = await createVehicle(dataSource);
    const created = await pending(21);

    await http()
      .post(`${api}/reservations/${created.id}/approve`)
      .set(as('admin'))
      .send({ resourceId: hilux.id })
      .expect(200);
    await http()
      .post(`${api}/reservations/${created.id}/reassign`)
      .set(as('otherAdmin'))
      .send({ resourceId: prado.id, driverId: luis.id })
      .expect(200);
    await http().post(`${api}/reservations/${created.id}/cancel`).set(as('ana')).expect(200);

    const response = await history(created.id).expect(200);
    expect(response.body).toHaveLength(3);
    expect(response.body).toMatchObject([
      {
        action: 'APPROVE',
        actor: { id: admin.id, fullName: 'Marta Coordinación' },
        detail: `Asignó ${await label(hilux)}; conduce Ana Martínez.`,
      },
      {
        action: 'REASSIGN',
        actor: { id: otherAdmin.id, fullName: 'Pedro Logística' },
        detail: `Medio: de ${await label(hilux)} a ${await label(prado)}. Conduce: Luis Pérez en lugar de Ana Martínez.`,
      },
      {
        action: 'CANCEL',
        actor: { id: ana.id, fullName: 'Ana Martínez' },
        detail: 'Estaba aprobada: el medio y quien conducía quedaron libres.',
      },
    ]);
    const times = (response.body as { at: string }[]).map((entry) => Date.parse(entry.at));
    expect(times.every((time) => !Number.isNaN(time))).toBe(true);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    // Solo lo que la coordinación necesita leer: sin ids internos de la auditoría.
    expect(Object.keys(response.body[0]).sort()).toEqual(['action', 'actor', 'at', 'detail', 'id']);
  });

  it('un rechazo muestra quien lo decidio y el motivo', async () => {
    const created = await pending(22);
    await http()
      .post(`${api}/reservations/${created.id}/reject`)
      .set(as('otherAdmin'))
      .send({ reason: 'Ese día el vehículo va al taller' })
      .expect(200);

    const response = await history(created.id).expect(200);
    expect(response.body).toMatchObject([
      {
        action: 'REJECT',
        actor: { fullName: 'Pedro Logística' },
        detail: 'Motivo: Ese día el vehículo va al taller',
      },
    ]);
  });

  it('una reserva directa desde el panel queda registrada como tal', async () => {
    const vehicle = await createVehicle(dataSource);
    const booked = await http()
      .post(`${api}/reservations/book`)
      .set(as('admin'))
      .send({
        projectId: project.id,
        requesterId: ana.id,
        purpose: 'Visita de seguimiento',
        destination: 'San José de Cusmapa',
        passengers: 2,
        resourceId: vehicle.id,
        driverId: anaDriver.id,
        ...window(23),
      })
      .expect(201);

    const response = await history(booked.body.id as string).expect(200);
    expect(response.body).toMatchObject([
      {
        action: 'APPROVE',
        actor: { id: admin.id },
        detail: `Registró la reserva ya aprobada: ${await label(vehicle)}; conduce Ana Martínez.`,
      },
    ]);
  });

  it('es solo para la coordinacion, y exige una solicitud que exista', async () => {
    const created = await pending(24);
    await history(created.id, 'ana').expect(403);
    await http().get(`${api}/reservations/${created.id}/history`).expect(401);
    await history('0b0c6a1e-5a8d-4f0e-9c3b-2a6f1d7e8c90').expect(404);
    await history('no-es-un-id').expect(400);
  });
});
