import { Body, Controller, Param, Post } from '@nestjs/common';
import { RepartoService } from './reparto.service';
import { AuthUser, User } from '../../common/user.decorator';

@Controller('api/receipts')
export class RepartoController {
  constructor(private readonly reparto: RepartoService) {}

  @Post(':id/split')
  saveSplit(
    @User() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { mode: string; participants?: string[]; assignments?: unknown[] },
  ) {
    return this.reparto.saveSplit(id, user.id, body as never);
  }

  @Post(':id/confirm')
  confirm(@User() user: AuthUser, @Param('id') id: string) {
    return this.reparto.confirm(id, user.id);
  }
}
