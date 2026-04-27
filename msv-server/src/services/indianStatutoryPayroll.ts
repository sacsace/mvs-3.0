/**
 * 인도 급여(EPF / ESI / PT / TDS) 추정 로직
 *
 * Sum Total(Gross): 시트 기준 (기본급 / 월 총일) × 근무일 + 연장 + 상여.
 *
 * PF 모드
 * - gross_6pct(기본): Sum Total × 6% = 직원·고용주 각각 (참고 시트: 120,000×6%=7,200).
 * - epf_12pct_half: Gross×50%×12%, 상한 1,800 옵션 — 예전 EPF 엑셀식.
 *
 * ESI: 월 기본급(L)>21,000 이면 면제. 금액은 Gross×0.75% / 3.25%.
 * PT: Gross≥25,000 → 200(설정 가능).
 * TDS: 구 세제 간이 추정(그리드에서 수정 가능).
 */

export type PfMode = 'gross_6pct' | 'epf_12pct_half';

export type IndianStatutoryOptions = {
  /** AD="A" 에 해당: PF/ESI/PT 적용 (false면 모두 0) */
  statutoryApplicable?: boolean;
  /** PF 산출 방식. 기본 gross_6pct(참고 급여 시트) */
  pfMode?: PfMode;
  /** epf_12pct_half 일 때만: true면 min(50%×Gross×12%, 1800) */
  pfCapAt1800?: boolean;
  /** ESI: 기본급(L)이 이 금액을 초과하면 ESI 미적용(엑셀 L>21000). 기본 21000 */
  esiBasicCeiling?: number;
  /** PT 부과 최소 Gross, 기본 25000 */
  ptGrossThreshold?: number;
  /** PT 금액, 기본 200 */
  ptAmount?: number;
  /** TDS 자동 추정 사용 여부 (false면 0) */
  estimateTds?: boolean;
  /** 월 기본급(L) — ESI 면제(L>21000) 판단. 생략 시 Gross로 간주 */
  basicSalary?: number;
};

const DEFAULTS = {
  statutoryApplicable: true,
  pfMode: 'gross_6pct' as PfMode,
  pfCapAt1800: true,
  esiBasicCeiling: 21000,
  ptGrossThreshold: 25000,
  ptAmount: 200,
  estimateTds: true
} as const;

