import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmConfigService } from './database/typeorm-config.service.js';
import { HealthModule } from './health/health.module.js';
import { LoggerConfig } from './logger/logger.config.js';

@Module({
  imports: [LoggerModule.forRoot(LoggerConfig.createParams()), TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }), HealthModule],
})
export class AppModule {}
