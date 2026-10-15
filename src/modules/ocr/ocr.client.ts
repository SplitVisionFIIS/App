import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { OcrExternalError, validation } from '../../common/errors';

export interface OcrItemPayload {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OcrPayload {
  totalCents: number;
  taxCents: number;
  tipCents: number;
  discountCents: number;
  description: string | null;
  items: OcrItemPayload[];
}

export interface OcrClient {
  extract(imagePath: string): Promise<unknown>;
}

export const OCR_CLIENT = 'OCR_CLIENT';
export const OCR_BREAKER = 'OCR_BREAKER';

/** Cliente simulado: los modos permiten inyectar fallas sin internet (RNF-36). */
@Injectable()
export class FakeOcrClient implements OcrClient {
  async extract(_imagePath: string): Promise<unknown> {
    const mode = process.env.FAKE_OCR_MODE ?? 'success';
    switch (mode) {
      case 'fail':
        throw new OcrExternalError('el servicio OCR respondió 503');
      case 'timeout':
      case 'slow':
        await new Promise((r) => setTimeout(r, Number(process.env.FAKE_OCR_DELAY_MS ?? 60_000)));
        throw new OcrExternalError('timeout');
      case 'corrupt':
        return { total: -5, items: 'no-es-una-lista', tax: 'abc' };
      case 'success':
      default:
        return {
          total: 57.5,
          tax: 0,
          tip: 0,
          discount: 0,
          description: 'Restaurante El Sabor',
          items: [
            { description: 'Chaufa', quantity: 2, unit_price: 25 },
            { description: 'Gaseosa', quantity: 1, unit_price: 7.5 },
          ],
        };
    }
  }
}

@Injectable()
export class HttpOcrClient implements OcrClient {
  async extract(imagePath: string): Promise<unknown> {
    const url = process.env.OCR_URL;
    if (!url) throw new OcrExternalError('OCR_URL no configurada');
    const buffer = readFileSync(imagePath);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: buffer.toString('base64'),
        language: 'es',
      }),
      signal: AbortSignal.timeout(Number(process.env.OCR_TIMEOUT_MS ?? 10_000)),
    });
    if (!res.ok) throw new OcrExternalError(`el servicio OCR respondió ${res.status}`);
    return res.json();
  }
}

function asNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^\d+(\.\d{1,2})?$/.test(v.trim())) return Number(v);
  return null;
}

function toCentsExact(value: number): number | null {
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 1e-6) return null;
  return cents;
}

/**
 * Valida y normaliza la respuesta externa del OCR (RNF-10): ningún dato
 * sin validar llega al reparto.
 */
export function validateOcrPayload(raw: unknown): OcrPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw validation('la respuesta del OCR no es un objeto válido');
  }
  const obj = raw as Record<string, unknown>;
  const total = asNum(obj.total);
  if (total === null || total <= 0) {
    throw validation('la respuesta del OCR no contiene un monto total positivo');
  }
  const totalCents = toCentsExact(total);
  if (totalCents === null || totalCents <= 0) {
    throw validation('el monto total del OCR tiene más de 2 decimales o es inválido');
  }

  const optional = (key: string): number => {
    const v = obj[key];
    if (v === undefined || v === null || v === '') return 0;
    const n = asNum(v);
    if (n === null || n < 0) throw validation(`el campo ${key} del OCR es inválido`);
    const c = toCentsExact(n);
    if (c === null) throw validation(`el campo ${key} del OCR tiene más de 2 decimales`);
    return c;
  };

  const taxCents = optional('tax');
  const tipCents = optional('tip');
  const discountCents = optional('discount');

  let description: string | null = null;
  if (typeof obj.description === 'string' && obj.description.trim()) {
    description = obj.description.trim().slice(0, 200);
  }

  const items: OcrItemPayload[] = [];
  if (obj.items !== undefined && obj.items !== null) {
    if (!Array.isArray(obj.items)) throw validation('el campo items del OCR no es una lista');
    for (const it of obj.items.slice(0, 200)) {
      if (!it || typeof it !== 'object') throw validation('item del OCR inválido');
      const item = it as Record<string, unknown>;
      const desc = typeof item.description === 'string' ? item.description.trim() : '';
      if (!desc || desc.length > 200) throw validation('item del OCR sin descripción válida');
      const qtyRaw = asNum(item.quantity);
      if (qtyRaw === null || !Number.isInteger(qtyRaw) || qtyRaw < 1) {
        throw validation(`cantidad inválida en el ítem "${desc}"`);
      }
      const priceRaw = asNum(item.unit_price ?? item.unitPrice);
      if (priceRaw === null || priceRaw <= 0) throw validation(`precio inválido en el ítem "${desc}"`);
      const unitPriceCents = toCentsExact(priceRaw);
      if (unitPriceCents === null || unitPriceCents <= 0) {
        throw validation(`precio inválido en el ítem "${desc}"`);
      }
      items.push({ description: desc, quantity: qtyRaw, unitPriceCents });
    }
  }

  const extras = taxCents + tipCents - discountCents;
  const itemsSum = items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);
  const bestEffort = obj.bestEffort === true;
  if (!bestEffort && items.length > 0 && itemsSum + extras !== totalCents) {
    throw validation('los ítems y montos del OCR no cuadran con el total');
  }

  return { totalCents, taxCents, tipCents, discountCents, description, items };
}
