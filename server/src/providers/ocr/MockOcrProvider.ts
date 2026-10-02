import type { OcrProvider, OcrResultado } from './OcrProvider';

export class MockOcrProvider implements OcrProvider {
  readonly nombre = 'mock';

  constructor(
    private readonly opciones: { delayMs: number; errorRate: number },
  ) {}

  async extraer(_imagen: Buffer): Promise<OcrResultado> {
    if (this.opciones.delayMs > 0) {
      await new Promise((resolver) => setTimeout(resolver, this.opciones.delayMs));
    }
    if (this.opciones.errorRate > 0 && Math.random() < this.opciones.errorRate) {
      throw new Error('Fallo simulado del servicio OCR');
    }
    return {
      montoTotalCents: 4500,
      moneda: 'PEN',
      items: [
        { descripcion: 'Almuerzo', montoCents: 3000 },
        { descripcion: 'Bebida', montoCents: 900 },
        { descripcion: 'Postre', montoCents: 600 },
      ],
      textoBruto: 'COMPROBANTE MOCK\nAlmuerzo 30.00\nBebida 9.00\nPostre 6.00\nTOTAL 45.00',
    };
  }
}
