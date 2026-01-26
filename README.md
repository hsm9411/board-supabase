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
│   ├── board                   # 게시판 모듈 (CRUD 비즈니스 로직)
│   ├── entities                # DB 테이블 정의 (TypeORM)
│   ├── app.module.ts           # 최상위 모듈
│   └── main.ts                 # 엔트리 포인트 (Global Pipes/Interceptors)
├── nginx.conf                  # Nginx 로드밸런싱 설정
├── Dockerfile                  # Multi-stage 빌드 설정
├── docker-compose.yml          # 서비스 오케스트레이션
└── supabase_rls.sql            # DB 보안 정책(RLS) 설정 스크립트
```

---

## ✨ 기술적 개선 사항 (Technical Improvements)

리팩토링을 통해 다음과 같은 품질 향상 및 보안 강화를 진행하였습니다.

- **✅ 보안 강화**: `ClassSerializerInterceptor` 도입으로 패스워드 해시 노출 차단
- **✅ DB 보안 정책**: Supabase RLS(Row Level Security) 적용으로 데이터 소유권 보호
- **✅ 예외 처리 표준화**: HTTP 상태 코드(409, 403 등)를 명확히 구분하여 응답성 개선
- **✅ 데이터 조회 최적화**: 게시글 조회 시 작성자 정보(`author`)를 효율적으로 로드
- **✅ API 문서 고도화**: Swagger 데코레이터 적용 및 전용 DTO 구조화
- **✅ 환경별 설정 분리**: `NODE_ENV`를 통한 개발/운영 환경 제어

---

## ⚙️ 환경 설정 및 실행 방법 (Getting Started)

### 1. 사전 요구사항 (Prerequisites)
- [Docker Desktop](https://www.docker.com/) 설치 및 실행
- [Supabase](https://supabase.com/) 계정 및 프로젝트 생성

### 2. 환경 변수 설정 (.env)
루트 경로에 `.env` 파일을 생성하고 아래 내용을 작성하세요. (**`NODE_ENV=development` 필수**)

```ini
NODE_ENV="development"
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB_NAME]"
JWT_SECRET="your_super_secret_key"
TZ="Asia/Seoul"
```

### 3. DB 보안 설정 (Supabase RLS)
보안을 위해 Supabase SQL Editor에서 `supabase_rls.sql` 파일의 내용을 실행하여 정책을 적용하십시오.

### 4. 실행 (Run Application)
```bash
docker-compose up --build
```

---

## 🔌 API 명세 및 문서화

### 📖 Swagger API 문서
서버 실행 후 아래 주소에서 대화형 API 문서를 확인할 수 있습니다.
- **URL:** `http://localhost/api` (또는 `http://localhost:3000/api`)

### 🔐 주요 엔드포인트
- **Auth**: `/auth/signup` (회원가입), `/auth/signin` (로그인)
- **Board**: `/board` (전체 조회), `/board/my` (내 글), `/board/:id` (상세/수정/삭제)

---

## 🚧 향후 과제 (Roadmap)

1. **Production 모드 전환**: `synchronize: false` 및 Migrations 도입
2. **UUID 도입**: PK 보안성 및 분산 환경 호환성 강화
3. **Global Exception Filter**: 일관된 에러 응답 포맷 구현

---

**Author:** [Your Name/ID]
**Last Updated:** 2026-01-26
