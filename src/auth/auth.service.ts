import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@/database/transaction/transactional.decorator.js';
import type { User } from '@/users/user.entity.js';
import { UsersService } from '@/users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { TokensResponseDto } from './dto/tokens-response.dto.js';
import { PasswordHasher } from './password-hasher.js';
import type { SessionContext } from './session-context.js';
import { SessionsService } from './sessions.service.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {

  private static readonly INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessionsService: SessionsService,
    private readonly tokenService: TokenService,
  ) {}

  public async register(registerDto: RegisterDto): Promise<User> {
    const passwordHash = await this.passwordHasher.hash(registerDto.password);

    return this.usersService.createUser({ email: registerDto.email, passwordHash });
  }

  @Transactional()
  public async login(loginDto: LoginDto, context: SessionContext): Promise<TokensResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    const passwordMatches = await this.passwordHasher.verify(user?.passwordHash ?? null, loginDto.password);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(AuthService.INVALID_CREDENTIALS);
    }

    await this.usersService.recordLogin(user);

    const issuedSession = await this.sessionsService.create(user, context);

    return new TokensResponseDto(await this.tokenService.issueAccessToken(user, issuedSession.session), issuedSession);
  }

  public async refresh(refreshToken: string): Promise<TokensResponseDto> {
    const issuedSession = await this.sessionsService.rotate(refreshToken);

    return new TokensResponseDto(await this.tokenService.issueAccessToken(issuedSession.session.user, issuedSession.session), issuedSession);
  }

  public logout(refreshToken: string): Promise<void> {
    return this.sessionsService.revoke(refreshToken);
  }
}
