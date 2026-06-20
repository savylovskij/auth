import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { AuthProvider } from './auth-provider.type';
import { CreateIdentityParams } from './create-identity.interface';
import { Identity } from './identity.entity';

@Injectable()
export class IdentitiesService {
  constructor(
    @InjectRepository(Identity)
    private readonly identities: Repository<Identity>,
  ) {}

  findByProvider(provider: AuthProvider, providerId: string): Promise<Identity | null> {
    return this.identities.findOne({
      where: { provider, providerId },
      relations: { user: true },
    });
  }

  create(params: CreateIdentityParams): Promise<Identity> {
    const identity = this.identities.create({
      userId: params.userId,
      provider: params.provider,
      providerId: params.providerId,
      passwordHash: params.passwordHash ?? null,
    });

    return this.identities.save(identity);
  }
}
