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

const hasHangul = (s: string): boolean => /[가-힣]/.test(s);

function pickStrongHqKo(...candidates: Array<string | undefined>): string {
  for (const c of candidates) {
    const n = norm(c);
    if (n && hasHangul(n)) return n;
  }
  return '';
}

function buildParsedLedgerRowFromFields(
  fields: Partial<Record<LedgerImportField, unknown>>
): ParsedLedgerRow | null {
  const voucherNo = norm(fields.voucherNo);
  const accountCode = norm(fields.accountCode);
  let accountNameTally = norm(fields.accountNameTally);
  const accountNameHqKo = norm(fields.accountNameHqKo);
  let accountNameHqEn = norm(fields.accountNameHqEn);
  let clientName = norm(fields.clientName);
  const amountInr = toNumber(fields.amountInr);
  const voucherDateRaw = fields.voucherDate;
  let voucherDate = toDateText(voucherDateRaw);
  const monthRaw = fields.month;
  if (!voucherDate && !norm(voucherDateRaw)) {
    voucherDate = toDateText(monthRaw);
  }

  // 일부 Tally Report(기준) 파일: Account name-* 비고, 계정명이 Client Name 에만 있음
  // → Tally/HQ에 복사하되 Client Name은 유지 (다른 행에 Client를 퍼뜨리지 않음)
  if (!accountCode && !accountNameTally && !accountNameHqKo && !accountNameHqEn && clientName) {
    accountNameTally = clientName;
    accountNameHqEn = clientName;
  }

  if (!accountCode && !accountNameTally && !accountNameHqKo && !accountNameHqEn) return null;
  if (!voucherNo && !voucherDate && !amountInr) return null;

  const month = toMonthKey(voucherDate, monthRaw);

  const tally = accountNameTally || accountNameHqEn || accountNameHqKo;
  // 한글이 없으면 HQ 한글명으로 쓰지 않음(영문/Tally 복제 → 이후 학습 매핑으로 채움)
  const hqKo = hasHangul(accountNameHqKo) ? accountNameHqKo : '';

  return {
    voucherNo,
    voucherDate,
    accountCode,
    accountNameTally: tally,
    accountNameHqKo: hqKo,
    accountNameHqEn:
      accountNameHqEn || (!hasHangul(accountNameHqKo) ? accountNameHqKo : '') || tally || '',
    amountInr,
    amountKrw: toNumber(fields.amountKrw),
    costCategory: norm(fields.costCategory),
    clientName,
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
  ref: Partial<TallyAccountRef> & { accountCode?: string },
  options?: { forceNameKo?: boolean }
): void {
  if (!tallyName) return;
  const key = normKey(tallyName);
  const prev = map.get(key);
  const learnedKo = hasHangul(norm(ref.nameKo)) ? norm(ref.nameKo) : '';
  const prevKo = hasHangul(norm(prev?.nameKo)) ? norm(prev?.nameKo) : '';
  // 기본: 기존 한글 보호. forceNameKo 시 Cost Category 등 신뢰 키로 교정
  const nameKo = options?.forceNameKo && learnedKo ? learnedKo : prevKo || learnedKo;
  const next: TallyAccountRef = {
    accountCode: norm(ref.accountCode) || prev?.accountCode || '',
    nameKo,
    nameEn:
      options?.forceNameKo && learnedKo
        ? norm(ref.nameEn) || prev?.nameEn || ''
        : (nameKo && prevKo && !options?.forceNameKo ? prev?.nameEn : '') ||
          norm(ref.nameEn) ||
          prev?.nameEn ||
          '',
    costCategory: norm(ref.costCategory) || prev?.costCategory || '',
    clientName: norm(ref.clientName) || prev?.clientName || '',
    gsIndiaCost: norm(ref.gsIndiaCost) || prev?.gsIndiaCost || '',
    division: norm(ref.division) || prev?.division || '',
  };
  if (!options?.forceNameKo && prevKo) {
    next.nameEn = prev?.nameEn || next.nameEn;
  }
  if (
    !prev ||
    next.accountCode ||
    next.nameKo ||
    next.nameEn ||
    next.costCategory ||
    next.clientName ||
    next.gsIndiaCost
  ) {
    map.set(key, next);
  }
}

function learnLedgerAliases(
  map: Map<string, TallyAccountRef>,
  keys: Array<string | undefined>,
  ref: Partial<TallyAccountRef> & { accountCode?: string },
  options?: { forceNameKo?: boolean }
): void {
  const unique = new Set<string>();
  for (const key of keys) {
    const n = norm(key);
    if (!n) continue;
    const k = normKey(n);
    if (unique.has(k)) continue;
    unique.add(k);
    learnTallyRef(map, n, ref, options);
  }
}

function resolveLearnedRef(
  map: Map<string, TallyAccountRef>,
  ...keys: Array<string | undefined>
): TallyAccountRef | undefined {
  // 앞쪽 키(Client/Narration 등)에 한글명이 있으면 뒤쪽(HQ/GAS 잔여값)보다 우선
  let best: TallyAccountRef | undefined;
  for (const key of keys) {
    const n = norm(key);
    if (!n) continue;
    const hit = map.get(normKey(n));
    if (!hit) continue;
    if (!best) {
      best = { ...hit };
      continue;
    }
    const hitKo = hasHangul(norm(hit.nameKo)) ? norm(hit.nameKo) : '';
    const bestKo = hasHangul(norm(best.nameKo)) ? norm(best.nameKo) : '';
    // 이미 우선 키에서 한글을 찾았으면 nameKo/nameEn 유지, 빈 필드만 보강
    if (bestKo) {
      best = {
        accountCode: best.accountCode || hit.accountCode,
        nameKo: bestKo,
        nameEn: best.nameEn || hit.nameEn,
        costCategory: best.costCategory || hit.costCategory,
        clientName: best.clientName || hit.clientName,
        gsIndiaCost: best.gsIndiaCost || hit.gsIndiaCost,
        division: best.division || hit.division,
      };
    } else if (hitKo) {
      best = {
        accountCode: hit.accountCode || best.accountCode,
        nameKo: hitKo,
        nameEn: hit.nameEn || best.nameEn,
        costCategory: hit.costCategory || best.costCategory,
        clientName: hit.clientName || best.clientName,
        gsIndiaCost: hit.gsIndiaCost || best.gsIndiaCost,
        division: hit.division || best.division,
      };
    } else {
      best = {
        accountCode: best.accountCode || hit.accountCode,
        nameKo: best.nameKo || hit.nameKo,
        nameEn: best.nameEn || hit.nameEn,
        costCategory: best.costCategory || hit.costCategory,
        clientName: best.clientName || hit.clientName,
        gsIndiaCost: best.gsIndiaCost || hit.gsIndiaCost,
        division: best.division || hit.division,
      };
    }
  }
  return best;
}

/** Cost Category · Client Name · Tally/HQ — 이전 누계 학습 조회 (Narration 단독 매칭 금지) */
function resolvePriorLedgerMapping(
  map: Map<string, TallyAccountRef>,
  row: {
    clientName?: string;
    costCategory?: string;
    accountNameTally?: string;
    accountNameHqEn?: string;
  }
): TallyAccountRef | undefined {
  // Narration은 전표마다 공유되는 경우가 많아(자금이체 적요 등) 전체 행으로 확산됨 → 제외
  return resolveLearnedRef(
    map,
    row.costCategory,
    row.clientName,
    row.accountNameTally,
    row.accountNameHqEn
  );
}

function costCategoryConflictsAccount(
  costCategory: string,
  nameKo: string,
  nameEn: string
): boolean {
  const c = normKey(costCategory);
  if (!c) return false;
  const blob = normKey(`${nameKo} ${nameEn}`);
  if (!blob) return false;
  const costRental = /rental|임차|숙소|accommodation/.test(c);
  const costTravel = /travel|여비|출장|overseas/.test(c);
  const accRental = /rental|임차|숙소|accommodation/.test(blob);
  const accTravel = /travel|여비|출장|overseas/.test(blob);
  if (costRental && accTravel) return true;
  if (costTravel && accRental) return true;
  return false;
}

/**
 * 같은 업로드/배치 안에서 Cost Category·Client·Tally 가 같은 행들의
 * 다수 한글/영문 매핑을 뽑아 오매핑 행을 교정한다.
 */
function buildBatchConsensusMap(
  rows: Array<Partial<ParsedLedgerRow> | Partial<LedgerRow>>
): Map<string, TallyAccountRef> {
  type Vote = { ref: TallyAccountRef; count: number };
  const buckets = new Map<string, Map<string, Vote>>();

  const castVote = (alias: string, ref: TallyAccountRef) => {
    const a = norm(alias);
    if (!a || !ref.nameKo) return;
    const key = normKey(a);
    const sig = `${normKey(ref.nameKo)}|${normKey(ref.nameEn)}|${normKey(ref.accountCode)}`;
    let bySig = buckets.get(key);
    if (!bySig) {
      bySig = new Map();
      buckets.set(key, bySig);
    }
    const prev = bySig.get(sig);
    if (prev) prev.count += 1;
    else bySig.set(sig, { ref: { ...ref }, count: 1 });
  };

  for (const row of rows) {
    const hqKo = pickStrongHqKo(row.accountNameHqKo, (row as LedgerRow).matchedNameKo);
    const hqEn = norm(row.accountNameHqEn) || norm((row as LedgerRow).matchedNameEn);
    const costCategory = norm(row.costCategory);
    const client = norm(row.clientName);
    const tally = norm(row.accountNameTally);
    if (!hqKo) continue;
    if (costCategoryConflictsAccount(costCategory, hqKo, hqEn)) continue;

    const ref: TallyAccountRef = {
      accountCode: norm(row.accountCode),
      nameKo: hqKo,
      nameEn: hqEn,
      costCategory,
      clientName: client,
      gsIndiaCost: norm(row.gsIndiaCost),
      division: norm(row.division),
    };

    if (costCategory) castVote(costCategory, ref);
    if (client) castVote(client, ref);
    if (tally) castVote(tally, ref);
    if (client && costCategory) castVote(`${client}||${costCategory}`, ref);
    if (tally && costCategory) castVote(`${tally}||${costCategory}`, ref);
  }

  const winners = new Map<string, TallyAccountRef>();
  buckets.forEach((bySig, key) => {
    let best: Vote | undefined;
    bySig.forEach((vote) => {
      if (!best || vote.count > best.count) best = vote;
    });
    if (best && best.count >= 1) winners.set(key, best.ref);
  });
  return winners;
}

function isNonExpenseLedgerName(name: string): boolean {
  const u = norm(name).toUpperCase();
  if (!u) return false;
  if (/\bBANK\b|HDFC|ICICI|\bSBI\b|SHINHAN|AXIS BANK|KOTAK|YES BANK/.test(u)) return true;
  if (/TDS RECEIVABLE|TDS PAYABLE|INTEREST ON FIXED|FIXED DEPOSIT|UNBILLED REVENUE/.test(u)) return true;
  if (/^CGST|^SGST|^IGST|INPUT CGST|OUTPUT CGST|INPUT IGST|OUTPUT IGST/.test(u)) return true;
  return false;
}

function resolveBatchConsensus(
  consensus: Map<string, TallyAccountRef>,
  row: {
    clientName?: string;
    costCategory?: string;
    accountNameTally?: string;
  }
): TallyAccountRef | undefined {
  const client = norm(row.clientName);
  const cost = norm(row.costCategory);
  const tally = norm(row.accountNameTally);
  // Client+Cost / Tally+Cost 가 있을 때만 Cost 단독 키 사용 (무관한 행 확산 방지)
  const keys = [
    client && cost ? `${client}||${cost}` : '',
    tally && cost ? `${tally}||${cost}` : '',
    client,
    tally,
    client || tally ? cost : '',
  ];
  for (const k of keys) {
    if (!k) continue;
    const hit = consensus.get(normKey(k));
    if (hit?.nameKo) return hit;
  }
  return undefined;
}

function findGasByCostCategory(
  accounts: GasAccount[],
  costCategory: string
): GasAccount | undefined {
  const c = normKey(costCategory);
  if (!c) return undefined;
  const preferRental = /rental|임차|숙소|accommodation/.test(c);
  const preferTravel = /travel|여비|출장|overseas/.test(c);
  if (!preferRental && !preferTravel) return undefined;

  let best: GasAccount | undefined;
  for (const acc of accounts) {
    const blob = `${acc.nameEn} ${acc.nameKo} ${acc.nameLocal}`;
    if (preferRental && /rental|임차|숙소|accommodation/i.test(blob)) {
      if (/accommodation|숙소/i.test(blob)) return acc;
      if (!best) best = acc;
    }
    if (preferTravel && /travel|여비|출장|overseas/i.test(blob)) {
      if (!best) best = acc;
    }
  }
  return best;
}

function mergeTallyRefsIntoMap(
  map: Map<string, TallyAccountRef>,
  rows: Array<Partial<ParsedLedgerRow> | Partial<LedgerRow>>
): void {
  for (const row of rows) {
    const tally = norm(row.accountNameTally);
    const hqEn = norm(row.accountNameHqEn) || norm((row as LedgerRow).matchedNameEn);
    const client = norm(row.clientName);
    if (!tally && !hqEn && !client) continue;

    const hqKo = pickStrongHqKo(row.accountNameHqKo, (row as LedgerRow).matchedNameKo);
    const costCategory = norm(row.costCategory);
    const conflict = costCategoryConflictsAccount(costCategory, hqKo, hqEn);

    // 한글이 있고 Cost Category와 모순되지 않을 때만 Client/Cost 학습 (Narration 제외)
    const keys: Array<string | undefined> = [];
    if (hqKo && !conflict) {
      keys.push(tally, hqEn, client, costCategory);
    } else {
      keys.push(tally, hqEn);
      if (client && !tally && !hqEn) keys.push(client);
    }

    learnLedgerAliases(map, keys, {
      accountCode: norm(row.accountCode),
      nameKo: hqKo && !conflict ? hqKo : '',
      nameEn: hqKo && !conflict ? hqEn || tally || client : hqEn || tally,
      costCategory,
      clientName: client,
      gsIndiaCost: norm(row.gsIndiaCost),
      division: norm(row.division),
    });
  }
}

/** 저장된 원가 내역 + 로컬 tally map 을 합쳐 학습 사전 구성 */
export function rebuildTallyAccountMapFromLedger(rows: Array<Partial<LedgerRow>>): Map<string, TallyAccountRef> {
  const map = loadTallyAccountMap();
  mergeTallyRefsIntoMap(map, rows);
  saveTallyAccountMap(map);
  return map;
}

export function loadTallyAccountMap(): Map<string, TallyAccountRef> {
  try {
    const raw = localStorage.getItem(LS_TALLY_MAP);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, TallyAccountRef>;
    const map = new Map<string, TallyAccountRef>();
    for (const [key, ref] of Object.entries(parsed || {})) {
      if (!ref || typeof ref !== 'object') continue;
      const nameKo = hasHangul(norm(ref.nameKo)) ? norm(ref.nameKo) : '';
      map.set(key, {
        accountCode: norm(ref.accountCode),
        nameKo,
        nameEn: norm(ref.nameEn),
        costCategory: norm(ref.costCategory),
        clientName: norm(ref.clientName),
        gsIndiaCost: norm(ref.gsIndiaCost),
        division: norm(ref.division),
      });
    }
    return map;
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
    let accountNameTally = norm(
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
    let accountNameHqEn = norm(
      pickRowValue(row, headerIndex, values, 'Account name-HQ(English)', 'HQ English')
    );
    const month = toMonthKey(voucherDate, monthRaw);
    const amountKrw = toNumber(pickRowValue(row, headerIndex, values, 'Amount(KRW)', 'KRW'));
    const costCategory = norm(pickRowValue(row, headerIndex, values, 'Cost Category', '원가구분', 'Category'));
    let clientName = norm(pickRowValue(row, headerIndex, values, 'Client Name', '거래처', 'Party'));
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

    if (!accountCode && !accountNameTally && !accountNameHqKo && !accountNameHqEn && clientName) {
      accountNameTally = clientName;
      accountNameHqEn = clientName;
    }

    if (!accountCode && !accountNameTally && !accountNameHqKo && !accountNameHqEn) continue;
    if (!voucherNo && !voucherDate && !amountInr) continue;

    const tally = accountNameTally || accountNameHqEn || accountNameHqKo;
    const hqKo = hasHangul(accountNameHqKo) ? accountNameHqKo : '';
    // 급여 배분처럼 전표·계정·금액이 같아도 엑셀 각 행은 합계에 포함해야 함 → 행 단위 유지
    out.push({
      voucherNo,
      voucherDate,
      accountCode,
      accountNameTally: tally,
      accountNameHqKo: hqKo,
      accountNameHqEn: accountNameHqEn || (!hasHangul(accountNameHqKo) ? accountNameHqKo : '') || tally || '',
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

/** 업로드 행을 이전 누계 보조부·GAS 학습값으로 매핑해 리스트용 행 생성 */
export function mapLedgerUpload(
  uploaded: Array<Partial<LedgerRow> | ParsedLedgerRow>,
  accounts: GasAccount[],
  priorLedger: LedgerRow[],
  mode: 'replace' | 'append'
): LedgerRow[] {
  // 교체 import 이더라도 이전 화면 데이터에서 한글·원가구분 학습 유지
  rebuildTallyAccountMapFromLedger(priorLedger);

  const toRaw = (
    rows: Array<Partial<LedgerRow> | ParsedLedgerRow>
  ): Omit<LedgerRow, 'matchedNameKo' | 'matchedNameEn' | 'matchSource' | 'id'>[] =>
    rows.map((row) => {
      const r = row as LedgerRow;
      return {
        voucherNo: norm(r.voucherNo),
        voucherDate: norm(r.voucherDate),
        accountCode: norm(r.accountCode),
        accountNameTally: norm(r.accountNameTally),
        accountNameHqKo: norm(r.accountNameHqKo),
        accountNameHqEn: norm(r.accountNameHqEn),
        amountInr: Number(r.amountInr) || 0,
        amountKrw: Number(r.amountKrw) || 0,
        costCategory: norm(r.costCategory),
        clientName: norm(r.clientName),
        narration: norm(r.narration),
        division: norm(r.division),
        month: norm(r.month),
        gsIndiaCost: norm(r.gsIndiaCost),
      };
    });

  const rawUploaded = toRaw(uploaded);
  if (mode === 'append') {
    return matchLedgerRows([...toRaw(priorLedger), ...rawUploaded], accounts);
  }
  return matchLedgerRows(rawUploaded, accounts);
}

export function matchLedgerRows(
  rows: Omit<LedgerRow, 'matchedNameKo' | 'matchedNameEn' | 'matchSource' | 'id'>[],
  accounts: GasAccount[]
): LedgerRow[] {
  const lookups = buildAccountLookups(accounts);
  const byTally = loadTallyAccountMap();

  // 1) 같은 배치(업로드 파일) 다수결 → 오매핑 행 교정용
  const batchConsensus = buildBatchConsensusMap(rows);
  batchConsensus.forEach((ref, key) => {
    // consensus map keys are already normKey'd
    const prev = byTally.get(key);
    byTally.set(key, {
      accountCode: ref.accountCode || prev?.accountCode || '',
      nameKo: ref.nameKo,
      nameEn: ref.nameEn || prev?.nameEn || '',
      costCategory: ref.costCategory || prev?.costCategory || '',
      clientName: ref.clientName || prev?.clientName || '',
      gsIndiaCost: ref.gsIndiaCost || prev?.gsIndiaCost || '',
      division: ref.division || prev?.division || '',
    });
  });

  // 2) 이전 누계 + 현재 배치 soft 학습 (모순 행은 Client/Cost 키에 반영 안 함)
  mergeTallyRefsIntoMap(byTally, rows);

  const matched = rows.map((row, idx) => {
    const costCategoryRaw = norm(row.costCategory);
    const rowClient = norm(row.clientName);
    const rowTally = norm(row.accountNameTally);
    const skipExpenseMap = isNonExpenseLedgerName(rowTally);

    const batchHitRaw = skipExpenseMap
      ? undefined
      : resolveBatchConsensus(batchConsensus, {
          clientName: rowClient,
          costCategory: costCategoryRaw,
          accountNameTally: rowTally,
        });
    const priorRaw = skipExpenseMap
      ? undefined
      : resolvePriorLedgerMapping(byTally, {
          clientName: rowClient,
          costCategory: costCategoryRaw,
          accountNameTally: rowTally,
          accountNameHqEn: row.accountNameHqEn,
        });

    // Cost Category 와 모순되는 학습값(Rental←Travel 등)은 폐기
    const batchHit =
      batchHitRaw &&
      !costCategoryConflictsAccount(costCategoryRaw, batchHitRaw.nameKo, batchHitRaw.nameEn)
        ? batchHitRaw
        : undefined;
    const prior =
      priorRaw &&
      !costCategoryConflictsAccount(costCategoryRaw, priorRaw.nameKo, priorRaw.nameEn)
        ? priorRaw
        : undefined;

    const fileKo = pickStrongHqKo(row.accountNameHqKo, (row as LedgerRow).matchedNameKo);
    const fileEn = norm(row.accountNameHqEn);
    const fileConflicts =
      Boolean(fileKo || fileEn) &&
      costCategoryConflictsAccount(costCategoryRaw, fileKo, fileEn);
    const effectiveFileKo = fileConflicts ? '' : fileKo;

    // 배치 다수결 > 이전 학습 > Cost Category GAS > 파일 > 일반 GAS
    const batchKo = pickStrongHqKo(batchHit?.nameKo);
    const priorKo = pickStrongHqKo(prior?.nameKo);
    const gasFromCost =
      !skipExpenseMap && !batchKo && !priorKo && costCategoryRaw
        ? findGasByCostCategory(accounts, costCategoryRaw)
        : undefined;

    const preferTrusted = Boolean(batchKo || priorKo || gasFromCost);

    const { gas, source: gasSource } = preferTrusted
      ? {
          gas: gasFromCost,
          source: gasFromCost ? ('english' as LedgerRow['matchSource']) : undefined,
        }
      : findGasAccountForRow(
          { ...row, accountNameHqKo: effectiveFileKo || row.accountNameHqKo },
          lookups,
          prior
        );

    const accountCode =
      row.accountCode || batchHit?.accountCode || prior?.accountCode || gas?.accountCode || '';
    const accountNameHqKo = skipExpenseMap
      ? effectiveFileKo || ''
      : pickStrongHqKo(batchKo, priorKo, gasFromCost?.nameKo, preferTrusted ? '' : effectiveFileKo, gas?.nameKo) ||
        (preferTrusted ? '' : effectiveFileKo) ||
        '';
    const accountNameHqEn = skipExpenseMap
      ? fileEn || rowTally || ''
      : preferTrusted
        ? norm(batchHit?.nameEn) ||
          norm(prior?.nameEn) ||
          norm(gasFromCost?.nameEn) ||
          norm(gas?.nameEn) ||
          (fileConflicts ? '' : fileEn) ||
          rowTally ||
          ''
        : fileEn || norm(gas?.nameEn) || norm(prior?.nameEn) || rowTally || '';

    // Client / Cost Category / GS India 는 원본 행 값만 유지 (학습값으로 빈칸 채우지 않음)
    const costCategory = costCategoryRaw;
    const clientName = rowClient;
    const gsIndiaCost = norm(row.gsIndiaCost);
    const division = norm(row.division) || '';

    let matchSource: LedgerRow['matchSource'] = 'none';
    if (!skipExpenseMap && (batchKo || priorKo)) matchSource = 'file';
    else if (!skipExpenseMap && (gasFromCost || (gas && gasSource))) matchSource = gasSource || 'english';
    else if (effectiveFileKo || (accountNameHqKo && accountCode)) matchSource = 'file';

    const learnKeys: Array<string | undefined> = [rowTally, accountNameHqEn];
    const forceFromTrusted = Boolean(!skipExpenseMap && accountNameHqKo && preferTrusted);
    if (!skipExpenseMap && accountNameHqKo && (forceFromTrusted || effectiveFileKo)) {
      if (clientName) learnKeys.push(clientName);
      if (costCategory) learnKeys.push(costCategory);
    }

    learnLedgerAliases(
      byTally,
      learnKeys,
      {
        accountCode,
        nameKo: accountNameHqKo,
        nameEn: accountNameHqEn,
        costCategory,
        clientName,
        gsIndiaCost,
        division,
      },
      { forceNameKo: forceFromTrusted }
    );

    return {
      ...row,
      accountCode,
      accountNameHqKo,
      accountNameHqEn,
      costCategory,
      clientName,
      gsIndiaCost,
      division,
      id: `${idx}-${row.voucherNo}-${row.voucherDate}-${accountCode}-${row.amountInr}-${row.accountNameTally}`,
      matchedNameKo: accountNameHqKo,
      matchedNameEn: accountNameHqEn || rowTally || '',
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

/** 오염된 Tally↔HQ 학습 매핑만 제거 (계정·원가 행은 유지) */
export function clearGsEncTallyAccountMap(): void {
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
