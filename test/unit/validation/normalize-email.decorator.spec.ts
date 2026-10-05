import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from '@/validation/normalize-email.decorator.js';

class ComEmail {

  @NormalizeEmail()
  public email: unknown;
}

describe('NormalizeEmail', () => {
  it('deve tirar os espaços das pontas e passar para minúsculas', () => {
    expect(plainToInstance(ComEmail, { email: '  Ana@Exemplo.COM ' }).email).toBe('ana@exemplo.com');
  });

  it('deve manter valores que não são texto para a validação recusar', () => {
    expect(plainToInstance(ComEmail, { email: 123 }).email).toBe(123);
  });
});
