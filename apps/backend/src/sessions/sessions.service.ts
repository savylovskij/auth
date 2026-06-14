import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sessionConfig } from './session.config';
import { Session } from './session.entity';

interface SessionMetadata {
  userAgent?: string | null;
  ip?: string | null;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessions: Repository<Session>,
    @Inject(sessionConfig.KEY)
    private readonly config: ConfigType<typeof sessionConfig>,
  ) {}

  async create(
    userId: string,
    metadata: SessionMetadata = {},
  ): Promise<{ token: string; session: Session }> {
    const token = this.generateToken();

    const session = this.sessions.create({
      userId,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + this.config.idleTtlMs),
      userAgent: metadata.userAgent ?? null,
      ip: metadata.ip ?? null,
    });

    await this.sessions.save(session);

    return { token, session };
  }

  async validate(token: string): Promise<Session | null> {
    const session = await this.sessions.findOne({
      where: { tokenHash: this.hashToken(token) },
      relations: { user: true },
    });

    if (!session) {
      return null;
    }

    const now = Date.now();
    const absoluteDeadline = session.createdAt.getTime() + this.config.absoluteTtlMs;

    if (now >= session.expiresAt.getTime() || now >= absoluteDeadline) {
      await this.sessions.remove(session);

      return null;
    }

    return this.renewIfNeeded(session, now, absoluteDeadline);
  }

  async revoke(token: string): Promise<void> {
    await this.sessions.delete({ tokenHash: this.hashToken(token) });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions.delete({ userId });
  }

  private async renewIfNeeded(
    session: Session,
    now: number,
    absoluteDeadline: number,
  ): Promise<Session> {
    const remaining = session.expiresAt.getTime() - now;
    if (remaining > this.config.idleTtlMs / 2) {
      return session;
    }

    session.expiresAt = new Date(Math.min(now + this.config.idleTtlMs, absoluteDeadline));
    return this.sessions.save(session);
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
