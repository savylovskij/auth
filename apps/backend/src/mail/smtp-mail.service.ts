import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { createTransport, Transporter } from 'nodemailer';

import { mailConfig } from './mail.config';
import { MailPort } from './mail.port';
import { MailMessage } from './mail-message.interface';

@Injectable()
export class SmtpMailService implements MailPort {
  private readonly transporter: Transporter;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {
    this.transporter = createTransport({ host: config.host, port: config.port });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
