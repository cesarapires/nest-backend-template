import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { AbstractEntity } from '@/database/abstract-entity.js';

@Injectable()
export class EntityLeakInterceptor implements NestInterceptor {

  public intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((body: unknown) => this.assertHasNoEntity(body, new Set())));
  }

  private assertHasNoEntity(value: unknown, visited: Set<object>): unknown {
    if (value === null || typeof value !== 'object' || visited.has(value)) {
      return value;
    }

    if (value instanceof AbstractEntity) {
      throw new Error(`A entidade ${value.constructor.name} foi devolvida na resposta; converta para um DTO`);
    }

    visited.add(value);
    Object.values(value).forEach((child) => this.assertHasNoEntity(child, visited));
    return value;
  }
}
