import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { googleConfig } from './google.config';

@Injectable()
export class GoogleService {
  constructor(
    @Inject(googleConfig.KEY)
    private readonly config: ConfigType<typeof googleConfig>,
  ) {}
}
