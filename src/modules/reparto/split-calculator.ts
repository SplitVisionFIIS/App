import { validation } from '../../common/errors';

export type SplitMode = 'EQUITATIVE' | 'BY_ITEM';

export interface CalcItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CalcAssignment {
  itemId: string;
  unitIndex: number;
  userId: string;
}

export interface CalcInput {
  mode: SplitMode;
  totalCents: number;
  taxCents: number;
  tipCents: number;
  discountCents: number;
  items: CalcItem[];
  /** Para EQUITATIVE: participantes seleccionados (orden no relevante). */
  participantIds: string[];
  /** Para BY_ITEM: una asignación por unidad. */
  assignments: CalcAssignment[];
  /** Orden determinista de desempate (ids de participantes). */
  tieBreakOrder: string[];
}

export interface SplitPart {
  userId: string;
  cents: number;
}

/**
 * Distribuye `amount` (entero, puede ser negativo) entre `weights`
 * con método del mayor residuo y desempate por id ascendente.
 * Invariante: la suma de resultados es exactamente `amount` (RNF-02).
 */
export function distribute(
  amount: number,
  weights: Map<string, number>,
  tieBreakOrder: string[],
): Map<string, number> {
  const result = new Map<string, number>();
  const ids = [...weights.keys()].sort((a, b) => {
    const ia = tieBreakOrder.indexOf(a);
    const ib = tieBreakOrder.indexOf(b);
    return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
  });
  if (ids.length === 0) return result;

  const totalWeight = ids.reduce((acc, id) => acc + (weights.get(id) ?? 0), 0);
  if (totalWeight === 0) {
    for (const id of ids) result.set(id, 0);
    return result;
  }

  const floors = new Map<string, number>();
  const remainders: { id: string; rem: bigint }[] = [];
  let assigned = 0;

  const amountB = BigInt(amount);
  const totalWeightB = BigInt(totalWeight);

  for (const id of ids) {
    const w = BigInt(weights.get(id) ?? 0);
    const numerator = amountB * w;
    let q = numerator / totalWeightB; // truncamiento hacia cero
    const r = numerator - q * totalWeightB;
    if (r !== 0n && numerator < 0n) q -= 1n; // piso exacto para negativos
    const floor = Number(q);
    const rem = numerator - BigInt(floor) * totalWeightB;
    floors.set(id, floor);
    assigned += floor;
    remainders.push({ id, rem });
  }

  let leftover = amount - assigned;
  remainders.sort((a, b) => (b.rem > a.rem ? 1 : b.rem < a.rem ? -1 : a.id.localeCompare(b.id)));
  for (let i = 0; leftover > 0; i = (i + 1) % remainders.length) {
    const id = remainders[i].id;
    floors.set(id, (floors.get(id) ?? 0) + 1);
    leftover -= 1;
  }

  return floors;
}

/**
 * Calcula la parte de cada participante (RF-16). Lanza errores de validación
 * con mensajes accionables cuando el reparto está incompleto o no cuadra.
 */
export function computeSplit(input: CalcInput): SplitPart[] {
  const {
    mode,
    totalCents,
    taxCents,
    tipCents,
    discountCents,
    items,
    participantIds,
    assignments,
    tieBreakOrder,
  } = input;

  if (mode === 'EQUITATIVE') {
    const selected = [...new Set(participantIds)].sort((a, b) => a.localeCompare(b));
    if (selected.length === 0) {
      throw validation('selecciona al menos un participante para el reparto equitativo');
    }
    const weights = new Map<string, number>();
    for (const id of selected) weights.set(id, 1);
    const parts = distribute(totalCents, weights, tieBreakOrder);
    return [...parts.entries()].map(([userId, cents]) => ({ userId, cents }));
  }

  // ---- Por ítems ----
  if (items.length === 0) {
    throw validation('el comprobante no tiene ítems; usa el reparto equitativo o agrega ítems');
  }

  const byItem = new Map<string, CalcItem>(items.map((i) => [i.id, i]));
  const base = new Map<string, number>();
  for (const id of new Set(assignments.map((a) => a.userId))) base.set(id, 0);

  const seen = new Set<string>();
  for (const a of assignments) {
    const item = byItem.get(a.itemId);
    if (!item) throw validation('la asignación hace referencia a un ítem inexistente');
    if (a.unitIndex < 1 || a.unitIndex > item.quantity) {
      throw validation(`unidad inválida en el ítem "${item.description}"`);
    }
    const key = `${a.itemId}:${a.unitIndex}`;
    if (seen.has(key)) throw validation(`la unidad ${a.unitIndex} del ítem "${item.description}" está asignada más de una vez`);
    seen.add(key);
    base.set(a.userId, (base.get(a.userId) ?? 0) + item.unitPriceCents);
  }

  // unidades sin asignar
  for (const item of items) {
    let missing = 0;
    for (let u = 1; u <= item.quantity; u++) {
      if (!seen.has(`${item.id}:${u}`)) missing++;
    }
    if (missing > 0) {
      throw validation(
        missing === 1
          ? `Falta asignar 1 unidad del ítem "${item.description}"`
          : `Faltan asignar ${missing} unidades del ítem "${item.description}"`,
      );
    }
  }

  const itemsSum = items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);
  const extras = taxCents + tipCents - discountCents;
  const expected = itemsSum + extras;
  if (expected !== totalCents) {
    const diff = totalCents - expected;
    throw validation(
      `Los ítems + impuestos + propina − descuentos no coinciden con el total: diferencia de S/ ${format(diff)}`,
    );
  }

  const order = tieBreakOrder.length > 0 ? tieBreakOrder : [...base.keys()].sort();
  const extraShare = distribute(extras, base, order);

  const parts: SplitPart[] = [];
  for (const [userId, b] of base.entries()) {
    parts.push({ userId, cents: b + (extraShare.get(userId) ?? 0) });
  }

  const sum = parts.reduce((acc, p) => acc + p.cents, 0);
  if (sum !== totalCents) {
    throw validation('no se pudo calcular un reparto que sume exactamente el total');
  }
  return parts.sort((a, b) => a.userId.localeCompare(b.userId));
}

function format(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}
