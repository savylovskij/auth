import { expect, test } from '@playwright/test';

import { createVerifiedAccount, DEFAULT_PASSWORD } from './support/accounts';
import { fetchMe, forgotPassword, login, resetPassword, sessionCookieFrom } from './support/api';
import { PASSWORD_RESET_SUBJECT, waitForCode } from './support/mailpit';
import { uniqueEmail } from './support/unique-email';

const NEW_PASSWORD = 'N3wPassw0rd!';

test.describe('password reset with an emailed OTP', () => {
  test('walks from forgot-password to a working new password', async ({ page }) => {
    const email = await createVerifiedAccount();

    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send reset code' }).click();

    await expect(page).toHaveURL(`/reset-password?email=${email}`);

    const code = await waitForCode(email, PASSWORD_RESET_SUBJECT);

    await page.getByLabel('Verification code').fill(code);
    await page.getByLabel('New password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Reset password' }).click();

    await expect(page).toHaveURL(/\/login$/);

    expect((await login(email, DEFAULT_PASSWORD)).status).toBe(401);
    expect((await login(email, NEW_PASSWORD)).status).toBe(200);
  });

  test('revokes every existing session', async () => {
    const email = await createVerifiedAccount();
    const cookie = sessionCookieFrom(await login(email, DEFAULT_PASSWORD));

    expect((await fetchMe(cookie)).status).toBe(200);

    await forgotPassword(email);
    const code = await waitForCode(email, PASSWORD_RESET_SUBJECT);

    expect((await resetPassword(email, code, NEW_PASSWORD)).status).toBe(204);
    expect((await fetchMe(cookie)).status).toBe(401);
  });

  test('burns the reset code after a single use', async () => {
    const email = await createVerifiedAccount();

    await forgotPassword(email);
    const code = await waitForCode(email, PASSWORD_RESET_SUBJECT);

    expect((await resetPassword(email, code, NEW_PASSWORD)).status).toBe(204);
    expect((await resetPassword(email, code, 'An0therPassw0rd!')).status).toBe(400);
  });

  test('rejects a wrong reset code', async () => {
    const email = await createVerifiedAccount();

    await forgotPassword(email);
    const code = await waitForCode(email, PASSWORD_RESET_SUBJECT);
    const wrongCode = code === '000000' ? '111111' : '000000';

    expect((await resetPassword(email, wrongCode, NEW_PASSWORD)).status).toBe(400);
    expect((await login(email, DEFAULT_PASSWORD)).status).toBe(200);
  });

  test('answers 204 for an unknown email without sending anything', async () => {
    const response = await forgotPassword(uniqueEmail('nobody'));

    expect(response.status).toBe(204);
  });

  test('rejects a reset code minted for a different account', async () => {
    const victim = await createVerifiedAccount();
    const attacker = await createVerifiedAccount();

    await forgotPassword(attacker);
    const attackerCode = await waitForCode(attacker, PASSWORD_RESET_SUBJECT);

    expect((await resetPassword(victim, attackerCode, NEW_PASSWORD)).status).toBe(400);
    expect((await login(victim, DEFAULT_PASSWORD)).status).toBe(200);
  });
});
