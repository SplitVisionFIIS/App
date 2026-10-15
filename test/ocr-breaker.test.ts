import { crearOcrBreaker } from '../src/modules/ocr/breaker';
import type { OcrClient } from '../src/modules/ocr/ocr.client';

const externoOk = (total: number): OcrClient => ({
  extract: jest.fn().mockResolvedValue({ total }),
});

describe('crearOcrBreaker (fallback OCR externo -> local)', () => {
  test('usa el OCR local cuando el externo falla', async () => {
    const externo: OcrClient = { extract: jest.fn().mockRejectedValue(new Error('API caída')) };
    const local: OcrClient = { extract: jest.fn().mockResolvedValue({ total: 10 }) };
    const breaker = crearOcrBreaker(externo, local, {
      timeoutMs: 200,
      threshold: 50,
      resetMs: 1000,
      fallbackLocal: true,
    });

    await expect(breaker.fire('img.png')).resolves.toEqual({ total: 10 });
    expect(local.extract).toHaveBeenCalledWith('img.png');
  });

  test('usa el externo cuando funciona (sin fallback)', async () => {
    const externo = externoOk(5);
    const local: OcrClient = { extract: jest.fn().mockResolvedValue({ total: 10 }) };
    const breaker = crearOcrBreaker(externo, local, {
      timeoutMs: 200,
      threshold: 50,
      resetMs: 1000,
      fallbackLocal: true,
    });

    await expect(breaker.fire('img.png')).resolves.toEqual({ total: 5 });
    expect(local.extract).not.toHaveBeenCalled();
  });

  test('rechaza si no hay fallback local', async () => {
    const externo: OcrClient = { extract: jest.fn().mockRejectedValue(new Error('down')) };
    const local: OcrClient = { extract: jest.fn() };
    const breaker = crearOcrBreaker(externo, local, {
      timeoutMs: 200,
      threshold: 50,
      resetMs: 1000,
      fallbackLocal: false,
    });

    await expect(breaker.fire('img.png')).rejects.toBeTruthy();
    expect(local.extract).not.toHaveBeenCalled();
  });

  test('abre el circuito y luego se recupera (half-open)', async () => {
    let fallando = true;
    const externo: OcrClient = {
      extract: jest.fn().mockImplementation(() =>
        fallando ? Promise.reject(new Error('down')) : Promise.resolve({ total: 7 }),
      ),
    };
    const local: OcrClient = { extract: jest.fn().mockResolvedValue({ total: 10 }) };
    const breaker = crearOcrBreaker(externo, local, {
      timeoutMs: 200,
      threshold: 50,
      resetMs: 60,
      fallbackLocal: true,
    });

    await breaker.fire('img.png');
    await breaker.fire('img.png');

    const llamadas = (externo.extract as jest.Mock).mock.calls.length;
    await expect(breaker.fire('img.png')).resolves.toEqual({ total: 10 });
    expect((externo.extract as jest.Mock).mock.calls.length).toBe(llamadas);

    fallando = false;
    await new Promise((r) => setTimeout(r, 150));
    await expect(breaker.fire('img.png')).resolves.toEqual({ total: 7 });
  });
});
