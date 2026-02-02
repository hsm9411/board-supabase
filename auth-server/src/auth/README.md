# Auth Module

## 개요

Auth Module은 사용자 인증 및 인가를 담당하는 핵심 모듈입니다. JWT 기반 인증을 사용하며, Supabase PostgreSQL의 `auth_schema`에 사용자 데이터를 저장합니다.

## 주요 기능

1. **회원가입 (Sign Up)**
   - 이메일/비밀번호 기반 회원가입
   - bcrypt를 이용한 비밀번호 해싱
   - 이메일 중복 검증

2. **로그인 (Sign In)**
   - 이메일/비밀번호 검증
   - JWT Access Token 발급

3. **사용자 정보 조회**
   - ID 기반 사용자 조회 (Internal API)
   - Email 기반 사용자 조회 (Internal API)

## 파일 구조

```
auth/
├── auth.controller.ts      # HTTP 엔드포인트 정의
├── auth.service.ts         # 비즈니스 로직
├── auth.module.ts          # 모듈 설정
├── jwt.strategy.ts         # JWT 검증 전략
├── get-user.decorator.ts   # 커스텀 데코레이터
└── dto/
    ├── signup.dto.ts       # 회원가입 DTO
    └── signin.dto.ts       # 로그인 DTO
```

## API 엔드포인트

### 1. POST /auth/signup
회원가입

**Request:**
```json
{
  "email": "test@example.com",
  "password": "password123",
  "nickname": "테스터"
}
```

**Response:**
```
HTTP 201 Created
```

**Validation:**
- `email`: 유효한 이메일 형식
- `password`: 최소 8자, 영문/숫자만 허용
- `nickname`: 필수값

### 2. POST /auth/signin
로그인

**Request:**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. GET /auth/users/:id
사용자 정보 조회 (Internal API)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "nickname": "테스터",
  "createdAt": "2026-01-30T00:00:00.000Z"
}
```

### 4. GET /auth/users/email/:email
이메일로 사용자 조회 (Internal API)

**Headers:**
```
Authorization: Bearer <token>
```

## JWT 전략

### JwtStrategy

`jwt.strategy.ts`는 Passport JWT 전략을 사용하여 토큰을 검증합니다.

**검증 흐름:**
1. HTTP Header에서 Bearer Token 추출
2. JWT_SECRET으로 토큰 검증
3. Payload에서 `email` 추출
4. DB에서 사용자 조회
5. 사용자 객체를 `req.user`에 할당

**사용 예시:**
```typescript
@Get('/profile')
@UseGuards(AuthGuard())
getProfile(@GetUser() user: User) {
  return user;
}
```

## DTO (Data Transfer Object)

### SignUpDto
```typescript
{
  email: string;       // 이메일 주소 (유효성 검증)
  password: string;    // 비밀번호 (최소 8자)
  nickname: string;    // 닉네임
}
```

### SignInDto
```typescript
{
  email: string;       // 이메일 주소
  password: string;    // 비밀번호
}
```

## 보안 고려사항

### 1. 비밀번호 해싱
- **알고리즘:** bcrypt
- **Salt Rounds:** 기본값 (10)
- **저장:** 해시된 비밀번호만 DB에 저장

### 2. JWT 설정
- **Secret:** 환경 변수 `JWT_SECRET`에서 로드
- **만료 시간:** 3600초 (1시간)
- **권장:** 프로덕션 환경에서는 강력한 Secret 사용

```bash
# 강력한 Secret 생성
openssl rand -base64 32
```

### 3. ClassSerializerInterceptor
`main.ts`에서 전역 설정되어 `password` 필드를 응답에서 자동 제거합니다.

```typescript
@Exclude()
@Column()
password: string;
```

## 에러 처리

### ConflictException (409)
- 이메일 중복 시 발생
- PostgreSQL 유니크 제약 조건 위반 (`23505`)

### UnauthorizedException (401)
- 로그인 실패 시 발생
- 이메일 또는 비밀번호 불일치

### NotFoundException (404)
- 사용자 정보 조회 실패 시 발생

## 데이터베이스 스키마

**테이블:** `auth_schema.users`

| 컬럼 | 타입 | 제약 조건 | 설명 |
|------|------|----------|------|
| id | uuid | PRIMARY KEY | 사용자 ID |
| email | text | UNIQUE NOT NULL | 이메일 |
| password | text | NOT NULL | 해시된 비밀번호 |
| nickname | text | NOT NULL | 닉네임 |
| created_at | timestamptz | DEFAULT now() | 생성 시간 |

**인덱스:**
- `idx_auth_users_email` (email)

## 테스트

### Unit Test
```bash
cd auth-server
npm test -- auth.service.spec.ts
```

**주요 테스트 케이스:**
- ✅ 회원가입 성공
- ✅ 이메일 중복 시 ConflictException
- ✅ 로그인 성공 및 토큰 발급
- ✅ 잘못된 자격 증명 시 UnauthorizedException

## MSA 아키텍처에서의 역할

### 책임 범위
- `auth_schema.users` 테이블의 CRUD 작업
- JWT 발급 및 검증
- 사용자 인증 정보 제공

### 다른 서비스와의 통신
- **Board Service:** 사용자 정보 조회 API 제공
  - `GET /auth/users/:id`
  - `GET /auth/users/email/:email`

### 독립성 보장
- Auth Service는 Board Service에 의존하지 않음
- 스키마 분리로 DB 레벨 격리
- 서비스 장애 시 영향 범위 최소화

## 환경 변수

```env
# .env
DATABASE_URL=postgresql://postgres:password@host:5432/db?schema=auth_schema
JWT_SECRET=your_super_secret_key
PORT=3001
NODE_ENV=development
```

## 모니터링

### Health Check
```bash
curl http://localhost/auth/health
```

**응답:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  }
}
```

### Metrics
```bash
curl http://localhost/auth/metrics
```

**주요 메트릭:**
- `http_requests_total{route="/auth/signup"}`
- `http_request_duration_seconds`
- `process_cpu_user_seconds_total`

## 향후 개선 사항

- [ ] Refresh Token 도입 (Access Token 재발급)
- [ ] 이메일 인증 기능
- [ ] OAuth 2.0 / Social Login 지원
- [ ] 비밀번호 재설정 기능
- [ ] Rate Limiting (무차별 대입 공격 방지)
- [ ] 2FA (Two-Factor Authentication)

## 참고 자료

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport JWT](http://www.passportjs.org/packages/passport-jwt/)
- [bcrypt](https://www.npmjs.com/package/bcrypt)