import type { ValidationError } from 'class-validator';
import { InvalidField } from '@/http/invalid-field.js';
import { InvalidFieldsException } from '@/http/invalid-fields.exception.js';

describe('InvalidFieldsException', () => {
  function erro(property: string, constraints?: Record<string, string>, children?: ValidationError[]): ValidationError {
    return { property, constraints, children };
  }

  it('deve gerar um item para cada regra violada', () => {
    const exception = InvalidFieldsException.fromValidationErrors([erro('email', { isEmail: 'email inválido', isNotEmpty: 'email vazio' })]);

    expect(exception.fields).toEqual([new InvalidField('email', 'email inválido'), new InvalidField('email', 'email vazio')]);
  });

  it('deve montar o caminho completo de campos aninhados', () => {
    const exception = InvalidFieldsException.fromValidationErrors([erro('atleta', undefined, [erro('endereco', undefined, [erro('cep', { matches: 'cep inválido' })])])]);

    expect(exception.fields).toEqual([new InvalidField('atleta.endereco.cep', 'cep inválido')]);
  });

  it('deve indicar a posição de itens inválidos em listas', () => {
    const exception = InvalidFieldsException.fromValidationErrors([erro('atletas', undefined, [erro('1', undefined, [erro('nome', { isNotEmpty: 'nome vazio' })])])]);

    expect(exception.fields).toEqual([new InvalidField('atletas.1.nome', 'nome vazio')]);
  });

  it('deve responder com status 400 e a mensagem padrão', () => {
    const exception = InvalidFieldsException.fromValidationErrors([]);

    expect(exception.getStatus()).toBe(400);
    expect(exception.message).toBe('Os dados enviados são inválidos');
  });
});
