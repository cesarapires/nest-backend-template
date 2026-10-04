import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { AbstractEntity } from '@/database/abstract-entity.js';
import { EntityLeakInterceptor } from '@/http/entity-leak.interceptor.js';

class InscricaoTeste extends AbstractEntity {}

describe('EntityLeakInterceptor', () => {
  const interceptor = new EntityLeakInterceptor();

  function responder(body: unknown): Promise<unknown> {
    const next: CallHandler = { handle: () => of(body) };
    return lastValueFrom(interceptor.intercept({} as ExecutionContext, next));
  }

  it('deve deixar passar respostas sem entidades', async () => {
    const body = { id: 'abc', itens: [{ nome: 'Ana' }] };

    await expect(responder(body)).resolves.toBe(body);
  });

  it('deve deixar passar respostas vazias e valores simples', async () => {
    await expect(responder(undefined)).resolves.toBeUndefined();
    await expect(responder('ok')).resolves.toBe('ok');
  });

  it('deve barrar uma entidade devolvida diretamente', async () => {
    await expect(responder(new InscricaoTeste())).rejects.toThrow('A entidade InscricaoTeste foi devolvida na resposta; converta para um DTO');
  });

  it('deve barrar uma entidade dentro de uma lista', async () => {
    await expect(responder([{ ok: true }, new InscricaoTeste()])).rejects.toThrow('InscricaoTeste');
  });

  it('deve barrar uma entidade aninhada em um objeto', async () => {
    await expect(responder({ dados: { inscricao: new InscricaoTeste() } })).rejects.toThrow('InscricaoTeste');
  });

  it('deve suportar objetos com referência circular', async () => {
    const body: Record<string, unknown> = { nome: 'Ana' };
    body.proprio = body;

    await expect(responder(body)).resolves.toBe(body);
  });
});
