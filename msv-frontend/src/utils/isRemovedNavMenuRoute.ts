/** DB 메뉴에 남아 있어도 네비게이션에서 숨길 경로 (제거된 화면) */
export function isRemovedNavMenuRoute(route: string | undefined | null): boolean {
  const n = String(route || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  return n === 'customers/support';
}
