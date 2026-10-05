import type { INestApplication } from '@nestjs/common';

describe('SwaggerConfig', () => {
  const app = {} as INestApplication;

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  async function carregarCom(nodeEnv: string | undefined) {
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.resetModules();
    const { SwaggerConfig } = await import('@/config/swagger.config.js');
    return { SwaggerConfig, setup: vi.spyOn(SwaggerConfig, 'setup').mockImplementation(() => undefined) };
  }

  it('deve publicar a documentação em desenvolvimento', async () => {
    const { SwaggerConfig, setup } = await carregarCom('development');

    SwaggerConfig.apply(app);

    expect(setup).toHaveBeenCalledWith(app);
  });

  it('deve publicar a documentação quando NODE_ENV não está definido', async () => {
    const { SwaggerConfig, setup } = await carregarCom(undefined);

    SwaggerConfig.apply(app);

    expect(setup).toHaveBeenCalledWith(app);
  });

  it('não deve publicar a documentação em produção', async () => {
    const { SwaggerConfig, setup } = await carregarCom('production');

    SwaggerConfig.apply(app);

    expect(setup).not.toHaveBeenCalled();
  });
});
