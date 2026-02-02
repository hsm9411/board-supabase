# Scripts

## 개요

이 폴더는 개발, 테스트, 배포 및 운영에 사용되는 자동화 스크립트를 포함합니다.

## 스크립트 목록

### 1. test-ci.sh
CI 파이프라인 로컬 시뮬레이션 스크립트

### 2. backup-db.sh (예정)
데이터베이스 백업 자동화 스크립트

---

## test-ci.sh

### 목적
GitHub Actions CI 파이프라인을 로컬에서 시뮬레이션하여 커밋 전 테스트를 수행합니다.

### 기능
1. Auth Service 린트 및 테스트
2. Board Service 린트 및 테스트
3. Docker 이미지 빌드 검증

### 사용 방법

```bash
# 1. 실행 권한 부여
chmod +x scripts/test-ci.sh

# 2. 스크립트 실행
./scripts/test-ci.sh
```

### 스크립트 내용

```bash
#!/bin/bash

# CI 파이프라인 로컬 시뮬레이션

echo "🧪 Running Auth Server Tests..."
cd auth-server
npm ci
npm run lint
npm test

echo "🧪 Running Board Server Tests..."
cd ../board-server
npm ci
npm run lint
npm test

echo "🐳 Building Docker Images..."
docker build -t auth-service:test ./auth-server
docker build -t board-service:test ./board-server

echo "✅ CI simulation completed!"
```

### 출력 예시

```
🧪 Running Auth Server Tests...
added 567 packages in 23s

> auth-server@0.0.1 lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix

> auth-server@0.0.1 test
> jest

 PASS  src/auth/auth.service.spec.ts
  AuthService
    ✓ should be defined (5 ms)
    signUp
      ✓ should create a new user (12 ms)
      ✓ should throw ConflictException if email exists (8 ms)
    signIn
      ✓ should return access token on valid credentials (15 ms)
      ✓ should throw UnauthorizedException on invalid credentials (7 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total

🧪 Running Board Server Tests...
...

🐳 Building Docker Images...
[+] Building 45.2s (12/12) FINISHED
...

✅ CI simulation completed!
```

### 실패 시 대응

**Lint 실패:**
```bash
# ESLint 에러 확인
npm run lint

# 자동 수정
npm run lint -- --fix
```

**Test 실패:**
```bash
# 상세 로그 확인
npm test -- --verbose

# 특정 테스트만 실행
npm test -- auth.service.spec.ts
```

**Docker Build 실패:**
```bash
# 캐시 없이 재빌드
docker build --no-cache -t auth-service:test ./auth-server
```

---

## backup-db.sh (예정)

### 목적
Supabase PostgreSQL 데이터베이스 백업 자동화

### 예상 기능
1. 스키마별 백업 (`auth_schema`, `board_schema`)
2. 타임스탬프 파일명 자동 생성
3. 백업 파일 압축 (gzip)
4. S3 또는 로컬 스토리지 저장
5. 오래된 백업 자동 삭제 (보관 기간 설정)

### 예상 사용 방법

```bash
# 1. 실행 권한 부여
chmod +x scripts/backup-db.sh

# 2. 환경 변수 설정
export DATABASE_URL="postgresql://..."
export BACKUP_DIR="./backups"
export RETENTION_DAYS=30

# 3. 수동 백업
./scripts/backup-db.sh

# 4. Cron 자동화 (매일 새벽 2시)
0 2 * * * /path/to/scripts/backup-db.sh
```

### 예상 스크립트 내용

```bash
#!/bin/bash
set -e

# ========================================
# Configuration
# ========================================
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p $BACKUP_DIR

# ========================================
# Auth Schema Backup
# ========================================
echo "🗄️ Backing up auth_schema..."
pg_dump $DATABASE_URL \
  --schema=auth_schema \
  --file=$BACKUP_DIR/auth_schema_$DATE.sql

# ========================================
# Board Schema Backup
# ========================================
echo "🗄️ Backing up board_schema..."
pg_dump $DATABASE_URL \
  --schema=board_schema \
  --file=$BACKUP_DIR/board_schema_$DATE.sql

# ========================================
# Compress
# ========================================
echo "📦 Compressing backups..."
gzip $BACKUP_DIR/auth_schema_$DATE.sql
gzip $BACKUP_DIR/board_schema_$DATE.sql

# ========================================
# Cleanup Old Backups
# ========================================
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# ========================================
# Redis Backup (optional)
# ========================================
echo "🗄️ Backing up Redis..."
docker exec redis-cache redis-cli BGSAVE

echo "✅ Backup completed!"
echo "📁 Backup location: $BACKUP_DIR"
ls -lh $BACKUP_DIR/*_$DATE.sql.gz
```