function rupee(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Sum Total = (월 기본급 / 해당 월 총일) × 근무일 + 연장 + 상여
 * 월급제(정규직·계약직 등): 근태 행이 없으면 근무일=월 총일로 간주(전액 지급). 일용직은 computeDailyWorkerSumTotal 사용.
 */
export function computeProratedSumTotal(
  monthlyBasic: number,
  overtimePay: number,
  bonus: number,
  calendarDaysInMonth: number,
  daysWorkedFromAttendance: number,
  attendanceRecordCount: number
): { sumTotal: number; proratedBasic: number; effectiveDaysWorked: number } {
  const cd = Math.max(1, calendarDaysInMonth);
  const worked =
    attendanceRecordCount === 0 ? cd : Math.min(Math.max(0, daysWorkedFromAttendance), cd);
  const proratedBasic = rupee((monthlyBasic * worked) / cd);
  const sumTotal = rupee(proratedBasic + overtimePay + bonus);
  return { sumTotal, proratedBasic, effectiveDaysWorked: worked };
}

/**
 * 일용직(daily): 프로필/계약 급여를 일당으로 보고 Sum Total = 일당 × 근무일 + 연장 + 상여
 * 해당 급여월 근태 행이 하나도 없으면 실근무 0일로 보아 일당·기본분 0(결근 전액 미지급).
 */
export function computeDailyWorkerSumTotal(
  dailyWage: number,
  overtimePay: number,
  bonus: number,
  calendarDaysInMonth: number,
  daysWorkedFromAttendance: number,
  attendanceRecordCount: number
): { sumTotal: number; proratedBasic: number; effectiveDaysWorked: number } {
  const cd = Math.max(1, calendarDaysInMonth);
  const worked =
    attendanceRecordCount === 0 ? 0 : Math.min(Math.max(0, daysWorkedFromAttendance), cd);
  const d = Math.max(0, dailyWage);
  const proratedBasic = rupee(d * worked);
  const sumTotal = rupee(proratedBasic + overtimePay + bonus);
  return { sumTotal, proratedBasic, effectiveDaysWorked: worked };
}

/** Gross의 50%를 기본급(EPF 산정 기준으로 쓰이는 비율)으로 둠 */
export function epfWageBase(gross: number): number {
  return rupee(gross * 0.5);
}

/** 직원 PF: 12% × (Gross×50%). 상한 적용 시 최대 1,800 루피 */
export function computePfEmployeeEpfHalf(gross: number, pfCapAt1800: boolean): number {
  const raw = rupee(epfWageBase(gross) * 0.12);
  if (pfCapAt1800) return rupee(Math.min(raw, 1800));
  return raw;
}

export function computePfEmployerMatchEmployee(pfEmployee: number): number {
  return rupee(pfEmployee);
}

/** 참고 시트: PF 직원·고용주 각각 Sum Total의 6% */
export function computePfSixPercentOfGross(gross: number): { pf_employee: number; pf_employer: number } {
  const x = rupee(gross * 0.06);
  return { pf_employee: x, pf_employer: x };
}

/** ESI: 기본급(L)이 상한을 넘으면 면제. 금액은 Gross(Q)에 비율 적용(엑셀 Q*0.75% / Q*3.25%) */
export function computeEsiEmployee(gross: number, basicSalary: number, esiBasicCeiling: number): number {
  if (basicSalary > esiBasicCeiling) return 0;
  return rupee(gross * 0.0075);
}

export function computeEsiEmployer(gross: number, basicSalary: number, esiBasicCeiling: number): number {
  if (basicSalary > esiBasicCeiling) return 0;
  return rupee(gross * 0.0325);
}

export function computePt(gross: number, threshold: number, ptAmount: number): number {
  if (gross >= threshold) return rupee(ptAmount);
  return 0;
}

/**
 * 구 세제(old regime) 연간 세액 추정(표준공제 5만만 반영, 80C 등 미반영).
 * 과세소득 구간(루피): 0–2.5L, 2.5–5L @5%, 5–10L @20%, 10L+ @30%
 * 87A 등 리베이트는 생략 → 실제보다 과대 추정될 수 있음.
 */
export function computeAnnualIncomeTaxOldRegimeSimplified(annualTaxableIncome: number): number {
  const t = annualTaxableIncome;
  let tax = 0;
  if (t <= 250000) tax = 0;
  else if (t <= 500000) tax = (t - 250000) * 0.05;
  else if (t <= 1000000) tax = 12500 + (t - 500000) * 0.2;
  else tax = 112500 + (t - 1000000) * 0.3;
  tax = Math.max(0, tax);
  const cess = tax * 0.04;
  return Math.round(tax + cess);
}

/** 월 급여만으로 연 환산 → 표준공제 5만 후 월평균 TDS 추정 */
export function computeMonthlyTdsEstimateOldRegime(monthlyGross: number): number {
  if (monthlyGross <= 0) return 0;
  const annualGross = monthlyGross * 12;
  const taxable = Math.max(0, annualGross - 50000);
  const annualTax = computeAnnualIncomeTaxOldRegimeSimplified(taxable);
  return Math.max(0, Math.round(annualTax / 12));
}

export type IndianDeductionBreakdown = {
  gross: number;
  /** 급여 기본급(L) — ESI 면제 판단에 사용 */
  basic_for_esi: number;
  pf_employee: number;
  pf_employer: number;
  esic_employee: number;
  esic_employer: number;
  pt: number;
  tds: number;
  totalEmployeeDeductions: number;
  net_payable: number;
  month_total_cost: number;
};

/**
 * @param gross 합계(Sum Total / Q)
 * @param basicSalary 월 기본급(L) — ESI 에서 L>21000 면제 판단. 미전달 시 gross와 동일하게 처리(보수적).
 */
export function computeIndianStatutoryPayroll(
  gross: number,
  options: IndianStatutoryOptions = {}
): IndianDeductionBreakdown {
  const o = { ...DEFAULTS, ...options };
  const basicForEsi =
    o.basicSalary != null && Number.isFinite(o.basicSalary) ? rupee(o.basicSalary as number) : gross;
  let pf_employee = 0;
  let pf_employer = 0;
  let esic_employee = 0;
  let esic_employer = 0;
  let pt = 0;
  let tds = 0;

  if (o.statutoryApplicable) {
    const mode = o.pfMode ?? DEFAULTS.pfMode;
    if (mode === 'gross_6pct') {
      const p6 = computePfSixPercentOfGross(gross);
      pf_employee = p6.pf_employee;
      pf_employer = p6.pf_employer;
    } else {
      pf_employee = computePfEmployeeEpfHalf(gross, o.pfCapAt1800);
      pf_employer = computePfEmployerMatchEmployee(pf_employee);
    }
    esic_employee = computeEsiEmployee(gross, basicForEsi, o.esiBasicCeiling);
    esic_employer = computeEsiEmployer(gross, basicForEsi, o.esiBasicCeiling);
    pt = computePt(gross, o.ptGrossThreshold, o.ptAmount);
    tds = o.estimateTds ? computeMonthlyTdsEstimateOldRegime(gross) : 0;
  }

  const totalEmployeeDeductions = rupee(pf_employee + esic_employee + tds + pt);
  const net_payable = rupee(gross - totalEmployeeDeductions);
  const month_total_cost = rupee(gross + pf_employer + esic_employer);

  return {
    gross: rupee(gross),
    basic_for_esi: basicForEsi,
    pf_employee,
    pf_employer,
    esic_employee,
    esic_employer,
    pt,
    tds,
    totalEmployeeDeductions,
    net_payable,
    month_total_cost
  };
}

function fmtInr(n: number): string {
  return Number.isFinite(n) ? String(rupee(n)) : '0';
}

export function breakdownToExtraFields(b: IndianDeductionBreakdown): Record<string, string> {
  return {
    pf_employee: fmtInr(b.pf_employee),
    pf_employer: fmtInr(b.pf_employer),
    esic_employee: fmtInr(b.esic_employee),
    esic_employer: fmtInr(b.esic_employer),
    pt: fmtInr(b.pt),
    month_total_cost: fmtInr(b.month_total_cost)
  };
}
