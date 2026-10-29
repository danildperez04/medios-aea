import { Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import type { DataSource } from 'typeorm';
import {
  AuditAction,
  BlackoutReason,
  RequestStatus,
  ResourceStatus,
  ResourceType,
  UserRole,
} from '#common/enums/domain.enums.js';
import { calendarDateIn } from '#common/utils/calendar.js';
import { AuditLog } from '#modules/audit/entities/audit-log.entity.js';
import { Blackout } from '#modules/blackouts/entities/blackout.entity.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Notification } from '#modules/notifications/entities/notification.entity.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';
import { ReservationRequest } from '#modules/reservations/entities/reservation-request.entity.js';
import { formatRequestCode } from '#modules/reservations/request.rules.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { Vehicle } from '#modules/resources/entities/vehicle.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import {
  SEED_DRIVERS,
  SEED_PASSWORD,
  SEED_PROJECTS,
  SEED_REQUESTS,
  SEED_USERS,
  SEED_VEHICLES,
} from './seed-data.js';

const logger = new Logger('Seeder');

/**
 * Carga los datos de ejemplo. Es IDEMPOTENTE: cada fila se busca primero por su
 * clave natural (correo, código), así que se puede ejecutar varias veces.
 * Cada sprint agrega aquí sus datos.
 */
export async function runSeeders(dataSource: DataSource): Promise<void> {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await hash(SEED_PASSWORD, rounds);

  const users = dataSource.getRepository(User);
  let createdUsers = 0;
  for (const seed of SEED_USERS) {
    if (await users.existsBy({ email: seed.email })) continue;
    await users.save(users.create({ ...seed, phone: null, passwordHash, isActive: true }));
    createdUsers += 1;
  }
  logger.log(`${createdUsers} usuarios creados (${SEED_USERS.length} en total)`);

  const projects = dataSource.getRepository(Project);
  let createdProjects = 0;
  for (const seed of SEED_PROJECTS) {
    if (await projects.existsBy({ code: seed.code })) continue;
    await projects.save(projects.create({ ...seed, isActive: true }));
    createdProjects += 1;
  }
  logger.log(`${createdProjects} proyectos creados (${SEED_PROJECTS.length} en total)`);

  // ---------- Vehículos (resource + vehicle en una transacción) ----------
  let createdVehicles = 0;
  for (const seed of SEED_VEHICLES) {
    if (await dataSource.getRepository(Vehicle).existsBy({ plate: seed.plate })) continue;
    await dataSource.transaction(async (manager) => {
      const { name, ...detail } = seed;
      const resource = await manager.save(
        manager.create(Resource, {
          type: ResourceType.VEHICLE,
          name,
          status: ResourceStatus.AVAILABLE,
        }),
      );
      await manager.save(manager.create(Vehicle, { resourceId: resource.id, ...detail }));
    });
    createdVehicles += 1;
  }
  logger.log(`${createdVehicles} vehículos creados (${SEED_VEHICLES.length} en total)`);

  // ---------- Conductores ----------
  const drivers = dataSource.getRepository(Driver);
  let createdDrivers = 0;
  for (const seed of SEED_DRIVERS) {
    const user = await users.findOneBy({ email: seed.email });
    if (!user || (await drivers.existsBy({ userId: user.id }))) continue;
    await drivers.save(
      drivers.create({
        userId: user.id,
        licenseNumber: seed.licenseNumber,
        licenseExpiry: seed.licenseExpiry,
      }),
    );
    createdDrivers += 1;
  }
  logger.log(`${createdDrivers} conductores creados (${SEED_DRIVERS.length} en total)`);

  // ---------- Un bloqueo de ejemplo: la Frontier en taller mañana ----------
  const frontier = await dataSource.getRepository(Vehicle).findOneBy({ plate: 'M 345-678' });
  const blackouts = dataSource.getRepository(Blackout);
  if (frontier && !(await blackouts.existsBy({ resourceId: frontier.resourceId }))) {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const day = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Managua' });
    await blackouts.save(
      blackouts.create({
        resourceId: frontier.resourceId,
        period: {
          start: new Date(`${day}T07:00:00-06:00`),
          end: new Date(`${day}T17:00:00-06:00`),
        },
        reason: BlackoutReason.MAINTENANCE,
        description: 'Cambio de frenos',
      }),
    );
    logger.log('Bloqueo de ejemplo creado para la Frontier azul');
  }

  await seedDemoRequests(dataSource);
}

/**
 * Solicitudes de ejemplo en todos los estados (Sprint 3). Solo si no hay ninguna:
 * no se mezclan con las que cargó alguien a mano. Se escriben como lo haría la API
 * (código SOL-…, asignación, avisos y auditoría), pero sin pasar por sus reglas: los
 * datos de `SEED_REQUESTS` ya están pensados para no chocar.
 */
