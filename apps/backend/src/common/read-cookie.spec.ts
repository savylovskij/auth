import type { Request } from 'express';

import { readCookie } from './read-cookie';

function requestWithCookie(cookie?: string): Request {
  return { headers: cookie === undefined ? {} : { cookie } } as Request;
}

describe('readCookie', () => {
  it('returns null when no cookie header is present', () => {
    expect(readCookie(requestWithCookie(), 'session')).toBeNull();
  });

  it('reads a single cookie value', () => {
    expect(readCookie(requestWithCookie('session=abc'), 'session')).toBe('abc');
  });

  it('reads one value out of several cookies', () => {
    const request = requestWithCookie('oauth_state=xyz; session=abc; theme=dark');

    expect(readCookie(request, 'session')).toBe('abc');
  });

  it('returns null when the requested cookie is absent', () => {
    expect(readCookie(requestWithCookie('session=abc'), 'missing')).toBeNull();
  });

  it('url-decodes the value', () => {
    expect(readCookie(requestWithCookie('redirect=%2Fauth%2Fme'), 'redirect')).toBe('/auth/me');
  });

  it('keeps "=" characters inside the value', () => {
    expect(readCookie(requestWithCookie('token=a=b=c'), 'token')).toBe('a=b=c');
  });

  it('returns null when the value is malformed percent-encoding', () => {
    expect(readCookie(requestWithCookie('session=%zz'), 'session')).toBeNull();
  });
});
