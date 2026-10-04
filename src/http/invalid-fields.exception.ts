import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { InvalidField } from './invalid-field.js';

export class InvalidFieldsException extends BadRequestException {

  private static readonly DETAIL = 'Os dados enviados são inválidos';

  constructor(readonly fields: InvalidField[]) {
    super(InvalidFieldsException.DETAIL);
  }

  static fromValidationErrors(errors: ValidationError[]): InvalidFieldsException {
    return new InvalidFieldsException(InvalidFieldsException.flatten(errors, ''));
  }

  private static flatten(errors: ValidationError[], parentPath: string): InvalidField[] {
    return errors.flatMap((error) => {
      const path = parentPath ? `${parentPath}.${error.property}` : error.property;
      const fields = Object.values(error.constraints ?? {}).map((message) => new InvalidField(path, message));
      return [...fields, ...InvalidFieldsException.flatten(error.children ?? [], path)];
    });
  }
}
