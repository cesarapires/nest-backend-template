import { Injectable, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DatabaseModule } from '@/database/database.module.js';
import { TransactionManager } from '@/database/transaction/transaction-manager.js';
import { Transactional } from '@/database/transaction/transactional.decorator.js';
import { TypeOrmConfigService } from '@/database/typeorm-config.service.js';
import { User } from '@/users/user.entity.js';
import { DatabaseCleaner } from '../../support/database-cleaner.js';

class FalhaProposital extends Error {}

@Injectable()
class ContasService {

  constructor(@InjectRepository(User) public readonly usersRepository: Repository<User>) {}

  @Transactional()
  public async criarDuas(falharNoFim: boolean): Promise<void> {
    await this.criar('ana@exemplo.com');
    await this.criar('bruno@exemplo.com');

    if (falharNoFim) {
      throw new FalhaProposital();
    }
  }

  @Transactional()
  public async criarComInterna(falharNoFim: boolean): Promise<void> {
    await this.criarInterna('carla@exemplo.com');

    if (falharNoFim) {
      throw new FalhaProposital();
    }
  }

  @Transactional()
  public async criarInterna(email: string): Promise<void> {
    await this.criar(email);
  }

  @Transactional()
  public async managerDentroDaTransacao() {
    return { transacao: TransactionManager.currentManager(), repositorio: this.usersRepository.manager };
  }

  public async criar(email: string): Promise<void> {
    await this.usersRepository.save(this.usersRepository.create({ email, passwordHash: 'hash' }));
  }
}

@Module({
  imports: [DatabaseModule.forFeature([User])],
  providers: [ContasService],
})
class ContasModule {}

describe('@Transactional (e2e)', () => {
  let app: INestApplication;

  let contas: ContasService;

  let dataSource: DataSource;

  async function emails(): Promise<string[]> {
    const users = await dataSource.getRepository(User).find({ order: { email: 'ASC' } });
    return users.map((user) => user.email);
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }), ContasModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    contas = app.get(ContasService);
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await DatabaseCleaner.truncateAll(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve confirmar todas as gravações quando o método termina sem erro', async () => {
    await contas.criarDuas(false);

    await expect(emails()).resolves.toEqual(['ana@exemplo.com', 'bruno@exemplo.com']);
  });

  it('deve desfazer todas as gravações quando o método falha', async () => {
    await expect(contas.criarDuas(true)).rejects.toThrow(FalhaProposital);

    await expect(emails()).resolves.toEqual([]);
  });

  it('deve fazer o método interno participar da transação externa', async () => {
    await expect(contas.criarComInterna(true)).rejects.toThrow(FalhaProposital);

    await expect(emails()).resolves.toEqual([]);
  });

  it('deve injetar repositórios que usam o manager da transação em andamento', async () => {
    const { transacao, repositorio } = await contas.managerDentroDaTransacao();

    expect(transacao).toBeDefined();
    expect(repositorio).toBe(transacao);
  });

  it('deve usar o repositório normal fora de transação', async () => {
    await contas.criar('dani@exemplo.com');

    expect(TransactionManager.currentManager()).toBeUndefined();
    expect(contas.usersRepository.manager).toBe(dataSource.manager);
    await expect(emails()).resolves.toEqual(['dani@exemplo.com']);
  });

  it('deve isolar transações executadas ao mesmo tempo', async () => {
    const resultados = await Promise.allSettled([contas.criarDuas(true), contas.criarInterna('eva@exemplo.com')]);

    expect(resultados.map((resultado) => resultado.status)).toEqual(['rejected', 'fulfilled']);
    await expect(emails()).resolves.toEqual(['eva@exemplo.com']);
  });
});
