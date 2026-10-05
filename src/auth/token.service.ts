import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@/users/user.entity.js';
import type { AccessTokenPayload } from './access-token-payload.js';
import type { Session } from './session.entity.js';

@Injectable()
export class TokenService {

  constructor(private readonly jwtService: JwtService) {}

  public issueAccessToken(user: User, session: Session): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.publicId, role: user.role, sid: session.publicId };

    return this.jwtService.signAsync(payload);
  }
}
