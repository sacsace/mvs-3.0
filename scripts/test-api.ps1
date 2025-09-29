# MVS 3.0 API 테스트 스크립트

Write-Host "🚀 MVS 3.0 API 테스트 시작" -ForegroundColor Green

# 1. 헬스체크 테스트
Write-Host "`n1. 헬스체크 테스트" -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method GET
    Write-Host "✅ 헬스체크 성공: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ 헬스체크 실패: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. API 헬스체크 테스트
Write-Host "`n2. API 헬스체크 테스트" -ForegroundColor Yellow
try {
    $apiHealthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
    Write-Host "✅ API 헬스체크 성공: $($apiHealthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API 헬스체크 실패: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. 메뉴 API 테스트
Write-Host "`n3. 메뉴 API 테스트" -ForegroundColor Yellow
try {
    $menuResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/menus" -Method GET
    Write-Host "✅ 메뉴 API 성공: $($menuResponse.data.Count)개 메뉴" -ForegroundColor Green
} catch {
    Write-Host "❌ 메뉴 API 실패: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 API 테스트 완료!" -ForegroundColor Green
