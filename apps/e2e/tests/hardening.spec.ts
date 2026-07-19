import { expect, test } from '@playwright/test';

import { AUTH_THROTTLE_LIMIT, BACKEND_URL } from '../playwright.config';
import { createVerifiedAccount, DEFAULT_PASSWORD } from './support/accounts';
import { login, registerAccount } from './support/api';
import { uniqueEmail } from './support/unique-email';

test.describe('hardening', () => {
  test('the session cookie is httpOnly, strict and path-scoped', async () => {
    const email = await createVerifiedAccount();
    const response = await login(email, DEFAULT_PASSWORD);
    const cookie = response.headers.getSetCookie().find((entry) => entry.startsWith('session='));

    expect(cookie).toBeTruthy();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
  });

  test('the session cookie is invisible to document.cookie', async ({ page }) => {
    const email = await createVerifiedAccount();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/profile$/);

    expect(await page.evaluate(() => document.cookie)).not.toContain('session');
  });

  test('CORS does not echo an untrusted origin', async () => {
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { origin: 'http://evil.test' },
    });

    expect(response.headers.get('access-control-allow-origin')).not.toBe('http://evil.test');
  });

  test('unknown body fields are rejected', async () => {
    const response = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail('extra'),
        password: DEFAULT_PASSWORD,
        emailVerifiedAt: new Date().toISOString(),
      }),
    });

    expect(response.status).toBe(400);
  });

  test('a short password is rejected', async () => {
    expect((await registerAccount(uniqueEmail('short'), 'short')).status).toBe(400);
  });

  test('a malformed email is rejected', async () => {
    expect((await registerAccount('not-an-email', DEFAULT_PASSWORD)).status).toBe(400);
  });

  test('auth endpoints are rate limited', async () => {
    const email = uniqueEmail('flood');
    const attempts = Array.from({ length: AUTH_THROTTLE_LIMIT + 20 }, () =>
      login(email, 'wrong-password'),
    );

    const statuses = (await Promise.all(attempts)).map((response) => response.status);

    expect(statuses).toContain(429);
  });
});
