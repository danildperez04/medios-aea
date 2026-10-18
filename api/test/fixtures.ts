import { hash } from 'bcrypt';
import type { DataSource } from 'typeorm';
import { FuelType, ResourceType, UserRole } from '#common/enums/domain.enums.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { Vehicle } from '#modules/resources/entities/vehicle.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import { unique } from './e2e-context.js';

/**
 * Fabricas de datos para las pruebas de integracion. Cada llamada crea filas
 * con claves unicas por ejecucion para que las suites no choquen entre si.
 */

export const PASSWORD = 'Clave12345';

export async function createUser(
  dataSource: DataSource,
  role: UserRole,
  overrides: Partial<User> = {},
): Promise<User> {
  const repo = dataSource.getRepository(User);
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 4);
  const tag = unique(role.toLowerCase());
  return repo.save(
    repo.create({
      fullName: `Usuario ${tag}`,
      email: `${tag}@aea.test`,
      phone: null,
      passwordHash: await hash(PASSWORD, rounds),
      role,
      isActive: true,
      ...overrides,
    }),
  );
}

export async function createProject(dataSource: DataSource): Promise<Project> {
  const repo = dataSource.getRepository(Project);
  return repo.save(
    repo.create({ code: unique('PRY'), name: 'Proyecto de prueba', isActive: true }),
  );
}

export async function createVehicle(
  dataSource: DataSource,
  overrides: Partial<Vehicle> = {},
): Promise<Resource> {
  return dataSource.transaction(async (manager) => {
    const resource = await manager.save(
      manager.create(Resource, { type: ResourceType.VEHICLE, name: unique('Hilux') }),
    );
    await manager.save(
      manager.create(Vehicle, {
        resourceId: resource.id,
        plate: unique('M', 10),
        brand: 'Toyota',
        model: 'Hilux',
        year: 2022,
        passengerCapacity: 4,
        fuelType: FuelType.DIESEL,
        currentOdometer: 10_000,
        ...overrides,
      }),
    );
    return resource;
  });
}

export async function createDriver(
  dataSource: DataSource,
  licenseExpiry = '2030-12-31',
): Promise<Driver> {
  const user = await createUser(dataSource, UserRole.DRIVER);
  const repo = dataSource.getRepository(Driver);
  return repo.save(
    repo.create({ userId: user.id, licenseNumber: unique('LIC'), licenseExpiry, isActive: true }),
  );
}

/** Inicia sesion y devuelve el token. */
export async function loginAs(
  app: { getHttpServer: () => unknown },
  user: { email: string },
  password = PASSWORD,
): Promise<string> {
  const { default: request } = await import('supertest');
  const response = await request(app.getHttpServer() as never)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password });
  if (response.status !== 200) {
    throw new Error(`No se pudo iniciar sesion como ${user.email}: ${response.status}`);
  }
  return response.body.accessToken as string;
}

/**
 * Token firmado directamente, sin pasar por POST /auth/login. Para pruebas que no
 * prueban el login: así no consumen el límite de 10 intentos por minuto.
 */
export async function signToken(
  app: { get: <T>(token: new (...args: never[]) => T) => T },
  user: Pick<User, 'id' | 'email' | 'fullName' | 'role'>,
): Promise<string> {
  const { JwtService } = await import('@nestjs/jwt');
  return app
    .get(JwtService)
    .signAsync({ sub: user.id, email: user.email, fullName: user.fullName, role: user.role });
}
