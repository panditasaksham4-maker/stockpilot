#!/usr/bin/env bash
echo "========================================================================="
echo "   AI-POWERED SELF-HEALING CLOUD INFRASTRUCTURE CONTROL CENTER"
echo "========================================================================="

# Start backend in background
(cd backend && python3 main.py) &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Start frontend in background
(cd frontend && npm run dev) &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "Control Center Dashboard: http://localhost:3000"
echo "Backend API Docs:         http://localhost:8000/docs"
echo "Press Ctrl+C to terminate both services."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
