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
6. **환경별 설정 분리**:
   - `NODE_ENV` 환경 변수를 도입하여 개발 환경에서만 Swagger UI가 활성화되도록 제어했습니다.

---

## 🛡️ [DB 보안 및 개념 가이드] Row Level Security (RLS)

Supabase(PostgreSQL)를 사용할 때 반드시 이해해야 하는 핵심 보안 개념인 **RLS**에 대해 정리합니다.

### 1. 개념 정의: RLS란 무엇인가? 💡

**Row Level Security (행 단위 보안)**는 데이터베이스의 테이블에서 **"누가 어떤 행(Row)에 접근할 수 있는지"**를 결정하는 보안 규칙입니다.

*   **직관적 비유 (아파트 출입 시스템)**:
    *   **NestJS 서버 (공동 현관문 Guard)**: 아파트 단지 입구에서 신분증을 확인하고 들여보내 주는 경비원입니다. (인증/인가 담당)
    *   **RLS (개별 호실 도어락)**: 경비원을 통과했더라도, **자기 집 번호키**가 없으면 다른 집 문을 열 수 없습니다. (데이터 소유권 확인)
*   **왜 NestJS가 있는데 DB에서도 막아야 하나요?**
    *   **심층 방어 (Defense in Depth)**: 만약 서버 코드의 버그로 인해 "남의 글 삭제" 로직이 실수로 실행되더라도, DB단에서 RLS가 설정되어 있다면 물리적으로 삭제가 불가능합니다.
    *   **직접 접근 차단**: 관리자가 실수로 DB 접속 정보를 노출하거나, SQL Injection 공격이 발생하더라도 피해 범위를 본인의 데이터로 한정할 수 있습니다.

### 2. 설정 위치 및 방법 (How-to) 🛠️

이 설정은 NestJS 코드가 아닌 **Supabase 대시보드**에서 수행합니다.

1.  **접속 경로**: [Supabase Console](https://supabase.com/dashboard) -> 프로젝트 선택 -> 왼쪽 메뉴 **[Authentication]** -> **[Policies]**
2.  **활성화**: 대상 테이블(posts, users)에서 **[Enable RLS]** 버튼을 클릭하여 활성화합니다.
3.  **정책 생성**: **[New Policy]**를 눌러 SQL 명령어로 규칙을 정의합니다.

### 3. 실전 예시 (3단계) 📝

#### **1단계: 직관적 상황**
> "사용자 길동이는 자신이 작성한 게시글만 수정하거나 삭제할 수 있어야 하며, 다른 사람의 글은 읽기만 가능해야 한다."

#### **2단계: 실제 SQL 명령어 (Policy)**
Supabase SQL Editor에서 아래와 같이 설정할 수 있습니다.
```sql
-- 1. posts 테이블의 RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. 모든 사용자가 게시글을 읽을 수 있도록 허용 (SELECT)
CREATE POLICY "누구나 게시글을 조회할 수 있음"
ON posts FOR SELECT
USING (true);

-- 3. 인증된 사용자 중 '본인'만 자신의 글을 수정/삭제하도록 허용 (ALL)
-- (참고: auth.uid()는 Supabase Auth 사용 시 기준이며,
--  커스텀 JWT 사용 시에는 해당 토큰의 claim에 맞춰 설정이 필요합니다.)
CREATE POLICY "작성자 본인만 자신의 글을 관리함"
ON posts FOR ALL
TO authenticated
USING (author_id = auth.uid());
```

#### **3단계: 현업 활용 팁 (Best Practice)**
*   **관리자 전용 정책**: `is_admin` 컬럼을 활용하여 `CHECK (auth.jwt() ->> 'role' = 'admin')`과 같은 정책을 추가하면, 서버 코드 수정 없이도 DB 레벨에서 강력한 관리자 권한 제어가 가능합니다.
*   **민감 정보 보호**: `users` 테이블에서 본인 외에는 이메일이나 전화번호를 아예 조회(SELECT)조차 못 하게 막음으로써 개인정보 유출 사고를 원천 봉쇄할 수 있습니다.

---

## ⚙️ 환경 설정 및 실행 방법 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
- [Docker Desktop](https://www.docker.com/) 설치 및 실행
- [Supabase](https://supabase.com/) 계정 및 프로젝트 생성

### 2. 환경 변수 설정 (.env)
루트 경로에 `.env` 파일을 생성하고 아래 내용을 작성하세요.

```ini
NODE_ENV="development"
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

### 🔐 주요 엔드포인트
> **인증 필요 시 헤더:** `Authorization: Bearer <AccessToken>`

- **Auth**
  - `POST /auth/signup` : 회원가입
  - `POST /auth/signin` : 로그인 및 토큰 발급
- **Board**
  - `POST /board` : 게시글 작성
  - `GET /board` : 전체 게시글 조회 (페이징/검색 지원)
  - `GET /board/my` : 내가 쓴 글 조회
  - `GET /board/:id` : 게시글 상세 조회
  - `PATCH /board/:id` : 게시글 수정 (작성자 전용)
  - `DELETE /board/:id` : 게시글 삭제 (작성자 전용)

---

## 🚧 향후 과제 (Roadmap)

1.  **Production 모드 전환**: `synchronize: false` 설정 및 **TypeORM Migrations** 도입.
2.  **UUID 도입**: PK를 Auto Increment `number`에서 `UUID`로 변경하여 보안성 및 분산 환경 호환성 강화.
3.  **Global Exception Filter**: 일관된 에러 응답 포맷을 위한 전역 필터 구현.

---

**Author:** [Your Name/ID]
**Last Updated:** 2026-01-26
