import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PagosService } from './pagos.service';
import { AuthUser, User } from '../../common/user.decorator';

@Controller('api')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Post('debts/:id/payments')
  @UseInterceptors(
    FileInterceptor('evidence', {
      // tope duro del stream; la regla real de 5 MB la aplica StorageService → 400 VALIDATION
      limits: { files: 1, fileSize: Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024 * 10 },
    }),
  )
  create(
    @User() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { amount: string; method: string; reference?: string },
    @Headers('idempotency-key') idempotencyKey?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.pagos.createPayment(id, user.id, body, idempotencyKey, file?.buffer);
  }

  @Post('payments/:id/cancel')
  cancel(@User() user: AuthUser, @Param('id') id: string) {
    return this.pagos.cancel(id, user.id);
  }

  @Post('payments/:id/confirm')
  confirm(@User() user: AuthUser, @Param('id') id: string) {
    return this.pagos.confirm(id, user.id);
  }

  @Post('payments/:id/reject')
  reject(@User() user: AuthUser, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.pagos.reject(id, user.id, body?.reason);
  }
}
