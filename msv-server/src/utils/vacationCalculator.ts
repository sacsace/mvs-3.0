import { User, Vacation, AcFinancialYear, Attendance } from '../models';
import { Op } from 'sequelize';
import { isWeekendYmd } from './attendanceOtCalculation';

const DAY_MS = 1000 * 60 * 60 * 24;

export type LeaveYearRange = {
  start: Date;
  end: Date;
  label: string;
};

export type LeaveTypeDays = Partial<Record<string, number>>;

const DEFAULT_LEAVE_TYPE_DAYS: LeaveTypeDays = {
  sick: 6,
  personal: 6,
  study: 0,
  maternity: 182,
  paternity: 15,
  marriage: 5,
  bereavement: 3,
};

const DEFAULT_AVAILABLE_TYPES = [
  'annual',
  'sick',
  'personal',
  'study',
  'maternity',
  'paternity',
  'marriage',
  'bereavement',
];

function toDateOnlyString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(value: string): Date {
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** DATEONLY / YYYY-MM-DD 기준 포함 일수 (타임존·Date 파싱 오차 방지) */
export function countInclusiveDateOnlyDays(
  startInput: string | Date | null | undefined,
  endInput: string | Date | null | undefined
): number {
  const startYmd = normalizeDateOnlyYmd(startInput);
  const endYmd = normalizeDateOnlyYmd(endInput);
  if (!startYmd || !endYmd) return 0;
  const startUtc = Date.UTC(
    Number(startYmd.slice(0, 4)),
    Number(startYmd.slice(5, 7)) - 1,
    Number(startYmd.slice(8, 10))
  );
  const endUtc = Date.UTC(
    Number(endYmd.slice(0, 4)),
    Number(endYmd.slice(5, 7)) - 1,
    Number(endYmd.slice(8, 10))
  );
  if (!Number.isFinite(startUtc) || !Number.isFinite(endUtc) || endUtc < startUtc) return 0;
  return Math.floor((endUtc - startUtc) / DAY_MS) + 1;
}

export function normalizeDateOnlyYmd(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return normalizeDateOnlyYmd(parsed);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const iso = value.toISOString();
    // Sequelize DATEONLY → UTC 자정 Date 인 경우가 많음
    if (/T00:00:00(?:\.000)?Z$/.test(iso)) {
      return iso.slice(0, 10);
    }
    return toDateOnlyString(value);
  }
  return null;
}

/** 휴가 기간과 휴가연도의 교집합 포함 일수 */
export function countVacationDaysInLeaveYear(
  startInput: string | Date | null | undefined,
  endInput: string | Date | null | undefined,
  leaveYear: LeaveYearRange
): number {
  const startYmd = normalizeDateOnlyYmd(startInput);
  const endYmd = normalizeDateOnlyYmd(endInput);
  if (!startYmd || !endYmd) return 0;
  const fyStart = toDateOnlyString(leaveYear.start);
  const fyEnd = toDateOnlyString(leaveYear.end);
  const overlapStart = startYmd > fyStart ? startYmd : fyStart;
  const overlapEnd = endYmd < fyEnd ? endYmd : fyEnd;
  if (overlapStart > overlapEnd) return 0;
  return countInclusiveDateOnlyDays(overlapStart, overlapEnd);
}

/**
 * 회계연도 내 연차 부여 개월 수 (1개월 = 1일).
 * - 입사월은 제외, 다음 달부터 카운트 (입사일 1일이면 해당 월 포함)
 * - 입사일이 30일 초과(31일)면 한 달 더 미룸
 * - 회계연도 시작(4/1) · 연차 사용 가능일(입사+대기) 이전은 제외
 */
