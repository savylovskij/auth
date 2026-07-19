import { expect } from '@playwright/test';

import { MAILPIT_URL } from '../../playwright.config';
import { MailpitMessage } from './mailpit-message.interface';
import { MailpitMessageSummary } from './mailpit-message-summary.interface';
import { MailpitSearchResponse } from './mailpit-search-response.interface';

export const VERIFICATION_SUBJECT = 'Verify your email';
export const PASSWORD_RESET_SUBJECT = 'Reset your password';

const POLL_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 15_000;

export async function clearMailbox(): Promise<void> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });

  expect(response.ok, 'Mailpit must be reachable at :8025').toBeTruthy();
}

export async function waitForMessages(
  recipient: string,
  subject: string,
  minimum: number,
): Promise<MailpitMessage[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  for (;;) {
    const summaries = (await search(recipient))
      .filter((summary) => summary.Subject === subject)
      .sort((left, right) => Date.parse(right.Created) - Date.parse(left.Created));

    if (summaries.length >= minimum) {
      return Promise.all(summaries.map((summary) => fetchMessage(summary.ID)));
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `Expected at least ${minimum} "${subject}" message(s) for ${recipient}, saw ${summaries.length}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export async function waitForCode(recipient: string, subject: string): Promise<string> {
  const messages = await waitForMessages(recipient, subject, 1);

  return extractCode(messages[0]);
}

export function extractCode(message: MailpitMessage): string {
  const match = /\b(\d{6})\b/.exec(message.Text);

  if (!match) {
    throw new Error(`No 6-digit code in message "${message.Subject}": ${message.Text}`);
  }

  return match[1];
}

async function search(recipient: string): Promise<MailpitMessageSummary[]> {
  const query = encodeURIComponent(`to:${recipient}`);
  const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}&limit=50`);

  if (!response.ok) {
    return [];
  }

  const results = (await response.json()) as MailpitSearchResponse;

  return results.messages;
}

async function fetchMessage(id: string): Promise<MailpitMessage> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);

  expect(response.ok, `Mailpit message ${id} must be readable`).toBeTruthy();

  return (await response.json()) as MailpitMessage;
}
