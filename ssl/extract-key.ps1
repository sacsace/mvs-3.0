# MVS 3.0 개인키 추출 스크립트
Write-Host "MVS 3.0 개인키 추출 중..." -ForegroundColor Green

try {
    # PFX 파일에서 개인키 추출
    $pfxPath = (Resolve-Path "cert.pfx").Path
    $password = "mvs123"
    
    Write-Host "PFX 파일 경로: $pfxPath" -ForegroundColor Yellow
    
    # PFX 파일 로드
    $pfxCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $pfxCert.Import($pfxPath, $password, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)
    
    Write-Host "PFX 파일 로드 완료" -ForegroundColor Green
    
    # 개인키 추출
    $privateKey = $pfxCert.PrivateKey
    if ($privateKey) {
        Write-Host "개인키 발견" -ForegroundColor Green
        
        # RSA 개인키로 변환
        $rsa = [System.Security.Cryptography.RSA]$privateKey
        if ($rsa) {
            Write-Host "RSA 개인키 변환 완료" -ForegroundColor Green
            
            # PKCS#8 형식으로 내보내기 시도
            try {
                $keyBytes = $rsa.ExportPkcs8PrivateKey()
                $keyBase64 = [System.Convert]::ToBase64String($keyBytes)
                
                $keyPem = "-----BEGIN PRIVATE KEY-----`n"
                for ($i = 0; $i -lt $keyBase64.Length; $i += 64) {
                    $line = $keyBase64.Substring($i, [Math]::Min(64, $keyBase64.Length - $i))
                    $keyPem += $line + "`n"
                }
                $keyPem += "-----END PRIVATE KEY-----"
                
                $keyPem | Out-File -FilePath "key.pem" -Encoding ASCII -NoNewline
                Write-Host "key.pem 생성 완료 (PKCS#8)" -ForegroundColor Green
            } catch {
                Write-Host "PKCS#8 실패, RSA 형식으로 시도..." -ForegroundColor Yellow
                
                # RSA 형식으로 내보내기
                $keyBytes = $rsa.ExportRSAPrivateKey()
                $keyBase64 = [System.Convert]::ToBase64String($keyBytes)
                
                $keyPem = "-----BEGIN RSA PRIVATE KEY-----`n"
                for ($i = 0; $i -lt $keyBase64.Length; $i += 64) {
                    $line = $keyBase64.Substring($i, [Math]::Min(64, $keyBase64.Length - $i))
                    $keyPem += $line + "`n"
                }
                $keyPem += "-----END RSA PRIVATE KEY-----"
                
                $keyPem | Out-File -FilePath "key.pem" -Encoding ASCII -NoNewline
                Write-Host "key.pem 생성 완료 (RSA)" -ForegroundColor Green
            }
        } else {
            Write-Host "RSA 개인키로 변환 실패" -ForegroundColor Red
        }
    } else {
        Write-Host "개인키를 찾을 수 없습니다" -ForegroundColor Red
    }
    
} catch {
    Write-Host "오류 발생: $($_.Exception.Message)" -ForegroundColor Red
}
