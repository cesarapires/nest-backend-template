import type { DataSource } from 'typeorm';
import { TransactionManager } from '@/database/transaction/transaction-manager.js';

describe('TransactionManager', () => {
  function dataSourceFalso(nome: string): DataSource {
    return { transaction: vi.fn(async (work: (manager: unknown) => Promise<unknown>) => work({ nome })) } as unknown as DataSource;
  }

  async function managerUsado(): Promise<unknown> {
    return TransactionManager.run(async () => TransactionManager.currentManager());
  }

  it('deve voltar a usar a aplicação anterior quando uma segunda aplicação é encerrada', async () => {
    const aplicacao = dataSourceFalso('aplicacao');
    const script = dataSourceFalso('script');
    TransactionManager.register(aplicacao);
    TransactionManager.register(script);

    await expect(managerUsado()).resolves.toEqual({ nome: 'script' });

    TransactionManager.unregister(script);

    await expect(managerUsado()).resolves.toEqual({ nome: 'aplicacao' });

    TransactionManager.unregister(aplicacao);
  });

  it('deve manter o registro enquanto algum módulo da aplicação ainda o usa', async () => {
    const aplicacao = dataSourceFalso('aplicacao');
    TransactionManager.register(aplicacao);
    TransactionManager.register(aplicacao);

    TransactionManager.unregister(aplicacao);

    await expect(managerUsado()).resolves.toEqual({ nome: 'aplicacao' });

    TransactionManager.unregister(aplicacao);
  });
});
