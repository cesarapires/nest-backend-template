import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app.module.js';
import { HttpConfig } from '@/config/http.config.js';
import { User } from '@/users/user.entity.js';
import { DatabaseCleaner } from '../../support/database-cleaner.js';

describe('POST /api/v1/auth/register (e2e)', () => {
  let app: INestApplication<App>;

  let dataSource: DataSource;

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  function cadastro(alteracoes: Record<string, unknown> = {}) {
    return { email: 'Ana@Exemplo.com', password: 'senha-forte-123', ...alteracoes };
  }

  function cadastrar(body: object) {
    return request(app.getHttpServer()).post('/api/v1/auth/register').send(body);
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await DatabaseCleaner.truncateAll(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve cadastrar o usuário e responder 201 com a conta', async () => {
    const response = await cadastrar(cadastro()).expect(201);

    expect(response.body).toMatchObject({ email: 'ana@exemplo.com', role: 'USER', emailVerifiedAt: null });
    expect(response.body.id).toMatch(UUID);
  });

  it('deve aceitar e-mail com espaços nas pontas, guardando sem eles', async () => {
    const response = await cadastrar(cadastro({ email: '  Ana@Exemplo.com ' })).expect(201);

    expect(response.body.email).toBe('ana@exemplo.com');
  });

  it('não deve devolver a senha, o hash nem os ids internos', async () => {
    const response = await cadastrar(cadastro()).expect(201);

    for (const campo of ['password', 'passwordHash', 'version', 'lastLoginAt']) {
      expect(response.body).not.toHaveProperty(campo);
    }

    expect(JSON.stringify(response.body)).not.toContain('senha-forte-123');
    expect(JSON.stringify(response.body)).not.toContain('argon2');
  });

  it('deve guardar a senha como hash argon2id', async () => {
    await cadastrar(cadastro()).expect(201);

    const user = await dataSource.getRepository(User).findOneByOrFail({ email: 'ana@exemplo.com' });

    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('deve responder 409 para e-mail já cadastrado', async () => {
    await cadastrar(cadastro()).expect(201);

    const response = await cadastrar(cadastro({ email: 'ANA@exemplo.com' })).expect(409);

    expect(response.body.detail).toBe('E-mail já cadastrado');
  });

  it('deve responder 400 indicando os campos inválidos', async () => {
    const response = await cadastrar(cadastro({ email: 'invalido', password: 'curta' })).expect(400);

    expect(response.body.errors.map((error: { field: string }) => error.field)).toEqual(['email', 'password']);
  });

  it('não deve permitir escolher o papel no cadastro', async () => {
    const response = await cadastrar(cadastro({ role: 'ADMIN' })).expect(400);

    expect(response.body.errors).toEqual([{ field: 'role', message: 'property role should not exist' }]);
    expect(await dataSource.getRepository(User).count()).toBe(0);
  });
});
