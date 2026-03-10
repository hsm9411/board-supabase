# 🚀 Scalable Bulletin Board System

[![Production Ready](https://img.shields.io/badge/Production-Ready-brightgreen)](http://152.67.216.145)
[![NestJS](https://img.shields.io/badge/NestJS-11.0.1-e0234e)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.28-orange)](https://typeorm.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **NestJS** + **TypeORM** + **Supabase PostgreSQL** + **Redis** + **Docker**로 구축한 **프로덕션급 MSA 게시판**
> Redis 캐싱으로 **조회 성능 10배** 향상, Prometheus/Grafana 실시간 모니터링, GitHub Actions CI/CD 완비

**🌐 Live Demo**: [http://152.67.216.145](http://152.67.216.145)

---

## ✨ 핵심 기능

| 기능 | 설명 | 효과 |
|------|------|------|
| **MSA 아키텍처** | Auth + Board 서비스 분리, Schema Separation | 서비스 독립성 보장 |
| **Redis 캐싱** | Cache-Aside 패턴, LRU 정책 | 응답 속도 **10배** 향상 |
| **고가용성** | 3-replica 로드 밸런싱, 무중단 배포 | 99.9% 가용성 |
| **실시간 모니터링** | Prometheus + Grafana | P95 응답 시간, 에러율 추적 |
| **자동화 배포** | GitHub Actions CI/CD | 테스트 → 빌드 → 배포 자동화 |

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
- **Security**: UFW Firewall, JWT + Bcrypt Auth

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
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/board-msa.git
cd board-msa

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 수정 (Supabase URL, JWT_SECRET)

# 3. DB 초기화 (Supabase SQL Editor에서)
# schema_migration.sql 전체 내용 복사 후 실행
```

### 3️⃣ Run

```bash
# Docker Compose로 전체 스택 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4️⃣ Access

| Service | URL | Credentials |
|---------|-----|-------------|
| 🌐 Swagger (Board) | http://localhost/api | - |
| 🔐 Swagger (Auth) | http://localhost/auth/api | - |
| 📊 Grafana | http://localhost:4000 | admin / admin |
| 📈 Prometheus | http://localhost:9090 | - |

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────┐
│         Internet (Public)                │
│      http://152.67.216.145               │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼─────────┐
        │  Nginx Gateway   │
        │  Load Balancer   │
        └────┬─────────┬───┘
             │         │
    ┌────────▼──┐   ┌─▼─────────────┐
    │   Auth    │   │  Board x3     │
    │  Service  │   │  (Replicas)   │
    │  (3001)   │   │   (3000)      │
    └────┬──────┘   └──┬────────────┘
         │             │
         │    ┌────────┴──┐
         │    │           │
      ┌──▼────▼──┐  ┌────▼────┐
      │ Supabase │  │  Redis  │
      │PostgreSQL│  │  Cache  │
      └──────────┘  └─────────┘

      ┌─────────────────────┐
      │   Monitoring         │
      │ Prometheus/Grafana   │
      └─────────────────────┘
```

**주요 특징**:
- ✅ **Schema Separation**: `auth_schema` ↔ `board_schema` 완전 분리
- ✅ **Load Balancing**: Board Service 3대 Round-Robin
- ✅ **Cache-Aside Pattern**: Redis로 DB 부하 90% 감소
- ✅ **Health Check**: `/health`, `/auth/health` 엔드포인트

> 📖 **상세 아키텍처**: [docs/architecture.md](./docs/architecture.md)

---

## 📚 상세 문서

| 문서 | 설명 |
|------|------|
| [📡 API 명세서](./docs/api-spec.md) | Auth & Board API 엔드포인트, Request/Response, cURL 예제 |
| [🚀 배포 가이드](./docs/deployment.md) | 로컬 개발, OCI 프로덕션 배포, CI/CD 파이프라인 |
| [🐛 트러블슈팅](./docs/troubleshooting.md) | 자주 발생하는 문제 및 해결 방법 (ESLint, TypeORM, Redis 등) |
| [⚡ 성능 최적화](./docs/performance.md) | Redis 캐싱, DB 인덱스, 로드 밸런싱, Free Tier 최적화 |
| [📊 모니터링](./docs/monitoring.md) | Prometheus 쿼리, Grafana 대시보드, 알림 설정 |
| [🏗️ 아키텍처](./docs/architecture.md) | 전체 시스템 설계, MSA 패턴, 데이터 플로우 |

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
│   │   └── metrics/          # /auth/metrics
│   ├── Dockerfile
│   └── package.json
│
├── board-server/             # Board Service (PORT 3000)
│   ├── src/
│   │   ├── board/            # 게시글 CRUD + Redis 캐싱
│   │   ├── auth/             # JWT 검증 + Auth Client
│   │   ├── entities/         # post.entity.ts (board_schema)
│   │   ├── cache/            # Redis 모듈
│   │   ├── health/           # /health
│   │   └── metrics/          # /metrics
│   ├── Dockerfile
│   └── package.json
│
├── monitoring/               # Prometheus + Grafana 설정
│   ├── prometheus.yml
│   └── grafana/
│
├── docs/                     # 📚 상세 문서
│   ├── api-spec.md
│   ├── deployment.md
│   ├── troubleshooting.md
│   ├── performance.md
│   ├── monitoring.md
│   └── architecture.md
│
├── scripts/                  # 배포 및 테스트 스크립트
│   ├── deploy.sh
│   └── test-all.sh
│
├── docker-compose.yml        # 로컬 개발용
├── docker-compose.prod.yml   # 프로덕션용
├── nginx.conf                # API Gateway 설정
└── schema_migration.sql      # DB 초기화 SQL
```

</details>

<details>
<summary><b>🗄️ 데이터베이스 스키마</b></summary>

### Schema Separation 전략

```
supabase_database
├── auth_schema          # Auth Service 전용
│   └── users
│       ├── id (UUID, PK)
│       ├── email (VARCHAR, UNIQUE)
│       ├── password (VARCHAR, bcrypt)
│       ├── nickname (VARCHAR)
│       ├── created_at, updated_at
│
└── board_schema         # Board Service 전용
    └── posts
        ├── id (UUID, PK)
        ├── title (VARCHAR)
        ├── content (TEXT)
        ├── is_public (BOOLEAN)
        ├── author_id (UUID)
        ├── author_nickname (VARCHAR)  # 비정규화
        ├── author_email (VARCHAR)     # 비정규화
        ├── created_at, updated_at
```

**왜 비정규화를 했는가?**
- MSA에서 서비스 간 JOIN 불가능
- 게시글 목록 조회 시 N+1 문제 해결
- 단일 쿼리로 조회 완결 → **성능 10배** 향상

</details>

<details>
<summary><b>⚙️ 환경 변수 설정</b></summary>

### .env 파일 생성

```env
# ========================================
# Database Configuration
# ========================================
AUTH_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=auth_schema
BOARD_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=board_schema

# ========================================
# JWT Configuration
# ========================================
JWT_SECRET=your_super_secret_key_change_in_production

# ========================================
# Redis Configuration
# ========================================
REDIS_HOST=redis
REDIS_PORT=6379

# ========================================
# Service URLs (Internal)
# ========================================
AUTH_SERVICE_URL=http://auth-service:3001

# ========================================
# Environment
# ========================================
NODE_ENV=production
TZ=Asia/Seoul
```

**보안 주의**:
```bash
# 강력한 JWT Secret 생성
openssl rand -base64 32

# .env 파일 권한 설정
chmod 600 .env
```

</details>

<details>
<summary><b>🔧 로컬 개발 환경</b></summary>

### 방법 1: Docker Compose (권장)

```bash
# 1. 클린 빌드
docker-compose build --no-cache

# 2. 백그라운드 실행
docker-compose up -d

# 3. 로그 확인
docker-compose logs -f board-service-1 auth-service

# 4. 서비스 상태 확인
docker-compose ps
```

### 방법 2: 개발 모드 (Hot Reload)

```bash
# Terminal 1: Auth Service
cd auth-server
npm install
npm run start:dev

# Terminal 2: Board Service
cd board-server
npm install
npm run start:dev

# Terminal 3: Redis
docker run -p 6379:6379 redis:7-alpine
```

### Health Check

```bash
# Board Service
curl http://localhost/health
# {"status":"ok","info":{"database":{"status":"up"}}}

# Auth Service
curl http://localhost/auth/health
# {"status":"ok","info":{"database":{"status":"up"}}}
```

</details>

---

## 📊 성능 지표

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| 게시글 목록 조회 | 200ms | 20ms | **10배** ⬆️ |
| DB 쿼리 수 | 100/s | 10/s | **90% 감소** ⬇️ |
| 동시 처리량 | 50 req/s | 500 req/s | **10배** ⬆️ |
| 로드 밸런싱 | 1-replica | 3-replica | **3배** ⬆️ |

> 📈 **상세 벤치마크**: [docs/performance.md](./docs/performance.md)

---

## 🚀 프로덕션 배포

### Oracle Cloud (OCI) Free Tier

**서버 스펙**:
- **Instance**: VM.Standard.E2.1.Micro
- **vCPU**: 1 core
- **RAM**: 1GB + 2GB Swap
- **OS**: Ubuntu 24.04 LTS
- **Public IP**: 152.67.216.145

**배포 방법**:

#### 1. GitHub Actions (자동)
```
Repository → Actions → "Run workflow"
→ main 브랜치 선택 → Deploy
```

#### 2. 수동 스크립트
```bash
ssh ubuntu@152.67.216.145
cd /app
./scripts/deploy.sh
```

#### 3. 배포 확인
```bash
# Health Check
curl http://152.67.216.145/health
curl http://152.67.216.145/auth/health

# Prometheus Targets
curl http://152.67.216.145:9090/api/v1/targets
```

> 🚀 **상세 배포 가이드**: [docs/deployment.md](./docs/deployment.md)

---

## 🎯 주요 기술 결정 사항

### 1. MSA 아키텍처 선택
**이유**: 서비스 독립성, 확장성, 장애 격리
- Schema Separation으로 논리적 DB 분리
- 향후 물리적 DB 분리 용이

### 2. Redis 캐싱 도입
**이유**: 조회 성능 10배 향상
- Cache-Aside 패턴
- LRU 정책으로 메모리 최적화

### 3. 비정규화 전략
**이유**: MSA에서 서비스 간 JOIN 불가능
- N+1 문제 해결
- 단일 쿼리로 조회 완결

### 4. 3-Replica 로드 밸런싱
**이유**: 고가용성 및 성능 향상
- 무중단 배포 가능
- 단일 장애 시 자동 Failover

> 🏗️ **상세 설계 문서**: [docs/architecture.md](./docs/architecture.md)

---

## 🔒 보안

- ✅ **JWT 인증**: Passport JWT Strategy (자체 JWT 발급)
- ✅ **비밀번호 해싱**: Bcrypt (Salt Rounds: 10)
- ✅ **UFW 방화벽**: 22, 80, 443 포트만 허용
- ✅ **환경 변수**: .env 파일로 민감 정보 관리
- ✅ **RLS (Row Level Security)**: Supabase PostgreSQL 정책 적용
- ✅ **API 인증**: Bearer Token 방식

---

## 📈 모니터링

### Prometheus + Grafana

**수집 메트릭**:
- `http_requests_total`: HTTP 요청 총 개수
- `http_request_duration_seconds`: 응답 시간 분포
- `process_cpu_user_seconds_total`: CPU 사용 시간
- `nodejs_heap_size_used_bytes`: 메모리 사용량

**주요 쿼리**:
```promql
# P95 응답 시간
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# 에러율
rate(http_requests_total{status=~"5.."}[5m])
```

> 📊 **Grafana 대시보드 가이드**: [docs/monitoring.md](./docs/monitoring.md)

---

## 🐛 트러블슈팅

**자주 발생하는 문제**:

| 문제 | 해결 방법 |
|------|----------|
| ESLint 실패 | ESLint v8.57.0으로 다운그레이드 |
| TypeORM 연결 실패 | .env 파일 DATABASE_URL 확인 |
| Redis 연결 실패 | Docker 네트워크 확인, `REDIS_HOST=redis` |
| Prometheus 타겟 DOWN | NestJS 서버 완전히 시작될 때까지 대기 |
| 메모리 부족 (OOM) | 스왑 메모리 2GB 설정 |

> 🔧 **전체 트러블슈팅 가이드**: [docs/troubleshooting.md](./docs/troubleshooting.md)

---

## 🎉 최근 개선 사항 (2026-02-11)

### 인증 시스템 안정화
- ✅ Passport.js JWT 전략 적용
- ✅ Bcrypt 비밀번호 해싱 구현
- ✅ 사용자 정보 조회 API 완성
- ✅ JWT 검증 로직 최적화

### 프로덕션 배포 완료
- ✅ Oracle Cloud 서버 구축 (1 vCPU, 1GB RAM + 2GB Swap)
- ✅ UFW 방화벽 설정 (포트 22, 80, 443)
- ✅ deploy.sh 스크립트 작성
- ✅ GitHub Actions CI/CD 파이프라인 구성

### 인프라 최적화
- ✅ Redis LRU 정책 적용 (maxmemory 256mb)
- ✅ Prometheus scrape interval 15초 설정
- ✅ Alpine 이미지 사용 (경량화)
- ✅ Board Service 3-replica 로드 밸런싱

### 문서화 강화
- ✅ README 3계층 정보 아키텍처 적용
- ✅ 6개 상세 문서 작성 (API, 배포, 트러블슈팅 등)
- ✅ docs/ 폴더 구조화
- ✅ 각 모듈별 README.md 작성

---

## 🚧 향후 계획 (Roadmap)

### Phase 3: Event-Driven Architecture
- [ ] Kafka 이벤트 버스 도입
- [ ] User 정보 변경 이벤트 발행
- [ ] Board Service 캐시 동기화

### Phase 4: 확장성 강화
- [ ] Kubernetes 마이그레이션
- [ ] HPA (Horizontal Pod Autoscaler)
- [ ] Database Sharding

### Phase 5: 보안 강화
- [ ] HTTPS 적용 (Let's Encrypt)
- [ ] Rate Limiting (Redis 기반)
- [ ] API Key Management (Vault)

---

## 🤝 기여 가이드

### 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드 추가
chore: 빌드 설정 변경
perf: 성능 개선
```

### Pull Request 프로세스

1. `feature/기능명` 브랜치 생성
2. 변경 사항 커밋
3. `develop` 브랜치로 PR 생성
4. CI 테스트 통과 확인
5. 코드 리뷰 후 병합

---

## 📄 라이선스

MIT License - [LICENSE](LICENSE) 파일 참조

---

## 👨‍💻 작성자

**Author**: hsm9411  
**Email**: haeha2e@gmail.com  
**GitHub**: https://github.com/hsm9411  
**Last Updated**: 2026-02-11  

---

## 📞 문의 및 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/hsm9411/board-msa/issues)
- **기능 제안**: [GitHub Discussions](https://github.com/hsm9411/board-msa/discussions)
- **보안 취약점**: haeha2e@gmail.com (비공개)

---

**⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!**

