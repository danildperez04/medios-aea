import { Inject, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import {
  NotificationsService,
  type NoticeAudience,
} from '#modules/notifications/notifications.service.js';
import type { Resource } from '#modules/resources/entities/resource.entity.js';
import type { User } from '#modules/users/entities/user.entity.js';
import type { ReservationAssignment } from './entities/reservation-assignment.entity.js';
import type { ReservationRequest } from './entities/reservation-request.entity.js';

const WHEN = new Intl.DateTimeFormat('es-NI', {
  timeZone: 'America/Managua',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const window = (request: ReservationRequest): string =>
  `${WHEN.format(request.startsAt)} – ${WHEN.format(request.endsAt)}`;

/** "conduces tú", "conduce Ana Martínez" o "sin conductor", según quien lea el aviso. */
const whoDrives = (request: ReservationRequest, driver: Driver | null): string =>
  driver && driver.userId === request.requesterId
    ? 'conduces tú'
    : driver
      ? `conduce ${driver.user.fullName}`
      : 'sin conductor';

/**
 * Qué se avisa, a quién y con qué palabras en cada paso de una solicitud (RF-19). Se
 * escriben en la transacción de la operación que los origina, que es quien llama. Nadie
 * recibe el aviso de lo que hizo: lo hizo él.
 */
@Injectable()
export class ReservationNotices {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  /** Una solicitud nueva: a la coordinación (HU-09). */
  async created(
    manager: EntityManager,
    request: ReservationRequest,
    requester: User,
    proposedDriver: Driver | null,
  ): Promise<void> {
    await this.notifications.notifyRole(manager, UserRole.ADMIN, {
      title: `Nueva solicitud ${request.code}`,
      body:
        `${requester.fullName} pide un medio para ${request.destination} (${window(request)}).` +
        (proposedDriver ? ` Conduce ${proposedDriver.user.fullName}.` : ''),
      data: { kind: 'RESERVATION_CREATED', reservationId: request.id },
    });
  }

  /**
   * Una aprobación o una reserva directa (`booked`): a quien pidió, a quien conduce (si es
   * otra persona) y, si la coordinación cambió al conductor, a quien había sido propuesto.
   */
  async approved(
    manager: EntityManager,
    request: ReservationRequest,
    resource: Resource,
    driver: Driver | null,
    driverChanged: boolean,
    actor: AuthenticatedUser,
    booked = false,
  ): Promise<void> {
    const when = window(request);
    const data = { kind: 'RESERVATION_APPROVED', reservationId: request.id };
    const notify = async (
      userId: string | undefined,
      title: string,
      body: string,
      audience?: NoticeAudience,
    ): Promise<void> => {
      if (userId && userId !== actor.id) {
        await this.notifications.notifyUsers(manager, [userId], {
          title,
          body,
          data: audience ? { ...data, audience } : data,
        });
      }
    };

    await notify(
      request.requesterId,
      booked
        ? `La coordinación reservó tu viaje ${request.code}`
        : `Solicitud ${request.code} aprobada`,
      `Tu viaje a ${request.destination} (${when}) va en ${resource.name}; ${whoDrives(request, driver)}.` +
        (driverChanged ? ' La coordinación cambió a quien conduce.' : ''),
    );
    if (driver && driver.userId !== request.requesterId) {
      await notify(
        driver.userId,
        `Tienes un viaje asignado: ${request.code}`,
        `${request.destination} (${when}) en ${resource.name}.`,
        'DRIVER',
      );
    }
    if (driverChanged && request.proposedDriverId) {
      const proposed = await manager.findOneBy(Driver, { id: request.proposedDriverId });
      if (proposed && proposed.userId !== request.requesterId) {
        await notify(
          proposed.userId,
          `Ya no conduces el viaje ${request.code}`,
          `La coordinación asignó a ${driver?.user.fullName ?? 'otra persona'} para ${request.destination} (${when}).`,
          'FORMER_DRIVER',
        );
      }
    }
  }

  /** Un rechazo: a quien pidió, con el motivo (HU-12). */
  async rejected(
    manager: EntityManager,
    request: ReservationRequest,
    reason: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (request.requesterId === actor.id) return;
    await this.notifications.notifyUsers(manager, [request.requesterId], {
      title: `Solicitud ${request.code} rechazada`,
      body: `Tu viaje a ${request.destination} (${window(request)}) no se aprobó. Motivo: ${reason}`,
      data: { kind: 'RESERVATION_REJECTED', reservationId: request.id },
    });
  }

  /**
   * Una reasignación (RN-10): a quien pidió, a quien conduce ahora y, si cambió la
   * persona, a quien conducía. Si solo cambió el medio, quien conduce se entera de en qué
   * medio va.
   */
  async reassigned(
    manager: EntityManager,
    request: ReservationRequest,
    previous: ReservationAssignment,
    resource: Resource,
    driver: Driver | null,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const when = window(request);
    const data = { kind: 'RESERVATION_REASSIGNED', reservationId: request.id };
    const driverChanged = previous.driverId !== (driver?.id ?? null);
    const sent = new Set<string>([actor.id]);
    const notify = async (
      userId: string | undefined,
      title: string,
      body: string,
      audience?: NoticeAudience,
    ): Promise<void> => {
      if (!userId || sent.has(userId)) return;
      sent.add(userId);
      await this.notifications.notifyUsers(manager, [userId], {
        title,
        body,
        data: audience ? { ...data, audience } : data,
      });
    };

    await notify(
      request.requesterId,
      `Cambió tu viaje ${request.code}`,
      `${request.destination} (${when}): ahora va en ${resource.name}; ${whoDrives(request, driver)}.`,
    );
    if (driverChanged) {
      await notify(
        driver?.userId,
        `Tienes un viaje asignado: ${request.code}`,
        `${request.destination} (${when}) en ${resource.name}.`,
        'DRIVER',
      );
      await notify(
        previous.driver?.userId,
        `Ya no conduces el viaje ${request.code}`,
        `La coordinación asignó a ${driver?.user.fullName ?? 'otra persona'} para ${request.destination} (${when}).`,
        'FORMER_DRIVER',
      );
    } else {
      await notify(
        driver?.userId,
        `Cambió el medio del viaje ${request.code}`,
        `${request.destination} (${when}): ahora va en ${resource.name}.`,
        'DRIVER',
      );
    }
  }

  /**
   * Una cancelación: a quien no canceló, sea la coordinación, la persona solicitante o el
   * conductor que ya tenía el viaje asignado (RN-10).
   */
  async cancelled(
    manager: EntityManager,
    request: ReservationRequest,
    assignments: ReservationAssignment[],
    actor: AuthenticatedUser,
  ): Promise<void> {
    const content = {
      title: `Solicitud ${request.code} cancelada`,
      body: `${actor.fullName} canceló el viaje a ${request.destination} (${window(request)}).`,
      data: { kind: 'RESERVATION_CANCELLED', reservationId: request.id },
    };
    if (actor.role !== UserRole.ADMIN) {
      await this.notifications.notifyRole(manager, UserRole.ADMIN, content);
    }
    const others = new Set([
      request.requesterId,
      ...assignments.flatMap((assignment) => assignment.driver?.userId ?? []),
    ]);
    others.delete(actor.id);
    await this.notifications.notifyUsers(manager, [...others], content);
  }
}
