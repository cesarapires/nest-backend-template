import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '@/app.module.js';
import { HttpConfig } from '@/config/http.config.js';
import { SwaggerConfig } from '@/config/swagger.config.js';

describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    SwaggerConfig.setup(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve servir a página da documentação', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs').expect(200);

    expect(response.headers['content-type']).toContain('text/html');
  });

  it('deve listar as rotas com o prefixo /api/v1', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(response.body.info.title).toBe('API');
    expect(response.body.paths['/api/v1/health'].get.tags).toEqual(['health']);
  });

  it('deve documentar o cadastro de atleta', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    const cadastro = response.body.paths['/api/v1/auth/register'].post;

    expect(cadastro.tags).toEqual(['auth']);
    expect(Object.keys(cadastro.responses)).toEqual(expect.arrayContaining(['201', '400', '409']));
  });

  it('deve documentar login, refresh e logout', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(Object.keys(response.body.paths['/api/v1/auth/login'].post.responses)).toEqual(expect.arrayContaining(['200', '400', '401']));
    expect(Object.keys(response.body.paths['/api/v1/auth/refresh'].post.responses)).toEqual(expect.arrayContaining(['200', '401']));
    expect(Object.keys(response.body.paths['/api/v1/auth/logout'].post.responses)).toEqual(['204']);
  });

  it('deve marcar o /users/me como protegido por token Bearer', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    const me = response.body.paths['/api/v1/users/me'].get;

    expect(me.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(me.responses)).toEqual(expect.arrayContaining(['200', '401']));
  });

  it('deve oferecer autenticação por token Bearer', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(response.body.components.securitySchemes.bearer).toMatchObject({ type: 'http', scheme: 'bearer' });
  });

  it('deve documentar o formato de erro Problem Details', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(Object.keys(response.body.components.schemas.ProblemDetails.properties)).toEqual(['type', 'title', 'status', 'detail', 'instance', 'requestId', 'errors']);
  });
});
