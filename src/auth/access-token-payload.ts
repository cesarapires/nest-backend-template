import type { UserRole } from '@/users/user-role.enum.js';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  sid: string;
}
