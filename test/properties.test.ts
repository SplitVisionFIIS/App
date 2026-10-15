import fc from 'fast-check';
import { computeSplit, distribute, CalcItem } from '../src/modules/reparto/split-calculator';
import { toCents, formatCents } from '../src/common/money';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`);

describe('RF-16 / RNF-02 · reparto por propiedades', () => {
  test('distribute: la suma de las partes es exactamente el total (1000 casos)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -50_000, max: 100_000_000 }),
        fc.array(fc.integer({ min: 0, max: 10_000 }), { minLength: 1, maxLength: 12 }),
        (amount, weightsRaw) => {
          const totalWeight = weightsRaw.reduce((a, b) => a + b, 0);
          fc.pre(amount === 0 || totalWeight > 0);
          const keys = ids(weightsRaw.length);
          const weights = new Map(keys.map((k, i) => [k, weightsRaw[i]]));
          const parts = distribute(amount, weights, keys);
          const sum = [...parts.values()].reduce((a, b) => a + b, 0);
          expect(sum).toBe(amount);
          if (amount >= 0) {
            for (const v of parts.values()) expect(v).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  test('distribute: determinista — la misma entrada produce siempre el mismo resultado', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 2, maxLength: 8 }),
        (amount, weightsRaw) => {
          const keys = ids(weightsRaw.length);
          const weights = new Map(keys.map((k, i) => [k, weightsRaw[i]]));
          const a = distribute(amount, weights, keys);
          const b = distribute(amount, weights, keys);
          expect([...a.entries()]).toEqual([...b.entries()]);
        },
      ),
      { numRuns: 300 },
    );
  });

  test('EQUITATIVE con impuestos, propina y descuento suma siempre el total (1000 casos)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 2, max: 7 }),
        (base, tax, tip, discount, n) => {
          fc.pre(discount <= tax + tip + base);
          const totalCents = base + tax + tip - discount;
          const participantIds = ids(n);
          const parts = computeSplit({
            mode: 'EQUITATIVE',
            totalCents,
            taxCents: tax,
            tipCents: tip,
            discountCents: discount,
            items: [],
            participantIds,
            assignments: [],
            tieBreakOrder: participantIds,
          });
          const sum = parts.reduce((acc, p) => acc + p.cents, 0);
          expect(sum).toBe(totalCents);
          expect(parts.length).toBe(n);
        },
      ),
      { numRuns: 1000 },
    );
  });

  test('S/ 100.00 entre 3 son 33.34 / 33.33 / 33.33 (RF-16 criterio)', () => {
    const parts = computeSplit({
      mode: 'EQUITATIVE',
      totalCents: 10_000,
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      items: [],
      participantIds: ['ana', 'bob', 'caro'],
      assignments: [],
      tieBreakOrder: ['ana', 'bob', 'caro'],
    });
    const cents = Object.fromEntries(parts.map((p) => [p.userId, p.cents]));
    expect(cents).toEqual({ ana: 3334, bob: 3333, caro: 3333 });
  });

  test('BY_ITEM: Chaufa ×2 a S/ 15 y Gaseosa ×1 a S/ 6 → Mateo 15.00, Lucía 21.00 (RF-16 criterio)', () => {
    const items: CalcItem[] = [
      { id: 'i1', description: 'Chaufa', quantity: 2, unitPriceCents: 1500 },
      { id: 'i2', description: 'Gaseosa', quantity: 1, unitPriceCents: 600 },
    ];
    const parts = computeSplit({
      mode: 'BY_ITEM',
      totalCents: 3600,
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      items,
      participantIds: ['mateo', 'lucia'],
      assignments: [
        { itemId: 'i1', unitIndex: 1, userId: 'mateo' },
        { itemId: 'i1', unitIndex: 2, userId: 'lucia' },
        { itemId: 'i2', unitIndex: 1, userId: 'lucia' },
      ],
      tieBreakOrder: ['lucia', 'mateo'],
    });
    expect(parts).toEqual([
      { userId: 'lucia', cents: 2100 },
      { userId: 'mateo', cents: 1500 },
    ]);
  });

  test('BY_ITEM: unidades incompletas, duplicadas o total que no cuadra se rechazan (RNF-34)', () => {
    const items: CalcItem[] = [{ id: 'i1', description: 'Chaufa', quantity: 2, unitPriceCents: 1500 }];
    const base = {
      mode: 'BY_ITEM' as const,
      totalCents: 3000,
      taxCents: 0,
      tipCents: 0,
      discountCents: 0,
      items,
      participantIds: ['a', 'b'],
      tieBreakOrder: ['a', 'b'],
    };
    expect(() => computeSplit({ ...base, assignments: [{ itemId: 'i1', unitIndex: 1, userId: 'a' }] })).toThrow(
      /Falta asignar 1 unidad/,
    );
    expect(() =>
      computeSplit({
        ...base,
        assignments: [
          { itemId: 'i1', unitIndex: 1, userId: 'a' },
          { itemId: 'i1', unitIndex: 1, userId: 'b' },
        ],
      }),
    ).toThrow(/asignada más de una vez/);
    expect(() =>
      computeSplit({
        ...base,
        totalCents: 3100,
        assignments: [
          { itemId: 'i1', unitIndex: 1, userId: 'a' },
          { itemId: 'i1', unitIndex: 2, userId: 'b' },
        ],
      }),
    ).toThrow(/no coinciden con el total: diferencia de S\/ 1\.00/);
    expect(() =>
      computeSplit({
        ...base,
        assignments: [
          { itemId: 'i1', unitIndex: 1, userId: 'a' },
          { itemId: 'i1', unitIndex: 3, userId: 'b' },
        ],
      }),
    ).toThrow(/unidad inválida/);
  });

  test('los errores de validación son rechazos de validación (código VALIDATION)', () => {
    try {
      computeSplit({
        mode: 'BY_ITEM',
        totalCents: 100,
        taxCents: 0,
        tipCents: 0,
        discountCents: 0,
        items: [{ id: 'x', description: 'x', quantity: 1, unitPriceCents: 50 }],
        participantIds: ['a'],
        assignments: [],
        tieBreakOrder: ['a'],
      });
      throw new Error('no debió calcular');
    } catch (e) {
      expect((e as { code?: string }).code).toBe('VALIDATION');
    }
  });
});

describe('dinero en centavos (ADR-06)', () => {
  test('formatCents y toCents son inversos para cualquier entero no negativo', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99_999_999 }), (cents) => {
        expect(toCents(formatCents(cents))).toBe(cents);
      }),
      { numRuns: 1000 },
    );
  });

  test('acepta solo números con hasta 2 decimales y sin signo', () => {
    const valid = ['0', '0.5', '0.05', '12', '12.3', '12.34', '999999999.99', ' 15.00 '];
    for (const v of valid) expect(toCents(v)).toBeGreaterThanOrEqual(0);
    const invalid = ['-1', '1.234', 'abc', '', '1e5', '1,5', '0.', '.5', NaN as unknown as string, null as unknown as string];
    for (const v of invalid) expect(() => toCents(v)).toThrow();
  });
});
