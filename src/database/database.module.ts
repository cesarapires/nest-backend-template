import { type DynamicModule, Injectable, Module, type OnApplicationShutdown, type OnModuleInit, type Provider } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionManager } from './transaction/transaction-manager.js';
import { TransactionalRepository } from './transaction/transactional-repository.js';

type Entities = NonNullable<Parameters<typeof TypeOrmModule.forFeature>[0]>;

@Injectable()
class TransactionManagerRegistrar implements OnModuleInit, OnApplicationShutdown {

  constructor(private readonly dataSource: DataSource) {}

  public onModuleInit(): void {
    TransactionManager.register(this.dataSource);
  }

  public onApplicationShutdown(): void {
    TransactionManager.unregister(this.dataSource);
  }
}

@Module({})
export class DatabaseModule {

  public static forFeature(entities: Entities): DynamicModule {
    const repositories: Provider[] = entities.map((entity) => ({
      provide: getRepositoryToken(entity),
      useFactory: (dataSource: DataSource) => TransactionalRepository.create(dataSource, entity),
      inject: [DataSource],
    }));

    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forFeature(entities)],
      providers: [TransactionManagerRegistrar, ...repositories],
      exports: repositories,
    };
  }
}
