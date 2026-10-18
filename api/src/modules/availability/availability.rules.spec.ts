import { describe, expect, it } from 'vitest';
import { ResourceStatus } from '#common/enums/domain.enums.js';
import { driverUnavailableReasons, resourceUnavailableReasons } from './availability.rules.js';

/** Reglas de disponibilidad (RN-01, RN-02, RN-04, RN-05, RN-09; PT-05 a PT-08). */
const free = {
  status: ResourceStatus.AVAILABLE,
  passengerCapacity: 4,
  hasBlackout: false,
  hasAssignment: false,
};

describe('resourceUnavailableReasons', () => {
  it('un medio libre no tiene motivos', () => {
    expect(resourceUnavailableReasons(free, 4)).toEqual([]);
  });

  it('PT-06: un medio en mantenimiento no se asigna', () => {
    expect(resourceUnavailableReasons({ ...free, status: ResourceStatus.MAINTENANCE })).toEqual([
      'MAINTENANCE',
    ]);
  });

  it('PT-07: no cabe si los pasajeros superan la capacidad', () => {
    expect(resourceUnavailableReasons(free, 5)).toEqual(['CAPACITY']);
  });

  it('la capacidad exacta si alcanza', () => {
    expect(resourceUnavailableReasons(free, 4)).toEqual([]);
  });

  it('sin pasajeros indicados no se evalua la capacidad', () => {
    expect(resourceUnavailableReasons({ ...free, passengerCapacity: 1 })).toEqual([]);
  });

  it('un equipo (sin capacidad) no falla por pasajeros', () => {
    expect(resourceUnavailableReasons({ ...free, passengerCapacity: null }, 30)).toEqual([]);
  });

  it('PT-05: un bloqueo lo hace no disponible', () => {
    expect(resourceUnavailableReasons({ ...free, hasBlackout: true })).toEqual(['BLOCKED']);
  });

  it('acumula todos los motivos para explicarlos en la interfaz', () => {
    expect(
      resourceUnavailableReasons(
        {
          status: ResourceStatus.MAINTENANCE,
          passengerCapacity: 2,
          hasBlackout: true,
          hasAssignment: true,
        },
        3,
      ),
    ).toEqual(['MAINTENANCE', 'CAPACITY', 'BLOCKED', 'BUSY']);
  });
});

describe('driverUnavailableReasons', () => {
  const range = {
    start: new Date('2026-10-20T14:00:00Z'),
    end: new Date('2026-10-20T18:00:00Z'),
  };

  it('un conductor activo, libre y con licencia vigente esta disponible', () => {
    expect(
      driverUnavailableReasons(
        { isActive: true, licenseExpiry: '2027-01-01', hasAssignment: false },
        range,
      ),
    ).toEqual([]);
  });

  it('PT-08: la licencia vencida a la fecha del viaje lo excluye', () => {
    expect(
      driverUnavailableReasons(
        { isActive: true, licenseExpiry: '2026-10-19', hasAssignment: false },
        range,
      ),
    ).toEqual(['LICENSE_EXPIRED']);
  });

  it('la licencia que vence el mismo dia del viaje todavia sirve', () => {
    expect(
      driverUnavailableReasons(
        { isActive: true, licenseExpiry: '2026-10-20', hasAssignment: false },
        range,
      ),
    ).toEqual([]);
  });

  it('PT-04: un conductor con otro viaje en el horario no esta disponible', () => {
    expect(
      driverUnavailableReasons(
        { isActive: false, licenseExpiry: '2027-01-01', hasAssignment: true },
        range,
      ),
    ).toEqual(['INACTIVE', 'BUSY']);
  });
});
