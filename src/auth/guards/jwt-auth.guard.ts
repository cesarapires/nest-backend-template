import { type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

  public static readonly UNAUTHENTICATED = 'Faça login para continuar';

  constructor(private readonly reflector: Reflector) {
    super();
  }

  public override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

    return isPublic ? true : super.canActivate(context);
  }

  public override handleRequest<TUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user) {
      throw new UnauthorizedException(JwtAuthGuard.UNAUTHENTICATED);
    }

    return user;
  }
}
