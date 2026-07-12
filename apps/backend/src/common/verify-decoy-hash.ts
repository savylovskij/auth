import { randomUUID } from 'node:crypto';

import * as argon2 from 'argon2';

const decoyHash = argon2.hash(randomUUID());

export async function verifyDecoyHash(value: string): Promise<void> {
  await argon2.verify(await decoyHash, value);
}
