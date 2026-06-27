import type { Request } from 'express';

export function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.cookie;

  if (!cookie) {
    return null;
  }

  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');

    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}
