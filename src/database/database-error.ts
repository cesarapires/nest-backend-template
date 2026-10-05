import { QueryFailedError } from 'typeorm';

export class DatabaseError {

  private static readonly UNIQUE_VIOLATION = '23505';

  public static isUniqueViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && (error.driverError as { code?: string }).code === DatabaseError.UNIQUE_VIOLATION;
  }
}
