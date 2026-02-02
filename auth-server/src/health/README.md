# Health Module

## 개요

Health Module은 서비스 상태 감시(Health Check)를 담당하는 모듈입니다. `@nestjs/terminus` 패키지를 사용하여 데이터베이스 연결 상태를 확인하고, 서비스의 가용성을 모니터링합니다.

## 주요 기능

1. **Database Health Check**
   - TypeORM 데이터베이스 연결 상태 확인
   - Ping 방식으로 빠른 응답

2. **표준 Health Check Format**
   - RFC 스타일 JSON 응답
   - `status`, `info`, `error`, `details` 필드

3. **Kubernetes/Docker 호환**
   - Liveness Probe
   - Readiness Probe

## 파일 구조

```
health/
├── health.controller.ts      # Health Check 엔드포인트
└── health.module.ts          # Health 모듈 설정
```

## 설정 코드

### health.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

### health.controller.ts

#### Auth Service

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

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
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

#### Board Service

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 5000 }),
      // 필요 시 다른 체크 추가
    ]);
  }
}
```

## AppModule 통합

```typescript
import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { BoardModule } from './board/board.module';

@Module({
  imports: [
    MetricsModule,  // 먼저 임포트 (라우팅 우선순위)
    HealthModule,   // 두 번째 임포트
    BoardModule,
  ],
})
export class AppModule {}
```

**중요:** `HealthModule`은 비즈니스 모듈보다 먼저 임포트해야 `/health` 라우팅 우선순위가 보장됩니다.

## API 엔드포인트

### GET /health

**Auth Service:**
```bash
curl http://localhost/auth/health
```

**Board Service:**
```bash
curl http://localhost/health
```

### 정상 응답 (200 OK)

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

### 비정상 응답 (503 Service Unavailable)

```json
{
  "status": "error",
  "info": {},
  "error": {
    "database": {
      "status": "down",
      "message": "Connection refused"
    }
  },
  "details": {
    "database": {
      "status": "down",
      "message": "Connection refused"
    }
  }
}
```

## Health Indicators

### TypeOrmHealthIndicator

**용도:** 데이터베이스 연결 상태 확인

**메서드:**
```typescript
this.db.pingCheck('database')
this.db.pingCheck('database', { timeout: 5000 })
```

**동작:**
- TypeORM 연결 풀에서 연결 가져오기
- `SELECT 1` 쿼리 실행
- 성공 시 `up`, 실패 시 `down`

### HttpHealthIndicator (옵션)

**용도:** 외부 서비스 연결 상태 확인

**예시:**
```typescript
@Get()
@HealthCheck()
check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.http.pingCheck('auth-service', 'http://auth-service:3001/health'),
  ]);
}
```

**의존성:**
```bash
npm install @nestjs/axios axios
```

### DiskHealthIndicator (예정)

**용도:** 디스크 공간 확인

```typescript
import { DiskHealthIndicator } from '@nestjs/terminus';

() => this.disk.checkStorage('storage', {
  path: '/',
  thresholdPercent: 0.9
})
```

### MemoryHealthIndicator (예정)

**용도:** 메모리 사용량 확인

```typescript
import { MemoryHealthIndicator } from '@nestjs/terminus';

() => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024)
```

## Docker Compose Health Check

### Auth Service

```yaml
auth-service:
  healthcheck:
    test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

### Board Service

```yaml
board-service-1:
  healthcheck:
    test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

**설정 설명:**
- `test`: 헬스체크 명령어 (wget으로 HTTP 요청)
- `interval`: 체크 주기 (30초)
- `timeout`: 타임아웃 (10초)
- `retries`: 재시도 횟수 (3회)
- `start_period`: 초기 대기 시간 (40초, TypeORM 초기화)

## Nginx Health Check

```nginx
location /health {
  proxy_pass http://board_service;
  proxy_set_header Host $host;
}

location /auth/health {
  proxy_pass http://auth_service/health;
  proxy_set_header Host $host;
}
```

## Kubernetes Health Probes (예정)

### Liveness Probe

**용도:** 컨테이너가 살아있는지 확인

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**실패 시:**
- 컨테이너 재시작

### Readiness Probe

**용도:** 컨테이너가 트래픽을 받을 준비가 되었는지 확인

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3
```

**실패 시:**
- 서비스 엔드포인트에서 제외 (트래픽 차단)

## 트러블슈팅

### 404 Not Found

**증상:**
```bash
curl http://localhost/health
# Cannot GET /health
```

**원인:**
1. `HealthModule`이 `AppModule`에 임포트되지 않음
2. Docker 빌드 캐시 문제

**해결:**
```bash
# 1. AppModule 확인
@Module({
  imports: [
    HealthModule,  // ← 임포트 확인
    ...
  ],
})

# 2. 강제 재빌드
docker-compose build --no-cache

# 3. 재시작
docker-compose up -d
```

### 503 Service Unavailable

**증상:**
```json
{
  "status": "error",
  "error": {
    "database": {
      "status": "down"
    }
  }
}
```

**원인:**
1. 데이터베이스 연결 실패
2. TypeORM 초기화 미완료

**해결:**
```bash
# 1. 데이터베이스 연결 확인
docker exec board-service-1 env | grep DATABASE_URL

# 2. 서버 로그 확인
docker-compose logs -f board-service-1
# "Nest application successfully started" 대기

# 3. 데이터베이스 접근 테스트
docker exec -it postgres psql -U postgres -d your_db -c "SELECT 1;"
```

### Package Missing (@nestjs/axios)

**증상:**
```
The "@nestjs/axios" package is missing
```

**원인:**
`HttpHealthIndicator` 사용 시 의존성 미설치

**해결:**
```bash
cd board-server
npm install @nestjs/axios axios

docker-compose build --no-cache board-service-1
```

## 모니터링 통합

### Prometheus

Health Check 엔드포인트를 Prometheus로 수집:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'health-check'
    static_configs:
      - targets: 
          - 'board-service-1:3000'
    metrics_path: '/health'
    scheme: http
```

### Grafana Alert

Health Check 실패 시 알림:

```yaml
groups:
  - name: health-alerts
    interval: 1m
    rules:
      - alert: ServiceDown
        expr: up{job="board-service"} == 0
        for: 2m
        annotations:
          summary: "서비스 다운"
          description: "Board Service가 2분간 응답하지 않습니다."
```

## 커스텀 Health Indicator

### Redis Health Indicator

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const store = (this.cacheManager as any).store;
      const client = store.client;
      
      await client.ping();
      
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
```

**사용:**
```typescript
@Get()
@HealthCheck()
check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.redis.isHealthy('redis'),
  ]);
}
```

## 베스트 프랙티스

1. **타임아웃 설정**
   ```typescript
   this.db.pingCheck('database', { timeout: 5000 })
   ```

2. **의존성 체크**
   - 필수 의존성만 체크 (DB, Redis)
   - 선택적 의존성은 제외 (외부 API)

3. **응답 시간 최소화**
   - Ping 방식 사용
   - 복잡한 쿼리 지양

4. **실패 허용**
   - `start_period` 설정으로 초기화 시간 확보
   - `retries` 설정으로 일시적 장애 허용

5. **모니터링 통합**
   - Prometheus에 Health Check 상태 수집
   - Grafana에서 시각화 및 알림

## 참고 자료

- [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus)
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Docker Health Check](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Health Check Response Format](https://tools.ietf.org/id/draft-inadarei-api-health-check-01.html)