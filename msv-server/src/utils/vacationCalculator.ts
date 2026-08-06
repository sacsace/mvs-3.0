import { User, Vacation, AcFinancialYear } from '../models';
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

/** 인도 회계연도 기본값: 4/1 ~ 다음 해 3/31 */
export function getDefaultIndiaFiscalYearRange(referenceDate: Date = new Date()): LeaveYearRange {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const startYear = ref.getMonth() + 1 >= 4 ? ref.getFullYear() : ref.getFullYear() - 1;
  const start = new Date(startYear, 3, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(startYear + 1, 2, 31);
  end.setHours(23, 59, 59, 999);
  return {
    start,
    end,
    label: `${toDateOnlyString(start)} ~ ${toDateOnlyString(end)}`,
  };
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

/** @deprecated 입사일 기준 연도 — 회계연도 전환 후 호환용 */
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
  availableTypes: string[];
}

async function getCompanyVacationPolicy(companyId: number): Promise<CompanyVacationPolicy> {
  try {
    const { Company } = await import('../models');
    const company = await (Company as any).findByPk(companyId);

    if (!company) {
      return {
        annualLeaveStartDays: 240,
        annualLeaveEarnDays: 20,
        leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS },
        availableTypes: [...DEFAULT_AVAILABLE_TYPES],
      };
    }

    const policy = company.settings?.vacationPolicy;
    const availableTypes = Array.isArray(policy?.availableTypes) && policy.availableTypes.length > 0
      ? policy.availableTypes.map((t: unknown) => String(t))
      : [...DEFAULT_AVAILABLE_TYPES];
    return {
      annualLeaveStartDays: policy?.annualLeaveStartDays ?? 240,
      annualLeaveEarnDays: policy?.annualLeaveEarnDays ?? 20,
      leaveTypeDays: {
        ...DEFAULT_LEAVE_TYPE_DAYS,
        ...(policy?.leaveTypeDays || {}),
      },
      availableTypes,
    };
  } catch (error) {
    console.error('휴가 정책 조회 오류:', error);
    return {
      annualLeaveStartDays: 240,
      annualLeaveEarnDays: 20,
      leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS },
      availableTypes: [...DEFAULT_AVAILABLE_TYPES],
    };
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
 * 연차: 회계연도 내에서만 적립·사용 (이월 불가). 사용 가능 시점은 입사일+대기일 기준.
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

    const leaveYear = await getCompanyFiscalYearRange(user.company_id, today);

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
  paternity: '남편 출산 휴가',
  marriage: '결혼휴가',
  bereavement: '조사 휴가',
};

/**
 * 모든 휴가 유형 — 회계연도 내 잔여 일수 검증 (누적·이월 없음)
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

  const leaveYear = await getCompanyFiscalYearRange(user.company_id, new Date());
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
        message: `회계연도(${yearLabel}) 사용 가능 연차(${leaveInfo.availableDays}일)를 초과했습니다. 미사용 연차는 이월되지 않습니다.`,
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
      message: `회계연도(${yearLabel}) ${TYPE_LABELS[vacationType] || vacationType} 잔여 일수(${availableDays}일)를 초과했습니다. 미사용 일수는 이월되지 않습니다.`,
      availableDays,
    };
  }

  return { valid: true, availableDays };
}

export type LeaveBalanceRow = {
  userId: number;
  username: string;
  department: string;
  position: string;
  hireDate: string | null;
  leaveYearLabel: string | null;
  canUseAnnualLeave: boolean;
  balances: Record<string, { quota: number; used: number; remaining: number }>;
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

function buildZeroBalances(): Record<string, { quota: number; used: number; remaining: number }> {
  const balances: Record<string, { quota: number; used: number; remaining: number }> = {};
  for (const type of BALANCE_TYPES) {
    balances[type] = { quota: 0, used: 0, remaining: 0 };
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

  const fiscalYear = await getCompanyFiscalYearRange(user.company_id, new Date());

  if (!user.hire_date) {
    return {
      ...baseRow,
      leaveYearLabel: fiscalYear.label,
      canUseAnnualLeave: false,
      balances: buildZeroBalances(),
    };
  }

  const policy = await getCompanyVacationPolicy(user.company_id);
  const annualInfo = await calculateAnnualLeave(userId);

  const balances: Record<string, { quota: number; used: number; remaining: number }> = {
    annual: {
      quota: annualInfo.totalEarnedDays,
      used: annualInfo.usedDays,
      remaining: annualInfo.availableDays,
    },
  };

  for (const type of BALANCE_TYPES) {
    if (type === 'annual') continue;
    const quota = policy.leaveTypeDays[type] ?? 0;
    const used = await getUsedDaysInLeaveYear(userId, type, fiscalYear);
    balances[type] = {
      quota,
      used,
      remaining: Math.max(0, quota - used),
    };
  }

  return {
    ...baseRow,
    leaveYearLabel: fiscalYear.label,
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
  const fiscalYear = await getCompanyFiscalYearRange(companyId, new Date());
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
    fiscalYearLabel: fiscalYear.label,
  };
}

export { DEFAULT_LEAVE_TYPE_DAYS, DEFAULT_AVAILABLE_TYPES };
