# MVS 3.0 PEM 인증서 생성 스크립트
Write-Host "PEM 인증서 파일 생성 중..." -ForegroundColor Green

try {
    # 최신 localhost 인증서 찾기
    $cert = Get-ChildItem -Path "cert:\CurrentUser\My" | 
            Where-Object {$_.Subject -like "*localhost*"} | 
            Sort-Object NotAfter -Descending | 
            Select-Object -First 1

    if ($cert) {
        Write-Host "인증서 발견: $($cert.Thumbprint)" -ForegroundColor Green
        
        # 인증서를 Base64로 내보내기
        $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
        $certBase64 = [System.Convert]::ToBase64String($certBytes)
        
        # PEM 형식으로 변환
        $certPem = "-----BEGIN CERTIFICATE-----`n"
        for ($i = 0; $i -lt $certBase64.Length; $i += 64) {
            $line = $certBase64.Substring($i, [Math]::Min(64, $certBase64.Length - $i))
            $certPem += $line + "`n"
        }
        $certPem += "-----END CERTIFICATE-----"
        
        # cert.pem 파일로 저장
        $certPem | Out-File -FilePath "cert.pem" -Encoding ASCII -NoNewline
        Write-Host "cert.pem 생성 완료" -ForegroundColor Green
        
        # 개인키 추출 시도
        try {
            $privateKey = $cert.PrivateKey
            if ($privateKey) {
                $keyBytes = $privateKey.Export([System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)
                $keyBase64 = [System.Convert]::ToBase64String($keyBytes)
                
                $keyPem = "-----BEGIN PRIVATE KEY-----`n"
                for ($i = 0; $i -lt $keyBase64.Length; $i += 64) {
                    $line = $keyBase64.Substring($i, [Math]::Min(64, $keyBase64.Length - $i))
                    $keyPem += $line + "`n"
                }
                $keyPem += "-----END PRIVATE KEY-----"
                
                $keyPem | Out-File -FilePath "key.pem" -Encoding ASCII -NoNewline
                Write-Host "key.pem 생성 완료" -ForegroundColor Green
            } else {
                Write-Host "개인키에 접근할 수 없습니다. 관리자 권한이 필요할 수 있습니다." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "개인키 생성 중 오류: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "localhost 인증서를 찾을 수 없습니다." -ForegroundColor Red
    }
    
} catch {
    Write-Host "오류 발생: $($_.Exception.Message)" -ForegroundColor Red
}
