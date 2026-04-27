/**
 * 급여월을 `YYYY-MM`으로 통일 (서버 `normalizePayrollPeriodInput`와 동일 규칙).
 */
export function normalizePayMonth(period: string | null | undefined): string | null {
  if (period == null) return null;
  const s = String(period).trim();
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(s);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  if (m[3] !== undefined) {
    const day = parseInt(m[3], 10);
    const dim = new Date(year, month, 0).getDate();
    if (day < 1 || day > dim) return null;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** `YYYY-MM`이 오늘 기준 이번 달보다 이후(미래 월)이면 true */
export function isPayMonthAfterCurrent(ym: string | null | undefined): boolean {
  const n = normalizePayMonth(ym);
  if (!n) return false;
  const d = new Date();
  const cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return n > cur;
}
