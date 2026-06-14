import { Controller, Get, UseGuards } from '@nestjs/common';

import { Serialize } from '../common/serialize.interceptor';
import { UserResponse } from '../users/dto/user-response.dto';
import { User } from '../users/user.entity';
import { CurrentUser } from './current-user.decorator';
import { SessionGuard } from './session.guard';

@Controller('auth')
export class AuthController {
  @Serialize(UserResponse)
  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: User): UserResponse {
    return user;
  }
}
