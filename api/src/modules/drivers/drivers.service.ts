import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { calendarDateIn } from '#common/utils/calendar.js';
import { User } from '#modules/users/entities/user.entity.js';
import type { CreateDriverDto } from './dto/create-driver.dto.js';
import type { DriverFiltersDto } from './dto/driver-filters.dto.js';
import type { UpdateDriverDto } from './dto/update-driver.dto.js';
import { toDriverView, type DriverView } from './driver.view.js';
import { Driver } from './entities/driver.entity.js';

/**
 * Conductores (RF-07, HU-06). Un conductor es un usuario con rol DRIVER más su
 * licencia; sin licencia vigente no se puede asignar a un viaje (RN-09).
 */
@Injectable()
export class DriversService {
  constructor(
    @Inject(getRepositoryToken(Driver)) private readonly drivers: Repository<Driver>,
    @Inject(getRepositoryToken(User)) private readonly users: Repository<User>,
  ) {}

  async findAll(filters: DriverFiltersDto): Promise<PaginatedResponse<DriverView>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const query = this.drivers
      .createQueryBuilder('driver')
      .innerJoinAndSelect('driver.user', 'user');

    if (filters.isActive === true) {
      query.andWhere('driver.isActive = true AND user.isActive = true');
    } else if (filters.isActive === false) {
      query.andWhere('(driver.isActive = false OR user.isActive = false)');
    }
    if (filters.search) {
      query.andWhere('(user.fullName ILIKE :search OR driver.licenseNumber ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }
    if (filters.expiringWithinDays !== undefined) {
      const today = calendarDateIn(new Date());
      query.andWhere(`driver.licenseExpiry <= (:today::date + :days::int)`, {
        today,
        days: filters.expiringWithinDays,
      });
    }

    const [rows, total] = await query
      .orderBy(
        filters.expiringWithinDays !== undefined ? 'driver.licenseExpiry' : 'user.fullName',
        'ASC',
      )
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponse(
      rows.map((driver) => toDriverView(driver)),
      total,
      page,
      limit,
    );
  }

  async findOneOrFail(id: string): Promise<DriverView> {
    const driver = await this.drivers.findOne({ where: { id }, relations: { user: true } });
    if (!driver) throw new NotFoundException('El conductor no existe.');
    return toDriverView(driver);
  }

  async create(dto: CreateDriverDto): Promise<DriverView> {
    const user = await this.users.findOneBy({ id: dto.userId });
    if (!user) throw new NotFoundException('El usuario no existe.');
    if (user.role !== UserRole.DRIVER) {
      throw new BadRequestException(
        `${user.fullName} no tiene rol de conductor. Cámbiale el rol en Usuarios antes de registrar su licencia.`,
      );
    }
    if (!user.isActive) {
      throw new BadRequestException(`${user.fullName} está desactivado.`);
    }
    if (await this.drivers.existsBy({ userId: dto.userId })) {
      throw new ConflictException(`${user.fullName} ya está registrado como conductor.`);
    }
    await this.assertLicenseFree(dto.licenseNumber);

    const driver = await this.drivers.save(this.drivers.create({ ...dto, isActive: true }));
    return this.findOneOrFail(driver.id);
  }

  async update(id: string, dto: UpdateDriverDto): Promise<DriverView> {
    const driver = await this.drivers.findOneBy({ id });
    if (!driver) throw new NotFoundException('El conductor no existe.');
    if (dto.licenseNumber && dto.licenseNumber !== driver.licenseNumber) {
      await this.assertLicenseFree(dto.licenseNumber, id);
    }
    Object.assign(driver, dto);
    await this.drivers.save(driver);
    return this.findOneOrFail(id);
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  private async assertLicenseFree(licenseNumber: string, exceptId?: string): Promise<void> {
    const taken = await this.drivers.existsBy(
      exceptId ? { licenseNumber, id: Not(exceptId) } : { licenseNumber },
    );
    if (taken) throw new ConflictException(`La licencia ${licenseNumber} ya está registrada.`);
  }
}
