import { z } from 'zod';
import { METODOS_PAGO, MODALIDADES } from './constantes';
import { aCentavos } from './dinero';

const montoSchema = z
  .union([z.number(), z.string()])
  .transform((valor, ctx) => {
    try {
      return aCentavos(valor);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El monto debe ser un numero con hasta 2 decimales, ej. 120.50',
      });
      return z.NEVER;
    }
  });

const uuid = z.string().uuid();

export const registroSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, numeros, punto, guion y guion bajo'),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
});
export type RegistroInput = z.infer<typeof registroSchema>;

export const loginSchema = z.object({
  identificador: z.string().trim().min(3).max(120),
  password: z.string().min(1).max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const crearEventoSchema = z.object({
  nombre: z.string().trim().min(3).max(80),
});
export type CrearEventoInput = z.infer<typeof crearEventoSchema>;

export const agregarParticipanteSchema = z.object({
  usuario: z.string().trim().min(3).max(120),
});
export type AgregarParticipanteInput = z.infer<typeof agregarParticipanteSchema>;

export const itemDivisionSchema = z.object({
  descripcion: z.string().trim().min(1).max(120),
  monto: montoSchema,
  consumidores: z.array(uuid).min(1),
});
export type ItemDivisionInput = z.infer<typeof itemDivisionSchema>;

export const ajustesSchema = z.object({
  impuestos: montoSchema.optional().default(0),
  propina: montoSchema.optional().default(0),
  descuentos: montoSchema.optional().default(0),
});

export const dividirSchema = z.object({
  montoTotal: montoSchema,
  modalidad: z.enum(MODALIDADES),
  items: z.array(itemDivisionSchema).max(100).optional().default([]),
  ajustes: ajustesSchema.optional(),
});
export type DividirInput = z.infer<typeof dividirSchema>;

export const pagoSchema = z.object({
  monto: montoSchema,
  metodo: z.enum(METODOS_PAGO),
  referencia: z
    .string()
    .trim()
    .max(60)
    .regex(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\-_/]*$/, 'La referencia contiene caracteres no permitidos')
    .optional(),
});
export type PagoInput = z.infer<typeof pagoSchema>;
