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

import { Cookie } from '../common/cookie.decorator';
import { CurrentSession } from '../common/current-session.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { Serialize } from '../common/serialize.interceptor';
import { Session } from '../sessions/session.entity';
import { SessionGuard } from '../sessions/session.guard';
import { SessionsService } from '../sessions/sessions.service';
import { AUTH_THROTTLE } from '../throttler/throttler.config';
import { UserResponse } from '../users/dto/user-response.dto';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import {
  clearPendingRegistrationCookie,
  PENDING_REGISTRATION_COOKIE,
  setPendingRegistrationCookie,
} from './pending-registration-cookie';
import { clearSessionCookie, setSessionCookie } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('register')
  async register(
    @Body() credentials: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = await this.auth.register(credentials);

    setPendingRegistrationCookie({ response, token, isProduction: this.isProduction });
  }

  @Throttle({ default: AUTH_THROTTLE })
  @Serialize(UserResponse)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() credentials: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.auth.login(credentials);
    await this.sessions.deleteExpired();
    await this.startSession(user, request, response);

    return user;
  }

  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('forgot-password')
  forgotPassword(@Body() resetRequest: ForgotPasswordDto): Promise<void> {
    return this.auth.forgotPassword(resetRequest.email);
  }

  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  resetPassword(@Body() passwordReset: ResetPasswordDto): Promise<void> {
    return this.auth.resetPassword(
      passwordReset.email,
      passwordReset.code,
      passwordReset.newPassword,
    );
  }

  @Serialize(UserResponse)
  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Throttle({ default: AUTH_THROTTLE })
  @Serialize(UserResponse)
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(
    @Body() verification: VerifyEmailDto,
    @Cookie(PENDING_REGISTRATION_COOKIE) pendingToken: string | null,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.auth.verifyEmail(pendingToken, verification.email, verification.code);

    clearPendingRegistrationCookie(response, this.isProduction);
    await this.startSession(user, request, response);

    return user;
  }

  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email/resend')
  resendVerification(
    @Body() resendRequest: ResendVerificationDto,
    @Cookie(PENDING_REGISTRATION_COOKIE) pendingToken: string | null,
  ): Promise<void> {
    return this.auth.resendVerification(pendingToken, resendRequest.email);
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
