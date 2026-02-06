# 배포 가이드

> **프로젝트**: Scalable Bulletin Board System
> **버전**: 2.3.0
> **업데이트**: 2026-02-06

---

## 📋 목차

1. [로컬 개발 환경](#로컬-개발-환경)
2. [Oracle Cloud 프로덕션 배포](#oracle-cloud-프로덕션-배포)
3. [CI/CD 파이프라인](#cicd-파이프라인)
4. [배포 전략](#배포-전략)
5. [롤백 가이드](#롤백-가이드)

---

## 💻 로컬 개발 환경

### 사전 요구사항

- [Docker Desktop](https://www.docker.com/) v20.10+
- [Node.js](https://nodejs.org/) v22+
- [Git](https://git-scm.com/)

### 환경 변수 설정

#### 1. .env 파일 생성
```bash
cp .env.example .env
```

#### 2. .env 파일 수정
```env
# ========================================
# Database Configuration
# ========================================
AUTH_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=auth_schema
BOARD_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=board_schema

# ========================================
# JWT Configuration
# ========================================
JWT_SECRET=your_local_secret_key

# ========================================
# Redis Configuration
# ========================================
REDIS_HOST=redis
REDIS_PORT=6379

# ========================================
# Service URLs (Internal)
# ========================================
AUTH_SERVICE_URL=http://auth-service:3001

# ========================================
# Environment
# ========================================
NODE_ENV=development
TZ=Asia/Seoul
```

### 데이터베이스 초기화

#### Supabase SQL Editor에서 실행
```bash
# 1. Supabase 프로젝트 접속
https://app.supabase.com/project/YOUR_PROJECT/sql

# 2. schema_migration.sql 전체 내용 복사 후 실행
cat schema_migration.sql | pbcopy  # macOS
cat schema_migration.sql | clip    # Windows
```

### Docker Compose로 실행

#### 방법 1: 전체 스택 실행 (권장)
```bash
# 1. 클린 빌드
docker-compose build --no-cache

# 2. 백그라운드 실행
docker-compose up -d

# 3. 로그 확인
docker-compose logs -f

# 4. 특정 서비스만 로그 보기
docker-compose logs -f board-service-1 auth-service
```

#### 방법 2: 개발 모드 (Hot Reload)
```bash
# Terminal 1: Auth Service
cd auth-server
npm install
npm run start:dev

# Terminal 2: Board Service
cd board-server
npm install
npm run start:dev

# Terminal 3: Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 4: Nginx (Optional)
docker-compose up -d nginx
```

### 서비스 접속 확인

```bash
# Health Check
curl http://localhost/health
curl http://localhost/auth/health

# Swagger UI
open http://localhost/api           # Board Service
open http://localhost/auth/api      # Auth Service

# Prometheus
open http://localhost:9090

# Grafana
open http://localhost:4000  # ID: admin / PW: admin
```

---

## ☁️ Oracle Cloud 프로덕션 배포

### 1. OCI 인스턴스 생성

#### 인스턴스 스펙
- **Shape**: VM.Standard.E2.1.Micro (Always Free)
- **Image**: Ubuntu 24.04 LTS
- **vCPU**: 1 core
- **RAM**: 1GB
- **Storage**: 47GB
- **Region**: AP-CHUNCHEON-1

#### 인스턴스 생성 단계
1. OCI Console 접속
2. Compute → Instances → Create Instance
3. Name: `board-msa-server`
4. Image: `Ubuntu 24.04`
5. Shape: `VM.Standard.E2.1.Micro`
6. VCN: Create new VCN
7. SSH Key: 공개 키 업로드
8. Create!

### 2. 서버 초기 설정

#### SSH 접속
```bash
ssh -i ~/.ssh/id_rsa ubuntu@152.67.216.145
```

#### 호스트네임 설정
```bash
sudo hostnamectl set-hostname board-msa-server
```

#### UFW 방화벽 설정
```bash
# 기본 정책
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 허용 포트
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS (향후 사용)

# 방화벽 활성화
sudo ufw enable

# 상태 확인
sudo ufw status verbose
```

**출력 예시**:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

#### 스왑 메모리 설정 (2GB)
```bash
# 스왑 파일 생성
sudo fallocate -l 2G /swapfile

# 권한 설정
sudo chmod 600 /swapfile

# 스왑 영역 설정
sudo mkswap /swapfile

# 스왑 활성화
sudo swapon /swapfile

# 부팅 시 자동 마운트
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
```

**출력 예시**:
```
              total        used        free      shared  buff/cache   available
Mem:          975Mi       450Mi       200Mi        10Mi       325Mi       400Mi
Swap:         2.0Gi       100Mi       1.9Gi
```

#### Docker 설치
```bash
# Docker 설치 스크립트
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 사용자 권한 추가
sudo usermod -aG docker $USER

# 재로그인
exit
ssh -i ~/.ssh/id_rsa ubuntu@152.67.216.145

# 버전 확인
docker --version
docker compose version
```

### 3. 프로젝트 배포

#### 디렉토리 설정
```bash
# /app 디렉토리 생성
sudo mkdir -p /app

# 소유권 변경
sudo chown -R $USER:$USER /app

# 이동
cd /app
```

#### 환경 변수 설정
```bash
# .env 파일 생성
nano .env
```

**.env 파일 내용**:
```env
# Database
AUTH_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=auth_schema
BOARD_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?schema=board_schema

# JWT (보안 강화)
JWT_SECRET=production_secret_key_32_characters_minimum

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Service URLs
AUTH_SERVICE_URL=http://auth-service:3001

# Environment
NODE_ENV=production
TZ=Asia/Seoul
```

⚠️ **보안 주의**:
```bash
# 강력한 JWT Secret 생성
openssl rand -base64 32

# .env 파일 권한 설정
chmod 600 .env
```

#### docker-compose.prod.yml 배포
```bash
# Git에서 파일 가져오기
git clone https://github.com/YOUR_USERNAME/board-msa.git .

# 또는 rsync로 파일 전송
rsync -avz -e "ssh -i ~/.ssh/id_rsa" \
  ./docker-compose.prod.yml \
  ubuntu@152.67.216.145:/app/
```

#### Docker 이미지 Pull 및 실행
```bash
# 이미지 다운로드
docker compose -f docker-compose.prod.yml pull

# 백그라운드 실행
docker compose -f docker-compose.prod.yml up -d

# 로그 확인
docker compose -f docker-compose.prod.yml logs -f
```

### 4. 배포 확인

#### 서비스 상태 확인
```bash
# 모든 컨테이너 상태
docker compose -f docker-compose.prod.yml ps

# 정상 출력 예시:
# NAME                  STATUS        PORTS
# auth-service          Up 5 minutes
# board-service-1       Up 5 minutes
# board-service-2       Up 5 minutes
# board-service-3       Up 5 minutes
# nginx                 Up 5 minutes  0.0.0.0:80->80/tcp
# redis-cache           Up 5 minutes
# prometheus            Up 5 minutes
# grafana               Up 5 minutes
```

#### Health Check
```bash
# 로컬에서 확인
curl http://152.67.216.145/health
curl http://152.67.216.145/auth/health

# 정상 응답 예시:
# {"status":"ok","info":{"database":{"status":"up"}}}
```

#### 리소스 사용량 확인
```bash
# 실시간 모니터링
docker stats

# 출력 예시:
# CONTAINER ID   NAME              CPU %     MEM USAGE / LIMIT
# abc123         board-service-1   0.50%     150MiB / 975MiB
# def456         auth-service      0.30%     120MiB / 975MiB
# ghi789         redis-cache       0.10%     50MiB / 975MiB
```

---

## 🔄 CI/CD 파이프라인

### GitHub Actions 설정

#### 1. GitHub Secrets 등록

```
Repository → Settings → Secrets and variables → Actions
```

**필수 Secrets**:
```
DOCKER_USERNAME         # Docker Hub 사용자명
DOCKER_PASSWORD         # Docker Hub 토큰
PROD_SERVER_HOST        # 152.67.216.145
PROD_SERVER_USER        # ubuntu
PROD_SERVER_SSH_KEY     # SSH 개인 키 전체 내용
```

#### 2. 워크플로우 파일

##### Auth Service CI/CD
`.github/workflows/auth-service-ci-cd.yml`

**트리거**:
- `push` to `main` or `develop`
- `workflow_dispatch` (수동 실행)

**작업 흐름**:
```
1. Lint & Test
2. Docker Build
3. Push to Docker Hub
4. Deploy (수동 승인)
```

##### Board Service CI/CD
`.github/workflows/board-service-ci-cd.yml`

**트리거**: Auth Service와 동일

##### Infra CI/CD
`.github/workflows/infra-ci-cd.yml`

**트리거**:
- `nginx.conf` 변경
- `monitoring/**` 변경
- `docker-compose.prod.yml` 변경

### 배포 실행

#### 방법 1: GitHub Actions (자동)
```bash
# develop 브랜치에 push
git push origin develop

# 자동으로 빌드 및 테스트 실행
# (배포는 수동 승인 필요)
```

#### 방법 2: 수동 트리거
```
1. GitHub Repository → Actions 탭
2. "Auth Service CI/CD" 또는 "Board Service CI/CD" 선택
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 (main)
5. "Run workflow" 실행
```

#### 방법 3: 로컬 스크립트
```bash
# 서버에서 직접 실행
ssh ubuntu@152.67.216.145

cd /app
./scripts/deploy.sh
```

---

## 🎯 배포 전략

### Rolling Update

**목적**: 무중단 배포

**전략**:
```bash
# Board Service 3대를 순차적으로 재시작
docker compose -f docker-compose.prod.yml up -d board-service-1 --no-deps
sleep 10

docker compose -f docker-compose.prod.yml up -d board-service-2 --no-deps
sleep 10

docker compose -f docker-compose.prod.yml up -d board-service-3 --no-deps
```

**장점**:
- ✅ 사용자는 서비스 중단을 느끼지 못함
- ✅ 3대 중 2대는 항상 실행 중
- ✅ 문제 발생 시 즉시 중단 가능

### Blue-Green Deployment (향후)

**현재 상태**: 미구현
**계획**: Phase 7에서 구현 예정

---

## 🔙 롤백 가이드

### 긴급 롤백 (이전 이미지로)

```bash
# 1. 현재 실행 중인 이미지 태그 확인
docker images | grep board-service

# 2. docker-compose.prod.yml 수정
nano docker-compose.prod.yml

# 이미지 태그 변경
# image: hsm9411/board-service:latest
# →
# image: hsm9411/board-service:v2.2.0  # 이전 버전

# 3. 재배포
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# 4. 확인
curl http://152.67.216.145/health
```

### Git 커밋 롤백

```bash
# 1. 이전 커밋으로 되돌리기
git log --oneline -5
git revert <commit_hash>

# 2. 푸시
git push origin main

# 3. GitHub Actions 자동 배포 대기
```

### 데이터베이스 롤백

```bash
# 마이그레이션 되돌리기
docker exec board-service-1 npm run typeorm migration:revert
```

---

## 📋 배포 체크리스트

### 배포 전

- [ ] 로컬에서 모든 테스트 통과
- [ ] Health Check 정상 응답
- [ ] 환경 변수 설정 확인
- [ ] .env 파일 보안 확인 (JWT_SECRET 강력한가?)
- [ ] DB 마이그레이션 계획 수립
- [ ] 롤백 계획 수립

### 배포 중

- [ ] GitHub Actions 워크플로우 통과
- [ ] Docker 이미지 빌드 성공
- [ ] Docker Hub 푸시 성공
- [ ] SSH 접속 성공
- [ ] 컨테이너 시작 성공

### 배포 후

- [ ] 모든 컨테이너 `Up` 상태
- [ ] Health Check 정상 응답
- [ ] Prometheus 타겟 `UP` 상태
- [ ] Grafana 대시보드 접속 가능
- [ ] API 요청 정상 동작
- [ ] 로그에 에러 없음
- [ ] 메모리 사용량 < 80%
- [ ] 스왑 사용량 < 50%

---

## 🛠️ 배포 스크립트

### deploy.sh

**위치**: `/app/scripts/deploy.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest images
echo "📦 Pulling Docker images..."
docker compose -f docker-compose.prod.yml pull

# Rolling update for Board services
echo "🔄 Rolling update: Board Service"
for service in board-service-1 board-service-2 board-service-3; do
  echo "  Updating $service..."
  docker compose -f docker-compose.prod.yml up -d $service --no-deps
  sleep 10
done

# Update Auth service
echo "🔄 Updating: Auth Service"
docker compose -f docker-compose.prod.yml up -d auth-service --no-deps

# Update infrastructure
echo "🔄 Updating: Infrastructure"
docker compose -f docker-compose.prod.yml up -d nginx prometheus grafana --no-deps --force-recreate

# Cleanup
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment completed!"
echo "🔍 Checking service status..."
docker compose -f docker-compose.prod.yml ps
```

**사용법**:
```bash
chmod +x /app/scripts/deploy.sh
/app/scripts/deploy.sh
```

---

## 📞 지원

배포 관련 문의:
- [GitHub Issues](https://github.com/hsm9411/board-msa/issues)
- Email: haeha2e@gmail.com

---

**Last Updated**: 2026-02-06
