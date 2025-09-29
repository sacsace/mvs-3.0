# MVS 3.0 간단한 개인키 생성 스크립트
Write-Host "MVS 3.0 간단한 개인키 생성 중..." -ForegroundColor Green

try {
    # RSA 키 쌍 생성 (레거시 방법)
    $rsa = New-Object System.Security.Cryptography.RSACryptoServiceProvider(2048)
    
    Write-Host "RSA 키 쌍 생성 완료" -ForegroundColor Green
    
    # 개인키를 XML 형식으로 내보내기
    $privateKeyXml = $rsa.ToXmlString($true)
    
    # XML을 Base64로 변환
    $privateKeyBytes = [System.Text.Encoding]::UTF8.GetBytes($privateKeyXml)
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
    $publicKeyXml = $rsa.ToXmlString($false)
    $publicKeyBytes = [System.Text.Encoding]::UTF8.GetBytes($publicKeyXml)
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
    
    Write-Host "`nSSL 개인키 생성이 완료되었습니다!" -ForegroundColor Yellow
    Write-Host "생성된 파일:" -ForegroundColor Cyan
    Write-Host "- key.pem (개인키)" -ForegroundColor White
    Write-Host "- public.pem (공개키)" -ForegroundColor White
    
} catch {
    Write-Host "오류 발생: $($_.Exception.Message)" -ForegroundColor Red
}

