import { type PayrollCustomColumn } from './payrollColumnPrefs';
import type { PayrollGridRow } from './payrollGridTypes';
import {
  countEditProps,
  numberEditProps,
  otHourEditProps,
  roundOtHour,
} from './payrollGridUtils';

export type PayrollCellAnchor = { rowId: number | string; field: string };

const NUMERIC_FIELDS = new Set([
  'total_salary',
  'total_day_of_month',
  'unpaid_leave',
  'basic_salary',
  'house_rent_allowance',
  'other_allowance',
]);

export function isPayrollGridCellEditable(
  field: string,
  row: PayrollGridRow,
  options: {
    allowCellEdit: boolean;
    allowConstantsEdit: boolean;
    isRoot: boolean;
    lockedPeriods: Set<string>;
  }
): boolean {
  if (!options.allowCellEdit) return false;
  if (
    field === 'pf_employer' ||
    field === 'days_worked' ||
    field === 'sum_total' ||
    field === 'net_salary_payable' ||
    field === 'pt' ||
    field === 'ot_rate' ||
    field === 'esic_employee' ||
    field === 'esic_employer' ||
    field === 'pf_employee' ||
    field === 'emp_id' ||
    field === 'employee_email' ||
    field === 'working_month' ||
    field === 'row_no' ||
    field === 'actions'
  ) {
    return false;
  }
  if (
    (field === 'basic_salary' ||
      field === 'house_rent_allowance' ||
      field === 'other_allowance' ||
      field.startsWith('const__')) &&
    !options.allowConstantsEdit
  ) {
    return false;
  }
  if (options.isRoot) return true;
  const period = String(row.working_month || '').trim();
  if (!period) return true;
  return !options.lockedPeriods.has(period);
}

function customColumnByField(
  field: string,
  customColumns: PayrollCustomColumn[]
): PayrollCustomColumn | undefined {
  if (!field.startsWith('custom__')) return undefined;
  const id = field.slice('custom__'.length);
  return customColumns.find((c) => c.id === id);
}

export function parsePayrollFieldInput(
  field: string,
  raw: string,
  customColumns: PayrollCustomColumn[]
): unknown {
  const trimmed = raw.trim();
  if (field === 'day_ot_hour') return otHourEditProps.valueParser(trimmed);

  const custom = customColumnByField(field, customColumns);
  if (custom) {
    if (custom.inputMode === 'count' && String(custom.formula || '').trim()) {
      return countEditProps.valueParser(trimmed);
    }
    return numberEditProps.valueParser(trimmed);
  }

  if (field.startsWith('const__') || NUMERIC_FIELDS.has(field)) {
    return numberEditProps.valueParser(trimmed);
  }

  return trimmed;
}

export function patchPayrollRowField(
  row: PayrollGridRow,
  field: string,
  value: unknown,
  customColumns: PayrollCustomColumn[]
): PayrollGridRow {
  const next = { ...row };

  if (field === 'day_ot_hour') {
    const n = roundOtHour(Number(value) || 0);
    next.day_ot_hour = n;
    if (n > 0) next.ot_manual = true;
    return next;
  }

  const custom = customColumnByField(field, customColumns);
  if (custom) {
    const n = typeof value === 'number' ? value : Number(value) || 0;
    if (custom.inputMode === 'count' && String(custom.formula || '').trim()) {
      return {
        ...next,
        custom_allowance_inputs: {
          ...(next.custom_allowance_inputs || {}),
          [custom.id]: Math.max(0, Math.floor(n)),
        },
      };
    }
    return {
      ...next,
      custom_allowances: {
        ...(next.custom_allowances || {}),
        [custom.id]: Math.max(0, Math.floor(n)),
      },
    };
  }

  if (field.startsWith('const__')) {
    const id = field.slice('const__'.length);
    const n = typeof value === 'number' ? value : Number(value) || 0;
    return {
      ...next,
      constant_parts: {
        ...(next.constant_parts || {}),
        [id]: Math.max(0, Math.floor(n)),
      },
    };
  }

  if (NUMERIC_FIELDS.has(field)) {
    const n = typeof value === 'number' ? value : Number(value) || 0;
    return { ...next, [field]: Math.max(0, Math.floor(n)) } as PayrollGridRow;
  }

  return { ...next, [field]: String(value ?? '') } as PayrollGridRow;
}

export function parsePayrollColumnPasteLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.split('\t')[0] ?? '');
}

export function getPayrollCellCopyText(
  row: PayrollGridRow | undefined,
  field: string,
  customColumns: PayrollCustomColumn[]
): string {
  if (!row) return '';
  if (field.startsWith('custom__')) {
    const custom = customColumnByField(field, customColumns);
    if (custom?.inputMode === 'count' && String(custom.formula || '').trim()) {
      return String(row.custom_allowance_inputs?.[custom.id] ?? 0);
    }
    if (custom) return String(row.custom_allowances?.[custom.id] ?? 0);
  }
  if (field.startsWith('const__')) {
    const id = field.slice('const__'.length);
    return String(row.constant_parts?.[id] ?? 0);
  }
  const raw = (row as Record<string, unknown>)[field];
  if (raw === null || raw === undefined) return '';
  return String(raw);
}
