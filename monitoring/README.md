# Monitoring

## 개요

이 폴더는 Prometheus와 Grafana 기반 모니터링 시스템 설정 파일을 포함합니다. 실시간 메트릭 수집, 시각화, 알림 기능을 제공합니다.

## 폴더 구조

```
monitoring/
├── README.md                    # 이 문서
├── prometheus.yml               # Prometheus 설정
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml   # Grafana 데이터소스 자동 설정
        └── dashboards/
            └── board-service.json  # Board Service 대시보드
```

## 구성 요소

### 1. Prometheus

**역할:** 메트릭 수집 및 저장

**주요 기능:**
- Pull 방식 메트릭 수집 (15초 간격)
- 시계열 데이터베이스 (TSDB)
- PromQL 쿼리 언어

**접속 URL:** http://localhost:9090

### 2. Grafana

**역할:** 메트릭 시각화 및 대시보드

**주요 기능:**
- 실시간 그래프 및 차트
- 알림 설정
- 다중 데이터소스 지원

**접속 URL:** http://localhost:3333  
**기본 계정:** admin / admin

### 3. Node Exporter

**역할:** 시스템 메트릭 수집

**주요 메트릭:**
- CPU 사용률
- 메모리 사용량
- 디스크 I/O
- 네트워크 통계

**접속 URL:** http://localhost:9100

## Prometheus 설정

### prometheus.yml

```yaml
global:
  scrape_interval: 15s        # 메트릭 수집 주기
  evaluation_interval: 15s    # 규칙 평가 주기

scrape_configs:
  # Auth Service 메트릭 수집
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3001']
    metrics_path: '/metrics'

  # Board Service 메트릭 수집 (3개 레플리카)
  - job_name: 'board-service'
    static_configs:
      - targets: 
          - 'board-service-1:3000'
          - 'board-service-2:3000'
          - 'board-service-3:3000'
    metrics_path: '/metrics'

  # Node Exporter (시스템 메트릭)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

**설정 설명:**
- `scrape_interval`: 각 타겟에서 메트릭을 수집하는 주기
- `job_name`: 메트릭 그룹 이름
- `targets`: 수집 대상 서비스 (컨테이너 이름:포트)
- `metrics_path`: 메트릭 엔드포인트 경로

### Docker Compose 설정

```yaml
prometheus:
  image: prom/prometheus:latest
  container_name: prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - prometheus-data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
    - '--storage.tsdb.retention.time=15d'  # 데이터 보관 기간
```

## Grafana 설정

### Datasource 자동 구성

**파일:** `grafana/provisioning/datasources/prometheus.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

**설정 설명:**
- `access: proxy`: Grafana 서버를 통해 Prometheus 접근
- `isDefault: true`: 기본 데이터소스로 설정
- `editable: false`: UI에서 수정 불가

### Dashboard 구성

**파일:** `grafana/provisioning/dashboards/board-service.json`

**주요 패널:**
1. HTTP 요청률
2. 응답 시간 (P95)
3. 에러율
4. 메모리 사용량
5. CPU 사용률

### Docker Compose 설정

```yaml
grafana:
  image: grafana/grafana:latest
  container_name: grafana
  ports:
    - "3333:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
    - GF_USERS_ALLOW_SIGN_UP=false
  volumes:
    - grafana-data:/var/lib/grafana
    - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
```

## 주요 메트릭

### Application Metrics

#### 1. HTTP 요청 총 개수
```promql
http_requests_total
```

**Labels:**
- `method`: GET, POST, PATCH, DELETE
- `route`: /board, /auth/signin
- `status`: 2xx, 4xx, 5xx

#### 2. HTTP 응답 시간
```promql
http_request_duration_seconds
```

**Type:** Histogram  
**Buckets:** 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10

### System Metrics

#### 1. CPU 사용률
```promql
rate(process_cpu_user_seconds_total[5m])
```

#### 2. 메모리 사용량
```promql
nodejs_heap_size_used_bytes
```

#### 3. Event Loop 지연
```promql
nodejs_eventloop_lag_seconds
```

## PromQL 쿼리 예시

### 요청률 (RPS)
```promql
# 전체 요청률
rate(http_requests_total[5m])

# 서비스별 요청률
sum by (job) (rate(http_requests_total[5m]))

# 라우트별 요청률
sum by (route) (rate(http_requests_total[5m]))
```

### 응답 시간 (Latency)
```promql
# 평균 응답 시간
rate(http_request_duration_seconds_sum[5m]) 
/ 
rate(http_request_duration_seconds_count[5m])

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

### Top N 쿼리
```promql
# 가장 많이 호출되는 엔드포인트 Top 5
topk(5, sum by (route) (rate(http_requests_total[5m])))

# 가장 느린 엔드포인트 Top 5
topk(5, histogram_quantile(0.95, 
  sum by (route, le) (rate(http_request_duration_seconds_bucket[5m]))
))
```

## Grafana 대시보드 구성

### 패널 1: HTTP Request Rate

**Type:** Graph  
**Query:**
```promql
sum by (job) (rate(http_requests_total[5m]))
```

**Legend:**
```
{{job}}
```

### 패널 2: Response Time

**Type:** Graph  
**Queries:**
```promql
# P50
histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# P95
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# P99
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

