import { config } from '../../config';
import { MockOcrProvider } from './MockOcrProvider';
import type { OcrProvider } from './OcrProvider';
import { TesseractOcrProvider } from './TesseractOcrProvider';

export type { OcrProvider, OcrResultado, OcrItemReconocido } from './OcrProvider';
export { ocrResultadoSchema } from './OcrProvider';

export function crearProveedorOcr(): OcrProvider {
  if (config.OCR_PROVIDER === 'tesseract') {
    return new TesseractOcrProvider(config.TESSERACT_LANG);
  }
  return new MockOcrProvider({
    delayMs: config.OCR_MOCK_DELAY_MS,
    errorRate: config.OCR_MOCK_ERROR_RATE,
  });
}
