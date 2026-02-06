# API 명세서

> **프로젝트**: Scalable Bulletin Board System
> **버전**: 2.3.0
> **업데이트**: 2026-02-06

---

## 🌐 Base URLs

### 로컬 환경
- Auth Service: `http://localhost/auth`
- Board Service: `http://localhost`

### 프로덕션 환경
- API Gateway: `http://152.67.216.145`
- Auth Service: `http://152.67.216.145/auth`
- Board Service: `http://152.67.216.145`

---

## 🔐 인증

### JWT 토큰 사용
모든 보호된 엔드포인트는 JWT 토큰이 필요합니다.

```http
Authorization: Bearer <access_token>
```

### 토큰 획득 방법
1. 회원가입: `POST /auth/signup`
2. 로그인: `POST /auth/signin`
3. 응답으로 받은 `accessToken` 사용

---

## 📝 Auth Service API

### 1. 회원가입

**엔드포인트**: `POST /auth/signup`

**Request Body**:
```json
{
  "email": "test@example.com",
  "password": "password123",
  "nickname": "테스터"
}
```

**Response** (201 Created):
```json
{
  "message": "User created successfully"
}
```

**에러 응답** (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}
```

---

### 2. 로그인

**엔드포인트**: `POST /auth/signin`

**Request Body**:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDcxNTg0MDAsImV4cCI6MTcwNzE2MjAwMH0.xyz..."
}
```

**에러 응답** (401 Unauthorized):
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

### 3. 사용자 정보 조회 (Internal API)

**엔드포인트**: `GET /auth/users/:id`

**헤더**:
```http
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "nickname": "테스터",
  "createdAt": "2026-01-30T00:00:00.000Z",
  "updatedAt": "2026-01-30T00:00:00.000Z"
}
```

**에러 응답** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

---

## 📰 Board Service API

### 1. 게시글 목록 조회

**엔드포인트**: `GET /board`

**Query Parameters**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `page` | number | ❌ | 1 | 페이지 번호 |
| `limit` | number | ❌ | 10 | 페이지당 게시글 수 |
| `search` | string | ❌ | - | 제목/내용 검색어 |

**Request 예시**:
```http
GET /board?page=1&limit=10&search=NestJS
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "첫 번째 게시글",
      "content": "게시글 내용입니다.",
      "isPublic": true,
      "authorId": "550e8400-e29b-41d4-a716-446655440000",
      "authorNickname": "테스터",
      "authorEmail": "test@example.com",
      "createdAt": "2026-01-30T12:00:00.000Z",
      "updatedAt": "2026-01-30T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "lastPage": 1
}
```

---

### 2. 게시글 상세 조회

**엔드포인트**: `GET /board/:id`

**Path Parameters**:
- `id` (UUID): 게시글 ID

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "첫 번째 게시글",
  "content": "게시글 내용입니다.",
  "isPublic": true,
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "authorNickname": "테스터",
  "authorEmail": "test@example.com",
  "createdAt": "2026-01-30T12:00:00.000Z",
  "updatedAt": "2026-01-30T12:00:00.000Z"
}
```

**에러 응답** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "Post not found",
  "error": "Not Found"
}
```

---

### 3. 게시글 작성

**엔드포인트**: `POST /board`

**헤더**:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "새 게시글",
  "content": "게시글 내용입니다.",
  "isPublic": true
}
```

**Response** (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "새 게시글",
  "content": "게시글 내용입니다.",
  "isPublic": true,
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "authorNickname": "테스터",
  "authorEmail": "test@example.com",
  "createdAt": "2026-01-30T12:00:00.000Z",
  "updatedAt": "2026-01-30T12:00:00.000Z"
}
```

**Validation 에러** (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": [
    "title should not be empty",
    "content should not be empty"
  ],
  "error": "Bad Request"
}
```

---

### 4. 내 게시글 조회

**엔드포인트**: `GET /board/my`

**헤더**:
```http
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "내 게시글",
      "content": "내용",
      "isPublic": true,
      "authorId": "550e8400-e29b-41d4-a716-446655440000",
      "authorNickname": "테스터",
      "createdAt": "2026-01-30T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 5. 게시글 수정

**엔드포인트**: `PATCH /board/:id`

**헤더**:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Path Parameters**:
- `id` (UUID): 게시글 ID

