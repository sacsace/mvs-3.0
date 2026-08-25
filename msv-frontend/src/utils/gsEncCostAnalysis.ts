import { loadGsEncXlsx, type WorkSheet } from './gsEncCostXlsx';
import {
  isDayBookMatrix,
  parseDayBookMatrix,
  type TallyAccountRef,
} from './gsEncCostLedgerDayBookImport';
import {
  isCustomizedTallyReportMatrix,
  isTallyVoucherSummaryMatrix,
  parseCustomizedTallyReportMatrix,
} from './gsEncCostLedgerTallyReportImport';
import {
  isLedgerImportHeaderRow,
  LEDGER_CANONICAL_HEADER,
  mapHeaderRowToFields,
  matchLedgerImportHeader,
  normalizeHeaderLabels,
  type LedgerImportField,
} from './gsEncCostLedgerImportMap';

export type GasAccount = {
  companyCode: string;
  companyName: string;
  accountCode: string;
  nameEn: string;
  nameLocal: string;
  nameKo: string;
  accountType: string;
  drCr: string;
};

export type LedgerRow = {
  id: string;
  voucherNo: string;
  voucherDate: string;
  accountCode: string;
  accountNameTally: string;
  accountNameHqKo: string;
  accountNameHqEn: string;
  /** GAS 매칭 한글명 */
  matchedNameKo: string;
  /** GAS 매칭 영문명 */
  matchedNameEn: string;
  matchSource: 'code' | 'english' | 'file' | 'none';
  amountInr: number;
  amountKrw: number;
  costCategory: string;
  clientName: string;
  narration: string;
  division: string;
  month: string;
  gsIndiaCost: string;
};

export type SummaryGroupKey =
  | 'matchedNameKo'
  | 'matchedNameEn'
  | 'accountCode'
  | 'costCategory'
  | 'month'
  | 'clientName'
  | 'gsIndiaCost'
  | 'accountNameTally'
  | 'division';

export type SummaryRow = {
  key: string;
  label: string;
  count: number;
  amountInr: number;
  amountKrw: number;
  sharePct: number;
};

const LS_ACCOUNTS = 'mvs_gs_enc_gas_accounts_v1';
const LS_LEDGER = 'mvs_gs_enc_ledger_rows_v1';
const LS_BASIC = 'mvs_gs_enc_basic_info_v1';
const LS_TALLY_MAP = 'mvs_gs_enc_tally_account_map_v1';

let cachedXlsxSSF: { parse_date_code: (n: number) => { y: number; m: number; d: number } | null } | null =
  null;

async function getImportXlsx() {
  const xlsx = await loadGsEncXlsx();
  cachedXlsxSSF = xlsx.SSF;
  return xlsx;
}

const parseExcelSerial = (n: number): { y: number; m: number; d: number } | null => {
  if (!Number.isFinite(n) || n < 1) return null;
  if (cachedXlsxSSF) {
    const parsed = cachedXlsxSSF.parse_date_code(n);
    if (parsed) return parsed;
  }
  // SSF 미로드 시 Excel serial 근사 (브라우저 localStorage 정규화용)
  const utc = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000;
  const dt = new Date(utc);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
};

export type GsEncBasicInfo = {
  periodMonth: string;
  fxRate: number;
  projectName: string;
};

export const DEFAULT_BASIC_INFO: GsEncBasicInfo = {
  periodMonth: '',
  fxRate: 0,
  projectName: '',
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

const cell = (row: Record<string, unknown>, ...aliases: string[]): unknown => {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const want = normKey(alias);
    const exact = keys.find((k) => normKey(k) === want);
    if (exact != null && hasCellValue(row[exact])) return row[exact];
  }
  for (const alias of aliases) {
    const want = normKey(alias);
    // 짧은 키(date 등)가 다른 컬럼에 잘못 매칭되지 않도록 단어 경계에 가깝게
    const hit = keys.find((k) => {
      const nk = normKey(k);
      return nk === want || nk.startsWith(`${want} `) || nk.endsWith(` ${want}`) || nk.includes(` ${want} `);
    });
    if (hit != null && hasCellValue(row[hit])) return row[hit];
  }
  return '';
};

