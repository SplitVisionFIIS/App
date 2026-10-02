import 'dotenv/config';
import { z } from 'zod';

const esquemaEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRA: z.string().default('12h'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('uploads'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  OCR_PROVIDER: z.enum(['mock', 'tesseract']).default('mock'),
  OCR_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  OCR_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  OCR_MOCK_DELAY_MS: z.coerce.number().int().min(0).default(500),
  OCR_MOCK_ERROR_RATE: z.coerce.number().min(0).max(1).default(0),
  TESSERACT_LANG: z.string().default('spa+eng'),
});

const resultado = esquemaEnv.safeParse(process.env);

if (!resultado.success) {
  console.error('Configuracion invalida en las variables de entorno:');
  console.error(resultado.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = resultado.data;
