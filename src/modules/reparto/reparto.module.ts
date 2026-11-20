import { Module } from '@nestjs/common';
import { RepartoController } from './reparto.controller';
import { RepartoService } from './reparto.service';
import { EventosModule } from '../eventos/eventos.module';
import { ComprobantesModule } from '../comprobantes/comprobantes.module';
import { DiagnosticsModule } from '../admin/diagnostics.module';

@Module({
  imports: [EventosModule, ComprobantesModule, DiagnosticsModule],
  controllers: [RepartoController],
  providers: [RepartoService],
  exports: [RepartoService],
})
export class RepartoModule {}
