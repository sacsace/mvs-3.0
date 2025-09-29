// MVS 3.0 E2E 테스트 - 로그인 기능

const { test, expect } = require('@playwright/test');

test.describe('로그인 기능', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('로그인 페이지가 정상적으로 로드된다', async ({ page }) => {
    await expect(page).toHaveTitle(/MVS 3.0/);
    await expect(page.locator('h1')).toContainText('MVS 3.0 로그인');
  });

  test('유효한 자격증명으로 로그인할 수 있다', async ({ page }) => {
    // 로그인 폼 작성
    await page.fill('input[name="userid"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('환영합니다');
  });

  test('잘못된 자격증명으로 로그인하면 오류가 표시된다', async ({ page }) => {
    // 잘못된 자격증명 입력
    await page.fill('input[name="userid"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 오류 메시지 확인
    await expect(page.locator('.MuiAlert-root')).toBeVisible();
    await expect(page.locator('.MuiAlert-root')).toContainText('로그인');
  });

  test('빈 필드로 로그인 시도하면 유효성 검사 오류가 표시된다', async ({ page }) => {
    // 빈 필드로 로그인 시도
    await page.click('button[type="submit"]');
    
    // 유효성 검사 오류 확인
    await expect(page.locator('input[name="userid"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('로그인 후 로그아웃할 수 있다', async ({ page }) => {
    // 로그인
    await page.fill('input[name="userid"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // 대시보드 로드 대기
    await expect(page).toHaveURL(/.*dashboard/);
    
    // 사용자 메뉴 클릭
    await page.click('[data-testid="user-menu-button"]');
    
    // 로그아웃 클릭
    await page.click('text=로그아웃');
    
    // 로그인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL(/.*login/);
  });
});
