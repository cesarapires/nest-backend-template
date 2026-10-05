import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@/database/typeorm-config.service.js';
import { UsersModule } from '@/users/users.module.js';

@Module({
  imports: [TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }), UsersModule],
})
export class SeedModule {}
