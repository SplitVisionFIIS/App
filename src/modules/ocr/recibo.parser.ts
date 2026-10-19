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

const ES_TOTAL = /(\bTOTAL\b|A\s*PAGAR|IMPORTE\s*(TOTAL|A\s*PAGAR|FINAL)?|MONTO\s*TOTAL|VENTA\s*TOTAL|TOTAL\s*VENTA|IMPORTE\s*TOTAL|CONSUMO)/i;
const ES_SUBTOTAL = /\bSUB\s*-?\s*TOTAL\b/i;
const ES_TAX = /(\bI\.?G\.?V\.?\b|\bI\.?V\.?A\.?\b|IMPUESTO)/i;
const ES_TIP = /(\bSERVICIO\b|\bPROPINA\b|\bTIP\b)/i;
const ES_DESCUENTO = /\bDESCUENTO\b/i;
const CONTIENE_METADATO =
  /(?:\b(RUC|DNI|TEL[EÉ]FONO|TELFS?|HORA|EMISI[OÓ]N|FEC\b|CAJA|CAJERO|SERIE|BOLETA|FACTURA|DOCUMENTO|CIUDAD|DIRECCI[OÓ]N|DOMICILIO|CALLE|AVENIDA|AVDA|JIR[OÓ]N|PASAJE|MESA|MOZO|MESERO|ATENDI[DO]?|CLIENTE|NOMBRE|PEDIDO|ORDEN|TICKET|SUB-?TOTAL|OP\.?\s*GRAV|OP\.?\s*INAF|OP\.?\s*EXON|IGV|IVA|ICBPER?|PAGO|PAGADO|VISA|MASTERCARD|EFECTIVO|VUELTO|GRACIAS|SON\s*:)\b|\bDOM\.?\s*[HF]ISCAL|\bLOCAL\s*:|\bAV[D.]?,?\s+[A-Z]|\bJR[.]?,?\s+[A-Z]|\bMZ[.]?\s*[A-Z0-9]|\bLOTE\s*\d|\bREF(?:ERENCIA)?[.]?\s*:|\bSR[.]?\(?A\)?|\bMESA\s*:?\s*\d|\bFORMA\s+DE\s+PAGO|\bPAGO\s+CON)/i;

const ES_RUIDO = CONTIENE_METADATO;

const ES_FECHA_O_HORA = /(?:\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b)/;

function esCabeceraTabla(linea: string): boolean {
  const palabras = linea.match(/\b(PRODUCTO|DESCRIPCI[OÓ]N|CANT|CANTIDAD|P\.?\s*UNIT|PRECIO|IMPORTE|TOTAL)\b/gi) || [];
  return palabras.length >= 2;
}

function limpiarDescripcion(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} .,%°/-]/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s.,\-=|]+|[\s.,\-=|]+$/g, '')
    .trim()
    .slice(0, 200);
}

