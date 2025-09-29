# MVS 3.0 OpenSSL을 사용한 개인키 생성 스크립트
Write-Host "MVS 3.0 OpenSSL을 사용한 개인키 생성 중..." -ForegroundColor Green

try {
    # OpenSSL이 설치되어 있는지 확인
    $opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
    if (-not $opensslPath) {
        Write-Host "OpenSSL이 설치되어 있지 않습니다." -ForegroundColor Red
        Write-Host "OpenSSL을 설치하거나 다른 방법을 사용하세요." -ForegroundColor Yellow
        
        # OpenSSL 다운로드 안내
        Write-Host "`nOpenSSL 설치 방법:" -ForegroundColor Cyan
        Write-Host "1. https://slproweb.com/products/Win32OpenSSL.html 에서 다운로드" -ForegroundColor White
        Write-Host "2. 또는 Chocolatey 사용: choco install openssl" -ForegroundColor White
        Write-Host "3. 또는 Scoop 사용: scoop install openssl" -ForegroundColor White
        
        return
    }
    
    Write-Host "OpenSSL 발견: $($opensslPath.Source)" -ForegroundColor Green
    
    # 개인키 생성
    Write-Host "개인키 생성 중..." -ForegroundColor Yellow
    & openssl genrsa -out key.pem 2048
    
    if (Test-Path "key.pem") {
        Write-Host "key.pem 생성 완료" -ForegroundColor Green
        
        # 인증서 요청 생성
        Write-Host "인증서 요청 생성 중..." -ForegroundColor Yellow
        & openssl req -new -key key.pem -out cert.csr -subj "/C=KR/ST=Seoul/L=Seoul/O=MVS/OU=IT/CN=localhost"
        
        # 자체 서명 인증서 생성
        Write-Host "자체 서명 인증서 생성 중..." -ForegroundColor Yellow
        & openssl x509 -req -days 365 -in cert.csr -signkey key.pem -out cert.pem
        
        if (Test-Path "cert.pem") {
            Write-Host "cert.pem 생성 완료" -ForegroundColor Green
            
            # 임시 파일 삭제
            Remove-Item "cert.csr" -ErrorAction SilentlyContinue
            
            Write-Host "SSL 인증서 및 개인키 생성이 완료되었습니다!" -ForegroundColor Yellow
            Write-Host "이제 HTTPS를 활성화할 수 있습니다." -ForegroundColor Yellow
        } else {
            Write-Host "인증서 생성 실패" -ForegroundColor Red
        }
    } else {
        Write-Host "개인키 생성 실패" -ForegroundColor Red
    }
    
} catch {
    Write-Host "오류 발생: $($_.Exception.Message)" -ForegroundColor Red
}

