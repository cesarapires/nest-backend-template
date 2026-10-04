import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '@/app.module.js';
import { HttpConfig } from '@/config/http.config.js';

describe('Aplicação (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
  });

  it('deve responder 404 em rotas fora do prefixo /api/v1', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
