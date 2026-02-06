# 트러블슈팅 가이드

> **프로젝트**: Scalable Bulletin Board System
> **버전**: 2.3.0
> **업데이트**: 2026-02-06

---

## 📋 목차

1. [개발 환경 문제](#개발-환경-문제)
2. [빌드 및 의존성 문제](#빌드-및-의존성-문제)
3. [데이터베이스 연결 문제](#데이터베이스-연결-문제)
4. [Redis 연결 문제](#redis-연결-문제)
5. [Docker 관련 문제](#docker-관련-문제)
6. [Nginx 및 네트워크 문제](#nginx-및-네트워크-문제)
7. [Prometheus 모니터링 문제](#prometheus-모니터링-문제)
8. [프로덕션 배포 문제](#프로덕션-배포-문제)
9. [성능 문제](#성능-문제)

---

## 🛠️ 개발 환경 문제

### 1. ESLint 실패: "Cannot find package '@eslint/js'"

**증상**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@eslint/js'
imported from /home/runner/work/board-supabase/board-supabase/eslint.config.mjs
```

**원인**:
- ESLint v9의 Flat Config와 NestJS 호환성 문제
- 루트 디렉토리에 `eslint.config.mjs` 파일 존재

**해결 방법**:
```bash
# 1. ESLint v8로 다운그레이드
cd auth-server
npm install --save-dev eslint@^8.57.0

cd ../board-server
npm install --save-dev eslint@^8.57.0

# 2. 루트 eslint.config.mjs 삭제 (있다면)
rm eslint.config.mjs

# 3. 각 서비스에 .eslintrc.js 확인
# auth-server/.eslintrc.js
# board-server/.eslintrc.js
```

**검증**:
```bash
npm run lint
```

---

### 2. Jest TypeScript 문법 에러

**증상**:
```
SyntaxError: Unexpected token 'export'
Jest encountered an unexpected token
```

**원인**:
- `package.json`의 중복된 Jest 설정
- ts-jest 미설치 또는 미적용

**해결 방법**:
```bash
# 1. package.json에서 jest 설정 제거
# "jest": { ... } 부분 전체 삭제

# 2. jest.config.js 생성 또는 확인
cat > jest.config.js << 'EOF'
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
EOF

# 3. ts-jest 설치 확인
npm install --save-dev ts-jest
```

**검증**:
```bash
npm test
```

---

### 3. "Cannot find module" 에러

**증상**:
```
Error: Cannot find module '@nestjs/common'
Error: Cannot find module 'typeorm'
```

**원인**:
- node_modules 손상
- package-lock.json과 package.json 불일치

**해결 방법**:
```bash
# 1. 클린 설치
rm -rf node_modules package-lock.json
npm install

# 2. TypeScript 컴파일 확인
npx tsc --noEmit

# 3. 캐시 클리어
npm cache clean --force
```

---

## 🗄️ 데이터베이스 연결 문제

### 1. TypeORM 연결 실패

**증상**:
```
Error: connect ECONNREFUSED
Unable to connect to the database
```

**원인**:
- Supabase URL 잘못 설정
- 네트워크 연결 문제
- 방화벽 차단

**해결 방법**:

#### Step 1: 환경 변수 확인
```bash
# .env 파일 확인
cat .env | grep DATABASE_URL

# 올바른 형식
AUTH_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=auth_schema
BOARD_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=board_schema
```

#### Step 2: 연결 테스트
```bash
# psql 설치 (Ubuntu/Debian)
sudo apt-get install postgresql-client

# 연결 테스트
psql $AUTH_DATABASE_URL -c "SELECT 1;"
```

#### Step 3: Supabase 프로젝트 확인
1. [Supabase Dashboard](https://app.supabase.com/) 접속
2. 프로젝트 상태 확인 (Active)
3. Settings → Database → Connection string 복사

**검증**:
```bash
# 서비스 시작 시 로그 확인
npm run start:dev

# 정상 출력 예시:
# [TypeOrmModule] Successfully connected to the database
```

---

### 2. 스키마를 찾을 수 없음

**증상**:
```
Error: schema "auth_schema" does not exist
Error: relation "auth_schema.users" does not exist
```

**원인**:
- `schema_migration.sql` 미실행
- Supabase SQL Editor에서 스키마 생성 안 됨

**해결 방법**:
```bash
# 1. schema_migration.sql 파일 확인
cat schema_migration.sql

# 2. Supabase SQL Editor에서 실행
# https://app.supabase.com/project/YOUR_PROJECT/sql

# 3. 스키마 확인
psql $AUTH_DATABASE_URL -c "\dn"

# 정상 출력 예시:
#    Name     |  Owner
# ------------+----------
# auth_schema | postgres
# board_schema| postgres
```

---

### 3. 마이그레이션 실패

**증상**:
```
Error during migration
QueryFailedError: duplicate key value violates unique constraint
```

**원인**:
- 중복 데이터 존재
- 마이그레이션 순서 문제

**해결 방법**:
```bash
# 1. 마이그레이션 상태 확인
npm run typeorm migration:show

# 2. 마이그레이션 되돌리기
npm run typeorm migration:revert

# 3. 데이터 정리 후 재실행
npm run typeorm migration:run
```

---

## 🔴 Redis 연결 문제

### 1. Redis 연결 실패

**증상**:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**원인**:
- Redis 컨테이너 미실행
- Docker 네트워크 설정 오류
- 환경 변수 잘못 설정

**해결 방법**:

#### Step 1: Redis 컨테이너 확인
```bash
# 컨테이너 상태 확인
docker ps | grep redis

# 없으면 Redis 시작
docker-compose up -d redis

# 로그 확인
docker-compose logs -f redis
```

#### Step 2: 네트워크 확인
```bash
# Docker 네트워크 확인
docker network inspect app-network

# Redis가 app-network에 연결되어 있는지 확인
```

#### Step 3: 환경 변수 확인
```bash
# 컨테이너 내부에서 확인
docker exec board-service-1 env | grep REDIS

# 정상 출력 예시:
# REDIS_HOST=redis
# REDIS_PORT=6379
```

#### Step 4: Redis 연결 테스트
```bash
# Redis CLI로 연결
docker exec -it redis-cache redis-cli

# PING 테스트
127.0.0.1:6379> PING
PONG

# 종료
127.0.0.1:6379> exit
```

**검증**:
```bash
# 서비스 재시작
docker-compose restart board-service-1

# 로그 확인
docker-compose logs -f board-service-1 | grep -i redis
```

---

### 2. Redis 메모리 부족

**증상**:
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**원인**:
- Redis maxmemory 설정 초과
- 캐시 키가 만료되지 않고 계속 쌓임

**해결 방법**:

#### Step 1: 메모리 사용량 확인
```bash
docker exec redis-cache redis-cli INFO memory

# 출력 예시:
# used_memory_human:250.00M
# maxmemory_human:256.00M
```

#### Step 2: 캐시 정리
```bash
# 모든 캐시 삭제
docker exec redis-cache redis-cli FLUSHALL

# 특정 패턴 삭제
docker exec redis-cache redis-cli --scan --pattern "posts:*" | xargs docker exec -i redis-cache redis-cli DEL
```

#### Step 3: maxmemory-policy 확인
```bash
docker exec redis-cache redis-cli CONFIG GET maxmemory-policy

# 출력: "allkeys-lru" (LRU 방식으로 자동 제거)
```

---

## 🐳 Docker 관련 문제

### 1. 컨테이너 시작 실패

**증상**:
```
Error: container exited with code 1
Error: address already in use
```

**원인**:
- 포트 충돌
- 환경 변수 누락
- 볼륨 마운트 실패

**해결 방법**:

#### Step 1: 포트 충돌 확인
```bash
# 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# 프로세스 종료
taskkill /PID <PID> /F

# 또는 Docker Compose 포트 변경
```

#### Step 2: 로그 확인
```bash
# 컨테이너 로그 확인
docker-compose logs board-service-1

# 특정 에러 검색
docker-compose logs board-service-1 | grep -i error
```

#### Step 3: 강제 재생성
```bash
# 컨테이너 중지 및 제거
docker-compose down

# 강제 재생성
docker-compose up -d --force-recreate

# 또는 완전 초기화
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

### 2. 빌드 실패

**증상**:
```
Error: failed to build Dockerfile
Error: npm install failed
```

**원인**:
- Dockerfile 문법 오류
- 네트워크 연결 문제
- 빌드 캐시 문제

**해결 방법**:
```bash
# 1. 캐시 없이 빌드
docker-compose build --no-cache

# 2. BuildKit 사용 (더 빠름)
DOCKER_BUILDKIT=1 docker-compose build

# 3. 특정 서비스만 빌드
docker-compose build board-service-1

# 4. 빌드 로그 자세히 보기
docker-compose build --progress=plain
```

---

### 3. 볼륨 마운트 문제

**증상**:
```
Error: no such file or directory
Permission denied
```

**원인**:
- Windows 경로 문제
- Docker Desktop 파일 공유 미설정

**해결 방법 (Windows)**:
```bash
# 1. Docker Desktop 설정 확인
# Settings → Resources → File Sharing
# 프로젝트 경로가 공유되어 있는지 확인

# 2. 볼륨 삭제 후 재생성
docker-compose down -v
docker-compose up -d
```

---

## 🌐 Nginx 및 네트워크 문제

### 1. Nginx 502 Bad Gateway

**증상**:
```
502 Bad Gateway
nginx/1.25
```

**원인**:
- 백엔드 서비스 미실행
- 네트워크 연결 문제
- 프록시 설정 오류

**해결 방법**:

#### Step 1: 백엔드 서비스 확인
```bash
# 서비스 상태 확인
docker-compose ps

# 모두 "Up" 상태여야 함
# auth-service    Up
# board-service-1 Up
```

#### Step 2: Health Check
```bash
# 직접 서비스 호출
curl http://localhost:3000/health
curl http://localhost:3001/auth/health

# 정상이면 200 OK 응답
```

#### Step 3: Nginx 로그 확인
```bash
docker-compose logs nginx | grep -i error

# upstream 연결 실패 확인
# "connect() failed (111: Connection refused) while connecting to upstream"
```

#### Step 4: Nginx 재시작
```bash
docker-compose restart nginx
```

---

### 2. CORS 에러

**증상**:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**원인**:
- Nginx CORS 헤더 미설정
- NestJS CORS 설정 누락

**해결 방법**:
```typescript
// main.ts에 CORS 활성화
app.enableCors({
  origin: true,
  credentials: true,
});
```

---

## 📊 Prometheus 모니터링 문제

### 1. Prometheus 타겟 DOWN

**증상**:
- Prometheus UI에서 타겟 상태가 "DOWN"
- "Connection refused" 에러

**원인**:
- NestJS 서버가 완전히 시작되지 않음 (TypeORM 초기화 중)
- `/metrics` 엔드포인트 미구현
- Docker 네트워크 문제

**해결 방법**:

#### Step 1: 서비스 완전 시작 대기
```bash
# 서비스 로그 확인
docker-compose logs -f board-service-1

# "Nest application successfully started" 메시지 확인
```

#### Step 2: /metrics 엔드포인트 확인
```bash
# 직접 호출
curl http://localhost/metrics
curl http://localhost/auth/metrics

# 정상 출력 예시:
# # HELP http_requests_total Total number of HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{method="GET"} 123
```

#### Step 3: Prometheus 설정 확인
```bash
# prometheus.yml 확인
cat monitoring/prometheus.yml

# 타겟 주소 확인
# targets: ['board-service-1:3000', ...]
```

#### Step 4: Prometheus 재시작
```bash
docker-compose restart prometheus

# Prometheus UI 확인
# http://localhost:9090/targets
```

---

### 2. 메트릭이 수집되지 않음

**증상**:
- Prometheus UI에 타겟은 UP이지만 메트릭이 없음

**원인**:
- MetricsModule이 AppModule에 등록되지 않음
- MetricsInterceptor 미적용

**해결 방법**:

#### Step 1: MetricsModule 확인
```typescript
// app.module.ts
@Module({
  imports: [
    MetricsModule,  // ← 추가 확인
    // ...
  ],
})
```

#### Step 2: 재빌드
```bash
docker-compose build --no-cache board-service-1
docker-compose up -d board-service-1
```

---

## 🚀 프로덕션 배포 문제

### 1. SSH 연결 실패

**증상**:
```
Permission denied (publickey)
```

**원인**:
- SSH 키 권한 문제
- GitHub Secrets 잘못 설정

**해결 방법**:

#### Step 1: SSH 키 권한 확인
```bash
chmod 600 ~/.ssh/id_rsa

# SSH 연결 테스트
ssh -i ~/.ssh/id_rsa ubuntu@152.67.216.145
```

#### Step 2: GitHub Secrets 확인
```
Repository → Settings → Secrets and variables → Actions

PROD_SERVER_SSH_KEY: 전체 개인 키 (-----BEGIN ... END----- 포함)
```

---

### 2. 메모리 부족 (OOM Killer)

**증상**:
```
Container exited with code 137
Out of memory: Killed process
```

**원인**:
- Free Tier 1GB RAM 부족
- 스왑 메모리 미설정

**해결 방법**:

#### Step 1: 스왑 메모리 확인
```bash
free -h

# Swap이 0이면 생성 필요
```

#### Step 2: 스왑 메모리 생성
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 부팅 시 자동 마운트
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Step 3: 메모리 사용량 모니터링
```bash
# 실시간 모니터링
docker stats

# 메모리 많이 사용하는 컨테이너 확인
docker stats --format "table {{.Name}}\t{{.MemUsage}}"
```

---

### 3. UFW 방화벽으로 접속 차단

**증상**:
```
Connection timed out
```

**원인**:
- 필요한 포트가 열려있지 않음

**해결 방법**:
```bash
# 방화벽 상태 확인
sudo ufw status

# 필요한 포트 열기
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 방화벽 재로드
sudo ufw reload
```

---

## ⚡ 성능 문제

### 1. 응답 속도 느림

**증상**:
- API 응답 시간이 1초 이상

**해결 방법**:

#### Step 1: Redis 캐싱 확인
```bash
# 캐시 히트 확인
docker exec redis-cache redis-cli INFO stats | grep keyspace

# 캐시 키 확인
docker exec redis-cache redis-cli KEYS "posts:*"
```

#### Step 2: 데이터베이스 인덱스 확인
```sql
-- 인덱스 확인
SELECT * FROM pg_indexes
WHERE schemaname = 'board_schema';

-- 슬로우 쿼리 로그 확인
SELECT query, calls, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

---

### 2. 동시 요청 처리 실패

**증상**:
- 동시 요청 시 일부 요청 실패

**해결 방법**:
```bash
# 로드 밸런싱 확인
docker-compose ps | grep board-service

# 3대 모두 Up 상태 확인
# board-service-1 Up
# board-service-2 Up
# board-service-3 Up
```

---

## 🆘 긴급 대응 가이드

### 시스템 전체 다운 시

```bash
# 1. 모든 컨테이너 중지
docker-compose down

# 2. 로그 백업
docker-compose logs > emergency_logs_$(date +%Y%m%d_%H%M%S).txt

# 3. 완전 초기화
docker system prune -a --volumes  # 주의: 모든 데이터 삭제!

# 4. 재시작
docker-compose build --no-cache
docker-compose up -d

# 5. Health Check
curl http://localhost/health
curl http://localhost/auth/health
```

---

## 📞 지원

문제가 해결되지 않으면:
1. [GitHub Issues](https://github.com/hsm9411/board-msa/issues) 등록
2. 로그 파일 첨부: `docker-compose logs > debug.log`
3. 환경 정보 제공: OS, Docker 버전, Node.js 버전

---

**Last Updated**: 2026-02-06
