# MVS Server Start Wrapper
# Delegates to start-server.ps1 for consistency

param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

$scriptPath = Join-Path $PSScriptRoot "start-server.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Host "start-server.ps1 not found: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Delegating to start-server.ps1..." -ForegroundColor Cyan
& $scriptPath @Args

