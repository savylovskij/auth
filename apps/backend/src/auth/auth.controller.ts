import { Controller, Get, UseGuards } from '@nestjs/common';
import { Serialize } from '../common/serialize.interceptor';
import { CurrentUser } from './current-user.decorator';
import { SessionGuard } from './session.guard';
import { UserResponse } from '../users/dto/user-response.dto';
import { User } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  @Serialize(UserResponse)
  @UseGuards(SessionGuard)
  @Get('me')
  me(@CurrentUser() user: User): UserResponse {
    return user;
  }
}
