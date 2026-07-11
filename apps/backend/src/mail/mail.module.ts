import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { mailConfig } from './mail.config';
import { MailPort } from './mail.port';
import { SmtpMailService } from './smtp-mail.service';

@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [
    {
      provide: MailPort,
      useClass: SmtpMailService,
    },
  ],
  exports: [MailPort],
})
export class MailModule {}
