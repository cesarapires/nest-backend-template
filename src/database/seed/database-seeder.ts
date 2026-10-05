import { NestFactory } from '@nestjs/core';
import { PasswordHasher } from '@/auth/password-hasher.js';
import { UsersService } from '@/users/users.service.js';
import { EnvUtils } from '@/utils/env.utils.js';
import { DevelopmentUsers } from './development-users.js';
import { SeedModule } from './seed.module.js';

export class DatabaseSeeder {

  private static readonly PRODUCTION = 'production';

  public static async run(): Promise<string[]> {
    if (EnvUtils.getOptional('NODE_ENV', 'development') === DatabaseSeeder.PRODUCTION) {
      throw new Error('O seed cria usuários de desenvolvimento e não roda em produção');
    }

    const app = await NestFactory.createApplicationContext(SeedModule, { logger: false });

    try {
      const usersService = app.get(UsersService);
      const passwordHash = await new PasswordHasher().hash(DevelopmentUsers.PASSWORD);
      const created: string[] = [];

      if (!(await usersService.findByEmail(DevelopmentUsers.USER_EMAIL))) {
        await usersService.createUser({ email: DevelopmentUsers.USER_EMAIL, passwordHash });
        created.push(DevelopmentUsers.USER_EMAIL);
      }

      if (!(await usersService.findByEmail(DevelopmentUsers.ADMIN_EMAIL))) {
        await usersService.createAdmin({ email: DevelopmentUsers.ADMIN_EMAIL, passwordHash });
        created.push(DevelopmentUsers.ADMIN_EMAIL);
      }

      return created;
    } finally {
      await app.close();
    }
  }
}
