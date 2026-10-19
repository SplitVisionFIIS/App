import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConsultasService } from './consultas.service';
import { PagosService } from '../pagos/pagos.service';
import { AuthUser, User } from '../../common/user.decorator';

@Controller('api')
export class ConsultasController {
  constructor(
    private readonly consultas: ConsultasService,
    private readonly pagos: PagosService,
  ) {}

  @Get('debts')
  debts(
    @User() user: AuthUser,
    @Query('direction') direction?: string,
    @Query('eventId') eventId?: string,
    @Query('all') all?: string,
  ) {
    const dir = direction === 'owed' ? 'owed' : 'owing';
    const includeSettled = all === 'true' || all === '1';
    return this.consultas.myDebts(user.id, dir, eventId, includeSettled);
  }

  @Get('debts/:id')
  debtHistory(@User() user: AuthUser, @Param('id') id: string) {
    return this.pagos.debtHistory(id, user.id);
  }

  @Get('payments/pending')
  pendingPayments(@User() user: AuthUser) {
    return this.pagos.listPendingFor(user.id);
  }

  @Get('payments/:id/evidence')
  @Header('cache-control', 'private, no-store')
  async evidence(@User() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const buf = await this.pagos.readEvidence(id, user.id);
    const ext = buf[0] === 0x89 ? 'image/png' : buf[0] === 0xff ? 'image/jpeg' : 'image/webp';
    res.setHeader('content-type', ext);
    res.send(buf);
  }

  @Get('pending')
  tray(@User() user: AuthUser) {
    return this.consultas.pendingTray(user.id);
  }
}
