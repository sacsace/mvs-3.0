import { Request, Response } from 'express';
import { RequestWithUser } from '../types';
import { Payroll, User } from '../models';
import { Op, Sequelize } from 'sequelize';
import sequelize from '../config/database';

// 급여 목록 조회
export const getPayrolls = async (req: RequestWithUser, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { page = 1, limit = 10, employee_id = '', period = '', company_id } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 급여 조회 가능, 아니면 자신의 회사 급여만
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    } else {
      // root는 company_id 쿼리 파라미터로 회사별 필터링 가능
      if (userRole === 'root' && company_id) {
        whereClause.company_id = parseInt(company_id as string);
      } else if (userRole === 'root') {
        // root가 company_id를 지정하지 않으면 모든 회사 조회
      } else {
        // audit는 모든 회사 조회 가능
        if (tenantId) whereClause.tenant_id = tenantId;
        if (companyId) whereClause.company_id = companyId;
      }
    }
    
    if (employee_id) {
      whereClause.employee_id = employee_id;
    }
    
    if (period) {
      whereClause.payroll_period = period;
    }

    // 활성화된 급여만 조회
    whereClause.is_active = true;

    const payrolls = await (Payroll as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['payroll_period', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: payrolls.rows,
      pagination: {
        total: payrolls.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(payrolls.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('급여 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 상세 조회
export const getPayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    // 활성화된 급여만 조회
    whereClause.is_active = true;

    const payroll = await (Payroll as any).findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 생성
export const createPayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const payrollData = { ...req.body, tenant_id, company_id, created_by: user_id, is_active: true };

    const payroll = await (Payroll as any).create(payrollData);

    res.status(201).json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 수정
export const updatePayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    await payroll.update(req.body);

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 삭제
export const deletePayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    // 소프트 삭제: is_active를 false로 설정
    await payroll.update({ is_active: false });

    res.json({ success: true, message: '급여 정보가 비활성화되었습니다.' });
  } catch (error) {
    console.error('급여 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 승인
export const approvePayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    await payroll.update({ status: 'approved' });

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 승인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 지급
export const payPayroll = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const payroll = await (Payroll as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!payroll) {
      return res.status(404).json({ success: false, message: '급여 정보를 찾을 수 없습니다.' });
    }

    await payroll.update({ 
      status: 'paid',
      payment_date: new Date().toISOString().split('T')[0]
    });

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('급여 지급 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 직원 목록 조회 (급여 생성용)
export const getEmployees = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;

    const employees = await (User as any).findAll({
      where: { tenant_id, company_id, status: 'active' },
      attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
    });

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 급여 통계 조회
export const getPayrollStats = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { period = '' } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (period) {
      whereClause.payroll_period = period;
    }

    const stats = await (Payroll as any).findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('gross_salary')), 'total_gross'],
        [sequelize.fn('SUM', sequelize.col('net_salary')), 'total_net'],
        [sequelize.fn('SUM', sequelize.col('tax_amount')), 'total_tax'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_count']
      ]
    });

    // 상태별 통계
    const statusStats = await (Payroll as any).findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      data: {
        summary: stats,
        statusBreakdown: statusStats
      }
    });
  } catch (error) {
    console.error('급여 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};
