# MVS 3.0 백업 스크립트

param(
    [string]$BackupPath = "backups",
    [string]$Namespace = "mvs-system",
    [switch]$Database,
    [switch]$Config,
    [switch]$All,
    [string]$RetentionDays = "30"
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

# 백업 디렉토리 생성
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = "$BackupPath/mvs-backup-$Timestamp"

Write-Info "MVS 3.0 백업 시작 - 타임스탬프: $Timestamp"

try {
    # 백업 디렉토리 생성
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force
        Write-Success "백업 디렉토리 생성: $BackupDir"
    }

    # 1. 데이터베이스 백업
    if ($Database -or $All) {
        Write-Info "데이터베이스 백업 중..."
        
        # PostgreSQL 백업
        $dbBackupFile = "$BackupDir/postgres-backup-$Timestamp.sql"
        kubectl exec -n $Namespace deployment/postgres -- pg_dump -U mvs_user -d mvs_db > $dbBackupFile
        
        if (Test-Path $dbBackupFile) {
            Write-Success "PostgreSQL 백업 완료: $dbBackupFile"
        } else {
            Write-Error "PostgreSQL 백업 실패"
        }

        # Redis 백업
        $redisBackupFile = "$BackupDir/redis-backup-$Timestamp.rdb"
        kubectl exec -n $Namespace deployment/redis -- redis-cli BGSAVE
        Start-Sleep -Seconds 5
        kubectl cp "$Namespace/$(kubectl get pods -n $Namespace -l app=redis -o jsonpath='{.items[0].metadata.name}'):/data/dump.rdb" $redisBackupFile
        
        if (Test-Path $redisBackupFile) {
            Write-Success "Redis 백업 완료: $redisBackupFile"
        } else {
            Write-Warning "Redis 백업 실패 (선택사항)"
        }
    }

    # 2. Kubernetes 설정 백업
    if ($Config -or $All) {
        Write-Info "Kubernetes 설정 백업 중..."
        
        $k8sBackupDir = "$BackupDir/k8s-config"
        New-Item -ItemType Directory -Path $k8sBackupDir -Force

        # 네임스페이스 내 모든 리소스 백업
        kubectl get all -n $Namespace -o yaml > "$k8sBackupDir/all-resources.yaml"
        kubectl get configmaps -n $Namespace -o yaml > "$k8sBackupDir/configmaps.yaml"
        kubectl get secrets -n $Namespace -o yaml > "$k8sBackupDir/secrets.yaml"
        kubectl get pvc -n $Namespace -o yaml > "$k8sBackupDir/persistent-volume-claims.yaml"
        kubectl get ingress -n $Namespace -o yaml > "$k8sBackupDir/ingress.yaml"

        Write-Success "Kubernetes 설정 백업 완료: $k8sBackupDir"
    }

    # 3. 애플리케이션 로그 백업
    if ($All) {
        Write-Info "애플리케이션 로그 백업 중..."
        
        $logsBackupDir = "$BackupDir/logs"
        New-Item -ItemType Directory -Path $logsBackupDir -Force

        # 백엔드 로그
        kubectl logs -n $Namespace -l app=mvs-backend --tail=1000 > "$logsBackupDir/backend-logs-$Timestamp.log"
        
        # 프론트엔드 로그
        kubectl logs -n $Namespace -l app=mvs-frontend --tail=1000 > "$logsBackupDir/frontend-logs-$Timestamp.log"

        Write-Success "애플리케이션 로그 백업 완료: $logsBackupDir"
    }

    # 4. 백업 메타데이터 생성
    $metadata = @{
        timestamp = $Timestamp
        namespace = $Namespace
        backup_type = if ($All) { "full" } elseif ($Database) { "database" } elseif ($Config) { "config" } else { "unknown" }
        retention_days = $RetentionDays
        files = @()
    }

    # 백업된 파일 목록
    $backupFiles = Get-ChildItem -Path $BackupDir -Recurse -File
    foreach ($file in $backupFiles) {
        $metadata.files += @{
            name = $file.Name
            path = $file.FullName
            size = $file.Length
            created = $file.CreationTime
        }
    }

    $metadata | ConvertTo-Json -Depth 3 | Out-File -FilePath "$BackupDir/backup-metadata.json" -Encoding UTF8

    # 5. 압축
    Write-Info "백업 압축 중..."
    $zipFile = "$BackupPath/mvs-backup-$Timestamp.zip"
    Compress-Archive -Path $BackupDir -DestinationPath $zipFile -Force
    
    if (Test-Path $zipFile) {
        Write-Success "백업 압축 완료: $zipFile"
        Remove-Item -Path $BackupDir -Recurse -Force
    }

    # 6. 오래된 백업 정리
    Write-Info "오래된 백업 정리 중..."
    $cutoffDate = (Get-Date).AddDays(-[int]$RetentionDays)
    $oldBackups = Get-ChildItem -Path $BackupPath -Filter "mvs-backup-*.zip" | Where-Object { $_.CreationTime -lt $cutoffDate }
    
    foreach ($backup in $oldBackups) {
        Remove-Item -Path $backup.FullName -Force
        Write-Info "오래된 백업 삭제: $($backup.Name)"
    }

    Write-Success "MVS 3.0 백업 완료!"
    Write-Host ""
    Write-Info "백업 정보:"
    Write-Host "백업 파일: $zipFile"
    Write-Host "백업 크기: $((Get-Item $zipFile).Length / 1MB) MB"
    Write-Host "보관 기간: $RetentionDays 일"

}
catch {
    Write-Error "백업 중 오류 발생: $($_.Exception.Message)"
    exit 1
}
