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

import type { Request, Response } from 'express';

import { Serialize } from '../common/serialize.interceptor';
import { SessionsService } from '../sessions/sessions.service';
import { UserResponse } from '../users/dto/user-response.dto';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { setSessionCookie } from './cookie';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionGuard } from './session.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService,
  ) {}

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

  private async startSession(user: User, request: Request, response: Response): Promise<void> {
    const { token, session } = await this.sessions.create(user.id, {
      userAgent: request.headers['user-agent'] ?? null,
      ip: request.ip ?? null,
    });

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    setSessionCookie(response, token, session.expiresAt, isProduction);
  }
}
