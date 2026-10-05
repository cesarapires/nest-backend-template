import { DataSource, type Repository } from 'typeorm';
import { TypeOrmConfigService } from '@/database/typeorm-config.service.js';
import { UserRole } from '@/users/user-role.enum.js';
import { User } from '@/users/user.entity.js';
import { DatabaseCleaner } from '../../support/database-cleaner.js';

describe('User (e2e)', () => {
  let dataSource: DataSource;

  let usersRepository: Repository<User>;

  beforeAll(async () => {
    dataSource = new DataSource({ ...TypeOrmConfigService.createConnectionOptions(), entities: [User] });
    await dataSource.initialize();
    usersRepository = dataSource.getRepository(User);
  });

  beforeEach(async () => {
    await DatabaseCleaner.truncateAll(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  function criarUsuario(email: string) {
    return usersRepository.save(usersRepository.create({ email, passwordHash: 'hash' }));
  }

  it('deve criar o usuário com o papel USER por padrão', async () => {
    const user = await criarUsuario('ana@exemplo.com');

    const salvo = await usersRepository.findOneByOrFail({ id: user.id });

    expect(salvo.role).toBe(UserRole.USER);
    expect(salvo.emailVerifiedAt).toBeNull();
    expect(salvo.lastLoginAt).toBeNull();
  });

  it('deve recusar dois usuários ativos com o mesmo e-mail', async () => {
    await criarUsuario('ana@exemplo.com');

    await expect(criarUsuario('ana@exemplo.com')).rejects.toThrow(/duplicate key/);
  });

  it('deve permitir reutilizar o e-mail de um usuário apagado', async () => {
    const antigo = await criarUsuario('ana@exemplo.com');
    await usersRepository.softDelete({ id: antigo.id });

    await expect(criarUsuario('ana@exemplo.com')).resolves.toBeInstanceOf(User);
  });
});
