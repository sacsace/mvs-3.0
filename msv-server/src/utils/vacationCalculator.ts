import { User, Vacation } from '../models';
import { Op } from 'sequelize';

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
};

function toDateOnlyString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 입사일 기준 휴가 연도: 입사 기념일 ~ 다음 기념일 전날 */
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
}

async function getCompanyVacationPolicy(companyId: number): Promise<CompanyVacationPolicy> {
  try {
    const { Company } = await import('../models');
    const company = await (Company as any).findByPk(companyId);

    if (!company) {
      return { annualLeaveStartDays: 240, annualLeaveEarnDays: 20, leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS } };
    }

    const policy = company.settings?.vacationPolicy;
    return {
      annualLeaveStartDays: policy?.annualLeaveStartDays ?? 240,
      annualLeaveEarnDays: policy?.annualLeaveEarnDays ?? 20,
      leaveTypeDays: {
        ...DEFAULT_LEAVE_TYPE_DAYS,
        ...(policy?.leaveTypeDays || {}),
      },
    };
  } catch (error) {
    console.error('휴가 정책 조회 오류:', error);
    return { annualLeaveStartDays: 240, annualLeaveEarnDays: 20, leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS } };
  }
}

async function getUsedDaysInLeaveYear(
  userId: number,
  vacationType: string,
  leaveYear: LeaveYearRange,
  excludeVacationId?: number
): Promise<number> {
  const whereClause: any = {
    user_id: userId,
    vacation_type: vacationType,
    status: { [Op.in]: ['approved', 'pending'] },
    is_active: true,
    start_date: {
      [Op.between]: [toDateOnlyString(leaveYear.start), toDateOnlyString(leaveYear.end)],
    },
  };

  if (excludeVacationId) {
    whereClause.id = { [Op.ne]: excludeVacationId };
  }

  const rows = await (Vacation as any).findAll({
    where: whereClause,
    attributes: ['days'],
  });

  return rows.reduce((sum: number, row: any) => sum + (row.days || 0), 0);
}

/**
 * 연차: 입사일 기준 휴가 연도 내에서만 적립·사용 (이월 불가)
 */
export async function calculateAnnualLeave(userId: number, excludeVacationId?: number): Promise<AnnualLeaveInfo> {
  const empty: AnnualLeaveInfo = {
    availableDays: 0,
    usedDays: 0,
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
    const earnDays = policy.annualLeaveEarnDays;

    const hireDate = new Date(user.hire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    hireDate.setHours(0, 0, 0, 0);

    const leaveYear = getHireDateLeaveYearRange(hireDate, today);

    const eligibilityDate = new Date(hireDate);
    eligibilityDate.setDate(eligibilityDate.getDate() + startDays);

    const canUseAnnualLeave = today >= eligibilityDate;
    const daysUntilEligible = canUseAnnualLeave
      ? 0
      : Math.ceil((eligibilityDate.getTime() - today.getTime()) / DAY_MS);

    let totalEarnedDays = 0;
    if (canUseAnnualLeave) {
      const periodStart = new Date(Math.max(eligibilityDate.getTime(), leaveYear.start.getTime()));
      const periodEnd = new Date(Math.min(today.getTime(), leaveYear.end.getTime()));
      if (periodStart <= periodEnd) {
        const eligibleDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / DAY_MS) + 1;
        totalEarnedDays = Math.floor(eligibleDays / earnDays);
      }
    }

    const usedDays = await getUsedDaysInLeaveYear(userId, 'annual', leaveYear, excludeVacationId);
    const availableDays = Math.max(0, totalEarnedDays - usedDays);

    const leaveYearStart = toDateOnlyString(leaveYear.start);
    const leaveYearEnd = toDateOnlyString(leaveYear.end);

    return {
      availableDays,
      usedDays,
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
  paternity: '육아휴가',
};

/**
 * 모든 휴가 유형 — 입사일 기준 휴가 연도 내 잔여 일수 검증 (누적·이월 없음)
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

  const hireDate = new Date(user.hire_date);
  hireDate.setHours(0, 0, 0, 0);
  const leaveYear = getHireDateLeaveYearRange(hireDate, new Date());
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

    if (requestedDays > leaveInfo.availableDays) {
      return {
        valid: false,
        message: `입사일 기준 휴가 연도(${yearLabel}) 사용 가능 연차(${leaveInfo.availableDays}일)를 초과했습니다. 미사용 연차는 이월되지 않습니다.`,
        availableDays: leaveInfo.availableDays,
      };
    }

    return { valid: true, availableDays: leaveInfo.availableDays };
  }

  const policy = await getCompanyVacationPolicy(user.company_id);
  const quota = policy.leaveTypeDays[vacationType];

  if (quota == null || quota <= 0) {
    return { valid: true };
  }

  const usedDays = await getUsedDaysInLeaveYear(userId, vacationType, leaveYear, excludeVacationId);
  const availableDays = Math.max(0, quota - usedDays);

  if (requestedDays > availableDays) {
    return {
      valid: false,
      message: `입사일 기준 휴가 연도(${yearLabel}) ${TYPE_LABELS[vacationType] || vacationType} 잔여 일수(${availableDays}일)를 초과했습니다. 미사용 일수는 이월되지 않습니다.`,
      availableDays,
    };
  }

  return { valid: true, availableDays };
}

export { DEFAULT_LEAVE_TYPE_DAYS };
