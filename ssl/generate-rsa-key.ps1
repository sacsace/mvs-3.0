# MVS 3.0 RSA 개인키 생성 스크립트 (PowerShell만 사용)
Write-Host "MVS 3.0 RSA 개인키 생성 중..." -ForegroundColor Green

try {
    # RSA 키 쌍 생성
    $rsa = [System.Security.Cryptography.RSA]::Create(2048)
    
    Write-Host "RSA 키 쌍 생성 완료" -ForegroundColor Green
    
    # 개인키를 RSA 형식으로 내보내기
    $privateKeyBytes = $rsa.ExportRSAPrivateKey()
    $privateKeyBase64 = [System.Convert]::ToBase64String($privateKeyBytes)
    
    # PEM 형식으로 변환
    $privateKeyPem = "-----BEGIN RSA PRIVATE KEY-----`n"
    for ($i = 0; $i -lt $privateKeyBase64.Length; $i += 64) {
        $line = $privateKeyBase64.Substring($i, [Math]::Min(64, $privateKeyBase64.Length - $i))
        $privateKeyPem += $line + "`n"
    }
    $privateKeyPem += "-----END RSA PRIVATE KEY-----"
    
    # key.pem 파일로 저장
    $privateKeyPem | Out-File -FilePath "key.pem" -Encoding ASCII -NoNewline
    Write-Host "key.pem 생성 완료" -ForegroundColor Green
    
    # 공개키 추출
    $publicKeyBytes = $rsa.ExportSubjectPublicKeyInfo()
    $publicKeyBase64 = [System.Convert]::ToBase64String($publicKeyBytes)
    
    # PEM 형식으로 변환
    $publicKeyPem = "-----BEGIN PUBLIC KEY-----`n"
    for ($i = 0; $i -lt $publicKeyBase64.Length; $i += 64) {
        $line = $publicKeyBase64.Substring($i, [Math]::Min(64, $publicKeyBase64.Length - $i))
        $publicKeyPem += $line + "`n"
    }
    $publicKeyPem += "-----END PUBLIC KEY-----"
    
    # public.pem 파일로 저장
    $publicKeyPem | Out-File -FilePath "public.pem" -Encoding ASCII -NoNewline
    Write-Host "public.pem 생성 완료" -ForegroundColor Green
    
    # 자체 서명 인증서 생성
    Write-Host "자체 서명 인증서 생성 중..." -ForegroundColor Yellow
    
    # 인증서 생성 요청
    $req = New-Object System.Security.Cryptography.X509Certificates.CertificateRequest("CN=localhost", $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
    
    # SAN (Subject Alternative Name) 추가
    $sanBuilder = New-Object System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder
    $sanBuilder.AddDnsName("localhost")
    $sanBuilder.AddDnsName("127.0.0.1")
    $sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse("127.0.0.1"))
    $sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse("::1"))
    
    $req.CertificateExtensions.Add($sanBuilder.Build())
    
    # 키 사용 확장 추가
    $keyUsage = New-Object System.Security.Cryptography.X509Certificates.X509KeyUsageExtension([System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment, $false)
    $req.CertificateExtensions.Add($keyUsage)
    
    # EKU (Enhanced Key Usage) 확장 추가
    $eku = New-Object System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension([System.Security.Cryptography.Oid]"1.3.6.1.5.5.7.3.1", $false)
    $req.CertificateExtensions.Add($eku)
    
    # 자체 서명 인증서 생성
    $cert = $req.CreateSelfSigned([System.DateTimeOffset]::Now, [System.DateTimeOffset]::Now.AddDays(365))
    
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
    
    # PFX 파일로도 내보내기
    $pfxPassword = ConvertTo-SecureString -String "mvs123" -Force -AsPlainText
    $pfxBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pkcs12, $pfxPassword)
    [System.IO.File]::WriteAllBytes("cert.pfx", $pfxBytes)
    Write-Host "cert.pfx 생성 완료" -ForegroundColor Green
    
    Write-Host "`nSSL 인증서 및 개인키 생성이 완료되었습니다!" -ForegroundColor Yellow
    Write-Host "생성된 파일:" -ForegroundColor Cyan
    Write-Host "- cert.pem (인증서)" -ForegroundColor White
    Write-Host "- key.pem (개인키)" -ForegroundColor White
    Write-Host "- public.pem (공개키)" -ForegroundColor White
    Write-Host "- cert.pfx (PFX 형식)" -ForegroundColor White
    Write-Host "`n이제 HTTPS를 활성화할 수 있습니다!" -ForegroundColor Green
    
} catch {
    Write-Host "오류 발생: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "스택 트레이스: $($_.Exception.StackTrace)" -ForegroundColor Red
}
