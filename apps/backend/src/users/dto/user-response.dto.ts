import { Expose, Transform } from 'class-transformer';

import { User } from '../user.entity';

export class UserResponse {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  @Transform(({ obj: user }: { obj: User }) => Boolean(user.emailVerifiedAt))
  emailVerified!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
