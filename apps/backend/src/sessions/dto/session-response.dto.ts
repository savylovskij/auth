import { Expose } from 'class-transformer';

export class SessionResponse {
  @Expose()
  id!: string;

  @Expose()
  userAgent!: string | null;

  @Expose()
  ip!: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  expiresAt!: Date;

  @Expose()
  current!: boolean;
}
