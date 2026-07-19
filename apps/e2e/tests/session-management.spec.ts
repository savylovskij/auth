import { expect, test } from '@playwright/test';

import { BACKEND_URL } from '../playwright.config';
import { createVerifiedAccount, DEFAULT_PASSWORD, signIn } from './support/accounts';
import { fetchMe, login, sessionCookieFrom } from './support/api';

test.describe('session management', () => {
  test('lists the active sessions and marks the current one', async ({ page }) => {
    const email = await createVerifiedAccount();

    await signIn(page, email, DEFAULT_PASSWORD);
    await page.goto('/sessions');

    await expect(page.getByRole('heading', { name: 'Active sessions' })).toBeVisible();
    await expect(page.getByText('(current)')).toBeVisible();
  });

  test('signing out clears access to the profile', async ({ page }) => {
    const email = await createVerifiedAccount();

    await signIn(page, email, DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('logout-all invalidates the other devices too', async () => {
    const email = await createVerifiedAccount();
    const firstCookie = sessionCookieFrom(await login(email, DEFAULT_PASSWORD));
    const secondCookie = sessionCookieFrom(await login(email, DEFAULT_PASSWORD));

    const loggedOut = await fetch(`${BACKEND_URL}/auth/logout-all`, {
      method: 'POST',
      headers: { cookie: secondCookie },
    });

    expect(loggedOut.status).toBe(204);
    expect((await fetchMe(firstCookie)).status).toBe(401);
    expect((await fetchMe(secondCookie)).status).toBe(401);
  });

  test('logout only revokes the session that issued it', async () => {
    const email = await createVerifiedAccount();
    const firstCookie = sessionCookieFrom(await login(email, DEFAULT_PASSWORD));
    const secondCookie = sessionCookieFrom(await login(email, DEFAULT_PASSWORD));

    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: { cookie: secondCookie },
    });

    expect((await fetchMe(firstCookie)).status).toBe(200);
    expect((await fetchMe(secondCookie)).status).toBe(401);
  });

  test('a user cannot revoke a session belonging to someone else', async () => {
    const victim = await createVerifiedAccount();
    const attacker = await createVerifiedAccount();

    const victimCookie = sessionCookieFrom(await login(victim, DEFAULT_PASSWORD));
    const attackerCookie = sessionCookieFrom(await login(attacker, DEFAULT_PASSWORD));

    const victimSessions = await fetch(`${BACKEND_URL}/auth/sessions`, {
      headers: { cookie: victimCookie },
    });
    const [victimSession] = (await victimSessions.json()) as { id: string }[];

    const revoked = await fetch(`${BACKEND_URL}/auth/sessions/${victimSession.id}`, {
      method: 'DELETE',
      headers: { cookie: attackerCookie },
    });

    expect(revoked.status).toBe(404);
    expect((await fetchMe(victimCookie)).status).toBe(200);
  });

  test('the session list never leaks the token hash', async () => {
    const email = await createVerifiedAccount();
    const cookie = sessionCookieFrom(await login(email, DEFAULT_PASSWORD));

    const response = await fetch(`${BACKEND_URL}/auth/sessions`, { headers: { cookie } });
    const sessions = (await response.json()) as Record<string, unknown>[];

    expect(sessions.length).toBeGreaterThan(0);
    expect(Object.keys(sessions[0])).not.toContain('tokenHash');
    expect(Object.keys(sessions[0])).not.toContain('userId');
  });
});
