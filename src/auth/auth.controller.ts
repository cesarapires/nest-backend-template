import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProblemDetails } from '@/http/problem-details.js';
import { UserResponseDto } from '@/users/dto/user-response.dto.js';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { TokensResponseDto } from './dto/tokens-response.dto.js';

@Public()
@ApiTags('auth')
@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastra um usuário' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ type: ProblemDetails, description: 'Dados inválidos' })
  @ApiConflictResponse({ type: ProblemDetails, description: 'E-mail já cadastrado' })
  public async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    return new UserResponseDto(await this.authService.register(registerDto));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica com e-mail e senha e abre uma sessão' })
  @ApiOkResponse({ type: TokensResponseDto })
  @ApiBadRequestResponse({ type: ProblemDetails, description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ type: ProblemDetails, description: 'E-mail ou senha inválidos' })
  public login(@Body() loginDto: LoginDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string): Promise<TokensResponseDto> {
    return this.authService.login(loginDto, { ip, userAgent });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Troca o refresh token por um novo par de tokens' })
  @ApiOkResponse({ type: TokensResponseDto })
  @ApiUnauthorizedResponse({ type: ProblemDetails, description: 'Sessão inválida ou expirada' })
  public refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokensResponseDto> {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Encerra a sessão do refresh token informado' })
  @ApiNoContentResponse({ description: 'Sessão encerrada (ou já inexistente)' })
  public logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }
}
