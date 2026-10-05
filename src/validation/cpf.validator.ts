import { Validate, ValidatorConstraint, type ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isCpf' })
export class CpfValidator implements ValidatorConstraintInterface {

  private static readonly ELEVEN_DIGITS = /^\d{11}$/;

  private static readonly REPEATED_DIGITS = /^(\d)\1{10}$/;

  public static isValid(cpf: unknown): boolean {
    if (typeof cpf !== 'string' || !CpfValidator.ELEVEN_DIGITS.test(cpf) || CpfValidator.REPEATED_DIGITS.test(cpf)) {
      return false;
    }

    const digits = cpf.split('').map(Number);

    return CpfValidator.checkDigit(digits.slice(0, 9)) === digits[9] && CpfValidator.checkDigit(digits.slice(0, 10)) === digits[10];
  }

  private static checkDigit(digits: number[]): number {
    const sum = digits.reduce((total, digit, index) => total + digit * (digits.length + 1 - index), 0);
    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  }

  public validate(cpf: unknown): boolean {
    return CpfValidator.isValid(cpf);
  }

  public defaultMessage(): string {
    return 'cpf inválido';
  }
}

export function IsCpf(): PropertyDecorator {
  return Validate(CpfValidator);
}
