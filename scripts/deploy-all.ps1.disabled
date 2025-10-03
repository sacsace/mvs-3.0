# MVS 3.0 통합 배포 스크립트

param(
    [string]$Environment = "development",
    [string]$Version = "",
    [switch]$Build,
    [switch]$Push,
    [switch]$Monitor,
    [switch]$Backup,
    [switch]$HealthCheck
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

# 환경별 설정
$Environments = @{
    "development" = @{
        Script = ".\scripts\deploy-dev.ps1"
        Namespace = "mvs-system"
        Monitoring = $false
    }
    "staging" = @{
        Script = ".\scripts\deploy.ps1"
        Namespace = "mvs-staging"
        Monitoring = $true
    }
    "production" = @{
        Script = ".\scripts\deploy-prod.ps1"
        Namespace = "mvs-system"
        Monitoring = $true
    }
}

Write-Info "MVS 3.0 통합 배포 시작 - 환경: $Environment"

try {
    # 1. 환경 검증
    if (!$Environments.ContainsKey($Environment)) {
        Write-Error "지원하지 않는 환경입니다: $Environment"
        Write-Info "지원되는 환경: development, staging, production"
        exit 1
    }

    $envConfig = $Environments[$Environment]
    Write-Info "환경 설정: $($envConfig | ConvertTo-Json -Compress)"

    # 2. 사전 배포 백업 (운영 환경)
    if ($Backup -and $Environment -eq "production") {
        Write-Info "사전 배포 백업 실행 중..."
        & .\scripts\backup.ps1 -All -RetentionDays 7
        if ($LASTEXITCODE -ne 0) {
            Write-Error "백업 실패. 배포를 중단합니다."
            exit 1
        }
        Write-Success "백업 완료"
    }

    # 3. 헬스체크 (배포 전)
    if ($HealthCheck) {
        Write-Info "배포 전 헬스체크 실행 중..."
        & .\scripts\health-check.ps1 -Environment $Environment -Detailed
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "헬스체크에서 문제가 발견되었습니다. 계속 진행하시겠습니까? (y/N)"
            $response = Read-Host
            if ($response -ne "y" -and $response -ne "Y") {
                Write-Info "배포가 취소되었습니다."
                exit 0
            }
        }
    }

    # 4. 환경별 배포 실행
    Write-Info "환경별 배포 실행 중..."
    
    $deployArgs = @()
    if ($Build) { $deployArgs += "-Build" }
    if ($Push) { $deployArgs += "-Push" }
    if ($Version) { $deployArgs += "-Version"; $deployArgs += $Version }

    if ($Environment -eq "development") {
        & $envConfig.Script @deployArgs
    } else {
        & $envConfig.Script @deployArgs
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "배포 실패"
        exit 1
    }

    Write-Success "배포 완료"

    # 5. 배포 후 헬스체크
    Write-Info "배포 후 헬스체크 실행 중..."
    Start-Sleep -Seconds 30  # 서비스 시작 대기
    
    & .\scripts\health-check.ps1 -Environment $Environment -Detailed
    if ($LASTEXITCODE -eq 0) {
        Write-Success "모든 서비스가 정상 상태입니다!"
    } else {
        Write-Warning "일부 서비스에 문제가 있습니다. 모니터링을 확인하세요."
    }

    # 6. 모니터링 설정 (선택사항)
    if ($Monitor -and $envConfig.Monitoring) {
        Write-Info "모니터링 설정 중..."
        
        # Prometheus 배포
        kubectl apply -f k8s/monitoring/prometheus-config.yaml
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Prometheus 배포 완료"
        }

        # Grafana 배포
        kubectl apply -f k8s/monitoring/grafana-config.yaml
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Grafana 배포 완료"
        }

        # ELK Stack 배포
        kubectl apply -f k8s/logging/elasticsearch-config.yaml
        kubectl apply -f k8s/logging/kibana-config.yaml
        if ($LASTEXITCODE -eq 0) {
            Write-Success "ELK Stack 배포 완료"
        }

        Write-Info "모니터링 접속 정보:"
        Write-Host "Prometheus: kubectl port-forward -n $($envConfig.Namespace) service/prometheus-service 9090:9090"
        Write-Host "Grafana: kubectl port-forward -n $($envConfig.Namespace) service/grafana-service 3000:3000"
        Write-Host "Kibana: kubectl port-forward -n $($envConfig.Namespace) service/kibana-service 5601:5601"
    }

    # 7. 보안 설정 (운영 환경)
    if ($Environment -eq "production") {
        Write-Info "보안 설정 적용 중..."
        kubectl apply -f k8s/security/network-policies.yaml
        if ($LASTEXITCODE -eq 0) {
            Write-Success "네트워크 정책 적용 완료"
        }
    }

    # 8. 배포 완료 요약
    Write-Success "MVS 3.0 통합 배포 완료!"
    Write-Host ""
    Write-Info "=== 배포 요약 ==="
    Write-Host "환경: $Environment"
    Write-Host "네임스페이스: $($envConfig.Namespace)"
    Write-Host "배포 시간: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "모니터링: $(if ($Monitor) { '활성화' } else { '비활성화' })"
    Write-Host "백업: $(if ($Backup) { '실행됨' } else { '실행 안됨' })"
    Write-Host ""
    Write-Info "유용한 명령어:"
    Write-Host "상태 확인: kubectl get pods -n $($envConfig.Namespace)"
    Write-Host "로그 확인: kubectl logs -n $($envConfig.Namespace) -l app=mvs-backend"
    Write-Host "헬스체크: .\scripts\health-check.ps1 -Environment $Environment"
    Write-Host "백업: .\scripts\backup.ps1 -All"

}
catch {
    Write-Error "통합 배포 중 오류 발생: $($_.Exception.Message)"
    Write-Info "오류 발생 시 다음을 확인하세요:"
    Write-Host "1. Kubernetes 클러스터 연결 상태"
    Write-Host "2. 네임스페이스 존재 여부"
    Write-Host "3. 리소스 사용량"
    Write-Host "4. 서비스 로그"
    exit 1
}
