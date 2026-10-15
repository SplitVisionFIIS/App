import { describe, expect, it } from 'vitest';
import { formatFecha, formatFechaHora, formatSoles } from './formato';

describe('formato', () => {
  it('formatea montos en soles con dos decimales', () => {
    expect(formatSoles(57.5)).toMatch(/^S\/[\s\u00a0]57\.50$/);
    expect(formatSoles(0)).toMatch(/0\.00$/);
    expect(formatSoles(-10.4)).toMatch(/10\.40$/);
  });

  it('formatea fechas en zona horaria de Lima', () => {
    // 15:30 UTC = 10:30 en Lima (UTC-5), mismo día
    expect(formatFecha('2026-10-06T15:30:00Z')).toMatch(/6\s*oct/i);
    expect(formatFecha('2026-10-06T15:30:00Z')).toContain('2026');
  });

  it('formatea fecha y hora', () => {
    const texto = formatFechaHora(new Date('2026-10-06T15:30:00Z'));
    expect(texto).toContain('2026');
    expect(texto).toMatch(/10:30|10\.30/);
  });
});
