import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { ComprobantesModule } from '../comprobantes/comprobantes.module';
import { DiagnosticsModule } from '../admin/diagnostics.module';

@Module({
  imports: [ComprobantesModule, DiagnosticsModule],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
