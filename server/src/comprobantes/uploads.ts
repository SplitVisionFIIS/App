import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config';
import { AppError } from '../errors';

fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });

const ALMACENAMIENTO = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

export const subirImagen = multer({
  storage: ALMACENAMIENTO,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mimePermitidos = ['image/jpeg', 'image/png'];
    const extensionesPermitidas = ['.jpg', '.jpeg', '.png'];
    const extension = path.extname(file.originalname).toLowerCase();
    if (!mimePermitidos.includes(file.mimetype) || !extensionesPermitidas.includes(extension)) {
      cb(new AppError('IMAGEN_INVALIDA', 400, 'La imagen debe ser JPG o PNG de maximo 5 MB'));
      return;
    }
    cb(null, true);
  },
});
