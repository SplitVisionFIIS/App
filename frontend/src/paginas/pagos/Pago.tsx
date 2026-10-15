import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { crearPago } from '../../api/pagos';
import type { PaymentMethod } from '../../api/tipos';
import { Alerta } from '../../componentes/Alerta';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Tarjeta } from '../../componentes/Tarjeta';
import { mensajeDeError } from '../../i18n/es-PE';

const METODOS: PaymentMethod[] = ['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA', 'OTRO'];

export function Pago() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const consulta = useQueryClient();
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<PaymentMethod>('EFECTIVO');
  const [referencia, setReferencia] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          reference: referencia || undefined,
        },
        idempotencyKey,
        archivo || undefined,
      );
      await consulta.invalidateQueries({ queryKey: ['deudas'] });
      await consulta.invalidateQueries({ queryKey: ['historial-deuda', id] });
      navigate('/bandeja');
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const necesitaEvidencia = metodo !== 'EFECTIVO';
  const montoValido = Number.parseFloat(monto) > 0;

  return (
    <>
      <h1 className="text-lg font-semibold text-texto ">Registrar pago</h1>
      <Tarjeta className="mt-4">
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Monto (S/)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            inputMode="decimal"
            required
          />
          <div>
            <label className="block text-sm font-medium text-texto ">Método</label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
              className="mt-1 w-full rounded-lg border border-borde px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primario/50   "
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Campo
              etiqueta="Referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Máx. 50 caracteres alfanuméricos"
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="evidencia"
              className="block text-sm font-medium text-texto "
            >
              Comprobante / evidencia
            </label>
            <input
              id="evidencia"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-texto file:mr-4 file:rounded-lg file:border-0 file:bg-primario file:px-4 file:py-2 file:text-sm file:font-medium file:text-sobre-primario hover:file:bg-primario-fuerte "
            />
            {necesitaEvidencia && !archivo ? (
              <p className="mt-1 text-xs text-peligro ">
                La evidencia es obligatoria para {metodo}.
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Boton
            onClick={enviar}
            disabled={enviando || !montoValido || (necesitaEvidencia && !archivo)}
          >
            {enviando ? 'Enviando…' : 'Enviar pago'}
          </Boton>
        </div>
        {error ? (
          <div className="mt-3">
            <Alerta>{error}</Alerta>
          </div>
        ) : null}
      </Tarjeta>
    </>
  );
}
