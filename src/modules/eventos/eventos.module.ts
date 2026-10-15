import { Module } from '@nestjs/common';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { StorageService } from '../comprobantes/storage.service';

@Module({
  controllers: [EventosController],
  providers: [EventosService, StorageService],
  exports: [EventosService],
})
export class EventosModule {}