export function countAnnualLeaveMonthsInLeaveYear(
  hireDate: Date,
  leaveYear: LeaveYearRange,
  eligibilityDate: Date
): number {
  const hire = new Date(hireDate);
  hire.setHours(0, 0, 0, 0);
  const eligibility = new Date(eligibilityDate);
  eligibility.setHours(0, 0, 0, 0);
  const fyStart = new Date(leaveYear.start);
  fyStart.setHours(0, 0, 0, 0);
  const fyEnd = new Date(leaveYear.end);
  fyEnd.setHours(0, 0, 0, 0);

  if (hire.getTime() > fyEnd.getTime()) return 0;

  const hireDay = hire.getDate();
  let startYear = hire.getFullYear();
  let startMonth = hire.getMonth();
  if (hireDay > 30) {
    const bumped = new Date(startYear, startMonth + 2, 1);
    startYear = bumped.getFullYear();
    startMonth = bumped.getMonth();
  } else if (hireDay > 1) {
    const bumped = new Date(startYear, startMonth + 1, 1);
    startYear = bumped.getFullYear();
    startMonth = bumped.getMonth();
  }

  const clampMonth = (candidateYear: number, candidateMonth: number, floorYear: number, floorMonth: number) => {
    if (candidateYear < floorYear || (candidateYear === floorYear && candidateMonth < floorMonth)) {
      return { year: floorYear, month: floorMonth };
    }
    return { year: candidateYear, month: candidateMonth };
  };

  let clamped = clampMonth(startYear, startMonth, fyStart.getFullYear(), fyStart.getMonth());
  startYear = clamped.year;
  startMonth = clamped.month;
  clamped = clampMonth(startYear, startMonth, eligibility.getFullYear(), eligibility.getMonth());
  startYear = clamped.year;
  startMonth = clamped.month;

  const endYear = fyEnd.getFullYear();
  const endMonth = fyEnd.getMonth();
  if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
    return 0;
  }

  let count = 0;
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    count += 1;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return count;
}

/** 인도 회계연도(휴가 연도): 4/1 ~ 다음 해 3/31 */
export function getDefaultIndiaFiscalYearRange(referenceDate: Date = new Date()): LeaveYearRange {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const startYear = ref.getMonth() + 1 >= 4 ? ref.getFullYear() : ref.getFullYear() - 1;
  const start = new Date(startYear, 3, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(startYear + 1, 2, 31);
  end.setHours(23, 59, 59, 999);
  const shortLabel = `${startYear}-${String(startYear + 1).slice(-2)}`;
  return {
    start,
    end,
    label: `${shortLabel} (${toDateOnlyString(start)} ~ ${toDateOnlyString(end)})`,
  };
}

/** 휴가 관리용 연도 — 항상 인도 회계연도(4/1~3/31) */
export function getLeaveYearRange(referenceDate: Date = new Date()): LeaveYearRange {
  return getDefaultIndiaFiscalYearRange(referenceDate);
}

/** 회사 회계연도(등록된 FY 우선, 없으면 인도 FY 기본) */
export async function getCompanyFiscalYearRange(
  companyId: number,
  referenceDate: Date = new Date()
): Promise<LeaveYearRange> {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const refStr = toDateOnlyString(ref);

  try {
    const openFy = await (AcFinancialYear as any).findOne({
      where: {
        company_id: companyId,
        is_active: true,
        is_open: true,
        start_date: { [Op.lte]: refStr },
        end_date: { [Op.gte]: refStr },
      },
      order: [['start_date', 'DESC']],
    });
    if (openFy) {
      const start = parseDateOnly(String(openFy.start_date));
      const end = parseDateOnly(String(openFy.end_date));
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: openFy.name || `${toDateOnlyString(start)} ~ ${toDateOnlyString(end)}`,
      };
    }

    const anyFy = await (AcFinancialYear as any).findOne({
      where: {
        company_id: companyId,
        is_active: true,
        start_date: { [Op.lte]: refStr },
        end_date: { [Op.gte]: refStr },
      },
      order: [['start_date', 'DESC']],
    });
    if (anyFy) {
      const start = parseDateOnly(String(anyFy.start_date));
      const end = parseDateOnly(String(anyFy.end_date));
      end.setHours(23, 59, 59, 999);
      return {
        start,
        end,
        label: anyFy.name || `${toDateOnlyString(start)} ~ ${toDateOnlyString(end)}`,
      };
    }
  } catch (error) {
    console.error('회사 회계연도 조회 오류:', error);
  }

  return getDefaultIndiaFiscalYearRange(ref);
}

