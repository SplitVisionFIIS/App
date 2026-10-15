import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/public.decorator';
import { User, AuthUser } from '../../common/user.decorator';
import { parseCookies } from '../../common/util';
import { unauthorized } from '../../common/errors';

function sessionCookies(res: Response, sessionId: string, csrf: string): void {
  const hours = Number(process.env.SESSION_HOURS ?? 8);
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('sid', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: hours * 3600_000,
  });
  res.cookie('csrf', csrf, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: hours * 3600_000,
  });
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() body: { username: string; email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(body ?? ({} as never));
    sessionCookies(res, result.sessionId, result.csrf);
    return { username: result.username, csrf: result.csrf };
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: { identifier: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body?.identifier, body?.password);
    sessionCookies(res, result.sessionId, result.csrf);
    return { username: result.username, csrf: result.csrf };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = parseCookies(req.headers.cookie)['sid'];
    if (sid) await this.auth.logout(sid);
    res.clearCookie('sid', { path: '/' });
    res.clearCookie('csrf', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async me(@User() user: AuthUser) {
    if (!user) throw unauthorized();
    const profile = await this.auth.getProfile(user);
    return {
      username: profile.username,
      hasImage: profile.hasImage,
      imageUrl: profile.hasImage ? '/api/auth/me/image' : undefined,
    };
  }

  @Post('me/image')
  @UseInterceptors(
    FileInterceptor('image', {
      // el tope real (5 MB) lo aplica StorageService → 400 VALIDATION
      limits: { files: 1, fileSize: Number(process.env.MAX_UPLOAD_MB ?? 5) * 1024 * 1024 * 10 },
    }),
  )
  uploadAvatar(@User() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    return this.auth.setImage(user.id, file?.buffer ?? Buffer.alloc(0));
  }

  @Get('me/image')
  @Header('cache-control', 'private, no-store')
  async avatar(@User() user: AuthUser, @Res() res: Response) {
    const buf = await this.auth.readImage(user.id);
    const ext = buf[0] === 0x89 ? 'image/png' : buf[0] === 0xff ? 'image/jpeg' : 'image/webp';
    res.setHeader('content-type', ext);
    res.send(buf);
  }

  @Post('password')
  changePassword(
    @User() user: AuthUser,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.auth.changePassword(user.id, body?.currentPassword ?? '', body?.newPassword ?? '');
  }
}
