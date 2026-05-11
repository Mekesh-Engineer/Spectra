#!/bin/bash
cd "$(dirname "$0")/.."

echo "Starting Spectra..."

# 1. Python AI Engine (background)
python ai-engine/detect_service.py &
AI_PID=$!
echo "  AI Engine started (PID: $AI_PID)"
sleep 5

# 2. Express Backend (background)
npm run server &
SERVER_PID=$!
echo "  Backend started (PID: $SERVER_PID)"

# 3. Vite Frontend (foreground)
echo "  Frontend starting..."
echo ""
echo "  AI Engine:  http://localhost:5000"
echo "  Backend:    http://localhost:3001"
echo "  Frontend:   http://localhost:5173"
echo ""
npm run dev

# Cleanup on exit
kill $AI_PID $SERVER_PID 2>/dev/null
