import { expect, test } from '@playwright/test';

import { login, pendingCookieFrom, registerAccount, verifyEmail } from './support/api';
import { extractCode, VERIFICATION_SUBJECT, waitForCode, waitForMessages } from './support/mailpit';
import { uniqueEmail } from './support/unique-email';

const VICTIM_PASSWORD = 'V1ctimPassw0rd!';
const ATTACKER_PASSWORD = 'Att4ckerPassw0rd!';

test.describe('pending registration ownership', () => {
  test('a second registration cannot plant a foreign password on the account', async () => {
    const email = uniqueEmail('victim');

    const victimRegistration = await registerAccount(email, VICTIM_PASSWORD);
    const victimCookie = pendingCookieFrom(victimRegistration);
    const victimCode = await waitForCode(email, VERIFICATION_SUBJECT);

    expect((await registerAccount(email, ATTACKER_PASSWORD)).status).toBe(204);

    expect((await verifyEmail(email, victimCode, victimCookie)).status).toBe(200);

    expect((await login(email, VICTIM_PASSWORD)).status).toBe(200);
    expect(
      (await login(email, ATTACKER_PASSWORD)).status,
      'the attacker password must never open the account',
    ).toBe(401);
  });

  test('a code from a foreign registration is useless to the submitter', async () => {
    const email = uniqueEmail('victim');

    const victimRegistration = await registerAccount(email, VICTIM_PASSWORD);
    const victimCookie = pendingCookieFrom(victimRegistration);
    const victimCode = await waitForCode(email, VERIFICATION_SUBJECT);

    await registerAccount(email, ATTACKER_PASSWORD);

    const messages = await waitForMessages(email, VERIFICATION_SUBJECT, 2);
    const attackerCode = messages.map(extractCode).find((code) => code !== victimCode) as string;

    expect(
      (await verifyEmail(email, attackerCode, victimCookie)).status,
      'the newest code in the inbox must not unlock a different pending row',
    ).toBe(400);
  });

  test('a pending registration cannot be redeemed with a foreign cookie', async () => {
    const email = uniqueEmail('victim');

    const victimRegistration = await registerAccount(email, VICTIM_PASSWORD);
    const victimCode = await waitForCode(email, VERIFICATION_SUBJECT);

    const attackerRegistration = await registerAccount(email, ATTACKER_PASSWORD);
    const attackerCookie = pendingCookieFrom(attackerRegistration);

    expect(pendingCookieFrom(victimRegistration)).not.toBe(attackerCookie);
    expect((await verifyEmail(email, victimCode, attackerCookie)).status).toBe(400);
  });

  test('a pending registration cannot be redeemed without a cookie', async () => {
    const email = uniqueEmail('victim');

    await registerAccount(email, VICTIM_PASSWORD);
    const code = await waitForCode(email, VERIFICATION_SUBJECT);

    expect((await verifyEmail(email, code)).status).toBe(400);
  });

  test('provisioning clears the competing pending rows for that email', async () => {
    const email = uniqueEmail('victim');

    const victimRegistration = await registerAccount(email, VICTIM_PASSWORD);
    const victimCookie = pendingCookieFrom(victimRegistration);
    const victimCode = await waitForCode(email, VERIFICATION_SUBJECT);

    const attackerRegistration = await registerAccount(email, ATTACKER_PASSWORD);
    const attackerCookie = pendingCookieFrom(attackerRegistration);
    const messages = await waitForMessages(email, VERIFICATION_SUBJECT, 2);
    const attackerCode = messages.map(extractCode).find((code) => code !== victimCode) as string;

    expect((await verifyEmail(email, victimCode, victimCookie)).status).toBe(200);
    expect((await verifyEmail(email, attackerCode, attackerCookie)).status).toBe(400);
  });
});
