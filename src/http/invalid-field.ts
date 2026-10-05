import { ApiProperty } from '@nestjs/swagger';

export class InvalidField {

  @ApiProperty({ example: 'endereco.cep' })
  public readonly field: string;

  @ApiProperty({ example: 'cep must match /^\\d{8}$/ regular expression' })
  public readonly message: string;

  constructor(field: string, message: string) {
    this.field = field;
    this.message = message;
  }
}
