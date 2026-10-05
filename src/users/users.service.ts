import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateUserData } from './create-user.data.js';
import { UserRole } from './user-role.enum.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {

  private static readonly EMAIL_IN_USE = 'E-mail já cadastrado';

  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {}

  public createUser(data: CreateUserData): Promise<User> {
    return this.create(data, UserRole.USER);
  }

  public createAdmin(data: CreateUserData): Promise<User> {
    return this.create(data, UserRole.ADMIN);
  }

  public async recordLogin(user: User): Promise<void> {
    await this.usersRepository.update({ id: user.id }, { lastLoginAt: new Date() });
  }

  public findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email: UsersService.normalizeEmail(email) });
  }

  public findByPublicId(publicId: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ publicId });
  }

  private async create(data: CreateUserData, role: UserRole): Promise<User> {
    const email = UsersService.normalizeEmail(data.email);

    if (await this.usersRepository.existsBy({ email })) {
      throw new ConflictException(UsersService.EMAIL_IN_USE);
    }

    return this.usersRepository.save(this.usersRepository.create({ email, passwordHash: data.passwordHash, role }));
  }

  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
