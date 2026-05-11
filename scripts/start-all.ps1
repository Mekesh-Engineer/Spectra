# Spectra — Start all three services in separate terminals
Write-Host "Starting Spectra..." -ForegroundColor Cyan

$root = Split-Path $PSScriptRoot -Parent

# 1. Python AI Engine (port 5000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; python ai-engine/detect_service.py"

# 2. Wait for Python to load models
Start-Sleep -Seconds 5

# 3. Express Backend (port 3001)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run server"

# 4. Vite Frontend (port 5173)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

Write-Host "All services started." -ForegroundColor Green
Write-Host "  AI Engine:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "  Backend:    http://localhost:3001" -ForegroundColor Yellow
Write-Host "  Frontend:   http://localhost:5173" -ForegroundColor Yellow
