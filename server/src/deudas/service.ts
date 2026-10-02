import type { MetodoPago } from '@splitvision/shared';
import { desdeCentavos } from '@splitvision/shared';
import { prisma } from '../db';
import { AppError, noEncontrado } from '../errors';

interface DeudaBloqueada {
  id: string;
  deudor_id: string;
  acreedor_id: string;
  evento_id: string;
  monto_total_cents: number;
  saldo_cents: number;
}

/**
 * RF5 - Amortizacion con control de concurrencia.
 * La transaccion bloquea la fila de la deuda (SELECT ... FOR UPDATE) y solo
 * entonces evalua las precondiciones del pago. Dos solicitudes simultaneas
 * sobre la misma deuda se serializan: la segunda ve el saldo ya actualizado y
 * se rechaza sin modificarlo (evita Lost Update / check-then-act).
 */
export async function registrarPago(
  deudaId: string,
  usuarioId: string,
  montoCents: number,
  metodo: MetodoPago,
  referencia?: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const filas = await tx.$queryRaw<DeudaBloqueada[]>`
        SELECT id, deudor_id, acreedor_id, evento_id, monto_total_cents, saldo_cents
        FROM deudas
        WHERE id = ${deudaId}::uuid
        FOR UPDATE
      `;
      const deuda = filas[0];
      if (!deuda) {
        throw noEncontrado('Deuda no encontrada');
      }
      if (deuda.deudor_id !== usuarioId) {
        throw new AppError(
          'ACCESO_DENEGADO',
          403,
          'Solo el deudor puede registrar pagos sobre esta deuda',
        );
      }

      // Precondiciones evaluadas DESPUES de obtener el bloqueo (RF5).
      if (!Number.isInteger(montoCents) || montoCents <= 0) {
        throw new AppError('PAGO_INVALIDO', 422, 'El monto del pago debe ser mayor a cero');
      }
      if (montoCents > deuda.saldo_cents) {
        throw new AppError(
          'PAGO_SUPERA_SALDO',
          409,
          `El pago (${desdeCentavos(montoCents)}) supera el saldo vigente (${desdeCentavos(deuda.saldo_cents)})`,
        );
      }

      const pago = await tx.pago.create({
        data: {
          deudaId,
          usuarioId,
          montoCents,
          metodo,
          referencia: referencia ?? null,
        },
      });

      const actualizada = await tx.deuda.update({
        where: { id: deudaId },
        data: { saldoCents: { decrement: montoCents } },
      });

      return {
        pago: {
          id: pago.id,
          monto: desdeCentavos(pago.montoCents),
          metodo: pago.metodo,
          referencia: pago.referencia,
          fecha: pago.createdAt,
          usuarioId: pago.usuarioId,
        },
        saldo: desdeCentavos(actualizada.saldoCents),
        saldoCents: actualizada.saldoCents,
      };
    },
    { timeout: 15000 },
  );
}

export async function listarDeudasPorEvento(eventoId: string) {
  const deudas = await prisma.deuda.findMany({
    where: { eventoId },
    include: {
      deudor: { select: { id: true, username: true } },
      acreedor: { select: { id: true, username: true } },
      pagos: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return deudas.map((deuda) => ({
    id: deuda.id,
    comprobanteId: deuda.comprobanteId,
    acreedor: deuda.acreedor,
    deudor: deuda.deudor,
    montoTotal: desdeCentavos(deuda.montoTotalCents),
    saldo: desdeCentavos(deuda.saldoCents),
    pagos: deuda.pagos.map((pago) => ({
      id: pago.id,
      monto: desdeCentavos(pago.montoCents),
      metodo: pago.metodo,
      referencia: pago.referencia,
      fecha: pago.createdAt,
      usuarioId: pago.usuarioId,
    })),
  }));
}

export async function balanceDelEvento(eventoId: string) {
  const [deudas, participaciones] = await Promise.all([
    prisma.deuda.findMany({
      where: { eventoId },
      select: {
        acreedorId: true,
        deudorId: true,
        montoTotalCents: true,
        saldoCents: true,
        pagos: { select: { montoCents: true } },
      },
    }),
    prisma.participacion.findMany({
      where: { eventoId },
      include: { usuario: { select: { id: true, username: true } } },
    }),
  ]);

  const acumulado = new Map<
    string,
    { username: string; debeCents: number; haPagadoCents: number; leDebenCents: number }
  >();
  for (const participacion of participaciones) {
    acumulado.set(participacion.usuario.id, {
      username: participacion.usuario.username,
      debeCents: 0,
      haPagadoCents: 0,
      leDebenCents: 0,
    });
  }

  for (const deuda of deudas) {
    const deudor = acumulado.get(deuda.deudorId);
    const acreedor = acumulado.get(deuda.acreedorId);
    const pagado = deuda.pagos.reduce((suma, pago) => suma + pago.montoCents, 0);
    if (deudor) {
      deudor.debeCents += deuda.saldoCents;
      deudor.haPagadoCents += pagado;
    }
    if (acreedor) {
      acreedor.leDebenCents += deuda.saldoCents;
    }
  }

  const participantes = [...acumulado.entries()].map(([usuarioId, datos]) => ({
    usuarioId,
    ...datos,
    debe: desdeCentavos(datos.debeCents),
    haPagado: desdeCentavos(datos.haPagadoCents),
    leDeben: desdeCentavos(datos.leDebenCents),
  }));

  const pendienteCents = participantes.reduce((suma, p) => suma + p.debeCents, 0);

  return {
    saldado: deudas.length > 0 && pendienteCents === 0,
    pendienteTotal: desdeCentavos(pendienteCents),
    totalDeudas: deudas.length,
    participantes,
  };
}
