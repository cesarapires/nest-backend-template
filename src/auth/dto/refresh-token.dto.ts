import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {

  @ApiProperty({ example: '0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10.use-o-refresh-token-devolvido-pelo-login' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  public refreshToken: string;
}
