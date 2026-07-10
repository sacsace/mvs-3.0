import type { PayrollGridRow } from './payrollGridTypes';
import { computeProfessionalTaxByState } from './indianProfessionalTax';

export type PayrollRecalcContext = {
  /** 회사 등록 주 GST code (예: 29) */
  companyStateCode?: string | null;
  /** YYYY-MM */
  payrollMonth?: string | null;
};

/** ESIC: 지급합계(Q) ≤ 21,000 이면 Q×0.75% / Q×3.25%, 초과 시 0 */
export const ESIC_SUM_CEILING_INR = 21000;
export const ESIC_EMPLOYEE_RATE = 0.0075;
export const ESIC_EMPLOYER_RATE = 0.0325;

/** ESIC 직원 = IF(지급합계>21,000, 0, 지급합계×0.75%) — 엑셀 Q4 */
export function computeEsicEmployeeFromSumTotal(
  sumTotal: number,
  ceiling = ESIC_SUM_CEILING_INR
): number {
  const gross = Math.max(0, num(sumTotal));
  if (gross > ceiling) return 0;
  return roundInr(gross * ESIC_EMPLOYEE_RATE);
}

export function computeEsicContributions(
  sumTotal: number,
  ceiling = ESIC_SUM_CEILING_INR
): { esic_employee: number; esic_employer: number; applicable: boolean } {
  const gross = Math.max(0, num(sumTotal));
  if (gross > ceiling) {
    return { esic_employee: 0, esic_employer: 0, applicable: false };
  }
  return {
    esic_employee: roundInr(gross * ESIC_EMPLOYEE_RATE),
    esic_employer: roundInr(gross * ESIC_EMPLOYER_RATE),
    applicable: true
  };
}

const PF_BASIC_RATE = 0.12;
const PF_CAP_INR = 1800;
const BASIC_RATIO = 0.5;
const HRA_RATIO = 0.3;
const OTHER_ALLOWANCE_RATIO = 0.2;
const LEGACY_DAY_SHIFT_RATE_INR = 50;

