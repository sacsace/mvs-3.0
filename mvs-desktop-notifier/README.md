# MVS Desktop Notifier (v2.1)

Windows 트레이 알림 프로그램입니다. 브라우저를 켜지 않아도 Toast/트레이로 MVS 알림을 받습니다.

## 특징
- **Windows 버전 호환**: Win10/11 ToastGeneric → Win8 ToastText02 → Win7 풍선 알림
- TLS 1.2 강제, PNG/BMP 하이브리드 아이콘, 제거 시 WMI/CIM 폴백
- **웹과 별도 로그인 세션**, 토큰 **DPAPI** 보호 + 자동 갱신
- 한/영 UI, 마지막 알림 바로가기, 시작 시 실행 옵션
- **Setup.bat 설치 프로그램** + **Apps & Features 제거**

## 지원 OS
- Windows 7 SP1 이상 (PowerShell 3.0+)
- Windows 10 / 11 권장 (알림 센터 Toast)

## 설치
1. `Setup.bat` 실행  
2. API Base URL 예: `https://your-host/api`  
3. MVS 계정으로 로그인  

## 제거
- Windows 설정 → 앱 → **MVS Notifier** → 제거  
- 또는 `Uninstall.bat`

## 웹 다운로드
MVS 「알람」→「알림 프로그램」에서 ZIP을 받을 수 있습니다.

## 패키징
```powershell
powershell -ExecutionPolicy Bypass -File .\build-package.ps1
```
