# MVS 3.0 Test Execution Script (Windows PowerShell)

param(
    [Parameter(Position=0)]
    [ValidateSet("unit", "integration", "e2e", "performance", "all")]
    [string]$TestType = "all"
)

# Color definitions
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Function definitions
function Write-Header {
    param([string]$Message)
    Write-Host "=================================" -ForegroundColor $Blue
    Write-Host $Message -ForegroundColor $Blue
    Write-Host "=================================" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Yellow
}

# Environment check
function Test-Environment {
    Write-Header "Environment Check"
    
    # Check Node.js version
    try {
        $NodeVersion = node --version
        Write-Success "Node.js: $NodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed."
        exit 1
    }
    
    # Check npm version
    try {
        $NpmVersion = npm --version
        Write-Success "npm: $NpmVersion"
    }
    catch {
        Write-Error "npm is not installed."
        exit 1
    }
    
    # Check Docker
    try {
        $DockerVersion = docker --version
        Write-Success "Docker: $DockerVersion"
    }
    catch {
        Write-Warning "Docker is not installed. Some tests may be limited."
    }
}

# Install dependencies
function Install-Dependencies {
    Write-Header "Installing Dependencies"
    
    # Install backend dependencies
    Write-Host "Installing backend dependencies..."
    Set-Location msv-server
    try {
        npm ci
        Write-Success "Backend dependencies installed successfully"
    }
    catch {
        Write-Error "Failed to install backend dependencies"
        exit 1
    }
    
    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..."
    Set-Location ../msv-frontend
    try {
        npm ci
        Write-Success "Frontend dependencies installed successfully"
    }
    catch {
        Write-Error "Failed to install frontend dependencies"
        exit 1
    }
    
    Set-Location ..
}

# Setup database
function Setup-Database {
    Write-Header "Database Setup"
    
    # Start database with Docker
    Write-Host "Starting PostgreSQL and Redis..."
    try {
        docker-compose up postgres redis -d
        Write-Success "Database started successfully"
        
        # Wait for database connection
        Write-Host "Waiting for database connection..."
        Start-Sleep -Seconds 10
        
        # Run migrations
        Write-Host "Running database migrations..."
        Set-Location msv-server
        try {
            npm run db:migrate
            Write-Success "Migrations completed"
        }
        catch {
            Write-Warning "Migration failed (continuing with tests)"
        }
        Set-Location ..
    }
    catch {
        Write-Warning "Failed to start database with Docker. Continuing with tests..."
    }
}

# Run unit tests
function Test-Unit {
    Write-Header "Running Unit Tests"
    
    # Backend unit tests
    Write-Host "Running backend unit tests..."
    Set-Location msv-server
    try {
        npm test
        Write-Success "Backend unit tests passed"
    }
    catch {
        Write-Error "Backend unit tests failed"
        $script:TestFailed = $true
    }
    Set-Location ..
    
    # Frontend unit tests
    Write-Host "Running frontend unit tests..."
    Set-Location msv-frontend
    try {
        npm test -- --watchAll=false
        Write-Success "Frontend unit tests passed"
    }
    catch {
        Write-Error "Frontend unit tests failed"
        $script:TestFailed = $true
    }
    Set-Location ..
}

# Run integration tests
function Test-Integration {
    Write-Header "Running Integration Tests"
    
    # Start backend server
    Write-Host "Starting backend server..."
    Set-Location msv-server
    $BackendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm run dev }
    Set-Location ..
    
    # Wait for server startup
    Write-Host "Waiting for server startup..."
    Start-Sleep -Seconds 15
    
    # Run integration tests
    Write-Host "Running integration tests..."
    Set-Location msv-server
    try {
        npm run test:integration
        Write-Success "Integration tests passed"
    }
    catch {
        Write-Error "Integration tests failed"
        $script:TestFailed = $true
    }
    Set-Location ..
    
    # Stop server
    Stop-Job $BackendJob
    Remove-Job $BackendJob
}

# Run E2E tests
function Test-E2E {
    Write-Header "Running E2E Tests"
    
    # Start backend server
    Write-Host "Starting backend server..."
    Set-Location msv-server
    $BackendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm run dev }
    Set-Location ..
    
    # Start frontend server
    Write-Host "Starting frontend server..."
    Set-Location msv-frontend
    $FrontendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm start }
    Set-Location ..
    
    # Wait for server startup
    Write-Host "Waiting for server startup..."
    Start-Sleep -Seconds 30
    
    # Run E2E tests
    Write-Host "Running E2E tests..."
    try {
        npm run test:e2e
        Write-Success "E2E tests passed"
    }
    catch {
        Write-Error "E2E tests failed"
        $script:TestFailed = $true
    }
    
    # Stop servers
    Stop-Job $BackendJob, $FrontendJob
    Remove-Job $BackendJob, $FrontendJob
}

# Run performance tests
function Test-Performance {
    Write-Header "Running Performance Tests"
    
    # Start backend server
    Write-Host "Starting backend server..."
    Set-Location msv-server
    $BackendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm run dev }
    Set-Location ..
    
    # Wait for server startup
    Write-Host "Waiting for server startup..."
    Start-Sleep -Seconds 15
    
    # Run performance tests
    Write-Host "Running performance tests..."
    try {
        npm run test:performance
        Write-Success "Performance tests passed"
    }
    catch {
        Write-Error "Performance tests failed"
        $script:TestFailed = $true
    }
    
    # Stop server
    Stop-Job $BackendJob
    Remove-Job $BackendJob
}

# Test results summary
function Show-Summary {
    Write-Header "Test Results Summary"
    
    if ($TestFailed) {
        Write-Error "Some tests failed."
        Write-Host "Please check the logs above for details."
        exit 1
    }
    else {
        Write-Success "All tests completed successfully!"
        Write-Host "🎉 MVS 3.0 system is working properly."
    }
}

# Cleanup tasks
function Invoke-Cleanup {
    Write-Header "Cleanup Tasks"
    
    # Stop Docker containers
    Write-Host "Stopping Docker containers..."
    try {
        docker-compose down
    }
    catch {
        Write-Warning "Failed to stop Docker containers"
    }
    
    # Clean up running processes
    Write-Host "Cleaning up running processes..."
    Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Success "Cleanup completed"
}

# Main execution
function Main {
    # Initialize global variables
    $script:TestFailed = $false
    
    # Setup trap (run cleanup on Ctrl+C)
    try {
        # Execute tests
        Test-Environment
        Install-Dependencies
        Setup-Database
        
        # Execute tests by type
        switch ($TestType) {
            "unit" { Test-Unit }
            "integration" { Test-Integration }
            "e2e" { Test-E2E }
            "performance" { Test-Performance }
            "all" {
                Test-Unit
                Test-Integration
                Test-E2E
                Test-Performance
            }
        }
        
        Show-Summary
    }
    finally {
        Invoke-Cleanup
    }
}

# Execute script
Main