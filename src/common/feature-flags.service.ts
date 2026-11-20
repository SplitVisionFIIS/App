import { Injectable } from '@nestjs/common';
import { logger } from './correlation';

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'resilience' | 'payment' | 'ocr' | 'experiment';
  updatedAt: string;
  updatedBy: string;
}

/**
 * Servicio de Enlace Tardío (Late Binding) y Feature Flags
 * Permite alterar el comportamiento en producción sin recompilar ni reiniciar.
 * Soporta Kill Switches y alternancia de estrategias operativas en caliente.
 * (Semana 9 - Diapositivas 8 y 9)
 */
@Injectable()
export class FeatureFlagsService {
  private readonly flags = new Map<string, FeatureFlagDefinition>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    const defaults: Omit<FeatureFlagDefinition, 'updatedAt' | 'updatedBy'>[] = [
      {
        key: 'enable_plin_payments',
        name: 'Método de Pago PLIN',
        description: 'Kill Switch: Permite o bloquea transacciones a través de PLIN en tiempo real.',
        enabled: process.env.FEATURE_PLIN !== '0',
        category: 'payment',
      },
      {
        key: 'enable_yape_payments',
        name: 'Método de Pago YAPE',
        description: 'Kill Switch: Permite o bloquea transacciones a través de YAPE.',
        enabled: process.env.FEATURE_YAPE !== '0',
        category: 'payment',
      },
      {
        key: 'use_external_ocr',
        name: 'Proveedor OCR Externo',
        description: 'Estrategia OCR: Si está activo usa proveedor HTTP externo; si no, conmuta a Tesseract local.',
        enabled: process.env.OCR_PROVIDER === 'http',
        category: 'ocr',
      },
      {
        key: 'strict_fsm_enforcement',
        name: 'Validación Estricta FSM',
        description: 'Aplica restricciones matemáticas de autómata finito a todas las transiciones de estado.',
        enabled: true,
        category: 'resilience',
      },
      {
        key: 'detailed_telemetry',
        name: 'Telemetría Detallada OpenTelemetry',
        description: 'Genera spans y métricas hiper-contextualizadas por cada operación financiera.',
        enabled: true,
        category: 'experiment',
      },
    ];

    const now = new Date().toISOString();
    for (const d of defaults) {
      this.flags.set(d.key, {
        ...d,
        updatedAt: now,
        updatedBy: 'system:init',
      });
    }
  }

  isEnabled(key: string, defaultValue = false): boolean {
    const flag = this.flags.get(key);
    return flag ? flag.enabled : defaultValue;
  }

  listFlags(): FeatureFlagDefinition[] {
    return Array.from(this.flags.values());
  }

  getFlag(key: string): FeatureFlagDefinition | undefined {
    return this.flags.get(key);
  }

  setFlag(key: string, enabled: boolean, user = 'admin'): FeatureFlagDefinition {
    const existing = this.flags.get(key);
    const now = new Date().toISOString();

    if (!existing) {
      const created: FeatureFlagDefinition = {
        key,
        name: key,
        description: 'Bandera creada dinámicamente en tiempo de ejecución.',
        enabled,
        category: 'experiment',
        updatedAt: now,
        updatedBy: user,
      };
      this.flags.set(key, created);
      logger.info('Feature flag creada dinámicamente', { key, enabled, user });
      return created;
    }

    const previous = existing.enabled;
    existing.enabled = enabled;
    existing.updatedAt = now;
    existing.updatedBy = user;

    logger.warn('Feature Flag conmutada en caliente (Late Binding)', {
      key,
      previous,
      now: enabled,
      user,
      killSwitchTriggered: !enabled && existing.category === 'payment',
    });

    return existing;
  }
}
