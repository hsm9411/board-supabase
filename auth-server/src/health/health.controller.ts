import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '서비스 헬스체크' })
  check() {
    return this.health.check([
      // 타임아웃 옵션을 추가합니다 (단위: ms)
      () => this.db.pingCheck('database', { timeout: 5000 }),
    ]);
  }
}
