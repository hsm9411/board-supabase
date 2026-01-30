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