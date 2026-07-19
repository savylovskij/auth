import { expect, test } from '@playwright/test';

import { BACKEND_URL } from '../playwright.config';

test.describe('google oauth entry points', () => {
  test('sends the visitor to Google with a state cookie', async () => {
    const response = await fetch(`${BACKEND_URL}/auth/google`, { redirect: 'manual' });

    expect(response.status).toBe(302);

    const location = new URL(response.headers.get('location') as string);

    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('scope')).toContain('email');

    const stateParam = location.searchParams.get('state');
    const stateCookie = response.headers
      .getSetCookie()
      .find((entry) => entry.startsWith('oauth_state='));

    expect(stateParam).toBeTruthy();
    expect(stateCookie).toContain(`oauth_state=${stateParam}`);
    expect(stateCookie).toContain('HttpOnly');
  });

  test('rejects a callback whose state does not match the cookie', async () => {
    const response = await fetch(
      `${BACKEND_URL}/auth/google/callback?code=stolen-code&state=forged-state`,
      { redirect: 'manual', headers: { cookie: 'oauth_state=real-state' } },
    );

    expect(response.headers.get('location')).toContain('/login?error=google');
    expect(response.headers.getSetCookie().some((entry) => entry.startsWith('session='))).toBe(
      false,
    );
  });

  test('rejects a callback with no state cookie at all', async () => {
    const response = await fetch(
      `${BACKEND_URL}/auth/google/callback?code=stolen-code&state=whatever`,
      { redirect: 'manual' },
    );

    expect(response.headers.get('location')).toContain('/login?error=google');
    expect(response.headers.getSetCookie().some((entry) => entry.startsWith('session='))).toBe(
      false,
    );
  });
});
