import { CpfValidator } from '@/validation/cpf.validator.js';

describe('CpfValidator', () => {
  it('deve aceitar CPFs com dígitos verificadores corretos', () => {
    expect(CpfValidator.isValid('52998224725')).toBe(true);
    expect(CpfValidator.isValid('11144477735')).toBe(true);
  });

  it('deve aceitar CPF cujo dígito verificador calculado é zero', () => {
    expect(CpfValidator.isValid('12345678909')).toBe(true);
  });

  it('deve recusar CPF com dígito verificador errado', () => {
    expect(CpfValidator.isValid('52998224724')).toBe(false);
    expect(CpfValidator.isValid('52998224715')).toBe(false);
  });

  it('deve recusar CPF com todos os dígitos iguais', () => {
    expect(CpfValidator.isValid('11111111111')).toBe(false);
    expect(CpfValidator.isValid('00000000000')).toBe(false);
  });

  it('deve recusar CPF fora do formato de 11 dígitos', () => {
    expect(CpfValidator.isValid('529.982.247-25')).toBe(false);
    expect(CpfValidator.isValid('5299822472')).toBe(false);
    expect(CpfValidator.isValid(52998224725)).toBe(false);
  });
});
