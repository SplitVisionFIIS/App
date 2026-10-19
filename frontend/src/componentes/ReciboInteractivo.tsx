import { useMemo, useState } from 'react';

type Item = {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
};

type Comprobante = {
  id: string;
  lugar: string;
  categoria: string;
  pagador: string;
  ruc: string;
  items: Item[];
};

const COMPROBANTES_INICIALES: Comprobante[] = [
  {
    id: 'c1',
    lugar: 'RESTAURANTE EL INGENIERO',
    categoria: 'Almuerzo grupal',
    pagador: 'Mateo',
    ruc: '20549832101',
    items: [
      { id: '1a', nombre: '3× Menú criollo especial', precio: 75.0, activo: true },
      { id: '1b', nombre: '1× Ceviche mixto grande', precio: 45.0, activo: true },
    ],
  },
  {
    id: 'c2',
    lugar: 'TAXIS & MOVILIDAD LIMA',
    categoria: 'Transporte ida y vuelta',
    pagador: 'Lucía',
    ruc: '20601928341',
    items: [
      { id: '2a', nombre: 'Traslado UNI ➔ Barranco', precio: 25.0, activo: true },
      { id: '2b', nombre: 'Retorno nocturno UNI', precio: 20.0, activo: true },
    ],
  },
  {
    id: 'c3',
    lugar: 'CAFETERÍA & POSTRES FIIS',
    categoria: 'Café de integración',
    pagador: 'Andrés',
    ruc: '20481902412',
    items: [
      { id: '3a', nombre: '3× Café americano doble', precio: 24.0, activo: true },
      { id: '3b', nombre: '1× Torta artesanal lúcuma', precio: 36.0, activo: true },
    ],
  },
];

const PARTICIPANTES = ['Mateo', 'Lucía', 'Andrés'];

