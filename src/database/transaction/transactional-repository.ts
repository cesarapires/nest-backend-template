import type { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { TransactionManager } from './transaction-manager.js';

export class TransactionalRepository {

  public static create<T extends ObjectLiteral>(dataSource: DataSource, entity: EntityTarget<T>): Repository<T> {
    const defaultRepository = dataSource.getRepository(entity);

    return new Proxy(defaultRepository, {
      get(_target, property) {
        const manager = TransactionManager.currentManager();
        const repository = manager ? manager.getRepository(entity) : defaultRepository;
        const value: unknown = Reflect.get(repository, property);
        return typeof value === 'function' ? value.bind(repository) : value;
      },
    });
  }
}
