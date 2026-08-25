/**
 * GS E&C 원가내역 PDF 임포트
 * - 텍스트 레이어가 있는 표 PDF만 지원 (엑셀→PDF, 텍스트 추출 가능 문서)
 * - PDF 헤더 X좌표 → 리스트 컬럼 매핑 후 행 생성
 * - 스캔/이미지 PDF, html2canvas로 만든 이미지 PDF는 불가
 */

import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';
import { buildParsedLedgerRowFromFields } from './gsEncCostAnalysis';
import { matchLedgerImportHeader, type LedgerImportField } from './gsEncCostLedgerImportMap';

type TextItem = { str: string; x: number; y: number; w: number };

type PdfColumn = {
  field: LedgerImportField;
  xMin: number;
  xMax: number;
};

const Y_TOLERANCE = 3.5;
const MIN_HEADER_MATCHES = 3;

let workerReady = false;

function ensurePdfWorker() {
  if (workerReady) return;
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
  workerReady = true;
}

function clusterRows(items: TextItem[]): TextItem[][] {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  let current: TextItem[] = [];
  let currentY = sorted[0].y;

  for (const item of sorted) {
    if (Math.abs(item.y - currentY) <= Y_TOLERANCE) {
      current.push(item);
    } else {
      if (current.length) rows.push(current);
      current = [item];
      currentY = item.y;
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

function scoreHeaderRow(items: TextItem[]): number {
  let score = 0;
  for (const item of items) {
    if (matchLedgerImportHeader(item.str)) score += 1;
  }
  return score;
}

function buildPdfColumns(headerItems: TextItem[]): PdfColumn[] {
  const headers = headerItems
    .map((item) => ({
      item,
      field: matchLedgerImportHeader(item.str),
    }))
    .filter((h): h is { item: TextItem; field: LedgerImportField } => h.field != null)
    .sort((a, b) => a.item.x - b.item.x);

  const seen = new Set<LedgerImportField>();
  const unique = headers.filter((h) => {
    if (seen.has(h.field)) return false;
    seen.add(h.field);
    return true;
  });

  if (unique.length < MIN_HEADER_MATCHES) return [];

  const cols: PdfColumn[] = [];
  for (let i = 0; i < unique.length; i += 1) {
    const cur = unique[i];
    const prev = unique[i - 1];
    const next = unique[i + 1];
    const curEnd = cur.item.x + (cur.item.w || cur.item.str.length * 4);
    const xCenter = cur.item.x + (cur.item.w || cur.item.str.length * 4) / 2;
    const prevEnd = prev ? prev.item.x + (prev.item.w || prev.item.str.length * 4) : cur.item.x - 40;
    const nextStart = next ? next.item.x : curEnd + 120;
    const xMin = i === 0 ? Math.max(0, cur.item.x - 24) : (prevEnd + xCenter) / 2;
    const xMax = i === unique.length - 1 ? nextStart + 600 : (xCenter + nextStart) / 2;
    cols.push({ field: cur.field, xMin, xMax });
  }
  return cols;
}

function extractRowFields(items: TextItem[], columns: PdfColumn[]): Partial<Record<LedgerImportField, unknown>> {
  const fields: Partial<Record<LedgerImportField, string>> = {};
  const sorted = [...items].sort((a, b) => a.x - b.x);

  for (const item of sorted) {
    const text = item.str.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const mid = item.x + (item.w || text.length * 4) / 2;
    const col = columns.find((c) => mid >= c.xMin && mid < c.xMax);
    if (!col) continue;
    fields[col.field] = fields[col.field] ? `${fields[col.field]} ${text}` : text;
  }
  return fields;
}

function detectFxRate(rows: TextItem[][]): number {
  for (let i = 0; i < Math.min(rows.length, 8); i += 1) {
    for (const item of rows[i] || []) {
      const raw = item.str.replace(/,/g, '');
      const n = Number(raw);
      if (n > 1 && n < 100 && raw.includes('.')) return n;
    }
  }
  return 0;
}

type ParsedLedgerRow = NonNullable<ReturnType<typeof buildParsedLedgerRowFromFields>>;

async function extractPdfRows(buffer: ArrayBuffer): Promise<{
  rows: ParsedLedgerRow[];
  detectedFxRate: number;
}> {
  ensurePdfWorker();
  const pdf = await getDocument({ data: buffer }).promise;
  const parsedRows: ParsedLedgerRow[] = [];
  let detectedFxRate = 0;
  let columns: PdfColumn[] = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const items: TextItem[] = [];

    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const str = String(raw.str || '');
      if (!str.trim()) continue;
      const tr = raw.transform || [1, 0, 0, 1, 0, 0];
      items.push({
        str,
        x: Number(tr[4]) || 0,
        y: Number(tr[5]) || 0,
        w: Number((raw as { width?: number }).width) || str.length * 4,
      });
    }

    const pageRows = clusterRows(items);
    if (!detectedFxRate) detectedFxRate = detectFxRate(pageRows);

    let headerIdx = -1;
    let headerScore = 0;
    for (let i = 0; i < Math.min(pageRows.length, 50); i += 1) {
      const score = scoreHeaderRow(pageRows[i]);
      if (score > headerScore) {
        headerScore = score;
        headerIdx = i;
      }
    }

    if (headerIdx < 0 || headerScore < MIN_HEADER_MATCHES) continue;

    const pageColumns = buildPdfColumns(pageRows[headerIdx]);
    if (pageColumns.length >= MIN_HEADER_MATCHES) {
      columns = pageColumns;
    }
    if (!columns.length) continue;

    for (let r = headerIdx + 1; r < pageRows.length; r += 1) {
      const rowItems = pageRows[r];
      if (!rowItems.length) continue;
      if (scoreHeaderRow(rowItems) >= MIN_HEADER_MATCHES) continue;

      const fields = extractRowFields(rowItems, columns);
      const row = buildParsedLedgerRowFromFields(fields);
      if (row) parsedRows.push(row);
    }
  }

  return { rows: parsedRows, detectedFxRate };
}

export async function parseLedgerPdf(buffer: ArrayBuffer): Promise<{
  rows: ParsedLedgerRow[];
  detectedFxRate: number;
}> {
  const parsed = await extractPdfRows(buffer);
  if (!parsed.rows.length) {
    const pdf = await getDocument({ data: buffer }).promise;
    let textLen = 0;
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      for (const raw of content.items) {
        if ('str' in raw) textLen += String(raw.str || '').length;
      }
    }
    if (textLen < 40) throw new Error('PDF_IMAGE_ONLY');
    throw new Error('PDF_NO_TABLE');
  }
  return parsed;
}

export function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}
