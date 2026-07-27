# Project Starter Script (PowerShell)
param([switch]$WaitForServers)

$ErrorActionPreference = "Stop"

$currentDir = $PSScriptRoot
$backendDir = Join-Path $currentDir "backend"
$frontendDir = Join-Path $currentDir "frontend"

Write-Host "Starting Project..." -ForegroundColor Cyan

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $backendDir -PassThru -WindowStyle Normal

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend Dev Server..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $frontendDir -PassThru -WindowStyle Normal

# Wait and open browser
Write-Host "Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "Opening Browser at http://localhost:5173" -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "All servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "To stop the servers:"
Write-Host "   - Close the backend and frontend windows"
Write-Host ""

if ($WaitForServers) {
    $backendProcess.WaitForExit()
    $frontendProcess.WaitForExit()
}
