import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class OpenApiExporter {

  private static readonly OUTPUT_FILE = join(process.cwd(), 'openapi.json');

  private static readonly PLACEHOLDER_ENV: Record<string, string> = {
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    POSTGRES_USER: 'openapi',
    POSTGRES_PASSWORD: 'openapi',
    POSTGRES_DB: 'openapi',
    JWT_SECRET: 'valor-usado-apenas-para-gerar-a-documentacao',
  };

  public static async run(): Promise<void> {
    OpenApiExporter.fillMissingEnv();

    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../app.module.js');
    const { HttpConfig } = await import('../config/http.config.js');
    const { SwaggerConfig } = await import('../config/swagger.config.js');

    const app = await NestFactory.create(AppModule, { preview: true, logger: false });

    HttpConfig.apply(app);

    writeFileSync(OpenApiExporter.OUTPUT_FILE, `${JSON.stringify(SwaggerConfig.createDocument(app), null, 2)}\n`);

    await app.close();
  }

  private static fillMissingEnv(): void {
    for (const [key, value] of Object.entries(OpenApiExporter.PLACEHOLDER_ENV)) {
      process.env[key] ??= value;
    }
  }
}

await OpenApiExporter.run();
