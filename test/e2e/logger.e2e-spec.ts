import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '@/app.module.js';
import { HttpConfig } from '@/config/http.config.js';

describe('Logger (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
  });

  it('deve devolver um request id gerado no cabeçalho da resposta', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deve devolver o request id enviado pelo cliente', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').set('x-request-id', 'compra-123').expect(200);

    expect(response.headers['x-request-id']).toBe('compra-123');
  });

  afterEach(async () => {
    await app.close();
  });
});
