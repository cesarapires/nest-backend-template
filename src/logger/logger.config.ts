import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import { EnvUtils } from '@/utils/env.utils.js';

export class LoggerConfig {

  private static readonly LEVEL = EnvUtils.getOptional('LOG_LEVEL', 'info');

  private static readonly PRETTY = EnvUtils.getOptional('LOG_PRETTY', 'false') === 'true';

  private static readonly REQUEST_ID_HEADER = 'x-request-id';

  private static readonly VALID_REQUEST_ID = /^[\w-]{1,128}$/;

  private static readonly REDACTED_PATHS = [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    'cpf',
    '*.cpf',
    'password',
    '*.password',
    'apiKey',
    '*.apiKey',
  ];

  private static readonly UNLOGGED_PATHS = ['/api/v1/health'];

  static createParams(): Params {
    return {
      pinoHttp: {
        level: LoggerConfig.LEVEL,
        transport: LoggerConfig.PRETTY ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
        genReqId: (req, res) => LoggerConfig.resolveRequestId(req, res),
        redact: LoggerConfig.REDACTED_PATHS,
        autoLogging: { ignore: (req) => LoggerConfig.isUnlogged(req) },
      },
    };
  }

  private static resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
    const header = req.headers[LoggerConfig.REQUEST_ID_HEADER];
    const requestId = typeof header === 'string' && LoggerConfig.VALID_REQUEST_ID.test(header) ? header : randomUUID();
    res.setHeader(LoggerConfig.REQUEST_ID_HEADER, requestId);
    return requestId;
  }

  private static isUnlogged(req: IncomingMessage): boolean {
    const path = (req.url ?? '').split('?')[0];
    return LoggerConfig.UNLOGGED_PATHS.includes(path);
  }
}
