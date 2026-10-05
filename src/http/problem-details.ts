import { STATUS_CODES } from 'node:http';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvalidField } from './invalid-field.js';

export class ProblemDetails {

  @ApiProperty({ example: 'about:blank' })
  public readonly type = 'about:blank';

  @ApiProperty({ example: 'Bad Request' })
  public readonly title: string;

  @ApiProperty({ example: 400 })
  public readonly status: number;

  @ApiProperty({ example: 'Os dados enviados são inválidos' })
  public readonly detail: string;

  @ApiProperty({ example: '/api/v1/auth/register' })
  public readonly instance: string;

  @ApiPropertyOptional({ example: '4f1c2b9e-7a3d-4e8f-9c1a-2b3d4e5f6a7b' })
  public readonly requestId?: string;

  @ApiPropertyOptional({ type: () => [InvalidField], description: 'Presente apenas em erros de validação (400)' })
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
