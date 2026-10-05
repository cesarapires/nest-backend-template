import './config/load-env.js';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { HttpConfig } from './config/http.config.js';
import { SwaggerConfig } from './config/swagger.config.js';
import { EnvUtils } from './utils/env.utils.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  HttpConfig.apply(app);
  SwaggerConfig.apply(app);
  app.enableShutdownHooks();
  await app.listen(EnvUtils.getOptional('PORT', '8080'));
}

await bootstrap();
