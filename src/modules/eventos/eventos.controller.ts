import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EventosService } from './eventos.service';
import { AuthUser, User } from '../../common/user.decorator';

@Controller('api')
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  @Get('events')
  list(@User() user: AuthUser) {
    return this.eventos.listMine(user.id);
  }

  @Post('events')
  create(@User() user: AuthUser, @Body() body: { name: string }) {
    return this.eventos.create(user.id, body?.name);
  }

  @Get('events/:id')
  get(@User() user: AuthUser, @Param('id') id: string) {
    return this.eventos.getEvent(id, user.id);
  }

  @Get('events/:id/participants')
  async participants(@User() user: AuthUser, @Param('id') id: string) {
    await this.eventos.assertParticipant(id, user.id);
    return this.eventos.listParticipants(id);
  }

  @Post('events/:id/invitations')
  invite(@User() user: AuthUser, @Param('id') id: string, @Body() body: { query: string }) {
    return this.eventos.invite(id, user.id, body?.query);
  }

  @Delete('events/:id/invitations/:invitationId')
  cancelInvitation(
    @User() user: AuthUser,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.eventos.cancelInvitation(id, user.id, invitationId);
  }

  @Get('invitations')
  myInvitations(@User() user: AuthUser) {
    return this.eventos.myPendingInvitations(user.id);
  }

  @Post('invitations/:id/accept')
  accept(@User() user: AuthUser, @Param('id') id: string) {
    return this.eventos.respond(id, user.id, 'aceptar');
  }

  @Post('invitations/:id/reject')
  reject(@User() user: AuthUser, @Param('id') id: string) {
    return this.eventos.respond(id, user.id, 'rechazar');
  }

  @Get('events/:id/balance')
  balance(@User() user: AuthUser, @Param('id') id: string) {
    return this.eventos.balance(id, user.id);
  }

  @Post('events/:id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      // el tope real (5 MB) lo aplica StorageService → 400 VALIDATION
      limits: { files: 1, fileSize: Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024 * 10 },
    }),
  )
  image(
    @User() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.eventos.setImage(id, user.id, file?.buffer ?? Buffer.alloc(0));
  }

  @Get('events/:id/image')
  @Header('cache-control', 'private, no-store')
  async eventImage(@User() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const buf = await this.eventos.readImage(id, user.id);
    const ext = buf[0] === 0x89 ? 'image/png' : buf[0] === 0xff ? 'image/jpeg' : 'image/webp';
    res.setHeader('content-type', ext);
    res.send(buf);
  }

  @Get('users/search')
  search(@User() user: AuthUser, @Query('q') q: string) {
    return this.eventos.searchUsers(q, user.id);
  }

  @Post('events/:id/compensate')
  compensate(@User() user: AuthUser, @Param('id') id: string) {
    return this.eventos.compensateCrossDebts(id, user.id);
  }
}
