import { EnvUtils } from '@/utils/env.utils.js';

describe('EnvUtils', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getRequired', () => {
    it('deve retornar o valor da variável', () => {
      vi.stubEnv('TEST_VARIABLE', 'value');

      expect(EnvUtils.getRequired('TEST_VARIABLE')).toBe('value');
    });

    it('deve lançar erro quando a variável não está definida', () => {
      vi.stubEnv('TEST_VARIABLE', undefined);

      expect(() => EnvUtils.getRequired('TEST_VARIABLE')).toThrow('Variável de ambiente TEST_VARIABLE não definida');
    });

    it('deve lançar erro quando a variável está vazia', () => {
      vi.stubEnv('TEST_VARIABLE', '');

      expect(() => EnvUtils.getRequired('TEST_VARIABLE')).toThrow('Variável de ambiente TEST_VARIABLE não definida');
    });
  });

  describe('getOptional', () => {
    it('deve retornar o valor da variável', () => {
      vi.stubEnv('TEST_VARIABLE', 'value');

      expect(EnvUtils.getOptional('TEST_VARIABLE', 'default')).toBe('value');
    });

    it('deve retornar o valor padrão quando a variável não está definida', () => {
      vi.stubEnv('TEST_VARIABLE', undefined);

      expect(EnvUtils.getOptional('TEST_VARIABLE', 'default')).toBe('default');
    });

    it('deve retornar o valor padrão quando a variável está vazia', () => {
      vi.stubEnv('TEST_VARIABLE', '');

      expect(EnvUtils.getOptional('TEST_VARIABLE', 'default')).toBe('default');
    });
  });
});
