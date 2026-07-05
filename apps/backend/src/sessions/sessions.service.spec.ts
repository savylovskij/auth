import { createHash } from 'node:crypto';

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LessThan, MoreThan } from 'typeorm';

import { sessionConfig } from './session.config';
import { Session } from './session.entity';
import { SessionsService } from './sessions.service';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2030, 0, 1);
const IDLE_TTL_MS = 7 * DAY;
const ABSOLUTE_TTL_MS = 30 * DAY;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('SessionsService', () => {
  let service: SessionsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    repo = {
      create: jest.fn((entity: Partial<Session>) => entity),
      save: jest.fn((entity: Partial<Session>) => Promise.resolve(entity)),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(Session), useValue: repo },
        {
          provide: sessionConfig.KEY,
          useValue: { idleTtlMs: IDLE_TTL_MS, absoluteTtlMs: ABSOLUTE_TTL_MS },
        },
      ],
    }).compile();

    service = module.get(SessionsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('stores the token hash, not the raw token, and returns the raw token', async () => {
      const { token, session } = await service.create('u1', { userAgent: 'UA', ip: '1.2.3.4' });

      expect(session.tokenHash).toBe(sha256(token));
      expect(session.tokenHash).not.toBe(token);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', userAgent: 'UA', ip: '1.2.3.4' }),
      );
      expect(repo.save).toHaveBeenCalledWith(session);
    });

    it('sets expiry one idle TTL ahead and defaults metadata to null', async () => {
      const { session } = await service.create('u1');

      expect(session.expiresAt).toEqual(new Date(NOW + IDLE_TTL_MS));
      expect(session.userAgent).toBeNull();
      expect(session.ip).toBeNull();
    });
  });

  describe('validate', () => {
    it('looks the session up by the token hash', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.validate('raw-token');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: sha256('raw-token') },
        relations: { user: true },
      });
    });

    it('returns null when no session matches', async () => {
      repo.findOne.mockResolvedValue(null);

      expect(await service.validate('raw-token')).toBeNull();
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('removes and rejects a session past its idle expiry', async () => {
      const session = {
        createdAt: new Date(NOW - DAY),
        expiresAt: new Date(NOW - 1),
      } as Session;
      repo.findOne.mockResolvedValue(session);

      expect(await service.validate('raw-token')).toBeNull();
      expect(repo.remove).toHaveBeenCalledWith(session);
    });

    it('removes and rejects a session past its absolute deadline', async () => {
      const session = {
        createdAt: new Date(NOW - 31 * DAY),
        expiresAt: new Date(NOW + 5 * DAY),
      } as Session;
      repo.findOne.mockResolvedValue(session);

      expect(await service.validate('raw-token')).toBeNull();
      expect(repo.remove).toHaveBeenCalledWith(session);
    });

    it('returns a still-fresh session without renewing it', async () => {
      const session = {
        createdAt: new Date(NOW - DAY),
        expiresAt: new Date(NOW + 5 * DAY),
      } as Session;
      repo.findOne.mockResolvedValue(session);

      const result = await service.validate('raw-token');

      expect(result).toBe(session);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('slides expiry forward when the session is close to idle expiry', async () => {
      const session = {
        createdAt: new Date(NOW - DAY),
        expiresAt: new Date(NOW + DAY),
      } as Session;
      repo.findOne.mockResolvedValue(session);

      const result = await service.validate('raw-token');

      expect(result?.expiresAt).toEqual(new Date(NOW + IDLE_TTL_MS));
      expect(repo.save).toHaveBeenCalledWith(session);
    });

    it('clamps the renewed expiry to the absolute deadline', async () => {
      const createdAt = new Date(NOW - 29.9 * DAY);
      const session = {
        createdAt,
        expiresAt: new Date(NOW + 60 * 60 * 1000),
      } as Session;
      repo.findOne.mockResolvedValue(session);

      const result = await service.validate('raw-token');

      expect(result?.expiresAt).toEqual(new Date(createdAt.getTime() + ABSOLUTE_TTL_MS));
      expect(repo.save).toHaveBeenCalledWith(session);
    });
  });

  describe('findActiveForUser', () => {
    it('queries non-expired sessions for the user, newest first', async () => {
      const sessions = [{ id: 's1' }] as Session[];
      repo.find.mockResolvedValue(sessions);

      expect(await service.findActiveForUser('u1')).toBe(sessions);
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 'u1', expiresAt: MoreThan(new Date(NOW)) },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('revoke', () => {
    it('deletes by token hash', async () => {
      await service.revoke('raw-token');

      expect(repo.delete).toHaveBeenCalledWith({ tokenHash: sha256('raw-token') });
    });

    it('deletes by id', async () => {
      await service.revokeById('s1');

      expect(repo.delete).toHaveBeenCalledWith({ id: 's1' });
    });

    it('deletes all sessions of a user', async () => {
      await service.revokeByUserId('u1');

      expect(repo.delete).toHaveBeenCalledWith({ userId: 'u1' });
    });
  });

  describe('revokeForUser', () => {
    it('returns true when a session was deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });

      expect(await service.revokeForUser('s1', 'u1')).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith({ id: 's1', userId: 'u1' });
    });

    it('returns false when nothing matched', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      expect(await service.revokeForUser('s1', 'u1')).toBe(false);
    });
  });

  describe('deleteExpired', () => {
    it('deletes sessions past their expiry and returns the count', async () => {
      repo.delete.mockResolvedValue({ affected: 3 });

      const count = await service.deleteExpired();

      expect(repo.delete).toHaveBeenCalledWith({ expiresAt: LessThan(new Date(NOW)) });
      expect(count).toBe(3);
    });

    it('returns 0 when affected is undefined', async () => {
      repo.delete.mockResolvedValue({});

      expect(await service.deleteExpired()).toBe(0);
    });
  });
});
