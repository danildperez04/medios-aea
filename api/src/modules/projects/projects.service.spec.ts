import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Project } from './entities/project.entity.js';
import { ProjectsService } from './projects.service.js';

/** Pruebas del servicio de proyectos (RF-04, HU-03). */
describe('ProjectsService', () => {
  let service: ProjectsService;
  let stored: Project[];

  beforeEach(() => {
    stored = [
      Object.assign(new Project(), { id: 'p1', code: 'PRY-AGUA', name: 'Agua', isActive: true }),
      Object.assign(new Project(), { id: 'p2', code: 'PRY-OLD', name: 'Viejo', isActive: false }),
    ];
    const repo = {
      existsBy: vi.fn(async ({ code }: { code: string }) => stored.some((p) => p.code === code)),
      findOneBy: vi.fn(
        async (where: { id: string; isActive?: boolean }) =>
          stored.find(
            (p) =>
              p.id === where.id && (where.isActive === undefined || p.isActive === where.isActive),
          ) ?? null,
      ),
      create: (data: Partial<Project>) => Object.assign(new Project(), data),
      save: vi.fn(async (project: Project) => project),
    };
    service = new ProjectsService(repo as never);
  });

  it('crea un proyecto activo', async () => {
    const project = await service.create({ code: 'PRY-SALUD', name: 'Salud comunitaria' });
    expect(project.isActive).toBe(true);
  });

  it('rechaza un codigo repetido con 409', async () => {
    await expect(service.create({ code: 'PRY-AGUA', name: 'Duplicado' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('permite editar sin cambiar el codigo', async () => {
    const project = await service.update('p1', { code: 'PRY-AGUA', name: 'Agua segura' });
    expect(project.name).toBe('Agua segura');
  });

  it('oculta un proyecto inactivo a quien no es ADMIN', async () => {
    await expect(service.findOneOrFail('p2', true)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOneOrFail('p2', false)).resolves.toBeDefined();
  });

  it('desactivar no borra', async () => {
    await service.deactivate('p1');
    expect(stored[0].isActive).toBe(false);
  });
});
