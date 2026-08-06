import { Response } from 'express';
import { AuthRequest } from '../types';
import { Vacation, User, Company } from '../models';
import { Op } from 'sequelize';
import {
  calculateAnnualLeave,
  validateVacationLeaveRequest,
  DEFAULT_LEAVE_TYPE_DAYS,
  getCompanyLeaveBalances,
} from '../utils/vacationCalculator';
import * as XLSX from 'xlsx';
import { pushNotification } from './notificationController';
import SocketService from '../services/socketService';

// 휴가 목록 조회
export const getVacations = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { user_id, status, vacation_type, start_date, end_date, company_id, approved_by, same_department } = req.query;

    const sameDept = same_department === 'true' || same_department === '1';
    const approvedByParam =
      approved_by !== undefined && approved_by !== null && String(approved_by).trim() !== ''
        ? parseInt(String(approved_by), 10)
        : undefined;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 휴가 조회 가능, 아니면 자신의 회사 휴가만
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
      
      // 일반 사용자: 기본은 본인만. same_department 시 동일 부서 / 결재함(approved_by) 조회 시에는 신청자 제한 제외
      if (userRole === 'user' && !sameDept && approvedByParam === undefined) {
        whereClause.user_id = userId;
      }
    } else {
      // root는 company_id 쿼리로 회사 전환 가능, 미지정 시 등록된 회사 기준
      if (userRole === 'root') {
        if (company_id) {
          whereClause.company_id = parseInt(company_id as string);
        } else if (companyId) {
          whereClause.company_id = companyId;
        }
      } else {
        // audit는 모든 회사 조회 가능
        if (tenantId) whereClause.tenant_id = tenantId;
        if (companyId) whereClause.company_id = companyId;
      }
    }

    if (user_id && !sameDept) {
      whereClause.user_id = user_id;
    }

    if (approvedByParam !== undefined && Number.isFinite(approvedByParam)) {
      whereClause.approved_by = approvedByParam;
    }

    if (status) {
      whereClause.status = status;
    }

    if (vacation_type) {
      whereClause.vacation_type = vacation_type;
    }

    if (start_date && end_date) {
      whereClause[Op.or] = [
        {
          start_date: {
            [Op.between]: [start_date, end_date]
          }
        },
        {
          end_date: {
            [Op.between]: [start_date, end_date]
          }
        }
      ];
    }

    // 활성화된 휴가만 조회
    whereClause.is_active = true;

    const userDepartment = (req.user as any)?.department;
    const userInclude: any = {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number', 'avatar_url'],
      required: true,
    };

    if (sameDept) {
      if (!userDepartment || !String(userDepartment).trim()) {
        return res.status(400).json({
          success: false,
          message: '부서 정보가 없어 동일 부서 휴가를 조회할 수 없습니다.',
        });
      }
      userInclude.where = { department: userDepartment };
    }

    const vacations = await (Vacation as any).findAll({
      where: whereClause,
      include: [
        userInclude,
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['applied_date', 'DESC']]
    });

    res.json({
      success: true,
      data: vacations
    });
  } catch (error: any) {
    console.error('휴가 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '휴가 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 상세 조회
export const getVacation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
      
      if (userRole === 'user') {
        whereClause.user_id = userId;
      }
    }

    // 활성화된 휴가만 조회
    whereClause.is_active = true;

    const vacation = await (Vacation as any).findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number', 'avatar_url']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    if (!vacation) {
      return res.status(404).json({ 
        success: false, 
        message: '휴가 정보를 찾을 수 없습니다.' 
      });
    }

    res.json({ success: true, data: vacation });
  } catch (error: any) {
    console.error('휴가 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '휴가 상세 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 생성
export const createVacation = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { user_id, vacation_type, start_date, end_date, reason, attachments, approved_by } = req.body;

    // 사용할 user_id 결정 (관리자는 다른 사용자 대신 신청 가능)
    const targetUserId = (userRole === 'admin' || userRole === 'root') && user_id ? user_id : userId;

    if (!vacation_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 필드가 누락되었습니다.' 
      });
    }

    // 날짜 계산
    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 휴가 유형별 회계연도 잔여 일수 검증 (이월·누적 없음)
    const leaveValidation = await validateVacationLeaveRequest(targetUserId, vacation_type, days);
    if (!leaveValidation.valid) {
      return res.status(400).json({
        success: false,
        message: leaveValidation.message || '휴가 신청이 불가능합니다.'
      });
    }

    // 중복 휴가 검사: 이미 신청/승인된 휴가와 날짜가 겹치는지 확인
    // 겹침 조건: 기존.start_date <= 신청.end_date AND 기존.end_date >= 신청.start_date
    const overlappingVacation = await (Vacation as any).findOne({
      where: {
        user_id: targetUserId,
        is_active: true,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.and]: [
          { start_date: { [Op.lte]: end_date } },
          { end_date: { [Op.gte]: start_date } }
        ]
      }
    });

    if (overlappingVacation) {
      return res.status(400).json({
        success: false,
        message: `이미 신청된 휴가와 날짜가 중복됩니다. (${overlappingVacation.start_date} ~ ${overlappingVacation.end_date})`
      });
    }

    const vacationData: any = {
      tenant_id: tenantId,
      company_id: companyId,
      user_id: targetUserId,
      vacation_type,
      is_active: true,
      start_date,
      end_date,
      days,
      reason,
      attachments: attachments ? JSON.stringify(attachments) : null,
      status: 'pending',
      applied_date: new Date().toISOString().split('T')[0]
    };

    // 승인자 지정 (제공된 경우)
    if (approved_by) {
      vacationData.approved_by = approved_by;
    }

    const vacation = await (Vacation as any).create(vacationData);

    // 사용자 정보 포함하여 반환
    const vacationWithUser = await (Vacation as any).findByPk(vacation.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number', 'avatar_url']
        }
      ]
    });

    if (approved_by && Number(approved_by) !== userId) {
      const applicantName =
        (vacationWithUser as any)?.user?.username || req.user?.username || '신청자';
      const socketService = (req as any).socketService as SocketService | undefined;
      pushNotification(
        {
          title: '휴가 승인 요청',
          message: `${applicantName}님이 휴가를 신청했습니다. (${start_date} ~ ${end_date})`,
          type: 'info',
          target_type: 'user',
          target_id: Number(approved_by),
          tenant_id: tenantId,
          company_id: companyId,
          sender_user_id: userId,
          data: {
            feature: 'vacation',
            vacation_id: vacation.id,
            href: '/hr/leave',
            title_en: 'Leave Approval Request',
            message_en: `${applicantName} submitted a leave request. (${start_date} ~ ${end_date})`
          }
        },
        socketService
      );
    }

    res.status(201).json({
      success: true, 
      data: vacationWithUser 
    });
  } catch (error: any) {
    console.error('휴가 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '휴가 생성 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 수정
export const updateVacation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { vacation_type, start_date, end_date, reason, attachments, approved_by } = req.body;

    const whereClause: any = { id, is_active: true };

    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const vacation = await (Vacation as any).findOne({
      where: whereClause
    });

    if (!vacation) {
      return res.status(404).json({
        success: false,
        message: '휴가 정보를 찾을 수 없습니다.'
      });
    }

    const isElevated = userRole === 'root' || userRole === 'admin' || userRole === 'audit';
    const isApplicant = Number(vacation.user_id) === Number(userId);
    const isCurrentApprover =
      vacation.approved_by != null && Number(vacation.approved_by) === Number(userId);
    const isApproverOnlyUpdate =
      approved_by !== undefined &&
      vacation_type === undefined &&
      start_date === undefined &&
      end_date === undefined &&
      reason === undefined &&
      attachments === undefined;

    if (!isElevated) {
      if (isApproverOnlyUpdate) {
        if (vacation.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: '대기 중인 휴가만 승인자를 변경할 수 있습니다.'
          });
        }
        if (!isApplicant && !isCurrentApprover) {
          return res.status(403).json({
            success: false,
            message: '승인자를 변경할 권한이 없습니다.'
          });
        }
      } else {
        // 일반 사용자는 자신의 대기 중 휴가만 수정 가능
        if (!isApplicant || vacation.status !== 'pending') {
          return res.status(403).json({
            success: false,
            message: '휴가를 수정할 권한이 없습니다.'
          });
        }
      }
    }

    const previousApproverId =
      vacation.approved_by != null ? Number(vacation.approved_by) : null;

    // 날짜 재계산
    let days = vacation.days;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // 연차 유형으로 변경하거나 연차 일수가 변경된 경우 검증
    const finalVacationType = vacation_type || vacation.vacation_type;
    const finalStartDate = start_date || vacation.start_date;
    const finalEndDate = end_date || vacation.end_date;
    const finalDays = days;
    if (finalVacationType) {
      const validation = await validateVacationLeaveRequest(vacation.user_id, finalVacationType, finalDays, vacation.id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message || '휴가 신청이 불가능합니다.'
        });
      }
    }

    // 중복 휴가 검사: 수정 시 본인 휴가 제외하고 다른 휴가와 날짜 겹침 확인
    const overlappingVacation = await (Vacation as any).findOne({
      where: {
        user_id: vacation.user_id,
        id: { [Op.ne]: vacation.id },
        is_active: true,
        status: { [Op.in]: ['pending', 'approved'] },
        [Op.and]: [
          { start_date: { [Op.lte]: finalEndDate } },
          { end_date: { [Op.gte]: finalStartDate } }
        ]
      }
    });

    if (overlappingVacation) {
      return res.status(400).json({
        success: false,
        message: `이미 신청된 휴가와 날짜가 중복됩니다. (${overlappingVacation.start_date} ~ ${overlappingVacation.end_date})`
      });
    }

    const updateData: any = isApproverOnlyUpdate
      ? {}
      : {
          vacation_type: finalVacationType,
          start_date: finalStartDate,
          end_date: finalEndDate,
          days: finalDays,
          reason: reason !== undefined ? reason : vacation.reason,
          attachments: attachments !== undefined ? JSON.stringify(attachments) : vacation.attachments
        };

    // 승인자 업데이트 (제공된 경우)
    if (approved_by !== undefined) {
      const nextApproverId =
        approved_by === null || approved_by === ''
          ? null
          : Number(approved_by);
      if (nextApproverId != null && (!Number.isFinite(nextApproverId) || nextApproverId < 1)) {
        return res.status(400).json({
          success: false,
          message: '승인자 정보가 올바르지 않습니다.'
        });
      }
      updateData.approved_by = nextApproverId;
    }

    await vacation.update(updateData);

    // 사용자 정보 포함하여 반환
    const vacationWithUser = await (Vacation as any).findByPk(vacation.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number', 'avatar_url']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    const nextApproverId =
      (vacationWithUser as any)?.approved_by != null
        ? Number((vacationWithUser as any).approved_by)
        : null;
    if (
      nextApproverId != null &&
      nextApproverId !== previousApproverId &&
      nextApproverId !== Number(userId)
    ) {
      const applicantName =
        (vacationWithUser as any)?.user?.username || req.user?.username || '신청자';
      pushNotification(
        {
          title: '휴가 승인 요청',
          message: `${applicantName}님의 휴가 승인 요청이 지정되었습니다. (${vacation.start_date} ~ ${vacation.end_date})`,
          type: 'info',
          target_type: 'user',
          target_id: nextApproverId,
          tenant_id: tenantId,
          company_id: companyId,
          sender_user_id: userId,
          data: {
            feature: 'vacation',
            vacation_id: vacation.id,
            href: '/hr/leave',
            title_en: 'Leave Approval Request',
            message_en: `You were assigned to approve leave for ${applicantName}. (${vacation.start_date} ~ ${vacation.end_date})`
          }
        },
        (req as any).socketService
      );
    }

    res.json({
      success: true,
      data: vacationWithUser
    });
  } catch (error: any) {
    console.error('휴가 수정 오류:', error);
    res.status(500).json({
      success: false, 
      message: '휴가 수정 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 삭제
export const deleteVacation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
      
      // 일반 사용자는 자신의 휴가만 삭제 가능
      if (userRole === 'user') {
        whereClause.user_id = userId;
        whereClause.status = 'pending'; // 승인 전 상태만 삭제 가능
      }
    }

    const vacation = await (Vacation as any).findOne({
      where: whereClause
    });

    if (!vacation) {
      return res.status(404).json({ 
        success: false, 
        message: '휴가 정보를 찾을 수 없습니다.' 
      });
    }

    // 소프트 삭제: is_active를 false로 설정
    await vacation.update({ is_active: false });

    res.json({ 
      success: true, 
      message: '휴가 정보가 삭제되었습니다.' 
    });
  } catch (error: any) {
    console.error('휴가 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '휴가 삭제 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 승인
export const approveVacation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const vacation = await (Vacation as any).findOne({
      where: {
        id,
        tenant_id: tenantId,
        company_id: companyId,
        status: 'pending'
      }
    });

    if (!vacation) {
      return res.status(404).json({ 
        success: false, 
        message: '휴가 정보를 찾을 수 없습니다.' 
      });
    }

    const isElevatedApprover = userRole === 'admin' || userRole === 'root';
    const approverId = vacation.approved_by != null ? Number(vacation.approved_by) : NaN;
    const isDesignatedApprover = Number.isFinite(approverId) && approverId === Number(userId);
    if (!isElevatedApprover && !isDesignatedApprover) {
      return res.status(403).json({
        success: false,
        message: '승인 권한이 없습니다. (관리자·루트 또는 지정된 결재자만 승인할 수 있습니다.)'
      });
    }

    await vacation.update({
      status: 'approved',
      approved_by: userId,
      approved_date: new Date().toISOString().split('T')[0]
    });

    // 사용자 정보 포함하여 반환
    const vacationWithUser = await (Vacation as any).findByPk(vacation.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number', 'avatar_url']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: vacationWithUser 
    });
  } catch (error: any) {
    console.error('휴가 승인 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '휴가 승인 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 거부
export const rejectVacation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const vacation = await (Vacation as any).findOne({
      where: {
        id,
        tenant_id: tenantId,
        company_id: companyId,
        status: 'pending'
      }
    });

    if (!vacation) {
      return res.status(404).json({ 
        success: false, 
        message: '휴가 정보를 찾을 수 없습니다.' 
      });
    }

    const isElevatedApprover = userRole === 'admin' || userRole === 'root';
    const approverId = vacation.approved_by != null ? Number(vacation.approved_by) : NaN;
    const isDesignatedApprover = Number.isFinite(approverId) && approverId === Number(userId);
    if (!isElevatedApprover && !isDesignatedApprover) {
      return res.status(403).json({
        success: false,
        message: '거부 권한이 없습니다. (관리자·루트 또는 지정된 결재자만 거부할 수 있습니다.)'
      });
    }

    await vacation.update({
      status: 'rejected',
      approved_by: userId,
      approved_date: new Date().toISOString().split('T')[0],
      rejection_reason: rejection_reason || '사유 없음'
    });

    // 사용자 정보 포함하여 반환
    const vacationWithUser = await (Vacation as any).findByPk(vacation.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number', 'avatar_url']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: vacationWithUser 
    });
  } catch (error: any) {
    console.error('휴가 거부 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '휴가 거부 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 정책 조회
export const getVacationPolicy = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    const tenantId = req.user?.tenant_id;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.'
      });
    }

    const { Company } = await import('../models');
    const company = await (Company as any).findOne({
      where: {
        id: companyId,
        tenant_id: tenantId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    // 기본 정책
    const defaultPolicy = {
      annualLeaveStartDays: 240,
      annualLeaveEarnDays: 20,
      availableTypes: [
        'annual',
        'sick',
        'personal',
        'study',
        'maternity',
        'paternity',
        'marriage',
        'bereavement',
      ],
      leaveTypeDays: { ...DEFAULT_LEAVE_TYPE_DAYS },
    };

    const vacationPolicy = company.settings?.vacationPolicy || defaultPolicy;
    
    if (!vacationPolicy.availableTypes) {
      vacationPolicy.availableTypes = defaultPolicy.availableTypes;
    }
    if (!vacationPolicy.leaveTypeDays) {
      vacationPolicy.leaveTypeDays = { ...DEFAULT_LEAVE_TYPE_DAYS };
    } else {
      vacationPolicy.leaveTypeDays = {
        ...DEFAULT_LEAVE_TYPE_DAYS,
        ...vacationPolicy.leaveTypeDays,
      };
    }

    res.json({
      success: true,
      data: vacationPolicy
    });
  } catch (error: any) {
    console.error('휴가 정책 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '휴가 정책 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 정책 저장
export const updateVacationPolicy = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    const tenantId = req.user?.tenant_id;
    const userRole = req.user?.role;

    // admin 이상만 접근 가능
    if (userRole !== 'admin' && userRole !== 'root') {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.'
      });
    }

    const { annualLeaveStartDays, annualLeaveEarnDays, availableTypes, leaveTypeDays } = req.body;

    if (annualLeaveStartDays === undefined && leaveTypeDays === undefined) {
      return res.status(400).json({
        success: false,
        message: '연차 시작일 설정 또는 휴가 일수 설정이 필요합니다.'
      });
    }

    const { Company } = await import('../models');
    const company = await (Company as any).findOne({
      where: {
        id: companyId,
        tenant_id: tenantId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    // 기존 설정 가져오기
    const currentSettings = company.settings || {};
    const currentPolicy = currentSettings.vacationPolicy || {};
    
    // 휴가 정책 업데이트
    const updatedSettings = {
      ...currentSettings,
      vacationPolicy: {
        ...currentPolicy,
        annualLeaveStartDays:
          annualLeaveStartDays !== undefined
            ? parseInt(String(annualLeaveStartDays), 10)
            : currentPolicy.annualLeaveStartDays ?? 240,
        annualLeaveEarnDays: annualLeaveEarnDays || currentPolicy.annualLeaveEarnDays || 20,
        availableTypes:
          availableTypes ||
          currentPolicy.availableTypes || [
            'annual',
            'sick',
            'personal',
            'study',
            'maternity',
            'paternity',
            'marriage',
            'bereavement',
          ],
        leaveTypeDays: {
          ...DEFAULT_LEAVE_TYPE_DAYS,
          ...(currentPolicy.leaveTypeDays || {}),
          ...(leaveTypeDays || {}),
        },
      }
    };

    await company.update({
      settings: updatedSettings
    });

    res.json({
      success: true,
      message: '휴가 정책이 저장되었습니다.',
      data: updatedSettings.vacationPolicy
    });
  } catch (error: any) {
    console.error('휴가 정책 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '휴가 정책 저장 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 회사별 직원 휴가 잔여 일수 목록
export const getLeaveBalances = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const companyId = req.user?.company_id;
    const { company_id } = req.query;

    if (userRole !== 'admin' && userRole !== 'root' && userRole !== 'audit') {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.',
      });
    }

    let targetCompanyId: number | undefined;
    if (userRole === 'root') {
      if (company_id) {
        targetCompanyId = parseInt(String(company_id), 10);
      } else if (companyId) {
        targetCompanyId = companyId;
      }
    } else {
      targetCompanyId = companyId;
    }

    if (!targetCompanyId || !Number.isFinite(targetCompanyId)) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.',
      });
    }

    const result = await getCompanyLeaveBalances(targetCompanyId);

    res.json({
      success: true,
      data: result.rows,
      meta: {
        availableTypes: result.availableTypes,
        fiscalYearLabel: result.fiscalYearLabel,
      },
    });
  } catch (error: any) {
    console.error('휴가 잔여 일수 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '휴가 잔여 일수 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 사용 가능한 연차 일수 조회
export const getAnnualLeaveInfo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { user_id } = req.query;
    
    // 관리자는 다른 사용자의 연차 정보 조회 가능
    const targetUserId = user_id ? parseInt(user_id as string) : userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID가 필요합니다.'
      });
    }

    const leaveInfo = await calculateAnnualLeave(targetUserId);

    res.json({
      success: true,
      data: leaveInfo
    });
  } catch (error: any) {
    console.error('연차 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '연차 정보 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 휴가 데이터 Excel 내보내기
export const exportVacationsToExcel = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { user_id, status, vacation_type, start_date, end_date, company_id, approved_by } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 휴가 조회 가능, 아니면 자신의 회사 휴가만
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
      
      // 일반 사용자는 자신의 휴가만 조회
      if (userRole === 'user') {
        whereClause.user_id = userId;
      }
    } else {
      // root는 company_id 쿼리로 회사 전환 가능, 미지정 시 등록된 회사 기준
      if (userRole === 'root') {
        if (company_id) {
          whereClause.company_id = parseInt(company_id as string);
        } else if (companyId) {
          whereClause.company_id = companyId;
        }
      } else {
        // audit는 모든 회사 조회 가능
        if (tenantId) whereClause.tenant_id = tenantId;
        if (companyId) whereClause.company_id = companyId;
      }
    }

    if (user_id) {
      whereClause.user_id = user_id;
    }

    if (approved_by) {
      whereClause.approved_by = parseInt(approved_by as string);
    }

    if (status) {
      whereClause.status = status;
    }

    if (vacation_type) {
      whereClause.vacation_type = vacation_type;
    }

    if (start_date && end_date) {
      whereClause[Op.or] = [
        {
          start_date: {
            [Op.between]: [start_date, end_date]
          }
        },
        {
          end_date: {
            [Op.between]: [start_date, end_date]
          }
        }
      ];
    }

    // 활성화된 휴가만 조회
    whereClause.is_active = true;

    const vacations = await (Vacation as any).findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number', 'avatar_url']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['applied_date', 'DESC']]
    });

    // Excel 데이터 형식으로 변환
    const vacationTypeMap: { [key: string]: string } = {
      'annual': '연차',
      'sick': '병가',
      'personal': '개인사유',
      'study': '교육',
      'maternity': '출산',
      'paternity': '남편 출산 휴가',
      'marriage': '결혼휴가',
      'bereavement': '조사 휴가'
    };

    const statusMap: { [key: string]: string } = {
      'pending': '대기',
      'approved': '승인',
      'rejected': '거부',
      'cancelled': '취소'
    };

    const excelData = vacations.map((vacation: any) => {
      const vacationData = vacation.toJSON ? vacation.toJSON() : vacation;
      
      return {
        '신청일': vacationData.applied_date 
          ? new Date(vacationData.applied_date).toISOString().split('T')[0] 
          : '',
        '직원명': vacationData.user?.username || '',
        '사원번호': vacationData.user?.employee_number || '',
        '부서': vacationData.user?.department || '',
        '직책': vacationData.user?.position || '',
        '휴가 유형': vacationTypeMap[vacationData.vacation_type] || vacationData.vacation_type,
        '시작일': vacationData.start_date 
          ? new Date(vacationData.start_date).toISOString().split('T')[0] 
          : '',
        '종료일': vacationData.end_date 
          ? new Date(vacationData.end_date).toISOString().split('T')[0] 
          : '',
        '일수': vacationData.days || 0,
        '사유': vacationData.reason || '',
        '상태': statusMap[vacationData.status] || vacationData.status,
        '승인자': vacationData.approver?.username || '',
        '승인일': vacationData.approved_date 
          ? new Date(vacationData.approved_date).toISOString().split('T')[0] 
          : '',
        '거부 사유': vacationData.rejection_reason || ''
      };
    });

    // Excel 워크북 생성
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // 컬럼 너비 설정
    const columnWidths = [
      { wch: 12 }, // 신청일
      { wch: 15 }, // 직원명
      { wch: 12 }, // 사원번호
      { wch: 15 }, // 부서
      { wch: 15 }, // 직책
      { wch: 12 }, // 휴가 유형
      { wch: 12 }, // 시작일
      { wch: 12 }, // 종료일
      { wch: 8 },  // 일수
      { wch: 30 }, // 사유
      { wch: 10 }, // 상태
      { wch: 15 }, // 승인자
      { wch: 12 }, // 승인일
      { wch: 30 }  // 거부 사유
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, '휴가');

    // Excel 파일 버퍼 생성
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 회사명 조회
    let companyName = '';
    const targetCompanyId = whereClause.company_id || companyId;
    if (targetCompanyId) {
      try {
        const company = await (Company as any).findOne({
          where: { id: targetCompanyId },
          attributes: ['name']
        });
        if (company) {
          companyName = company.name || '';
        }
      } catch (error) {
        console.error('회사명 조회 오류:', error);
      }
    }

    // 파일명 설정: yyyymmdd_Leave List (회사명)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const fileName = companyName 
      ? `${dateStr}_Leave List (${companyName}).xlsx`
      : `${dateStr}_Leave List.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(excelBuffer);
  } catch (error: any) {
    console.error('Excel 파일 내보내기 오류:', error);
    res.status(500).json({
      success: false,
      message: 'Excel 파일 내보내기 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


