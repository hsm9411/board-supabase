# 시스템 아키텍처

> **프로젝트**: Scalable Bulletin Board System
> **업데이트**: 2026-03-11

---

## 📐 전체 아키텍처

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────┐
│                    Internet (Public)                     │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────▼────────────┐
            │   UFW Firewall (OCI)    │
            │   Ports: 22, 80, 443    │
            └────────────┬────────────┘
                         │
            ┌────────────▼────────────┐
            │  Nginx (API Gateway)    │
            │  Load Balancer          │
            │  Port: 80               │
            └────┬──────────────┬─────┘
                 │              │
    ┌────────────▼──┐    ┌─────▼──────────────┐
    │ Auth Service  │    │  Board Service x3  │
    │   (3001)      │    │     (3000)         │
    │               │    │  - Replica 1       │
    │ - JWT Auth    │    │  - Replica 2       │
    │ - User CRUD   │    │  - Replica 3       │
    └───────┬───────┘    └──────┬─────────────┘
            │                   │
            │    ┌──────────────┴───┐
            │    │                  │
         ┌──▼────▼──┐        ┌─────▼─────┐
         │ Supabase │        │   Redis   │
         │PostgreSQL│        │   Cache   │
         │          │        │  (6379)   │
         │auth_schema│        └───────────┘
         │board_schema│
         └──────────┘

    ┌─────────────────────────────┐
    │   Monitoring Stack          │
    │  - Prometheus (9090)        │
    │  - Grafana (4000)           │
    └─────────────────────────────┘
```

---

## 🏗️ 마이크로서비스 구조

### 서비스 분리 전략

| 서비스 | 포트 | 스키마 | 역할 | 레플리카 |
|--------|------|--------|------|----------|
| Auth Service | 3001 | auth_schema | 인증/인가, 사용자 관리 | 1대 |
| Board Service | 3000 | board_schema | 게시판 CRUD, 캐싱 | 3대 |

### 왜 MSA인가?

#### 1. Schema Separation (논리적 DB 분리)
```sql
-- Auth Service 전용
auth_schema.users

-- Board Service 전용
board_schema.posts
```

**장점:**
- 서비스 간 데이터 독립성
- 마이그레이션 격리
- 향후 물리적 DB 분리 용이

#### 2. Independent Scaling
- Board Service만 3대 레플리카로 확장
- 트래픽이 많은 서비스만 선택적 스케일링

#### 3. Fault Isolation
- Auth 장애 시 Board 조회는 정상 동작 (JWT 검증만 실패)
- Board 장애 시 Auth는 정상 동작

---

## 🔄 데이터 플로우

### 1. 회원가입 플로우
```
Client → Nginx → Auth Service → Supabase
                                  ↓
                         auth_schema.users
```

### 2. 로그인 플로우
```
Client → Nginx → Auth Service → Supabase
                     ↓
              JWT 토큰 발급
                     ↓
                 Client
```

### 3. 게시글 조회 플로우 (캐시 히트)
```
Client → Nginx → Board Service → Redis Cache → Client
                                    ↓ (HIT)
```

### 4. 게시글 조회 플로우 (캐시 미스)
```
Client → Nginx → Board Service → Redis Cache (MISS)
                     ↓
                Supabase
                     ↓
            board_schema.posts
                     ↓
            Redis Cache (저장)
                     ↓
                  Client
```

### 5. 게시글 작성 플로우
```
Client (JWT) → Nginx → Board Service
                          ↓
                    JWT 검증
                          ↓
              Auth Client (내부 API)
                          ↓
                  Auth Service
                          ↓
                 사용자 정보 조회
                          ↓
              Board Service (비정규화)
                          ↓
          author_nickname, author_email 저장
                          ↓
              Supabase (board_schema.posts)
                          ↓
          Redis Cache 무효화 (posts:*)
                          ↓
                      Client
```

---

## 🗄️ 데이터베이스 아키텍처

### Schema Separation 전략

#### 왜 스키마를 분리했는가?
1. **서비스 독립성**: 각 서비스는 자신의 스키마만 관리
2. **마이그레이션 격리**: Auth 마이그레이션이 Board에 영향 없음
3. **보안**: RLS 정책을 스키마 단위로 적용
4. **향후 확장**: 물리적 DB 분리 시 마이그레이션 용이

#### 스키마 구조
```
supabase_database
│
├── auth_schema
│   └── users
│       ├── id (UUID, PK)
│       ├── email (VARCHAR, UNIQUE)
│       ├── password (VARCHAR, bcrypt)
│       ├── nickname (VARCHAR)
│       ├── created_at (TIMESTAMPTZ)
│       └── updated_at (TIMESTAMPTZ)
│
└── board_schema
    └── posts
        ├── id (UUID, PK)
        ├── title (VARCHAR)
        ├── content (TEXT)
        ├── is_public (BOOLEAN)
        ├── author_id (UUID)          ← FK 아님 (MSA 원칙)
        ├── author_nickname (VARCHAR) ← 비정규화
        ├── author_email (VARCHAR)    ← 비정규화
        ├── created_at (TIMESTAMPTZ)
        └── updated_at (TIMESTAMPTZ)
