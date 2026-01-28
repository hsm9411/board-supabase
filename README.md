# 🚀 Scalable Bulletin Board System (MSA Transition Phase 2)

이 프로젝트는 **Nest.js**와 **Supabase(PostgreSQL)**를 기반으로 구축된 확장 가능한 게시판 시스템입니다. **Docker**와 **Nginx**를 활용하여 로드 밸런싱 환경(Replica x3)을 구성하였으며, 현재 Monolithic 구조에서 **완전한 MSA(Microservices Architecture)로의 전환**을 수행 중입니다.

## 📋 프로젝트 개요

- **목표:** 서비스 간 강한 결합(Coupling)을 제거하고, 고가용성(HA) 및 독립적인 배포가 가능한 아키텍처 구축
- **핵심 아키텍처:**
    - **Physical Layer:** Single Supabase Instance (Managed PostgreSQL)
    - **Logical Layer (New):** **Schema Separation Strategy** (`auth_schema` vs `board_schema`)
    - **Network Layer:**
        - **Client** → **Nginx (API Gateway/LB)**
        - `/auth/*` → **Auth Service** (Port 3001)
        - `/*` → **Board Service** (Port 3000, Replica x3)
- **주요 특징:**
    - **Decoupling:** 서비스 간 직접적인 DB Join 제거 (Entity 관계 절단)
    - **Denormalization:** 조회 성능 향상을 위한 데이터 반정규화 (`author_name` 등)
    - **Caching Strategy:** 게시판 서비스 내 `cached_users` 테이블을 통한 User 정보 동기화
    - **Load Balancing:** Round-Robin 방식의 트래픽 분산 처리

---

## 🛠 기술 스택 및 버전

| Category | Technology | Version / Note |
| --- | --- | --- |
| **Framework** | Nest.js | 11.x (TypeScript) |
| **Runtime** | Node.js | `22-alpine` (Docker Base Image) |
| **Database** | Supabase | PostgreSQL (Multi-Schema Strategy) |
| **ORM** | TypeORM | `0.3.x` |
| **Infrastructure** | Docker Compose | 3.8 (Multi-container orchestration) |
| **Gateway** | Nginx | Latest (Reverse Proxy & LB) |

---

## 📂 프로젝트 구조 (Project Structure)

MSA 원칙에 따라 각 서비스는 독립적인 도메인과 데이터를 관리합니다.

```bash
project-root/
├── auth-server/                    # [Service 1] 인증 서비스
│   ├── src/
│   │   ├── auth/                   # JWT 발급, 회원가입/로그인 로직
│   │   ├── entities/
│   │   │   └── user.entity.ts      # User Entity (Schema: auth_schema)
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
│
├── board-server/                   # [Service 2] 게시판 서비스
│   ├── src/
│   │   ├── board/                  # 게시글 CRUD 비즈니스 로직
│   │   ├── entities/
│   │   │   ├── post.entity.ts      # Post Entity (Schema: board_schema)
│   │   │   └── user.entity.ts      # CachedUser Entity (Schema: board_schema)
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml              # 서비스 오케스트레이션 & 헬스체크
├── nginx.conf                      # API Gateway 설정
├── schema_migration.sql            # 스키마 분리 및 초기화 스크립트
└── README.md
```

### 🔐 [Auth Service](https://github.com/hsm9411/auth-server)
- **Schema:** `auth_schema`
- **역할:** 사용자 계정 관리, 인증(Authentication), JWT 토큰 발급
- **특징:** 타 서비스의 간섭 없이 독립적인 User 테이블 관리

### 📝 [Board Service](https://github.com/hsm9411/board-server)
- **Schema:** `board_schema`
- **역할:** 게시글 관리, 조회 최적화
- **특징:** 
    - `auth-server`와 직접적인 DB Join 없음
    - **User Caching:** 자주 조회되는 사용자 정보를 `cached_users` 테이블에 복제하여 성능 확보
    - **Denormalization:** 게시글(`posts`) 테이블에 작성자 닉네임을 포함하여 단일 쿼리로 조회 가능

---

## ✨ 기술적 개선 사항 (Technical Improvements)

기존 Monolithic 구조의 한계를 극복하기 위해 다음과 같은 아키텍처 개선을 적용했습니다.

### 1. **DB 스키마 분리 (Schema Isolation)**
- **Before:** `public` 스키마에 모든 테이블 혼재, 서비스 간 강한 결합 발생.
- **After:** 
    - `auth_schema`: 사용자 정보 (`users`)
    - `board_schema`: 게시글 정보 (`posts`, `cached_users`)
    - **효과:** 논리적으로 DB를 분리하여 마이크로서비스 간의 데이터 독립성 보장.

