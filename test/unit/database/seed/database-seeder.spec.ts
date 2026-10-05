describe('DatabaseSeeder', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('não deve rodar em produção', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('POSTGRES_HOST', 'localhost');
    vi.stubEnv('POSTGRES_PORT', '5432');
    vi.stubEnv('POSTGRES_USER', 'x');
    vi.stubEnv('POSTGRES_PASSWORD', 'x');
    vi.stubEnv('POSTGRES_DB', 'x');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.resetModules();
    const { DatabaseSeeder } = await import('@/database/seed/database-seeder.js');

    await expect(DatabaseSeeder.run()).rejects.toThrow('O seed cria usuários de desenvolvimento e não roda em produção');
  });
});
