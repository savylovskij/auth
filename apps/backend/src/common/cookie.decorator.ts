import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { Request } from 'express';

import { readCookie } from './read-cookie';

export const Cookie = createParamDecorator(
  (name: string, context: ExecutionContext): string | null => {
    const request = context.switchToHttp().getRequest<Request>();

    return readCookie(request, name);
  },
);
