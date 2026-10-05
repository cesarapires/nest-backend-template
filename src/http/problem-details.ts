import { STATUS_CODES } from 'node:http';
import type { InvalidField } from './invalid-field.js';

export class ProblemDetails {

  public readonly type = 'about:blank';

  public readonly title: string;

  public readonly status: number;

  public readonly detail: string;

  public readonly instance: string;

  public readonly requestId?: string;

  public readonly errors?: InvalidField[];

  constructor(status: number, detail: string, instance: string, requestId?: string, errors?: InvalidField[]) {
    this.title = STATUS_CODES[status] ?? 'Error';
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.requestId = requestId;
    this.errors = errors;
  }
}