---

## 추가 스크립트 (향후 계획)

### deploy.sh
프로덕션 배포 자동화

**기능:**
- Docker 이미지 빌드 및 푸시
- SSH를 통한 원격 서버 배포
- Rolling Update 실행
- Health Check 확인

### restore-db.sh
데이터베이스 복원 스크립트

**기능:**
- 백업 파일 선택
- 스키마 복원
- 데이터 무결성 검증

### load-test.sh
부하 테스트 스크립트

**기능:**
- Apache Bench (ab) 또는 k6 사용
- 동시 사용자 시뮬레이션
- 성능 리포트 생성

**예시:**
```bash
#!/bin/bash
echo "🔥 Running load test..."
ab -n 10000 -c 100 http://localhost/board
k6 run load-test.js
```

### migrate.sh
데이터베이스 마이그레이션 실행

**기능:**
- TypeORM 마이그레이션 실행
- 롤백 기능
- 마이그레이션 상태 확인

**예시:**
```bash
#!/bin/bash
cd auth-server
npm run migration:run

cd ../board-server
npm run migration:run
```

### cleanup-docker.sh
Docker 리소스 정리

**기능:**
- 중지된 컨테이너 삭제
- 사용하지 않는 이미지 삭제
- 볼륨 및 네트워크 정리

**예시:**
```bash
#!/bin/bash
echo "🧹 Cleaning up Docker resources..."
docker container prune -f
docker image prune -a -f
docker volume prune -f
docker network prune -f
echo "✅ Docker cleanup completed!"
```

---

## 스크립트 작성 가이드라인

### 1. Shebang 필수
```bash
#!/bin/bash
```

### 2. 에러 발생 시 즉시 중단
```bash
set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure
```

### 3. 변수 검증
```bash
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set"
  exit 1
fi
```

### 4. 로깅 및 진행 상황 표시
```bash
echo "🚀 Starting deployment..."
echo "✅ Deployment completed!"
echo "❌ Deployment failed!"
```

### 5. 함수 사용
```bash
backup_schema() {
  local schema=$1
  echo "Backing up $schema..."
  pg_dump --schema=$schema ...
}

backup_schema "auth_schema"
backup_schema "board_schema"
```

### 6. Help 메시지
```bash
if [ "$1" = "--help" ]; then
  echo "Usage: ./backup-db.sh [options]"
  echo "Options:"
  echo "  --dir DIR       Backup directory (default: ./backups)"
  echo "  --retention N   Retention days (default: 30)"
  exit 0
fi
```

---

## 실행 권한 관리

### 모든 스크립트에 실행 권한 부여
```bash
chmod +x scripts/*.sh
```

### 특정 스크립트만 실행 권한 부여
```bash
chmod +x scripts/test-ci.sh
```

### 실행 권한 확인
```bash
ls -l scripts/
```

**출력 예시:**
```
-rwxr-xr-x  1 user  staff  1234 Feb  3 12:00 test-ci.sh
-rw-r--r--  1 user  staff   567 Feb  3 12:00 backup-db.sh
```

---

## Cron 작업 설정

### 일일 백업 (매일 새벽 2시)
```bash
# crontab -e
0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/backup.log 2>&1
```

### 주간 정리 (매주 일요일 새벽 3시)
```bash
0 3 * * 0 /path/to/scripts/cleanup-docker.sh >> /var/log/cleanup.log 2>&1
```

### Cron 로그 확인
```bash
tail -f /var/log/backup.log
```

---

## 참고 자료

- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)
- [Shell Script Best Practices](https://google.github.io/styleguide/shellguide.html)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Cron Expression](https://crontab.guru/)