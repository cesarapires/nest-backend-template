describe('AuthConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function carregarCom(jwtSecret: string) {
    vi.stubEnv('JWT_SECRET', jwtSecret);
    vi.resetModules();
    return import('@/auth/auth.config.js');
  }

  it('deve aceitar segredo com pelo menos 32 caracteres', async () => {
    const { AuthConfig } = await carregarCom('a'.repeat(32));

    expect(AuthConfig.JWT_SECRET).toBe('a'.repeat(32));
  });

  it('deve impedir a aplicação de subir com segredo curto', async () => {
    await expect(carregarCom('a'.repeat(31))).rejects.toThrow('JWT_SECRET deve ter pelo menos 32 caracteres');
  });

  it('deve usar 15 minutos de access token e 30 dias de refresh token por padrão', async () => {
    const { AuthConfig } = await carregarCom('a'.repeat(32));

    expect(AuthConfig.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(AuthConfig.REFRESH_TOKEN_TTL_DAYS).toBe(30);
  });
});
