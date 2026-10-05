import { AbstractResponseDto } from '@/http/abstract-response.dto.js';
import type { User } from '../user.entity.js';
import type { UserRole } from '../user-role.enum.js';

export class UserResponseDto extends AbstractResponseDto {

  public readonly email: string;

  public readonly role: UserRole;

  public readonly emailVerifiedAt: Date | null;

  constructor(user: User) {
    super(user);
    this.email = user.email;
    this.role = user.role;
    this.emailVerifiedAt = user.emailVerifiedAt;
  }
}
