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
import { CreateProjectDto, ProjectFiltersDto, UpdateProjectDto } from './dto/project.dto.js';
import type { Project } from './entities/project.entity.js';
import { ProjectsService } from './projects.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

/**
 * Proyectos. Cualquier usuario autenticado los consulta (el técnico elige uno
 * al solicitar), pero solo ve los activos. Crear y editar es del ADMIN.
 */
@ApiTags('Proyectos')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly service: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar proyectos (los no ADMIN solo ven los activos)' })
  findAll(
    @Query() filters: ProjectFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<Project>> {
    return this.service.findAll(filters, user.role !== UserRole.ADMIN);
  }

  @Get(':id')
  @ApiResponse({ status: 404, description: 'El proyecto no existe' })
  findOne(@Param('id', uuid) id: string, @CurrentUser() user: AuthenticatedUser): Promise<Project> {
    return this.service.findOneOrFail(id, user.role !== UserRole.ADMIN);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  create(@Body() dto: CreateProjectDto): Promise<Project> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', uuid) id: string, @Body() dto: UpdateProjectDto): Promise<Project> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar un proyecto (no se borra)' })
  async deactivate(@Param('id', uuid) id: string): Promise<{ message: string }> {
    await this.service.deactivate(id);
    return { message: 'Proyecto desactivado.' };
  }
}
