import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '@/app.module.js';
import { HttpConfig } from '@/config/http.config.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve responder 200 com o banco de dados no ar', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });
});
