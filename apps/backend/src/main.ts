import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { appConfig } from './app.config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
