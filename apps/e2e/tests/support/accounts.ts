import { expect, Page } from '@playwright/test';

import { pendingCookieFrom, registerAccount, verifyEmail } from './api';
import { VERIFICATION_SUBJECT, waitForCode } from './mailpit';
import { uniqueEmail } from './unique-email';

export const DEFAULT_PASSWORD = 'Passw0rd!123';

export async function createVerifiedAccount(password = DEFAULT_PASSWORD): Promise<string> {
  const email = uniqueEmail('verified');
  const registration = await registerAccount(email, password);

  expect(registration.status).toBe(204);

  const code = await waitForCode(email, VERIFICATION_SUBJECT);

  expect((await verifyEmail(email, code, pendingCookieFrom(registration))).status).toBe(200);

  return email;
}

export async function registerThroughUi(
  page: Page,
  email: string,
  password = DEFAULT_PASSWORD,
): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(`/verify-email?email=${email}`);
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/profile$/);
}