const pickRowValue = (
  row: Record<string, unknown>,
  headerIndex: Map<string, number>,
  values: unknown[],
  ...aliases: string[]
): unknown => {
  for (const alias of aliases) {
    const idx = headerIndex.get(normKey(alias));
    if (idx != null && hasCellValue(values[idx])) return values[idx];
  }
  return cell(row, ...aliases);
};

const toNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = norm(v).replace(/,/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** Excel/SheetJS Date → 달력 날짜(yyyy-mm-dd). 타임존 밀림 보정 */
const ymdFromParts = (y: number, m: number, d: number): string => {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  // 실제 달력일 검증 (예: 2024-11-31 거부)
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/** 20241126 / 2024-11-26 등 압축 표기 → yyyy-mm-dd (Excel serial 5자리와 구분) */
const fromCompactYmd = (raw: string | number): string => {
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return '';
  return ymdFromParts(Number(m[1]), Number(m[2]), Number(m[3]));
};

const toDateText = (v: unknown): string => {
  if (v == null || v === '') return '';

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    // SheetJS cellDates: 로컬 자정이 UTC로 밀려 전날로 보이는 경우 보정
    const utcH = v.getUTCHours();
    const utcM = v.getUTCMinutes();
    if (utcH !== 0 || utcM !== 0) {
      // 예: 2025-01-31T18:29:50Z (= IST 2025-02-01 00:00)
      const shifted = new Date(v.getTime() + 12 * 60 * 60 * 1000);
      return ymdFromParts(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
    }
    return ymdFromParts(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  }

  if (typeof v === 'number' && Number.isFinite(v)) {
    // YYYYMMDD 숫자(예: 20241126) — Excel serial(약 2만~6만)보다 먼저
    const compact = fromCompactYmd(v);
    if (compact) return compact;
    // Excel serial (1 ~ ~60000) 또는 epoch ms
    if (v > 20000 && v < 80000) {
      const parsed = parseExcelSerial(v);
      if (parsed) return ymdFromParts(parsed.y, parsed.m, parsed.d);
    }
    if (v > 1e11) {
      const dt = new Date(v);
      if (!Number.isNaN(dt.getTime())) return toDateText(dt);
    }
  }

  const s = norm(v);
  if (!s || s === '-' || /^invalid/i.test(s)) return '';

  // YYYYMMDD 텍스트 (엑셀에서 숫자→텍스트로 저장된 경우, 녹색 삼각형)
  const compact = fromCompactYmd(s);
  if (compact) return compact;

  // Excel serial stored as string (5자리대). 8자리 YYYYMMDD는 위에서 처리됨
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 20000 && n < 80000) {
      const parsed = parseExcelSerial(n);
      if (parsed) return ymdFromParts(parsed.y, parsed.m, parsed.d);
    }
  }

  // yyyy-mm-dd / yyyy/mm/dd / yyyy.mm.dd (+ optional time)
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    // ISO with timezone time part: prefer calendar day after +12h UTC shift when T18:xxZ etc.
    if (/T\d{2}:\d{2}/i.test(s) || /z$/i.test(s)) {
      const dt = new Date(s);
      if (!Number.isNaN(dt.getTime())) return toDateText(dt);
    }
    return ymdFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  // dd/mm/yyyy or mm/dd/yyyy — prefer d/m/y when day > 12
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (a > 12) return ymdFromParts(y, b, a); // dd/mm/yyyy
    if (b > 12) return ymdFromParts(y, a, b); // mm/dd/yyyy
    return ymdFromParts(y, b, a); // default dd/mm/yyyy (인도/한국)
  }

  // 1-Jun-2025 / Jun 1, 2025
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return toDateText(new Date(parsed));

  return '';
};

