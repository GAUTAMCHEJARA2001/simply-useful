#!/bin/bash

# SIMPLY USEFUL PLATFORM MANAGER (UNIX/MACOS)
echo "==========================================="
echo "🚀 STARTING SIMPLY USEFUL PLATFORM"
echo "==========================================="

# 1. Cleanup
echo "🔄 Cleaning previous processes..."
pkill -f node || true

# 2. Auto-Healing
if [ ! -d "backend/node_modules" ]; then
    echo "⚠️  Backend node_modules missing. Installing..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  Frontend node_modules missing. Installing..."
    cd frontend && npm install && cd ..
fi

# 3. Launch Services
echo "📡 Launching Backend..."
(cd backend && npm run dev) &
BACKEND_PID=$!

# Wait for backend
echo "⏳ Warming up telemetry..."
sleep 8

echo "🌐 Launching Frontend..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "==========================================="
echo "✅ SERVICES DISPATCHED"
echo "==========================================="

# 4. Health Check
echo "🔍 Verifying API Health..."
HEALTH=$(curl -s http://localhost:3000/api/v1/health)

if [[ $HEALTH == *"ok"* ]]; then
    echo "✅ DIAGNOSTIC SUCCESS: Backend is operational."
else
    echo "❌ DIAGNOSTIC FAILURE: Backend health check failed!"
fi

echo ""
echo "📘 Swagger: http://localhost:3000/api-docs"
echo "🚀 Frontend: http://localhost:5173"
echo ""

# Keep script running to manage child processes
wait
