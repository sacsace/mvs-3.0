# MVS 3.0 올바른 개인키 생성 스크립트
Write-Host "올바른 개인키 생성 중..." -ForegroundColor Green

try {
    # 기존 인증서 삭제
    Get-ChildItem -Path "cert:\CurrentUser\My" | Where-Object {$_.Subject -like "*localhost*"} | Remove-Item -Force
    
    # 새로운 자체 서명 인증서 생성 (개인키 포함)
    $cert = New-SelfSignedCertificate `
        -DnsName "localhost", "127.0.0.1" `
        -CertStoreLocation "cert:\CurrentUser\My" `
        -KeyLength 2048 `
        -KeyAlgorithm RSA `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddDays(365) `
        -Subject "CN=localhost, O=MVS, C=KR" `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

    Write-Host "인증서 생성 완료: $($cert.Thumbprint)" -ForegroundColor Green

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
    
    # 개인키 추출
    $privateKey = $cert.PrivateKey
    if ($privateKey) {
        # RSA 개인키를 PKCS#8 형식으로 내보내기
        $rsa = [System.Security.Cryptography.RSA]$privateKey
        if ($rsa) {
            $keyBytes = $rsa.ExportPkcs8PrivateKey()
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
            Write-Host "RSA 개인키에 접근할 수 없습니다." -ForegroundColor Red
        }
    } else {
        Write-Host "개인키에 접근할 수 없습니다." -ForegroundColor Red
    }
    
    Write-Host "SSL 인증서 생성이 완료되었습니다!" -ForegroundColor Yellow
    Write-Host "이제 HTTPS를 활성화할 수 있습니다." -ForegroundColor Yellow

} catch {
    Write-Host "오류 발생: $($_.Exception.Message)" -ForegroundColor Red
}
