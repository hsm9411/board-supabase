# 모니터링 가이드

> **프로젝트**: Scalable Bulletin Board System
> **버전**: 2.3.0
> **업데이트**: 2026-02-06

---

## 📊 모니터링 스택

### 구성 요소

```
┌─────────────────────────────────────────┐
│        Grafana Dashboard (4000)         │
│         - 시각화 및 알림                 │
└────────────────┬────────────────────────┘
                 │
                 │ Query
                 │
┌────────────────▼────────────────────────┐
│      Prometheus (9090)                  │
│      - 메트릭 수집 및 저장               │
└───┬─────────────┬──────────────┬────────┘
    │             │              │
    │ Scrape      │ Scrape       │ Scrape
    │ (15s)       │ (15s)        │ (15s)
    │             │              │
┌───▼─────┐  ┌───▼─────┐  ┌─────▼────┐
│  Auth   │  │  Board  │  │  Node    │
│ Service │  │ Service │  │ Exporter │
│ (3001)  │  │  x3     │  │          │
└─────────┘  └─────────┘  └──────────┘
```

---

## 🎯 Prometheus 설정

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'board-msa'
    env: 'production'

scrape_configs:
  # Auth Service
  - job_name: 'auth-service'
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets: ['auth-service:3001']
        labels:
          service: 'auth'
          app: 'board-msa'

  # Board Service (3 replicas)
  - job_name: 'board-service'
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets:
          - 'board-service-1:3000'
          - 'board-service-2:3000'
          - 'board-service-3:3000'
        labels:
          service: 'board'
          app: 'board-msa'

  # Node Exporter (시스템 메트릭)
  - job_name: 'node'
    scrape_interval: 15s
    static_configs:
      - targets: ['node-exporter:9100']
```

### 접속 방법

#### 로컬
```
http://localhost:9090
```

#### 프로덕션
```
http://152.67.216.145:9090
```

---

## 📈 수집 메트릭

### HTTP 메트릭

#### 1. http_requests_total (Counter)
**설명**: HTTP 요청 총 개수

**레이블**:
- `method`: GET, POST, PATCH, DELETE
- `route`: /board, /auth/signin, etc.
- `status`: 200, 400, 500, etc.

**PromQL 예시**:
```promql
# 전체 요청 수
http_requests_total

# 5분간 요청률 (RPS)
rate(http_requests_total[5m])

# 서비스별 요청률
rate(http_requests_total{service="board"}[5m])

# 상태 코드별 요청 수
sum by (status) (http_requests_total)
```

#### 2. http_request_duration_seconds (Histogram)
**설명**: HTTP 응답 시간 분포

**레이블**:
- `method`, `route`, `status`

**PromQL 예시**:
```promql
# P50 (중앙값)
histogram_quantile(0.50,
  rate(http_request_duration_seconds_bucket[5m])
)

# P95 (95번째 백분위수)
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)

# P99 (99번째 백분위수)
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket[5m])
)

# 평균 응답 시간
rate(http_request_duration_seconds_sum[5m])
/
rate(http_request_duration_seconds_count[5m])
```

### Node.js 메트릭

#### 1. process_cpu_user_seconds_total (Counter)
**설명**: CPU 사용 시간

**PromQL 예시**:
```promql
# CPU 사용률
rate(process_cpu_user_seconds_total[5m])
```

#### 2. nodejs_heap_size_used_bytes (Gauge)
**설명**: Node.js 힙 메모리 사용량

**PromQL 예시**:
```promql
# 메모리 사용량 (MB)
nodejs_heap_size_used_bytes / 1024 / 1024

# 메모리 사용률
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

#### 3. nodejs_eventloop_lag_seconds (Gauge)
**설명**: Event Loop 지연 시간

**PromQL 예시**:
```promql
# Event Loop 지연 (ms)
nodejs_eventloop_lag_seconds * 1000

# 경고: 100ms 이상
nodejs_eventloop_lag_seconds * 1000 > 100
```

### 시스템 메트릭 (Node Exporter)

#### 1. node_cpu_seconds_total
**설명**: CPU 사용 시간

**PromQL 예시**:
```promql
# CPU 사용률
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

#### 2. node_memory_MemAvailable_bytes
**설명**: 사용 가능한 메모리

**PromQL 예시**:
```promql
# 메모리 사용률
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

---

## 🎨 Grafana 대시보드

### 접속 방법

#### 로컬
```
http://localhost:4000
ID: admin
PW: admin
```

#### 프로덕션
```
http://152.67.216.145:4000
ID: admin
PW: admin
```

### 대시보드 구성

#### 1. Overview 패널

**HTTP 요청률 (Graph)**
```promql
sum(rate(http_requests_total[5m])) by (service)
```
- Y축: Requests/sec
- 범례: Auth Service, Board Service

**응답 시간 P95 (Gauge)**
```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```
- 단위: seconds
- Threshold: >0.5s 경고, >1s 위험

