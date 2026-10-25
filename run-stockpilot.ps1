Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Launching StockPilot - Inventory Management System" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\stockpilot"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm.cmd install
}

if (-not (Test-Path "data\stockpilot.db")) {
    Write-Host "Seeding database with demo inventory and user accounts..." -ForegroundColor Yellow
    npm.cmd run seed
}

Write-Host "Starting StockPilot server on http://localhost:3000 ..." -ForegroundColor Cyan
npm.cmd start
