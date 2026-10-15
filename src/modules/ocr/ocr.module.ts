import { Module } from '@nestjs/common';
import { FakeOcrClient, HttpOcrClient, OCR_BREAKER, OCR_CLIENT, OcrClient } from './ocr.client';
import { TesseractOcrClient } from './tesseract.client';
import { crearOcrBreaker } from './breaker';
import { JobsProcessor } from './ocr.worker';

/** OCR local (Tesseract) directo, simulador, o proveedor externo (HTTP). */
function buildClient(tesseract: TesseractOcrClient): OcrClient {
  const provider = process.env.OCR_PROVIDER ?? 'fake';
  if (provider === 'http') return new HttpOcrClient();
  if (provider === 'local') return tesseract;
  return new FakeOcrClient();
}

function fallbackActivo(): boolean {
  return process.env.OCR_PROVIDER === 'http' && (process.env.OCR_FALLBACK ?? 'local') !== 'none';
}

@Module({
  providers: [
    TesseractOcrClient,
    {
      provide: OCR_CLIENT,
      useFactory: buildClient,
      inject: [TesseractOcrClient],
    },
    {
      provide: OCR_BREAKER,
      useFactory: (client: OcrClient, tesseract: TesseractOcrClient) =>
        crearOcrBreaker(client, tesseract, {
          timeoutMs: Number(process.env.OCR_TIMEOUT_MS ?? 10_000),
          threshold: Number(process.env.OCR_BREAKER_THRESHOLD ?? 50),
          resetMs: Number(process.env.OCR_BREAKER_RESET_MS ?? 30_000),
          fallbackLocal: fallbackActivo(),
        }),
      inject: [OCR_CLIENT, TesseractOcrClient],
    },
    JobsProcessor,
  ],
  exports: [JobsProcessor],
})
export class OcrModule {}
