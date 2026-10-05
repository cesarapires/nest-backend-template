import type { AbstractEntity } from '@/database/abstract-entity.js';

export abstract class AbstractResponseDto {

  public readonly id: string;

  public readonly createdAt: Date;

  public readonly updatedAt: Date;

  protected constructor(entity: AbstractEntity) {
    this.id = entity.publicId;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