/** 화면 표시용 날짜 (YYYY-MM-DD). 이미 저장된 값도 정규화 */
export function formatLedgerDate(value: unknown): string {
  const text = toDateText(value);
  return text || '-';
}

/** 화면 표시용 월 (YYYY-MM) */
export function formatLedgerMonth(value: unknown): string {
  const text = toDateText(value);
  if (text) return text.slice(0, 7);
  const raw = norm(value);
  if (/^\d{4}-\d{2}/.test(raw)) return raw.slice(0, 7);
  return raw || '-';
}

/** 영문 라벨 표시 — 단어 첫 글자 대문자·나머지 소문자 (한글은 그대로) */
export function formatEnglishLabel(value: unknown): string {
  const s = norm(value);
  if (!s || s === '-') return s;
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(s)) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s\-_/(&])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

export function displayEnglishLabel(value: unknown): string {
  const text = formatEnglishLabel(value);
  return text || '-';
}

const toMonthKey = (dateText: string, monthRaw: unknown): string => {
  const fromMonth = toDateText(monthRaw);
  if (/^\d{4}-\d{2}/.test(fromMonth)) return fromMonth.slice(0, 7);
  if (/^\d{4}-\d{2}/.test(dateText)) return dateText.slice(0, 7);
  return fromMonth || dateText || '-';
};

function matrixToSheetObjects(rows: unknown[][]): {
  objects: Record<string, unknown>[];
  headerIndex: Map<string, number>;
  valueRows: unknown[][];
  headerIdx: number;
  colMap: Map<number, LedgerImportField>;
} {
  if (!rows.length) {
    return { objects: [], headerIndex: new Map(), valueRows: [], headerIdx: -1, colMap: new Map() };
  }

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 40); i += 1) {
    if (isLedgerImportHeaderRow(rows[i] || [])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    return { objects: [], headerIndex: new Map(), valueRows: [], headerIdx: -1, colMap: new Map() };
  }

  const headerRow = rows[headerIdx] || [];
  const colMap = mapHeaderRowToFields(headerRow);
  const headers = normalizeHeaderLabels(headerRow);
  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => {
    const key = normKey(h);
    if (key && !headerIndex.has(key)) headerIndex.set(key, i);
    const field = colMap.get(i);
    if (field) {
      const canon = normKey(LEDGER_CANONICAL_HEADER[field]);
      if (canon && !headerIndex.has(canon)) headerIndex.set(canon, i);
    }
  });

  const objects: Record<string, unknown>[] = [];
  const valueRows: unknown[][] = [];
  for (let r = headerIdx + 1; r < rows.length; r += 1) {
    const line = rows[r] || [];
    if (!line.some((c) => hasCellValue(c))) continue;
    if (isLedgerImportHeaderRow(line)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = line[i];
    });
    objects.push(obj);
    valueRows.push(line);
  }
  return { objects, headerIndex, valueRows, headerIdx, colMap };
}

function sheetToObjects(
  sheet: WorkSheet,
  xlsxUtils: Awaited<ReturnType<typeof loadGsEncXlsx>>['utils']
): {
  objects: Record<string, unknown>[];
  headerIndex: Map<string, number>;
  valueRows: unknown[][];
  colMap: Map<number, LedgerImportField>;
} {
  const rows = xlsxUtils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });
  const parsed = matrixToSheetObjects(rows);
  return {
    objects: parsed.objects,
    headerIndex: parsed.headerIndex,
    valueRows: parsed.valueRows,
    colMap: parsed.colMap,
  };
}

type ParsedLedgerRow = Omit<LedgerRow, 'matchedNameKo' | 'matchedNameEn' | 'matchSource' | 'id'>;

