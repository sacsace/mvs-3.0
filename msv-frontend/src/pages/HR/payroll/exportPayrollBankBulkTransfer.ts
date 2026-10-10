import ExcelJS from 'exceljs';
import type { PayrollGridRow } from './payrollGridTypes';
import { downloadExcelWorkbook } from '../../../utils/excelExportStyle';

/** 인도 법인 은행 대량송금 업로드 대상 */
export type PayrollBulkBankId = 'hana' | 'shinhan' | 'kotak' | 'icici';

export const PAYROLL_BULK_BANKS: Array<{
  id: PayrollBulkBankId;
  /** IFSC 앞 4자리 (동일 은행 내 이체 판별) */
  ifscPrefix: string;
}> = [
  { id: 'hana', ifscPrefix: 'HNBE' },
  { id: 'shinhan', ifscPrefix: 'SHBK' },
  { id: 'kotak', ifscPrefix: 'KKBK' },
  { id: 'icici', ifscPrefix: 'ICIC' },
];

export type PayrollBankBulkExportOptions = {
  bankId: PayrollBulkBankId;
  /** 회사 출금 계좌 (비어 있으면 엑셀에 공란) */
  debitAccount?: string;
  /** YYYY-MM */
  payrollPeriod: string;
  /** 파일명·Remarks용 라벨 */
  bankLabel: string;
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFC6EFCE' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 9,
  bold: true,
  color: { argb: 'FF000000' },
};

function toInt(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function cleanText(value: unknown, maxLen?: number): string {
  let s = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // 은행 업로드: 특수문자 최소화
  s = s.replace(/[,"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (maxLen != null && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

function ifscOf(row: PayrollGridRow): string {
  return cleanText(row.ifsc, 11).toUpperCase();
}

function isSameBank(ifsc: string, prefix: string): boolean {
  return ifsc.length >= 4 && ifsc.slice(0, 4) === prefix.toUpperCase();
}

function salaryRemark(period: string, empId: string): string {
  const ym = String(period || '').trim() || 'Salary';
  const id = cleanText(empId, 12);
  return cleanText(`Salary ${ym}${id ? ` ${id}` : ''}`, 30);
}

function eligibleRows(rows: PayrollGridRow[]): PayrollGridRow[] {
  return rows.filter((row) => {
    const amount = toInt(row.net_salary_payable);
    const account = cleanText(row.bank_account);
    const ifsc = ifscOf(row);
    const name = cleanText(row.employee_name);
    return amount > 0 && account.length > 0 && ifsc.length === 11 && name.length > 0;
  });
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB4B4B4' } },
      left: { style: 'thin', color: { argb: 'FFB4B4B4' } },
      bottom: { style: 'thin', color: { argb: 'FFB4B4B4' } },
      right: { style: 'thin', color: { argb: 'FFB4B4B4' } },
    };
  });
}

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  dataRows: Array<Array<string | number>>
) {
  const sheet = workbook.addWorksheet(name.slice(0, 31));
  const headerRow = sheet.addRow(headers);
  styleHeader(headerRow);
  for (const values of dataRows) {
    const row = sheet.addRow(values);
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1] || '';
      const isAmount = /amount/i.test(header);
      if (isAmount && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        if (typeof cell.value === 'number') cell.value = String(cell.value);
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  }
  if (dataRows.length === 0) {
    sheet.addRow(['(no eligible rows — check account / IFSC / net pay)']);
  }
}

/** ICICI CIB PAB-SAL 계열 (엑셀) */
function buildIciciRows(
  rows: PayrollGridRow[],
  debitAccount: string,
  period: string
): { headers: string[]; data: Array<Array<string | number>> } {
  const headers = [
    'Beneficiary Name',
    'Debit Account No',
    'Beneficiary Account No',
    'IFSC',
    'Amount',
    'Network Type',
    'Remarks',
  ];
  const data = rows.map((row) => {
    const ifsc = ifscOf(row);
    const network = isSameBank(ifsc, 'ICIC') ? 'WIB' : 'NFT';
    return [
      cleanText(row.employee_name, 32),
      cleanText(debitAccount, 34),
      cleanText(row.bank_account, 34),
      ifsc,
      toInt(row.net_salary_payable),
      network,
      salaryRemark(period, row.emp_id),
    ];
  });
  return { headers, data };
}

