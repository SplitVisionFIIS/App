import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../db';
import { logger } from '../logger';
import { ocrResultadoSchema, type OcrProvider } from '../providers/ocr';

export interface TrabajoOcr {
  comprobanteId: string;
}

function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const temporizador = setTimeout(() => {
      rechazar(new Error(`El servicio OCR no respondio en ${ms} ms`));
    }, ms);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolver(valor);
      },
      (error) => {
        clearTimeout(temporizador);
        rechazar(error);
      },
    );
  });
}

/**
 * RF3 - Extraccion en segundo plano con tolerancia a fallos.
 * - Solo procesa comprobantes en estado PROCESANDO (transicion atomica), por lo
 *   que un reintento nunca duplica el procesamiento de un comprobante.
 * - Si los reintentos se agotan, el estado queda en FALLIDO y el usuario es
 *   informado; el sistema principal nunca se bloquea.
 */
export async function procesarComprobante(
  datos: TrabajoOcr,
  proveedor: OcrProvider,
  reintentosUsados: number,
  maxReintentos: number,
): Promise<void> {
  try {
    const comprobante = await prisma.comprobante.findUnique({
      where: { id: datos.comprobanteId },
    });
    if (!comprobante || comprobante.estado !== 'PROCESANDO') {
      return;
    }

    const imagen = await readFile(path.join(config.UPLOAD_DIR, comprobante.imagenPath));
    const crudo = await conTimeout(proveedor.extraer(imagen), config.OCR_TIMEOUT_MS);
    const resultado = ocrResultadoSchema.parse(crudo);

    const actualizado = await prisma.comprobante.updateMany({
      where: { id: datos.comprobanteId, estado: 'PROCESANDO' },
      data: {
        estado: 'PROCESADO',
        montoTotalCents: resultado.montoTotalCents,
        datosExtraidos: resultado as unknown as Prisma.InputJsonValue,
      },
    });

    if (actualizado.count > 0) {
      logger.info(
        { comprobanteId: datos.comprobanteId, proveedor: proveedor.nombre },
        'Comprobante procesado por OCR',
      );
    }
  } catch (error) {
    const sinReintentos = reintentosUsados >= maxReintentos;
    if (!sinReintentos) {
      throw error;
    }

    const mensaje = error instanceof Error ? error.message : String(error);
    await prisma.comprobante.updateMany({
      where: { id: datos.comprobanteId, estado: 'PROCESANDO' },
      data: {
        estado: 'FALLIDO',
        datosExtraidos: { error: mensaje.slice(0, 500) },
      },
    });
    logger.warn(
      { comprobanteId: datos.comprobanteId, error: mensaje },
      'OCR agoto sus reintentos; comprobante marcado como FALLIDO',
    );
  }
}
