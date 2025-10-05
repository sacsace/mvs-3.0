# MVS 3.0 Server Manager (PowerShell)
# Unified server start/stop management script

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "start"
)

# UTF-8 encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Project paths
$projectRoot = "D:\Software Project\MVS 3.0"
$backendDir = Join-Path $projectRoot "msv-server"
$frontendDir = Join-Path $projectRoot "msv-frontend"

# Function to display header
function Show-Header {
    param([string]$Title)
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

# Function to kill processes on specific ports
function Kill-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    Write-Host "Checking $ServiceName port $Port..." -ForegroundColor Yellow
    $processes = netstat -ano | Select-String ":$Port" | ForEach-Object { $_.ToString().Split(' ')[-1] }
    
    if ($processes) {
        foreach ($processId in $processes) {
            if ($processId -and $processId -ne "") {
                try {
                    Stop-Process -Id $processId -Force -ErrorAction Stop
                    Write-Host "  Process $processId terminated" -ForegroundColor Green
                } catch {
                    Write-Host "  Failed to terminate process $processId" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  No processes found on port $Port" -ForegroundColor Gray
    }
}

# Function to check server status
function Get-ServerStatus {
    $backendRunning = $false
    $frontendRunning = $false
    $databaseRunning = $false
    
    # Check backend
    $backendProcesses = netstat -ano | Select-String ":5000"
    if ($backendProcesses) { $backendRunning = $true }
    
    # Check frontend
    $frontendProcesses = netstat -ano | Select-String ":3000"
    if ($frontendProcesses) { $frontendRunning = $true }
    
    # Check database
    $dbStatus = docker ps --filter "name=mvs-3.0-postgres" --format "{{.Status}}" | Select-String "Up"
    if ($dbStatus) { $databaseRunning = $true }
    
    return @{
        Backend = $backendRunning
        Frontend = $frontendRunning
        Database = $databaseRunning
    }
}

# Function to start servers
function Start-Servers {
    Show-Header "MVS 3.0 Server Startup"
    
    # Clean up ports
    Write-Host "Cleaning up ports..." -ForegroundColor Yellow
    Kill-ProcessOnPort 5000 "Backend"
    Kill-ProcessOnPort 3000 "Frontend"
    Kill-ProcessOnPort 3001 "Other"
    Kill-ProcessOnPort 3002 "Alternative"
    Write-Host "Port cleanup completed" -ForegroundColor Green
    Write-Host ""
    
    # Start database containers
    Show-Header "Starting Database Containers"
    Set-Location $projectRoot
    docker-compose up postgres redis -d | Out-Null
    Write-Host "Database containers started" -ForegroundColor Green
    Write-Host ""
    
    # Start backend server
    Show-Header "Starting Backend Server (Terminal 1)"
    $backendScript = @"
Set-Location '$backendDir'
Write-Host 'MVS 3.0 Backend Server' -ForegroundColor Blue
Write-Host 'Port: http://localhost:5000' -ForegroundColor Gray
Write-Host 'Database: PostgreSQL (Docker)' -ForegroundColor Gray
Write-Host ''
Write-Host 'Server starting...' -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow
Write-Host ''
npm run dev
"@
    Start-Process powershell -ArgumentList "-NoExit -Command `"$backendScript`""
    Start-Sleep 3
    
    # Start frontend server
    Show-Header "Starting Frontend Server (Terminal 2)"
    $frontendScript = @"
Set-Location '$frontendDir'
Write-Host 'MVS 3.0 Frontend Server' -ForegroundColor Magenta
Write-Host 'Port: http://localhost:3000' -ForegroundColor Gray
Write-Host 'Browser will open automatically' -ForegroundColor Gray
Write-Host ''
Write-Host 'Server starting...' -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop' -ForegroundColor Yellow
Write-Host ''
`$env:PORT = '3000'
`$env:BROWSER = 'none'
npm start
"@
    Start-Process powershell -ArgumentList "-NoExit -Command `"$frontendScript`""
    
    Write-Host ""
    Show-Header "Server Startup Complete"
    Write-Host "Server Information:" -ForegroundColor Cyan
    Write-Host "  Backend (Terminal 1): http://localhost:5000" -ForegroundColor White
    Write-Host "  Frontend (Terminal 2): http://localhost:3000" -ForegroundColor White
    Write-Host "  Database: PostgreSQL (Docker)" -ForegroundColor White
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  - Check server logs in each terminal" -ForegroundColor Gray
    Write-Host "  - Auto-restart on code changes" -ForegroundColor Gray
    Write-Host "  - Stop servers: Ctrl+C in each terminal" -ForegroundColor Gray
    Write-Host "  - Browser: http://localhost:3000" -ForegroundColor Gray
    Write-Host ""
    
    Start-Sleep 5
    Write-Host "Opening browser..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
}

# Function to stop servers
function Stop-Servers {
    Show-Header "MVS 3.0 Server Shutdown"
    
    Write-Host "Stopping application servers..." -ForegroundColor Yellow
    Kill-ProcessOnPort 5000 "Backend"
    Kill-ProcessOnPort 3000 "Frontend"
    Kill-ProcessOnPort 3001 "Other"
    Write-Host "Application servers stopped" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
    Set-Location $projectRoot
    docker-compose down | Out-Null
    Write-Host "Docker containers stopped" -ForegroundColor Green
    Write-Host ""
    
    Show-Header "Server Shutdown Complete"
    Write-Host "All servers have been stopped." -ForegroundColor Green
    Write-Host ""
    Write-Host "To start servers again:" -ForegroundColor Yellow
    Write-Host "  .\server-manager.ps1 start" -ForegroundColor Gray
}

# Function to restart servers
function Restart-Servers {
    Show-Header "MVS 3.0 Server Restart"
    Stop-Servers
    Start-Sleep 2
    Start-Servers
}

# Function to show server status
function Show-ServerStatus {
    Show-Header "MVS 3.0 Server Status"
    
    $status = Get-ServerStatus
    
    Write-Host "Server Status:" -ForegroundColor Cyan
    Write-Host "  Backend (Port 5000): " -NoNewline
    if ($status.Backend) {
        Write-Host "RUNNING" -ForegroundColor Green
    } else {
        Write-Host "STOPPED" -ForegroundColor Red
    }
    
    Write-Host "  Frontend (Port 3000): " -NoNewline
    if ($status.Frontend) {
        Write-Host "RUNNING" -ForegroundColor Green
    } else {
        Write-Host "STOPPED" -ForegroundColor Red
    }
    
    Write-Host "  Database (Docker): " -NoNewline
    if ($status.Database) {
        Write-Host "RUNNING" -ForegroundColor Green
    } else {
        Write-Host "STOPPED" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Available Commands:" -ForegroundColor Yellow
    Write-Host "  .\server-manager.ps1 start    - Start all servers" -ForegroundColor Gray
    Write-Host "  .\server-manager.ps1 stop     - Stop all servers" -ForegroundColor Gray
    Write-Host "  .\server-manager.ps1 restart  - Restart all servers" -ForegroundColor Gray
    Write-Host "  .\server-manager.ps1 status   - Show server status" -ForegroundColor Gray
}

# Main execution
switch ($Action.ToLower()) {
    "start" {
        Start-Servers
    }
    "stop" {
        Stop-Servers
    }
    "restart" {
        Restart-Servers
    }
    "status" {
        Show-ServerStatus
    }
    default {
        Write-Host "Invalid action: $Action" -ForegroundColor Red
        Write-Host "Valid actions: start, stop, restart, status" -ForegroundColor Yellow
    }
}
