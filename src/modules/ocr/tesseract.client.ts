import { existsSync } from 'fs';
import { resolve } from 'path';
import { Injectable } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import { OcrExternalError } from '../../common/errors';
import { logger } from '../../common/correlation';
import { OcrClient } from './ocr.client';
import { parseRecetaTexto } from './recibo.parser';

/**
 * OCR local de respaldo (RNF-36 / fallback del circuit breaker). Corre Tesseract
 * sobre WASM (tesseract.js), sin servicios externos. Devuelve el mismo payload
 * crudo que el cliente HTTP para reutilizar `validateOcrPayload`.
 */
@Injectable()
export class TesseractOcrClient implements OcrClient {
  async extract(imagePath: string): Promise<unknown> {
    const worker = await getWorker();
    try {
      const { data } = await worker.recognize(imagePath);
      const texto = data.text ?? '';
      return parseRecetaTexto(texto);
    } catch (e) {
      throw new OcrExternalError(`OCR local (Tesseract) falló: ${mensaje(e)}`);
    }
  }
}

function mensaje(e: unknown): string {
  return String(e instanceof Error ? e.message : e).slice(0, 200);
}

let workerPromise: Promise<Tesseract.Worker> | null = null;

function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = crearWorker().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

async function crearWorker(): Promise<Tesseract.Worker> {
  const langs = process.env.OCR_LANG?.trim() || 'spa';
  const langPath = resolverLangPath();
  const cachePath = resolve(process.cwd(), process.env.OCR_CACHE_DIR?.trim() || 'data/tessdata-cache');
  logger.info('iniciando OCR local (Tesseract)', { langs, langPath: langPath ?? 'CDN' });
  const worker = await Tesseract.createWorker(langs, undefined, {
    langPath,
    cachePath,
    logger: () => {},
    errorHandler: (e) => logger.warn('error del worker de Tesseract', { error: mensaje(e) }),
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
    });
  } catch (e) {
    logger.warn('no se pudieron fijar los parámetros de Tesseract', { error: mensaje(e) });
  }
  return worker;
}

/** Ruta local de los traineddata; si no existe, devuelve undefined (usa CDN). */
function resolverLangPath(): string | undefined {
  const dir = resolve(process.cwd(), process.env.OCR_TESSDATA?.trim() || 'data/tessdata');
  if (existsSync(dir)) return dir;
  logger.warn('no se encontró el directorio de traineddata; se usará el CDN de tesseract.js', {
    dir,
  });
  return undefined;
}

/** Cierra el worker (útil en pruebas / apagado ordenado). */
export async function terminarTesseractWorker(): Promise<void> {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    /* ignore */
  } finally {
    workerPromise = null;
  }
}
