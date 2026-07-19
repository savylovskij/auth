import { expect, test } from '@playwright/test';

import { DEFAULT_PASSWORD, registerThroughUi } from './support/accounts';
import {
  fetchMe,
  login,
  pendingCookieFrom,
  registerAccount,
  resendVerification,
  sessionCookieFrom,
  verifyEmail,
} from './support/api';
import { extractCode, VERIFICATION_SUBJECT, waitForCode, waitForMessages } from './support/mailpit';
import { uniqueEmail } from './support/unique-email';

test.describe('registration with an emailed OTP', () => {
  test('walks from the register form to the profile using the emailed code', async ({ page }) => {
    const email = uniqueEmail('signup');

    await registerThroughUi(page, email);
    await expect(page.getByText(`We sent a 6-digit code to ${email}`)).toBeVisible();

    const code = await waitForCode(email, VERIFICATION_SUBJECT);

    await page.getByLabel('Verification code').fill(code);
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText(email)).toBeVisible();
  });

  test('keeps the session after a full page reload', async ({ page }) => {
    const email = uniqueEmail('signup');

    await registerThroughUi(page, email);
    const code = await waitForCode(email, VERIFICATION_SUBJECT);

    await page.getByLabel('Verification code').fill(code);
    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page).toHaveURL(/\/profile$/);

    await page.reload();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText(email)).toBeVisible();
  });

  test('shows an error for a wrong code and grants no access', async ({ page }) => {
    const email = uniqueEmail('signup');

    await registerThroughUi(page, email);
    const code = await waitForCode(email, VERIFICATION_SUBJECT);
    const wrongCode = code === '000000' ? '111111' : '000000';

    await page.getByLabel('Verification code').fill(wrongCode);
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByText('Invalid or expired code. Request a new one')).toBeVisible();
    await expect(page).toHaveURL(/\/verify-email/);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('resends a fresh code from the verification screen', async ({ page }) => {
    const email = uniqueEmail('signup');

    await registerThroughUi(page, email);
    const firstCode = await waitForCode(email, VERIFICATION_SUBJECT);

    await page.getByRole('button', { name: 'Resend code' }).click();
    await expect(page.getByText('A new code has been sent to your email')).toBeVisible();

    const messages = await waitForMessages(email, VERIFICATION_SUBJECT, 2);
    const secondCode = messages.map(extractCode).find((code) => code !== firstCode) as string;

    await page.getByLabel('Verification code').fill(secondCode);
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page).toHaveURL(/\/profile$/);
  });

  test('does not create an account until the code is verified', async () => {
    const email = uniqueEmail('signup');

    await registerAccount(email, DEFAULT_PASSWORD);

    expect((await login(email, DEFAULT_PASSWORD)).status).toBe(401);
    expect((await registerAccount(email, DEFAULT_PASSWORD)).status).toBe(204);
  });

  test('rejects a second registration once the account exists', async () => {
    const email = uniqueEmail('signup');
    const registration = await registerAccount(email, DEFAULT_PASSWORD);
    const code = await waitForCode(email, VERIFICATION_SUBJECT);

    await verifyEmail(email, code, pendingCookieFrom(registration));

    expect((await registerAccount(email, DEFAULT_PASSWORD)).status).toBe(409);
  });

  test('burns the code after a single successful use', async () => {
    const email = uniqueEmail('signup');
    const registration = await registerAccount(email, DEFAULT_PASSWORD);
    const cookie = pendingCookieFrom(registration);
    const code = await waitForCode(email, VERIFICATION_SUBJECT);

    expect((await verifyEmail(email, code, cookie)).status).toBe(200);
    expect((await verifyEmail(email, code, cookie)).status).toBe(400);
  });

  test('locks the pending registration after five wrong codes', async () => {
    const email = uniqueEmail('signup');
    const registration = await registerAccount(email, DEFAULT_PASSWORD);
    const cookie = pendingCookieFrom(registration);
    const code = await waitForCode(email, VERIFICATION_SUBJECT);
    const wrongCode = code === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await verifyEmail(email, wrongCode, cookie)).status).toBe(400);
    }

    expect((await verifyEmail(email, code, cookie)).status).toBe(400);
    expect((await login(email, DEFAULT_PASSWORD)).status).toBe(401);
  });

  test('resend rotates the code and retires the previous one', async () => {
    const email = uniqueEmail('signup');
    const registration = await registerAccount(email, DEFAULT_PASSWORD);
    const cookie = pendingCookieFrom(registration);
    const firstCode = await waitForCode(email, VERIFICATION_SUBJECT);

    expect((await resendVerification(email, cookie)).status).toBe(204);

    const messages = await waitForMessages(email, VERIFICATION_SUBJECT, 2);
    const secondCode = messages.map(extractCode).find((code) => code !== firstCode) as string;

    expect(secondCode, 'resend must issue a different code').toBeTruthy();
    expect((await verifyEmail(email, firstCode, cookie)).status).toBe(400);
    expect((await verifyEmail(email, secondCode, cookie)).status).toBe(200);
  });

  test('resend without a pending registration stays silent', async () => {
    expect((await resendVerification(uniqueEmail('nobody'))).status).toBe(204);
  });

  test('the verify-email endpoint issues a working session', async () => {
    const email = uniqueEmail('signup');
    const registration = await registerAccount(email, DEFAULT_PASSWORD);
    const code = await waitForCode(email, VERIFICATION_SUBJECT);

    const verified = await verifyEmail(email, code, pendingCookieFrom(registration));
    const me = await fetchMe(sessionCookieFrom(verified));

    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ email, emailVerified: true });
  });
});
