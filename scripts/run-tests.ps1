# MVS 3.0 테스트 실행 스크립트

param(
    [string]$TestType = "all",
    [string]$Environment = "development",
    [switch]$Verbose,
    [switch]$Coverage,
    [switch]$Watch,
    [string]$TestFile = ""
)

# 색상 정의
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# 로그 함수
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

Write-Info "MVS 3.0 테스트 실행 시작 - 타입: $TestType, 환경: $Environment"

try {
    # 1. 테스트 환경 준비
    Write-Info "테스트 환경 준비 중..."
    
    # Node.js 버전 확인
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Node.js가 설치되지 않았습니다."
        exit 1
    }
    Write-Info "Node.js 버전: $nodeVersion"

    # 2. 의존성 설치
    Write-Info "테스트 의존성 설치 중..."
    
    # 루트 디렉토리에서 테스트 의존성 설치
    if (Test-Path "package.json") {
        npm install --silent
    }

    # 백엔드 테스트 의존성
    if (Test-Path "msv-server/package.json") {
        Set-Location "msv-server"
        npm install --silent
        Set-Location ".."
    }

    # 프론트엔드 테스트 의존성
    if (Test-Path "msv-frontend/package.json") {
        Set-Location "msv-frontend"
        npm install --silent
        Set-Location ".."
    }

    # 3. 환경 변수 설정
    $env:TEST_BASE_URL = if ($Environment -eq "production") { "https://api.mvs.local" } else { "http://localhost:5000" }
    $env:TEST_FRONTEND_URL = if ($Environment -eq "production") { "https://mvs.local" } else { "http://localhost:3000" }
    $env:NODE_ENV = "test"

    # 4. 테스트 타입별 실행
    switch ($TestType.ToLower()) {
        "unit" {
            Write-Info "단위 테스트 실행 중..."
            Run-UnitTests
        }
        "integration" {
            Write-Info "통합 테스트 실행 중..."
            Run-IntegrationTests
        }
        "e2e" {
            Write-Info "E2E 테스트 실행 중..."
            Run-E2ETests
        }
        "performance" {
            Write-Info "성능 테스트 실행 중..."
            Run-PerformanceTests
        }
        "security" {
            Write-Info "보안 테스트 실행 중..."
            Run-SecurityTests
        }
        "all" {
            Write-Info "전체 테스트 실행 중..."
            Run-AllTests
        }
        default {
            Write-Error "지원하지 않는 테스트 타입입니다: $TestType"
            Write-Info "지원되는 타입: unit, integration, e2e, performance, security, all"
            exit 1
        }
    }

    Write-Success "테스트 실행 완료!"

}
catch {
    Write-Error "테스트 실행 중 오류 발생: $($_.Exception.Message)"
    exit 1
}

function Run-UnitTests {
    Write-Info "백엔드 단위 테스트 실행 중..."
    Set-Location "msv-server"
    
    $testCommand = "npm test"
    if ($Coverage) { $testCommand += " -- --coverage" }
    if ($Watch) { $testCommand += " -- --watch" }
    if ($Verbose) { $testCommand += " -- --verbose" }
    
    Invoke-Expression $testCommand
    $backendExitCode = $LASTEXITCODE
    Set-Location ".."

    Write-Info "프론트엔드 단위 테스트 실행 중..."
    Set-Location "msv-frontend"
    
    $testCommand = "npm test"
    if ($Coverage) { $testCommand += " -- --coverage" }
    if ($Watch) { $testCommand += " -- --watch" }
    if ($Verbose) { $testCommand += " -- --verbose" }
    
    Invoke-Expression $testCommand
    $frontendExitCode = $LASTEXITCODE
    Set-Location ".."

    if ($backendExitCode -ne 0 -or $frontendExitCode -ne 0) {
        Write-Error "단위 테스트 실패"
        exit 1
    }
}

function Run-IntegrationTests {
    Write-Info "통합 테스트 실행 중..."
    
    # 통합 테스트 실행
    $testCommand = "node tests/integration/run-integration-tests.js"
    if ($Verbose) { $testCommand += " --verbose" }
    
    Invoke-Expression $testCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "통합 테스트 실패"
        exit 1
    }
}

