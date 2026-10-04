import { STATUS_CODES } from 'node:http';
import type { InvalidField } from './invalid-field.js';

export class ProblemDetails {

  readonly type = 'about:blank';

  readonly title: string;

  readonly status: number;

  readonly detail: string;

  readonly instance: string;

  readonly requestId?: string;

  readonly errors?: InvalidField[];

  constructor(status: number, detail: string, instance: string, requestId?: string, errors?: InvalidField[]) {
    this.title = STATUS_CODES[status] ?? 'Error';
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.requestId = requestId;
    this.errors = errors;
  }
}
