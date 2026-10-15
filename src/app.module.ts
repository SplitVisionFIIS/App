import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as entities from './db/entities';
import { AppExceptionFilter } from './common/filters';
import { SessionGuard } from './common/session.guard';
import { IdentidadModule } from './modules/identidad/identidad.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { ComprobantesModule } from './modules/comprobantes/comprobantes.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { RepartoModule } from './modules/reparto/reparto.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { ConsultasModule } from './modules/consultas/consultas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: Object.values(entities) as (new () => unknown)[],
      synchronize: false,
      logging: process.env.DB_LOG === '1' ? ['error', 'warn'] : false,
      extra: { max: Number(process.env.DB_POOL ?? 10) },
    }),
    IdentidadModule,
    EventosModule,
    ComprobantesModule,
    OcrModule,
    RepartoModule,
    PagosModule,
    ConsultasModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