export function ReciboInteractivo() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>(COMPROBANTES_INICIALES);
  const [comprobanteActivoId, setComprobanteActivoId] = useState('c1');

  const comprobanteActual = useMemo(
    () => comprobantes.find((c) => c.id === comprobanteActivoId) ?? comprobantes[0],
    [comprobantes, comprobanteActivoId],
  );

  const alternarItem = (comprobanteId: string, itemId: string) => {
    setComprobantes((prev) =>
      prev.map((c) => {
        if (c.id !== comprobanteId) return c;
        return {
          ...c,
          items: c.items.map((it) => (it.id === itemId ? { ...it, activo: !it.activo } : it)),
        };
      }),
    );
  };

  // Cálculo financiero multi-boleta y matriz de compensación neta
  const finanzas = useMemo(() => {
    const pagosPorPersona: Record<string, number> = { Mateo: 0, Lucía: 0, Andrés: 0 };
    let gastoTotal = 0;

    for (const c of comprobantes) {
      const totalBoleta = c.items.filter((it) => it.activo).reduce((sum, it) => sum + it.precio, 0);
      pagosPorPersona[c.pagador] = (pagosPorPersona[c.pagador] ?? 0) + totalBoleta;
      gastoTotal += totalBoleta;
    }

    const cuotaEquitativa = gastoTotal / PARTICIPANTES.length;

    const saldosNetos = PARTICIPANTES.map((persona) => {
      const pago = pagosPorPersona[persona] ?? 0;
      const neto = pago - cuotaEquitativa;
      return { persona, pago, neto };
    });

    // Algoritmo voraz de liquidación óptima en el mínimo número de transferencias
    const deudores = saldosNetos.filter((s) => s.neto < -0.01).map((s) => ({ ...s, pendiente: -s.neto }));
    const acreedores = saldosNetos.filter((s) => s.neto > 0.01).map((s) => ({ ...s, pendiente: s.neto }));

    const transferencias: { de: string; para: string; monto: number }[] = [];
    let dIdx = 0;
    let aIdx = 0;

    while (dIdx < deudores.length && aIdx < acreedores.length) {
      const deudor = deudores[dIdx];
      const acreedor = acreedores[aIdx];
      const monto = Math.min(deudor.pendiente, acreedor.pendiente);

      if (monto > 0.01) {
        transferencias.push({
          de: deudor.persona,
          para: acreedor.persona,
          monto,
        });
      }

      deudor.pendiente -= monto;
      acreedor.pendiente -= monto;

      if (deudor.pendiente < 0.01) dIdx++;
      if (acreedor.pendiente < 0.01) aIdx++;
    }

    return {
      gastoTotal,
      cuotaEquitativa,
      saldosNetos,
      transferencias,
    };
  }, [comprobantes]);

  return (
    <div className="relative mx-auto w-full max-w-md select-none font-sans text-texto">
      {/* Selector de pestañas para las 3 boletas reales del evento */}
      <div className="mb-2.5 flex items-center justify-between gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
        {comprobantes.map((c) => {
          const totalC = c.items.filter((i) => i.activo).reduce((s, i) => s + i.precio, 0);
          const esActivo = c.id === comprobanteActivoId;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setComprobanteActivoId(c.id)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-center transition-[background-color,transform,color] duration-150 ease-out active:scale-95 ${
                esActivo
                  ? 'bg-superficie text-texto shadow-sm font-bold'
                  : 'text-sobre-barra/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="truncate font-mono text-[11px] leading-tight">{c.pagador}</div>
              <div className="font-mono text-[10px] tabular-nums opacity-80">
                S/ {totalC.toFixed(0)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Ticket térmico compacto de la boleta seleccionada */}
      <div className="relative overflow-hidden rounded-2xl border border-borde/90 bg-superficie p-3.5 shadow-xl transition-all duration-200">
        <div className="flex items-start justify-between border-b border-dashed border-borde-suave pb-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-texto-tenue">
              Boleta OCR · Pagó {comprobanteActual.pagador}
            </p>
            <h3 className="font-mono text-xs font-bold text-texto tracking-tight">
              {comprobanteActual.lugar}
            </h3>
          </div>
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-600">
            AUDITADO
          </span>
        </div>

        {/* Ítems interactivos de la boleta activa */}
        <ul className="space-y-1 py-1.5 font-mono text-xs">
          {comprobanteActual.items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => alternarItem(comprobanteActual.id, it.id)}
                title="Toca para incluir o descartar este ítem"
                className={`group flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] ${
                  it.activo
                    ? 'bg-superficie-2/90 text-texto hover:bg-superficie-2'
                    : 'bg-transparent text-texto-tenue line-through opacity-40 hover:opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
                      it.activo ? 'bg-primario text-sobre-primario' : 'bg-superficie-3 text-texto-tenue'
                    }`}
                  >
                    {it.activo ? '✓' : '—'}
                  </span>
                  <span className="truncate text-[11px]">{it.nombre}</span>
                </div>
                <span className="shrink-0 pl-2 tabular-nums text-[11px] font-semibold">
                  S/ {it.precio.toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Consolidado: Matriz Cuentas Claras */}
        <div className="mt-2 border-t border-dashed border-borde-suave pt-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-texto-suave">Gasto total (3 boletas)</span>
            <span className="font-mono text-xs font-extrabold tabular-nums text-texto">
              S/ {finanzas.gastoTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-texto-suave">
            <span>Cuota justa por persona</span>
            <span className="font-mono text-xs font-bold tabular-nums text-primario">
              S/ {finanzas.cuotaEquitativa.toFixed(2)} c/u
            </span>
          </div>

          {/* Estado de cada participante: quién recibe y quién debe */}
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
            {finanzas.saldosNetos.map((s) => (
              <div
                key={s.persona}
                className={`rounded-lg p-1.5 border ${
                  s.neto > 0.01
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : s.neto < -0.01
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-borde bg-superficie-2 text-texto-tenue'
                }`}
              >
                <div className="font-bold">{s.persona}</div>
                <div className="text-[9px] opacity-75">Pagó {s.pago.toFixed(0)}</div>
                <div className="mt-0.5 font-extrabold tabular-nums">
                  {s.neto > 0.01
                    ? `+S/ ${s.neto.toFixed(1)}`
                    : s.neto < -0.01
                    ? `-S/ ${(-s.neto).toFixed(1)}`
                    : 'Saldado'}
                </div>
              </div>
            ))}
          </div>

          {/* Liquidación simplificada en 2 pagos */}
          <div className="mt-2.5 rounded-xl bg-primario-suave/40 p-2.5 border border-primario/25">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primario-fuerte">
              Liquidación cruzada ({finanzas.transferencias.length} transferencias en vez de 6)
            </p>
            <div className="mt-1 space-y-1 font-mono text-[11px] text-texto">
              {finanzas.transferencias.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold text-texto">{t.de}</span>
                    <span className="text-texto-tenue text-[10px]">paga a</span>
                    <span className="font-bold text-texto">{t.para}</span>
                  </span>
                  <span className="font-bold tabular-nums text-primario">
                    S/ {t.monto.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