function buildParsedLedgerRowFromFields(
  fields: Partial<Record<LedgerImportField, unknown>>
): ParsedLedgerRow | null {
  const voucherNo = norm(fields.voucherNo);
  const accountCode = norm(fields.accountCode);
  const accountNameTally = norm(fields.accountNameTally);
  const accountNameHqKo = norm(fields.accountNameHqKo);
  const accountNameHqEn = norm(fields.accountNameHqEn);
  const amountInr = toNumber(fields.amountInr);
  const voucherDateRaw = fields.voucherDate;
  let voucherDate = toDateText(voucherDateRaw);
  const monthRaw = fields.month;
  if (!voucherDate && !norm(voucherDateRaw)) {
    voucherDate = toDateText(monthRaw);
  }

  if (!accountCode && !accountNameTally && !accountNameHqKo) return null;
  if (!voucherNo && !voucherDate && !amountInr) return null;

  const month = toMonthKey(voucherDate, monthRaw);

  return {
    voucherNo,
    voucherDate,
    accountCode,
    accountNameTally: accountNameTally || accountNameHqKo,
    accountNameHqKo: accountNameHqKo || accountNameTally,
    accountNameHqEn,
    amountInr,
    amountKrw: toNumber(fields.amountKrw),
    costCategory: norm(fields.costCategory),
    clientName: norm(fields.clientName),
    narration: norm(fields.narration),
    division: norm(fields.division),
    month,
    gsIndiaCost: norm(fields.gsIndiaCost),
  };
}

type AccountLookups = {
  byCode: Map<string, GasAccount>;
  byEn: Map<string, GasAccount>;
  byKo: Map<string, GasAccount>;
};

function buildAccountLookups(accounts: GasAccount[]): AccountLookups {
  const byCode = new Map<string, GasAccount>();
  const byEn = new Map<string, GasAccount>();
  const byKo = new Map<string, GasAccount>();
  for (const acc of accounts) {
    if (acc.accountCode) byCode.set(normKey(acc.accountCode), acc);
    if (acc.nameEn) byEn.set(normKey(acc.nameEn), acc);
    if (acc.nameLocal) byEn.set(normKey(acc.nameLocal), acc);
    if (acc.nameKo) byKo.set(normKey(acc.nameKo), acc);
  }
  return { byCode, byEn, byKo };
}

function findGasAccountForRow(
  row: {
    accountCode?: string;
    accountNameTally?: string;
    accountNameHqKo?: string;
    accountNameHqEn?: string;
  },
  lookups: AccountLookups,
  tallyRef?: TallyAccountRef
): { gas?: GasAccount; source?: LedgerRow['matchSource'] } {
  const byCodeHit = row.accountCode
    ? lookups.byCode.get(normKey(row.accountCode))
    : tallyRef?.accountCode
      ? lookups.byCode.get(normKey(tallyRef.accountCode))
      : undefined;
  if (byCodeHit) return { gas: byCodeHit, source: 'code' };

  for (const key of [row.accountNameHqKo, tallyRef?.nameKo]) {
    if (!key) continue;
    const hit = lookups.byKo.get(normKey(key));
    if (hit) return { gas: hit, source: 'code' };
  }

  for (const key of [row.accountNameHqEn, row.accountNameTally, tallyRef?.nameEn]) {
    if (!key) continue;
    const hit = lookups.byEn.get(normKey(key));
    if (hit) return { gas: hit, source: 'english' };
  }

  return {};
}

function learnTallyRef(
  map: Map<string, TallyAccountRef>,
  tallyName: string,
  ref: TallyAccountRef
): void {
  if (!tallyName || !ref.accountCode) return;
  const key = normKey(tallyName);
  const prev = map.get(key);
  const next: TallyAccountRef = {
    accountCode: ref.accountCode,
    nameKo: ref.nameKo || prev?.nameKo || '',
    nameEn: ref.nameEn || prev?.nameEn || '',
  };
  if (!prev || next.nameKo || next.nameEn) map.set(key, next);
}

function mergeTallyRefsIntoMap(map: Map<string, TallyAccountRef>, rows: Array<Partial<ParsedLedgerRow>>): void {
  for (const row of rows) {
    const tally = norm(row.accountNameTally);
    const accountCode = norm(row.accountCode);
    if (!tally || !accountCode) continue;
    learnTallyRef(map, tally, {
      accountCode,
      nameKo: norm(row.accountNameHqKo),
      nameEn: norm(row.accountNameHqEn),
    });
  }
}