/** Quita del texto únicamente la columna de precios y símbolos al final. */
function textoDescripcion(descRaw: string): string {
  let s = descRaw;
  if (s.includes('|')) {
    s = s.replace(/\s*[|].*$/u, '');
  }
  // Quita importes y monedas al final de la línea sin comerse la 's' final de palabras (como "Papas")
  return s
    .replace(/(?:(?:S\s*\/\.?|S\/|\$|PEN|USD)\s*)?(?:\d[\d.,]*\d|\d)(?:\s+(?:(?:S\s*\/\.?|S\/|\$|PEN|USD)\s*)?(?:\d[\d.,]*\d|\d))*\s*$/u, ' ')
    .trim();
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

function tienePrecio(linea: string): boolean {
  return /(?:[sS$€£]\s*\/?\.?\s*\d|\d+[.,]\d{2}(?!\d))/.test(linea);
}

function esInicioDeNuevoItem(linea: string): boolean {
  return /^(?:[(\[])?\d{1,3}[)\]]?\s*(?:[xX*|]\s*|\s+)[a-zA-Z\p{L}]/u.test(linea.trim());
}

/**
 * Extrae ítems de las líneas de detalle con soporte para descripciones
 * partidas en múltiples líneas (tanto cuando el precio está en la 1ra como en la 2da fila)
 * y filtrado riguroso de metadatos administrativos.
 */
function extraerItems(
  lineas: string[],
  total: number,
  extras: number,
): { items: RawOcrItem[]; reconciled: boolean } {
  const items: RawOcrItem[] = [];
  let pendingPrefix = '';

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const tieneMonto = numeros(linea).length > 0;
    if (tieneMonto && (ES_TOTAL.test(linea) || ES_SUBTOTAL.test(linea))) break;
    if (ES_TAX.test(linea) || ES_TIP.test(linea) || ES_DESCUENTO.test(linea)) continue;
    if (CONTIENE_METADATO.test(linea) || ES_FECHA_O_HORA.test(linea) || esCabeceraTabla(linea)) {
      pendingPrefix = '';
      continue;
    }

    // Si la línea actual es por sí sola un ítem válido, cualquier pendingPrefix
    // anterior era un encabezado/nombre de local y se descarta.
    const itemSolo = parsearLineaItem(linea);
    if (itemSolo) {
      items.push(itemSolo);
      pendingPrefix = '';
      continue;
    }

    const lineaConPrefix = pendingPrefix ? `${pendingPrefix} ${linea}` : linea;
    const item = parsearLineaItem(lineaConPrefix);

    if (item) {
      items.push(item);
      pendingPrefix = '';
    } else {
      const lineaTienePrecio = tienePrecio(linea);
      const iniciaNuevo = esInicioDeNuevoItem(linea);

      // Reconstrucción de ítems multilínea:
      // Caso 1: La fila siguiente es continuación de la descripción del ítem anterior
      // (el precio apareció en la primera fila, ej. "1 Pollo a la brasa 65.00" seguido de "fritas y ensalada")
      if (!lineaTienePrecio && !iniciaNuevo && items.length > 0) {
        const descCont = limpiarDescripcion(linea);
        if (descCont.length >= 2) {
          items[items.length - 1].description = limpiarDescripcion(
            `${items[items.length - 1].description} ${descCont}`,
          );
          continue;
        }
      }

      // Caso 2: Es el título que continúa en la siguiente línea con el precio
      if (!lineaTienePrecio) {
        pendingPrefix = pendingPrefix ? `${pendingPrefix} ${linea}` : linea;
      }
    }
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
  if (!l || CONTIENE_METADATO.test(l) || ES_FECHA_O_HORA.test(l) || esCabeceraTabla(l)) return null;

  // 1) Formato con pipe (columnas): "<=. (2) | Desc ... 18.00 36.00"
  const conPipe = l.match(/^(?:.*?[(\[])?(\d{1,3})[)\]]?\s*[|]\s*(.+)$/);
  if (conPipe) {
    const qty = Number(conPipe[1]);
    const cuerpo = conPipe[2].trim();
    const item = armarItem(qty, cuerpo);
    if (item) return item;
  }

  // 2) Formato estándar sin pipe: "2 Ceviche Mixto 45.00" o "2x Cerveza 12.00" o "(1) Cafe 8.00"
  const conQtyInicio = l.match(/^(?:[(\[])?(\d{1,3})[)\]]?\s*(?:[xX*]\s*|\s+)(.+)$/);
  if (conQtyInicio) {
    const qty = Number(conQtyInicio[1]);
    const cuerpo = conQtyInicio[2].trim();
    const item = armarItem(qty, cuerpo);
    if (item) return item;
  }

  // 3) Sin cantidad explícita (asume cantidad = 1):
  // Debe contener un formato claro de precio decimal (ej. 45.00) o símbolo de moneda para evitar números de calle
  const tienePrecioDecimalOMoneda = /(?:[sS$€£]\s*\/?\.?\s*\d|\d+[.,]\d{2}(?!\d))/.test(l);
  if (tienePrecioDecimalOMoneda) {
    const itemSinQty = armarItem(1, l);
    if (itemSinQty) return itemSinQty;
  }

  return null;
}

/** Arma un ítem calculando precio unitario y extrayendo descripción limpia. */
function armarItem(qty: number, descRaw: string): RawOcrItem | null {
  if (!Number.isInteger(qty) || qty < 1 || qty > 999) return null;
  const ns = numeros(descRaw);
  if (ns.length < 1) return null;
  let unit = ns[ns.length - 1];
  if (ns.length >= 2) {
    const a = ns[ns.length - 2];
    const b = ns[ns.length - 1];
    if (Math.abs(a * qty - b) <= 0.011) unit = a;
    else if (Math.abs(b * qty - a) <= 0.011) unit = b;
    else if (qty === 1) unit = a;
    else unit = b / qty;
  }
  if (!(unit > 0) || unit > 10_000) return null;
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
