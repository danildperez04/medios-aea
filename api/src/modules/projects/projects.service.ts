import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';
import type { ProjectFiltersDto } from './dto/project-filters.dto.js';
import type { UpdateProjectDto } from './dto/update-project.dto.js';
import { Project } from './entities/project.entity.js';

/**
 * Proyectos a los que se cargan los viajes (RF-04, HU-03).
 *
 * Un proyecto con viajes no se borra, se desactiva: deja de aparecer al
 * solicitar, pero los reportes históricos lo siguen mostrando.
 */
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(getRepositoryToken(Project)) private readonly projects: Repository<Project>,
  ) {}

  /** `onlyActive` lo fuerza el controlador para quien no es ADMIN. */
  async findAll(
    filters: ProjectFiltersDto,
    onlyActive: boolean,
  ): Promise<PaginatedResponse<Project>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const query = this.projects.createQueryBuilder('project');

    const isActive = onlyActive ? true : filters.isActive;
    if (isActive !== undefined) query.andWhere('project.isActive = :isActive', { isActive });
    if (filters.search) {
      query.andWhere('(project.code ILIKE :search OR project.name ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    const [data, total] = await query
      .orderBy('project.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOneOrFail(id: string, onlyActive = false): Promise<Project> {
    const project = await this.projects.findOneBy(onlyActive ? { id, isActive: true } : { id });
    if (!project) throw new NotFoundException('El proyecto no existe.');
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    await this.assertCodeFree(dto.code);
    return this.projects.save(this.projects.create({ ...dto, isActive: true }));
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOneOrFail(id);
    if (dto.code && dto.code !== project.code) await this.assertCodeFree(dto.code);
    Object.assign(project, dto);
    return this.projects.save(project);
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  private async assertCodeFree(code: string): Promise<void> {
    if (await this.projects.existsBy({ code })) {
      throw new ConflictException(`Ya existe un proyecto con el código ${code}.`);
    }
  }
}
