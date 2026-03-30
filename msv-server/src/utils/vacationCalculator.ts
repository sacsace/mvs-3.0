import { User, Vacation } from '../models';
import { Op } from 'sequelize';

/**
 * 연차 계산 유틸리티
 * - 회사 정책에 따라 입사일로부터 N일 이후 연차 사용 가능
 * - 20일 근무당 1일 연차 지급
 */

interface AnnualLeaveInfo {
  availableDays: number; // 사용 가능한 연차 일수
  usedDays: number; // 사용한 연차 일수
  totalEarnedDays: number; // 총 획득한 연차 일수
  canUseAnnualLeave: boolean; // 연차 사용 가능 여부
  daysUntilEligible: number; // 연차 사용 가능까지 남은 일수
  policyStartDays?: number; // 정책상 연차 시작일
}

/**
 * 회사 휴가 정책 조회
 */
async function getCompanyVacationPolicy(companyId: number): Promise<{ annualLeaveStartDays: number; annualLeaveEarnDays: number }> {
  try {
    const { Company } = await import('../models');
    const company = await (Company as any).findByPk(companyId);
    
    if (!company) {
      return { annualLeaveStartDays: 240, annualLeaveEarnDays: 20 }; // 기본값
    }

    const policy = company.settings?.vacationPolicy;
    return {
      annualLeaveStartDays: policy?.annualLeaveStartDays ?? 240,
      annualLeaveEarnDays: policy?.annualLeaveEarnDays ?? 20
    };
  } catch (error) {
    console.error('휴가 정책 조회 오류:', error);
    return { annualLeaveStartDays: 240, annualLeaveEarnDays: 20 }; // 기본값
  }
}

/**
 * 사용자의 연차 정보 계산
 * @param userId 사용자 ID
 * @param excludeVacationId 제외할 휴가 ID (수정 시 기존 휴가 제외)
 * @returns 연차 정보
 */
export async function calculateAnnualLeave(userId: number, excludeVacationId?: number): Promise<AnnualLeaveInfo> {
  try {
    // 사용자 정보 조회
    const user = await (User as any).findByPk(userId, {
      attributes: ['id', 'hire_date', 'company_id']
    });

    if (!user || !user.hire_date) {
      return {
        availableDays: 0,
        usedDays: 0,
        totalEarnedDays: 0,
        canUseAnnualLeave: false,
        daysUntilEligible: 0
      };
    }

    // 회사 휴가 정책 조회
    const policy = await getCompanyVacationPolicy(user.company_id);
    const startDays = policy.annualLeaveStartDays;
    const earnDays = policy.annualLeaveEarnDays;

    const hireDate = new Date(user.hire_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    hireDate.setHours(0, 0, 0, 0);

    // 입사일로부터 경과 일수 계산
    const daysSinceHire = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));

    // 연차 사용 가능 여부 (정책에 따라)
    const eligibilityDate = new Date(hireDate);
    eligibilityDate.setDate(eligibilityDate.getDate() + startDays);
    
    const canUseAnnualLeave = today >= eligibilityDate;
    const daysUntilEligible = canUseAnnualLeave ? 0 : Math.ceil((eligibilityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 총 획득한 연차 일수 계산 (정책에 따라)
    // 연차 사용 가능일 이후부터 계산
    let totalEarnedDays = 0;
    if (canUseAnnualLeave) {
      const eligibleDays = Math.max(0, daysSinceHire - startDays);
      totalEarnedDays = Math.floor(eligibleDays / earnDays);
    }

    // 사용한 연차 일수 계산 (승인된 연차만)
    const whereClause: any = {
      user_id: userId,
      vacation_type: 'annual',
      status: {
        [Op.in]: ['approved', 'pending'] // 승인된 것과 대기 중인 것 모두 포함
      },
      is_active: true
    };
    
    // 수정 시 기존 휴가 제외
    if (excludeVacationId) {
      whereClause.id = { [Op.ne]: excludeVacationId };
    }
    
    const usedVacations = await (Vacation as any).findAll({
      where: whereClause,
      attributes: ['days']
    });

    const usedDays = usedVacations.reduce((sum: number, vacation: any) => sum + (vacation.days || 0), 0);

    // 사용 가능한 연차 일수 = 총 획득 일수 - 사용한 일수
    const availableDays = Math.max(0, totalEarnedDays - usedDays);

    return {
      availableDays,
      usedDays,
      totalEarnedDays,
      canUseAnnualLeave,
      daysUntilEligible,
      policyStartDays: startDays
    };
  } catch (error) {
    console.error('연차 계산 오류:', error);
    return {
      availableDays: 0,
      usedDays: 0,
      totalEarnedDays: 0,
      canUseAnnualLeave: false,
      daysUntilEligible: 0
    };
  }
}

/**
 * 연차 사용 가능 여부 확인
 * @param userId 사용자 ID
 * @param requestedDays 신청한 연차 일수
 * @param excludeVacationId 제외할 휴가 ID (수정 시 기존 휴가 제외)
 * @returns 사용 가능 여부 및 메시지
 */
export async function validateAnnualLeaveRequest(
  userId: number,
  requestedDays: number,
  excludeVacationId?: number
): Promise<{ valid: boolean; message?: string; availableDays?: number }> {
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
      message: `사용 가능한 연차 일수(${leaveInfo.availableDays}일)를 초과했습니다.`,
      availableDays: leaveInfo.availableDays
    };
  }

  return {
    valid: true,
    availableDays: leaveInfo.availableDays
  };
}

