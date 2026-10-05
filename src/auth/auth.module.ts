import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '@/database/database.module.js';
import { UsersModule } from '@/users/users.module.js';
import { AuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { PasswordHasher } from './password-hasher.js';
import { Session } from './session.entity.js';
import { SessionsService } from './sessions.service.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    DatabaseModule.forFeature([Session]),
    JwtModule.register({ secret: AuthConfig.JWT_SECRET, signOptions: { algorithm: 'HS256', expiresIn: AuthConfig.ACCESS_TOKEN_TTL_SECONDS } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordHasher, SessionsService, TokenService, JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
