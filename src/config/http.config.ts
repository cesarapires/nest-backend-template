import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { EntityLeakInterceptor } from '@/http/entity-leak.interceptor.js';
import { InvalidFieldsException } from '@/http/invalid-fields.exception.js';
import { ProblemDetailsFilter } from '@/http/problem-details.filter.js';
import { EnvUtils } from '@/utils/env.utils.js';

export class HttpConfig {

  private static readonly GLOBAL_PREFIX = 'api';

  private static readonly DEFAULT_VERSION = '1';

  private static readonly CORS_ORIGINS = EnvUtils.getOptional('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  private static readonly EXPOSED_HEADERS = ['x-request-id'];

  public static apply(app: INestApplication): void {
    app.setGlobalPrefix(HttpConfig.GLOBAL_PREFIX);
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: HttpConfig.DEFAULT_VERSION });
    app.enableCors({ origin: HttpConfig.CORS_ORIGINS, exposedHeaders: HttpConfig.EXPOSED_HEADERS });
    app.useGlobalPipes(HttpConfig.createValidationPipe());
    app.useGlobalInterceptors(new EntityLeakInterceptor());
    app.useGlobalFilters(new ProblemDetailsFilter());
  }

  private static createValidationPipe(): ValidationPipe {
    return new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => InvalidFieldsException.fromValidationErrors(errors),
    });
  }
}
