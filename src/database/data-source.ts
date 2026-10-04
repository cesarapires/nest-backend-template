import '@/config/load-env.js';
import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { TypeOrmConfigService } from './typeorm-config.service.js';

export default new DataSource({
  ...TypeOrmConfigService.createConnectionOptions(),
  entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
});
