import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, type HealthCheckResult, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {

  private static readonly DATABASE_KEY = 'database';

  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Verifica se a API e o banco de dados estão no ar' })
  public check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.pingCheck(HealthController.DATABASE_KEY)]);
  }
}
