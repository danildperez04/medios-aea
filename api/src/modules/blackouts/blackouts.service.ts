import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ResourceStatus } from '#common/enums/domain.enums.js';
import { toRangeLiteral, type TimeRange } from '#common/utils/time-range.js';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import type { BlackoutFiltersDto } from './dto/blackout-filters.dto.js';
import type { CreateBlackoutDto } from './dto/create-blackout.dto.js';
import { Blackout } from './entities/blackout.entity.js';

/** Un bloqueo tal como lo devuelve la API. */
export interface BlackoutView {
  id: string;
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
  reason: Blackout['reason'];
  description: string | null;
  createdAt: Date;
}

/** Con qué choca un bloqueo nuevo; va en `details` del 409. */
export interface BlackoutConflict {
  kind: 'ASSIGNMENT' | 'BLACKOUT';
  id: string;
  startsAt: Date;
  endsAt: Date;
  label: string;
}

const toView = (blackout: Blackout): BlackoutView => ({
  id: blackout.id,
  resourceId: blackout.resourceId,
  startsAt: blackout.period.start,
  endsAt: blackout.period.end,
  reason: blackout.reason,
  description: blackout.description,
  createdAt: blackout.createdAt,
});

/**
 * Bloqueos de un medio (RF-08, HU-07): periodos en que no se puede asignar
 * (taller, uso administrativo). Funcionan igual para cualquier tipo de medio.
 *
 * Los bloqueos no están en la restricción de exclusión de las asignaciones (viven
 * en otra tabla), así que la exclusión mutua se hace bloqueando la fila del
 * `resource` con FOR UPDATE: la aprobación de solicitudes (Sprint 3) toma el mismo
 * candado, de modo que un bloqueo y una aprobación del mismo medio se serializan
 * (docs/10-esquema-base-de-datos.md §4).
 */
@Injectable()
export class BlackoutsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(getRepositoryToken(Blackout)) private readonly blackouts: Repository<Blackout>,
    @Inject(getRepositoryToken(Resource)) private readonly resources: Repository<Resource>,
  ) {}

  async findForResource(resourceId: string, filters: BlackoutFiltersDto): Promise<BlackoutView[]> {
    if (!(await this.resources.existsBy({ id: resourceId }))) {
      throw new NotFoundException('El medio no existe.');
    }
    const query = this.blackouts
      .createQueryBuilder('blackout')
      .where('blackout.resourceId = :resourceId', { resourceId });
    if (filters.from || filters.to) {
      const from = filters.from ? new Date(filters.from) : new Date(0);
      const to = filters.to ? new Date(filters.to) : new Date('9999-12-31T00:00:00Z');
      query.andWhere(`blackout.period && tstzrange(:from, :to, '[)')`, { from, to });
    } else {
      query.andWhere('upper(blackout.period) > now()');
    }
    const rows = await query.orderBy('lower(blackout.period)', 'ASC').getMany();
    return rows.map(toView);
  }

  async create(resourceId: string, dto: CreateBlackoutDto, actorId: string): Promise<BlackoutView> {
    const period: TimeRange = { start: new Date(dto.startsAt), end: new Date(dto.endsAt) };
    if (!(period.end > period.start)) {
      throw new BadRequestException('El fin del bloqueo debe ser posterior al inicio.');
    }

    const id = await this.dataSource.transaction(async (manager) => {
      const resource = await manager.findOne(Resource, {
        where: { id: resourceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!resource) throw new NotFoundException('El medio no existe.');
      if (resource.status === ResourceStatus.INACTIVE) {
        throw new BadRequestException('El medio está dado de baja; no necesita bloqueos.');
      }

      const conflicts = await this.findConflicts(manager, resourceId, period);
      if (conflicts.length) {
        const first = conflicts[0];
        throw new ConflictException({
          message:
            first.kind === 'ASSIGNMENT'
              ? `El bloqueo choca con un viaje aprobado (${first.label}). Reasígnalo o cancélalo antes de bloquear el medio.`
              : 'El medio ya tiene un bloqueo en ese horario.',
          details: conflicts,
        });
      }

      const saved = await manager.save(
        manager.create(Blackout, {
          resourceId,
          period,
          reason: dto.reason,
          description: dto.description || null,
          createdById: actorId,
        }),
      );
      return saved.id;
    });

    return toView(await this.blackouts.findOneByOrFail({ id }));
  }

  async remove(id: string): Promise<void> {
    const result = await this.blackouts.delete({ id });
    if (!result.affected) throw new NotFoundException('El bloqueo no existe.');
  }

  private async findConflicts(
    manager: DataSource['manager'],
    resourceId: string,
    period: TimeRange,
  ): Promise<BlackoutConflict[]> {
    const range = toRangeLiteral(period);
    const assignments = await manager
      .createQueryBuilder(ReservationAssignment, 'assignment')
      .innerJoinAndSelect('assignment.request', 'request')
      .where('assignment.resourceId = :resourceId', { resourceId })
      .andWhere('assignment.active = true')
      .andWhere('assignment.period && CAST(:range AS tstzrange)', { range })
      .orderBy('lower(assignment.period)', 'ASC')
      .getMany();
    const blackouts = await manager
      .createQueryBuilder(Blackout, 'blackout')
      .where('blackout.resourceId = :resourceId', { resourceId })
      .andWhere('blackout.period && CAST(:range AS tstzrange)', { range })
      .getMany();

    return [
      ...assignments.map((assignment) => ({
        kind: 'ASSIGNMENT' as const,
        id: assignment.id,
        startsAt: assignment.period.start,
        endsAt: assignment.period.end,
        label: `${assignment.request.code}, ${assignment.request.destination}`,
      })),
      ...blackouts.map((blackout) => ({
        kind: 'BLACKOUT' as const,
        id: blackout.id,
        startsAt: blackout.period.start,
        endsAt: blackout.period.end,
        label: blackout.description ?? 'Bloqueo',
      })),
    ];
  }
}
