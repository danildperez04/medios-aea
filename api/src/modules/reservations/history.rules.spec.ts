import { describe, expect, it } from 'vitest';
import { AuditAction } from '#common/enums/domain.enums.js';
import { describeHistoryEntry, referencedIds, type HistoryNames } from './history.rules.js';

const names: HistoryNames = {
  resources: new Map([
    ['r1', 'Hilux blanca (M 123-456)'],
    ['r2', 'Prado (M 777-888)'],
  ]),
  drivers: new Map([
    ['d1', 'Ana Martínez'],
    ['d2', 'Luis Pérez'],
  ]),
};

describe('describeHistoryEntry', () => {
  it('una aprobacion dice el medio y quien conduce', () => {
    expect(
      describeHistoryEntry(AuditAction.APPROVE, { resourceId: 'r1', driverId: 'd1' }, names),
    ).toBe('Asignó Hilux blanca (M 123-456); conduce Ana Martínez.');
  });

  it('si la coordinacion cambio a quien conduce, nombra a quien se habia propuesto', () => {
    expect(
      describeHistoryEntry(
        AuditAction.APPROVE,
        { resourceId: 'r1', driverId: 'd2', proposedDriverId: 'd1', driverChanged: true },
        names,
      ),
    ).toBe(
      'Asignó Hilux blanca (M 123-456); conduce Luis Pérez. Se había propuesto a Ana Martínez.',
    );
  });

  it('una reserva directa se distingue de una aprobacion', () => {
    expect(
      describeHistoryEntry(
        AuditAction.APPROVE,
        { direct: true, resourceId: 'r2', driverId: 'd1', driverChanged: false },
        names,
      ),
    ).toBe('Registró la reserva ya aprobada: Prado (M 777-888); conduce Ana Martínez.');
  });

  it('un rechazo muestra su motivo', () => {
    expect(
      describeHistoryEntry(AuditAction.REJECT, { reason: 'Se cruza con la feria' }, names),
    ).toBe('Motivo: Se cruza con la feria');
  });

  it('una cancelacion dice si ya ocupaba un medio', () => {
    expect(describeHistoryEntry(AuditAction.CANCEL, { fromStatus: 'APPROVED' }, names)).toBe(
      'Estaba aprobada: el medio y quien conducía quedaron libres.',
    );
    expect(describeHistoryEntry(AuditAction.CANCEL, { fromStatus: 'PENDING' }, names)).toBe(
      'Todavía no se había decidido.',
    );
  });

  it('una reasignacion cuenta solo lo que cambio', () => {
    const from = { resourceId: 'r1', driverId: 'd1' };
    expect(
      describeHistoryEntry(
        AuditAction.REASSIGN,
        { from, to: { resourceId: 'r2', driverId: 'd1' } },
        names,
      ),
    ).toBe('Medio: de Hilux blanca (M 123-456) a Prado (M 777-888).');
    expect(
      describeHistoryEntry(
        AuditAction.REASSIGN,
        { from, to: { resourceId: 'r1', driverId: 'd2' } },
        names,
      ),
    ).toBe('Conduce: Luis Pérez en lugar de Ana Martínez.');
    expect(
      describeHistoryEntry(
        AuditAction.REASSIGN,
        { from, to: { resourceId: 'r2', driverId: 'd2' } },
        names,
      ),
    ).toBe(
      'Medio: de Hilux blanca (M 123-456) a Prado (M 777-888). Conduce: Luis Pérez en lugar de Ana Martínez.',
    );
  });

  it('no se rompe con datos incompletos o con medios y personas que ya no existen', () => {
    expect(
      describeHistoryEntry(AuditAction.APPROVE, { resourceId: 'x', driverId: 'y' }, names),
    ).toBe('Asignó un medio que ya no existe; conduce una persona que ya no existe.');
    expect(
      describeHistoryEntry(AuditAction.APPROVE, { resourceId: 'r1', driverId: null }, names),
    ).toBe('Asignó Hilux blanca (M 123-456).');
    expect(describeHistoryEntry(AuditAction.REJECT, null, names)).toBeNull();
    expect(describeHistoryEntry(AuditAction.CANCEL, {}, names)).toBeNull();
    expect(describeHistoryEntry(AuditAction.REASSIGN, { from: 'x' }, names)).toBeNull();
    expect(describeHistoryEntry(AuditAction.COMPLETE, {}, names)).toBeNull();
  });
});

describe('referencedIds', () => {
  it('junta los ids de medios y conductores de cualquier tipo de entrada', () => {
    expect(
      referencedIds({ resourceId: 'r1', driverId: 'd2', proposedDriverId: 'd1', reason: 'x' }),
    ).toEqual({ resources: ['r1'], drivers: ['d2', 'd1'] });
    expect(
      referencedIds({
        from: { resourceId: 'r1', driverId: 'd1' },
        to: { resourceId: 'r2', driverId: null },
      }),
    ).toEqual({ resources: ['r1', 'r2'], drivers: ['d1'] });
    expect(referencedIds(null)).toEqual({ resources: [], drivers: [] });
  });
});
