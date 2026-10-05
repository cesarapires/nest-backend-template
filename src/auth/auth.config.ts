import { EnvUtils } from '@/utils/env.utils.js';

export class AuthConfig {

  private static readonly MINIMUM_SECRET_LENGTH = 32;

  public static readonly JWT_SECRET = AuthConfig.requireStrongSecret(EnvUtils.getRequired('JWT_SECRET'));

  public static readonly ACCESS_TOKEN_TTL_SECONDS = Number(EnvUtils.getOptional('ACCESS_TOKEN_TTL_SECONDS', '900'));

  public static readonly REFRESH_TOKEN_TTL_DAYS = Number(EnvUtils.getOptional('REFRESH_TOKEN_TTL_DAYS', '30'));

  private static requireStrongSecret(secret: string): string {
    if (secret.length < AuthConfig.MINIMUM_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET deve ter pelo menos ${AuthConfig.MINIMUM_SECRET_LENGTH} caracteres`);
    }

    return secret;
  }
}
