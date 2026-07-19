import { expect, test } from '@playwright/test';

import { fetchMe, login, registerAccount } from './support/api';
import { uniqueEmail } from './support/unique-email';

test.describe('a visitor without an account', () => {
  test('is bounced from /profile to /login', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('is bounced from /sessions to /login', async ({ page }) => {
    await page.goto('/sessions');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('is bounced from /verify-email without an email query param', async ({ page }) => {
    await page.goto('/verify-email');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('is bounced from /reset-password without an email query param', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('holds no session cookie while browsing public pages', async ({ page }) => {
    await page.goto('/login');

    const cookies = await page.context().cookies();

    expect(cookies.filter((cookie) => cookie.name === 'session')).toHaveLength(0);
  });

  test('cannot read /auth/me', async () => {
    const response = await fetchMe();

    expect(response.status).toBe(401);
  });

  test('cannot read /auth/me with a forged session cookie', async () => {
    const response = await fetchMe('session=forged-token-value');

    expect(response.status).toBe(401);
  });

  test('cannot log in with an email that was never registered', async () => {
    const response = await login(uniqueEmail('ghost'), 'Passw0rd!123');

    expect(response.status).toBe(401);
  });

  test('cannot log in while the registration is still pending verification', async () => {
    const email = uniqueEmail('pending');

    expect((await registerAccount(email, 'Passw0rd!123')).status).toBe(204);

    const response = await login(email, 'Passw0rd!123');

    expect(response.status).toBe(401);
  });

  test('gets no session from a pending registration', async ({ page }) => {
    const email = uniqueEmail('pending');

    await registerAccount(email, 'Passw0rd!123');

    await page.goto(`/verify-email?email=${encodeURIComponent(email)}`);
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
  });
});
