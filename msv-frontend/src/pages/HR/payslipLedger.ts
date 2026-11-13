import type { PayrollGridRow } from './payroll/payrollGridTypes';
import {
  formatOtHourDisplay,
  resolvePayslipProratedPackageParts,
} from './payroll/payrollGridUtils';
import { loadPayrollColumnPrefs } from './payroll/payrollColumnPrefs';
import { loadPayrollSalaryRatios } from './payroll/payrollSalaryRatios';

export type PayslipLedgerLine = { label: string; amount: number; highlight?: boolean };

export type PayslipLedgerLabelSet = {
  foodAllowance: string;
  dayOt: string;
  extraAllowance: string;
  pfEmployee: string;
  esicEmployee: string;
  pt: string;
  tds: string;
  deductMonth: string;
};

export type PayslipLedger = {
  earningItems: PayslipLedgerLine[];
  deductionItems: PayslipLedgerLine[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
};

function parseMoney(v: string | number | undefined | null): number {
  if (v === '' || v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * 명세서 Earnings/Deductions 금액.
 * - 패키지(기본급·HRA·기타·상수): 무급휴가 일할 (sum_total과 동일)
 * - OT·식대·커스텀 수당: 전액
 * - Net = Gross − Total Deductions
 */
export function buildPayslipLedger(
  row: PayrollGridRow,
  labels: PayslipLedgerLabelSet,
  companyId?: string | number | null
): PayslipLedger {
  const dayHours = parseMoney(row.day_ot_hour);
  const otRate = parseMoney(row.ot_rate);
  const otPayTotal = Math.floor(dayHours * otRate);
  const grossPay = parseMoney(row.sum_total);

  const pfEmp = parseMoney(row.pf_employee);
  const esicEmp = parseMoney(row.esic_employee);
  const tdsAmt = parseMoney(row.tds);
  const ptAmt = parseMoney(row.pt);
  const statutory = pfEmp + esicEmp + tdsAmt + ptAmt;
  const deductField = Math.max(0, parseMoney(row.deduct_this_month));
  // deductions가 총공제면 그대로, 선공제(advance)만이면 법정 공제에 가산 (서버 resolvePayrollNetSalary와 동일)
  const totalDeductions =
    deductField >= statutory ? deductField : statutory + deductField;
  const otherDeduct =
    deductField >= statutory ? Math.max(0, deductField - statutory) : deductField;
  const storedNet = parseMoney(row.net_salary_payable);
  const recomputedNet = Math.max(0, Math.floor(grossPay - totalDeductions));
  const netPay =
    storedNet === recomputedNet || Math.abs(storedNet - recomputedNet) < 1
      ? storedNet
      : recomputedNet;

  const dayOtLabel =
    dayHours > 0 ? `${labels.dayOt} (${formatOtHourDisplay(dayHours)}h)` : labels.dayOt;

  const customLines = Array.isArray(row.payslip_earning_lines) ? row.payslip_earning_lines : [];
  const earningItems: PayslipLedgerLine[] = customLines.length
    ? customLines.map((line) => ({
        label: line.label,
        amount: Math.max(0, Number(line.amount) || 0),
        highlight: line.highlight,
      }))
    : (() => {
        const ratios = loadPayrollSalaryRatios(companyId);
        const prorated = resolvePayslipProratedPackageParts(row);
        const lines: PayslipLedgerLine[] = [];

        for (const part of ratios.parts) {
          let amount = 0;
          if (part.id === 'basic_salary') amount = prorated.basic;
          else if (part.id === 'house_rent_allowance') amount = prorated.hra;
          else if (part.id === 'other_allowance') amount = prorated.other;
          else amount = Number(prorated.constant_parts[part.id]) || 0;
          lines.push({ label: part.label, amount });
        }

        const known = new Set(ratios.parts.map((p) => p.id));
        Object.entries(prorated.constant_parts).forEach(([id, amount]) => {
          if (known.has(id) || !(Number(amount) > 0)) return;
          lines.push({ label: id.replace(/_/g, ' '), amount: Number(amount) || 0 });
        });

        if (Number(row.food_allowance) > 0) {
          lines.push({ label: labels.foodAllowance, amount: Number(row.food_allowance) || 0 });
        }
        if (dayHours > 0) {
          lines.push({ label: dayOtLabel, amount: otPayTotal, highlight: true });
        } else if (dayHours === 0 && otPayTotal === 0) {
          lines.push({ label: labels.dayOt, amount: 0, highlight: true });
        }
        if (Number(row.transport_allowance) > 0) {
          lines.push({
            label: labels.extraAllowance,
            amount: Number(row.transport_allowance) || 0,
            highlight: true,
          });
        }

        const prefs = loadPayrollColumnPrefs(companyId);
        const shown = new Set<string>();
        for (const col of prefs.customColumns) {
          const amount = Number(row.custom_allowances?.[col.id]) || 0;
          if (amount <= 0) continue;
          shown.add(col.id);
          let label = col.label;
          const isCountFormula =
            col.inputMode === 'count' && Boolean(String(col.formula || '').trim());
          if (isCountFormula) {
            const count = Math.max(
              0,
              Math.floor(Number(row.custom_allowance_inputs?.[col.id]) || 0)
            );
            if (count > 0) label = `${col.label} (${count})`;
          }
          lines.push({ label, amount, highlight: true });
        }
        Object.entries(row.custom_allowances || {}).forEach(([key, amount]) => {
          if (shown.has(key) || !(Number(amount) > 0)) return;
          lines.push({
            label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            amount: Number(amount) || 0,
            highlight: true,
          });
        });

        return lines;
      })();

  const deductionItems: PayslipLedgerLine[] = [
    { label: labels.pfEmployee, amount: pfEmp },
    { label: labels.esicEmployee, amount: esicEmp },
    { label: labels.pt, amount: ptAmt },
    { label: labels.tds, amount: tdsAmt },
  ];
  if (otherDeduct > 0) {
    deductionItems.push({ label: labels.deductMonth, amount: otherDeduct });
  }

  return { earningItems, deductionItems, grossPay, totalDeductions, netPay };
}
