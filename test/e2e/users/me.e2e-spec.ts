import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app.module.js';
import { HttpConfig } from '@/config/http.config.js';
import { DatabaseSeeder } from '@/database/seed/database-seeder.js';
import { DevelopmentUsers } from '@/database/seed/development-users.js';
import { User } from '@/users/user.entity.js';
import { DatabaseCleaner } from '../../support/database-cleaner.js';

describe('GET /api/v1/users/me (e2e)', () => {
  let app: INestApplication<App>;

  let dataSource: DataSource;

  let jwtService: JwtService;

  async function tokenDe(email: string): Promise<string> {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email, password: DevelopmentUsers.PASSWORD }).expect(200);
    return response.body.accessToken;
  }

  async function tokenDeApagado(): Promise<string> {
    const { publicId } = await dataSource.getRepository(User).findOneOrFail({ where: { email: DevelopmentUsers.ADMIN_EMAIL }, withDeleted: true });
    return jwtService.signAsync({ sub: publicId, role: 'ADMIN', sid: '0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10' });
  }

  function me(token?: string) {
    const chamada = request(app.getHttpServer()).get('/api/v1/users/me');
    return token ? chamada.set('Authorization', `Bearer ${token}`) : chamada;
  }

  function payload(token: string): Record<string, unknown> {
    const { sub, role, sid } = jwtService.decode<Record<string, unknown>>(token);
    return { sub, role, sid };
  }

  function codificar(parte: object): string {
    return Buffer.from(JSON.stringify(parte)).toString('base64url');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    await DatabaseCleaner.truncateAll(dataSource);
    await DatabaseSeeder.run();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve devolver o usuário logado', async () => {
    const response = await me(await tokenDe(DevelopmentUsers.USER_EMAIL)).expect(200);

    expect(response.body).toMatchObject({ email: DevelopmentUsers.USER_EMAIL, role: 'USER' });
    expect(response.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('deve devolver o admin logado', async () => {
    const response = await me(await tokenDe(DevelopmentUsers.ADMIN_EMAIL)).expect(200);

    expect(response.body).toMatchObject({ email: DevelopmentUsers.ADMIN_EMAIL, role: 'ADMIN' });
  });

  it('deve responder 401 em Problem Details sem token', async () => {
    const response = await me().expect(401);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ status: 401, title: 'Unauthorized', detail: 'Faça login para continuar', instance: '/api/v1/users/me' });
  });

  it('deve recusar token malformado', async () => {
    await me('nao-e-um-jwt').expect(401);
  });

  it('deve responder com a mesma mensagem qualquer que seja o motivo da recusa', async () => {
    const token = await tokenDe(DevelopmentUsers.USER_EMAIL);
    const vencido = await jwtService.signAsync(payload(token), { expiresIn: -60 });
    await dataSource.getRepository(User).softDelete({ email: DevelopmentUsers.ADMIN_EMAIL });
    const deUsuarioApagado = await tokenDeApagado();

    const respostas = await Promise.all([me(), me('nao-e-um-jwt'), me(vencido), me(deUsuarioApagado)]);

    expect(respostas.map((response) => response.body.detail)).toEqual(Array(4).fill('Faça login para continuar'));
  });

  it('deve aceitar um token bem assinado e dentro da validade', async () => {
    const token = await tokenDe(DevelopmentUsers.USER_EMAIL);

    await me(await jwtService.signAsync(payload(token))).expect(200);
  });

  it('deve recusar token vencido', async () => {
    const token = await tokenDe(DevelopmentUsers.USER_EMAIL);
    const vencido = await jwtService.signAsync(payload(token), { expiresIn: -60 });

    await me(vencido).expect(401);
  });

  it('deve recusar token assinado com outro segredo', async () => {
    const token = await tokenDe(DevelopmentUsers.USER_EMAIL);
    const falsificado = await jwtService.signAsync(payload(token), { secret: 'outro-segredo-qualquer-com-32-caracteres!' });

    await me(falsificado).expect(401);
  });

  it('deve recusar token sem assinatura (alg none)', async () => {
    const token = await tokenDe(DevelopmentUsers.USER_EMAIL);
    const semAssinatura = `${codificar({ alg: 'none', typ: 'JWT' })}.${token.split('.')[1]}.`;

    await me(semAssinatura).expect(401);
  });

  it('deve recusar o token de um usuário que foi apagado', async () => {
    const token = await tokenDe(DevelopmentUsers.USER_EMAIL);
    await dataSource.getRepository(User).softDelete({ email: DevelopmentUsers.USER_EMAIL });

    await me(token).expect(401);
  });

  it('deve continuar liberando as rotas públicas sem token', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });
});