export function loadTallyAccountMap(): Map<string, TallyAccountRef> {
  try {
    const raw = localStorage.getItem(LS_TALLY_MAP);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, TallyAccountRef>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function saveTallyAccountMap(map: Map<string, TallyAccountRef>): void {
  localStorage.setItem(LS_TALLY_MAP, JSON.stringify(Object.fromEntries(map)));
}

function persistTallyFromParsedRows(rows: ParsedLedgerRow[]): void {
  if (!rows.length) return;
  const map = loadTallyAccountMap();
  mergeTallyRefsIntoMap(map, rows);
  saveTallyAccountMap(map);
}

function appendLedgerFromColumnMap(
  out: ParsedLedgerRow[],
  valueRows: unknown[][],
  colMap: Map<number, LedgerImportField>
) {
  for (const values of valueRows) {
    const fields: Partial<Record<LedgerImportField, unknown>> = {};
    colMap.forEach((field, idx) => {
      fields[field] = values[idx];
    });
    const row = buildParsedLedgerRowFromFields(fields);
    if (row) out.push(row);
  }
}

function appendLedgerObjects(
  out: ParsedLedgerRow[],
  objects: Record<string, unknown>[],
  headerIndex: Map<string, number>,
  valueRows: unknown[][]
) {
  for (let i = 0; i < objects.length; i += 1) {
    const row = objects[i];
    const values = valueRows[i] || [];
    const accountCode = norm(
      pickRowValue(row, headerIndex, values, 'Account Code', '계정과목', 'GL Code')
    );
    const accountNameTally = norm(
      pickRowValue(
        row,
        headerIndex,
        values,
        'Account name',
        'Account name-Tally',
        'Particulars',
        'Ledger Name'
      )
    );
    const amountInr = toNumber(
      pickRowValue(row, headerIndex, values, 'Amount(INR)', 'Amount', 'INR', 'Debit', '금액')
    );
    const voucherNo = norm(
      pickRowValue(row, headerIndex, values, 'Voucher No.', 'Voucher No', 'Vch No.', '전표번호')
    );
    const voucherDateRaw = pickRowValue(
      row,
      headerIndex,
      values,
      'Voucher Date',
      'Voucher date',
      'Vch Date',
      '전표일자',
      '날짜',
      'Date'
    );
    let voucherDate = toDateText(voucherDateRaw);
    const monthRaw = pickRowValue(row, headerIndex, values, 'Month', '월');
    if (!voucherDate && !norm(voucherDateRaw)) {
      voucherDate = toDateText(monthRaw);
    }
    if (!accountCode && !accountNameTally) continue;
    if (!voucherNo && !voucherDate && !amountInr) continue;

    const accountNameHqKo = norm(
      pickRowValue(
        row,
        headerIndex,
        values,
        'Account name-HQ(Koeran)',
        'Account name-HQ(Korean)',
        '계정명칭(한국어)',
        '한글계정'
      )
    );
    const accountNameHqEn = norm(
      pickRowValue(row, headerIndex, values, 'Account name-HQ(English)', 'HQ English')
    );
    const month = toMonthKey(voucherDate, monthRaw);
    const amountKrw = toNumber(pickRowValue(row, headerIndex, values, 'Amount(KRW)', 'KRW'));
    const costCategory = norm(pickRowValue(row, headerIndex, values, 'Cost Category', '원가구분', 'Category'));
    const clientName = norm(pickRowValue(row, headerIndex, values, 'Client Name', '거래처', 'Party'));
    const narration = norm(pickRowValue(row, headerIndex, values, 'Narration', '적요', 'Remarks'));
    const division = norm(pickRowValue(row, headerIndex, values, 'Division', '구분'));
    const gsIndiaCost = norm(
      pickRowValue(
        row,
        headerIndex,
        values,
        'GS inida COST(법인비용)\n/ Saftey Cost',
        'GS india COST(법인비용)/ Saftey Cost',
        'GS india COST',
        'GS india',
        'Saftey Cost',
        '법인비용'
      )
    );

    // 급여 배분처럼 전표·계정·금액이 같아도 엑셀 각 행은 합계에 포함해야 함 → 행 단위 유지
    out.push({
      voucherNo,
      voucherDate,
      accountCode,
      accountNameTally: accountNameTally || accountNameHqKo,
      accountNameHqKo: accountNameHqKo || accountNameTally,
      accountNameHqEn,
      amountInr,
      amountKrw,
      costCategory,
      clientName,
      narration,
      division,
      month,
      gsIndiaCost,
    });
  }
}

/** 엑셀/PDF 공통: 2차원 표(헤더+데이터) → 원가 내역 행 */
export function parseLedgerFromMatrix(matrix: unknown[][]): {
  rows: ParsedLedgerRow[];
  detectedFxRate: number;
} {
  const out: ParsedLedgerRow[] = [];
  let detectedFxRate = 0;

  if (isDayBookMatrix(matrix)) {
    const tallyMap = loadTallyAccountMap();
    for (const fields of parseDayBookMatrix(matrix, tallyMap)) {
      const row = buildParsedLedgerRowFromFields(fields);
      if (row) out.push(row);
    }
    persistTallyFromParsedRows(out);
    return { rows: out, detectedFxRate };
  }

  if (isCustomizedTallyReportMatrix(matrix)) {
    const tallyMap = loadTallyAccountMap();
    for (const fields of parseCustomizedTallyReportMatrix(matrix, tallyMap)) {
      const row = buildParsedLedgerRowFromFields(fields);
      if (row) out.push(row);
    }
    persistTallyFromParsedRows(out);
    return { rows: out, detectedFxRate };
  }

  for (let i = 0; i < Math.min(matrix.length, 8); i += 1) {
    for (const rawCell of matrix[i] || []) {
      const n = toNumber(rawCell);
      if (n > 1 && n < 100 && String(rawCell).includes('.')) {
        detectedFxRate = n;
        break;
      }
    }
    if (detectedFxRate) break;
  }

  const { objects, headerIndex, valueRows, colMap } = matrixToSheetObjects(matrix);
  if (colMap.size >= 3) {
    appendLedgerFromColumnMap(out, valueRows, colMap);
  } else {
    appendLedgerObjects(out, objects, headerIndex, valueRows);
  }
  persistTallyFromParsedRows(out);
  return { rows: out, detectedFxRate };
}

export async function parseGasAccountsWorkbook(buffer: ArrayBuffer): Promise<GasAccount[]> {
  const { read, utils } = await getImportXlsx();
  const wb = read(buffer, { type: 'array', cellDates: true });
  const byCode = new Map<string, GasAccount>();

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const { objects } = sheetToObjects(sheet, utils);
    for (const row of objects) {
      const accountCode = norm(cell(row, '계정과목', 'Account Code', 'account code'));
      if (!accountCode) continue;
      const nameKo = norm(cell(row, '계정명칭(한국어)', '계정명칭(한글)', 'Account name-HQ(Koeran)', 'Account name-HQ(Korean)'));
      const nameEn = norm(cell(row, '계정명칭', 'Account name-HQ(English)', 'Account Name'));
      const nameLocal = norm(cell(row, '계정명칭(현지어)', '계정명칭(로컬)'));
      const next: GasAccount = {
        companyCode: norm(cell(row, '법인코드', 'Company Code')),
        companyName: norm(cell(row, '법인명', 'Company Name')),
        accountCode,
        nameEn,
        nameLocal,
        nameKo: nameKo || nameLocal,
        accountType: norm(cell(row, '계정구분', 'Account Type')),
        drCr: norm(cell(row, '차대구분', 'Dr/Cr')),
      };
      const prev = byCode.get(accountCode);
      // Prefer rows that already have Korean name
      if (!prev || (!prev.nameKo && next.nameKo) || (next.nameKo && next.nameEn)) {
        byCode.set(accountCode, next);
      }
    }
  }

  return Array.from(byCode.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export async function parseLedgerWorkbook(
  buffer: ArrayBuffer,
  accounts: GasAccount[] = []
): Promise<{
  rows: LedgerRow[];
  detectedFxRate: number;
}> {
  const { read, utils } = await getImportXlsx();
  const wb = read(buffer, { type: 'array', cellDates: true });
  const out: ParsedLedgerRow[] = [];
  let detectedFxRate = 0;

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;

    const rawRows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });

    if (/source notes/i.test(name)) continue;

    if (isCustomizedTallyReportMatrix(rawRows)) {
      const tallyMap = loadTallyAccountMap();
      for (const fields of parseCustomizedTallyReportMatrix(rawRows, tallyMap)) {
        const row = buildParsedLedgerRowFromFields(fields);
        if (row) out.push(row);
      }
      continue;
    }

    if (isDayBookMatrix(rawRows)) {
      const tallyMap = loadTallyAccountMap();
      for (const fields of parseDayBookMatrix(rawRows, tallyMap)) {
        const row = buildParsedLedgerRowFromFields(fields);
        if (row) out.push(row);
      }
      continue;
    }

    if (isTallyVoucherSummaryMatrix(rawRows)) continue;

    if (!isLedgerImportHeaderRow(rawRows[0] || [])) {
      let hasHeader = false;
      for (let i = 0; i < Math.min(rawRows.length, 40); i += 1) {
        if (isLedgerImportHeaderRow(rawRows[i] || [])) {
          hasHeader = true;
          break;
        }
      }
      if (!hasHeader) continue;
    }

    for (let i = 0; i < Math.min(rawRows.length, 5); i += 1) {
      for (const rawCell of rawRows[i] || []) {
        const n = toNumber(rawCell);
        if (n > 1 && n < 100 && String(rawCell).includes('.')) {
          detectedFxRate = n;
          break;
        }
      }
      if (detectedFxRate) break;
    }

    const { objects, headerIndex, valueRows, colMap } = sheetToObjects(sheet, utils);
    if (colMap.size >= 3) {
      appendLedgerFromColumnMap(out, valueRows, colMap);
    } else {
      appendLedgerObjects(out, objects, headerIndex, valueRows);
    }
  }

  persistTallyFromParsedRows(out);
  return { rows: matchLedgerRows(out, accounts), detectedFxRate };
}

