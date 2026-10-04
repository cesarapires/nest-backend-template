import { Column, CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export abstract class AbstractEntity {

  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  publicId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @VersionColumn({ type: 'integer' })
  version: number;
}