/** @deprecated 휴가 연도는 getLeaveYearRange(인도 회계연도)를 사용하세요 */
export function getHireDateLeaveYearRange(hireDate: Date, referenceDate: Date = new Date()): LeaveYearRange {
  const hire = new Date(hireDate);
  hire.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const month = hire.getMonth();
  const day = hire.getDate();

  let startYear = ref.getFullYear();
  const anniversaryThisYear = new Date(startYear, month, day);
  anniversaryThisYear.setHours(0, 0, 0, 0);

  if (ref < anniversaryThisYear) {
    startYear -= 1;
  }

  const start = new Date(startYear, month, day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(startYear + 1, month, day);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  const label = `${toDateOnlyString(start)} ~ ${toDateOnlyString(end)}`;
  return { start, end, label };
}

interface AnnualLeaveInfo {
  availableDays: number;
  usedDays: number;
  vacationUsedDays: number;
  absenceUsedDays: number;
  totalEarnedDays: number;
  canUseAnnualLeave: boolean;
  daysUntilEligible: number;
  policyStartDays?: number;
  leaveYearStart?: string;
  leaveYearEnd?: string;
  leaveYearLabel?: string;
  /** @deprecated use leaveYearLabel */
  fiscalYearStart?: string;
  /** @deprecated use leaveYearEnd */
  fiscalYearEnd?: string;
  /** @deprecated use leaveYearLabel */
  fiscalYearLabel?: string;
}

interface CompanyVacationPolicy {
  annualLeaveStartDays: number;
  annualLeaveEarnDays: number;
  leaveTypeDays: LeaveTypeDays;
  availableTypes: string[];
  /** 출퇴근 결근(status=absent)을 연차에서 차감 (기본 true) */
  deductAbsenceFromLeave: boolean;
  /**
   * 근속 N년 이상이면 회계연도 연차를 적립식(earnDays) 대신 고정 일수로 강제 부여.
   * (인도 최소 12일 등)
   */
  forceFixedAnnualForTenure: boolean;
  forceFixedAnnualDays: number;
  forceFixedAnnualMinYears: number;
}

const DEFAULT_POLICY: CompanyVacationPolicy = {
  annualLeaveStartDays: 240,
  annualLeaveEarnDays: 20,
  leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS },
  availableTypes: [...DEFAULT_AVAILABLE_TYPES],
  deductAbsenceFromLeave: true,
  forceFixedAnnualForTenure: false,
  forceFixedAnnualDays: 12,
  forceFixedAnnualMinYears: 1,
};

function hasMinServiceYears(hireDate: Date, asOf: Date, years: number): boolean {
  const y = Math.max(0, Math.floor(years));
  if (y <= 0) return true;
  const threshold = new Date(hireDate);
  threshold.setFullYear(threshold.getFullYear() + y);
  threshold.setHours(0, 0, 0, 0);
  return asOf.getTime() >= threshold.getTime();
}

