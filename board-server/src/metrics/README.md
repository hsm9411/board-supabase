# Metrics Module

## 개요

Metrics Module은 Prometheus 메트릭 수집을 담당하는 모듈입니다. `@willsoto/nestjs-prometheus` 패키지를 사용하여 HTTP 요청, 응답 시간, 시스템 리소스 등의 메트릭을 자동으로 수집합니다.

## 주요 기능

1. **HTTP 메트릭 자동 수집**
   - 요청 총 개수 (Counter)
   - 응답 시간 분포 (Histogram)
   - 상태 코드별 분류

2. **시스템 메트릭**
   - CPU 사용량
   - 메모리 사용량
   - Node.js Heap 크기

3. **커스텀 메트릭**
   - 비즈니스 로직에 맞는 메트릭 추가 가능

## 파일 구조

```
metrics/
└── metrics.module.ts      # Prometheus 모듈 설정
```

**관련 파일:**
```
common/
└── interceptors/
    └── metrics.interceptor.ts  # HTTP 메트릭 수집 인터셉터
```

## 설치된 메트릭

### 1. http_requests_total (Counter)
HTTP 요청 총 개수

**Labels:**
- `method`: HTTP 메서드 (GET, POST, PATCH, DELETE)
- `route`: 라우트 경로 (/board, /auth/signin 등)
- `status`: 상태 코드 (2xx, 4xx, 5xx)

**예시:**
```
http_requests_total{method="GET",route="/board",status="2xx"} 1234
http_requests_total{method="POST",route="/board",status="2xx"} 56
http_requests_total{method="GET",route="/board/:id",status="404"} 3
```

### 2. http_request_duration_seconds (Histogram)
HTTP 요청 처리 시간 분포

**Labels:**
- `method`: HTTP 메서드
- `route`: 라우트 경로

**Buckets:**
- 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10

**예시:**
```
http_request_duration_seconds_bucket{method="GET",route="/board",le="0.1"} 1000
http_request_duration_seconds_bucket{method="GET",route="/board",le="0.5"} 1200
http_request_duration_seconds_sum{method="GET",route="/board"} 123.45
http_request_duration_seconds_count{method="GET",route="/board"} 1234
```

### 3. 기본 Node.js 메트릭 (Default Metrics)

`defaultMetrics: true` 설정으로 자동 수집:

- `process_cpu_user_seconds_total`: CPU 사용 시간
- `process_cpu_system_seconds_total`: 시스템 CPU 시간
- `process_cpu_seconds_total`: 총 CPU 시간
- `nodejs_heap_size_total_bytes`: 전체 힙 크기
- `nodejs_heap_size_used_bytes`: 사용 중인 힙 크기
- `nodejs_external_memory_bytes`: 외부 메모리 사용량
- `nodejs_eventloop_lag_seconds`: Event Loop 지연
- `nodejs_active_handles_total`: 활성 핸들 수
- `nodejs_active_requests_total`: 활성 요청 수

## 설정 코드

### MetricsModule

```typescript
import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from '../common/interceptors/metrics.interceptor';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',              // Prometheus 엔드포인트
      defaultMetrics: { enabled: true }, // Node.js 기본 메트릭 활성화
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
    }),
    MetricsInterceptor,
  ],
  exports: [PrometheusModule, MetricsInterceptor],
})
export class MetricsModule {}
```

### MetricsInterceptor

**위치:** `common/interceptors/metrics.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - start) / 1000;
          this.httpRequestsCounter.inc({
            method,
            route: route?.path || 'unknown',
            status: '2xx',
          });
          this.httpRequestDuration.observe(
            { method, route: route?.path || 'unknown' },
            duration
          );
        },
        error: (error) => {
          const duration = (Date.now() - start) / 1000;
          this.httpRequestsCounter.inc({
            method,
            route: route?.path || 'unknown',
            status: error.status || '5xx',
          });
          this.httpRequestDuration.observe(
            { method, route: route?.path || 'unknown' },
            duration
          );
        },
      }),
    );
  }
}
```

## AppModule 통합

```typescript
import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
import { BoardModule } from './board/board.module';

@Module({
  imports: [
    MetricsModule,  // ← 먼저 임포트 (라우팅 우선순위)
    HealthModule,
    BoardModule,
  ],
})
export class AppModule {}
```

**중요:** `MetricsModule`은 다른 비즈니스 모듈보다 먼저 임포트해야 `/metrics` 라우팅 우선순위가 보장됩니다.

## main.ts 글로벌 등록

```typescript
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 글로벌 인터셉터 등록
  app.useGlobalInterceptors(app.get(MetricsInterceptor));
  
  await app.listen(3000);
}
```

## Prometheus 엔드포인트

### GET /metrics

**Example Request:**
```bash
curl http://localhost:3000/metrics
```

