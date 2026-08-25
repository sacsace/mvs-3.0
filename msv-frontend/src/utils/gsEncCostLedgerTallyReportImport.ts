/**
 * GS E&C Customized Tally Report 엑셀 → 원가 내역 리스트 컬럼 매핑
 * (예: GS_EC_Customized_Tally_Report_July_2026.xlsx · Customized Report 시트)
 *
 * Day Book 과 달리 이미 전표·계정·Dr/Cr 가 정리된 보고서이므로
 * Dr/Cr·은행계정 필터 없이 시트 행을 그대로 가져온다 (Voucher No. 중복 포함).
 */

import { normHeaderKey, type LedgerImportField } from './gsEncCostLedgerImportMap';

export type { TallyAccountRef } from './gsEncCostLedgerDayBookImport';

const norm = (v: unknown): string =>
  String(v ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normKey = (v: unknown): string =>
  norm(v)
    .toLowerCase()
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = norm(v).replace(/,/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** Customized Report 1행 헤더 */
export function isCustomizedTallyReportMatrix(rows: unknown[][]): boolean {
  if (!rows.length) return false;
  for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
    const joined = (rows[i] || []).map((c) => normHeaderKey(c)).join('|');
    if (
      joined.includes('voucher no') &&
      joined.includes('account name') &&
      joined.includes('amount inr') &&
      joined.includes('dr cr')
    ) {
      return true;
    }
  }
  return false;
}

/** Voucher Summary 등 보조 시트 — 원가 내역으로 파싱하지 않음 */
export function isTallyVoucherSummaryMatrix(rows: unknown[][]): boolean {
  if (!rows.length) return false;
  const joined = (rows[0] || []).map((c) => normHeaderKey(c)).join('|');
  return (
    joined.includes('voucher no') &&
    joined.includes('voucher type') &&
    joined.includes('amount inr') &&
    !joined.includes('account name')
  );
}

const COL = {
  voucherNo: 0,
  voucherDate: 1,
  accountCode: 2,
  account: 3,
  accountName: 4,
  amountInr: 5,
  drCr: 6,
  clientName: 7,
  narration: 8,
  division: 9,
  amountKrw: 10,
  month: 11,
  gsIndiaCost: 12,
} as const;

function findHeaderIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
    const joined = (rows[i] || []).map((c) => normHeaderKey(c)).join('|');
    if (
      joined.includes('voucher no') &&
      joined.includes('account name') &&
      joined.includes('dr cr')
    ) {
      return i;
    }
  }
  return 0;
}

/** Customized Report → 리스트 헤더 필드 (시트 행 전체, Voucher No. 중복 포함) */
export function parseCustomizedTallyReportMatrix(
  rows: unknown[][],
  tallyMap?: Map<string, import('./gsEncCostLedgerDayBookImport').TallyAccountRef>
): Partial<Record<LedgerImportField, unknown>>[] {
  if (!isCustomizedTallyReportMatrix(rows)) return [];

  const headerIdx = findHeaderIndex(rows);
  const out: Partial<Record<LedgerImportField, unknown>>[] = [];

  for (let r = headerIdx + 1; r < rows.length; r += 1) {
    const line = rows[r] || [];
    if (normHeaderKey(line[COL.voucherNo]) === 'voucher no') continue;

    const accountCol = norm(line[COL.account]);
    const accountNameCol = norm(line[COL.accountName]);
    const tallyName = accountCol || accountNameCol;
    const voucherNo = norm(line[COL.voucherNo]);
    if (!tallyName && !voucherNo) continue;

    const amountInr = toNumber(line[COL.amountInr]);
    if (amountInr <= 0) continue;

    const tallyRef = tallyMap?.get(normKey(tallyName));
    const accountCode = norm(line[COL.accountCode]) || tallyRef?.accountCode || '';
    const accountNameHqKo =
      /[가-힣]/.test(accountNameCol) ? accountNameCol : tallyRef?.nameKo || '';
    const accountNameHqEn =
      /[가-힣]/.test(accountNameCol)
        ? tallyRef?.nameEn || accountCol || accountNameCol
        : tallyRef?.nameEn || accountNameCol || accountCol;

    out.push({
      voucherNo: line[COL.voucherNo],
      voucherDate: line[COL.voucherDate],
      accountCode,
      accountNameTally: tallyName,
      accountNameHqKo,
      accountNameHqEn,
      amountInr,
      clientName: line[COL.clientName],
      narration: line[COL.narration],
      division: norm(line[COL.division]) || 'Tally',
      amountKrw: line[COL.amountKrw],
      month: line[COL.month] || line[COL.voucherDate],
      gsIndiaCost: line[COL.gsIndiaCost],
    });
  }

  return out;
}
