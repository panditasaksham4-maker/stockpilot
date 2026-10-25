@echo off
echo ========================================================
echo  Launching StockPilot - Inventory Management System
echo ========================================================
cd /d "%~dp0\stockpilot"
if not exist node_modules (
    echo Installing dependencies...
    call npm.cmd install
)
if not exist data\stockpilot.db (
    echo Initializing and seeding database...
    call npm.cmd run seed
)
echo Starting StockPilot Server on http://localhost:3000 ...
call npm.cmd start
pause
