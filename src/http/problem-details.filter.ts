import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DatabaseError } from '@/database/database-error.js';
import { InvalidFieldsException } from './invalid-fields.exception.js';
import { ProblemDetails } from './problem-details.js';

type RequestWithId = Request & { id?: string | number };

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {

  private static readonly CONTENT_TYPE = 'application/problem+json';

  private static readonly INTERNAL_ERROR_DETAIL = 'Erro interno no servidor';

  private static readonly UNIQUE_VIOLATION_DETAIL = 'Já existe um registro com esses dados';

  private readonly logger = new Logger(ProblemDetailsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<RequestWithId>();
    const response = host.switchToHttp().getResponse<Response>();
    const problem = this.toProblemDetails(exception, request);

    if (problem.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }

    response.status(problem.status).type(ProblemDetailsFilter.CONTENT_TYPE).json(problem);
  }

  private toProblemDetails(exception: unknown, request: RequestWithId): ProblemDetails {
    const requestId = request.id === undefined ? undefined : String(request.id);

    if (exception instanceof InvalidFieldsException) {
      return new ProblemDetails(exception.getStatus(), exception.message, request.originalUrl, requestId, exception.fields);
    }

    if (exception instanceof HttpException) {
      return new ProblemDetails(exception.getStatus(), this.extractDetail(exception), request.originalUrl, requestId);
    }

    if (DatabaseError.isUniqueViolation(exception)) {
      return new ProblemDetails(HttpStatus.CONFLICT, ProblemDetailsFilter.UNIQUE_VIOLATION_DETAIL, request.originalUrl, requestId);
    }

    return new ProblemDetails(HttpStatus.INTERNAL_SERVER_ERROR, ProblemDetailsFilter.INTERNAL_ERROR_DETAIL, request.originalUrl, requestId);
  }

  private extractDetail(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    const message = (response as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join('; ') : (message ?? exception.message);
  }
}
