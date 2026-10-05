import { AuthConfig } from '../auth.config.js';
import type { IssuedSession } from '../issued-session.js';

export class TokensResponseDto {

  public readonly tokenType = 'Bearer';

  public readonly accessToken: string;

  public readonly accessTokenExpiresIn: number;

  public readonly refreshToken: string;

  public readonly refreshTokenExpiresAt: Date;

  constructor(accessToken: string, issuedSession: IssuedSession) {
    this.accessToken = accessToken;
    this.accessTokenExpiresIn = AuthConfig.ACCESS_TOKEN_TTL_SECONDS;
    this.refreshToken = issuedSession.refreshToken.toString();
    this.refreshTokenExpiresAt = issuedSession.session.expiresAt;
  }
}
