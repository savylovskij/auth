import { Expose } from 'class-transformer';

export class UserResponse {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