export function matchLedgerRows(
  rows: Omit<LedgerRow, 'matchedNameKo' | 'matchedNameEn' | 'matchSource' | 'id'>[],
  accounts: GasAccount[]
): LedgerRow[] {
  const lookups = buildAccountLookups(accounts);
  const byTally = new Map<string, TallyAccountRef>();
  loadTallyAccountMap().forEach((ref, tallyKey) => {
    byTally.set(tallyKey, ref);
  });

  const matched = rows.map((row, idx) => {
    const tallyRef = row.accountNameTally ? byTally.get(normKey(row.accountNameTally)) : undefined;
    const { gas, source: gasSource } = findGasAccountForRow(row, lookups, tallyRef);

    let matchSource: LedgerRow['matchSource'] = 'none';
    if (gas && gasSource) matchSource = gasSource;
    else if (tallyRef?.nameKo || tallyRef?.nameEn || row.accountNameHqKo) matchSource = 'file';

    const accountCode = row.accountCode || tallyRef?.accountCode || gas?.accountCode || '';
    const accountNameHqKo = row.accountNameHqKo || tallyRef?.nameKo || gas?.nameKo || '';
    const accountNameHqEn =
      row.accountNameHqEn || tallyRef?.nameEn || gas?.nameEn || row.accountNameTally || '';

    if (row.accountNameTally && accountCode) {
      learnTallyRef(byTally, row.accountNameTally, {
        accountCode,
        nameKo: gas?.nameKo || accountNameHqKo,
        nameEn: gas?.nameEn || accountNameHqEn,
      });
    }

    return {
      ...row,
      accountCode,
      accountNameHqKo,
      accountNameHqEn,
      id: `${idx}-${row.voucherNo}-${row.voucherDate}-${accountCode}-${row.amountInr}-${row.accountNameTally}`,
      matchedNameKo: gas?.nameKo || tallyRef?.nameKo || accountNameHqKo || '',
      matchedNameEn: gas?.nameEn || tallyRef?.nameEn || accountNameHqEn || row.accountNameTally || '',
      matchSource,
    };
  });

  saveTallyAccountMap(byTally);
  return matched;
}

