import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '@/app.module.js';

describe('Migrations (e2e)', () => {
  it('deve ter migration para todas as mudanças nas entidades', async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleFixture.createNestApplication();
    await app.init();

    const pendentes = await app.get(DataSource).driver.createSchemaBuilder().log();
    await app.close();

    expect(pendentes.upQueries.map((query) => query.query)).toEqual([]);
  });
});
