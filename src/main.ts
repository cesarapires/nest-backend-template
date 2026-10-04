import './config/load-env.js';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { HttpConfig } from './config/http.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  HttpConfig.apply(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3333);
}

await bootstrap();
