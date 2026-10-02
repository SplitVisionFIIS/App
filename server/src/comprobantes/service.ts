import type PgBoss from 'pg-boss';
import type { Prisma } from '@prisma/client';
import { NOMBRE_COLA_OCR, desdeCentavos, type DividirInput } from '@splitvision/shared';
import { config } from '../config';
import { prisma } from '../db';
import { ContractViolation } from '../division/contratos';
import {
  deudasDesdePartes,
  repartoEquitativo,
  repartoPorItems,
  verificarInvariante,
  type ItemDivision,
  type PartePorUsuario,
} from '../division/engine';
import { AppError, noEncontrado } from '../errors';

export async function crearComprobante(
  eventoId: string,
  pagadorId: string,
  imagenPath: string,
  boss: PgBoss,
) {
  const comprobante = await prisma.comprobante.create({
    data: { eventoId, pagadorId, imagenPath, estado: 'PROCESANDO' },
  });

  await boss.send(
    NOMBRE_COLA_OCR,
    { comprobanteId: comprobante.id },
    {
      singletonKey: comprobante.id,
      retryLimit: config.OCR_MAX_RETRIES,
      retryDelay: 3,
      retryBackoff: true,
      expireInSeconds: 120,
    },
  );

  return comprobante;
}

export async function listarComprobantes(eventoId: string) {
  const comprobantes = await prisma.comprobante.findMany({
    where: { eventoId },
    include: {
      pagador: { select: { id: true, username: true } },
      deudas: { select: { id: true, saldoCents: true, montoTotalCents: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return comprobantes.map((comprobante) => ({
    id: comprobante.id,
    estado: comprobante.estado,
    pagador: comprobante.pagador,
    imagenUrl: `/uploads/${comprobante.imagenPath}`,
    montoTotal: desdeCentavos(comprobante.montoTotalCents),
    modalidad: comprobante.modalidad,
    totalDeudas: comprobante.deudas.length,
    saldoPendiente: desdeCentavos(
      comprobante.deudas.reduce((suma, deuda) => suma + deuda.saldoCents, 0),
    ),
    createdAt: comprobante.createdAt,
  }));
}

export async function obtenerComprobante(comprobanteId: string, usuarioId: string) {
  const comprobante = await prisma.comprobante.findUnique({
    where: { id: comprobanteId },
    include: {
      pagador: { select: { id: true, username: true } },
      evento: {
        include: { participaciones: { select: { usuarioId: true } } },
      },
      items: {
        include: { consumos: { select: { usuarioId: true } } },
      },
      deudas: {
        include: {
          deudor: { select: { id: true, username: true } },
          pagos: { select: { id: true, montoCents: true, metodo: true, createdAt: true } },
        },
      },
    },
  });
  if (!comprobante) {
    throw noEncontrado('Comprobante no encontrado');
  }
  const esMiembro = comprobante.evento.participaciones.some(
    (participacion) => participacion.usuarioId === usuarioId,
  );
  if (!esMiembro) {
    throw new AppError('ACCESO_DENEGADO', 403, 'No perteneces a este evento');
  }

  return {
    id: comprobante.id,
    eventoId: comprobante.eventoId,
    estado: comprobante.estado,
    pagador: comprobante.pagador,
    imagenUrl: `/uploads/${comprobante.imagenPath}`,
    montoTotal: desdeCentavos(comprobante.montoTotalCents),
    modalidad: comprobante.modalidad,
    datosExtraidos: comprobante.datosExtraidos,
    items: comprobante.items.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      monto: desdeCentavos(item.montoCents),
      consumidores: item.consumos.map((consumo) => consumo.usuarioId),
    })),
    deudas: comprobante.deudas.map((deuda) => ({
      id: deuda.id,
      deudor: deuda.deudor,
      montoTotal: desdeCentavos(deuda.montoTotalCents),
      saldo: desdeCentavos(deuda.saldoCents),
      pagado: desdeCentavos(deuda.pagos.reduce((suma, pago) => suma + pago.montoCents, 0)),
    })),
    createdAt: comprobante.createdAt,
    updatedAt: comprobante.updatedAt,
  };
}

/**
 * RF4 - Verificacion del usuario + motor de division con Design by Contract.
 * La invariante "suma de las partes == monto total" se verifica antes de
 * persistir; si se viola, no se escribe nada en la matriz de deudas.
 */
export async function dividirComprobante(
  comprobanteId: string,
  usuarioId: string,
  datos: DividirInput,
) {
  const comprobante = await prisma.comprobante.findUnique({
    where: { id: comprobanteId },
    include: {
      evento: { include: { participaciones: true } },
      deudas: { select: { id: true } },
    },
  });
  if (!comprobante) {
    throw noEncontrado('Comprobante no encontrado');
  }
  if (comprobante.pagadorId !== usuarioId) {
    throw new AppError(
      'ACCESO_DENEGADO',
      403,
      'Solo el pagador puede verificar los datos y dividir el gasto',
    );
  }
  if (comprobante.estado !== 'PROCESADO') {
    throw new AppError(
      'ESTADO_INVALIDO',
      409,
      `El comprobante debe estar en estado PROCESADO para dividirlo (estado actual: ${comprobante.estado})`,
    );
  }
  if (comprobante.deudas.length > 0) {
    throw new AppError('YA_DIVIDIDO', 409, 'Este comprobante ya genero sus deudas');
  }

  const participantes = comprobante.evento.participaciones.map((p) => p.usuarioId);
  const ajustes = {
    impuestosCents: datos.ajustes?.impuestos ?? 0,
    propinaCents: datos.ajustes?.propina ?? 0,
    descuentosCents: datos.ajustes?.descuentos ?? 0,
  };

  let partes: PartePorUsuario[];
  try {
    if (datos.modalidad === 'EQUITATIVO') {
      partes = repartoEquitativo(datos.montoTotal, participantes);
    } else {
      const items: ItemDivision[] = datos.items.map((item) => ({
        descripcion: item.descripcion,
        montoCents: item.monto,
        consumidores: item.consumidores,
      }));
      partes = repartoPorItems(datos.montoTotal, participantes, items, ajustes);
    }
    verificarInvariante(datos.montoTotal, partes);
  } catch (error) {
    if (error instanceof ContractViolation) {
      throw new AppError('CONTRATO_VIOLADO', 422, error.message);
    }
    throw error;
  }

  const deudasAGenerar = deudasDesdePartes(partes, comprobante.pagadorId);

  return prisma.$transaction(async (tx) => {
    if (datos.modalidad === 'POR_ITEMS') {
      for (const item of datos.items) {
        const itemCreado = await tx.item.create({
          data: { comprobanteId, descripcion: item.descripcion, montoCents: item.monto },
        });
        await tx.itemConsumo.createMany({
          data: item.consumidores.map((usuario) => ({
            itemId: itemCreado.id,
            usuarioId: usuario,
          })),
        });
      }
    }

    const deudas = [];
    for (const deuda of deudasAGenerar) {
      deudas.push(
        await tx.deuda.create({
          data: {
            eventoId: comprobante.eventoId,
            comprobanteId,
            acreedorId: comprobante.pagadorId,
            deudorId: deuda.usuarioId,
            montoTotalCents: deuda.montoCents,
            saldoCents: deuda.montoCents,
          },
        }),
      );
    }

    await tx.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estado: 'CONFIRMADO',
        montoTotalCents: datos.montoTotal,
        modalidad: datos.modalidad,
        datosExtraidos: {
          verificadoPor: usuarioId,
          montoTotalCents: datos.montoTotal,
          items: datos.items.map((item) => ({
            descripcion: item.descripcion,
            montoCents: item.monto,
            consumidores: item.consumidores,
          })),
          ajustes,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      comprobanteId,
      modalidad: datos.modalidad,
      montoTotal: desdeCentavos(datos.montoTotal),
      partes: partes.map((parte) => ({
        usuarioId: parte.usuarioId,
        monto: desdeCentavos(parte.montoCents),
      })),
      deudas: deudas.map((deuda) => ({
        id: deuda.id,
        deudorId: deuda.deudorId,
        montoTotal: desdeCentavos(deuda.montoTotalCents),
        saldo: desdeCentavos(deuda.saldoCents),
      })),
    };
  });
}
