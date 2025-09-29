// MVS 3.0 E2E 테스트 - 대시보드 기능

const { test, expect } = require('@playwright/test');

test.describe('대시보드 기능', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="userid"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // 대시보드 로드 대기
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('대시보드가 정상적으로 로드된다', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('환영합니다');
    await expect(page.locator('text=내 정보')).toBeVisible();
  });

  test('사이드바 메뉴가 정상적으로 표시된다', async ({ page }) => {
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('text=사용자 관리')).toBeVisible();
  });

  test('사이드바 메뉴를 클릭하면 해당 페이지로 이동한다', async ({ page }) => {
    // 사용자 관리 메뉴 클릭
    await page.click('text=사용자 관리');
    
    // 사용자 관리 페이지로 이동 확인
    await expect(page).toHaveURL(/.*users/);
    await expect(page.locator('h1')).toContainText('사용자 관리');
  });

  test('테마 토글이 작동한다', async ({ page }) => {
    // 테마 토글 버튼 클릭
    await page.click('[data-testid="theme-toggle"]');
    
    // 다크 테마 적용 확인
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    
    // 다시 클릭하여 라이트 테마로 변경
    await page.click('[data-testid="theme-toggle"]');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('언어 변경이 작동한다', async ({ page }) => {
    // 언어 선택 메뉴 클릭
    await page.click('[data-testid="language-menu"]');
    
    // 영어 선택
    await page.click('text=English');
    
    // 영어로 변경 확인
    await expect(page.locator('h1')).toContainText('Welcome');
    
    // 다시 한국어로 변경
    await page.click('[data-testid="language-menu"]');
    await page.click('text=한국어');
    
    // 한국어로 변경 확인
    await expect(page.locator('h1')).toContainText('환영합니다');
  });

  test('알림 패널이 작동한다', async ({ page }) => {
    // 알림 버튼 클릭
    await page.click('[data-testid="notification-button"]');
    
    // 알림 패널 표시 확인
    await expect(page.locator('[data-testid="notification-panel"]')).toBeVisible();
    
    // 알림 목록 확인
    await expect(page.locator('[data-testid="notification-item"]')).toHaveCount(3);
  });

  test('반응형 디자인이 작동한다', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 햄버거 메뉴 표시 확인
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // 햄버거 메뉴 클릭
    await page.click('[data-testid="mobile-menu-button"]');
    
    // 사이드바 표시 확인
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // 데스크톱 뷰포트로 복원
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // 사이드바가 항상 표시되는지 확인
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });
});
