import { PasswordHasher } from '@/auth/password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('deve gerar o hash com argon2id, sem guardar a senha', async () => {
    const passwordHash = await hasher.hash('senha-forte-123');

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toContain('senha-forte-123');
  });

  it('deve gerar hashes diferentes para a mesma senha', async () => {
    const [primeiro, segundo] = await Promise.all([hasher.hash('senha-forte-123'), hasher.hash('senha-forte-123')]);

    expect(primeiro).not.toBe(segundo);
  });

  it('deve confirmar a senha correta e recusar a errada', async () => {
    const passwordHash = await hasher.hash('senha-forte-123');

    await expect(hasher.verify(passwordHash, 'senha-forte-123')).resolves.toBe(true);
    await expect(hasher.verify(passwordHash, 'senha-errada')).resolves.toBe(false);
  });

  it('deve recusar a senha quando o usuário não tem hash', async () => {
    await expect(hasher.verify(null, 'senha-forte-123')).resolves.toBe(false);
  });
});
