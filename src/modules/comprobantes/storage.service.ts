import { Injectable } from '@nestjs/common';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { validation } from '../../common/errors';
import { sha256 } from '../../common/util';

const MAX_BYTES = () => Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024;

export type ImageKind = 'JPEG' | 'PNG' | 'WEBP';

/** Detecta el tipo real por contenido (magic bytes), nunca por extensión (RNF-16). */
export function detectImageKind(buffer: Buffer): ImageKind | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'JPEG';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'PNG';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'WEBP';
  }
  return null;
}

@Injectable()
export class StorageService {
  private readonly dir: string;

  constructor() {
    this.dir = resolve(process.env.IMAGE_DIR ?? './data/images');
    mkdirSync(this.dir, { recursive: true });
  }

  /** Valida el archivo y lo guarda con nombre generado por el sistema. */
  saveImage(buffer: Buffer, prefix: string): { path: string; hash: string } {
    if (!buffer || buffer.length === 0) {
      throw validation('imagen: debes adjuntar un archivo');
    }
    if (buffer.length > MAX_BYTES()) {
      throw validation(`imagen: supera el tamaño máximo de ${MAX_BYTES() / (1024 * 1024)} MB`);
    }
    const kind = detectImageKind(buffer);
    if (!kind) {
      throw validation('imagen: el archivo no es una imagen JPG, PNG o WEBP válida');
    }
    const hash = sha256(buffer);
    const ext = kind === 'JPEG' ? 'jpg' : kind === 'PNG' ? 'png' : 'webp';
    const name = `${prefix}-${randomUUID()}.${ext}`;
    const path = join(this.dir, name);
    writeFileSync(path, buffer);
    return { path, hash };
  }

  read(path: string): Buffer {
    const abs = resolve(path);
    if (!abs.startsWith(this.dir) || !existsSync(abs)) {
      throw validation('no se pudo recuperar la imagen');
    }
    return readFileSync(abs);
  }

  delete(path: string): void {
    try {
      const abs = resolve(path);
      if (abs.startsWith(this.dir) && existsSync(abs)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('fs').unlinkSync(abs);
      }
    } catch {
      /* limpieza best-effort de huérfanos */
    }
  }
}
