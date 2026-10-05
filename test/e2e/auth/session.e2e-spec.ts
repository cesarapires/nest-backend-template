import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app.module.js';
import { Session } from '@/auth/session.entity.js';
import { HttpConfig } from '@/config/http.config.js';
import { User } from '@/users/user.entity.js';
import { DatabaseCleaner } from '../../support/database-cleaner.js';

describe('Login, refresh e logout (e2e)', () => {
  let app: INestApplication<App>;

  let dataSource: DataSource;

  const SENHA = 'senha-forte-123';

  function post(rota: string, body: object) {
    return request(app.getHttpServer()).post(`/api/v1/auth/${rota}`).send(body);
  }

  function login(email = 'ana@exemplo.com', password = SENHA) {
    return post('login', { email, password });
  }

  function payloadDoJwt(token: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<string, unknown>;
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
    await post('register', { email: 'ana@exemplo.com', password: SENHA }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('login', () => {
    it('deve responder 200 com access token e refresh token', async () => {
      const response = await login().expect(200);

      expect(response.body).toMatchObject({ tokenType: 'Bearer', accessTokenExpiresIn: 900 });
      expect(response.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(response.body.refreshToken).toMatch(/^[0-9a-f-]{36}\.[\w-]{43}$/);
    });

    it('deve colocar no access token só identificadores públicos', async () => {
      const response = await login().expect(200);
      const user = await dataSource.getRepository(User).findOneByOrFail({ email: 'ana@exemplo.com' });

      const payload = payloadDoJwt(response.body.accessToken);

      expect(payload).toMatchObject({ sub: user.publicId, role: 'USER', sid: response.body.refreshToken.split('.')[0] });
      expect(payload.exp).toBe((payload.iat as number) + 900);
      expect(JSON.stringify(payload)).not.toContain(`"${user.id}"`);
    });

    it('deve aceitar o e-mail com maiúsculas e espaços', async () => {
      await login(' ANA@Exemplo.com ').expect(200);
    });

    it('deve registrar o último login e abrir a sessão guardando só o hash do refresh token', async () => {
      const response = await login().set('User-Agent', 'Navegador de Teste').expect(200);

      const user = await dataSource.getRepository(User).findOneByOrFail({ email: 'ana@exemplo.com' });
      const sessions = await dataSource.getRepository(Session).find();

      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].userAgent).toBe('Navegador de Teste');
      expect(sessions[0].refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(response.body.refreshToken).not.toContain(sessions[0].refreshTokenHash);
    });

    it('deve responder igual para senha errada e e-mail inexistente', async () => {
      const senhaErrada = await login('ana@exemplo.com', 'senha-errada').expect(401);
      const emailInexistente = await login('ninguem@exemplo.com').expect(401);

      expect(senhaErrada.body.detail).toBe('E-mail ou senha inválidos');
      expect(emailInexistente.body.detail).toBe(senhaErrada.body.detail);
      expect(await dataSource.getRepository(Session).count()).toBe(0);
    });

    it('não deve permitir login de usuário apagado', async () => {
      await dataSource.getRepository(User).softDelete({ email: 'ana@exemplo.com' });

      await login().expect(401);
    });
  });

  describe('refresh', () => {
    it('deve trocar o refresh token por um novo par de tokens', async () => {
      const { body: primeiro } = await login().expect(200);

      const { body: segundo } = await post('refresh', { refreshToken: primeiro.refreshToken }).expect(200);

      expect(segundo.refreshToken).not.toBe(primeiro.refreshToken);
      expect(segundo.refreshToken.split('.')[0]).toBe(primeiro.refreshToken.split('.')[0]);
      expect(payloadDoJwt(segundo.accessToken).sub).toBe(payloadDoJwt(primeiro.accessToken).sub);
    });

    it('deve recusar o refresh token já usado e encerrar a sessão por suspeita de roubo', async () => {
      const { body: primeiro } = await login().expect(200);
      const { body: segundo } = await post('refresh', { refreshToken: primeiro.refreshToken }).expect(200);

      const reuso = await post('refresh', { refreshToken: primeiro.refreshToken }).expect(401);

      expect(reuso.body.detail).toBe('Sessão inválida ou expirada');
      await post('refresh', { refreshToken: segundo.refreshToken }).expect(401);
    });

    it('deve recusar sessão expirada', async () => {
      const { body } = await login().expect(200);
      await dataSource.getRepository(Session).updateAll({ expiresAt: new Date(Date.now() - 1000) });

      await post('refresh', { refreshToken: body.refreshToken }).expect(401);
    });

    it('deve recusar refresh token inexistente ou malformado', async () => {
      await post('refresh', { refreshToken: 'token-qualquer' }).expect(401);
      await post('refresh', { refreshToken: `0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10.${'a'.repeat(43)}` }).expect(401);
    });

    it('não deve renovar a sessão de usuário apagado', async () => {
      const { body } = await login().expect(200);
      await dataSource.getRepository(User).softDelete({ email: 'ana@exemplo.com' });

      await post('refresh', { refreshToken: body.refreshToken }).expect(401);
    });
  });

  describe('logout', () => {
    it('deve encerrar a sessão e impedir novas renovações', async () => {
      const { body } = await login().expect(200);

      await post('logout', { refreshToken: body.refreshToken }).expect(204);

      await post('refresh', { refreshToken: body.refreshToken }).expect(401);
      expect((await dataSource.getRepository(Session).findOneByOrFail({})).revokedAt).toBeInstanceOf(Date);
    });

    it('deve responder 204 mesmo para token inválido, sem revelar se a sessão existe', async () => {
      await post('logout', { refreshToken: 'token-qualquer' }).expect(204);
    });

    it('deve encerrar só a sessão do token informado', async () => {
      const { body: celular } = await login().expect(200);
      const { body: computador } = await login().expect(200);

      await post('logout', { refreshToken: celular.refreshToken }).expect(204);

      await post('refresh', { refreshToken: computador.refreshToken }).expect(200);
    });
  });
});
