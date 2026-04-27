# Scalable Bulletin Board System

[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.28-orange)](https://typeorm.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> MSA 아키텍처 학습을 목적으로 제작한 NestJS 게시판 백엔드입니다.
> Auth/Board 서비스를 분리하고, Redis 캐싱·Nginx 로드밸런싱·Prometheus/Grafana 모니터링을 직접 구성하며 운영해봤습니다.
> OCI Free Tier에서 실제 운영했으며 현재는 서버를 종료했습니다.

---

## ✨ 구현 내용

| 항목 | 설명 |
|------|------|
| **MSA 구조** | Auth Service + Board Service 분리, Schema Separation (auth_schema / board_schema) |
| **CQRS 패턴** | Board Service를 Command/Query 핸들러 6개로 분리 |
| **Redis 캐싱** | Cache-Aside 패턴, Version 기반 캐시 무효화 |
| **로드 밸런싱** | Nginx Round-Robin, Board Service 3 replica |
| **모니터링** | Prometheus metrics 수집 (HTTP, 캐시 히트율, 메모리), Grafana 대시보드 |
| **HTTPS** | DuckDNS + Let's Encrypt certbot 자동 갱신 |
| **CI/CD** | GitHub Actions → OCI 서버 자동 배포 |

---

## 🛠️ 기술 스택

<table>
<tr>
<td width="50%">

**Backend & Infrastructure**
- **Framework**: NestJS 11.0.1
- **ORM**: TypeORM 0.3.28
- **Runtime**: Node.js 22 (Alpine)
- **Database**: Supabase PostgreSQL
- **Cache**: Redis 7-alpine
- **Gateway**: Nginx
- **Container**: Docker Compose

</td>
<td width="50%">

**Monitoring & DevOps**
- **Metrics**: Prometheus
- **Dashboard**: Grafana
- **CI/CD**: GitHub Actions
- **Cloud**: Oracle Cloud (OCI Free Tier)
- **Security**: UFW, JWT + Bcrypt, HTTPS (Let's Encrypt)

</td>
</tr>
</table>

---

## ⚡ Quick Start

### 1️⃣ Prerequisites

- [Docker Desktop](https://www.docker.com/) v20.10+
- Supabase 계정 (무료)

### 2️⃣ Clone & Setup

```bash
git clone https://github.com/hsm9411/board-supabase.git
cd board-supabase

cp .env.example .env
# .env 파일 수정 (Supabase URL, JWT_SECRET 등)

# Supabase SQL Editor에서 schema_migration.sql 실행
```

### 3️⃣ Run

```bash
docker-compose up -d
docker-compose logs -f
```

### 4️⃣ Access

| Service | URL | 비고 |
|---------|-----|------|
| Swagger (Board) | http://localhost/api | - |
| Swagger (Auth) | http://localhost/auth/api | - |
| Grafana | http://localhost:4000 | admin / admin |
| Prometheus | http://localhost:9090 | - |

---

## 🏗️ 시스템 아키텍처

```
Internet
    │
  UFW Firewall (22, 80, 443)
    │
Nginx (API Gateway + Load Balancer)
    ├── /auth/*  →  Auth Service (3001)
    └── /*       →  Board Service x3 (3000)  Round-Robin

Auth Service              Board Service (x3, CQRS)
    │                          │
    └── Supabase (auth_schema) ├── Supabase (board_schema)
                               └── Redis (Cache-Aside)

Monitoring
    ├── Prometheus (9090)  ←  /metrics (board x3, auth, redis-exporter, node-exporter)
    └── Grafana    (4000)  ←  Prometheus DataSource
```

**설계 포인트**:
- **Schema Separation**: `auth_schema` ↔ `board_schema` 논리적 분리. 서비스 간 직접 JOIN 없음
- **비정규화**: `author_nickname`, `author_email`을 posts 테이블에 직접 저장하여 게시글 조회 시 Auth Service 호출 없이 단일 쿼리로 완결
- **Version 기반 캐시 무효화**: CUD 발생 시 `posts:version` 숫자를 증가시켜 기존 캐시 키를 자동으로 무효화. `KEYS *` 같은 O(N) Redis 명령을 피할 수 있음

> 📖 **상세 아키텍처**: [docs/architecture.md](./docs/architecture.md)

---

## 📚 상세 문서

| 문서 | 설명 |
|------|------|
| [API 명세서](./docs/api-spec.md) | Auth & Board API 엔드포인트, Request/Response, cURL 예제 |
| [배포 가이드](./docs/deployment.md) | 로컬 개발, OCI 프로덕션 배포, CI/CD 파이프라인 |
| [트러블슈팅](./docs/troubleshooting.md) | 자주 발생하는 문제 및 해결 방법 |
| [성능 최적화](./docs/performance.md) | Redis 캐싱, DB 인덱스, Free Tier 최적화 |
| [모니터링](./docs/monitoring.md) | Prometheus 쿼리, Grafana 대시보드 |
| [아키텍처](./docs/architecture.md) | 전체 시스템 설계, MSA 패턴, 데이터 플로우 |

---

<details>
<summary><b>📂 프로젝트 구조</b></summary>

```
project-root/
├── auth-server/              # Auth Service (PORT 3001)
│   ├── src/
│   │   ├── auth/             # 회원가입, 로그인, JWT
│   │   ├── entities/         # user.entity.ts (auth_schema)
│   │   ├── health/           # /auth/health
│   │   └── metrics/          # /auth/metrics (Prometheus)
│   ├── Dockerfile
│   └── package.json
│
├── board-server/             # Board Service (PORT 3000)
│   ├── src/
│   │   ├── board/
│   │   │   ├── commands/     # CreatePost, UpdatePost, DeletePost 핸들러
│   │   │   ├── queries/      # GetPosts, GetPostById, GetMyPosts 핸들러
│   │   │   └── dto/
│   │   ├── auth/             # JWT 검증 + Auth Client
│   │   ├── entities/         # post.entity.ts (board_schema)
│   │   ├── cache/            # Redis 모듈
│   │   ├── health/           # /health
│   │   └── metrics/          # /metrics (Prometheus)
│   ├── Dockerfile
│   └── package.json
│
├── monitoring/               # Prometheus + Grafana 설정
│   ├── prometheus.yml
│   └── grafana/
│
├── docs/                     # 상세 문서 6개
├── scripts/                  # init-ssl.sh, duckdns-renew.sh, test-all.sh
│
├── docker-compose.yml        # 로컬 개발용
├── docker-compose.prod.yml   # 프로덕션용
├── nginx.conf                # API Gateway + HTTPS 설정
├── nginx.conf.init           # Let's Encrypt 초기 발급용 Nginx 설정
└── schema_migration.sql      # DB 초기화 SQL
```

</details>

<details>
<summary><b>🗄️ 데이터베이스 스키마</b></summary>

```
supabase_database
├── auth_schema
│   └── users
│       ├── id          UUID PK
│       ├── email       VARCHAR UNIQUE
│       ├── password    VARCHAR (bcrypt)
│       ├── nickname    VARCHAR
│       └── created_at  TIMESTAMPTZ
│
└── board_schema
    └── posts
        ├── id               UUID PK
        ├── title            VARCHAR
        ├── content          TEXT
        ├── is_public        BOOLEAN
        ├── author_id        UUID
        ├── author_nickname  VARCHAR  -- 비정규화
        ├── author_email     VARCHAR  -- 비정규화
        └── created_at       TIMESTAMPTZ
```

MSA 환경에서는 서비스 간 직접 JOIN이 불가능하므로, 게시글 조회 시 Auth Service를 호출하지 않기 위해 author 정보를 board_schema에 비정규화하여 저장합니다. 단, 사용자가 닉네임을 변경해도 기존 게시글에는 반영되지 않는 트레이드오프가 있습니다.

</details>

<details>
<summary><b>⚙️ 환경 변수 설정</b></summary>

```env
# Database
AUTH_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=auth_schema
BOARD_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=board_schema

# JWT
JWT_SECRET=your_super_secret_key_change_in_production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Service URLs (Internal)
AUTH_SERVICE_URL=http://auth-service:3001

# Environment
NODE_ENV=production
TZ=Asia/Seoul
```

```bash
# 강력한 JWT Secret 생성
openssl rand -base64 32
```

</details>

<details>
<summary><b>🔧 로컬 개발 환경</b></summary>

### Docker Compose (권장)

```bash
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f board-service-1 auth-service
```

### 개발 모드 (Hot Reload)

```bash
# Terminal 1: Auth Service
cd auth-server && npm install && npm run start:dev

# Terminal 2: Board Service
cd board-server && npm install && npm run start:dev

# Terminal 3: Redis
docker run -p 6379:6379 redis:7-alpine
```

### Health Check

```bash
curl http://localhost/health
curl http://localhost/auth/health
```

</details>

---

## 🎯 주요 기술 결정

### 1. MSA 구조 선택
Auth와 Board를 별도 서비스로 분리하여 Schema Separation을 구현했습니다. 현재는 같은 Supabase 인스턴스를 사용하지만 스키마 경계를 유지하고 있어 물리적 분리로의 전환이 용이합니다.

### 2. CQRS 패턴 적용
Board Service를 Command(쓰기)와 Query(읽기) 핸들러로 분리했습니다. 현재는 단일 DB를 사용하므로 읽기/쓰기 성능 분리 효과는 없지만, 핸들러 단위 테스트 작성이 용이하고 향후 Read Replica 도입 시 구조 변경이 최소화됩니다.

### 3. Version 기반 캐시 무효화
게시글 CUD 발생 시 `posts:version` 숫자를 증가시켜 기존 캐시 키를 무효화합니다. `KEYS posts:*` 같은 O(N) Redis 명령을 사용하지 않아도 됩니다.

### 4. 비정규화 전략
MSA 환경에서 서비스 간 직접 JOIN을 피하기 위해 `author_nickname`, `author_email`을 posts 테이블에 저장합니다. 사용자 닉네임 변경이 기존 게시글에 반영되지 않는 트레이드오프가 있습니다.

> 🏗️ **상세 설계 문서**: [docs/architecture.md](./docs/architecture.md)

---

## 🔒 보안

- **JWT 인증**: Passport JWT Strategy (자체 JWT 발급)
- **비밀번호 해싱**: Bcrypt (Salt Rounds: 10)
- **HTTPS**: Let's Encrypt + DuckDNS + certbot 자동 갱신
- **방화벽**: UFW (22, 80, 443 포트만 허용)
- **환경 변수**: .env 파일로 민감 정보 관리

---

## 📈 모니터링

Prometheus + Grafana 조합으로 실시간 메트릭을 수집합니다.

**수집 메트릭**:
- `http_requests_total`: HTTP 요청 수 (라우트, 메서드, 상태코드별)
- `http_request_duration_seconds`: 응답 시간 분포 (Histogram)
- `cache_hits_total` / `cache_misses_total`: 커스텀 캐시 히트율 메트릭
- `nodejs_heap_size_used_bytes`: Node.js 힙 메모리
- Redis Exporter, Node Exporter 메트릭

**주요 PromQL**:
```promql
# P95 응답 시간
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 캐시 히트율
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) * 100

# 에러율
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

> 📊 **Grafana 대시보드 가이드**: [docs/monitoring.md](./docs/monitoring.md)

---

## 🐛 트러블슈팅

| 문제 | 해결 방법 |
|------|----------|
| ESLint 실패 | ESLint v8.57.0으로 고정 (v9 Flat Config 미호환) |
| TypeORM 연결 실패 | .env DATABASE_URL 확인, Supabase 프로젝트 활성 상태 확인 |
| Redis 연결 실패 | Docker 네트워크 확인, `REDIS_HOST=redis` 설정 확인 |
| Prometheus 타겟 DOWN | NestJS TypeORM 초기화 완료까지 대기 (서버 시작 직후 일시적) |
| OOM (메모리 부족) | 스왑 메모리 2GB 설정 (OCI Free Tier 1GB RAM 환경) |
| certbot 인증서 갱신 실패 | DuckDNS 토큰 확인, nginx reload 상태 확인 |

> 🔧 **전체 트러블슈팅 가이드**: [docs/troubleshooting.md](./docs/troubleshooting.md)

---

## 📝 변경 이력

### 2026-03-11 — CQRS 전환 및 마무리
- Board Service를 CQRS 패턴으로 전환 (Command 3개, Query 3개 핸들러)
- 프로덕션에서 Swagger 활성화 및 Nginx API 라우팅 수정
- MetricsModule을 BoardModule에 등록하여 캐시 메트릭 정상 수집
- 커스텀 캐시 메트릭 (`cache_hits_total`, `cache_misses_total`) 추가

### 2026-03-10 — HTTPS 적용
- DuckDNS + Let's Encrypt certbot 설정
- certbot 자동 갱신 스크립트 (`scripts/duckdns-renew.sh`) 작성
- 초기 인증서 발급용 Nginx 설정 (`nginx.conf.init`) 분리

### 2026-02-11 — 초기 완성
- Auth Service (JWT, Bcrypt, Swagger) 완성
- Board Service (CRUD, Redis 캐싱, 페이지네이션, Swagger) 완성
- OCI Free Tier 서버 구축, UFW 방화벽 설정
- GitHub Actions CI/CD 파이프라인 구성
- Prometheus + Grafana 모니터링 스택 구성
- Redis LRU 정책 (maxmemory 256mb), 스왑 메모리 2GB 설정

---

## 🗒️ 이 프로젝트의 범위

MSA 기본 패턴 학습을 목적으로 아래 항목을 직접 구성하며 운영해봤습니다:

- NestJS 멀티 서비스 구성 (Docker Compose)
- Schema Separation 기반 DB 논리적 분리
- CQRS 패턴 적용
- Redis Cache-Aside + Version 기반 캐시 무효화
- Nginx API Gateway 및 Round-Robin 로드밸런싱
- Prometheus/Grafana 모니터링 스택 연동 및 커스텀 메트릭
- HTTPS (Let's Encrypt) + DuckDNS 자동 갱신
- OCI Free Tier 실운영

다루지 않은 항목:
- 메시지 브로커(Kafka 등) 기반 Event-Driven 패턴
- Kubernetes / 컨테이너 오케스트레이션
- Rate Limiting (`@nestjs/throttler` 설치만 됨, 미적용)
- Grafana 대시보드 자동 프로비저닝 (datasource는 설정됨, dashboard provider YAML 미작성)

---

## 👨‍💻 작성자

**Author**: hsm9411  
**Email**: haeha2e@gmail.com  
**GitHub**: https://github.com/hsm9411  
**Last Updated**: 2026-03-11
