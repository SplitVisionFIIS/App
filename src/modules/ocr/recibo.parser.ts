import { validation } from '../../common/errors';

/** Ítem crudo tal como lo espera `validateOcrPayload` (montos en soles). */
export interface RawOcrItem {
  description: string;
  quantity: number;
  unit_price: number;
}

/** Respuesta cruda que luego pasa por `validateOcrPayload` (RNF-10). */
export interface RawOcrPayload {
  total: number;
  tax: number;
  tip: number;
  discount: number;
  description: string | null;
  items: RawOcrItem[];
  /** `true` cuando los ítems no cuadran exactamente y se conservan como mejor esfuerzo. */
  bestEffort?: boolean;
}

const MONEY = /(\d[\d.,]*\d|\d)/g;

/** Convierte un texto monetario (S/ 57.50, 1.234,56, 57,50) a número. */
export function parseMonto(raw: string): number | null {
  let s = String(raw).replace(/[^\d.,]/g, '').trim();
  if (!s) return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = s.split(',');
    s = parts.length === 2 && parts[1].length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2) s = parts.join('');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function numeros(linea: string): number[] {
  const out: number[] = [];
  for (const m of linea.matchAll(MONEY)) {
    const v = parseMonto(m[0]);
    if (v !== null) out.push(v);
  }
  return out;
}

/** Normaliza artefactos típicos del OCR (p. ej. `6-50` por `6.50`). */
function normalizar(text: string): string {
  return text.replace(/(\d)\s*[-–—]\s*(\d{2})(?!\d)/g, '$1.$2');
}

const ES_TOTAL = /(\bTOTAL\b|A\s*PAGAR|IMPORTE\s*(TOTAL|A\s*PAGAR|FINAL)?|MONTO\s*TOTAL)/i;
const ES_SUBTOTAL = /\bSUB\s*-?\s*TOTAL\b/i;
const ES_TAX = /(\bI\.?G\.?V\.?\b|\bI\.?V\.?A\.?\b|IMPUESTO)/i;
const ES_TIP = /(\bSERVICIO\b|\bPROPINA\b|\bTIP\b)/i;
const ES_DESCUENTO = /\bDESCUENTO\b/i;
const ES_RUIDO =
  /^(RUC|R\.?U\.?C|DNI|TEL|TELF|FECHA|HORA|C\.?AJA|CAJERO|SERIE|BOLETA|FACTURA|DOCUMENTO|CIUDAD|DIRECCION|DIRECCIÓN|GRACIAS|ATENDI|MESA|MOZO|CANT)/i;

function limpiarDescripcion(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} .,%°/-]/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s.,\-=|]+|[\s.,\-=|]+$/g, '')
    .trim()
    .slice(0, 200);
}

/** Quita del texto la columna de precios (moneda + importes) que va al final. */
function textoDescripcion(descRaw: string): string {
  return descRaw.replace(/\s*[|].*$/u, '').replace(/\s*[sS$]?\s*\/?\.?\s*\d.*$/u, ' ');
}

function sumaCents(items: RawOcrItem[]): number {
  return Math.round(items.reduce((acc, i) => acc + i.quantity * i.unit_price * 100, 0));
}

/**
 * Intenta cuadrar los ítems con el total corrigiendo errores típicos del OCR:
 * un importe con el punto decimal perdido (`19.50` leído `1950`) o un ítem
 * espurio. Devuelve los ítems corregidos solo si el cuadre es exacto y único.
 */
export function reconciliar(items: RawOcrItem[], objetivoCents: number): RawOcrItem[] | null {
  const base = sumaCents(items);

  const porDecimal: { items: RawOcrItem[] }[] = [];
  for (let i = 0; i < items.length; i++) {
    for (const factor of [0.01, 100]) {
      const unit = items[i].unit_price * factor;
      if (!(unit > 0)) continue;
      const delta = Math.round(unit * 100) * items[i].quantity - Math.round(items[i].unit_price * 100) * items[i].quantity;
      if (base + delta !== objetivoCents) continue;
      const corregidos = items.map((it, j) => (j === i ? { ...it, unit_price: unit } : it));
      porDecimal.push({ items: corregidos });
    }
  }
  if (porDecimal.length === 1) return porDecimal[0].items;

  for (let i = 0; i < items.length; i++) {
    if (base - Math.round(items[i].quantity * items[i].unit_price * 100) === objetivoCents) {
      return items.filter((_, j) => j !== i);
    }
  }
  return null;
}

/**
 * Extrae ítems de las líneas de detalle. Si su suma no cuadra con el total, se
 * intenta reconciliar; si no se logra, se conservan igualmente como mejor
 * esfuerzo (`reconciled: false`) para que el usuario los revise.
 */
