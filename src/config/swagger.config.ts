import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetails } from '@/http/problem-details.js';
import { EnvUtils } from '@/utils/env.utils.js';

export class SwaggerConfig {

  private static readonly ENABLED = EnvUtils.getOptional('NODE_ENV', 'development') !== 'production';

  private static readonly PATH = 'api/docs';

  private static readonly TITLE = 'API';

  private static readonly DESCRIPTION = 'Erros seguem o formato Problem Details (RFC 9457).';

  private static readonly VERSION = '1';

  public static apply(app: INestApplication): void {
    if (SwaggerConfig.ENABLED) {
      SwaggerConfig.setup(app);
    }
  }

  public static setup(app: INestApplication): void {
    SwaggerModule.setup(SwaggerConfig.PATH, app, SwaggerConfig.createDocument(app));
  }

  public static createDocument(app: INestApplication): OpenAPIObject {
    const config = new DocumentBuilder()
      .setTitle(SwaggerConfig.TITLE)
      .setDescription(SwaggerConfig.DESCRIPTION)
      .setVersion(SwaggerConfig.VERSION)
      .addBearerAuth()
      .build();

    return SwaggerModule.createDocument(app, config, { extraModels: [ProblemDetails] });
  }
}
