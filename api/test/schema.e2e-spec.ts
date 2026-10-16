import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { RequestStatus, UserRole } from '#common/enums/domain.enums.js';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';
import { ReservationRequest } from '#modules/reservations/entities/reservation-request.entity.js';
import type { Project } from '#modules/projects/entities/project.entity.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations, unique } from './e2e-context.js';
import { createDriver, createProject, createUser, createVehicle } from './fixtures.js';

/**
 * PT-11 — la base de datos, por si sola, impide las dobles asignaciones.
 *
 * Estas pruebas insertan directamente con TypeORM, sin pasar por ningun
 * servicio: demuestran que aunque el codigo tuviera un error (o dos
 * administradores aprobaran a la vez), PostgreSQL rechaza el solape.
 */
describe('Esquema — restricciones de exclusion (PT-11)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let requester: User;
  let project: Project;

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
    requester = await createUser(dataSource, UserRole.REQUESTER);
    project = await createProject(dataSource);
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  async function request(start: string, end: string): Promise<ReservationRequest> {
    const repo = dataSource.getRepository(ReservationRequest);
    return repo.save(
      repo.create({
        code: unique('SOL'),
        requesterId: requester.id,
        projectId: project.id,
        purpose: 'Taller comunitario',
        destination: 'Comunidad El Rosario',
        passengers: 3,
        startsAt: new Date(start),
        endsAt: new Date(end),
        status: RequestStatus.APPROVED,
      }),
    );
  }

  async function assign(
    resourceId: string,
    start: string,
    end: string,
    driverId: string | null = null,
  ): Promise<ReservationAssignment> {
    const req = await request(start, end);
    const repo = dataSource.getRepository(ReservationAssignment);
    return repo.save(
      repo.create({
        requestId: req.id,
        resourceId,
        driverId,
        period: { start: new Date(start), end: new Date(end) },
        active: true,
      }),
    );
  }

  function expectExclusion(error: unknown, constraint: string): void {
    expect(error).toBeInstanceOf(QueryFailedError);
    const driverError = (error as QueryFailedError).driverError as unknown as {
      code: string;
      constraint: string;
    };
    expect(driverError.code).toBe('23P01');
    expect(driverError.constraint).toBe(constraint);
  }

  it('rechaza dos asignaciones activas solapadas del mismo vehiculo', async () => {
    const vehicle = await createVehicle(dataSource);
    await assign(vehicle.id, '2026-11-02T14:00:00Z', '2026-11-02T18:00:00Z');

    const error = await assign(vehicle.id, '2026-11-02T16:00:00Z', '2026-11-02T20:00:00Z').catch(
      (e: unknown) => e,
    );
    expectExclusion(error, 'ex_assignment_resource_overlap');
  });

  it('acepta viajes contiguos del mismo vehiculo (rango semiabierto)', async () => {
    const vehicle = await createVehicle(dataSource);
    await assign(vehicle.id, '2026-11-03T14:00:00Z', '2026-11-03T16:00:00Z');
    await expect(
      assign(vehicle.id, '2026-11-03T16:00:00Z', '2026-11-03T18:00:00Z'),
    ).resolves.toBeDefined();
  });

  it('acepta el mismo horario en vehiculos distintos', async () => {
    const a = await createVehicle(dataSource);
    const b = await createVehicle(dataSource);
    await assign(a.id, '2026-11-04T14:00:00Z', '2026-11-04T18:00:00Z');
    await expect(
      assign(b.id, '2026-11-04T14:00:00Z', '2026-11-04T18:00:00Z'),
    ).resolves.toBeDefined();
  });

  it('rechaza el mismo conductor en dos vehiculos a la misma hora', async () => {
    const driver = await createDriver(dataSource);
    const a = await createVehicle(dataSource);
    const b = await createVehicle(dataSource);
    await assign(a.id, '2026-11-05T14:00:00Z', '2026-11-05T18:00:00Z', driver.id);

    const error = await assign(
      b.id,
      '2026-11-05T15:00:00Z',
      '2026-11-05T16:00:00Z',
      driver.id,
    ).catch((e: unknown) => e);
    expectExclusion(error, 'ex_assignment_driver_overlap');
  });

  it('una asignacion desactivada libera el horario', async () => {
    const vehicle = await createVehicle(dataSource);
    const first = await assign(vehicle.id, '2026-11-06T14:00:00Z', '2026-11-06T18:00:00Z');
    await dataSource.getRepository(ReservationAssignment).update(first.id, { active: false });

    await expect(
      assign(vehicle.id, '2026-11-06T14:00:00Z', '2026-11-06T18:00:00Z'),
    ).resolves.toBeDefined();
  });

  it('guarda y lee el periodo sin perder la hora exacta', async () => {
    const vehicle = await createVehicle(dataSource);
    const saved = await assign(vehicle.id, '2026-11-07T14:15:00Z', '2026-11-07T17:45:00Z');
    const found = await dataSource
      .getRepository(ReservationAssignment)
      .findOneByOrFail({ id: saved.id });

    expect(found.period.start.toISOString()).toBe('2026-11-07T14:15:00.000Z');
    expect(found.period.end.toISOString()).toBe('2026-11-07T17:45:00.000Z');
  });

  it('rechaza una solicitud cuyo fin no es posterior al inicio', async () => {
    const error = await request('2026-11-08T18:00:00Z', '2026-11-08T14:00:00Z').catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(QueryFailedError);
    expect(((error as QueryFailedError).driverError as unknown as { code: string }).code).toBe(
      '23514',
    );
  });
});