**Example Response:**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/board",status="2xx"} 1234
http_requests_total{method="POST",route="/board",status="2xx"} 56

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/board",le="0.005"} 0
http_request_duration_seconds_bucket{method="GET",route="/board",le="0.01"} 100
http_request_duration_seconds_bucket{method="GET",route="/board",le="0.025"} 500
http_request_duration_seconds_bucket{method="GET",route="/board",le="+Inf"} 1234
http_request_duration_seconds_sum{method="GET",route="/board"} 123.45
http_request_duration_seconds_count{method="GET",route="/board"} 1234

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 12345678
```

## Prometheus 설정

**파일:** `monitoring/prometheus.yml`

```yaml
scrape_configs:
  - job_name: 'board-service'
    static_configs:
      - targets: 
          - 'board-service-1:3000'
          - 'board-service-2:3000'
          - 'board-service-3:3000'
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Nginx 프록시 설정

```nginx
location /metrics {
  proxy_pass http://board_service;  # 경로 중복 방지
  proxy_set_header Host $host;
}
```

**주의:** `proxy_pass http://board_service/metrics;`로 설정하면 `/metrics/metrics`로 전달되어 404 발생

## PromQL 쿼리 예시

### 요청률 (RPS)
```promql
# 5분간 평균 요청률
rate(http_requests_total[5m])

# 서비스별 요청률
rate(http_requests_total{job="board-service"}[5m])

# 라우트별 요청률
sum by (route) (rate(http_requests_total[5m]))
```

### 응답 시간 (Latency)
```promql
# P50 응답 시간
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))

# P95 응답 시간
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# P99 응답 시간
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### 에러율
```promql
# 전체 에러율
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m]))

# 라우트별 에러율
sum by (route) (rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum by (route) (rate(http_requests_total[5m]))
```

### 시스템 리소스
```promql
# 힙 메모리 사용률
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# CPU 사용률
rate(process_cpu_user_seconds_total[5m])

# Event Loop 지연
nodejs_eventloop_lag_seconds
```

## Grafana 대시보드

### 패널 예시

#### 1. HTTP Request Rate (Graph)
**Query:**
```promql
sum by (job) (rate(http_requests_total[5m]))
```

**Legend:**
```
{{job}}
```

#### 2. Response Time (Graph)
**Query:**
```promql
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

**Legend:**
```
P95 Latency
```

#### 3. Error Rate (Gauge)
**Query:**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

**Thresholds:**
- Green: < 1%
- Yellow: 1% ~ 5%
- Red: > 5%

#### 4. Memory Usage (Graph)
**Query:**
```promql
nodejs_heap_size_used_bytes
```

## 커스텀 메트릭 추가

### 예시: 게시글 조회 수
```typescript
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

// metrics.module.ts
providers: [
  makeCounterProvider({
    name: 'post_views_total',
    help: 'Total number of post views',
    labelNames: ['post_id'],
  }),
],

// board.service.ts
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

constructor(
  @InjectMetric('post_views_total')
  private postViewsCounter: Counter<string>,
) {}

async getPostById(id: string) {
  const post = await this.postRepository.findOne({ where: { id } });
  
  // 메트릭 증가
  this.postViewsCounter.inc({ post_id: id });
  
  return post;
}
```

## 트러블슈팅

### 404 Not Found

**증상:**
```
Cannot GET /metrics
```

**해결:**
1. `MetricsModule`이 `AppModule`에 임포트되었는지 확인
2. `docker-compose build --no-cache` 실행
3. Nginx 설정 확인 (`proxy_pass` 경로 중복 제거)

### Prometheus 타겟 DOWN

**증상:**
Prometheus UI에서 타겟 `DOWN` 상태

**해결:**
1. 서비스 Health Check 확인: `curl http://localhost/health`
2. 서버 로그 확인: `docker-compose logs -f board-service-1`
3. TypeORM 초기화 완료 대기 (30~40초)

### 메트릭이 0으로 표시

**증상:**
Prometheus에서 메트릭은 보이지만 모든 값이 0

**원인:**
`MetricsInterceptor`가 글로벌로 등록되지 않음

**해결:**
```typescript
// main.ts
app.useGlobalInterceptors(app.get(MetricsInterceptor));
```

## 성능 고려사항

### 메트릭 수집 오버헤드
- **인터셉터 실행 시간:** < 1ms
- **메모리 증가:** 약 10MB (기본 메트릭)
- **영향:** 무시할 수 있는 수준

### 카디널리티 주의
- Label 값의 개수가 많으면 메모리 사용량 급증
- 예: `post_id` 라벨은 게시글 수만큼 증가 → 메모리 부담

**권장:**
- 동적 ID를 라벨로 사용하지 않기
- 카테고리, 타입 등 제한된 값만 사용

## 참고 자료

- [@willsoto/nestjs-prometheus](https://github.com/willsoto/nestjs-prometheus)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [prom-client](https://github.com/siimon/prom-client)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)