```

### 비정규화 전략

#### 왜 비정규화를 했는가?
**문제:**
- MSA에서 서비스 간 JOIN 불가능
- 게시글 목록 조회 시마다 Auth Service 호출 필요 (N+1 문제)

**해결책:**
```typescript
// 게시글 작성 시 작성자 정보 복사
const user = await this.authClient.getUserById(authorId);
const post = {
  ...dto,
  authorId: user.id,
  authorNickname: user.nickname,  // ✅ 비정규화
  authorEmail: user.email,        // ✅ 비정규화
};
```

**트레이드오프:**
- ❌ 데이터 일관성 문제 (사용자 닉네임 변경 시 기존 게시글 반영 안 됨)
- ✅ 조회 성능 향상 (단일 쿼리로 완결)
- ✅ 네트워크 홉 감소
- ✅ Auth Service 장애 시에도 게시글 조회 가능

---

## 🚀 인프라 아키텍처

### 배포 환경 비교

| 구성요소 | 로컬 개발 | 프로덕션 (OCI) |
|---------|----------|---------------|
| Auth Service | 1대 | 1대 |
| Board Service | 3대 | 3대 |
| Redis | 1대 (무제한) | 1대 (256MB limit) |
| Nginx | 1대 | 1대 |
| Prometheus | 1대 | 1대 (15s interval) |
| Grafana | 1대 | 1대 |
| Supabase | External | External |

### Docker 네트워크

```
app-network (bridge)
├── nginx
├── auth-service
├── board-service-1
├── board-service-2
├── board-service-3
├── redis
├── prometheus
└── grafana
```

**네트워크 설정:**
- 모든 컨테이너는 `app-network`에 연결
- 서비스 간 통신은 컨테이너 이름으로 해결
- 외부 노출은 Nginx만 (80:80)

---

## 🔄 로드 밸런싱

### Nginx 라운드 로빈

```nginx
upstream board_service {
    server board-service-1:3000;
    server board-service-2:3000;
    server board-service-3:3000;
}

location /board {
    proxy_pass http://board_service;
}
```

**동작 방식:**
1. 요청 1 → board-service-1
2. 요청 2 → board-service-2
3. 요청 3 → board-service-3
4. 요청 4 → board-service-1 (순환)

**Health Check:**
- 실패한 서비스는 자동으로 제외
- 복구되면 자동으로 재진입

---

## 💾 캐싱 전략

### Redis Cache-Aside 패턴

```typescript
// 읽기 플로우
async findAll() {
  // 1. 캐시 확인
  const cached = await redis.get('posts:list');
  if (cached) return cached;  // 캐시 히트

  // 2. DB 조회 (캐시 미스)
  const posts = await db.find();

  // 3. 캐시 저장
  await redis.set('posts:list', posts, TTL);

  return posts;
}

// 쓰기 플로우
async create(dto) {
  const post = await db.save(dto);

  // 캐시 무효화
  await redis.del('posts:*');

  return post;
}
```

### TTL 전략

| 데이터 | TTL | 이유 |
|--------|-----|------|
| 게시글 목록 | 10분 | 자주 변경되지 않음 |
| 게시글 상세 | 30분 | 거의 변경되지 않음 |
| 사용자 정보 | 1시간 | 변경 빈도 낮음 |

### 메모리 최적화 (Free Tier)

```yaml
redis:
  command: redis-server
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
```

**설정 의미:**
- `maxmemory 256mb`: 최대 256MB까지만 사용
- `allkeys-lru`: 메모리 부족 시 LRU 방식으로 제거

---

## 📊 모니터링 아키텍처

### Prometheus Scraping

```yaml
scrape_configs:
  - job_name: 'auth-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['auth-service:3001']

  - job_name: 'board-service'
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'board-service-1:3000'
          - 'board-service-2:3000'
          - 'board-service-3:3000'
