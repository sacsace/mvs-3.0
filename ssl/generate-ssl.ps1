# MVS 3.0 SSL 인증서 및 개인키 생성 스크립트
Write-Host "MVS 3.0 SSL 인증서 및 개인키 생성 중..." -ForegroundColor Green

try {
    # 기존 인증서 삭제
    Get-ChildItem -Path "cert:\CurrentUser\My" | Where-Object {$_.Subject -like "*localhost*"} | Remove-Item -Force -ErrorAction SilentlyContinue
    
    # 새로운 자체 서명 인증서 생성
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
    
    # 개인키를 PKCS#12 형식으로 내보내기
    $password = ConvertTo-SecureString -String "mvs123" -Force -AsPlainText
    $pfxPath = "temp.pfx"
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password
    
    # OpenSSL을 사용하여 개인키 추출 (Windows에서 OpenSSL이 있는 경우)
    try {
        # OpenSSL이 있는지 확인
        $opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
        if ($opensslPath) {
            # PFX에서 개인키 추출
            $keyPassword = "mvs123"
            $keyPassword | & openssl pkcs12 -in $pfxPath -nocerts -out key.pem -nodes -passin stdin
            Write-Host "key.pem 생성 완료 (OpenSSL 사용)" -ForegroundColor Green
        } else {
            throw "OpenSSL not found"
        }
    } catch {
        # OpenSSL이 없는 경우 PowerShell로 개인키 추출
        Write-Host "OpenSSL을 사용할 수 없습니다. PowerShell로 개인키를 추출합니다..." -ForegroundColor Yellow
        
        # PFX 파일에서 개인키 추출
        $pfxCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
        $pfxCert.Import((Resolve-Path $pfxPath).Path, "mvs123", [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)
        
        # RSA 개인키 추출
        $rsa = $pfxCert.PrivateKey
        if ($rsa) {
            $keyBytes = $rsa.ExportRSAPrivateKey()
            $keyBase64 = [System.Convert]::ToBase64String($keyBytes)
            
            $keyPem = "-----BEGIN RSA PRIVATE KEY-----`n"
            for ($i = 0; $i -lt $keyBase64.Length; $i += 64) {
                $line = $keyBase64.Substring($i, [Math]::Min(64, $keyBase64.Length - $i))
                $keyPem += $line + "`n"
            }
            $keyPem += "-----END RSA PRIVATE KEY-----"
            
            $keyPem | Out-File -FilePath "key.pem" -Encoding ASCII -NoNewline
            Write-Host "key.pem 생성 완료 (PowerShell 사용)" -ForegroundColor Green
        } else {
            Write-Host "개인키에 접근할 수 없습니다." -ForegroundColor Red
        }
    }
    
    # 임시 파일 삭제
    Remove-Item $pfxPath -ErrorAction SilentlyContinue
    
    Write-Host "SSL 인증서 생성이 완료되었습니다!" -ForegroundColor Yellow
    Write-Host "이제 HTTPS를 활성화할 수 있습니다." -ForegroundColor Yellow

} catch {
    Write-Host "오류 발생: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "관리자 권한으로 실행해보세요." -ForegroundColor Yellow
}
