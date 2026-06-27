import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

import type { Request, Response } from 'express';

import { Serialize } from '../common/serialize.interceptor';
import { Session } from '../sessions/session.entity';
import { SessionGuard } from '../sessions/session.guard';
import { SessionsService } from '../sessions/sessions.service';
import { AUTH_THROTTLE } from '../throttler/throttler.config';
import { UserResponse } from '../users/dto/user-response.dto';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { CurrentSession } from './current-session.decorator';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { clearSessionCookie, setSessionCookie } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: AUTH_THROTTLE })
  @Serialize(UserResponse)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.auth.register(dto);
    await this.startSession(user, request, response);

    return user;
  }

  @Throttle({ default: AUTH_THROTTLE })
  @Serialize(UserResponse)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.auth.login(dto);
    await this.startSession(user, request, response);

    return user;
  }

  @Serialize(UserResponse)
  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: User): UserResponse {
    return user;
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @Post('logout')
  async logout(
    @CurrentSession() session: Session,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.revokeById(session.id);
    clearSessionCookie(response, this.isProduction);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.revokeByUserId(user.id);
    clearSessionCookie(response, this.isProduction);
  }

  private async startSession(user: User, request: Request, response: Response): Promise<void> {
    const { token, session } = await this.sessions.create(user.id, {
      userAgent: request.headers['user-agent'] ?? null,
      ip: request.ip ?? null,
    });

    setSessionCookie({
      response,
      token,
      expiresAt: session.expiresAt,
      isProduction: this.isProduction,
    });
  }

  private get isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
