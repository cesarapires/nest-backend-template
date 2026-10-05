import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app.module.js';
import { HttpConfig } from '@/config/http.config.js';
import { SwaggerConfig } from '@/config/swagger.config.js';
import { DatabaseSeeder } from '@/database/seed/database-seeder.js';
import { DevelopmentUsers } from '@/database/seed/development-users.js';
import { UserRole } from '@/users/user-role.enum.js';
import { UsersService } from '@/users/users.service.js';
import { DatabaseCleaner } from '../../support/database-cleaner.js';

describe('Seed e exemplos da documentação (e2e)', () => {
  let app: INestApplication<App>;

  let dataSource: DataSource;

  let usersService: UsersService;

  type Schema = { properties: Record<string, { example?: unknown }> };

  function exemplos(schema: Schema): Record<string, unknown> {
    return Object.fromEntries(Object.entries(schema.properties).map(([campo, propriedade]) => [campo, propriedade.example]));
  }

  async function schemas(): Promise<Record<string, Schema>> {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    return response.body.components.schemas;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    SwaggerConfig.setup(app);
    await app.init();
    dataSource = app.get(DataSource);
    usersService = app.get(UsersService);
  });

  beforeEach(async () => {
    await DatabaseCleaner.truncateAll(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve criar o usuário comum e o admin de desenvolvimento', async () => {
    const criados = await DatabaseSeeder.run();

    const user = await usersService.findByEmail(DevelopmentUsers.USER_EMAIL);
    const admin = await usersService.findByEmail(DevelopmentUsers.ADMIN_EMAIL);

    expect(criados).toEqual([DevelopmentUsers.USER_EMAIL, DevelopmentUsers.ADMIN_EMAIL]);
    expect(user?.role).toBe(UserRole.USER);
    expect(admin?.role).toBe(UserRole.ADMIN);
  });

  it('deve poder rodar de novo sem duplicar nem falhar', async () => {
    await DatabaseSeeder.run();

    await expect(DatabaseSeeder.run()).resolves.toEqual([]);
  });

  it('deve fazer login com o exemplo do LoginDto depois do seed', async () => {
    await DatabaseSeeder.run();
    const { LoginDto } = await schemas();

    await request(app.getHttpServer()).post('/api/v1/auth/login').send(exemplos(LoginDto)).expect(200);
  });

  it('deve cadastrar com o exemplo do RegisterDto mesmo depois do seed', async () => {
    await DatabaseSeeder.run();
    const { RegisterDto } = await schemas();

    await request(app.getHttpServer()).post('/api/v1/auth/register').send(exemplos(RegisterDto)).expect(201);
  });
});
