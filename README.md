# 🚀 Scalable Bulletin Board System (Nest.js + Supabase + Docker)

이 프로젝트는 **Nest.js**와 **Supabase(PostgreSQL)**를 기반으로 구축된 확장 가능한 게시판 시스템입니다. **Docker**와 **Nginx**를 활용하여 로드 밸런싱 환경(Replica x3)을 구성하였으며, 트래픽 분산 처리를 시뮬레이션할 수 있도록 설계되었습니다.

## 📋 프로젝트 개요

- **목표:** 고가용성(High Availability) 및 확장성을 고려한 백엔드 아키텍처 구축
- **핵심 아키텍처:**
    - **MSA (Microservices Architecture)** 구조 채택
    - **Client** → **Nginx (API Gateway/LB)**
        - `/auth/*` → **Auth Service** (포트 3001)
        - `/*` (기본) → **Board Service** (포트 3000, Replica x3)
    - **All Services** → **Supabase (Shared DB)**
- **특징:**
    - Round-Robin 방식의 부하 분산
    - JWT 기반 인증 (Guards, Strategy 적용)
    - TypeORM을 활용한 Entity 관계 설정 (단방향 ManyToOne)
    - Docker Compose를 통한 원터치 인프라 배포
    - *Swagger (OpenAPI)**를 통한 자동화된 API 문서화

---

## 🛠 기술 스택 및 버전

| Category | Technology | Version / Note |
| --- | --- | --- |
| **Framework** | Nest.js | 11.x |
| **Runtime** | Node.js | `22-alpine` (Docker Base Image) |
| **Database** | Supabase | PostgreSQL (Managed) |
| **ORM** | TypeORM | `0.3.x` |
| **Infrastructure** | Docker Compose | 3.8 |
| **Load Balancer** | Nginx | Latest |

---

## 📂 프로젝트 구조 (Project Structure)

본 프로젝트는 MSA 전환을 통해 서비스를 독립적으로 운영합니다.

```
project-root/
├── auth-server/                    # 인증 서비스
│   ├── src/
│   │   ├── auth/                   # 인증 로직 (SignUp, SignIn)
│   │   ├── common/                 # 공통 필터, 인터셉터
│   │   ├── entities/
│   │   │   └── user.entity.ts      # User 엔티티 (단순 인증용)
│   │   ├── app.module.ts
│   │   ├── datasource.ts
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── board-server/                   # 게시판 서비스
│   ├── src/
│   │   ├── auth/                   # JWT 검증 전용 (토큰 발급 없음)
│   │   ├── board/                  # 게시글 CRUD
│   │   ├── common/                 # 공통 필터, 인터셉터
│   │   ├── entities/
│   │   │   ├── user.entity.ts      # User 엔티티 (읽기 전용)
│   │   │   └── post.entity.ts      # Post 엔티티
│   │   ├── app.module.ts
│   │   ├── datasource.ts
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml              # 전체 서비스 오케스트레이션
├── nginx.conf                      # 로드 밸런싱 및 라우팅 설정
├── supabase_rls.sql                # DB 스키마 및 RLS 정책
├── .env                            # 환경 변수
└── README.md

```

### 🔐 [Auth Server](https://claude.ai/chat/auth-server)

- **역할**: 사용자 인증, 토큰 발급 및 검증
- **책임 범위**: User 엔티티 관리, JWT 발급, 회원가입/로그인
- **주요 폴더**: `src/auth`, `src/entities`

### 📝 [Board Server](https://claude.ai/chat/board-server)

- **역할**: 게시글 CRUD 및 비즈니스 로직
- **책임 범위**: Post 엔티티 관리, 게시글 조회/작성/수정/삭제
- **주요 폴더**: `src/board`, `src/entities`, `src/common`

### 🏗️ 인프라 및 공통

- `nginx.conf`: 서비스별 라우팅 및 로드 밸런싱 설정
- `docker-compose.yml`: 전체 서비스 컨테이너 오케스트레이션
- `supabase_rls.sql`: DB 보안 정책 (RLS) 설정

---

## ✨ 기술적 개선 사항 (Technical Improvements)

리팩토링을 통해 다음과 같은 품질 향상 및 보안 강화를 진행하였습니다.

### 1. **MSA 아키텍처 정렬**

- Auth 서버에서 Post 엔티티 제거 → 단일 책임 원칙 준수
- 양방향 관계(`OneToMany`, `ManyToOne`) → 단방향 관계(`ManyToOne`)로 변경
- 서비스 간 경계 명확화: Auth는 인증만, Board는 게시판만 담당

### 2. **표준 예외 처리 도입**

