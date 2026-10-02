import type { PrismaClient } from '@prisma/client';

const RESTRICCIONES: string[] = [
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_comprobante_monto') THEN
    ALTER TABLE "comprobantes" ADD CONSTRAINT "chk_comprobante_monto"
      CHECK ("monto_total_cents" >= 0);
  END IF;
END $$;`,
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_item_monto') THEN
    ALTER TABLE "items" ADD CONSTRAINT "chk_item_monto"
      CHECK ("monto_cents" > 0);
  END IF;
END $$;`,
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_deuda_monto') THEN
    ALTER TABLE "deudas" ADD CONSTRAINT "chk_deuda_monto"
      CHECK ("monto_total_cents" > 0);
  END IF;
END $$;`,
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_deuda_saldos') THEN
    ALTER TABLE "deudas" ADD CONSTRAINT "chk_deuda_saldos"
      CHECK ("saldo_cents" >= 0 AND "saldo_cents" <= "monto_total_cents");
  END IF;
END $$;`,
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pago_monto') THEN
    ALTER TABLE "pagos" ADD CONSTRAINT "chk_pago_monto"
      CHECK ("monto_cents" > 0);
  END IF;
END $$;`,
];

export async function aplicarRestriccionesDeIntegridad(cliente: PrismaClient): Promise<void> {
  for (const sql of RESTRICCIONES) {
    await cliente.$executeRawUnsafe(sql);
  }
}
