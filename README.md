# 🚀 Scalable Bulletin Board System (Nest.js + Supabase + Docker)

이 프로젝트는 **Nest.js**와 **Supabase(PostgreSQL)**를 기반으로 구축된 확장 가능한 게시판 시스템입니다.
단순한 CRUD를 넘어 **Docker**와 **Nginx**를 활용한 로드 밸런싱 환경(Replica x3)을 구축하였으며, 트래픽 분산 처리와 데이터 보안 최적화를 실뮬레이션할 수 있도록 설계되었습니다.

---

## 📋 프로젝트 개요

- **목표:** 고가용성(High Availability) 및 확장성을 고려한 백엔드 아키텍처 구축
- **핵심 아키텍처:**
    - **Client** → **Nginx (Load Balancer)** → **Nest.js Server (x3 Replicas)** → **Supabase (DB)**
- **특징:**
    - Round-Robin 방식의 부하 분산 처리
    - JWT 기반 인증 및 Guard를 통한 보안 강화
    - TypeORM 관계 설정(1:N) 및 QueryBuilder 최적화
    - **Swagger (OpenAPI)**를 통한 인터랙티브 API 문서화

---

## 📂 프로젝트 구조 (Project Structure)

이해를 돕기 위한 전체 디렉토리 및 주요 파일 구조입니다.

```text
.
├── src
│   ├── auth                    # 인증 및 인가 (JWT, Passport, Strategy)
│   │   ├── dto                 # 전용 DTO (SignUp, SignIn)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── get-user.decorator.ts
│   ├── board                   # 게시판 비즈니스 로직 (CRUD)
│   │   ├── dto                 # CreatePost, GetPosts(페이징/검색) DTO
│   │   ├── board.controller.ts
│   │   └── board.service.ts
│   ├── entities                # DB 스키마 정의 (TypeORM)
│   │   ├── user.entity.ts      # User 엔티티 (비밀번호 보호 적용)
│   │   └── post.entity.ts      # Post 엔티티 (작성자 관계 설정)
│   ├── app.module.ts           # 전역 모듈 및 DB 연결 설정
│   └── main.ts                 # 엔트리 포인트 (전역 파이프, 인터셉터, Swagger)
├── test                        # 테스트 코드 (E2E, Unit)
├── nginx.conf                  # Nginx 로드밸런싱 설정 파일
├── Dockerfile                  # 컨테이너 빌드를 위한 설정
├── docker-compose.yml          # 인프라 오케스트레이션 (App x3, Nginx)
└── supabase_rls.sql            # DB 보안 강화를 위한 RLS 정책 스크립트
```

---

## ✨ 기술적 개선 및 리팩토링 내역 (Key Improvements)

기존 코드의 구조적 문제를 진단하고, 현업 수준의 완성도를 위해 다음과 같은 리팩토링을 진행했습니다.

1.  **표준 예외 처리 (Standard Exceptions)**:
    - 단순한 에러 반환이 아닌, 상황에 맞는 HTTP 상태 코드(`409 Conflict`, `403 Forbidden` 등)를 사용하여 API의 명확성을 높였습니다.
2.  **데이터 보안 강화 (Security)**:
    - `ClassSerializerInterceptor`와 `@Exclude()` 데코레이터를 사용하여, API 응답 시 사용자의 비밀번호 해시가 노출되는 보안 위협을 원천 차단했습니다.
3.  **데이터 관계 및 성능 최적화**:
    - 게시글 목록 조회 시 작성자(`author`) 정보를 로드할 때 `leftJoinAndSelect`를 활용하여 불필요한 쿼리 발생을 줄이고 데이터 완성도를 높였습니다.
4.  **DTO 구조화 및 유효성 검사**:
    - 각 목적에 맞는 전용 DTO를 생성하고 `class-validator`를 적용하여 데이터의 무결성을 보장합니다.
5.  **Swagger UI 고도화**:
    - 모든 엔드포인트에 상세한 설명과 예시 값, 응답 타입을 정의하여 개발자 친화적인 문서를 완성했습니다.
6.  **환경 설정 분리 (NODE_ENV)**:
    - `NODE_ENV` 변수를 도입하여 개발 환경에서만 Swagger가 활성화되도록 제어하고 보안성을 강화했습니다.

---

## 🛡️ [DB 보안 가이드] Row Level Security (RLS)

Supabase를 더욱 안전하게 사용하기 위해 적용된 **RLS** 개념을 소개합니다.

### 1. RLS란 무엇인가요? 💡
**행 단위 보안(Row Level Security)**은 데이터베이스 테이블에서 "특정 조건(행)에 맞는 데이터에만 접근할 수 있게" 직접 제약하는 물리적인 방어막입니다.

-   **직관적 비유 (호텔 카드키)**:
    -   **NestJS 서버 (프런트 데스크)**: 손님의 신분증을 확인하고 체크인을 돕습니다.
    -   **RLS (객실 카드키)**: 체크인을 했더라도(로그인 성공), **자신의 카드키**가 없으면 다른 손님의 방(데이터)에는 들어갈 수 없습니다.
-   **왜 필요한가요?**: 서버 코드에 실수가 있더라도, DB 레벨에서 "본인 글이 아니면 수정/삭제 불가"라는 규칙이 한 번 더 보호해주기 때문에 훨씬 안전합니다. (**심층 방어**)

### 2. 설정 방법 (How-to)
1.  **Supabase 대시보드** 접속 -> [SQL Editor] 메뉴로 이동.
2.  프로젝트 루트의 `supabase_rls.sql` 파일 내용을 복사하여 실행.
3.  [Authentication] -> [Policies] 탭에서 활성화된 정책 확인.

---

## ⚙️ 환경 설정 및 실행 방법 (Getting Started)

### 1. 환경 변수 설정 (.env)
루트 경로에 `.env` 파일을 생성하고 아래 내용을 입력하세요.

```ini
NODE_ENV="development" # 필수 (Swagger 및 개발 모드 활성화)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]"
JWT_SECRET="your_super_secret_key"
TZ="Asia/Seoul"
```

### 2. 실행 (Docker)
```bash
# 컨테이너 빌드 및 실행
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
