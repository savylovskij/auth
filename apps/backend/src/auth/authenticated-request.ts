import type { Request } from 'express';
import type { Session } from '../sessions/session.entity';
import type { User } from '../users/user.entity';

export interface AuthenticatedRequest extends Request {
  user: User;
  session: Session;
}
