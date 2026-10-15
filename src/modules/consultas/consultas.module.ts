import { Module } from '@nestjs/common';
import { ConsultasController } from './consultas.controller';
import { ConsultasService } from './consultas.service';
import { EventosModule } from '../eventos/eventos.module';
import { PagosModule } from '../pagos/pagos.module';

@Module({
  imports: [EventosModule, PagosModule],
  controllers: [ConsultasController],
  providers: [ConsultasService],
  exports: [ConsultasService],
})
export class ConsultasModule {}
