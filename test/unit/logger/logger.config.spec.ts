import type { IncomingMessage, ServerResponse } from 'node:http';
import pino from 'pino';
import type { Options } from 'pino-http';
import { LoggerConfig } from '@/logger/logger.config.js';

describe('LoggerConfig', () => {
  const options = LoggerConfig.createParams().pinoHttp as Options;

  describe('request id', () => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

    function resolveRequestId(header?: string) {
      const req = { headers: { 'x-request-id': header } } as unknown as IncomingMessage;
      const setHeader = vi.fn();
      const res = { setHeader } as unknown as ServerResponse;
      const requestId = options.genReqId!(req, res);
      return { requestId, setHeader };
    }

    it('deve gerar um uuid quando o cabeçalho não é enviado', () => {
      const { requestId } = resolveRequestId();

      expect(requestId).toMatch(UUID);
    });

    it('deve reutilizar o id válido enviado pelo cliente', () => {
      const { requestId } = resolveRequestId('compra-123');

      expect(requestId).toBe('compra-123');
    });

    it('deve trocar um id com caracteres inválidos por um uuid', () => {
      const { requestId } = resolveRequestId('abc"}{injetado');

      expect(requestId).toMatch(UUID);
    });

    it('deve trocar um id com mais de 128 caracteres por um uuid', () => {
      const { requestId } = resolveRequestId('a'.repeat(129));

      expect(requestId).toMatch(UUID);
    });

    it('deve devolver o request id no cabeçalho da resposta', () => {
      const { requestId, setHeader } = resolveRequestId();

      expect(setHeader).toHaveBeenCalledWith('x-request-id', requestId);
    });
  });

  describe('log automático de requisições', () => {
    const autoLogging = options.autoLogging as { ignore: (req: IncomingMessage) => boolean };

    function ignorada(url: string) {
      return autoLogging.ignore({ url } as IncomingMessage);
    }

    it('não deve registrar as chamadas do health check', () => {
      expect(ignorada('/api/v1/health')).toBe(true);
    });

    it('não deve registrar o health check mesmo com parâmetros na url', () => {
      expect(ignorada('/api/v1/health?origem=monitor')).toBe(true);
    });

    it('deve registrar as demais rotas', () => {
      expect(ignorada('/api/v1/eventos')).toBe(false);
      expect(ignorada('/api/v1/health-extra')).toBe(false);
    });
  });

  describe('dados ocultos', () => {
    function log(data: object) {
      const lines: string[] = [];
      const logger = pino({ redact: options.redact }, { write: (line: string) => lines.push(line) });
      logger.info(data);
      return JSON.parse(lines[0]);
    }

    it('deve ocultar campos sensíveis no primeiro nível', () => {
      const output = log({ cpf: '529.982.247-25', password: '123', apiKey: 'aact_x' });

      expect(output).toMatchObject({ cpf: '[Redacted]', password: '[Redacted]', apiKey: '[Redacted]' });
    });

    it('deve ocultar campos sensíveis um nível abaixo', () => {
      const output = log({ atleta: { nome: 'Ana', cpf: '529.982.247-25' } });

      expect(output.atleta).toEqual({ nome: 'Ana', cpf: '[Redacted]' });
    });

    it('deve ocultar os tokens de autenticação', () => {
      const output = log({ accessToken: 'jwt', sessao: { refreshToken: 'opaco' } });

      expect(output).toMatchObject({ accessToken: '[Redacted]', sessao: { refreshToken: '[Redacted]' } });
    });

    it('deve ocultar os cabeçalhos authorization e cookie', () => {
      const output = log({ req: { headers: { authorization: 'Bearer token', cookie: 'session=1', host: 'localhost' } } });

      expect(output.req.headers).toEqual({ authorization: '[Redacted]', cookie: '[Redacted]', host: 'localhost' });
    });
  });
});
