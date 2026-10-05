import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { TypeOrmConfigService } from './database/typeorm-config.service.js';
import { HealthModule } from './health/health.module.js';
import { LoggerConfig } from './logger/logger.config.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [LoggerModule.forRoot(LoggerConfig.createParams()), TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }), HealthModule, UsersModule, AuthModule],
})
export class AppModule {}
