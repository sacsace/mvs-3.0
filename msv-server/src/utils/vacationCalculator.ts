import { User, Vacation } from '../models';
import { Op } from 'sequelize';

const DAY_MS = 1000 * 60 * 60 * 24;

/** 인도 회계연도: 4월 1일 ~ 다음해 3월 31일 (앱 내 인보이스·호텔 FY와 동일) */
export type FiscalYearRange = {
  start: Date;
  end: Date;
  label: string;
};

export function getFiscalYearRange(referenceDate: Date = new Date()): FiscalYearRange {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  const year = date.getFullYear();
  const month = date.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;
  const start = new Date(fyStartYear, 3, 1);
  const end = new Date(fyStartYear + 1, 2, 31);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  const label = `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`;
  return { start, end, label };
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** 회계연도별 고정 지급 일수 (이월·누적 없음) */
const FISCAL_YEAR_LEAVE_QUOTAS: Partial<Record<string, number>> = {
  sick: 12,
  personal: 12,
  paternity: 15
};

interface AnnualLeaveInfo {
  availableDays: number;
  usedDays: number;
  totalEarnedDays: number;
  canUseAnnualLeave: boolean;
  daysUntilEligible: number;
  policyStartDays?: number;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  fiscalYearLabel?: string;
}

async function getCompanyVacationPolicy(companyId: number): Promise<{ annualLeaveStartDays: number; annualLeaveEarnDays: number }> {
  try {
    const { Company } = await import('../models');
    const company = await (Company as any).findByPk(companyId);

    if (!company) {
      return { annualLeaveStartDays: 240, annualLeaveEarnDays: 20 };
    }

    const policy = company.settings?.vacationPolicy;
    return {
      annualLeaveStartDays: policy?.annualLeaveStartDays ?? 240,
      annualLeaveEarnDays: policy?.annualLeaveEarnDays ?? 20
    };
  } catch (error) {
    console.error('휴가 정책 조회 오류:', error);
    return { annualLeaveStartDays: 240, annualLeaveEarnDays: 20 };
  }
}

async function getUsedDaysInFiscalYear(
  userId: number,
  vacationType: string,
  fiscalYear: FiscalYearRange,
  excludeVacationId?: number
): Promise<number> {
  const whereClause: any = {
    user_id: userId,
    vacation_type: vacationType,
    status: { [Op.in]: ['approved', 'pending'] },
    is_active: true,
    start_date: {
      [Op.between]: [toDateOnlyString(fiscalYear.start), toDateOnlyString(fiscalYear.end)]
    }
  };

  if (excludeVacationId) {
    whereClause.id = { [Op.ne]: excludeVacationId };
  }

  const rows = await (Vacation as any).findAll({
    where: whereClause,
    attributes: ['days']
  });

  return rows.reduce((sum: number, row: any) => sum + (row.days || 0), 0);
}

/**
 * 연차: 회계연도 내에서만 적립·사용 (이월 불가)
 */
export async function calculateAnnualLeave(userId: number, excludeVacationId?: number): Promise<AnnualLeaveInfo> {
  const empty: AnnualLeaveInfo = {
    availableDays: 0,
    usedDays: 0,
    totalEarnedDays: 0,
    canUseAnnualLeave: false,
    daysUntilEligible: 0
  };

  try {
    const user = await (User as any).findByPk(userId, {
      attributes: ['id', 'hire_date', 'company_id']
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

    const fiscalYear = getFiscalYearRange(today);

    const eligibilityDate = new Date(hireDate);
    eligibilityDate.setDate(eligibilityDate.getDate() + startDays);

    const canUseAnnualLeave = today >= eligibilityDate;
    const daysUntilEligible = canUseAnnualLeave
      ? 0
      : Math.ceil((eligibilityDate.getTime() - today.getTime()) / DAY_MS);

    let totalEarnedDays = 0;
    if (canUseAnnualLeave) {
      const periodStart = new Date(Math.max(eligibilityDate.getTime(), fiscalYear.start.getTime()));
      const periodEnd = new Date(Math.min(today.getTime(), fiscalYear.end.getTime()));
      if (periodStart <= periodEnd) {
        const eligibleDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / DAY_MS);
        totalEarnedDays = Math.floor(eligibleDays / earnDays);
      }
    }

    const usedDays = await getUsedDaysInFiscalYear(userId, 'annual', fiscalYear, excludeVacationId);
    const availableDays = Math.max(0, totalEarnedDays - usedDays);

    return {
      availableDays,
      usedDays,
      totalEarnedDays,
      canUseAnnualLeave,
      daysUntilEligible,
      policyStartDays: startDays,
      fiscalYearStart: toDateOnlyString(fiscalYear.start),
      fiscalYearEnd: toDateOnlyString(fiscalYear.end),
      fiscalYearLabel: fiscalYear.label
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

/**
 * 모든 휴가 유형 — 회계연도 기준 잔여 일수 검증 (누적·이월 없음)
 */
export async function validateVacationLeaveRequest(
  userId: number,
  vacationType: string,
  requestedDays: number,
  excludeVacationId?: number
): Promise<{ valid: boolean; message?: string; availableDays?: number }> {
  const fiscalYear = getFiscalYearRange(new Date());
  const fyLabel = fiscalYear.label;

  if (vacationType === 'annual') {
    const leaveInfo = await calculateAnnualLeave(userId, excludeVacationId);

    if (!leaveInfo.canUseAnnualLeave) {
      const startDays = leaveInfo.policyStartDays || 240;
      const startDaysText = startDays === 0 ? '즉시' : `${startDays}일 이후`;
      return {
        valid: false,
        message: `연차는 입사일로부터 ${startDaysText}부터 사용 가능합니다. (${leaveInfo.daysUntilEligible}일 후 사용 가능)`
      };
    }

    if (requestedDays > leaveInfo.availableDays) {
      return {
        valid: false,
        message: `회계연도(${fyLabel}) 사용 가능 연차(${leaveInfo.availableDays}일)를 초과했습니다. 미사용 연차는 이월되지 않습니다.`,
        availableDays: leaveInfo.availableDays
      };
    }

    return { valid: true, availableDays: leaveInfo.availableDays };
  }

  const quota = FISCAL_YEAR_LEAVE_QUOTAS[vacationType];
  if (quota != null) {
    const usedDays = await getUsedDaysInFiscalYear(userId, vacationType, fiscalYear, excludeVacationId);
    const availableDays = Math.max(0, quota - usedDays);

    if (requestedDays > availableDays) {
      const typeLabel: Record<string, string> = {
        sick: '병가',
        personal: '개인사유',
        paternity: '육아휴가'
      };
      return {
        valid: false,
        message: `회계연도(${fyLabel}) ${typeLabel[vacationType] || vacationType} 잔여 일수(${availableDays}일)를 초과했습니다. 미사용 일수는 이월되지 않습니다.`,
        availableDays
      };
    }

    return { valid: true, availableDays };
  }

  return { valid: true };
}
