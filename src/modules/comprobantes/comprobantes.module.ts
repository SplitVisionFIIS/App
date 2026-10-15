import { Module } from '@nestjs/common';
import { ComprobantesController } from './comprobantes.controller';
import { ComprobantesService } from './comprobantes.service';
import { StorageService } from './storage.service';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [EventosModule],
  controllers: [ComprobantesController],
  providers: [ComprobantesService, StorageService],
  exports: [ComprobantesService, StorageService],
})
export class ComprobantesModule {}