### 2. **Entity 관계 제거 및 반정규화 (Decoupling & Denormalization)**
- **Before:** `User`와 `Post`가 TypeORM `@OneToMany` 관계로 묶여 있어, 서비스 분리 시 에러 발생.
- **After:** 
    - TypeORM Relation 제거 (FK 제약조건 삭제).
    - `Post` 테이블에 `authorId` (UUID)와 `authorNickname`을 직접 저장.
    - **효과:** `JOIN` 없는 고속 조회 가능, 서비스 간 의존성 제거.

### 3. **사용자 정보 캐싱 전략 (User Caching)**
- **Problem:** 게시글 조회 시 작성자 정보를 가져오기 위해 매번 Auth 서비스나 DB를 찌르는 오버헤드.
- **Solution:** 
    - Board 스키마 내에 `cached_users` 테이블 생성.
    - 게시글 작성 시점의 사용자 정보를 스냅샷으로 저장하거나, 비동기적으로 동기화(추후 도입 예정).
    - **효과:** 네트워크 홉(Hop)을 줄이고 게시글 목록 조회 성능 극대화.

### 4. **JWT 검증 로직 최적화**
- **Process:** Controller → Service → Auth Client(검증)
- 각 마이크로서비스(`board-server`)는 자체적으로 `Passport Strategy`를 통해 JWT의 유효성을 검증하며, 토큰 내부의 Payload(User ID, Email)를 신뢰하여 로직을 수행합니다.

---

## ⚙️ 환경 설정 및 실행 방법 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
- [Docker Desktop](https://www.docker.com/)
- [Supabase](https://supabase.com/) 프로젝트

### 2. 환경 변수 설정 (.env)
루트 경로에 `.env` 파일을 생성합니다. **스키마 분리**를 위해 Query Parameter를 주의해서 작성하세요.

```ini
# 공통 설정
JWT_SECRET="your_super_secret_key"
TZ="Asia/Seoul"

# Auth Service DB (auth_schema 사용)
AUTH_DATABASE_URL="postgresql://postgres:[PW]@[HOST]:5432/[DB]?schema=auth_schema"

# Board Service DB (board_schema 사용)
BOARD_DATABASE_URL="postgresql://postgres:[PW]@[HOST]:5432/[DB]?schema=board_schema"
```

### 3. 데이터베이스 초기화 (중요 ⚠️)
스키마 분리를 위해 **Supabase SQL Editor**에서 `schema_migration.sql` 내용을 반드시 실행해야 합니다.

1. `CREATE SCHEMA IF NOT EXISTS auth_schema;`
2. `CREATE SCHEMA IF NOT EXISTS board_schema;`
3. 각 스키마별 테이블 생성 및 권한 부여.

### 4. 실행 (Run Application)
스키마 변경 사항이 적용된 최신 이미지를 빌드합니다.

```bash
# 캐시 없이 클린 빌드 및 실행
docker-compose build --no-cache
docker-compose up -d
```

### 5. 서비스 접속
- **Auth Swagger:** `http://localhost/auth/api` (회원가입/로그인 테스트)
- **Board Swagger:** `http://localhost/board/api` (게시글 CRUD 테스트)
- **Nginx Root:** `http://localhost/`

---

## 🔌 API 명세 및 변경점

### 📝 Board API (Changes)
MSA 전환으로 인해 요청/응답 구조가 일부 변경되었습니다.

- **게시글 작성 (`POST /board`)**
    - 요청: `{ "title": "...", "content": "..." }` (Token Header 필수)
    - 처리: 토큰에서 `sub(userId)`와 `nickname`을 추출하여 `posts` 테이블에 저장.
- **게시글 조회 (`GET /board`)**
    - 응답: `User` 객체를 조인해서 주지 않고, `Post` 엔티티 내의 `authorNickname`을 반환합니다.

---

## 🚧 향후 과제 (Roadmap)

1. **User Sync Event Bus**: Kafka 또는 Redis Pub/Sub을 도입하여 User 정보 변경(닉네임 수정 등) 시 `cached_users` 테이블 자동 동기화.
2. **Circuit Breaker**: Auth 서비스 장애 시 Board 서비스가 생존할 수 있도록 회복 탄력성 확보.
3. **CI/CD Pipeline**: GitHub Actions를 통한 마이크로서비스별 개별 배포 자동화.

---

## 📝 라이선스 및 기여

**Author:** [hsm9411]  
**Last Updated:** 2026-01-28 (MSA Phase 2 Applied)