function Run-E2ETests {
    Write-Info "E2E 테스트 실행 중..."
    
    # Playwright 또는 Cypress E2E 테스트 실행
    if (Test-Path "tests/e2e/playwright.config.js") {
        Set-Location "tests/e2e"
        npx playwright test
        $e2eExitCode = $LASTEXITCODE
        Set-Location "../.."
    } elseif (Test-Path "tests/e2e/cypress.config.js") {
        Set-Location "tests/e2e"
        npx cypress run
        $e2eExitCode = $LASTEXITCODE
        Set-Location "../.."
    } else {
        Write-Warning "E2E 테스트 설정이 없습니다. 통합 테스트를 실행합니다."
        Run-IntegrationTests
        return
    }

    if ($e2eExitCode -ne 0) {
        Write-Error "E2E 테스트 실패"
        exit 1
    }
}

function Run-PerformanceTests {
    Write-Info "성능 테스트 실행 중..."
    
    # Artillery 또는 k6 성능 테스트 실행
    if (Test-Path "tests/performance/artillery.yml") {
        npx artillery run tests/performance/artillery.yml
    } elseif (Test-Path "tests/performance/k6-script.js") {
        npx k6 run tests/performance/k6-script.js
    } else {
        Write-Warning "성능 테스트 설정이 없습니다. 기본 성능 테스트를 실행합니다."
        
        # 기본 성능 테스트
        node tests/performance/basic-performance-test.js
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "성능 테스트 실패"
        exit 1
    }
}

function Run-SecurityTests {
    Write-Info "보안 테스트 실행 중..."
    
    # OWASP ZAP 또는 기타 보안 테스트 도구 실행
    if (Test-Path "tests/security/security-test.js") {
        node tests/security/security-test.js
    } else {
        Write-Warning "보안 테스트 설정이 없습니다. 기본 보안 테스트를 실행합니다."
        
        # 기본 보안 테스트
        node tests/integration/run-integration-tests.js --security-only
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "보안 테스트 실패"
        exit 1
    }
}

function Run-AllTests {
    Write-Info "전체 테스트 실행 중..."
    
    $testResults = @{
        Unit = $false
        Integration = $false
        E2E = $false
        Performance = $false
        Security = $false
    }

    # 단위 테스트
    try {
        Write-Info "1/5 단위 테스트 실행 중..."
        Run-UnitTests
        $testResults.Unit = $true
        Write-Success "단위 테스트 완료"
    } catch {
        Write-Warning "단위 테스트 실패: $($_.Exception.Message)"
    }

    # 통합 테스트
    try {
        Write-Info "2/5 통합 테스트 실행 중..."
        Run-IntegrationTests
        $testResults.Integration = $true
        Write-Success "통합 테스트 완료"
    } catch {
        Write-Warning "통합 테스트 실패: $($_.Exception.Message)"
    }

    # E2E 테스트
    try {
        Write-Info "3/5 E2E 테스트 실행 중..."
        Run-E2ETests
        $testResults.E2E = $true
        Write-Success "E2E 테스트 완료"
    } catch {
        Write-Warning "E2E 테스트 실패: $($_.Exception.Message)"
    }

    # 성능 테스트
    try {
        Write-Info "4/5 성능 테스트 실행 중..."
        Run-PerformanceTests
        $testResults.Performance = $true
        Write-Success "성능 테스트 완료"
    } catch {
        Write-Warning "성능 테스트 실패: $($_.Exception.Message)"
    }

    # 보안 테스트
    try {
        Write-Info "5/5 보안 테스트 실행 중..."
        Run-SecurityTests
        $testResults.Security = $true
        Write-Success "보안 테스트 완료"
    } catch {
        Write-Warning "보안 테스트 실패: $($_.Exception.Message)"
    }

    # 결과 요약
    Write-Host ""
    Write-Info "=== 테스트 결과 요약 ==="
    foreach ($test in $testResults.GetEnumerator()) {
        $status = if ($test.Value) { "✅ 통과" } else { "❌ 실패" }
        Write-Host "$($test.Key): $status"
    }

    $passedCount = ($testResults.Values | Where-Object { $_ -eq $true }).Count
    $totalCount = $testResults.Count
    Write-Host "전체: $passedCount/$totalCount 통과"

    if ($passedCount -eq $totalCount) {
        Write-Success "🎉 모든 테스트가 통과했습니다!"
    } else {
        Write-Warning "⚠️ 일부 테스트가 실패했습니다."
    }
}
