import { RefreshToken } from '@/auth/refresh-token.js';

describe('RefreshToken', () => {
  const SESSAO = '0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10';

  it('deve gerar o token no formato <sessão>.<segredo>', () => {
    const token = RefreshToken.generate(SESSAO);

    expect(token.toString()).toMatch(/^0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10\.[\w-]{43}$/);
  });

  it('deve gerar um id de sessão novo quando nenhum é informado', () => {
    expect(RefreshToken.generate().sessionPublicId).not.toBe(RefreshToken.generate().sessionPublicId);
  });

  it('deve gerar segredos diferentes a cada token', () => {
    expect(RefreshToken.generate(SESSAO).toString()).not.toBe(RefreshToken.generate(SESSAO).toString());
  });

  it('deve ler de volta um token gerado', () => {
    const token = RefreshToken.generate(SESSAO);

    const lido = RefreshToken.parse(token.toString());

    expect(lido?.sessionPublicId).toBe(SESSAO);
    expect(lido?.matches(token.hash())).toBe(true);
  });

  it('deve recusar valores fora do formato', () => {
    expect(RefreshToken.parse('qualquer-coisa')).toBeNull();
    expect(RefreshToken.parse(`${SESSAO}.curto`)).toBeNull();
    expect(RefreshToken.parse(`nao-e-uuid.${'a'.repeat(43)}`)).toBeNull();
  });

  it('deve guardar só o hash, sem o segredo', () => {
    const token = RefreshToken.generate(SESSAO);
    const segredo = token.toString().split('.')[1];

    expect(token.hash()).toMatch(/^[0-9a-f]{64}$/);
    expect(token.hash()).not.toContain(segredo);
  });

  it('não deve confirmar o hash de outro token', () => {
    const token = RefreshToken.generate(SESSAO);

    expect(token.matches(RefreshToken.generate(SESSAO).hash())).toBe(false);
    expect(token.matches('abc')).toBe(false);
  });
});
