import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, Repository } from 'typeorm';

import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string, manager?: EntityManager): Promise<User | null> {
    const repository = manager ? manager.getRepository(User) : this.users;

    return repository.findOne({ where: { email } });
  }

  create(email: string, manager?: EntityManager): Promise<User> {
    const repository = manager ? manager.getRepository(User) : this.users;
    const user = repository.create({ email });

    return repository.save(user);
  }
}
