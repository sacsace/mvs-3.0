/**
 * 원가 내역 임포트 — PDF/엑셀 헤더 → 리스트 컬럼 매핑
 */

export type LedgerImportField =
  | 'voucherNo'
  | 'voucherDate'
  | 'accountCode'
  | 'accountNameHqKo'
  | 'accountNameHqEn'
  | 'accountNameTally'
  | 'amountInr'
  | 'costCategory'
  | 'clientName'
  | 'narration'
  | 'division'
  | 'amountKrw'
  | 'month'
  | 'gsIndiaCost';

/** 리스트/엑셀 표준 헤더명 */
export const LEDGER_CANONICAL_HEADER: Record<LedgerImportField, string> = {
  voucherNo: 'Voucher No.',
  voucherDate: 'Voucher Date',
  accountCode: 'Account Code',
  accountNameHqKo: 'Account name',
  accountNameHqEn: 'Account name-HQ(English)',
  accountNameTally: 'Account name-Tally',
  amountInr: 'Amount(INR)',
  costCategory: 'Cost Category',
  clientName: 'Client Name',
  narration: 'Narration',
  division: 'Division',
  amountKrw: 'Amount(KRW)',
  month: 'Month',
  gsIndiaCost: 'GS india',
};

const norm = (v: unknown): string =>
  String(v ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normHeaderKey = (v: unknown): string =>
  norm(v)
    .toLowerCase()
    .replace(/[_\-./\\()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const HEADER_MATCHERS: Array<{ field: LedgerImportField; test: (k: string) => boolean }> = [
  { field: 'voucherNo', test: (k) => /\bvoucher no\b/.test(k) || k === 'vch no' || k.includes('전표번호') },
  { field: 'voucherDate', test: (k) => /\bvoucher date\b/.test(k) || k === 'vch date' || k === 'date' || k.includes('전표일자') },
  {
    field: 'accountNameHqEn',
    test: (k) => k.includes('account name hq') && k.includes('english'),
  },
  {
    field: 'accountNameHqKo',
    test: (k) => k.includes('account name hq') && (k.includes('korean') || k.includes('koeran')),
  },
  { field: 'accountNameTally', test: (k) => k.includes('account name tally') || k === 'particulars' || k === 'account' },
  {
    field: 'gsIndiaCost',
    test: (k) =>
      k.includes('gs inida') ||
      k.includes('gs india') ||
      k.includes('saftey cost') ||
      k.includes('safety cost') ||
      k.includes('법인비용'),
  },
  { field: 'amountInr', test: (k) => k.includes('amount inr') || (k.startsWith('amount') && k.includes('inr')) || k === 'debit' || k.startsWith('debit amount') },
  { field: 'amountKrw', test: (k) => k.includes('amount krw') || (k.includes('amount') && k.includes('krw')) },
  { field: 'costCategory', test: (k) => k.includes('cost category') || k.includes('원가구분') },
  { field: 'clientName', test: (k) => k.includes('client name') || k.includes('거래처') },
  { field: 'narration', test: (k) => k === 'narration' || k.includes('적요') || k.includes('remarks') },
  { field: 'division', test: (k) => k === 'division' || k === '구분' || k === 'vch type' || k === 'voucher type' },
  { field: 'month', test: (k) => k === 'month' || k === '월' },
  {
    field: 'accountCode',
    test: (k) => k === 'account code' || k.includes('계정과목') || k === 'gl code',
  },
  {
    field: 'accountNameHqKo',
    test: (k) =>
      k === 'account name' ||
      (k.includes('account name') && !k.includes('hq') && !k.includes('tally') && !k.includes('english')),
  },
];

export function matchLedgerImportHeader(label: unknown): LedgerImportField | null {
  const k = normHeaderKey(label);
  if (!k) return null;
  for (const { field, test } of HEADER_MATCHERS) {
    if (test(k)) return field;
  }
  return null;
}

export function isLedgerImportHeaderRow(cells: unknown[]): boolean {
  if (isDayBookHeaderRow(cells)) return true;
  let matches = 0;
  for (const cell of cells) {
    if (matchLedgerImportHeader(cell)) matches += 1;
  }
  if (matches >= 3) return true;
  const joined = cells.map((c) => normHeaderKey(c)).join('|');
  if (joined.includes('계정과목')) return true;
  return joined.includes('voucher') && joined.includes('account');
}

/** Tally Day Book: Date · Particulars · Vch No. · Debit */
export function isDayBookHeaderRow(cells: unknown[]): boolean {
  const joined = cells.map((c) => normHeaderKey(c)).join('|');
  return joined.includes('particulars') && joined.includes('vch no') && joined.includes('debit');
}

export type LedgerImportColumnMap = Map<number, LedgerImportField>;

export function mapHeaderRowToFields(headerCells: unknown[]): LedgerImportColumnMap {
  const map: LedgerImportColumnMap = new Map();
  headerCells.forEach((cell, idx) => {
    const field = matchLedgerImportHeader(cell);
    if (field) map.set(idx, field);
  });
  return map;
}

export function normalizeHeaderLabels(headerCells: unknown[]): string[] {
  return headerCells.map((h, idx) => {
    const field = matchLedgerImportHeader(h);
    if (field) return LEDGER_CANONICAL_HEADER[field];
    const label = norm(h);
    return label || `__col_${idx}`;
  });
}