async function getCompanyVacationPolicy(companyId: number): Promise<CompanyVacationPolicy> {
  try {
    const { Company } = await import('../models');
    const company = await (Company as any).findByPk(companyId);

    if (!company) {
      return {
        ...DEFAULT_POLICY,
        leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS },
        availableTypes: [...DEFAULT_AVAILABLE_TYPES],
      };
    }

    const policy = company.settings?.vacationPolicy;
    const availableTypes = Array.isArray(policy?.availableTypes) && policy.availableTypes.length > 0
      ? policy.availableTypes.map((t: unknown) => String(t))
      : [...DEFAULT_AVAILABLE_TYPES];
    const forceDays = Number(policy?.forceFixedAnnualDays);
    const forceYears = Number(policy?.forceFixedAnnualMinYears);
    return {
      annualLeaveStartDays: policy?.annualLeaveStartDays ?? 240,
      annualLeaveEarnDays: policy?.annualLeaveEarnDays ?? 20,
      leaveTypeDays: {
        ...DEFAULT_LEAVE_TYPE_DAYS,
        ...(policy?.leaveTypeDays || {}),
      },
      availableTypes,
      deductAbsenceFromLeave: policy?.deductAbsenceFromLeave !== false,
      forceFixedAnnualForTenure: policy?.forceFixedAnnualForTenure === true,
      forceFixedAnnualDays:
        Number.isFinite(forceDays) && forceDays > 0 ? Math.floor(forceDays) : 12,
      forceFixedAnnualMinYears:
        Number.isFinite(forceYears) && forceYears >= 0 ? Math.floor(forceYears) : 1,
    };
  } catch (error) {
    console.error('휴가 정책 조회 오류:', error);
    return {
      ...DEFAULT_POLICY,
      leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS },
      availableTypes: [...DEFAULT_AVAILABLE_TYPES],
    };
  }
}

/**
 * 인도 회계연도 내 출퇴근 결근 일수 (연차 차감용).
 * - status = 'absent' 또는 (과거 일자 + 체크인 없음)
 * - 주말 제외
 * - 승인된 휴가 기간과 겹치는 날은 제외 (이중 차감 방지)
 */
