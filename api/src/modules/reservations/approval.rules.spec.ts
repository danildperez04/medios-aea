import { describe, expect, it } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { driverProblem, resourceProblem } from './approval.rules.js';

/** Respuesta de la aprobación según por qué no sirve el medio (RN-01, RN-04, RN-05). */
describe('resourceProblem', () => {
  const hilux = { name: 'Hilux blanca', passengerCapacity: 4 };

  it('sin motivos se puede aprobar', () => {
    expect(resourceProblem([], hilux, 3)).toBeNull();
  });

  it('mantenimiento y capacidad son 422 (PT-06, PT-07)', () => {
    expect(resourceProblem(['MAINTENANCE'], hilux, 3)).toEqual({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Hilux blanca está en mantenimiento. Elige otro medio.',
    });
    expect(resourceProblem(['CAPACITY'], hilux, 6)?.message).toBe(
      'Hilux blanca lleva 4 pasajeros y la solicitud es para 6. Elige un medio más grande.',
    );
  });

  it('un bloqueo o un viaje en el horario son 409 (PT-01, PT-05)', () => {
    expect(resourceProblem(['BLOCKED'], hilux, 3)?.status).toBe(HttpStatus.CONFLICT);
    expect(resourceProblem(['BUSY'], hilux, 3, 'SOL-2026-00042, El Rosario')).toEqual({
      status: HttpStatus.CONFLICT,
      message:
        'Hilux blanca ya tiene un viaje aprobado en ese horario (SOL-2026-00042, El Rosario). Elige otro medio o reasigna ese viaje.',
    });
  });

  it('con varios motivos responde por el primero', () => {
    expect(resourceProblem(['MAINTENANCE', 'BUSY'], hilux, 3)?.status).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });
});

/** Respuesta de la aprobación según por qué no puede conducir (RN-02, RN-09). */
describe('driverProblem', () => {
  const ana = { fullName: 'Ana Martínez', licenseExpiry: '2026-10-21' };

  it('sin motivos puede conducir', () => {
    expect(driverProblem([], ana)).toBeNull();
  });

  it('licencia vencida o persona inactiva son 422 (PT-08)', () => {
    expect(driverProblem(['LICENSE_EXPIRED'], ana)).toEqual({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      message:
        'La licencia de Ana Martínez vence el 21/10/2026 y no cubre el viaje. Elige a otra persona.',
    });
    expect(driverProblem(['INACTIVE'], ana)?.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });

  it('otro viaje a la misma hora es 409 (PT-04)', () => {
    expect(driverProblem(['BUSY'], ana, 'SOL-2026-00007, Somoto')?.message).toBe(
      'Ana Martínez ya conduce otro viaje en ese horario (SOL-2026-00007, Somoto). Elige a otra persona.',
    );
  });
});
