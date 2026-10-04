import { Controller, Get } from '@nestjs/common';
import { HealthCheck, type HealthCheckResult, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {

  private static readonly DATABASE_KEY = 'database';

  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.pingCheck(HealthController.DATABASE_KEY)]);
  }
}
