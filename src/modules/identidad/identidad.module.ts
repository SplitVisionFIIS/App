import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ComprobantesModule } from '../comprobantes/comprobantes.module';

@Module({
  imports: [ComprobantesModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class IdentidadModule {}
