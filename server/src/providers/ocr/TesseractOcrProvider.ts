import { createWorker } from 'tesseract.js';
import { aCentavos } from '@splitvision/shared';
import type { OcrItemReconocido, OcrProvider, OcrResultado } from './OcrProvider';

const MONTO_FINAL_DE_LINEA = /(\d+[.,]\d{2})\s*$/;
const PALABRAS_NO_ITEM =
  /(total|subtotal|igv|impuesto|propina|descuento|vuelto|efectivo|tarjeta|yape|plin|visa|master|d[íi]a|hora|gracias|vendedor|cliente|ruc|dni)/i;

export function parsearTextoOcr(texto: string): OcrResultado {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);

  const items: OcrItemReconocido[] = [];
  let montoTotalCents: number | null = null;

  for (const linea of lineas) {
    const coincidencia = linea.match(MONTO_FINAL_DE_LINEA);
    if (!coincidencia) continue;

    let centavos: number;
    try {
      centavos = aCentavos(coincidencia[1].replace(',', '.'));
    } catch {
      continue;
    }
    if (centavos <= 0) continue;

    if (/\btotal\b/i.test(linea)) {
      montoTotalCents = centavos;
      continue;
    }
    if (PALABRAS_NO_ITEM.test(linea)) continue;

    const descripcion = linea
      .replace(MONTO_FINAL_DE_LINEA, '')
      .replace(/[-–:.]+\s*$/, '')
      .trim();
    if (descripcion.length >= 2) {
      items.push({ descripcion: descripcion.slice(0, 120), montoCents: centavos });
    }
  }

  if (montoTotalCents == null && items.length > 0) {
    montoTotalCents = items.reduce((suma, item) => suma + item.montoCents, 0);
  }
  if (montoTotalCents == null) {
    throw new Error('No se pudo reconocer ningun monto en el comprobante');
  }

  return {
    montoTotalCents,
    moneda: 'PEN',
    items,
    textoBruto: texto.slice(0, 20000),
  };
}

export class TesseractOcrProvider implements OcrProvider {
  readonly nombre = 'tesseract';

  constructor(private readonly idiomas: string) {}

  async extraer(imagen: Buffer): Promise<OcrResultado> {
    const worker = await createWorker(this.idiomas);
    try {
      const { data } = await worker.recognize(imagen);
      return parsearTextoOcr(data.text);
    } finally {
      await worker.terminate();
    }
  }
}
