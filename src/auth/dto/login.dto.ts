import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DevelopmentUsers } from '@/database/seed/development-users.js';
import { NormalizeEmail } from '@/validation/normalize-email.decorator.js';

export class LoginDto {

  @ApiProperty({ example: DevelopmentUsers.USER_EMAIL })
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(254)
  public email: string;

  @ApiProperty({ example: DevelopmentUsers.PASSWORD })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public password: string;
}
