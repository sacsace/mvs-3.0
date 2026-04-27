import type { PayrollGridRow } from './payrollGridTypes';

/** 합계(Sum Total) 기준 ESI 적용 상한 — 이 금액 이하이면 직원 0.75%·사업주 3.25% 자동 */
export const ESI_GROSS_CEILING_INR = 21000;

function num(v: unknown, fallback = 0): number {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/** 인도 루피 2자리 반올림 (msv-server `indianStatutoryPayroll.rupee` 와 동일) */
export function roundInr(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 근무일수 = 월 총일 − 무급휴가 (0 ~ 월 총일로 클램프, 정수) */
export function derivedDaysWorkedFromCalendarAndUnpaid(
  totalDayOfMonth: unknown,
  unpaidLeave: unknown
): number {
  const calendarDays = Math.max(1, num(totalDayOfMonth) || 30);
  const unpaid = Math.max(0, num(unpaidLeave));
  const raw = Math.round(calendarDays - unpaid);
  return Math.min(Math.max(0, raw), calendarDays);
}

export function derivedDaysWorkedString(totalDayOfMonth: unknown, unpaidLeave: unknown): string {
  return String(derivedDaysWorkedFromCalendarAndUnpaid(totalDayOfMonth, unpaidLeave));
}

/**
 * Sum Total(합계) = (월 기본급 / 해당 월 총일) × 근무일 + OT
 * — 근무일은 월 총일−무급휴가로만 산정(수정 불가).
 *
 * 실수령 = 합계 − PF(직원) − ESIC(직원) − TDS − PT − 기타공제(deduct_this_month)
 * — 그리드에서 PF/ESIC/TDS/PT는 사용자 입력값을 존중(서버 자동 추정과 별개).
 */
export function recalculatePayrollRow(row: PayrollGridRow): PayrollGridRow {
  const basic = num(row.basic_salary);
  const overtimePay = num(row.overtime);
  const calendarDays = Math.max(1, num(row.total_day_of_month) || 30);
  const worked = derivedDaysWorkedFromCalendarAndUnpaid(row.total_day_of_month, row.unpaid_leave);
  const days_worked = String(worked);
  const proratedBasic = roundInr((basic * worked) / calendarDays);
  const sum_total = roundInr(proratedBasic + overtimePay);

  const pf = num(row.pf_employee);
  const pfEmployerStr =
    row.pf_employee === '' || row.pf_employee == null ? '' : String(roundInr(pf));

  let esicEmployeeStr = String(row.esic_employee ?? '');
  let esicEmployerStr = String(row.esic_employer ?? '');
  if (sum_total <= ESI_GROSS_CEILING_INR) {
    esicEmployeeStr = String(roundInr(sum_total * 0.0075));
    esicEmployerStr = String(roundInr(sum_total * 0.0325));
  }

  const esicE = num(esicEmployeeStr);
  const tds = num(row.tds);
  const pt = num(row.pt);
  const other = num(row.deduct_this_month);
  const net_salary_payable = roundInr(sum_total - pf - esicE - tds - pt - other);

  return {
    ...row,
    days_worked,
    sum_total,
    pf_employer: pfEmployerStr,
    esic_employee: esicEmployeeStr,
    esic_employer: esicEmployerStr,
    net_salary_payable
  };
}

/** 표시용 천 단위 콤마 (인도 루피 표기 관례) */
export function formatNumberDisplay(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value ?? '');
  return n.toLocaleString('en-IN');
}

export function formatMaybeNumericString(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '';
  const n = parseFloat(String(value).replace(/,/g, ''));
  if (Number.isFinite(n)) return n.toLocaleString('en-IN');
  return String(value);
}

function stripCommaField(s: string): string {
  return String(s).replace(/,/g, '').trim();
}

export const numberEditProps = {
  type: 'number' as const,
  valueFormatter: (value: unknown) => formatNumberDisplay(value),
  valueParser: (value: unknown) => {
    if (value === '' || value == null) return 0;
    const n = parseFloat(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
};

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function ex(p: Record<string, unknown> | null | undefined, key: string): string {
  if (!p || typeof p !== 'object') return '';
  return str((p as Record<string, unknown>)[key]);
}

/** 입사일 ~ 급여 근무월 말일 기준 근속 개월수 (입사일이 근무월 이후면 0) */
export function computeTenureMonths(joiningDateStr: string, workingMonthYm: string): number {
  const j = String(joiningDateStr || '')
    .trim()
    .split('T')[0];
  const wm = String(workingMonthYm || '').trim();
  if (!j || !wm) return 0;
  const jd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(j);
  const pm = /^(\d{4})-(\d{2})$/.exec(wm);
  if (!jd || !pm) return 0;
  const jy = parseInt(jd[1], 10);
  const jmo = parseInt(jd[2], 10) - 1;
  const jDay = parseInt(jd[3], 10);
  const py = parseInt(pm[1], 10);
  const pmo = parseInt(pm[2], 10) - 1;
  const periodEnd = new Date(py, pmo + 1, 0);
  const join = new Date(jy, jmo, jDay);
  if (join > periodEnd) return 0;
  let months =
    (periodEnd.getFullYear() - join.getFullYear()) * 12 + (periodEnd.getMonth() - join.getMonth());
  if (periodEnd.getDate() < join.getDate()) months -= 1;
  return Math.max(0, months);
}

export function payrollRecordToGridRow(p: any, index: number): PayrollGridRow {
  const x = (p.extra_fields && typeof p.extra_fields === 'object' ? p.extra_fields : {}) as Record<
    string,
    unknown
  >;
  const emp = p.employee || {};
  const joining =
    ex(x, 'joining_date') || (emp.hire_date ? String(emp.hire_date).split('T')[0] : '');
  const workingMonth = ex(x, 'working_month') || str(p.payroll_period);
  const gross = num(p.gross_salary);
  const pfEmp = ex(x, 'pf_employee');
  const pfEmprSynced = pfEmp === '' ? ex(x, 'pf_employer') : String(roundInr(num(pfEmp)));
  let esicEmp = ex(x, 'esic_employee');
  let esicEmpr = ex(x, 'esic_employer');
  if (gross <= ESI_GROSS_CEILING_INR) {
    esicEmp = String(roundInr(gross * 0.0075));
    esicEmpr = String(roundInr(gross * 0.0325));
  }
  return {
    id: p.id,
    row_no: index + 1,
    bank_account: ex(x, 'bank_account'),
    ifsc: ex(x, 'ifsc'),
    bank_name: ex(x, 'bank_name'),
    department: ex(x, 'department') || str(emp.department),
    employee_name: ex(x, 'employee_name') || str(emp.username),
    position: ex(x, 'position') || str(emp.position),
    birth_date: ex(x, 'birth_date') || (emp.birth_date ? String(emp.birth_date).split('T')[0] : ''),
    joining_date: joining,
    working_month: workingMonth,
    basic_salary: num(p.basic_salary),
    total_day_of_month: ex(x, 'total_day_of_month'),
    unpaid_leave: ex(x, 'unpaid_leave'),
    days_worked: derivedDaysWorkedString(ex(x, 'total_day_of_month'), ex(x, 'unpaid_leave')),
    overtime: num(p.overtime_pay),
    sum_total: gross,
    pf_employee: pfEmp,
    pf_employer: pfEmprSynced,
    esic_employee: esicEmp,
    esic_employer: esicEmpr,
    tds: num(p.tax_amount),
    pt: ex(x, 'pt'),
    deduct_this_month: num(p.deductions),
    net_salary_payable: num(p.net_salary),
    employee_email: str(emp.email),
    actions: ''
  };
}

export function gridRowToPayload(row: PayrollGridRow): Record<string, unknown> {
  const extra_fields = {
    bank_account: row.bank_account,
    ifsc: row.ifsc,
    bank_name: row.bank_name,
    department: row.department,
    employee_name: row.employee_name,
    position: row.position,
    birth_date: row.birth_date,
    joining_date: row.joining_date,
    working_month: row.working_month,
    total_day_of_month: stripCommaField(row.total_day_of_month),
    unpaid_leave: stripCommaField(row.unpaid_leave),
    days_worked: stripCommaField(row.days_worked),
    pf_employee: row.pf_employee,
    pf_employer: row.pf_employer,
    esic_employee: row.esic_employee,
    esic_employer: row.esic_employer,
    pt: row.pt
  };

  return {
    payroll_period: String(row.working_month || '').trim() || undefined,
    basic_salary: num(row.basic_salary),
    overtime_pay: num(row.overtime),
    gross_salary: num(row.sum_total),
    net_salary: num(row.net_salary_payable),
    tax_amount: num(row.tds),
    deductions: num(row.deduct_this_month),
    extra_fields
  };
}
