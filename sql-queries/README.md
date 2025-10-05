# MVS 3.0 SQL 쿼리 모음

이 폴더는 MVS 3.0 프로젝트의 모든 SQL 쿼리 파일들을 카테고리별로 정리한 곳입니다.

## 📁 폴더 구조

### 01-database-setup/
데이터베이스 초기 설정 및 테이블 생성 관련 쿼리
- `create-missing-tables.sql` - 누락된 테이블 생성
- `create-complete-menu-system.sql` - 완전한 메뉴 시스템 생성
- `create-menus.sql` - 기본 메뉴 생성
- `create-submenus.sql` - 서브메뉴 생성
- `create-submenus-correct.sql` - 수정된 서브메뉴 생성

### 02-menu-management/
메뉴 관리 및 구조 변경 관련 쿼리
- `add-ai-comm-system-submenus.sql` - AI 커뮤니케이션 시스템 서브메뉴 추가
- `add-submenus-correct.sql` - 수정된 서브메뉴 추가
- `add-submenus-final.sql` - 최종 서브메뉴 추가
- `add-submenus.sql` - 서브메뉴 추가
- `check-ai-comm-system-menus.sql` - AI 커뮤니케이션 시스템 메뉴 확인
- `check-current-menus.sql` - 현재 메뉴 확인
- `check-menu-structure.sql` - 메뉴 구조 확인
- `check-menus.sql` - 메뉴 확인
- `check-submenus.sql` - 서브메뉴 확인
- `complete-menu-with-submenus.sql` - 서브메뉴가 포함된 완전한 메뉴
- `restructure-menus.sql` - 메뉴 구조 재구성
- `update-menu-descriptions.sql` - 메뉴 설명 업데이트
- `verify-new-submenus.sql` - 새 서브메뉴 검증

### 03-user-permissions/
사용자 권한 관리 관련 쿼리
- `add-ai-permissions.sql` - AI 권한 추가
- `create-user-permissions.sql` - 사용자 권한 생성
- `init-user-permissions.sql` - 사용자 권한 초기화

### 04-optimization/
데이터베이스 최적화 관련 쿼리
- `database-optimization.sql` - 데이터베이스 최적화
- `database-optimization-fixed.sql` - 수정된 데이터베이스 최적화

### 05-backup-restore/
백업 및 복원 관련 쿼리
- `current-database-backup.sql` - 현재 데이터베이스 백업
- `current-menus-backup.sql` - 현재 메뉴 백업
- `restore-original-menus.sql` - 원본 메뉴 복원

## 📋 기타 파일들
- `update-company-image-columns.sql` - 회사 이미지 컬럼 업데이트

## 🚀 사용 방법

1. **데이터베이스 초기 설정**: `01-database-setup/` 폴더의 파일들을 순서대로 실행
2. **메뉴 설정**: `02-menu-management/` 폴더의 파일들을 필요에 따라 실행
3. **권한 설정**: `03-user-permissions/` 폴더의 파일들을 실행
4. **최적화**: `04-optimization/` 폴더의 파일들을 실행하여 성능 향상

## ⚠️ 주의사항

- 쿼리를 실행하기 전에 반드시 백업을 수행하세요
- 프로덕션 환경에서는 신중하게 테스트 후 실행하세요
- 각 쿼리의 실행 순서를 확인하고 실행하세요
