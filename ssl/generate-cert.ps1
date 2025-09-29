# MVS 3.0 SSL 인증서 생성 스크립트
# 자체 서명 인증서를 생성하여 개발 환경에서 HTTPS 사용

Write-Host "MVS 3.0 SSL 인증서 생성 중..." -ForegroundColor Green

try {
    # 자체 서명 인증서 생성
    $cert = New-SelfSignedCertificate `
        -DnsName "localhost", "127.0.0.1" `
        -CertStoreLocation "cert:\CurrentUser\My" `
        -KeyLength 2048 `
        -KeyAlgorithm RSA `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddDays(365) `
        -Subject "CN=localhost, O=MVS, C=KR"

    Write-Host "인증서 생성 완료: $($cert.Thumbprint)" -ForegroundColor Green

    # PFX 파일로 내보내기
    $password = ConvertTo-SecureString -String "mvs123" -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath "cert.pfx" -Password $password
    
    Write-Host "PFX 파일 생성 완료: cert.pfx" -ForegroundColor Green

    # PEM 형식으로 변환
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certPem = [System.Convert]::ToBase64String($certBytes)
    $certPem = "-----BEGIN CERTIFICATE-----`n" + $certPem + "`n-----END CERTIFICATE-----"
    $certPem | Out-File -FilePath "cert.pem" -Encoding ASCII

    # 개인키 추출
    $keyBytes = $cert.PrivateKey.Export([System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)
    $keyPem = [System.Convert]::ToBase64String($keyBytes)
    $keyPem = "-----BEGIN PRIVATE KEY-----`n" + $keyPem + "`n-----END PRIVATE KEY-----"
    $keyPem | Out-File -FilePath "key.pem" -Encoding ASCII

    Write-Host "PEM 파일 생성 완료: cert.pem, key.pem" -ForegroundColor Green
    Write-Host "SSL 인증서 생성이 완료되었습니다!" -ForegroundColor Yellow
    Write-Host "개발 환경에서 https://localhost 접속이 가능합니다." -ForegroundColor Yellow

} catch {
    Write-Host "인증서 생성 중 오류 발생: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "관리자 권한으로 실행해보세요." -ForegroundColor Yellow
}
