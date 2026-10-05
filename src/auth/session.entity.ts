import { Column, Entity, Index, ManyToOne, type Relation } from 'typeorm';
import { AbstractEntity } from '@/database/abstract-entity.js';
import { User } from '@/users/user.entity.js';

@Entity()
export class Session extends AbstractEntity {

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  public user: Relation<User>;

  @Column({ type: 'char', length: 64 })
  public refreshTokenHash: string;

  @Column({ type: 'timestamptz' })
  public expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  public revokedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  public userAgent: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  public ip: string | null;

  public isActive(now: Date): boolean {
    return this.revokedAt === null && this.expiresAt > now;
  }
}
