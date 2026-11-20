import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { ResourceType, UserRole } from '#common/enums/domain.enums.js';
import { calendarDateIn } from '#common/utils/calendar.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import { formatRequestCode, proposedDriverError } from './request.rules.js';

/**
 * Quién pide, para qué proyecto, quién conduce y con qué código: lo que comparten crear
 * una solicitud (HU-09) y reservar desde el panel (HU-27).
 */
@Injectable()
export class RequestParties {
  /** Para quién y a qué proyecto se carga (RN-14). */
  async resolve(
    manager: EntityManager,
    dto: { requesterId?: string; projectId: string },
    actor: AuthenticatedUser,
  ): Promise<{ requester: User; project: Project }> {
    const requester = await this.requester(manager, dto.requesterId, actor);
    const project = await manager.findOneBy(Project, { id: dto.projectId });
    if (!project || !project.isActive) {
      throw new BadRequestException(
        'El proyecto no existe o ya está cerrado. Elige un proyecto activo.',
      );
    }
    return { requester, project };
  }

  /**
   * RN-15 (ADR 0004): quien solicita propone quién conduce. Si no lo dice y es un
   * vehículo, conduce la persona solicitante, que debe tener licencia registrada.
   */
  async proposedDriver(
    manager: EntityManager,
    proposedDriverId: string | undefined,
    requester: User,
    resourceType: ResourceType,
    endsAt: Date,
  ): Promise<Driver | null> {
    if (!proposedDriverId && resourceType !== ResourceType.VEHICLE) return null;

    const driver = await manager.findOne(Driver, {
      where: proposedDriverId ? { id: proposedDriverId } : { userId: requester.id },
      relations: { user: true },
    });
    if (!driver && !proposedDriverId) {
      throw new BadRequestException(
        `Indica quién conduce: ${requester.fullName} no tiene licencia registrada.`,
      );
    }
    const error = proposedDriverError(driver, endsAt);
    if (error) throw new BadRequestException(error);
    return driver;
  }

  /** `SOL-2026-00042`, del correlativo global. */
  async nextCode(manager: EntityManager): Promise<string> {
    const [{ nextval }] = await manager.query<{ nextval: string }[]>(
      `SELECT nextval('reservation_request_code_seq')`,
    );
    return formatRequestCode(Number(calendarDateIn(new Date()).slice(0, 4)), Number(nextval));
  }

  /** RN-14: solo la coordinación puede pedir en nombre de otra persona. */
  private async requester(
    manager: EntityManager,
    requesterId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<User> {
    if (requesterId && requesterId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo la coordinación puede crear solicitudes en nombre de otra persona.',
      );
    }
    const user = await manager.findOneBy(User, { id: requesterId ?? actor.id });
    if (!user || !user.isActive) {
      throw new BadRequestException('La persona solicitante no existe o está desactivada.');
    }
    return user;
  }
}
