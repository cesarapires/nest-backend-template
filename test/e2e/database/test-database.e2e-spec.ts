import { DataSource } from 'typeorm';
import { TypeOrmConfigService } from '@/database/typeorm-config.service.js';

describe('Banco de teste (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource(TypeOrmConfigService.createConnectionOptions());
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('deve conectar no banco de teste e não no de desenvolvimento', async () => {
    const [{ database }]: { database: string }[] = await dataSource.query('SELECT current_database() AS database');

    expect(database).toMatch(/_test$/);
  });

  it('deve ter a tabela de controle de migrations criada pelo setup', async () => {
    const [{ existe }]: { existe: boolean }[] = await dataSource.query('SELECT to_regclass(\'public.migrations\') IS NOT NULL AS existe');

    expect(existe).toBe(true);
  });
});
