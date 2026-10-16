import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { AuthService } from '#modules/auth/auth.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { UserFiltersDto } from './dto/user-filters.dto.js';
import { User } from './entities/user.entity.js';

/**
 * Gestión de usuarios (RF-03, HU-02).
 *
 * - El correo es único sin distinguir mayúsculas y se guarda en minúsculas.
 * - Un usuario nunca se borra: tiene solicitudes y viajes asociados. Se desactiva.
 * - Un ADMIN no puede desactivarse ni quitarse el rol a sí mismo, para que la
 *   fundación no se quede sin nadie que pueda aprobar.
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(getRepositoryToken(User)) private readonly users: Repository<User>,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async findAll(filters: UserFiltersDto): Promise<PaginatedResponse<User>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const query = this.users.createQueryBuilder('user');

    if (filters.role) query.andWhere('user.role = :role', { role: filters.role });
    if (filters.isActive !== undefined) {
      query.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters.search) {
      query.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [data, total] = await query
      .orderBy('user.fullName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOneOrFail(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('El usuario no existe.');
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase();
    await this.assertEmailFree(email);

    const user = await this.users.save(
      this.users.create({
        fullName: dto.fullName,
        email,
        phone: dto.phone || null,
        role: dto.role,
        passwordHash: await this.auth.hash(dto.password),
        isActive: true,
      }),
    );
    return this.findOneOrFail(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<User> {
    const user = await this.findOneOrFail(id);

    if (id === actorId) {
      if (dto.isActive === false) {
        throw new BadRequestException('No puedes desactivar tu propia cuenta.');
      }
      if (dto.role && dto.role !== UserRole.ADMIN && user.role === UserRole.ADMIN) {
        throw new BadRequestException('No puedes quitarte el rol de administrador.');
      }
    }

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase();
      if (email !== user.email) await this.assertEmailFree(email, id);
      user.email = email;
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone || null;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.users.save(user);
    return this.findOneOrFail(id);
  }

  async deactivate(id: string, actorId: string): Promise<void> {
    await this.update(id, { isActive: false }, actorId);
  }

  async resetPassword(id: string, password: string): Promise<void> {
    await this.findOneOrFail(id);
    await this.users.update(id, { passwordHash: await this.auth.hash(password) });
  }

  private async assertEmailFree(email: string, exceptId?: string): Promise<void> {
    const taken = await this.users
      .createQueryBuilder('user')
      .where('lower(user.email) = :email', { email })
      .getOne();
    if (taken && taken.id !== exceptId) {
      throw new ConflictException(`Ya existe un usuario con el correo ${email}.`);
    }
  }
}
