import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ComprobantesService } from './comprobantes.service';
import { AuthUser, User } from '../../common/user.decorator';

const maxUploadMb = () => Number(process.env.MAX_UPLOAD_MB ?? 5);

@Controller('api')
export class ComprobantesController {
  constructor(private readonly comprobantes: ComprobantesService) {}

  @Post('events/:id/receipts')
  @UseInterceptors(
    FileInterceptor('image', {
      // tope duro del stream; la regla real de 5 MB la aplica StorageService → 400 VALIDATION
      limits: { files: 1, fileSize: Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024 * 10 },
    }),
  )
  async upload(
    @User() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.comprobantes.upload(id, user.id, file?.buffer ?? Buffer.alloc(0));
  }

  @Post('events/:id/receipts/manual')
  manual(@User() user: AuthUser, @Param('id') id: string, @Body() body: never) {
    return this.comprobantes.createManual(id, user.id, body);
  }

  @Get('events/:id/receipts')
  list(@User() user: AuthUser, @Param('id') id: string) {
    return this.comprobantes.list(id, user.id);
  }

  @Get('receipts/:id')
  get(@User() user: AuthUser, @Param('id') id: string) {
    return this.comprobantes.getDetail(id, user.id);
  }

  @Patch('receipts/:id')
  patch(@User() user: AuthUser, @Param('id') id: string, @Body() body: never) {
    return this.comprobantes.patch(id, user.id, body);
  }

  @Post('receipts/:id/retry')
  retry(@User() user: AuthUser, @Param('id') id: string) {
    return this.comprobantes.retry(id, user.id);
  }

  @Get('receipts/:id/image')
  @Header('cache-control', 'private, no-store')
  async image(@User() _user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const buf = await this.comprobantes.readImage(id, _user.id);
    const ext = buf[0] === 0x89 ? 'image/png' : buf[0] === 0xff ? 'image/jpeg' : 'image/webp';
    res.setHeader('content-type', ext);
    res.send(buf);
  }
}
