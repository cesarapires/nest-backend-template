import 'reflect-metadata';
import { SetMetadata } from '@nestjs/common';
import { TransactionManager } from '@/database/transaction/transaction-manager.js';
import { Transactional } from '@/database/transaction/transactional.decorator.js';

const CHAVE_METADADO = 'teste:metadado';

class ServicoTeste {

  public readonly nome = 'servico';

  @Transactional()
  @SetMetadata(CHAVE_METADADO, 'valor')
  public async executar(valor: number): Promise<string> {
    return `${this.nome}-${valor}`;
  }
}

describe('Transactional', () => {
  const executar: unknown = Object.getOwnPropertyDescriptor(ServicoTeste.prototype, 'executar')?.value;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve executar o método dentro do TransactionManager', async () => {
    const run = vi.spyOn(TransactionManager, 'run').mockImplementation((work) => work());

    await expect(new ServicoTeste().executar(7)).resolves.toBe('servico-7');
    expect(run).toHaveBeenCalledOnce();
  });

  it('deve manter o nome do método', () => {
    expect((executar as { name: string }).name).toBe('executar');
  });

  it('deve manter os metadados aplicados por outros decorators', () => {
    expect(Reflect.getMetadata(CHAVE_METADADO, executar as object)).toBe('valor');
  });

  it('deve falhar com mensagem clara quando não há DataSource registrado', () => {
    expect(() => TransactionManager.run(async () => undefined)).toThrow('Nenhum DataSource registrado para transações');
  });
});
