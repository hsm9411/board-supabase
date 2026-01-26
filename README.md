# 🚀 Scalable Bulletin Board System (Nest.js + Supabase + Docker)

이 프로젝트는 **Nest.js**와 **Supabase(PostgreSQL)**를 기반으로 구축된 확장 가능한 게시판 시스템입니다. **Docker**와 **Nginx**를 활용하여 로드 밸런싱 환경(Replica x3)을 구성하였으며, 트래픽 분산 처리를 시뮬레이션할 수 있도록 설계되었습니다.

## 📋 프로젝트 개요

- **목표:** 고가용성(High Availability) 및 확장성을 고려한 백엔드 아키텍처 구축
- **핵심 아키텍처:**
    - **Client** → **Nginx (Load Balancer)** → **Nest.js Server (x3 Replicas)** → **Supabase (DB)**
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

```text
.
├── src
│   ├── auth                    # 인증 모듈 (JWT, Passport)
│   │   ├── dto                 # SignIn, SignUp DTO
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── get-user.decorator.ts
│   ├── board                   # 게시판 모듈 (CRUD 비즈니스 로직)
│   │   ├── dto                 # CreatePost, GetPosts DTO
│   │   ├── board.controller.ts
│   │   └── board.service.ts
│   ├── entities                # DB 테이블 정의 (TypeORM)
│   │   ├── user.entity.ts      # User 테이블 (1)
│   │   └── post.entity.ts      # Post 테이블 (N)
│   ├── app.module.ts           # 최상위 모듈
│   └── main.ts                 # 엔트리 포인트 (Swagger, Global Pipes/Interceptors)
├── test                        # E2E 및 Unit 테스트
├── nginx.conf                  # Nginx 로드밸런싱 설정
├── Dockerfile                  # Multi-stage 빌드 설정
├── docker-compose.yml          # 서비스 오케스트레이션
└── package.json                # 의존성 목록
```

---

## ✨ 기술적 개선 사항 (Technical Improvements)

리팩토링을 통해 다음과 같은 품질 향상 및 보안 강화를 진행하였습니다.

1. **표준 예외 처리 도입**:
   - 중복 회원가입 시 `ConflictException`(409)을 반환하도록 수정하여 API 응답의 의미를 명확히 했습니다.
   - 타인의 게시글 수정 시도 시 `ForbiddenException`(403)을 던져 권한 위반을 명확히 구분했습니다.
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

---

## 🔌 API 명세 및 문서화

### 📖 Swagger API 문서
서버 실행 후 아래 주소에서 대화형 API 문서를 확인할 수 있습니다.
- **URL:** `http://localhost/api` (Nginx 경유) 또는 `http://localhost:3000/api` (개별 앱 직접 접속)

### 🔐 API 명세 (API Specification)
> **모든 Board API는 인증이 필요합니다.** (Header: `Authorization: Bearer <AccessToken>`)

#### 👤 Auth Module
| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | 회원가입 | `{ email, password, nickname }` |
| `POST` | `/auth/signin` | 로그인 및 토큰 발급 | `{ email, password }` |

#### 📝 Board Module
| Method | Endpoint | Description | Request Body / Query |
| :--- | :--- | :--- | :--- |
| `POST` | `/board` | 게시글 작성 | `{ title, content, isPublic? }` |
| `GET` | `/board` | 전체 게시글 조회 | `?page=1&limit=10&search=keyword` (공개글만 조회) |
| `GET` | `/board/my` | 내가 쓴 게시글 조회 | - |
| `GET` | `/board/:id` | 게시글 상세 조회 | - |
| `PATCH` | `/board/:id` | 게시글 수정 | `{ title, content, isPublic? }` (작성자 전용) |
| `DELETE` | `/board/:id` | 게시글 삭제 | - (작성자 전용) |

---

## 🔐 Database Security (RLS)

본 프로젝트는 보안 계층의 다중화를 위해 **Supabase Row Level Security (RLS)**를 도입하였습니다. 이는 애플리케이션 서버뿐만 아니라 데이터베이스 엔진 수준에서도 데이터 접근 권한을 강제하기 위함입니다.

### 1. RLS 도입 목적
- **심층 방어(Defense in Depth)**: 서버 코드의 버그나 설정 실수로 권한 로직이 우회되더라도, DB 차원에서 비인가 데이터 접근을 원천 차단합니다.
- **향후 확장성**: 추후 프론트엔드에서 Supabase Client를 통해 DB에 직접 접근하는 아키텍처로 전환할 때, 별도의 서버 로직 수정 없이 보안을 유지할 수 있습니다.

### 2. 기존 서버 권한 로직과의 관계
- **현재 상태**: `BoardService`에서 수행하는 작성자 검증(`ForbiddenException`)과 RLS 정책이 공존합니다.
- **상호 보완**:
  - NestJS 서버는 비즈니스 로직과 함께 명확한 에러 메시지(403 Forbidden)를 반환하는 역할을 수행합니다.
  - RLS는 최후의 보루로서, 인가되지 않은 쿼리 수행 시 데이터 반환을 거부하거나 영향을 주지 않도록 보장합니다.
- **향후 계획**: 점진적으로 권한 검증 책임을 RLS로 이관하여 서버 로직을 경량화할 예정입니다.

### 3. 적용된 변경 사항
- **[추가]** `posts` 테이블에 `is_public` (boolean) 컬럼 추가. (기본값: `true`)
- **[추가]** `supabase_rls.sql` 파일을 통한 테이블 수준 보안 정책 정의.
- **[변경]** `GET /board` (전체 조회) 시 `is_public = true`인 데이터만 필터링하여 반환하도록 서비스 로직 보완.
- **[주의]** 현재 `User` 엔티티의 ID가 `number`이므로, Supabase `auth.uid()` (UUID)와 비교 시 타입 캐스팅이 필요합니다. 상세 내용은 `supabase_rls.sql` 주석을 참고하세요.

---

## 🚧 향후 과제 (Roadmap)

1.  **Production 모드 전환**: `synchronize: false` 설정 및 **TypeORM Migrations** 도입.
2.  **UUID 도입**: PK를 Auto Increment `number`에서 `UUID`로 변경하여 보안성 및 분산 환경 호환성 강화.
3.  **Global Exception Filter**: 일관된 에러 응답 포맷을 위한 전역 필터 구현.

---

**Author:** [Your Name/ID]
**Last Updated:** 2026-01-26
