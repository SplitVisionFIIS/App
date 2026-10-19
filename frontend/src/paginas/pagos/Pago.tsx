import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { historialDeuda } from '../../api/consultas';
import { crearPago } from '../../api/pagos';
import type { PaymentMethod } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';
import { formatCentavos } from '../../i18n/formato';
import { useSesion } from '../../auth';

const METODOS: { valor: PaymentMethod; etiqueta: string; color: string; icono: string }[] = [
  { valor: 'YAPE', etiqueta: 'Yape', color: 'border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300', icono: '🟣' },
  { valor: 'PLIN', etiqueta: 'Plin', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300', icono: '🔵' },
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia', color: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300', icono: '🏦' },
  { valor: 'EFECTIVO', etiqueta: 'Efectivo', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icono: '💵' },
  { valor: 'OTRO', etiqueta: 'Otro medio', color: 'border-borde bg-superficie-2 text-texto-suave', icono: '🧾' },
];

export function Pago() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const consulta = useQueryClient();
  const { usuario } = useSesion();

  const { data: deuda } = useQuery({
    queryKey: ['historial-deuda', id],
    queryFn: () => historialDeuda(id),
    enabled: Boolean(id),
  });

  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<PaymentMethod>('EFECTIVO');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de retroalimentación de copiado
  const [copiadoCelular, setCopiadoCelular] = useState(false);
  const [copiadoMonto, setCopiadoMonto] = useState(false);
  const [copiadoCuenta, setCopiadoCuenta] = useState(false);
  const [copiadoCci, setCopiadoCci] = useState(false);
  const [verQrAmpliado, setVerQrAmpliado] = useState(false);

  // Auto-completar el monto sugerido cuando se carga la deuda
  useEffect(() => {
    if (deuda && deuda.availableCents > 0 && monto === '') {
      setMonto((deuda.availableCents / 100).toFixed(2));
    }
  }, [deuda, monto]);

  // Manejo de preview de comprobante
  useEffect(() => {
    if (!archivo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  // Soporte para pegar capturas de pantalla desde el portapapeles (Ctrl + V)
  useEffect(() => {
    const alPegar = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setArchivo(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', alPegar);
    return () => window.removeEventListener('paste', alPegar);
  }, []);

  const copiarTexto = async (texto: string, tipo: 'celular' | 'monto' | 'cuenta' | 'cci') => {
    try {
      await navigator.clipboard.writeText(texto);
      if (tipo === 'celular') {
        setCopiadoCelular(true);
        setTimeout(() => setCopiadoCelular(false), 2000);
      } else if (tipo === 'monto') {
        setCopiadoMonto(true);
        setTimeout(() => setCopiadoMonto(false), 2000);
      } else if (tipo === 'cuenta') {
        setCopiadoCuenta(true);
        setTimeout(() => setCopiadoCuenta(false), 2000);
      } else if (tipo === 'cci') {
        setCopiadoCci(true);
        setTimeout(() => setCopiadoCci(false), 2000);
      }
    } catch {
      // Ignorar si el navegador bloquea permisos
    }
  };

  const esAcreedor = Boolean(
    deuda?.creditor && usuario && usuario.toLowerCase() === deuda.creditor.toLowerCase(),
  );

  if (esAcreedor && deuda) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <Link to={`/deudas/${id}`} className="text-xs font-semibold text-primario hover:underline">
            ← Volver al detalle de la deuda
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-texto">
            Esta deuda te corresponde cobrarla
          </h1>
        </div>
        <Tarjeta className="border-exito/30 bg-exito-suave/20 p-5 space-y-3 shadow-xs">
          <p className="text-sm font-semibold text-texto">
            Eres el acreedor en esta cuenta. Es <strong>{deuda.debtor}</strong> quien debe transferirte el saldo pendiente de{' '}
            <strong className="text-exito font-mono">{formatCentavos(deuda.pendingCents)}</strong>.
          </p>
          <p className="text-xs text-texto-suave">
            Cuando {deuda.debtor} registre su pago y suba su comprobante bancario, aparecerá en tu Bandeja de pagos para que puedas confirmarlo.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              to={`/deudas/${id}`}
              className="inline-flex items-center justify-center rounded-xl bg-primario px-4 py-2 text-xs font-bold text-sobre-primario shadow-sm hover:bg-primario-fuerte"
            >
              Ver desglose de la deuda
            </Link>
            <Link
              to="/bandeja-pagos"
              className="inline-flex items-center justify-center rounded-xl border border-borde bg-superficie px-4 py-2 text-xs font-semibold text-texto hover:bg-superficie-2"
            >
              Ir a Bandeja de pagos
            </Link>
          </div>
        </Tarjeta>
      </div>
    );
  }

  const enviar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      await crearPago(
        id,
        {
          amount: monto,
          method: metodo,
        },
        idempotencyKey,
        archivo || undefined,
      );
      await consulta.invalidateQueries({ queryKey: ['deudas'] });
      await consulta.invalidateQueries({ queryKey: ['historial-deuda', id] });
      await consulta.invalidateQueries({ queryKey: ['pending'] });
      navigate('/bandeja');
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const necesitaEvidencia = metodo !== 'EFECTIVO';
  const montoValido = Number.parseFloat(monto) > 0;
  const saldoMaximoCents = deuda?.availableCents ?? 0;
  const infoCobro = deuda?.creditorPaymentInfo;
  const billeteraAcreedor = (infoCobro?.preferredWallet || 'YAPE').toUpperCase();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link to="/deudas" className="text-xs font-semibold text-primario hover:underline">
          ← Volver a Mis deudas
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-texto">
          Registrar pago de cuenta
        </h1>
        <p className="text-sm text-texto-suave">
          Transfiere a tu amigo y sube la captura de pantalla para liquidar la deuda.
        </p>
      </div>

      {/* Tarjeta de Resumen y Destinatario */}
      {deuda && (
        <Tarjeta className="border-primario/25 bg-gradient-to-br from-primario-suave/25 to-superficie p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-md bg-primario/10 px-2 py-0.5 text-[11px] font-bold text-primario uppercase tracking-wide">
                {deuda.eventName}
              </span>
              <p className="mt-1 text-sm font-semibold text-texto">
                Pagar a: <span className="font-bold text-primario">{deuda.creditor}</span>
              </p>
              <p className="text-xs text-texto-suave">
                Saldo neto a liquidar: <strong className="text-texto font-mono">{formatCentavos(deuda.availableCents)}</strong>
              </p>
            </div>

            {saldoMaximoCents > 0 && (
              <button
                type="button"
                onClick={() => setMonto((saldoMaximoCents / 100).toFixed(2))}
                className="self-start sm:self-auto rounded-xl border border-primario/30 bg-superficie px-3 py-1.5 text-xs font-bold text-primario shadow-2xs hover:bg-primario hover:text-sobre-primario transition-all active:scale-95"
              >
                Pagar total ({formatCentavos(saldoMaximoCents)})
              </button>
            )}
          </div>
        </Tarjeta>
      )}

      {/* DATOS DE COBRO DEL RECEPTOR */}
      {deuda && (
        <Tarjeta className="border-borde bg-superficie p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-borde-suave pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-texto flex items-center gap-1.5">
              <span>💳</span>
              <span>Datos de cobro de {deuda.creditor}</span>
            </h2>
            <span className="text-[11px] text-texto-suave">Información para transferir</span>
          </div>

          {infoCobro && (infoCobro.phone || infoCobro.hasQr || infoCobro.accountNumber) ? (
            <div className="space-y-3">
              {/* Celular y Billetera del Receptor */}
              {infoCobro.phone && (
                <div
                  className={`rounded-xl border p-4 space-y-3 ${
                    billeteraAcreedor === 'PLIN'
                      ? 'border-cyan-500/30 bg-cyan-500/10'
                      : billeteraAcreedor === 'BIM'
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-purple-500/30 bg-purple-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-texto flex items-center gap-1.5">
                      <span>{billeteraAcreedor === 'PLIN' ? '🔵' : billeteraAcreedor === 'BIM' ? '🟠' : '🟣'}</span>
                      <span>
                        {deuda.creditor} prefiere recibir por:{' '}
                        <strong className="underline underline-offset-2">
                          {billeteraAcreedor === 'PLIN' ? 'Plin' : billeteraAcreedor === 'BIM' ? 'Bim / Sip' : 'Yape'}
                        </strong>
                      </span>
                    </span>
                    <span className="rounded-full bg-superficie px-2 py-0.5 text-[10px] font-bold text-texto-suave shadow-2xs">
                      Receptor
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-texto-suave">Número de celular:</p>
                      <p className="text-xl font-bold font-mono tracking-wider text-texto">
                        +51 {infoCobro.phone}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void copiarTexto(infoCobro.phone ?? '', 'celular')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-borde bg-superficie px-4 py-2 text-xs font-bold text-texto shadow-2xs hover:bg-superficie-2 active:scale-95 transition-all"
                      title="Copiar número de celular"
                    >
                      {copiadoCelular ? '✓ ¡Número copiado!' : '📋 Copiar celular'}
                    </button>
                  </div>

                  {/* Recordatorio de interoperabilidad */}
                  <div className="rounded-xl border border-borde/40 bg-superficie/60 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-texto">
                      <span>🔄</span>
                      <span>Recordatorio de Interoperabilidad</span>
                    </div>
                    <p className="text-texto-suave leading-relaxed">
                      {billeteraAcreedor === 'PLIN' ? (
                        <>
                          {deuda.creditor} recibe en <strong>Plin</strong>, pero puedes pagarle desde <strong>cualquier billetera</strong> (Yape, Plin o banca móvil). Si usas <strong>Yape</strong>, al transferir elige la opción <strong>"A otros bancos / Plin"</strong>.
                        </>
                      ) : billeteraAcreedor === 'YAPE' ? (
                        <>
                          {deuda.creditor} recibe en <strong>Yape</strong>, pero puedes pagarle desde <strong>cualquier billetera</strong> o banco. Si usas <strong>Plin</strong>, al transferir elige la opción <strong>"A Yape"</strong>.
                        </>
                      ) : (
                        <>
                          Puedes transferirle a su número desde <strong>Yape, Plin o tu banca móvil</strong> gracias a la interoperabilidad bancaria del Perú.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Código QR de Yape / Plin */}
              {infoCobro.hasQr && infoCobro.qrUrl && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-borde bg-superficie-2/50 p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={infoCobro.qrUrl}
                      alt={`QR de pago de ${deuda.creditor}`}
                      className="h-16 w-16 rounded-xl border border-borde object-cover bg-white p-1 cursor-pointer shadow-2xs hover:scale-105 transition-all"
                      onClick={() => setVerQrAmpliado(true)}
                    />
                    <div>
                      <p className="text-xs font-bold text-texto">Código QR de {deuda.creditor}</p>
                      <p className="text-[11px] text-texto-suave">Toca para ampliar y escanear desde tu app</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerQrAmpliado(true)}
                    className="rounded-xl border border-borde bg-superficie px-3 py-1.5 text-xs font-bold text-texto shadow-2xs hover:bg-superficie-2 transition-all active:scale-95"
                  >
                    Ver QR 🔍
                  </button>
                </div>
              )}

              {/* Cuenta Bancaria y CCI (si están registrados) */}
              {(infoCobro.accountNumber || infoCobro.cci) && (
                <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-3.5 space-y-2.5">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <span>🏦</span>
                    <span>Transferencia Bancaria · {infoCobro.bankName || 'Banco'}</span>
                  </p>

                  {infoCobro.accountNumber && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-texto-suave">
                        N° de cuenta: <strong className="font-mono font-bold text-texto">{infoCobro.accountNumber}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => void copiarTexto(infoCobro.accountNumber ?? '', 'cuenta')}
                        className="rounded-lg border border-borde bg-superficie px-2 py-0.5 font-bold text-[11px] text-texto hover:bg-superficie-2 transition-all"
                      >
                        {copiadoCuenta ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                    </div>
                  )}

                  {infoCobro.cci && (
                    <div className="flex items-center justify-between text-xs border-t border-blue-500/20 pt-2">
                      <span className="text-texto-suave">
                        CCI: <strong className="font-mono font-bold text-texto">{infoCobro.cci}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => void copiarTexto(infoCobro.cci ?? '', 'cci')}
                        className="rounded-lg border border-borde bg-superficie px-2 py-0.5 font-bold text-[11px] text-texto hover:bg-superficie-2 transition-all"
                      >
                        {copiadoCci ? '✓ Copiado' : '📋 Copiar CCI'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-borde-suave bg-superficie-2/40 p-3.5 text-xs text-texto-suave space-y-1">
              <p className="font-semibold text-texto">
                💡 {deuda.creditor} aún no ha registrado sus billeteras en Configuración.
              </p>
              <p className="text-[11px]">
                Puedes coordinar con él por chat para que te dé su número, o pagarle en persona en efectivo.
              </p>
            </div>
          )}
        </Tarjeta>
      )}

      {/* Modal / Vista previa ampliada de QR */}
      {verQrAmpliado && infoCobro?.qrUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setVerQrAmpliado(false)}
        >
          <div
            className="relative max-w-xs w-full rounded-2xl bg-superficie p-5 shadow-2xl border border-borde space-y-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-texto">QR de {deuda?.creditor}</p>
              <button
                type="button"
                onClick={() => setVerQrAmpliado(false)}
                className="rounded-lg p-1 text-texto-suave hover:bg-superficie-2 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-white rounded-xl border border-borde inline-block mx-auto">
              <img
                src={infoCobro.qrUrl}
                alt="QR ampliado"
                className="h-64 w-64 object-contain rounded-lg"
              />
            </div>
            <p className="text-xs text-texto-suave">
              Escanea desde tu app bancaria o guarda captura para usar en tu billetera.
            </p>
            <Boton variante="secundario" className="w-full" onClick={() => setVerQrAmpliado(false)}>
              Cerrar
            </Boton>
          </div>
        </div>
      )}

      {/* Formulario Principal de Pago */}
      <Tarjeta className="space-y-4 shadow-xs">
        <div className="space-y-4">
          {/* Monto con botón destacado de copiado */}
          <div>
            <Campo
              etiqueta="Monto (S/)"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              required
              accionDerecha={
                montoValido ? (
                  <button
                    type="button"
                    onClick={() => void copiarTexto(monto, 'monto')}
                    className="inline-flex items-center gap-1 rounded-lg border border-primario/30 bg-primario-suave/40 px-2 py-1 text-xs font-bold text-primario hover:bg-primario hover:text-sobre-primario transition-all active:scale-95 shadow-2xs mr-1"
                  >
                    {copiadoMonto ? `✓ S/ ${monto} copiado` : `📋 Copiar S/ ${monto}`}
                  </button>
                ) : undefined
              }
            />

            {saldoMaximoCents > 0 && (
              <div className="mt-1 flex items-center gap-2 text-xs text-texto-suave">
                <span>Atajos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setMonto((saldoMaximoCents / 100).toFixed(2))}
                  className="font-semibold text-primario hover:underline"
                >
                  Total ({formatCentavos(saldoMaximoCents)})
                </button>
                {saldoMaximoCents >= 1000 && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setMonto(((saldoMaximoCents / 2) / 100).toFixed(2))}
                      className="font-semibold text-primario hover:underline"
                    >
                      50% ({formatCentavos(Math.round(saldoMaximoCents / 2))})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Billetera o Medio Utilizado (Solo chips visuales limpios) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-texto mb-1">
              ¿Por qué billetera o medio pagaste?
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
              {METODOS.slice(0, 4).map((m) => {
                const activo = metodo === m.valor;
                return (
                  <button
                    key={m.valor}
                    type="button"
                    onClick={() => setMetodo(m.valor)}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all active:scale-95 ${
                      activo
                        ? `${m.color} ring-2 ring-primario shadow-xs font-bold`
                        : 'border-borde bg-superficie-2/50 text-texto-suave hover:bg-superficie-2 hover:text-texto'
                    }`}
                  >
                    <span>{m.icono}</span>
                    <span>{m.etiqueta}</span>
                  </button>
                );
              })}
            </div>

            {/* Select accesible oculto visualmente (sr-only) para lectores de pantalla y compatibilidad */}
            <select
              aria-label="Método"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
              className="sr-only"
            >
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {/* Evidencia / Comprobante de Pago */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="evidencia"
                className="block text-xs font-bold uppercase tracking-wider text-texto"
              >
                Comprobante de abono
              </label>
              <span className="text-[11px] text-texto-suave">💡 Puedes presionar Ctrl + V para pegar la captura</span>
            </div>
            <div className="mt-1.5 flex flex-col gap-2">
              <input
                id="evidencia"
                aria-label="Comprobante / evidencia"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                className="block w-full text-xs text-texto file:mr-3 file:rounded-xl file:border-0 file:bg-primario file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-sobre-primario hover:file:bg-primario-fuerte cursor-pointer"
              />

              {previewUrl && (
                <div className="mt-2 relative inline-block">
                  <p className="text-[11px] font-semibold text-texto-suave mb-1">Vista previa de la captura:</p>
                  <div className="relative inline-block overflow-hidden rounded-xl border border-borde shadow-xs">
                    <img
                      src={previewUrl}
                      alt="Vista previa del comprobante"
                      className="max-h-52 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setArchivo(null)}
                      className="absolute top-2 right-2 rounded-full bg-superficie/90 p-1 text-xs text-peligro shadow-sm hover:bg-superficie"
                      title="Quitar archivo"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {necesitaEvidencia && !archivo && (
                <p className="text-xs text-aviso font-medium">
                  La evidencia es obligatoria para pagos con {metodo.toLowerCase()}.
                </p>
              )}
            </div>
          </div>
        </div>

        {error && <Alerta tono="error">{error}</Alerta>}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-borde-suave">
          <Link
            to={`/deudas/${id}`}
            className="rounded-xl border border-borde px-4 py-2 text-xs font-semibold text-texto-suave hover:bg-superficie-2 hover:text-texto transition-all"
          >
            Cancelar
          </Link>
          <Boton
            type="button"
            onClick={() => void enviar()}
            disabled={!montoValido || (necesitaEvidencia && !archivo) || enviando}
          >
            {enviando ? 'Registrando pago…' : 'Enviar pago'}
          </Boton>
        </div>
      </Tarjeta>
    </div>
  );
}
