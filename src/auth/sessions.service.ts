import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '@/users/user.entity.js';
import { AuthConfig } from './auth.config.js';
import type { IssuedSession } from './issued-session.js';
import { RefreshToken } from './refresh-token.js';
import { Session } from './session.entity.js';
import type { SessionContext } from './session-context.js';

@Injectable()
export class SessionsService {

  private static readonly INVALID_SESSION = 'Sessão inválida ou expirada';

  private static readonly MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

  constructor(@InjectRepository(Session) private readonly sessionsRepository: Repository<Session>) {}

  public async create(user: User, context: SessionContext): Promise<IssuedSession> {
    const refreshToken = RefreshToken.generate();

    const session = this.sessionsRepository.create({
      publicId: refreshToken.sessionPublicId,
      user,
      refreshTokenHash: refreshToken.hash(),
      expiresAt: SessionsService.newExpiration(),
      revokedAt: null,
      userAgent: context.userAgent?.slice(0, 255) ?? null,
      ip: context.ip ?? null,
    });

    return { session: await this.sessionsRepository.save(session), refreshToken };
  }

  public async rotate(value: string): Promise<IssuedSession> {
    const current = RefreshToken.parse(value);
    const session = current ? await this.findWithUser(current.sessionPublicId) : null;

    if (!current || !session?.user || !session.isActive(new Date())) {
      throw new UnauthorizedException(SessionsService.INVALID_SESSION);
    }

    if (!current.matches(session.refreshTokenHash)) {
      await this.sessionsRepository.update({ id: session.id }, { revokedAt: new Date() });
      throw new UnauthorizedException(SessionsService.INVALID_SESSION);
    }

    const next = RefreshToken.generate(session.publicId);
    const expiresAt = SessionsService.newExpiration();
    const result = await this.sessionsRepository.update({ id: session.id, refreshTokenHash: session.refreshTokenHash }, { refreshTokenHash: next.hash(), expiresAt });

    if (result.affected !== 1) {
      throw new UnauthorizedException(SessionsService.INVALID_SESSION);
    }

    session.refreshTokenHash = next.hash();
    session.expiresAt = expiresAt;

    return { session, refreshToken: next };
  }

  public async revoke(value: string): Promise<void> {
    const token = RefreshToken.parse(value);
    const session = token ? await this.sessionsRepository.findOneBy({ publicId: token.sessionPublicId }) : null;

    if (token && session && session.revokedAt === null && token.matches(session.refreshTokenHash)) {
      await this.sessionsRepository.update({ id: session.id }, { revokedAt: new Date() });
    }
  }

  private findWithUser(publicId: string): Promise<Session | null> {
    return this.sessionsRepository.findOne({ where: { publicId }, relations: { user: true } });
  }

  private static newExpiration(): Date {
    return new Date(Date.now() + AuthConfig.REFRESH_TOKEN_TTL_DAYS * SessionsService.MILLISECONDS_PER_DAY);
  }
}
