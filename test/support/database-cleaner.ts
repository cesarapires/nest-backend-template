import type { DataSource } from 'typeorm';

export class DatabaseCleaner {

  private static readonly PRESERVED_TABLES = ['migrations'];

  public static async truncateAll(dataSource: DataSource): Promise<void> {
    const tables: { tablename: string }[] = await dataSource.query(
      'SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND NOT (tablename = ANY($1))',
      [DatabaseCleaner.PRESERVED_TABLES],
    );

    if (tables.length === 0) {
      return;
    }

    const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
    await dataSource.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
  }
}
