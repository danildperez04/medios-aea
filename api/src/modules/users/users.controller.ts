import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '#common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { Roles } from '#common/decorators/roles.decorator.js';
import type { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto, UserFiltersDto } from './dto/user.dto.js';
import type { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Gestión de usuarios. Todo el controlador es exclusivo del ADMIN (RF-03). */
@ApiTags('Usuarios')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly service: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios con filtros y paginación' })
  findAll(@Query() filters: UserFiltersDto): Promise<PaginatedResponse<User>> {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @ApiResponse({ status: 404, description: 'El usuario no existe' })
  findOne(@Param('id', uuid) id: string): Promise<User> {
    return this.service.findOneOrFail(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un usuario con su rol' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado' })
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos, rol o estado de un usuario' })
  update(
    @Param('id', uuid) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<User> {
    return this.service.update(id, dto, actor.id);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: 'Restablecer la contraseña de un usuario' })
  async resetPassword(
    @Param('id', uuid) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.service.resetPassword(id, dto.password);
    return { message: 'La contraseña se restableció correctamente.' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un usuario (no se borra)' })
  async deactivate(
    @Param('id', uuid) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.service.deactivate(id, actor.id);
    return { message: 'Usuario desactivado.' };
  }
}