- 중복 회원가입 시 `ConflictException`(409)을 반환하도록 수정하여 API 응답의 의미를 명확히 했습니다.
- 타인의 게시글 수정 시도 시 `ForbiddenException`(403)을 던져 권한 위반을 명확히 구분했습니다.
- **Global Exception Filter**를 도입하여 모든 에러 응답을 일관된 JSON 포맷으로 표준화하였습니다.
    
    ```json
    {  "timestamp": "2026-01-26T15:00:00.000Z",  "path": "/api/target-path",  "message": "Error message",  "statusCode": 400}
    
    ```
    

### 3. **데이터 보안 강화**

- `ClassSerializerInterceptor`와 `@Exclude()`를 도입하여 API 응답 시 사용자의 비밀번호 해시가 노출되지 않도록 차단했습니다.

### 4. **데이터 관계 최적화**

- 게시글 목록 및 상세 조회 시 `leftJoinAndSelect`를 사용하여 작성자(`author`) 정보를 효율적으로 함께 로드하도록 개선했습니다.
- 불필요한 양방향 관계 제거로 순환 참조 방지 및 성능 개선

### 5. **DTO 구조화 및 유효성 검사**

- `SignUpDto`, `SignInDto`, `GetPostsDto` 등으로 DTO를 세분화하고, `class-validator`를 통해 엄격한 타입 검증을 수행합니다.

### 6. **Swagger 문서 고도화**

- 모든 API와 DTO에 Swagger 데코레이터를 적용하여 파라미터 설명, 예시 값, 응답 코드를 상세히 기술했습니다.

---

## ⚙️ 환경 설정 및 실행 방법 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)

