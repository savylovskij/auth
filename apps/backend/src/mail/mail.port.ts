import { MailMessage } from './mail-message.interface';

export abstract class MailPort {
  abstract send(message: MailMessage): Promise<void>;
}
