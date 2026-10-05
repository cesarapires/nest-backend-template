import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '@/database/abstract-entity.js';
import { UserRole } from './user-role.enum.js';

@Entity({ name: 'users' })
@Index(['email'], { unique: true, where: 'deleted_at IS NULL' })
export class User extends AbstractEntity {

  @Column({ type: 'varchar', length: 254 })
  public email: string;

  @Column({ type: 'varchar', length: 255 })
  public passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.USER })
  public role: UserRole;

  @Column({ type: 'timestamptz', nullable: true })
  public emailVerifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  public lastLoginAt: Date | null;
}
