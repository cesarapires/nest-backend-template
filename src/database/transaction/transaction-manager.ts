import { AsyncLocalStorage } from 'node:async_hooks';
import type { DataSource, EntityManager } from 'typeorm';

export class TransactionManager {

  private static readonly STORAGE = new AsyncLocalStorage<EntityManager>();

  private static readonly DATA_SOURCES: DataSource[] = [];

  public static register(dataSource: DataSource): void {
    TransactionManager.DATA_SOURCES.push(dataSource);
  }

  public static unregister(dataSource: DataSource): void {
    const index = TransactionManager.DATA_SOURCES.lastIndexOf(dataSource);

    if (index !== -1) {
      TransactionManager.DATA_SOURCES.splice(index, 1);
    }
  }

  public static currentManager(): EntityManager | undefined {
    return TransactionManager.STORAGE.getStore();
  }

  public static run<T>(work: () => Promise<T>): Promise<T> {
    if (TransactionManager.currentManager()) {
      return work();
    }

    const dataSource = TransactionManager.DATA_SOURCES.at(-1);

    if (!dataSource) {
      throw new Error('Nenhum DataSource registrado para transações; importe o DatabaseModule.forFeature no módulo');
    }

    return dataSource.transaction((manager) => TransactionManager.STORAGE.run(manager, work));
  }
}
