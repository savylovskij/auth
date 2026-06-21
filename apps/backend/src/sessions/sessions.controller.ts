import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { CurrentSession } from '../auth/current-session.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { Serialize } from '../common/serialize.interceptor';
import { User } from '../users/user.entity';
import { SessionResponse } from './dto/session-response.dto';
import { Session } from './session.entity';
import { SessionGuard } from './session.guard';
import { SessionsService } from './sessions.service';

@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Serialize(SessionResponse)
  @UseGuards(SessionGuard)
  @Get()
  async list(
    @CurrentUser() user: User,
    @CurrentSession() current: Session,
  ): Promise<SessionResponse[]> {
    const sessions = await this.sessions.findActiveForUser(user.id);

    return sessions.map((session) => ({
      ...session,
      current: session.id === current.id,
    }));
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @Delete(':id')
  async revoke(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const revoked = await this.sessions.revokeForUser(id, user.id);

    if (!revoked) {
      throw new NotFoundException();
    }
  }
}
