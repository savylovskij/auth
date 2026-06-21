import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { Session } from '../sessions/session.entity';
import type { AuthenticatedRequest } from './authenticated-request';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Session => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.session;
  },
);
