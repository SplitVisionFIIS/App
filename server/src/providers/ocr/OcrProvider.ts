import { z } from 'zod';

export interface OcrItemReconocido {
  descripcion: string;
  montoCents: number;
}

export interface OcrResultado {
  montoTotalCents: number;
  moneda?: string;
  items: OcrItemReconocido[];
  textoBruto?: string;
}

export interface OcrProvider {
  readonly nombre: string;
  extraer(imagen: Buffer): Promise<OcrResultado>;
}

/**
 * El resultado del OCR es un dato no confiable (doc 1.2.B): se valida su
 * estructura y consistencia antes de presentarlo al usuario.
 */
export const ocrResultadoSchema = z.object({
  montoTotalCents: z.number().int().positive(),
  moneda: z.string().max(8).optional(),
  items: z
    .array(
      z.object({
        descripcion: z.string().min(1).max(120),
        montoCents: z.number().int().min(0),
      }),
    )
    .max(100),
  textoBruto: z.string().max(20000).optional(),
});