### 패널 3: Error Rate

**Type:** Gauge  
**Query:**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m]))
```

**Thresholds:**
- Green: < 0.01 (1%)
- Yellow: 0.01 ~ 0.05 (1% ~ 5%)
- Red: > 0.05 (5%)

### 패널 4: Memory Usage

**Type:** Graph  
**Query:**
```promql
nodejs_heap_size_used_bytes
```

**Unit:** bytes

### 패널 5: CPU Usage

**Type:** Graph  
**Query:**
```promql
rate(process_cpu_user_seconds_total[5m]) * 100
```

**Unit:** percent (0-100)

## 알림 설정 (예정)

### Alert Rule 예시

```yaml
groups:
  - name: board-service-alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / 
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "에러율 5% 초과"
          description: "5분간 평균 에러율이 5%를 초과했습니다."

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 응답 시간 1초 초과"
          description: "응답 시간이 너무 느립니다."
```

## 타겟 상태 확인

### Prometheus UI에서 확인
1. http://localhost:9090 접속
2. Status → Targets 메뉴
3. 모든 타겟이 `UP` 상태인지 확인

**정상 상태:**
```
auth-service (1/1 up)
board-service (3/3 up)
node-exporter (1/1 up)
```

**비정상 상태 (DOWN):**
- 서비스 미실행
- 네트워크 연결 실패
- Health Check 실패

### 커맨드라인에서 확인
```bash
# Prometheus 타겟 상태
curl http://localhost:9090/api/v1/targets

# 특정 메트릭 조회
curl http://localhost:9090/api/v1/query?query=http_requests_total
```

## 데이터 보관 정책

### 기본 설정
- **보관 기간:** 15일
- **디스크 사용량:** 약 1GB (기본 메트릭)

### 보관 기간 변경
```yaml
# docker-compose.yml
command:
  - '--storage.tsdb.retention.time=30d'  # 30일로 변경
```

### 수동 데이터 삭제
```bash
# Prometheus 컨테이너 내부
docker exec -it prometheus /bin/sh
rm -rf /prometheus/*
```

## 트러블슈팅

### Prometheus 타겟 DOWN

**증상:**
Targets 페이지에서 `DOWN` 상태

**원인 및 해결:**
```bash
# 1. 서비스 Health Check 확인
curl http://localhost/health
curl http://localhost/auth/health

# 2. 메트릭 엔드포인트 확인
curl http://localhost/metrics
curl http://localhost/auth/metrics

# 3. 서비스 로그 확인
docker-compose logs -f board-service-1

# 4. Prometheus 설정 검증
docker exec prometheus cat /etc/prometheus/prometheus.yml

# 5. 서비스 재시작
docker-compose restart prometheus
```

### Grafana 데이터소스 연결 실패

**증상:**
Dashboard에서 "No Data" 표시

**해결:**
```bash
# 1. Prometheus 상태 확인
curl http://localhost:9090/-/healthy

# 2. Grafana에서 데이터소스 테스트
# Configuration → Data Sources → Prometheus → Test

# 3. 쿼리 직접 실행
# Explore 메뉴에서 쿼리 테스트
```

### 메트릭 수집 안 됨

**증상:**
PromQL 쿼리 결과가 빈 배열

**해결:**
```bash
# 1. 서비스에서 메트릭 노출 확인
curl http://localhost/metrics | grep http_requests_total

# 2. MetricsInterceptor 글로벌 등록 확인
# main.ts에서 app.useGlobalInterceptors(app.get(MetricsInterceptor));

# 3. 서비스 재시작
docker-compose restart board-service-1
```

## 성능 최적화

### Prometheus 메모리 사용량 줄이기
```yaml
# docker-compose.yml
command:
  - '--storage.tsdb.retention.time=7d'  # 보관 기간 단축
  - '--storage.tsdb.min-block-duration=2h'
```

### Grafana 쿼리 최적화
```promql
# ❌ 비효율적
rate(http_requests_total[1h])  # 너무 긴 범위

# ✅ 효율적
rate(http_requests_total[5m])  # 적절한 범위
```

## 모니터링 베스트 프랙티스

1. **Golden Signals 모니터링**
   - Latency (응답 시간)
   - Traffic (요청률)
   - Errors (에러율)
   - Saturation (리소스 사용률)

2. **알림 설정**
   - Critical: 즉시 대응 필요
   - Warning: 조사 필요
   - Info: 참고용

3. **대시보드 구성**
   - 서비스별 대시보드 분리
   - 한 화면에 핵심 지표 배치
   - 시간 범위 통일 (Last 5m, 15m, 1h)

4. **정기 점검**
   - 주간: 대시보드 리뷰
   - 월간: 알림 임계값 조정
   - 분기: 메트릭 정리 (불필요한 메트릭 제거)

## 참고 자료

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/)
- [Best Practices for Monitoring](https://prometheus.io/docs/practices/)