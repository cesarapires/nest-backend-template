import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { User } from '@/users/user.entity.js';
import { UsersService } from '@/users/users.service.js';
import type { AccessTokenPayload } from './access-token-payload.js';
import { AuthConfig } from './auth.config.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: AuthConfig.JWT_SECRET,
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  public async validate(payload: AccessTokenPayload): Promise<User> {
    const user = await this.usersService.findByPublicId(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