async function seedDemoRequests(dataSource: DataSource): Promise<void> {
  if (await dataSource.getRepository(ReservationRequest).exists()) {
    logger.log('Ya hay solicitudes: no se agregan las de ejemplo');
    return;
  }

  await dataSource.transaction(async (manager) => {
    const userBy = async (email: string): Promise<User> => manager.findOneByOrFail(User, { email });
    const admin = await userBy('admin@demo.medios-aea.org');
    const admins = await manager.findBy(User, { role: UserRole.ADMIN, isActive: true });
    const when = new Intl.DateTimeFormat('es-NI', {
      timeZone: 'America/Managua',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    for (const seed of SEED_REQUESTS) {
      const requester = await userBy(seed.requesterEmail);
      const project = await manager.findOneByOrFail(Project, { code: seed.projectCode });
      const proposed = await manager.findOneByOrFail(Driver, {
        userId: (await userBy(seed.proposedDriverEmail)).id,
      });
      const preferred = seed.preferredPlate
        ? await manager.findOneByOrFail(Vehicle, { plate: seed.preferredPlate })
        : null;

      // Día en hora de Managua (UTC-6, sin horario de verano).
      const day = calendarDateIn(new Date(Date.now() + seed.day * 86_400_000));
      const startsAt = new Date(`${day}T${String(seed.startHour).padStart(2, '0')}:00:00-06:00`);
      const endsAt = new Date(startsAt.getTime() + seed.hours * 3_600_000);
      const span = `${when.format(startsAt)} – ${when.format(endsAt)}`;

      const [{ nextval }] = await manager.query<{ nextval: string }[]>(
        `SELECT nextval('reservation_request_code_seq')`,
      );
      const code = formatRequestCode(Number(day.slice(0, 4)), Number(nextval));
      const { outcome } = seed;
      const decided = outcome.status === 'APPROVED' || outcome.status === 'REJECTED';

      const request = await manager.save(
        manager.create(ReservationRequest, {
          code,
          requesterId: requester.id,
          projectId: project.id,
          resourceType: ResourceType.VEHICLE,
          preferredResourceId: preferred?.resourceId ?? null,
          proposedDriverId: proposed.id,
          purpose: seed.purpose,
          destination: seed.destination,
          passengers: seed.passengers,
          startsAt,
          endsAt,
          status: RequestStatus[outcome.status],
          rejectionReason: outcome.status === 'REJECTED' ? outcome.reason : null,
          decidedById: decided ? admin.id : null,
          decidedAt: decided ? new Date() : null,
        }),
      );
      const data = { reservationId: request.id };
      const notes: Partial<Notification>[] = admins.map((a) => ({
        userId: a.id,
        title: `Nueva solicitud ${code}`,
        body: `${requester.fullName} pide un medio para ${seed.destination} (${span}).`,
        data: { ...data, kind: 'RESERVATION_CREATED' },
      }));

      if (outcome.status === 'APPROVED') {
        const vehicle = await manager.findOneByOrFail(Vehicle, { plate: outcome.plate });
        const resource = await manager.findOneByOrFail(Resource, { id: vehicle.resourceId });
        const driverUser = await userBy(outcome.driverEmail);
        const driver = await manager.findOneByOrFail(Driver, { userId: driverUser.id });
        const assignment = await manager.save(
          manager.create(ReservationAssignment, {
            requestId: request.id,
            resourceId: resource.id,
            driverId: driver.id,
            period: { start: startsAt, end: endsAt },
            active: true,
          }),
        );
        await manager.save(
          manager.create(AuditLog, {
            actorId: admin.id,
            action: AuditAction.APPROVE,
            entity: 'reservation_request',
            entityId: request.id,
            payload: {
              assignmentId: assignment.id,
              resourceId: resource.id,
              driverId: driver.id,
              proposedDriverId: proposed.id,
              driverChanged: driver.id !== proposed.id,
            },
          }),
        );
        const who =
          driver.userId === requester.id ? 'conduces tú' : `conduce ${driverUser.fullName}`;
        notes.push({
          userId: requester.id,
          title: `Solicitud ${code} aprobada`,
          body: `Tu viaje a ${seed.destination} (${span}) va en ${resource.name}; ${who}.`,
          data: { ...data, kind: 'RESERVATION_APPROVED' },
        });
        if (driver.userId !== requester.id) {
          notes.push({
            userId: driver.userId,
            title: `Tienes un viaje asignado: ${code}`,
            body: `${seed.destination} (${span}) en ${resource.name}.`,
            data: { ...data, kind: 'RESERVATION_APPROVED' },
          });
        }
      } else if (outcome.status === 'REJECTED') {
        await manager.save(
          manager.create(AuditLog, {
            actorId: admin.id,
            action: AuditAction.REJECT,
            entity: 'reservation_request',
            entityId: request.id,
            payload: { reason: outcome.reason },
          }),
        );
        notes.push({
          userId: requester.id,
          title: `Solicitud ${code} rechazada`,
          body: `Tu viaje a ${seed.destination} (${span}) no se aprobó. Motivo: ${outcome.reason}`,
          data: { ...data, kind: 'RESERVATION_REJECTED' },
        });
      } else if (outcome.status === 'CANCELLED') {
        // La canceló quien la pidió: se entera la coordinación.
        await manager.save(
          manager.create(AuditLog, {
            actorId: requester.id,
            action: AuditAction.CANCEL,
            entity: 'reservation_request',
            entityId: request.id,
            payload: { fromStatus: RequestStatus.PENDING, releasedAssignmentIds: [] },
          }),
        );
        notes.push(
          ...admins.map((a) => ({
            userId: a.id,
            title: `Solicitud ${code} cancelada`,
            body: `${requester.fullName} canceló el viaje a ${seed.destination} (${span}).`,
            data: { ...data, kind: 'RESERVATION_CANCELLED' },
          })),
        );
      }
      await manager.save(notes.map((note) => manager.create(Notification, note)));
    }
  });
  logger.log(
    `${SEED_REQUESTS.length} solicitudes de ejemplo creadas (pendientes, aprobadas, rechazada y cancelada)`,
  );
}

/** Punto de entrada para `pnpm seed:run`. */
export async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'El seeder carga usuarios con una contraseña pública y no se ejecuta en producción. ' +
        'Usa user:create-admin para crear el primer administrador.',
    );
  }
  const { default: dataSource } = await import('../data-source.js');
  logger.log('Cargando datos de ejemplo...');
  await dataSource.initialize();
  try {
    await runSeeders(dataSource);
    logger.log(`Listo. Contraseña de todos los usuarios de ejemplo: ${SEED_PASSWORD}`);
  } finally {
    await dataSource.destroy();
  }
}
