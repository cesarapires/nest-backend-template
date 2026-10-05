import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator.js';
import { ProblemDetails } from '@/http/problem-details.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import type { User } from './user.entity.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {

  @Get('me')
  @ApiOperation({ summary: 'Devolve o usuário logado' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ type: ProblemDetails, description: 'Faça login para continuar' })
  public me(@CurrentUser() user: User): UserResponseDto {
    return new UserResponseDto(user);
  }
}
