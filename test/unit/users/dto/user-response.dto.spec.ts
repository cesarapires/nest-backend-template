import { UserResponseDto } from '@/users/dto/user-response.dto.js';
import { UserRole } from '@/users/user-role.enum.js';
import { User } from '@/users/user.entity.js';

describe('UserResponseDto', () => {
  const criadoEm = new Date('2026-10-05T12:00:00Z');

  const user = Object.assign(new User(), {
    id: '1',
    publicId: '11111111-1111-4111-8111-111111111111',
    createdAt: criadoEm,
    updatedAt: criadoEm,
    deletedAt: null,
    version: 2,
    email: 'ana@exemplo.com',
    passwordHash: 'hash-secreto',
    role: UserRole.USER,
    emailVerifiedAt: null,
    lastLoginAt: criadoEm,
  });

  it('deve devolver os dados da conta usando o id público', () => {
    expect(JSON.parse(JSON.stringify(new UserResponseDto(user)))).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-10-05T12:00:00.000Z',
      updatedAt: '2026-10-05T12:00:00.000Z',
      email: 'ana@exemplo.com',
      role: 'USER',
      emailVerifiedAt: null,
    });
  });

  it('não deve expor o hash da senha, o id interno nem a versão', () => {
    const json = JSON.stringify(new UserResponseDto(user));

    expect(json).not.toContain('hash-secreto');
    expect(json).not.toContain('"version"');
    expect(json).not.toContain('lastLoginAt');
    expect(json).not.toMatch(/"id":"1"/);
  });
});
