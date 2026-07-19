import { BACKEND_URL } from '../../playwright.config';

export function registerAccount(email: string, password: string): Promise<Response> {
  return postJson('/auth/register', { email, password });
}

export function verifyEmail(email: string, code: string, cookie?: string): Promise<Response> {
  return postJson('/auth/verify-email', { email, code }, cookie);
}

export function resendVerification(email: string, cookie?: string): Promise<Response> {
  return postJson('/auth/verify-email/resend', { email }, cookie);
}

export function login(email: string, password: string): Promise<Response> {
  return postJson('/auth/login', { email, password });
}

export function forgotPassword(email: string): Promise<Response> {
  return postJson('/auth/forgot-password', { email });
}

export function resetPassword(email: string, code: string, newPassword: string): Promise<Response> {
  return postJson('/auth/reset-password', { email, code, newPassword });
}

export function fetchMe(cookie?: string): Promise<Response> {
  return fetch(`${BACKEND_URL}/auth/me`, {
    headers: cookie ? { cookie } : {},
  });
}

export function sessionCookieFrom(response: Response): string {
  return cookieFrom(response, 'session');
}

export function pendingCookieFrom(response: Response): string {
  return cookieFrom(response, 'pending_registration');
}

function cookieFrom(response: Response, name: string): string {
  const setCookie = response.headers.getSetCookie().find((entry) => entry.startsWith(`${name}=`));

  if (!setCookie) {
    throw new Error(`Response did not set a ${name} cookie`);
  }

  return setCookie.split(';')[0];
}

function postJson(
  path: string,
  fields: Record<string, string>,
  cookie?: string,
): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: cookie
      ? { 'content-type': 'application/json', cookie }
      : { 'content-type': 'application/json' },
    body: JSON.stringify(fields),
  });
}
