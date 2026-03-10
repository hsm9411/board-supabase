#!/bin/bash
# =============================================================
# duckdns-renew.sh — DuckDNS IP 자동 갱신 스크립트
#
# 역할: OCI 서버의 현재 공인 IP를 DuckDNS에 주기적으로 업데이트
#       cron에 등록해두면 IP가 바뀌어도 도메인이 끊기지 않음
#
# OCI Free Tier는 재시작해도 IP가 거의 안 바뀌지만,
# 만약을 대비해 5분마다 갱신 요청 (바뀐 게 없으면 DuckDNS가 무시)
#
# 설치 방법 (서버에서):
#   sudo cp scripts/duckdns-renew.sh /usr/local/bin/duckdns-renew.sh
#   sudo chmod +x /usr/local/bin/duckdns-renew.sh
#
# cron 등록 (5분마다 실행):
#   crontab -e
#   */5 * * * * /usr/local/bin/duckdns-renew.sh >> /var/log/duckdns.log 2>&1
# =============================================================

DOMAIN="hsm9411-board"
TOKEN="12c5ee5d-a0d9-4330-816e-c28f07a12d02"

# DuckDNS API 호출 — 현재 서버 IP로 자동 업데이트
RESULT=$(curl -s "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=")

echo "$(date '+%Y-%m-%d %H:%M:%S') | DuckDNS update: ${RESULT}"

if [ "$RESULT" = "OK" ]; then
  exit 0
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') | DuckDNS update FAILED: ${RESULT}"
  exit 1
fi