- [Docker Desktop](https://www.docker.com/) 설치 및 실행
- [Supabase](https://supabase.com/) 계정 및 프로젝트 생성

### 2. 환경 변수 설정 (.env)

루트 경로에 `.env` 파일을 생성하고 아래 내용을 작성하세요.

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]"
JWT_SECRET="your_super_secret_key"
TZ="Asia/Seoul"

```

### 3. Supabase 데이터베이스 초기화

1. Supabase 대시보드에 접속
2. SQL Editor로 이동
3. `supabase_rls.sql` 파일의 내용을 복사하여 실행
4. Users 및 Posts 테이블 생성 및 RLS 정책 적용 완료

### 4. 실행 (Run Application)

```bash
# 전체 서비스 빌드 및 실행
docker-compose up --build

# 백그라운드 실행
docker-compose up -d --build

```

### 5. 서비스 접속

- **Nginx (Load Balancer)**: `http://localhost`
- **Auth Swagger**: `http://localhost/auth/api`
- **Board Swagger**: `http://localhost/api`

### 6. 서비스 중지

```bash
# 서비스 중지
docker-compose down

# 볼륨까지 삭제 (주의: 데이터 손실)
docker-compose down -v

```

---

## 🔌 API 명세 및 문서화

### 📖 Swagger API 문서

서버 실행 후 아래 주소에서 대화형 API 문서를 확인할 수 있습니다.

- **Auth API**: `http://localhost/auth/api`
- **Board API**: `http://localhost/api`

### 🔐 API 명세 (API Specification)

> 인증 필요 시 헤더: Authorization: Bearer <AccessToken>
> 

### 👤 Auth Module

| Method | Endpoint | Description | Request Body |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | 회원가입 | `{ email, password, nickname }` |
| `POST` | `/auth/signin` | 로그인 및 토큰 발급 | `{ email, password }` |

### 📝 Board Module

| Method | Endpoint | Description | Auth | Request Body / Query |
| --- | --- | --- | --- | --- |
| `POST` | `/board` | 게시글 작성 | 필수 | `{ title, content, isPublic? }` |
| `GET` | `/board` | 전체 게시글 조회 | 선택 | `?page=1&limit=10&search=keyword` |
| `GET` | `/board/my` | 내 게시글 조회 | 필수 | - |
| `GET` | `/board/:id` | 게시글 상세 조회 | 선택 | - |
| `PATCH` | `/board/:id` | 게시글 수정 | 필수 | `{ title, content, isPublic? }` |
| `DELETE` | `/board/:id` | 게시글 삭제 | 필수 | - |

---

## 🔐 Supabase & RLS 설계

본 프로젝트는 보안 계층의 다중화 및 Supabase 생태계와의 완벽한 통합을 위해 **UUID 기반의 아키텍처**와 **Row Level Security (RLS)**를 도입하였습니다.

### 1. 설계 방향 및 인증 흐름

- **UUID 기반 재설계**: 기존의 정수형(`number`) ID 시스템을 `UUID`로 전면 교체하였습니다. 특히 `users.id`는 Supabase Auth의 `auth.users(id)`를 참조하도록 설계되어, DB 수준에서 인증 시스템과 강력하게 결합됩니다.
- **인증 흐름**:
    1. 클라이언트는 NestJS 서버를 통해 JWT를 발급받습니다.
    2. 서버는 요청을 처리할 때 DB(Supabase)와 통신합니다.
    3. Supabase는 전달된 컨텍스트(또는 직접 접근 시 JWT)를 바탕으로 RLS 정책을 평가하여 데이터 접근을 제어합니다.

### 2. RLS 정책 및 권한 모델

- **게시글 읽기**: 비로그인 사용자 및 전체 사용자에게 공개글(`is_public = true`) 조회를 허용합니다.
- **게시글 CUD (작성/수정/삭제)**: 로그인한 사용자 중 **작성자 본인**에게만 권한을 부여합니다.
- **보안 다중화**:
    - **1단계 (Application Layer)**: NestJS 서버의 `Guard` 및 `Service`에서 1차 검증. 명확한 비즈니스 예외(403 Forbidden)를 반환합니다.
    - **2단계 (Database Layer)**: Supabase RLS 정책을 통한 2차 검증. 서버 설정 실수나 직접적인 DB 접근 시에도 데이터를 보호하는 최후의 보루입니다.

### 3. 주요 변경 및 주의 사항

- **[추가]** `supabase_rls.sql`: UUID 기반 테이블 DDL 및 RLS 정책 정의 스크립트.
- **[변경]** `User`, `Post` 엔티티의 ID 타입을 `number`에서 `string(UUID)`으로 구조 정렬.
- **[변경]** 게시판 상세 조회(`GET /board/:id`) 및 전체 조회를 비인증 사용자에게도 개방 (단, 작성/수정/삭제는 인증 필요).
- **[주의]** **DB 지속성**: Supabase는 외부 관리형 DB이므로 Docker Compose 재시작 시에도 데이터가 유지됩니다. 스키마 변경 사항은 `supabase_rls.sql`을 통해 Supabase 대시보드에서 직접 적용해야 합니다.

---

## 🧪 사용 예시 (Usage Example)

### 1. 회원가입 및 로그인

```bash
# 회원가입
curl -X POST http://localhost/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "nickname": "테스터"
  }'

# 로그인
curl -X POST http://localhost/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 응답 예시
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

```

### 2. 게시글 작성

```bash
curl -X POST http://localhost/board \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "title": "첫 번째 게시글",
    "content": "안녕하세요!",
    "isPublic": true
  }'

```

### 3. 게시글 조회

```bash
# 전체 게시글 조회 (페이징)
curl http://localhost/board?page=1&limit=10

# 검색
curl http://localhost/board?search=안녕

# 내 게시글 조회
curl http://localhost/board/my \
  -H "Authorization: Bearer <YOUR_TOKEN>"

# 상세 조회
curl http://localhost/board/{POST_ID}

```

---

## 🔧 개발자 가이드

### 데이터베이스 마이그레이션 (Database Migrations)

운영 환경에서의 안정적인 스키마 관리를 위해 TypeORM Migrations를 사용합니다.

```bash
# 마이그레이션 생성 (auth-server 또는 board-server에서 실행)
cd auth-server  # 또는 board-server
npm run migration:generate -- src/migrations/MigrationName

# 마이그레이션 반영
npm run migration:run

# 마이그레이션 복구
npm run migration:revert

```

### 로컬 개발 환경

```bash
# Auth 서버만 실행
cd auth-server
npm install
npm run start:dev

# Board 서버만 실행
cd board-server
npm install
npm run start:dev

```

### 로그 확인

```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f auth-service
docker-compose logs -f board-service-1
docker-compose logs -f nginx

```

---

## 🚧 향후 과제 (Roadmap)

1. **Supabase Auth 통합**: 현재의 커스텀 JWT 방식을 Supabase Auth SDK로 완전히 교체하여 RLS와의 연동성 극대화.
2. **Redis 캐싱 레이어 추가**: 게시글 조회 성능 향상을 위한 캐싱 전략 도입.
3. **CI/CD 파이프라인 구축**: GitHub Actions를 통한 자동 테스트 및 배포 자동화.
4. **모니터링 및 로깅**: Prometheus + Grafana를 통한 메트릭 수집 및 시각화.
5. **E2E 테스트**: Jest 기반 통합 테스트 작성.

---

## 📝 라이선스 및 기여

본 프로젝트는 학습 및 포트폴리오 목적으로 제작되었습니다.

**Author:** [hsm9411@github.com]

**Last Updated:** 2026-01-27