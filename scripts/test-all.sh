#!/bin/bash

echo "🧪 Starting full CI simulation..."

# Auth Server
echo -e "\n📦 Testing Auth Server..."
cd auth-server

echo "  1️⃣ Installing dependencies..."
rm -rf node_modules package-lock.json
npm install

echo "  2️⃣ Running lint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Auth Server lint failed"
  exit 1
fi

echo "  3️⃣ Running tests..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ Auth Server tests failed"
  exit 1
fi

echo "✅ Auth Server passed all checks"

# Board Server
echo -e "\n📦 Testing Board Server..."
cd ../board-server

echo "  1️⃣ Installing dependencies..."
rm -rf node_modules package-lock.json
npm install

echo "  2️⃣ Running lint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Board Server lint failed"
  exit 1
fi

echo "  3️⃣ Running tests..."
npm test
if [ $? -ne 0 ]; then
  echo "❌ Board Server tests failed"
  exit 1
fi

echo "✅ Board Server passed all checks"

# Docker Build Test
echo -e "\n🐳 Testing Docker builds..."
docker build -t auth-test ./auth-server
if [ $? -ne 0 ]; then
  echo "❌ Auth Server Docker build failed"
  exit 1
fi

docker build -t board-test ./board-server
if [ $? -ne 0 ]; then
  echo "❌ Board Server Docker build failed"
  exit 1
fi

echo "✅ Docker builds successful"

echo -e "\n🎉 All checks passed! Ready to push."