export function buildSummary(rows: LedgerRow[], groupKey: SummaryGroupKey): SummaryRow[] {
  const map = new Map<string, { count: number; amountInr: number; amountKrw: number }>();
  let totalInr = 0;

  for (const row of rows) {
    const label = norm(row[groupKey]) || '(빈 값)';
    const prev = map.get(label) || { count: 0, amountInr: 0, amountKrw: 0 };
    prev.count += 1;
    prev.amountInr += row.amountInr;
    prev.amountKrw += row.amountKrw;
    map.set(label, prev);
    totalInr += row.amountInr;
  }

  return Array.from(map.entries())
    .map(([label, v]) => ({
      key: label,
      label,
      count: v.count,
      amountInr: v.amountInr,
      amountKrw: v.amountKrw,
      sharePct: totalInr ? (v.amountInr / totalInr) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.amountInr) - Math.abs(a.amountInr));
}

export function loadGasAccounts(): GasAccount[] {
  try {
    const raw = localStorage.getItem(LS_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGasAccounts(accounts: GasAccount[]): void {
  localStorage.setItem(LS_ACCOUNTS, JSON.stringify(accounts));
}

export function loadLedgerRows(): LedgerRow[] {
  try {
    const raw = localStorage.getItem(LS_LEDGER);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row: LedgerRow) => {
      const rawVd = row.voucherDate;
      // 저장된 YYYYMMDD 등도 재정규화. 원본 날짜 셀이 있었을 때 Month로 덮지 않음
      const voucherDate =
        toDateText(rawVd) || (!norm(rawVd) ? toDateText(row.month) : '') || '';
      const monthFromVd = formatLedgerMonth(voucherDate);
      const monthFromField = formatLedgerMonth(row.month);
      const month =
        monthFromField !== '-'
          ? monthFromField
          : monthFromVd !== '-'
            ? monthFromVd
            : '';
      return {
        ...row,
        voucherDate,
        month: month === '-' ? '' : month,
      };
    });
  } catch {
    return [];
  }
}

export function saveLedgerRows(rows: LedgerRow[]): void {
  localStorage.setItem(LS_LEDGER, JSON.stringify(rows));
}

export function loadBasicInfo(): GsEncBasicInfo {
  try {
    const raw = localStorage.getItem(LS_BASIC);
    if (!raw) return { ...DEFAULT_BASIC_INFO };
    const parsed = JSON.parse(raw);
    return {
      periodMonth: String(parsed?.periodMonth || ''),
      fxRate: Number(parsed?.fxRate) || 0,
      projectName: String(parsed?.projectName || ''),
    };
  } catch {
    return { ...DEFAULT_BASIC_INFO };
  }
}

export function saveBasicInfo(info: GsEncBasicInfo): void {
  localStorage.setItem(LS_BASIC, JSON.stringify(info));
}

export function clearGsEncCostLocalData(): void {
  localStorage.removeItem(LS_ACCOUNTS);
  localStorage.removeItem(LS_LEDGER);
  localStorage.removeItem(LS_BASIC);
  localStorage.removeItem(LS_TALLY_MAP);
}

export function resolveAmountKrw(amountInr: number, amountKrw: number, fxRate: number): number {
  if (amountKrw) return amountKrw;
  if (fxRate > 0) return amountInr * fxRate;
  return 0;
}

export function formatInr(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

export { buildParsedLedgerRowFromFields };