function num(v: unknown, fallback = 0): number {
  if (v === '' || v === null || v === undefined) return fallback;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/** 인도 루피 정수 내림 (소수점 이하 제거) */
export function roundInr(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.floor(n);
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

/** 엑셀 OT/Rate = 기본급 / 26 / 8 × 2 */
export function defaultOtRateFromBasic(basicSalary: number): number {
  const basic = Math.max(0, num(basicSalary));
  if (basic <= 0) return 0;
  return roundInr((basic / 26 / 8) * 2);
}

function splitSalaryComponentsFromTotal(totalSalary: number): {
  basic: number;
  hra: number;
  other: number;
} {
  const total = Math.max(0, num(totalSalary));
  const basic = roundInr(total * BASIC_RATIO);
  const hra = roundInr(total * HRA_RATIO);
  const other = roundInr(total - basic - hra);
  return { basic, hra, other };
}

function computeOvertimePay(
  row: Pick<PayrollGridRow, 'ot_rate' | 'day_ot_hour'>
): number {
  const rate = Math.max(0, num(row.ot_rate));
  const dayHours = Math.max(0, num(row.day_ot_hour));
  return roundInr(dayHours * rate);
}

function computeOtPayParts(otRate: number, dayHours: number): {
  day_ot_pay: number;
  night_ot_pay: number;
} {
  const rate = Math.max(0, num(otRate));
  const dayH = Math.max(0, num(dayHours));
  return {
    day_ot_pay: roundInr(dayH * rate),
    night_ot_pay: 0
  };
}

function mergeOtHours(day: unknown, night: unknown): number {
  return roundOtHour(Math.max(0, num(day)) + Math.max(0, num(night)));
}

/** extra_fields·직원 정보의 OT 적용 대상 여부 (기본: 적용) */
export function isOtEligible(
  extra?: Record<string, unknown> | null,
  employee?: Record<string, unknown> | null
): boolean {
  const parse = (value: unknown): boolean | null => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return null;
  };
  const fromExtra = extra ? parse(extra.ot_eligible) : null;
  if (fromExtra !== null) return fromExtra;
  const fromEmployee = employee ? parse(employee.ot_eligible) : null;
  if (fromEmployee !== null) return fromEmployee;
  return true;
}

/** extra_fields → OT Rate / OT 시간 */
function resolveOtInputsFromExtra(
  x: Record<string, unknown>,
  basic: number,
  overtimePayFromApi: number,
  otEligible = true
): { ot_rate: number; day_ot_hour: number; night_ot_hour: number } {
  if (!otEligible) {
    const otRate = basic > 0 ? defaultOtRateFromBasic(basic) : 0;
    return { ot_rate: otRate, day_ot_hour: 0, night_ot_hour: 0 };
  }

  const hasHourFields =
    Object.prototype.hasOwnProperty.call(x, 'day_ot_hour') ||
    Object.prototype.hasOwnProperty.call(x, 'night_ot_hour') ||
    Object.prototype.hasOwnProperty.call(x, 'ot_rate');

  if (hasHourFields) {
    let otRate = num(x.ot_rate);
    if (otRate <= 0 && basic > 0) {
      otRate = defaultOtRateFromBasic(basic);
    }
    return {
      ot_rate: otRate,
      day_ot_hour: mergeOtHours(x.day_ot_hour, x.night_ot_hour),
      night_ot_hour: 0
    };
  }

  const hasAttendanceOt =
    Object.prototype.hasOwnProperty.call(x, 'attendance_day_ot_hours') ||
    Object.prototype.hasOwnProperty.call(x, 'attendance_night_ot_hours');
  if (hasAttendanceOt) {
    let otRate = num(x.ot_rate);
    if (otRate <= 0 && basic > 0) {
      otRate = defaultOtRateFromBasic(basic);
    }
    return {
      ot_rate: otRate,
      day_ot_hour: mergeOtHours(x.attendance_day_ot_hours, x.attendance_night_ot_hours),
      night_ot_hour: 0
    };
  }

  const attendanceOtTotal = num(x.attendance_overtime_hours);
  if (attendanceOtTotal > 0) {
    let otRate = num(x.ot_rate);
    if (otRate <= 0 && basic > 0) {
      otRate = defaultOtRateFromBasic(basic);
    }
    return {
      ot_rate: otRate,
      day_ot_hour: roundOtHour(attendanceOtTotal),
      night_ot_hour: 0
    };
  }

  const hasAmountFields =
    Object.prototype.hasOwnProperty.call(x, 'day_ot') ||
    Object.prototype.hasOwnProperty.call(x, 'night_ot');
  if (hasAmountFields) {
    let otRate = num(x.ot_rate);
    if (otRate <= 0 && basic > 0) {
      otRate = defaultOtRateFromBasic(basic);
    }
    const dayAmt = Math.max(0, num(x.day_ot));
    const nightAmt = Math.max(0, num(x.night_ot));
    if (otRate > 0) {
      return {
        ot_rate: otRate,
        day_ot_hour: roundOtHour((dayAmt + nightAmt) / otRate),
        night_ot_hour: 0
      };
    }
    return { ot_rate: 0, day_ot_hour: 0, night_ot_hour: 0 };
  }

  const otHour = num(x.ot_hour);
  let otRate = num(x.ot_rate);
  const dayShift = num(x.day_shift);
  const nightShift = num(x.night_shift);
  const hasLegacy =
    otHour > 0 ||
    otRate > 0 ||
    dayShift > 0 ||
    nightShift > 0 ||
    Object.prototype.hasOwnProperty.call(x, 'ot_hour') ||
    Object.prototype.hasOwnProperty.call(x, 'ot_rate') ||
    Object.prototype.hasOwnProperty.call(x, 'day_shift') ||
    Object.prototype.hasOwnProperty.call(x, 'night_shift');

  if (hasLegacy) {
    if (otRate <= 0 && basic > 0) {
      otRate = defaultOtRateFromBasic(basic);
    }
    const dayAmt = roundInr(otHour * otRate + dayShift * LEGACY_DAY_SHIFT_RATE_INR);
    const nightAmt = Math.max(0, nightShift);
    if (otRate > 0) {
      return {
        ot_rate: otRate,
        day_ot_hour: roundOtHour((dayAmt + nightAmt) / otRate),
        night_ot_hour: 0
      };
    }
    return { ot_rate: 0, day_ot_hour: 0, night_ot_hour: 0 };
  }

  const apiOt = Math.max(0, num(overtimePayFromApi));
  const defaultRate = basic > 0 ? defaultOtRateFromBasic(basic) : 0;
  return {
    ot_rate: defaultRate,
    day_ot_hour: defaultRate > 0 ? roundOtHour(apiOt / defaultRate) : 0,
    night_ot_hour: 0
  };
}

export type PfMode = 'basic_12pct' | 'gross_6pct' | 'epf_12pct_half';

/** PF 직원·사업주 = ROUND(MIN(Basic Salary × 12%, 1,800), 0) — 엑셀 K9 기준 */
export function computePfContributions(
  basicSalary: number
): { pf_employee: number; pf_employer: number } {
  const basic = Math.max(0, num(basicSalary));
  const amount = Math.round(Math.min(basic * PF_BASIC_RATE, PF_CAP_INR));
  return { pf_employee: amount, pf_employer: amount };
}

function resolvePfModeFromExtra(x: Record<string, unknown>): PfMode {
  const raw = String(x.indian_pf_mode ?? '').trim();
  if (raw === 'gross_6pct') return 'gross_6pct';
  if (raw === 'epf_12pct_half') return 'epf_12pct_half';
  return 'basic_12pct';
}

/**
 * 엑셀 Salary Details 시트 기준 재계산
 * - Total Salary = Basic 50% + HRA 30% + Other Allowance 20%
 * - Sum Total = (근무일 × Total Salary / 월총일) + OT + Extra Allowance
 * - OT Rate = Basic Salary ÷ 26 ÷ 8 × 2
 * - OT = 주간 OT시간 × OT Rate
 * - PF(직원·사업주) = ROUND(MIN(Basic Salary × 12%, 1,800), 0)
 * - ESIC(직원) = IF(지급합계>21,000, 0, 지급합계×0.75%)
 * - TDS = 신규 세제 LET 수식(지급합계×12, 표준공제 75,000, 87A 리베이트·한계완화, 4% cess) / 12
 * - Net = Sum Total − PF(직원) − ESIC(직원) − TDS − PT − 선지급
 */
function slabTax(taxable: number, cap: number, floor: number, rate: number): number {
  return Math.max(0, Math.min(taxable, cap) - floor) * rate;
}

/**
 * 엑셀 LET TDS — AB4 = 월 지급 합계(sum_total)
 * ROUND(TaxAfterRelief * 1.04 / 12, 0)
 */
export function computeMonthlyTdsFromSumTotal(monthlySumTotal: number): number {
  const monthly = Math.max(0, num(monthlySumTotal));
  if (monthly <= 0) return 0;

  const annual = monthly * 12;
  const taxable = Math.max(0, annual - 75000);

  const baseTax =
    slabTax(taxable, 800000, 400000, 0.05) +
    slabTax(taxable, 1200000, 800000, 0.1) +
    slabTax(taxable, 1600000, 1200000, 0.15) +
    slabTax(taxable, 2000000, 1600000, 0.2) +
    slabTax(taxable, 2400000, 2000000, 0.25) +
    Math.max(0, taxable - 2400000) * 0.3;

  const taxAfterRebate = taxable <= 1200000 ? 0 : baseTax;

  let taxAfterRelief = taxAfterRebate;
  if (taxable > 1200000 && taxAfterRebate * 1.04 > taxable - 1200000) {
    taxAfterRelief = (taxable - 1200000) / 1.04;
  }

  return Math.round((taxAfterRelief * 1.04) / 12);
}

export function recalculatePayrollRow(
  row: PayrollGridRow,
  ctx: PayrollRecalcContext = {}
): PayrollGridRow {
  let basic = num(row.basic_salary);
  let hra = num(row.house_rent_allowance);
  let otherAllowance = num(row.other_allowance);
  const totalSalaryInput = num(row.total_salary);
  const sumParts = roundInr(basic + hra + otherAllowance);

  let totalSalary = totalSalaryInput;

  if (totalSalaryInput > 0 && Math.abs(totalSalaryInput - sumParts) > 0.01) {
    const split = splitSalaryComponentsFromTotal(totalSalaryInput);
    basic = split.basic;
    hra = split.hra;
    otherAllowance = split.other;
    totalSalary = totalSalaryInput;
  } else if (sumParts > 0) {
    totalSalary = sumParts;
  } else if (totalSalaryInput > 0) {
    const split = splitSalaryComponentsFromTotal(totalSalaryInput);
    basic = split.basic;
    hra = split.hra;
    otherAllowance = split.other;
    totalSalary = totalSalaryInput;
  }

  const calendarDays = Math.max(1, num(row.total_day_of_month) || 30);
  const worked = derivedDaysWorkedFromCalendarAndUnpaid(row.total_day_of_month, row.unpaid_leave);
  const days_worked = String(worked);

  const otRate = basic > 0 ? defaultOtRateFromBasic(basic) : 0;
  const dayOtHour = roundOtHour(num(row.day_ot_hour));
  const overtime = computeOvertimePay({
    ot_rate: otRate,
    day_ot_hour: dayOtHour
  });
  const transport = Math.max(0, num(row.transport_allowance));
  const proratedPackage = roundInr((totalSalary * worked) / calendarDays);
  const sum_total = roundInr(proratedPackage + overtime + transport);

  const pf = computePfContributions(basic);
  const pfEmployeeStr = String(pf.pf_employee);
  const pfEmployerStr = String(pf.pf_employer);

  const esic = computeEsicContributions(sum_total);
  const esicEmployeeStr = String(esic.esic_employee);
  const esicEmployerStr = String(esic.esic_employer);

  const esicE = num(esicEmployeeStr);
  const tds = computeMonthlyTdsFromSumTotal(sum_total);
  const ptAmount = computeProfessionalTaxByState({
    grossMonthly: sum_total,
    stateCode: ctx.companyStateCode,
    payrollMonth: ctx.payrollMonth ?? row.working_month
  });
  const pt = ptAmount;
  const other = Math.max(0, num(row.deduct_this_month));
  const net_salary_payable = roundInr(sum_total - num(pfEmployeeStr) - esicE - tds - pt - other);

  return {
    ...row,
    basic_salary: basic,
    house_rent_allowance: hra,
    other_allowance: otherAllowance,
    total_salary: totalSalary,
    days_worked,
    ot_rate: otRate,
    day_ot_hour: dayOtHour,
    night_ot_hour: 0,
    overtime,
    sum_total,
    pf_employee: pfEmployeeStr,
    pf_employer: pfEmployerStr,
    esic_employee: esicEmployeeStr,
    esic_employer: esicEmployerStr,
    tds,
    pt: String(pt),
    deduct_this_month: other,
    net_salary_payable
  };
}

/** 표시용 천 단위 콤마 — 정수 내림 */
export function formatNumberDisplay(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value ?? '');
  return Math.floor(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatMaybeNumericString(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '';
  const n = parseFloat(String(value).replace(/,/g, ''));
  if (Number.isFinite(n)) {
    return Math.floor(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
  return String(value);
}

function stripCommaField(s: string): string {
  return String(s).replace(/,/g, '').trim();
}

/** OT 시간 — 소수점 이하 1자리 */
export function roundOtHour(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, n) * 10) / 10;
}

export function formatOtHourDisplay(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '';
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value ?? '');
  return roundOtHour(n).toLocaleString('en-IN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

export const otHourEditProps = {
  type: 'number' as const,
  valueFormatter: (value: unknown) => formatOtHourDisplay(value),
  valueParser: (value: unknown) => {
    if (value === '' || value == null) return 0;
    const n = parseFloat(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? roundOtHour(n) : 0;
  }
};

export const numberEditProps = {
  type: 'number' as const,
  valueFormatter: (value: unknown) => formatNumberDisplay(value),
  valueParser: (value: unknown) => {
    if (value === '' || value == null) return 0;
    const n = parseFloat(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? Math.floor(n) : 0;
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

export function payrollRecordToGridRow(
  p: any,
  index: number,
  ctx: PayrollRecalcContext = {}
): PayrollGridRow {
  const x = (p.extra_fields && typeof p.extra_fields === 'object' ? p.extra_fields : {}) as Record<
    string,
    unknown
  >;
  const emp = p.employee || {};
  const joining =
    ex(x, 'joining_date') || (emp.hire_date ? String(emp.hire_date).split('T')[0] : '');
  const workingMonth = ex(x, 'working_month') || str(p.payroll_period);

  const basicInitial = num(p.basic_salary);
  const hraInitial = num(ex(x, 'house_rent_allowance'));
  let otherAllowance = num(ex(x, 'other_allowance'));
  let basic = basicInitial;
  let hra = hraInitial;
  let totalSalary = num(ex(x, 'total_salary'));
  if (totalSalary <= 0) {
    const partsSum = roundInr(basic + hra + otherAllowance);
    totalSalary =
      partsSum > 0 ? partsSum : basic > 0 ? roundInr(basic / BASIC_RATIO) : 0;
  }
  if (otherAllowance <= 0 && totalSalary > 0 && (basic > 0 || hra > 0)) {
    otherAllowance = roundInr(Math.max(0, totalSalary - basic - hra));
  }
  if (basic <= 0 && hra <= 0 && otherAllowance <= 0 && totalSalary > 0) {
    const split = splitSalaryComponentsFromTotal(totalSalary);
    basic = split.basic;
    hra = split.hra;
    otherAllowance = split.other;
  } else if (otherAllowance <= 0 && totalSalary > 0) {
    const split = splitSalaryComponentsFromTotal(totalSalary);
    if (basic <= 0) basic = split.basic;
    if (hra <= 0) hra = split.hra;
    otherAllowance = split.other;
  }

  const { ot_rate: otRateInitial, day_ot_hour: dayOtHour } =
    resolveOtInputsFromExtra(x, basic, num(p.overtime_pay), isOtEligible(x, emp));
  const transport = num(ex(x, 'transport_allowance'));
  const indianPfMode = resolvePfModeFromExtra(x);

  const advance = num(p.deductions);

  const row: PayrollGridRow = {
    id: p.id,
    row_no: index + 1,
    emp_id: ex(x, 'emp_id') || str(emp.employee_number),
    bank_account: ex(x, 'bank_account'),
    ifsc: ex(x, 'ifsc'),
    bank_name: ex(x, 'bank_name'),
    employee_email: str(emp.email),
    department: ex(x, 'department') || str(emp.department),
    employee_name: ex(x, 'employee_name') || str(emp.username),
    position: ex(x, 'position') || str(emp.position),
    birth_date: ex(x, 'birth_date') || (emp.birth_date ? String(emp.birth_date).split('T')[0] : ''),
    joining_date: joining,
    working_month: workingMonth,
    basic_salary: basic,
    house_rent_allowance: hra,
    other_allowance: otherAllowance,
    total_salary: totalSalary,
    total_day_of_month: ex(x, 'total_day_of_month'),
    unpaid_leave: ex(x, 'unpaid_leave'),
    days_worked: derivedDaysWorkedString(ex(x, 'total_day_of_month'), ex(x, 'unpaid_leave')),
    ot_rate: otRateInitial,
    day_ot_hour: dayOtHour,
    night_ot_hour: 0,
    transport_allowance: transport,
    overtime: 0,
    sum_total: num(p.gross_salary),
    indian_pf_mode: indianPfMode,
    pf_employee: '',
    pf_employer: '',
    esic_employee: '',
    esic_employer: '',
    tds: num(p.tax_amount),
    pt: ex(x, 'pt'),
    deduct_this_month: advance,
    net_salary_payable: num(p.net_salary),
    actions: ''
  };

  return recalculatePayrollRow(row, ctx);
}

export function gridRowToPayload(
  row: PayrollGridRow,
  ctx: PayrollRecalcContext = {}
): Record<string, unknown> {
  const recalculated = recalculatePayrollRow(row, ctx);
  const otPay = computeOtPayParts(
    recalculated.ot_rate,
    recalculated.day_ot_hour
  );
  const extra_fields = {
    emp_id: recalculated.emp_id,
    bank_account: recalculated.bank_account,
    ifsc: recalculated.ifsc,
    bank_name: recalculated.bank_name,
    department: recalculated.department,
    employee_name: recalculated.employee_name,
    position: recalculated.position,
    birth_date: recalculated.birth_date,
    joining_date: recalculated.joining_date,
    working_month: recalculated.working_month,
    house_rent_allowance: recalculated.house_rent_allowance,
    other_allowance: recalculated.other_allowance,
    total_salary: recalculated.total_salary,
    total_day_of_month: stripCommaField(recalculated.total_day_of_month),
    unpaid_leave: stripCommaField(recalculated.unpaid_leave),
    days_worked: stripCommaField(recalculated.days_worked),
    ot_rate: recalculated.ot_rate,
    day_ot_hour: recalculated.day_ot_hour,
    night_ot_hour: 0,
    day_ot: otPay.day_ot_pay,
    night_ot: 0,
    transport_allowance: recalculated.transport_allowance,
    pf_employee: recalculated.pf_employee,
    pf_employer: recalculated.pf_employer,
    esic_employee: recalculated.esic_employee,
    esic_employer: recalculated.esic_employer,
    pt: recalculated.pt,
    indian_pf_mode: recalculated.indian_pf_mode ?? 'basic_12pct'
  };

  return {
    payroll_period: String(recalculated.working_month || '').trim() || undefined,
    basic_salary: num(recalculated.basic_salary),
    overtime_pay: num(recalculated.overtime),
    allowances:
      num(recalculated.house_rent_allowance) +
      num(recalculated.other_allowance) +
      num(recalculated.transport_allowance),
    gross_salary: num(recalculated.sum_total),
    net_salary: num(recalculated.net_salary_payable),
    tax_amount: num(recalculated.tds),
    deductions: num(recalculated.deduct_this_month),
    extra_fields
  };
}