function extraerItems(
  lineas: string[],
  total: number,
  extras: number,
): { items: RawOcrItem[]; reconciled: boolean } {
  const items: RawOcrItem[] = [];
  for (const linea of lineas) {
    const tieneMonto = numeros(linea).length > 0;
    if (tieneMonto && (ES_TOTAL.test(linea) || ES_SUBTOTAL.test(linea))) break;
    if (ES_TAX.test(linea) || ES_TIP.test(linea) || ES_DESCUENTO.test(linea)) continue;
    const item = parsearLineaItem(linea);
    if (item) items.push(item);
  }
  if (items.length === 0) return { items: [], reconciled: true };
  const objetivoCents = Math.round((total - extras) * 100);
  if (sumaCents(items) === objetivoCents) return { items, reconciled: true };
  const arreglados = reconciliar(items, objetivoCents);
  if (arreglados) return { items: arreglados, reconciled: true };
  return { items, reconciled: false };
}

function parsearLineaItem(linea: string): RawOcrItem | null {
  const l = linea.trim();
  if (!l || ES_RUIDO.test(l)) return null;

  // Formato con cantidad y separador de columnas: "<=. (2) | Desc ... 18.00 36.00"
  const conQty = l.match(/(\d{1,3})\s*[)\]]?\s*[|]\s*(.+)$/);
  if (conQty) {
    const ns = numeros(conQty[2]);
    const item = armarItem(Number(conQty[1]), conQty[2], ns);
    if (item) return item;
  }

  const ns = numeros(l);
  if (ns.length >= 2) {
    const item =
      armarItem(Number(l.match(/^\s*(\d{1,3})\b/)?.[1] ?? NaN), l, ns) ??
      armarItem(Number(l.match(/\b(\d{1,3})\s*[xX]\b/)?.[1] ?? NaN), l, ns);
    if (item) return item;
  }
  return null;
}

/** Arma un ítem tomando los dos últimos importes como (unitario, total). */
function armarItem(qty: number, descRaw: string, ns: number[]): RawOcrItem | null {
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) return null;
  if (ns.length < 1) return null;
  let unit = ns[ns.length - 1];
  if (ns.length >= 2) {
    const a = ns[ns.length - 2];
    const b = ns[ns.length - 1];
    if (Math.abs(a * qty - b) <= 0.011) unit = a;
    else if (Math.abs(b * qty - a) <= 0.011) unit = b;
    else unit = a;
  }
  if (!(unit > 0)) return null;
  const desc = limpiarDescripcion(textoDescripcion(descRaw));
  if (desc.replace(/[^\p{L}]/gu, '').length < 2) return null;
  return { description: desc, quantity: qty, unit_price: unit };
}

function ultimoMontoDe(linea: string): number | null {
  const ns = numeros(linea);
  return ns.length > 0 ? ns[ns.length - 1] : null;
}

/**
 * Heurística ES/PE: convierte el texto plano del OCR en un payload estructurado.
 * Lanza `validation` si no logra detectar un total positivo.
 */
export function parseRecetaTexto(text: string): RawOcrPayload {
  const lineas = normalizar(String(text))
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lineas.length === 0) {
    throw validation('el OCR no devolvió texto legible del comprobante');
  }

  let total: number | null = null;
  let tax = 0;
  let tip = 0;
  let discount = 0;
  for (const linea of lineas) {
    if (ES_SUBTOTAL.test(linea)) continue;
    if (ES_TOTAL.test(linea)) {
      const v = ultimoMontoDe(linea);
      if (v !== null && v > 0) total = v;
      continue;
    }
    if (ES_TAX.test(linea)) {
      const v = ultimoMontoDe(linea);
      if (v !== null && v >= 0) tax = v;
      continue;
    }
    if (ES_TIP.test(linea)) {
      const v = ultimoMontoDe(linea);
      if (v !== null && v >= 0) tip = v;
      continue;
    }
    if (ES_DESCUENTO.test(linea)) {
      const v = ultimoMontoDe(linea);
      if (v !== null && v >= 0) discount = v;
    }
  }
  if (total === null) {
    throw validation('no se pudo detectar el total en el comprobante');
  }

  const description =
    lineas
      .find((l) => /[A-Za-zÁÉÍÓÚÑ]{3}/.test(l) && !ES_RUIDO.test(l) && !/\d/.test(l))
      ?.replace(/[^\p{L}\p{N} .,&°-]/gu, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s.,\-=|]+|[\s.,\-=|]+$/g, '')
      .trim()
      .slice(0, 200) || null;

  const extrasCents = Math.round((tax + tip - discount) * 100);
  const { items, reconciled } = extraerItems(lineas, total, extrasCents / 100);
  return {
    total,
    tax,
    tip,
    discount,
    description,
    items,
    ...(items.length > 0 && !reconciled ? { bestEffort: true } : {}),
  };
}
