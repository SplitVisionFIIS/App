import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/public.decorator';
import { FeatureFlagsService } from '../../common/feature-flags.service';
import { TelemetryService } from '../../common/telemetry.service';
import { INVITATION_FSM, PAYMENT_FSM, RECEIPT_FSM, StateMachine } from '../../common/fsm';
import { PAYMENT_RULES_TABLE } from '../pagos/payment-rules';
import { runRuntimeProfiling } from '../../common/profiling';

@Controller('admin')
export class DiagnosticsController {
  constructor(
    private readonly featureFlags: FeatureFlagsService,
    private readonly telemetry: TelemetryService,
  ) {}

  @Public()
  @Get('metrics')
  getPrometheusMetrics(@Res() res: Response): void {
    const text = this.telemetry.getPrometheusFormat();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(text);
  }

  @Public()
  @Get('metrics/summary')
  getRedSummary() {
    return this.telemetry.getRedSummary();
  }

  @Public()
  @Get('spans')
  getRecentSpans() {
    return this.telemetry.getRecentSpans();
  }

  @Public()
  @Get('features')
  listFeatures() {
    return this.featureFlags.listFlags();
  }

  @Public()
  @Patch('features/:key')
  toggleFeature(
    @Param('key') key: string,
    @Body() body: { enabled: boolean; user?: string },
  ) {
    return this.featureFlags.setFlag(key, Boolean(body.enabled), body.user ?? 'presentacion_pc3');
  }

  @Public()
  @Get('fsm/rules')
  getFsmRules() {
    return {
      comprobante: {
        name: RECEIPT_FSM.name,
        states: ['CARGADO', 'PROCESANDO', 'EXTRAÍDO', 'CONFIRMADO', 'FALLIDO'],
        transitions: {
          CARGADO: RECEIPT_FSM.allowedTransitions('CARGADO'),
          PROCESANDO: RECEIPT_FSM.allowedTransitions('PROCESANDO'),
          EXTRAÍDO: RECEIPT_FSM.allowedTransitions('EXTRAÍDO'),
          FALLIDO: RECEIPT_FSM.allowedTransitions('FALLIDO'),
          CONFIRMADO: RECEIPT_FSM.allowedTransitions('CONFIRMADO'),
        },
      },
      pago: {
        name: PAYMENT_FSM.name,
        states: ['PENDIENTE', 'CONFIRMADO', 'RECHAZADO', 'CANCELADO'],
        transitions: {
          PENDIENTE: PAYMENT_FSM.allowedTransitions('PENDIENTE'),
          CONFIRMADO: PAYMENT_FSM.allowedTransitions('CONFIRMADO'),
          RECHAZADO: PAYMENT_FSM.allowedTransitions('RECHAZADO'),
          CANCELADO: PAYMENT_FSM.allowedTransitions('CANCELADO'),
        },
      },
      invitacion: {
        name: INVITATION_FSM.name,
        states: ['PENDIENTE', 'ACEPTADA', 'RECHAZADA'],
        transitions: {
          PENDIENTE: INVITATION_FSM.allowedTransitions('PENDIENTE'),
          ACEPTADA: INVITATION_FSM.allowedTransitions('ACEPTADA'),
          RECHAZADA: INVITATION_FSM.allowedTransitions('RECHAZADA'),
        },
      },
      tableRules: PAYMENT_RULES_TABLE,
    };
  }

  @Public()
  @Post('fsm/simulate')
  simulateTransition(@Body() body: { fsm: 'comprobante' | 'pago' | 'invitacion'; from: string; to: string }) {
    let fsm: StateMachine<string>;
    if (body.fsm === 'comprobante') fsm = RECEIPT_FSM as unknown as StateMachine<string>;
    else if (body.fsm === 'pago') fsm = PAYMENT_FSM as unknown as StateMachine<string>;
    else fsm = INVITATION_FSM as unknown as StateMachine<string>;

    const allowed = fsm.canTransition(body.from, body.to);
    return {
      fsm: fsm.name,
      from: body.from,
      to: body.to,
      allowed,
      message: allowed
        ? `Transición válida: [${body.from}] → [${body.to}] cumple con la topología matemática del autómata.`
        : `Transición ILEGAL: no existe arista de [${body.from}] hacia [${body.to}] en la matriz de estados. Transiciones permitidas: [${fsm.allowedTransitions(body.from).join(', ') || 'ninguna (estado terminal)'}].`,
    };
  }

  @Public()
  @Get('profiling/data')
  getProfilingReport() {
    return runRuntimeProfiling();
  }
}