**Request Body** (부분 수정 가능):
```json
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "isPublic": false
}
```

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "수정된 제목",
  "content": "수정된 내용",
  "isPublic": false,
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "authorNickname": "테스터",
  "updatedAt": "2026-01-30T13:00:00.000Z"
}
```

**권한 에러** (403 Forbidden):
```json
{
  "statusCode": 403,
  "message": "You can only modify your own posts",
  "error": "Forbidden"
}
```

---

### 6. 게시글 삭제

**엔드포인트**: `DELETE /board/:id`

**헤더**:
```http
Authorization: Bearer <access_token>
```

**Path Parameters**:
- `id` (UUID): 게시글 ID

**Response** (200 OK):
```json
{
  "message": "Post deleted successfully"
}
```

**권한 에러** (403 Forbidden):
```json
{
  "statusCode": 403,
  "message": "You can only delete your own posts",
  "error": "Forbidden"
}
```

---

## 🔍 Health Check & Metrics

### 1. Auth Service Health Check

**엔드포인트**: `GET /auth/health`

**Response** (200 OK):
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

---

### 2. Board Service Health Check

**엔드포인트**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

---

### 3. Prometheus Metrics

**엔드포인트**:
- Auth: `GET /auth/metrics`
- Board: `GET /metrics`

**Response** (200 OK):
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/board",status="200"} 1234

# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 1000
http_request_duration_seconds_bucket{le="0.5"} 1200
http_request_duration_seconds_sum 45.5
http_request_duration_seconds_count 1234
```

---

## 📊 Swagger UI

### 로컬 환경
- Auth Service: `http://localhost/auth/api`
- Board Service: `http://localhost/api`

### 프로덕션 환경
- Auth Service: `http://152.67.216.145/auth/api`
- Board Service: `http://152.67.216.145/api`

**Swagger UI에서 할 수 있는 것:**
- 모든 API 엔드포인트 확인
- 요청/응답 스키마 확인
- 직접 API 호출 테스트
- JWT 토큰 인증 설정

---

## 🧪 API 테스트 예시

### cURL

#### 1. 회원가입
```bash
curl -X POST http://localhost/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "nickname": "테스터"
  }'
```

#### 2. 로그인
```bash
curl -X POST http://localhost/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 3. 게시글 작성
```bash
TOKEN="your_access_token_here"

curl -X POST http://localhost/board \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "첫 번째 게시글",
    "content": "내용입니다.",
    "isPublic": true
  }'
```

#### 4. 게시글 목록 조회
```bash
curl -X GET "http://localhost/board?page=1&limit=10"
```

---

### HTTPie

#### 1. 회원가입
```bash
http POST localhost/auth/signup \
  email=test@example.com \
  password=password123 \
  nickname=테스터
```

#### 2. 로그인
```bash
http POST localhost/auth/signin \
  email=test@example.com \
  password=password123
```

#### 3. 게시글 작성
```bash
http POST localhost/board \
  Authorization:"Bearer $TOKEN" \
  title="첫 번째 게시글" \
  content="내용입니다." \
  isPublic:=true
```

---

## ⚠️ 에러 코드

| 상태 코드 | 설명 | 예시 |
|----------|------|------|
| 200 | 성공 | 조회, 수정, 삭제 성공 |
| 201 | 생성됨 | 회원가입, 게시글 작성 성공 |
| 400 | 잘못된 요청 | Validation 실패 |
| 401 | 인증 실패 | 잘못된 비밀번호, 토큰 없음 |
| 403 | 권한 없음 | 다른 사용자의 게시글 수정 시도 |
| 404 | 찾을 수 없음 | 존재하지 않는 리소스 |
| 500 | 서버 에러 | 내부 서버 오류 |

---

## 📝 DTO 스키마

### SignupDto
```typescript
{
  email: string;        // 이메일 (필수, 유효성 검증)
  password: string;     // 비밀번호 (필수, 최소 6자)
  nickname: string;     // 닉네임 (필수, 최대 50자)
}
```

### SigninDto
```typescript
{
  email: string;        // 이메일 (필수)
  password: string;     // 비밀번호 (필수)
}
```

### CreatePostDto
```typescript
{
  title: string;        // 제목 (필수, 최대 255자)
  content: string;      // 내용 (필수)
  isPublic: boolean;    // 공개 여부 (기본값: true)
}
```

### GetPostsDto
```typescript
{
  page?: number;        // 페이지 번호 (기본값: 1)
  limit?: number;       // 페이지당 개수 (기본값: 10)
  search?: string;      // 검색어 (선택)
}
```

---

## 🔗 관련 문서

- [아키텍처 문서](./architecture.md)
- [배포 가이드](./deployment.md)
- [트러블슈팅](./troubleshooting.md)
- [메인 README](../README.md)
