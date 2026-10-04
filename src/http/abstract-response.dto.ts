import type { AbstractEntity } from '@/database/abstract-entity.js';

export abstract class AbstractResponseDto {

  readonly id: string;

  readonly createdAt: Date;

  readonly updatedAt: Date;

  protected constructor(entity: AbstractEntity) {
    this.id = entity.publicId;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
