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

---

## 🛠 기술 스택 및 버전

| Category | Technology | Version / Note |
| :--- | :--- | :--- |
| **Framework** | Nest.js | Latest (TypeScript) |
| **Runtime** | Node.js | `22-alpine` (Docker Base Image) |
| **Database** | Supabase | PostgreSQL (Managed) |
| **ORM** | TypeORM | `0.3.x` |
| **Infrastructure** | Docker Compose | 3.8 |
| **Load Balancer** | Nginx | Latest |

---

## 📂 프로젝트 구조 (Project Structure)

AI 및 개발자가 프로젝트의 문맥을 이해하기 위한 핵심 디렉토리 구조입니다.

```bash
├── src
│   ├── auth              # 인증 모듈 (JWT, Passport, AuthController)
│   ├── board             # 게시판 모듈 (CRUD 비즈니스 로직)
│   ├── entities          # DB 테이블 정의 (TypeORM)
│   │   ├── user.entity.ts # User 테이블 (1)
│   │   └── post.entity.ts # Post 테이블 (N) - Relation: User(1):Post(N)
│   ├── app.module.ts     # 최상위 모듈 (DB 연결 설정 포함)
│   └── main.ts           # 엔트리 포인트
├── nginx.conf            # Nginx 로드밸런싱 설정 (Upstream: app1, app2, app3)
├── Dockerfile            # Multi-stage 빌드 (Node 22 Alpine)
├── docker-compose.yml    # 서비스 오케스트레이션 (App x3, Nginx)
├── package.json          # 의존성 목록
└── .env                  # 환경변수 (보안 주의)
```

---

## ⚙️ 환경 설정 및 실행 방법 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
- [Docker Desktop](https://www.docker.com/) 설치 및 실행
- [Supabase](https://supabase.com/) 계정 및 프로젝트 생성

### 2. 환경 변수 설정 (.env)
루트 경로에 `.env` 파일을 생성하고 아래 내용을 작성하세요.

```ini
# .env
# Supabase Connection String (Session Pooler or Direct)
# 초기 테이블 생성(DDL) 시에는 Direct Port(5432) 권장
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]"

# JWT Secret Key
JWT_SECRET="your_super_secret_key"

# Timezone (Docker 컨테이너 시간 동기화)
TZ="Asia/Seoul"
```

> **주의:** Supabase의 Transaction Pooler(포트 6543) 사용 시 `synchronize: true` 설정이 정상 작동하지 않을 수 있습니다. 테이블 생성 단계에서는 **Direct Connection(포트 5432)**을 사용하세요.

### 3. 실행 (Run Application)
Docker Compose를 사용하여 컨테이너를 빌드하고 실행합니다. 캐시 문제 방지를 위해 최초 실행 시 강제 빌드 옵션을 권장합니다.

```bash
# 기존 컨테이너 및 볼륨 삭제 (초기화)
docker-compose down --rmi all --volumes

# 강제 재빌드 및 실행
docker-compose up --build --force-recreate
```

### 4. 초기 실행 시 주의사항 (Race Condition)
3개의 앱(`app1`, `app2`, `app3`)이 동시에 켜지면서 `synchronize: true` 옵션으로 인해 테이블 생성을 동시에 시도할 수 있습니다.
- **증상:** 로그에 `QueryFailedError: duplicate key value...` 에러 발생.
- **해결:** 이미 하나의 앱이 테이블을 생성했으므로 무시해도 됩니다. 또는 `docker-compose restart` 명령어로 재시작하면 정상 작동합니다.

---

## 🔌 API 명세 (Endpoints)

Nginx가 `localhost:80` 포트에서 대기 중입니다.

### 🔐 인증 (Auth Module)
- **POST** `/auth/signup` : 회원가입
  - Body: `SignUpDto { email, password, nickname }`
- **POST** `/auth/signin` : 로그인 (JWT 발급)
  - Body: `SignInDto { email, password }`

### 📝 게시판 (Board Module)
> **헤더 필수:** `Authorization: Bearer <AccessToken>`
- **POST** `/board` : 게시글 작성 (작성자 자동 매핑)
- **GET** `/board` : 전체 게시글 조회 (Query: `page`, `limit`, `search`)
- **GET** `/board/my` : 내가 쓴 글 조회
- **GET** `/board/:id` : 특정 게시글 상세 조회
- **PATCH** `/board/:id` : 게시글 수정 (작성자 본인만 가능)
- **DELETE** `/board/:id` : 게시글 삭제 (작성자 본인만 가능)

---

## 🚧 문제 해결 및 개선 사항 (Troubleshooting & Roadmap)

### ✅ 해결된 이슈
1.  **Docker Caching Issue:** 코드 변경 사항이 컨테이너에 반영되지 않던 문제.
2.  **Network Resolution:** Supabase 연결 시 `ENOTFOUND` 에러 해결.
3.  **Table Creation Race Condition:** Replica 3개가 동시 실행될 때 테이블 중복 생성 시도 에러.
4.  **Timezone:** Docker 환경변수 `TZ=Asia/Seoul` 추가로 해결.
5.  **API Documentation:** Swagger(OpenAPI) 연동 완료 (`/api` 경로).
6.  **DTO Refactoring:** 인증 및 게시판 조회를 위한 전용 DTO 도입 및 유효성 검사 강화.

### 🚀 개선해야 할 점 (To-Do)
1.  **Production 모드 전환:**
    - 현재 `synchronize: true`로 설정되어 있어 배포 시 데이터 소실 위험이 있음.
    - 추후 **TypeORM Migrations**을 도입하여 `synchronize: false`로 변경 필요.
2.  **UUID 도입:**
    - 현재 ID가 `number` 타입(Auto Increment)임. 분산 환경 및 보안을 위해 `UUID`로 변경 고려.
3.  **Global Exception Filter:**
    - 일관된 에러 응답 처리를 위한 전역 필터 도입 필요.

---

**Author:** [Your Name/ID]
**Last Updated:** 2026-01-26