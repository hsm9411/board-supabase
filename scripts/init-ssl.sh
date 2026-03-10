#!/bin/bash
# =============================================================
# init-ssl.sh — Let's Encrypt 인증서 최초 발급 스크립트
#
# 실행 환경: OCI 서버 (ubuntu@152.67.216.145)
# 실행 위치: /app 디렉토리
# 실행 조건: docker-compose.prod.yml과 nginx.conf가 /app에 있을 것
#
# 사용법:
#   chmod +x scripts/init-ssl.sh
#   sudo ./scripts/init-ssl.sh hsm9411-board.duckdns.org haeha2e@gmail.com
# =============================================================

set -e  # 명령 실패 시 즉시 중단

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "사용법: ./scripts/init-ssl.sh <도메인> <이메일>"
  echo "예시:   ./scripts/init-ssl.sh hsm9411-board.duckdns.org haeha2e@gmail.com"
  exit 1
fi

echo "=========================================="
echo "  Let's Encrypt SSL 인증서 발급 시작"
echo "  도메인: $DOMAIN"
echo "  이메일: $EMAIL"
echo "=========================================="

# -----------------------------------------------------------
# Step 1: 기존 컨테이너 전부 내림 (포트 충돌 방지)
# -----------------------------------------------------------
echo ""
echo "[1/5] 기존 컨테이너 정리..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# -----------------------------------------------------------
# Step 2: certbot 볼륨 생성 (없으면 자동 생성)
# -----------------------------------------------------------
echo ""
echo "[2/5] Docker 볼륨 준비..."
docker volume create app_certbot-conf 2>/dev/null || true
docker volume create app_certbot-www  2>/dev/null || true

# -----------------------------------------------------------
# Step 3: HTTP 전용 임시 nginx 기동 (ACME challenge 서빙용)
# nginx.conf.init 을 사용해서 443 없이 80만 올림
# 이렇게 하면 인증서 없어도 nginx가 정상 기동됨
# -----------------------------------------------------------
echo ""
echo "[3/5] 임시 nginx (HTTP 전용) 기동..."

# nginx.conf.init 에서 도메인 치환
sed "s/YOUR_DOMAIN/$DOMAIN/g" nginx.conf.init > /tmp/nginx-init.conf

docker run -d \
  --name nginx-init \
  -p 80:80 \
  -v /tmp/nginx-init.conf:/etc/nginx/nginx.conf:ro \
  -v app_certbot-www:/var/www/certbot \
  nginx:latest

echo "nginx-init 기동 완료. 3초 대기..."
sleep 3

# -----------------------------------------------------------
# Step 4: certbot으로 인증서 발급
# --webroot: nginx가 .well-known/acme-challenge/ 를 서빙하는 방식
# Let's Encrypt가 http://도메인/.well-known/acme-challenge/{토큰} 조회 → 성공 → 인증서 발급
# -----------------------------------------------------------
echo ""
echo "[4/5] Let's Encrypt 인증서 발급 중..."

docker run --rm \
  -v app_certbot-conf:/etc/letsencrypt \
  -v app_certbot-www:/var/www/certbot \
  certbot/certbot:latest certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "인증서 발급 완료!"

# -----------------------------------------------------------
# Step 5: 임시 nginx 제거 후 실제 스택 기동
# 이제 인증서가 certbot-conf 볼륨에 있으므로
# nginx.conf (443 포함)로 정상 기동 가능
# -----------------------------------------------------------
echo ""
echo "[5/5] 임시 nginx 제거 후 실제 스택 기동..."
docker rm -f nginx-init

# nginx.conf 에서 도메인 플레이스홀더가 남아있으면 경고
if grep -q "YOUR_DOMAIN" nginx.conf; then
  echo ""
  echo "⚠️  경고: nginx.conf 에 YOUR_DOMAIN 플레이스홀더가 남아있습니다."
  echo "    nginx.conf 의 YOUR_DOMAIN 을 $DOMAIN 으로 교체 후 재실행하세요."
  exit 1
fi

docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=========================================="
echo "  완료! HTTPS 설정이 완료되었습니다."
echo "  확인: https://$DOMAIN/health"
echo "  인증서 갱신: certbot 컨테이너가 12시간마다 자동 시도"
echo "=========================================="
