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
    - TypeORM을 활용한 Entity 관계 설정 (1:N)
    - Docker Compose를 통한 원터치 인프라 배포
    - **Swagger (OpenAPI)**를 통한 자동화된 API 문서화

---

## 🛠 기술 스택 및 버전

| Category | Technology | Version / Note |
| :--- | :--- | :--- |
| **Framework** | Nest.js | 11.x |
| **Runtime** | Node.js | `22-alpine` (Docker Base Image) |
| **Database** | Supabase | PostgreSQL (Managed) |
| **ORM** | TypeORM | `0.3.x` |
| **Infrastructure** | Docker Compose | 3.8 |
| **Load Balancer** | Nginx | Latest |

---

## 📂 프로젝트 구조 (Project Structure)

본 프로젝트는 MSA 전환을 통해 서비스를 독립적으로 운영합니다.

### 🔐 [Auth Server](./auth-server)
- **역할**: 사용자 인증, 토큰 발급 및 검증
- **주요 폴더**: `src/auth`, `src/entities`

### 📝 [Board Server](./board-server)
- **역할**: 게시글 CRUD 및 비즈니스 로직
- **주요 폴더**: `src/board`, `src/entities`, `src/common`

### 🏗️ 인프라 및 공통
- `nginx.conf`: 서비스별 라우팅 및 로드 밸런싱 설정
- `docker-compose.yml`: 전체 서비스 컨테이너 오케스트레이션
- `supabase_rls.sql`: DB 보안 정책 (RLS) 설정

---

## ✨ 기술적 개선 사항 (Technical Improvements)

리팩토링을 통해 다음과 같은 품질 향상 및 보안 강화를 진행하였습니다.

1. **표준 예외 처리 도입**:
   - 중복 회원가입 시 `ConflictException`(409)을 반환하도록 수정하여 API 응답의 의미를 명확히 했습니다.
   - 타인의 게시글 수정 시도 시 `ForbiddenException`(403)을 던져 권한 위반을 명확히 구분했습니다.
   - **Global Exception Filter**를 도입하여 모든 에러 응답을 일관된 JSON 포맷으로 표준화하였습니다.
     ```json
     {
       "timestamp": "2026-01-26T15:00:00.000Z",
       "path": "/api/target-path",
       "message": "Error message",
       "statusCode": 400
     }
     ```
2. **데이터 보안 강화**:
   - `ClassSerializerInterceptor`와 `@Exclude()`를 도입하여 API 응답 시 사용자의 비밀번호 해시가 노출되지 않도록 차단했습니다.
3. **데이터 관계 최적화**:
   - 게시글 목록 및 상세 조회 시 `leftJoinAndSelect`를 사용하여 작성자(`author`) 정보를 효율적으로 함께 로드하도록 개선했습니다.
4. **DTO 구조화 및 유효성 검사**:
   - `SignUpDto`, `SignInDto`, `GetPostsDto` 등으로 DTO를 세분화하고, `class-validator`를 통해 엄격한 타입 검증을 수행합니다.
5. **Swagger 문서 고도화**:
   - 모든 API와 DTO에 Swagger 데코레이터를 적용하여 파라미터 설명, 예시 값, 응답 코드를 상세히 기술했습니다.

---

## ⚙️ 환경 설정 및 실행 방법 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
- [Docker Desktop](https://www.docker.com/) 설치 및 실행
- [Supabase](https://supabase.com/) 계정 및 프로젝트 생성

### 2. 환경 변수 설정 (.env)
루트 경로에 `.env` 파일을 생성하고 아래 내용을 작성하세요.

```ini
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]"
JWT_SECRET="your_super_secret_key"
TZ="Asia/Seoul"
```

### 3. 실행 (Run Application)
```bash
docker-compose up --build
```

### 4. 데이터베이스 마이그레이션 (Database Migrations)
운영 환경에서의 안정적인 스키마 관리를 위해 TypeORM Migrations를 사용합니다.

```bash
# 마이그레이션 생성 (src/migrations 폴더에 생성됨)
npm run migration:generate -- src/migrations/MigrationName

# 마이그레이션 반영
npm run migration:run

# 마이그레이션 복구
npm run migration:revert
```

---

## 🔌 API 명세 및 문서화

### 📖 Swagger API 문서
서버 실행 후 아래 주소에서 대화형 API 문서를 확인할 수 있습니다.
- **URL:** `http://localhost/api` (Nginx 경유) 또는 `http://localhost:3000/api` (개별 앱 직접 접속)

### 🔐 API 명세 (API Specification)
> **인증 필요 시 헤더:** `Authorization: Bearer <AccessToken>`

#### 👤 Auth Module
| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | 회원가입 | `{ email, password, nickname }` |
| `POST` | `/auth/signin` | 로그인 및 토큰 발급 | `{ email, password }` |

#### 📝 Board Module
| Method | Endpoint | Description | Auth | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
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
  - **[참고]** NestJS 서버에서 RLS를 완벽히 활용하려면 DB 세션에 JWT Claim을 전파하는 로직(SET LOCAL)이 필요하며, 본 프로젝트에서는 보안 다중화(Defense in Depth) 전략으로 두 계층을 모두 유지합니다.

### 3. 주요 변경 및 주의 사항
- **[추가]** `supabase_rls.sql`: UUID 기반 테이블 DDL 및 RLS 정책 정의 스크립트.
- **[변경]** `User`, `Post` 엔티티의 ID 타입을 `number`에서 `string(UUID)`으로 구조 정렬.
- **[변경]** 게시판 상세 조회(`GET /board/:id`) 및 전체 조회를 비인증 사용자에게도 개방 (단, 작성/수정/삭제는 인증 필요).
- **[주의]** **DB 지속성**: Supabase는 외부 관리형 DB이므로 Docker Compose 재시작 시에도 데이터가 유지됩니다. 스키마 변경 사항은 `supabase_rls.sql`을 통해 Supabase 대시보드에서 직접 적용해야 합니다.

---

## 🚧 향후 과제 (Roadmap)

1.  **Supabase Auth 통합**: 현재의 커스텀 JWT 방식을 Supabase Auth SDK로 완전히 교체하여 RLS와의 연동성 극대화.

---

**Author:** [Your Name/ID]
**Last Updated:** 2026-01-26
