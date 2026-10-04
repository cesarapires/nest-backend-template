import './load-test-env.js';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { TypeOrmConfigService } from '@/database/typeorm-config.service.js';

export class TestDatabase {

  private static readonly TEST_DATABASE_NAME = /^[a-z0-9_]+_test$/;

  private static readonly MAINTENANCE_DATABASE = 'postgres';

  private static readonly MIGRATIONS_DIRECTORY = join(import.meta.dirname, '..', '..', 'src', 'database', 'migrations');

  static async prepare(): Promise<void> {
    const options = TypeOrmConfigService.createConnectionOptions();
    const database = String(options.database);
    TestDatabase.assertIsTestDatabase(database);
    await TestDatabase.createIfMissing(database);
    await TestDatabase.runMigrations();
  }

  private static assertIsTestDatabase(database: string): void {
    if (!TestDatabase.TEST_DATABASE_NAME.test(database)) {
      throw new Error(`Os testes e2e só rodam em banco terminado em _test, mas POSTGRES_DB é "${database}"`);
    }
  }

  private static async createIfMissing(database: string): Promise<void> {
    const maintenance = new DataSource({ ...TypeOrmConfigService.createConnectionOptions(), database: TestDatabase.MAINTENANCE_DATABASE });
    await maintenance.initialize();
    const existing: unknown[] = await maintenance.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);

    if (existing.length === 0) {
      await maintenance.query(`CREATE DATABASE "${database}"`);
    }

    await maintenance.destroy();
  }

  private static async runMigrations(): Promise<void> {
    const dataSource = new DataSource({ ...TypeOrmConfigService.createConnectionOptions(), migrations: await TestDatabase.loadMigrations() });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.destroy();
  }

  private static async loadMigrations(): Promise<Function[]> {
    if (!existsSync(TestDatabase.MIGRATIONS_DIRECTORY)) {
      return [];
    }

    const files = readdirSync(TestDatabase.MIGRATIONS_DIRECTORY).filter((file) => file.endsWith('.ts'));
    const modules: Record<string, unknown>[] = await Promise.all(files.map((file) => import(join(TestDatabase.MIGRATIONS_DIRECTORY, file))));
    return modules.flatMap((module) => Object.values(module)).filter((value): value is Function => typeof value === 'function');
  }
}

export default async function setup(): Promise<void> {
  await TestDatabase.prepare();
}
