import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { HttpConfig } from '@/config/http.config.js';

@Controller('teste-cors')
class TesteCorsController {

  @Get()
  public consultar() {
    return { ok: true };
  }
}

describe('CORS (e2e)', () => {
  let app: INestApplication<App>;

  const ORIGEM_PERMITIDA = 'http://localhost:3000';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TesteCorsController],
    }).compile();

    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve liberar a origem do frontend', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/teste-cors').set('Origin', ORIGEM_PERMITIDA).expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(ORIGEM_PERMITIDA);
  });

  it('deve permitir que o frontend leia o cabeçalho x-request-id', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/teste-cors').set('Origin', ORIGEM_PERMITIDA).expect(200);

    expect(response.headers['access-control-expose-headers']).toBe('x-request-id');
  });

  it('não deve liberar origens desconhecidas', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/teste-cors').set('Origin', 'https://site-malicioso.com').expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('deve responder ao preflight da origem permitida', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/v1/teste-cors')
      .set('Origin', ORIGEM_PERMITIDA)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(ORIGEM_PERMITIDA);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });
});
