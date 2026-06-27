import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/authenticated-request';
import type { Session } from '../sessions/session.entity';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Session => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.session;
  },
);
