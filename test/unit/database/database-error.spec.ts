import { QueryFailedError } from 'typeorm';
import { DatabaseError } from '@/database/database-error.js';

describe('DatabaseError', () => {
  function erroDoBanco(code: string): QueryFailedError {
    return new QueryFailedError('INSERT ...', [], Object.assign(new Error('erro do banco'), { code }));
  }

  it('deve reconhecer violação de índice único do Postgres', () => {
    expect(DatabaseError.isUniqueViolation(erroDoBanco('23505'))).toBe(true);
  });

  it('não deve confundir outros erros do banco com violação de índice único', () => {
    expect(DatabaseError.isUniqueViolation(erroDoBanco('23503'))).toBe(false);
  });

  it('não deve reconhecer erros que não vêm do banco', () => {
    expect(DatabaseError.isUniqueViolation(Object.assign(new Error('falha'), { code: '23505' }))).toBe(false);
    expect(DatabaseError.isUniqueViolation(undefined)).toBe(false);
  });
});
