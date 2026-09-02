/**
 * Tally Day Book 엑셀 → 원가 내역 리스트 컬럼 매핑
 */

import { isDayBookHeaderRow, normHeaderKey, type LedgerImportField } from './gsEncCostLedgerImportMap';

export type TallyAccountRef = {
  accountCode: string;
  nameKo: string;
  nameEn: string;
  /** 이전 누계 보조부에서 학습한 부가 매핑 */
  costCategory?: string;
  clientName?: string;
  gsIndiaCost?: string;
  division?: string;
};

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

const hasCellValue = (v: unknown): boolean => {
  if (v == null) return false;
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (typeof v === 'number') return Number.isFinite(v);
  return String(v).trim() !== '';
};

const toNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = norm(v).replace(/,/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** Day Book 본문에서 제외할 상대계정/세금/BS 계정 */
export function isDayBookSkipParticulars(particulars: string): boolean {
  const u = particulars.toUpperCase();
  if (!u) return true;
  if (/^ICICI BANK|^HDFC BANK|^AXIS BANK|^STATE BANK|^SBI\b/.test(u)) return true;
  if (/CREDIT CARD/.test(u)) return true;
  if (/^ADVANCE$|^NEW REF$|^AVAILABLE ONLY|^ON ACCOUNT$/.test(u)) return true;
  if (/INPUT IGST|OUTPUT CGST|OUTPUT IGST|INPUT CGST|INPUT SGST|OUTPUT SGST/.test(u)) return true;
  if (/\bTDS\b/.test(u)) return true;
  if (/^SALES$|^PURCHASE$|^UNBILLED REVENUE$|^SUNDRY CREDITORS$|^SUNDRY DEBTORS$/.test(u)) return true;
  if (/^INTEREST ON FIXED DEPOSIT$|^INTEREST PAYABLE$|^INTEREST EXPENSE$/.test(u)) return true;
  return false;
}

export function isDayBookMatrix(rows: unknown[][]): boolean {
  if (!rows.length) return false;
  for (let i = 0; i < Math.min(rows.length, 50); i += 1) {
    const joined = (rows[i] || []).map((c) => normHeaderKey(c)).join('|');
    if (joined.includes('day book')) return true;
    if (isDayBookHeaderRow(rows[i] || [])) return true;
  }
  return false;
}

function findDayBookHeaderIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 50); i += 1) {
    if (isDayBookHeaderRow(rows[i] || [])) return i;
  }
  return -1;
}

function collectNarration(rows: unknown[][], fromRow: number): string {
  const parts: string[] = [];
  for (let r = fromRow + 1; r < rows.length; r += 1) {
    const line = rows[r] || [];
    if (hasCellValue(line[0]) && norm(line[7])) break;
    if (toNumber(line[8]) > 0 || toNumber(line[9]) > 0) break;
    const text = norm(line[1]);
    if (!text) continue;
    if (isDayBookSkipParticulars(text)) break;
    parts.push(text);
    if (parts.length >= 3) break;
  }
  return parts.join(' / ');
}

/** Day Book 시트 → 리스트 헤더 필드 */
export function parseDayBookMatrix(
  rows: unknown[][],
  tallyMap?: Map<string, TallyAccountRef>
): Partial<Record<LedgerImportField, unknown>>[] {
  const headerIdx = findDayBookHeaderIndex(rows);
  if (headerIdx < 0) return [];

  const out: Partial<Record<LedgerImportField, unknown>>[] = [];
  const useTallyFilter = Boolean(tallyMap && tallyMap.size > 0);
  let voucherDate: unknown = '';
  let voucherNo = '';
  let vchType = '';

  for (let r = headerIdx + 1; r < rows.length; r += 1) {
    const line = rows[r] || [];
    if (isDayBookHeaderRow(line)) continue;

    const dateCell = line[0];
    const particulars = norm(line[1]);
    const nextVchType = norm(line[6]);
    const nextVoucherNo = norm(line[7]);
    const debit = toNumber(line[8]);

    if (hasCellValue(dateCell)) voucherDate = dateCell;
    if (nextVoucherNo) voucherNo = nextVoucherNo;
    if (nextVchType) vchType = nextVchType;

    if (!particulars || debit <= 0) continue;
    if (isDayBookSkipParticulars(particulars)) continue;

    const tallyRef = tallyMap?.get(normKey(particulars));
    if (useTallyFilter && !tallyRef) continue;

    out.push({
      voucherNo,
      voucherDate,
      accountCode: tallyRef?.accountCode || '',
      accountNameTally: particulars,
      accountNameHqKo: tallyRef?.nameKo || '',
      accountNameHqEn: tallyRef?.nameEn || particulars,
      amountInr: debit,
      clientName: '',
      narration: collectNarration(rows, r),
      division: vchType || 'Tally',
      month: voucherDate,
      gsIndiaCost: '',
    });
  }

  return out;
}