**에러율 (Stat)**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m]))
* 100
```
- 단위: %
- Threshold: >1% 경고, >5% 위험

#### 2. Request Details 패널

**요청 수 (상태 코드별)**
```promql
sum by (status) (rate(http_requests_total[5m]))
```

**응답 시간 분포 (Heatmap)**
```promql
sum(increase(http_request_duration_seconds_bucket[1m])) by (le)
```

**엔드포인트별 요청률**
```promql
topk(10,
  sum by (route) (rate(http_requests_total[5m]))
)
```

#### 3. System Resources 패널

**CPU 사용률**
```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**메모리 사용량**
```promql
# RAM
node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes

# Swap
node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes
```

**디스크 사용률**
```promql
100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100)
```

#### 4. Redis 메트릭 (향후)

**연결 수**
```promql
redis_connected_clients
```

**캐시 히트율**
```promql
(redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)) * 100
```

**메모리 사용량**
```promql
redis_memory_used_bytes / 1024 / 1024
```

---

## 📋 대시보드 JSON

### board-service.json

**위치**: `monitoring/grafana/provisioning/dashboards/board-service.json`

**자동 프로비저닝**:
```yaml
# monitoring/grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'Board Service'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /etc/grafana/provisioning/dashboards
```

---

## 🔍 주요 쿼리 모음

### 성능 분석

#### 가장 느린 엔드포인트 Top 10
```promql
topk(10,
  histogram_quantile(0.95,
    sum by (route, le) (rate(http_request_duration_seconds_bucket[5m]))
  )
)
```

#### 에러가 가장 많은 엔드포인트
```promql
topk(10,
  sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
)
```

#### 트래픽이 가장 많은 시간대
```promql
sum(rate(http_requests_total[1h]))
```

### 리소스 사용량

#### 메모리 사용률 (컨테이너별)
```promql
sum by (container_name) (
  container_memory_usage_bytes / container_spec_memory_limit_bytes
) * 100
```

#### CPU 사용률 (컨테이너별)
```promql
sum by (container_name) (
  rate(container_cpu_usage_seconds_total[5m])
) * 100
```

### 가용성

#### Uptime
```promql
up{job="board-service"}
```
- 1: UP
- 0: DOWN

#### 서비스 가용성 (SLA)
```promql
avg_over_time(up{job="board-service"}[30d]) * 100
```
- 목표: 99.9% (Three Nines)

---

## 🚨 알림 규칙 (향후)

### Prometheus Alerting Rules

**alerts.yml**:
```yaml
groups:
  - name: board-service
    interval: 30s
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow Response Time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time"
          description: "P95 latency is {{ $value }}s"

      # Service Down
      - alert: ServiceDown
        expr: up{job="board-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} is unreachable"

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          /
          node_memory_MemTotal_bytes
          > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
```

### Grafana Alerts (향후)

**Slack 통합**:
1. Grafana → Alerting → Contact points
2. New contact point
3. Type: Slack
4. Webhook URL 입력
5. Test & Save

---

## 📊 성능 목표 (SLI/SLO)

### Service Level Indicators (SLI)

| 지표 | 측정 방법 | 목표 (SLO) |
|------|----------|-----------|
| 가용성 | `avg_over_time(up[30d])` | 99.9% |
| 응답 시간 (P95) | `histogram_quantile(0.95, ...)` | < 500ms |
| 에러율 | `rate(5xx) / rate(total)` | < 1% |
| 처리량 | `rate(http_requests_total[5m])` | > 100 req/s |

### SLA (Service Level Agreement)

**약속**:
- 월간 가용성 99.9% 이상
- P95 응답 시간 500ms 이하
- 에러율 1% 미만

**Downtime 허용량**:
- 99.9%: 43분/월
- 99.95%: 21분/월
- 99.99%: 4분/월

---

## 🔧 모니터링 운영

### 일일 점검

```bash
# 1. Prometheus 타겟 상태 확인
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# 2. Grafana 대시보드 확인
open http://localhost:4000

# 3. 에러 로그 확인
docker-compose logs --tail=100 | grep -i error
```

### 주간 점검

- [ ] Grafana 대시보드 리뷰
- [ ] 에러율 추세 분석
- [ ] P95 응답 시간 추세 분석
- [ ] 메모리 사용량 추세 분석

### 월간 점검

- [ ] SLA 달성 여부 확인
- [ ] 성능 벤치마크 실행
- [ ] 캐시 히트율 분석
- [ ] 슬로우 쿼리 분석

---

## 🛠️ 트러블슈팅

### Prometheus 타겟 DOWN

```bash
# 1. 서비스 상태 확인
docker-compose ps

# 2. /metrics 엔드포인트 확인
curl http://localhost/metrics
curl http://localhost/auth/metrics

# 3. Prometheus 로그 확인
docker-compose logs prometheus | grep -i error
```

### Grafana 연결 실패

```bash
# 1. Grafana 재시작
docker-compose restart grafana

# 2. 데이터소스 확인
# Grafana → Configuration → Data sources
# Prometheus URL: http://prometheus:9090
```

---

## 📚 참고 자료

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**Last Updated**: 2026-02-06