```

### 수집 메트릭

| 메트릭 | 유형 | 설명 |
|--------|------|------|
| `http_requests_total` | Counter | 총 HTTP 요청 수 |
| `http_request_duration_seconds` | Histogram | 응답 시간 분포 |
| `process_cpu_user_seconds_total` | Counter | CPU 사용 시간 |
| `nodejs_heap_size_used_bytes` | Gauge | 메모리 사용량 |

### Grafana 대시보드

**패널 구성:**
1. HTTP 요청률 (Graph)
2. 응답 시간 P95 (Gauge)
3. 에러율 (Stat)
4. CPU/메모리 사용량 (Graph)

---

## 🔐 보안 아키텍처

### 1. JWT 인증 플로우

```
Client → POST /auth/signin → Auth Service
                                  ↓
                         비밀번호 검증 (bcrypt)
                                  ↓
                            JWT 토큰 발급
                                  ↓
                               Client
                                  ↓
              Authorization: Bearer <token>
                                  ↓
              Board Service → JWT 검증
                                  ↓
                        userId 추출 → 권한 확인
```

### 2. UFW 방화벽 (OCI)

```bash
# 인바운드 규칙
22/tcp   ALLOW   Anywhere  # SSH
80/tcp   ALLOW   Anywhere  # HTTP
443/tcp  ALLOW   Anywhere  # HTTPS

# 기본 정책
Default: deny (incoming), allow (outgoing)
```

### 3. RLS (Row Level Security)

```sql
-- 사용자는 자신의 게시글만 수정/삭제 가능
CREATE POLICY "Users can only modify own posts"
ON board_schema.posts
FOR UPDATE
USING (author_id = current_user_id());
```

---

## 🚀 CI/CD 파이프라인

### GitHub Actions 워크플로우

```
Git Push (main/develop)
    ↓
┌───┴────────────────────────────────────┐
│  1. Lint & Test                        │
│     - npm run lint                     │
│     - npm test                         │
└───┬────────────────────────────────────┘
    ↓
┌───┴────────────────────────────────────┐
│  2. Docker Build                       │
│     - docker build                     │
│     - docker tag                       │
└───┬────────────────────────────────────┘
    ↓
┌───┴────────────────────────────────────┐
│  3. Docker Push                        │
│     - docker push to Docker Hub        │
└───┬────────────────────────────────────┘
    ↓
┌───┴────────────────────────────────────┐
│  4. Deploy (workflow_dispatch)         │
│     - SSH to OCI                       │
│     - docker compose pull              │
│     - Rolling Update                   │
└────────────────────────────────────────┘
```

### Rolling Update 전략

```bash
# Board Service 순차 재시작 (무중단 배포)
docker compose up -d board-service-1 --no-deps
sleep 10
docker compose up -d board-service-2 --no-deps
sleep 10
docker compose up -d board-service-3 --no-deps
```

**장점:**
- 3대 중 2대는 항상 실행 중
- 사용자는 서비스 중단 감지 못함

---

## 🎯 설계 원칙 및 트레이드오프

### 적용된 원칙

#### 1. 12-Factor App
- ✅ 환경 변수로 설정 관리 (.env)
- ✅ 상태 비저장 프로세스 (Redis 외부 캐시)
- ✅ 포트 바인딩 (3000, 3001)
- ✅ 로그를 이벤트 스트림으로 (stdout)

#### 2. MSA 패턴
- ✅ Schema Separation
- ✅ API Gateway (Nginx)
- ✅ Service Discovery (Docker DNS)
- ✅ Centralized Logging (stdout)

#### 3. CAP 이론
**선택: AP (Availability + Partition Tolerance)**
- 일관성(C)보다 가용성(A) 우선
- 비정규화로 데이터 일관성 포기
- 대신 조회 성능 향상

### 트레이드오프

| 선택 | 장점 | 단점 | 해결책 |
|------|------|------|--------|
| 비정규화 | 조회 성능 ↑ | 데이터 불일치 | 이벤트 버스 (향후) |
| Redis 캐싱 | 응답 속도 10배↑ | 메모리 사용 | LRU 정책, 256MB limit |
| 3-replica | 고가용성 | 리소스 3배 | Free Tier 한계 내 |
| Schema 분리 | 독립성 ↑ | JOIN 불가 | 비정규화 |

---

## 📈 캐싱 효과

Cache-Aside 패턴을 적용하면 동일 파라미터의 반복 조회는 Redis에서 응답하므로 DB 쿼리가 줄어듭니다. OCI Free Tier(1 vCPU / 1GB RAM) 환경에서 실제 측정한 수치는 없으며, 효과는 캐시 히트율과 서버 부하에 따라 달라집니다.

Prometheus의 `cache_hits_total` / `cache_misses_total` 메트릭으로 운영 중 실제 히트율을 확인할 수 있습니다.

```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) * 100
```

---

## 📚 참고 자료

- **상세 README**: `/README.md`
- **DB 스키마**: `/schema_migration.sql`
- **Nginx 설정**: `/nginx.conf`
- **Docker Compose**: `/docker-compose.yml`, `/docker-compose.prod.yml`
- **Prometheus 설정**: `/monitoring/prometheus.yml`

---

**Last Updated**: 2026-03-11
**Author**: hsm9411
