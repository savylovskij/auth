import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { Serialize } from '../common/serialize.interceptor';
import { SessionResponse } from './dto/session-response.dto';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Serialize(SessionResponse)
  @UseGuards(SessionGuard)
  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<SessionResponse[]> {
    const sessions = await this.sessions.findActiveForUser(request.user.id);

    return sessions.map((session) => ({
      ...session,
      current: session.id === request.session.id,
    }));
  }
}
