import { Injectable } from '@nestjs/common';
import type { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { EnvUtils } from '@/utils/env.utils.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {

  private static readonly HOST = EnvUtils.getRequired('POSTGRES_HOST');

  private static readonly PORT = Number(EnvUtils.getRequired('POSTGRES_PORT'));

  private static readonly USERNAME = EnvUtils.getRequired('POSTGRES_USER');

  private static readonly PASSWORD = EnvUtils.getRequired('POSTGRES_PASSWORD');

  private static readonly DATABASE = EnvUtils.getRequired('POSTGRES_DB');

  private static readonly TIMEZONE = 'UTC';

  public static createConnectionOptions(): PostgresDataSourceOptions {
    return {
      type: 'postgres',
      host: TypeOrmConfigService.HOST,
      port: TypeOrmConfigService.PORT,
      username: TypeOrmConfigService.USERNAME,
      password: TypeOrmConfigService.PASSWORD,
      database: TypeOrmConfigService.DATABASE,
      synchronize: false,
      namingStrategy: new SnakeNamingStrategy(),
      uuidExtension: 'pgcrypto',
      installExtensions: false,
      extra: { options: `-c timezone=${TypeOrmConfigService.TIMEZONE}` },
    };
  }

  public createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      ...TypeOrmConfigService.createConnectionOptions(),
      autoLoadEntities: true,
    };
  }
}
