# MVS 3.0 헬스체크 스크립트

param(
    [string]$Environment = "development",
    [string]$Namespace = "mvs-system",
    [switch]$Detailed,
    [switch]$Fix
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

$HealthStatus = @{
    Overall = "Unknown"
    Services = @{}
    Issues = @()
    Recommendations = @()
}

Write-Info "MVS 3.0 헬스체크 시작 - 환경: $Environment"

try {
    # 1. Kubernetes 클러스터 상태 확인
    Write-Info "Kubernetes 클러스터 상태 확인 중..."
    $clusterInfo = kubectl cluster-info 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Kubernetes 클러스터 정상"
        $HealthStatus.Services["Kubernetes"] = "Healthy"
    } else {
        Write-Error "Kubernetes 클러스터 연결 실패"
        $HealthStatus.Services["Kubernetes"] = "Unhealthy"
        $HealthStatus.Issues += "Kubernetes 클러스터에 연결할 수 없습니다."
    }

    # 2. 네임스페이스 확인
    Write-Info "네임스페이스 상태 확인 중..."
    $namespaceExists = kubectl get namespace $Namespace 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "네임스페이스 '$Namespace' 존재"
    } else {
        Write-Error "네임스페이스 '$Namespace'가 존재하지 않습니다."
        $HealthStatus.Issues += "네임스페이스 '$Namespace'가 존재하지 않습니다."
    }

    # 3. Pod 상태 확인
    Write-Info "Pod 상태 확인 중..."
    $pods = kubectl get pods -n $Namespace -o json | ConvertFrom-Json
    $totalPods = $pods.items.Count
    $runningPods = ($pods.items | Where-Object { $_.status.phase -eq "Running" }).Count
    $failedPods = ($pods.items | Where-Object { $_.status.phase -eq "Failed" }).Count
    $pendingPods = ($pods.items | Where-Object { $_.status.phase -eq "Pending" }).Count

    Write-Info "Pod 상태: 실행 중 $runningPods/$totalPods, 실패 $failedPods, 대기 중 $pendingPods"

    if ($runningPods -eq $totalPods) {
        Write-Success "모든 Pod가 정상 실행 중"
        $HealthStatus.Services["Pods"] = "Healthy"
    } else {
        Write-Warning "일부 Pod가 비정상 상태"
        $HealthStatus.Services["Pods"] = "Degraded"
        $HealthStatus.Issues += "$failedPods 개의 Pod가 실패 상태입니다."
        $HealthStatus.Issues += "$pendingPods 개의 Pod가 대기 상태입니다."
    }

    # 4. 서비스 상태 확인
    Write-Info "서비스 상태 확인 중..."
    $services = kubectl get services -n $Namespace -o json | ConvertFrom-Json
    foreach ($service in $services.items) {
        $serviceName = $service.metadata.name
        $endpoints = kubectl get endpoints -n $Namespace $serviceName -o json | ConvertFrom-Json
        $endpointCount = $endpoints.subsets[0].addresses.Count

        if ($endpointCount -gt 0) {
            Write-Success "서비스 '$serviceName' 정상 (엔드포인트: $endpointCount)"
            $HealthStatus.Services[$serviceName] = "Healthy"
        } else {
            Write-Warning "서비스 '$serviceName' 엔드포인트 없음"
            $HealthStatus.Services[$serviceName] = "Unhealthy"
            $HealthStatus.Issues += "서비스 '$serviceName'에 엔드포인트가 없습니다."
        }
    }

    # 5. 애플리케이션 헬스체크
    Write-Info "애플리케이션 헬스체크 중..."
    
    # 백엔드 헬스체크
    try {
        $backendHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 10
        Write-Success "백엔드 서비스 정상"
        $HealthStatus.Services["Backend"] = "Healthy"
    } catch {
        Write-Warning "백엔드 서비스 헬스체크 실패: $($_.Exception.Message)"
        $HealthStatus.Services["Backend"] = "Unhealthy"
        $HealthStatus.Issues += "백엔드 서비스가 응답하지 않습니다."
    }

    # 프론트엔드 헬스체크
    try {
        $frontendHealth = Invoke-RestMethod -Uri "http://localhost:3000" -Method Get -TimeoutSec 10
        Write-Success "프론트엔드 서비스 정상"
        $HealthStatus.Services["Frontend"] = "Healthy"
    } catch {
        Write-Warning "프론트엔드 서비스 헬스체크 실패: $($_.Exception.Message)"
        $HealthStatus.Services["Frontend"] = "Unhealthy"
        $HealthStatus.Issues += "프론트엔드 서비스가 응답하지 않습니다."
    }

    # 6. 데이터베이스 연결 확인
    Write-Info "데이터베이스 연결 확인 중..."
    try {
        $dbPod = kubectl get pods -n $Namespace -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>$null
        if ($dbPod) {
            $dbStatus = kubectl exec -n $Namespace $dbPod -- pg_isready -U mvs_user -d mvs_db 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "PostgreSQL 데이터베이스 정상"
                $HealthStatus.Services["Database"] = "Healthy"
            } else {
                Write-Warning "PostgreSQL 데이터베이스 연결 실패"
                $HealthStatus.Services["Database"] = "Unhealthy"
                $HealthStatus.Issues += "PostgreSQL 데이터베이스에 연결할 수 없습니다."
            }
        } else {
            Write-Warning "PostgreSQL Pod를 찾을 수 없습니다."
            $HealthStatus.Services["Database"] = "Unhealthy"
            $HealthStatus.Issues += "PostgreSQL Pod가 실행되지 않고 있습니다."
        }
    } catch {
        Write-Warning "데이터베이스 상태 확인 실패: $($_.Exception.Message)"
        $HealthStatus.Services["Database"] = "Unknown"
    }

    # 7. 리소스 사용량 확인
    if ($Detailed) {
        Write-Info "리소스 사용량 확인 중..."
        $nodes = kubectl top nodes 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "노드 리소스 사용량:"
            Write-Host $nodes
        }

        $pods = kubectl top pods -n $Namespace 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Pod 리소스 사용량:"
            Write-Host $pods
        }
    }

    # 8. 전체 상태 평가
    $unhealthyServices = ($HealthStatus.Services.GetEnumerator() | Where-Object { $_.Value -ne "Healthy" }).Count
    $totalServices = $HealthStatus.Services.Count

    if ($unhealthyServices -eq 0) {
        $HealthStatus.Overall = "Healthy"
        Write-Success "모든 서비스가 정상 상태입니다!"
    } elseif ($unhealthyServices -lt $totalServices / 2) {
        $HealthStatus.Overall = "Degraded"
        Write-Warning "일부 서비스에 문제가 있습니다."
    } else {
        $HealthStatus.Overall = "Unhealthy"
        Write-Error "대부분의 서비스에 문제가 있습니다."
    }

    # 9. 권장사항 생성
    if ($HealthStatus.Issues.Count -gt 0) {
        Write-Info "권장사항:"
        foreach ($issue in $HealthStatus.Issues) {
            Write-Host "  - $issue" -ForegroundColor $Yellow
        }

        if ($Fix) {
            Write-Info "자동 복구 시도 중..."
            # 여기에 자동 복구 로직 추가
        }
    }

    # 10. 상세 보고서 출력
    Write-Host ""
    Write-Info "=== 헬스체크 보고서 ==="
    Write-Host "전체 상태: $($HealthStatus.Overall)"
    Write-Host "서비스 수: $totalServices"
    Write-Host "정상 서비스: $($totalServices - $unhealthyServices)"
    Write-Host "문제 서비스: $unhealthyServices"
    Write-Host "이슈 수: $($HealthStatus.Issues.Count)"

    if ($Detailed) {
        Write-Host ""
        Write-Info "서비스별 상태:"
        foreach ($service in $HealthStatus.Services.GetEnumerator()) {
            $color = if ($service.Value -eq "Healthy") { $Green } elseif ($service.Value -eq "Degraded") { $Yellow } else { $Red }
            Write-Host "  $($service.Key): $($service.Value)" -ForegroundColor $color
        }
    }

    # 11. 종료 코드 설정
    if ($HealthStatus.Overall -eq "Healthy") {
        exit 0
    } elseif ($HealthStatus.Overall -eq "Degraded") {
        exit 1
    } else {
        exit 2
    }

}
catch {
    Write-Error "헬스체크 중 오류 발생: $($_.Exception.Message)"
    exit 3
}
