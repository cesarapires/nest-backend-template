import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '@/validation/normalize-email.decorator.js';

export class RegisterDto {

  @ApiProperty({ example: 'novo.usuario@app.local' })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  public email: string;

  @ApiProperty({ example: 'senha-forte-123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  public password: string;
}
