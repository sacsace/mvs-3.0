# Railway 커스텀 도메인 설정 가이드

## 🌐 www.mvsystem.in 도메인 설정

### 1. Railway 대시보드에서 설정
1. Railway 프로젝트 → Settings → Domains
2. "Add Domain" 클릭
3. `www.mvsystem.in` 입력
4. Railway가 제공하는 DNS 레코드 확인

### 2. DNS 설정 (도메인 제공업체에서)
Railway가 제공하는 DNS 레코드를 도메인 제공업체에 추가:

```
Type: CNAME
Name: www
Value: [Railway에서 제공하는 값]
TTL: 300 (또는 기본값)
```

### 3. SSL 인증서 자동 발급
- Railway가 자동으로 Let's Encrypt SSL 인증서 발급
- 도메인 연결 완료 후 몇 분 내에 HTTPS 활성화
- 인증서 갱신도 자동으로 처리

## 🔧 코드 수정 사항

### 1. 환경변수 설정
```bash
# Railway 환경변수
FRONTEND_URL=https://www.mvsystem.in
BACKEND_URL=https://api.mvsystem.in
CORS_ORIGIN=https://www.mvsystem.in
```

### 2. 프론트엔드 설정 수정
```javascript
// API URL을 프로덕션 도메인으로 변경
REACT_APP_API_URL=https://api.mvsystem.in/api
REACT_APP_WS_URL=wss://api.mvsystem.in
```

### 3. 백엔드 CORS 설정
```javascript
// CORS 설정을 프로덕션 도메인으로 변경
CORS_ORIGIN=https://www.mvsystem.in
```

## ⚠️ 주의사항

1. **SSL 인증서 수동 생성 불필요**: Railway가 자동 처리
2. **도메인 연결 시간**: DNS 전파에 24-48시간 소요 가능
3. **서브도메인 고려**: API는 `api.mvsystem.in`으로 분리 권장
4. **HTTPS 강제**: HTTP 요청을 HTTPS로 리다이렉트 설정

## 🚀 배포 순서

1. Railway에 백엔드 배포
2. Railway에 프론트엔드 배포  
3. 커스텀 도메인 연결
4. DNS 설정 확인
5. SSL 인증서 발급 확인
6. 전체 애플리케이션 테스트
