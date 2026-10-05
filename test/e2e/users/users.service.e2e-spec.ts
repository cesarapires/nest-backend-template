import { ConflictException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '@/app.module.js';
import { DatabaseError } from '@/database/database-error.js';
import { UserRole } from '@/users/user-role.enum.js';
import { User } from '@/users/user.entity.js';
import { UsersService } from '@/users/users.service.js';
import { DatabaseCleaner } from '../../support/database-cleaner.js';

describe('UsersService (e2e)', () => {
  let app: INestApplication;

  let dataSource: DataSource;

  let usersService: UsersService;

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  function dados(email: string) {
    return { email, passwordHash: 'hash-da-senha' };
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    usersService = app.get(UsersService);
  });

  beforeEach(async () => {
    await DatabaseCleaner.truncateAll(dataSource);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createUser', () => {
    it('deve criar o usuário com o papel USER', async () => {
      const user = await usersService.createUser(dados('ana@exemplo.com'));

      expect(user.publicId).toMatch(UUID);
      expect(user.role).toBe(UserRole.USER);
    });

    it('deve guardar o e-mail sem espaços e em minúsculas', async () => {
      const user = await usersService.createUser(dados('  Ana@Exemplo.COM '));

      expect(user.email).toBe('ana@exemplo.com');
    });

    it('deve recusar e-mail já cadastrado, mesmo com letras maiúsculas', async () => {
      await usersService.createUser(dados('ana@exemplo.com'));

      await expect(usersService.createUser(dados('ANA@exemplo.com'))).rejects.toThrow(new ConflictException('E-mail já cadastrado'));
    });

    it('deve permitir reutilizar o e-mail de um usuário apagado', async () => {
      const antigo = await usersService.createUser(dados('ana@exemplo.com'));
      await dataSource.getRepository(User).softDelete({ id: antigo.id });

      await expect(usersService.createUser(dados('ana@exemplo.com'))).resolves.toBeInstanceOf(User);
    });

    it('deve deixar o índice único do banco barrar a duplicidade em cadastros simultâneos', async () => {
      await usersService.createUser(dados('ana@exemplo.com'));
      vi.spyOn(Repository.prototype, 'existsBy').mockResolvedValue(false);

      await expect(usersService.createUser(dados('ana@exemplo.com'))).rejects.toSatisfy((error) => DatabaseError.isUniqueViolation(error));
    });
  });

  describe('createAdmin', () => {
    it('deve criar o usuário com o papel ADMIN', async () => {
      const admin = await usersService.createAdmin(dados(' Equipe@App.local '));

      expect(admin.role).toBe(UserRole.ADMIN);
      expect(admin.email).toBe('equipe@app.local');
    });

    it('deve recusar e-mail já usado por outro usuário', async () => {
      await usersService.createUser(dados('ana@exemplo.com'));

      await expect(usersService.createAdmin(dados('ana@exemplo.com'))).rejects.toThrow(new ConflictException('E-mail já cadastrado'));
    });
  });

  describe('findByEmail', () => {
    it('deve encontrar o usuário ignorando espaços e maiúsculas', async () => {
      const user = await usersService.createUser(dados('ana@exemplo.com'));

      const encontrado = await usersService.findByEmail(' ANA@Exemplo.com ');

      expect(encontrado?.id).toBe(user.id);
    });

    it('deve retornar vazio quando o e-mail não existe', async () => {
      await expect(usersService.findByEmail('ninguem@exemplo.com')).resolves.toBeNull();
    });
  });

  describe('findByPublicId', () => {
    it('deve encontrar o usuário pelo id público', async () => {
      const user = await usersService.createUser(dados('ana@exemplo.com'));

      await expect(usersService.findByPublicId(user.publicId)).resolves.toMatchObject({ email: 'ana@exemplo.com' });
    });

    it('não deve encontrar usuário apagado', async () => {
      const user = await usersService.createUser(dados('ana@exemplo.com'));
      await dataSource.getRepository(User).softDelete({ id: user.id });

      await expect(usersService.findByPublicId(user.publicId)).resolves.toBeNull();
    });
  });
});
