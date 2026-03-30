# MVS 서버 중지 스크립트
# 실행 중인 서버 프로세스를 안전하게 종료

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$All,
    [switch]$Help
)

# 색상 출력 함수
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 도움말 표시
if ($Help) {
    Write-ColorOutput "`nMVS 서버 중지 스크립트 사용법" "Cyan"
    Write-ColorOutput ("=" * 60) "Gray"
    Write-ColorOutput "`n사용법:" "Yellow"
    Write-ColorOutput "  .\scripts\server\stop-server.ps1            # 모든 서버 중지"
    Write-ColorOutput "  .\scripts\server\stop-server.ps1 -BackendOnly  # 백엔드만 중지"
    Write-ColorOutput "  .\scripts\server\stop-server.ps1 -FrontendOnly # 프론트엔드만 중지"
    Write-ColorOutput "  .\scripts\server\stop-server.ps1 -All         # 모든 Node.js 프로세스 중지"
    Write-ColorOutput ("`n" + "=" * 60) "Gray"
    exit 0
}

Write-ColorOutput "`n🛑 MVS 서버 중지 스크립트" "Cyan"
Write-ColorOutput ("=" * 60) "Gray"

# 포트에서 프로세스 종료 함수
function Stop-ProcessOnPort {
    param(
        [int]$Port,
        [string]$ServerName
    )
    
    $pids = netstat -ano | Select-String ":$Port.*LISTENING" | ForEach-Object { 
        ($_.Line -split '\s+')[-1] 
    } | Select-Object -Unique | Where-Object { $_ -match '^\d+$' }
    
    if ($pids) {
        Write-ColorOutput "  🔄 포트 $Port ($ServerName)에서 실행 중인 프로세스 종료 중..." "Yellow"
        foreach ($pid in $pids) {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-ColorOutput "    ✓ 프로세스 $pid ($($process.ProcessName)) 종료됨" "Green"
                }
            } catch {
                Write-ColorOutput "    ✗ 프로세스 $pid 종료 실패: $($_.Exception.Message)" "Red"
            }
        }
        Start-Sleep -Milliseconds 500
        return $true
    } else {
        Write-ColorOutput "  ✓ 포트 $Port ($ServerName)에 실행 중인 프로세스 없음" "Green"
        return $false
    }
}

# 모든 Node.js 프로세스 종료
function Stop-AllNodeProcesses {
    Write-ColorOutput "`n🔄 모든 Node.js 프로세스 종료 중..." "Yellow"
    
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        foreach ($process in $nodeProcesses) {
            try {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Write-ColorOutput "  ✓ Node.js 프로세스 $($process.Id) 종료됨" "Green"
            } catch {
                Write-ColorOutput "  ✗ Node.js 프로세스 $($process.Id) 종료 실패: $($_.Exception.Message)" "Red"
            }
        }
        Start-Sleep -Seconds 1
        Write-ColorOutput "  ✓ 모든 Node.js 프로세스 종료 완료" "Green"
    } else {
        Write-ColorOutput "  ✓ 실행 중인 Node.js 프로세스 없음" "Green"
    }
}

# 메인 실행 로직
try {
    $stopped = $false
    
    if ($All) {
        Stop-AllNodeProcesses
        $stopped = $true
    } else {
        if ($BackendOnly) {
            $stopped = Stop-ProcessOnPort -Port 5000 -ServerName "Backend"
        } elseif ($FrontendOnly) {
            $stopped = Stop-ProcessOnPort -Port 3000 -ServerName "Frontend"
        } else {
            $backendStopped = Stop-ProcessOnPort -Port 5000 -ServerName "Backend"
            $frontendStopped = Stop-ProcessOnPort -Port 3000 -ServerName "Frontend"
            $stopped = $backendStopped -or $frontendStopped
        }
    }
    
    Write-ColorOutput ("`n" + "=" * 60) "Gray"
    
    if ($stopped) {
        Write-ColorOutput "`n✅ 서버 중지 완료!" "Green"
    } else {
        Write-ColorOutput "`nℹ️  실행 중인 서버가 없습니다." "Yellow"
    }
    
    Write-ColorOutput ("`n" + "=" * 60) "Gray"
    Write-ColorOutput ""
    
} catch {
    Write-ColorOutput "`n❌ 오류 발생: $($_.Exception.Message)" "Red"
    Write-ColorOutput "스택 트레이스:" "Yellow"
    if ($_.ScriptStackTrace) {
        Write-ColorOutput $_.ScriptStackTrace "Red"
    }
    exit 1
}

