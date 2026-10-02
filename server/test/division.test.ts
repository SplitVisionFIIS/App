import { describe, expect, it } from 'vitest';
import {
  deudasDesdePartes,
  repartoEquitativo,
  repartoPorItems,
  verificarInvariante,
} from '../src/division/engine';
import { ContractViolation } from '../src/division/contratos';

describe('RF4 - Motor de division (Design by Contract)', () => {
  it('reparto equitativo de S/ 100.00 entre 3 cuadra exacto (33.34 / 33.33 / 33.33)', () => {
    const partes = repartoEquitativo(10000, ['u1', 'u2', 'u3']);
    const montos = partes.map((p) => p.montoCents);
    expect(montos).toEqual([3334, 3333, 3333]);
    expect(montos.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('todo reparto equitativo conserva la invariante suma(partes) == total', () => {
    for (const total of [1, 7, 99, 100, 1000, 12345]) {
      for (const cantidad of [1, 2, 3, 7, 13]) {
        const participantes = Array.from({ length: cantidad }, (_, i) => `u${i}`);
        const partes = repartoEquitativo(total, participantes);
        expect(partes.reduce((suma, p) => suma + p.montoCents, 0)).toBe(total);
        for (const parte of partes) {
          expect(parte.montoCents).toBeGreaterThanOrEqual(0);
          expect(parte.montoCents).toBeLessThanOrEqual(total);
        }
      }
    }
  });

  it('reparto por items con impuestos, propina y descuentos cuadra con el total', () => {
    // items: 10.00 (u1) + 15.00 (u1, u2); impuestos 5.00; descuentos 3.00 => total 27.00
    const partes = repartoPorItems(
      2700,
      ['u1', 'u2'],
      [
        { descripcion: 'Almuerzo', montoCents: 1000, consumidores: ['u1'] },
        { descripcion: 'Postre compartido', montoCents: 1500, consumidores: ['u1', 'u2'] },
      ],
      { impuestosCents: 500, propinaCents: 0, descuentosCents: 300 },
    );
    const porUsuario = Object.fromEntries(partes.map((p) => [p.usuarioId, p.montoCents]));
    expect(porUsuario).toEqual({ u1: 1890, u2: 810 });
    expect(porUsuario.u1 + porUsuario.u2).toBe(2700);
  });

  it('un item indivisible reparte sus centavos por resto mayor', () => {
    const partes = repartoPorItems(1000, ['u1', 'u2', 'u3'], [
      { descripcion: 'Taxi', montoCents: 1000, consumidores: ['u1', 'u2', 'u3'] },
    ]);
    expect(partes.map((p) => p.montoCents).sort()).toEqual([333, 333, 334]);
  });

  it('la parte del pagador no genera deuda', () => {
    const deudas = deudasDesdePartes(
      [
        { usuarioId: 'pagador', montoCents: 100 },
        { usuarioId: 'u2', montoCents: 100 },
        { usuarioId: 'u3', montoCents: 0 },
      ],
      'pagador',
    );
    expect(deudas).toHaveLength(1);
    expect(deudas[0].usuarioId).toBe('u2');
  });

  describe('violaciones de contrato detectadas antes de persistir', () => {
    it('rechaza total no positivo', () => {
      expect(() => repartoEquitativo(0, ['u1', 'u2'])).toThrow(ContractViolation);
    });

    it('rechaza participantes duplicados', () => {
      expect(() => repartoEquitativo(100, ['u1', 'u1'])).toThrow(ContractViolation);
    });

    it('rechaza items que no cuadran con el total', () => {
      expect(() =>
        repartoPorItems(2000, ['u1'], [
          { descripcion: 'A', montoCents: 1000, consumidores: ['u1'] },
        ]),
      ).toThrow(ContractViolation);
    });

    it('rechaza items sin consumidores', () => {
      expect(() =>
        repartoPorItems(1000, ['u1'], [{ descripcion: 'A', montoCents: 1000, consumidores: [] }]),
      ).toThrow(ContractViolation);
    });

    it('rechaza consumidores que no son participantes', () => {
      expect(() =>
        repartoPorItems(1000, ['u1'], [
          { descripcion: 'A', montoCents: 1000, consumidores: ['u1', 'intruso'] },
        ]),
      ).toThrow(ContractViolation);
    });

    it('verificarInvariante detecta partes que no suman el total', () => {
      expect(() =>
        verificarInvariante(1000, [
          { usuarioId: 'u1', montoCents: 400 },
          { usuarioId: 'u2', montoCents: 500 },
        ]),
      ).toThrow(ContractViolation);
    });
  });
});