/** Kotak / 일반 NEFT 벌크 (헤더 행 포함 엑셀) */
function buildKotakRows(
  rows: PayrollGridRow[],
  debitAccount: string,
  period: string
): { headers: string[]; data: Array<Array<string | number>> } {
  const headers = [
    'Payment Type',
    'Debit Account Number',
    'Beneficiary Name',
    'Beneficiary Account Number',
    'IFSC Code',
    'Amount',
    'Currency',
    'Remarks',
    'Email',
  ];
  const data = rows.map((row) => {
    const ifsc = ifscOf(row);
    const paymentType = isSameBank(ifsc, 'KKBK') ? 'IFT' : 'NEFT';
    return [
      paymentType,
      cleanText(debitAccount, 24),
      cleanText(row.employee_name, 40),
      cleanText(row.bank_account, 24),
      ifsc,
      toInt(row.net_salary_payable),
      'INR',
      salaryRemark(period, row.emp_id),
      cleanText(row.employee_email, 80),
    ];
  });
  return { headers, data };
}

/** 신한은행 인도 — 법인 대량 NEFT/IFT 엑셀 */
function buildShinhanRows(
  rows: PayrollGridRow[],
  debitAccount: string,
  period: string
): { headers: string[]; data: Array<Array<string | number>> } {
  const headers = [
    'Sr No',
    'Beneficiary Name',
    'Beneficiary Account Number',
    'IFSC Code',
    'Amount',
    'Payment Mode',
    'Debit Account Number',
    'Remarks',
    'Employee Code',
  ];
  const data = rows.map((row, index) => {
    const ifsc = ifscOf(row);
    const mode = isSameBank(ifsc, 'SHBK') ? 'IFT' : 'NEFT';
    return [
      index + 1,
      cleanText(row.employee_name, 50),
      cleanText(row.bank_account, 34),
      ifsc,
      toInt(row.net_salary_payable),
      mode,
      cleanText(debitAccount, 34),
      salaryRemark(period, row.emp_id),
      cleanText(row.emp_id, 20).toUpperCase(),
    ];
  });
  return { headers, data };
}

/** 하나은행 인도 — 법인 대량 NEFT/IFT 엑셀 */
function buildHanaRows(
  rows: PayrollGridRow[],
  debitAccount: string,
  period: string
): { headers: string[]; data: Array<Array<string | number>> } {
  const headers = [
    'Serial No',
    'Beneficiary Name',
    'Account Number',
    'IFSC',
    'Amount',
    'Transfer Type',
    'Debit Account',
    'Narration',
    'Emp ID',
  ];
  const data = rows.map((row, index) => {
    const ifsc = ifscOf(row);
    const transferType = isSameBank(ifsc, 'HNBE') ? 'WITHIN' : 'NEFT';
    return [
      index + 1,
      cleanText(row.employee_name, 50),
      cleanText(row.bank_account, 34),
      ifsc,
      toInt(row.net_salary_payable),
      transferType,
      cleanText(debitAccount, 34),
      salaryRemark(period, row.emp_id),
      cleanText(row.emp_id, 20).toUpperCase(),
    ];
  });
  return { headers, data };
}

export function countEligiblePayrollBankRows(rows: PayrollGridRow[]): number {
  return eligibleRows(rows).length;
}

/**
 * 급여 확정 후 은행 포털 대량 업로드용 엑셀 생성.
 * 직원 전원을 선택 은행 포맷으로 내보냅니다(출금 은행 = 선택 은행).
 */
export async function exportPayrollBankBulkTransfer(
  rows: PayrollGridRow[],
  options: PayrollBankBulkExportOptions
): Promise<{ exported: number; skipped: number }> {
  const eligible = eligibleRows(rows);
  const skipped = Math.max(0, rows.length - eligible.length);
  const debit = cleanText(options.debitAccount, 34);
  const period = String(options.payrollPeriod || '').trim();

  let headers: string[];
  let data: Array<Array<string | number>>;
  switch (options.bankId) {
    case 'icici':
      ({ headers, data } = buildIciciRows(eligible, debit, period));
      break;
    case 'kotak':
      ({ headers, data } = buildKotakRows(eligible, debit, period));
      break;
    case 'shinhan':
      ({ headers, data } = buildShinhanRows(eligible, debit, period));
      break;
    case 'hana':
    default:
      ({ headers, data } = buildHanaRows(eligible, debit, period));
      break;
  }

  const workbook = new ExcelJS.Workbook();
  addSheet(workbook, 'Bulk Transfer', headers, data);

  const bankSlug = options.bankId;
  const periodSlug = period.replace(/[^\d-]/g, '') || 'payroll';
  await downloadExcelWorkbook(
    workbook,
    `payroll_bulk_${bankSlug}_${periodSlug}.xlsx`,
    { rowHeight: 18 }
  );

  return { exported: eligible.length, skipped };
}