export async function getAbsenceDeductionDaysInLeaveYear(
  userId: number,
  leaveYear: LeaveYearRange
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateOnlyString(today);
  const startStr = toDateOnlyString(leaveYear.start);
  const endStr = toDateOnlyString(leaveYear.end);
  const rangeEndStr = endStr < todayStr ? endStr : todayStr;

  if (rangeEndStr < startStr) return 0;

  const attendanceRows = await (Attendance as any).findAll({
    where: {
      user_id: userId,
      is_active: { [Op.ne]: false },
      date: { [Op.between]: [startStr, rangeEndStr] },
      [Op.or]: [
        { status: 'absent' },
        { check_in: null, date: { [Op.lt]: todayStr } },
      ],
    },
    attributes: ['date', 'status', 'check_in'],
  });

  const absentDates = new Set<string>();
  for (const row of attendanceRows) {
    const ymd = String(row.date || '').slice(0, 10);
    if (!ymd || isWeekendYmd(ymd) || ymd >= todayStr) continue;
    const isAbsentStatus = String(row.status || '') === 'absent';
    const noCheckIn = row.check_in == null;
    if (isAbsentStatus || noCheckIn) {
      absentDates.add(ymd);
    }
  }
  if (absentDates.size === 0) return 0;

  const vacations = await (Vacation as any).findAll({
    where: {
      user_id: userId,
      status: { [Op.in]: ['approved', 'pending'] },
      is_active: { [Op.ne]: false },
      start_date: { [Op.lte]: endStr },
      end_date: { [Op.gte]: startStr },
    },
    attributes: ['start_date', 'end_date'],
  });

  const coveredByLeave = new Set<string>();
  for (const vacation of vacations) {
    const rangeStart = parseDateOnly(String(vacation.start_date).slice(0, 10));
    const rangeEnd = parseDateOnly(String(vacation.end_date).slice(0, 10));
    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      coveredByLeave.add(toDateOnlyString(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  let count = 0;
  for (const ymd of absentDates) {
    if (!coveredByLeave.has(ymd)) count += 1;
  }
  return count;
}

async function getUsedDaysInLeaveYear(
  userId: number,
  vacationType: string,
  leaveYear: LeaveYearRange,
  excludeVacationId?: number,
  /** true면 승인대기까지 포함(신청 시 한도 검증용). 잔여 표시는 승인분만. */
  includePending = false
): Promise<number> {
  const fyStart = toDateOnlyString(leaveYear.start);
  const fyEnd = toDateOnlyString(leaveYear.end);
  const whereClause: any = {
    user_id: userId,
    vacation_type: vacationType,
    status: includePending
      ? { [Op.in]: ['approved', 'pending'] }
      : { [Op.eq]: 'approved' },
    is_active: { [Op.ne]: false },
    // 연도 경계에 걸친 휴가 포함 (start만 보던 방식은 차감 누락/오류 가능)
    start_date: { [Op.lte]: fyEnd },
    end_date: { [Op.gte]: fyStart },
  };

  if (excludeVacationId) {
    whereClause.id = { [Op.ne]: excludeVacationId };
  }

  const rows = await (Vacation as any).findAll({
    where: whereClause,
    attributes: ['id', 'start_date', 'end_date', 'days'],
  });

  return rows.reduce((sum: number, row: any) => {
    const fromRange = countVacationDaysInLeaveYear(row.start_date, row.end_date, leaveYear);
    if (fromRange > 0) return sum + fromRange;
    // 날짜가 비정상일 때만 저장된 days로 폴백
    const fallback = Number(row.days);
    return sum + (Number.isFinite(fallback) && fallback > 0 ? fallback : 0);
  }, 0);
}

/**
 * 연차: 인도 회계연도(4/1~3/31) 예상 부여·사용 (이월 불가).
 * 사용 가능 시점은 입사일+대기일 기준.
 * 총일수(예상) = 회계연도 내 근무 예정 개월 수 (1개월 1일, 입사월 제외·31일 입사 시 추가 1개월 제외)
 * 사용 = 승인된 연차 + 출퇴근 결근 차감 (대기·반려는 잔여 미차감)
 * 잔여 = max(0, 총일수 - 사용일수)
 */
export async function calculateAnnualLeave(userId: number, excludeVacationId?: number): Promise<AnnualLeaveInfo> {
  const empty: AnnualLeaveInfo = {
    availableDays: 0,
    usedDays: 0,
    vacationUsedDays: 0,
    absenceUsedDays: 0,
    totalEarnedDays: 0,
    canUseAnnualLeave: false,
    daysUntilEligible: 0,
  };

  try {
    const user = await (User as any).findByPk(userId, {
      attributes: ['id', 'hire_date', 'company_id'],
    });

    if (!user || !user.hire_date) {
      return empty;
    }

    const policy = await getCompanyVacationPolicy(user.company_id);
    const startDays = policy.annualLeaveStartDays;

    const hireDate = new Date(user.hire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    hireDate.setHours(0, 0, 0, 0);

    const leaveYear = getLeaveYearRange(today);

    const eligibilityDate = new Date(hireDate);
    eligibilityDate.setDate(eligibilityDate.getDate() + startDays);

    const canUseAnnualLeave = today >= eligibilityDate;
    const daysUntilEligible = canUseAnnualLeave
      ? 0
      : Math.ceil((eligibilityDate.getTime() - today.getTime()) / DAY_MS);

    let totalEarnedDays = 0;
    if (canUseAnnualLeave) {
      const useForcedFixed =
        policy.forceFixedAnnualForTenure &&
        hasMinServiceYears(hireDate, today, policy.forceFixedAnnualMinYears);

      if (useForcedFixed) {
        // 근속 충족 시 회계연도 연차를 고정 일수로 강제 (월별 적립 무시)
        totalEarnedDays = Math.max(0, policy.forceFixedAnnualDays);
      } else {
        totalEarnedDays = countAnnualLeaveMonthsInLeaveYear(hireDate, leaveYear, eligibilityDate);
      }
    }

    const vacationUsedDays = await getUsedDaysInLeaveYear(userId, 'annual', leaveYear, excludeVacationId);
    const absenceUsedDays = policy.deductAbsenceFromLeave
      ? await getAbsenceDeductionDaysInLeaveYear(userId, leaveYear)
      : 0;
    const usedDays = vacationUsedDays + absenceUsedDays;
    const availableDays = Math.max(0, totalEarnedDays - usedDays);

    const leaveYearStart = toDateOnlyString(leaveYear.start);
    const leaveYearEnd = toDateOnlyString(leaveYear.end);

    return {
      availableDays,
      usedDays,
      vacationUsedDays,
      absenceUsedDays,
      totalEarnedDays,
      canUseAnnualLeave,
      daysUntilEligible,
      policyStartDays: startDays,
      leaveYearStart,
      leaveYearEnd,
      leaveYearLabel: leaveYear.label,
      fiscalYearStart: leaveYearStart,
      fiscalYearEnd: leaveYearEnd,
      fiscalYearLabel: leaveYear.label,
    };
  } catch (error) {
    console.error('연차 계산 오류:', error);
    return empty;
  }
}

export async function validateAnnualLeaveRequest(
  userId: number,
  requestedDays: number,
  excludeVacationId?: number
): Promise<{ valid: boolean; message?: string; availableDays?: number }> {
  return validateVacationLeaveRequest(userId, 'annual', requestedDays, excludeVacationId);
}

const TYPE_LABELS: Record<string, string> = {
  sick: '병가',
  personal: '개인사유',
  study: '교육',
  maternity: '출산',
  paternity: '남편 출산 휴가',
  marriage: '결혼휴가',
  bereavement: '조사 휴가',
};

/**
 * 모든 휴가 유형 — 인도 회계연도(4/1~3/31) 내 잔여 일수 검증 (누적·이월 없음)
 */
export async function validateVacationLeaveRequest(
  userId: number,
  vacationType: string,
  requestedDays: number,
  excludeVacationId?: number
): Promise<{ valid: boolean; message?: string; availableDays?: number }> {
  const user = await (User as any).findByPk(userId, {
    attributes: ['id', 'hire_date', 'company_id'],
  });

  if (!user || !user.hire_date) {
    return { valid: false, message: '입사일이 등록되지 않아 휴가를 신청할 수 없습니다.' };
  }

  const leaveYear = getLeaveYearRange(new Date());
  const yearLabel = leaveYear.label;

  if (vacationType === 'annual') {
    const leaveInfo = await calculateAnnualLeave(userId, excludeVacationId);

    if (!leaveInfo.canUseAnnualLeave) {
      const startDays = leaveInfo.policyStartDays || 240;
      const startDaysText = startDays === 0 ? '즉시' : `${startDays}일 이후`;
      return {
        valid: false,
        message: `연차는 입사일로부터 ${startDaysText}부터 사용 가능합니다. (${leaveInfo.daysUntilEligible}일 후 사용 가능)`,
      };
    }

    // 잔여 표시는 승인분만 차감하지만, 신규 신청 한도는 대기 건도 예약으로 포함
    const reservedVacationDays = await getUsedDaysInLeaveYear(
      userId,
      'annual',
      leaveYear,
      excludeVacationId,
      true
    );
    const availableForRequest = Math.max(
      0,
      leaveInfo.totalEarnedDays - reservedVacationDays - leaveInfo.absenceUsedDays
    );

    if (requestedDays > availableForRequest) {
      return {
        valid: false,
        message: `인도 회계연도(${yearLabel}) 사용 가능 연차(${availableForRequest}일)를 초과했습니다. 미사용 연차는 이월되지 않습니다.`,
        availableDays: availableForRequest,
      };
    }

    return { valid: true, availableDays: leaveInfo.availableDays };
  }

  const policy = await getCompanyVacationPolicy(user.company_id);
  const quota = policy.leaveTypeDays[vacationType];

  if (quota == null || quota <= 0) {
    return { valid: true };
  }

  const usedDays = await getUsedDaysInLeaveYear(
    userId,
    vacationType,
    leaveYear,
    excludeVacationId,
    true
  );
  const availableDays = Math.max(0, quota - usedDays);

  if (requestedDays > availableDays) {
    return {
      valid: false,
      message: `인도 회계연도(${yearLabel}) ${TYPE_LABELS[vacationType] || vacationType} 잔여 일수(${availableDays}일)를 초과했습니다. 미사용 일수는 이월되지 않습니다.`,
      availableDays,
    };
  }

  return { valid: true, availableDays };
}

export type LeaveBalanceCell = {
  quota: number;
  used: number;
  remaining: number;
  vacationUsed?: number;
  absenceUsed?: number;
};

export type LeaveBalanceRow = {
  userId: number;
  username: string;
  department: string;
  position: string;
  hireDate: string | null;
  leaveYearLabel: string | null;
  canUseAnnualLeave: boolean;
  balances: Record<string, LeaveBalanceCell>;
};

const BALANCE_TYPES = [
  'annual',
  'sick',
  'personal',
  'study',
  'maternity',
  'paternity',
  'marriage',
  'bereavement',
] as const;

function buildZeroBalances(): Record<string, LeaveBalanceCell> {
  const balances: Record<string, LeaveBalanceCell> = {};
  for (const type of BALANCE_TYPES) {
    balances[type] = { quota: 0, used: 0, remaining: 0, vacationUsed: 0, absenceUsed: 0 };
  }
  return balances;
}

function formatHireDate(hireDate: unknown): string | null {
  if (!hireDate) return null;
  if (typeof hireDate === 'string') {
    return hireDate.split('T')[0];
  }
  return toDateOnlyString(new Date(hireDate as Date));
}

export async function getUserLeaveBalanceSummary(userId: number): Promise<LeaveBalanceRow | null> {
  const user = await (User as any).findByPk(userId, {
    attributes: ['id', 'username', 'department', 'position', 'hire_date', 'company_id', 'status'],
  });

  if (!user) {
    return null;
  }

  const baseRow = {
    userId: user.id,
    username: user.username || '',
    department: user.department || '',
    position: user.position || '',
    hireDate: formatHireDate(user.hire_date),
  };

  const leaveYear = getLeaveYearRange(new Date());

  if (!user.hire_date) {
    return {
      ...baseRow,
      leaveYearLabel: leaveYear.label,
      canUseAnnualLeave: false,
      balances: buildZeroBalances(),
    };
  }

  const policy = await getCompanyVacationPolicy(user.company_id);
  const annualInfo = await calculateAnnualLeave(userId);

  const balances: Record<string, LeaveBalanceCell> = {
    annual: {
      quota: annualInfo.totalEarnedDays,
      used: annualInfo.usedDays,
      remaining: annualInfo.availableDays,
      vacationUsed: annualInfo.vacationUsedDays,
      absenceUsed: annualInfo.absenceUsedDays,
    },
  };

  for (const type of BALANCE_TYPES) {
    if (type === 'annual') continue;
    const quota = policy.leaveTypeDays[type] ?? 0;
    const used = await getUsedDaysInLeaveYear(userId, type, leaveYear);
    balances[type] = {
      quota,
      used,
      remaining: Math.max(0, quota - used),
    };
  }

  return {
    ...baseRow,
    leaveYearLabel: leaveYear.label,
    canUseAnnualLeave: annualInfo.canUseAnnualLeave,
    balances,
  };
}

export async function getCompanyLeaveBalances(companyId: number): Promise<{
  rows: LeaveBalanceRow[];
  availableTypes: string[];
  fiscalYearLabel: string;
}> {
  const policy = await getCompanyVacationPolicy(companyId);
  const leaveYear = getLeaveYearRange(new Date());
  const users = await (User as any).findAll({
    where: {
      company_id: companyId,
      status: 'active',
    },
    attributes: ['id'],
    order: [['username', 'ASC']],
  });

  const rows: LeaveBalanceRow[] = [];
  for (const u of users) {
    const row = await getUserLeaveBalanceSummary(u.id);
    if (row) {
      rows.push(row);
    }
  }
  return {
    rows,
    availableTypes: policy.availableTypes,
    fiscalYearLabel: leaveYear.label,
  };
}

export { DEFAULT_LEAVE_TYPE_DAYS, DEFAULT_AVAILABLE_TYPES };
