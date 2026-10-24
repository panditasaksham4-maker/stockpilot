@echo off
TITLE AI Self-Healing Cloud Control Center Launcher
echo =========================================================================
echo    AI-POWERED SELF-HEALING CLOUD INFRASTRUCTURE CONTROL CENTER
echo =========================================================================
echo Starting Backend and Frontend services...
echo.

REM Start Backend in a new window
start "Self-Healing Backend (FastAPI)" cmd /k "cd backend && python main.py"

REM Start Frontend in a new window
start "Self-Healing Frontend (Vite)" cmd /k "cd frontend && npm.cmd run dev"

echo.
echo Services launched!
echo Control Center Dashboard: http://localhost:3000
echo Backend API Docs:         http://localhost:8000/docs
echo =========================================================================
pause
