import { Request, Response } from 'express';
import { RequestWithUser } from '../types';
import { Project, Customer, User } from '../models';
import { Op, Sequelize } from 'sequelize';
import sequelize from '../config/database';

// 프로젝트 목록 조회
export const getProjects = async (req: RequestWithUser, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { page = 1, limit = 10, status = '', manager_id = '', company_id } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 프로젝트 조회 가능, 아니면 자신의 회사 프로젝트만
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
    
    if (status) {
      whereClause.status = status;
    }
    
    if (manager_id) {
      whereClause.project_manager = manager_id;
    }

    // 활성화된 프로젝트만 조회
    whereClause.is_active = true;

    const projects = await (Project as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name', 'email']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'username', 'email', 'department', 'position']
        }
      ],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['start_date', 'DESC']]
    });

    res.json({
      success: true,
      data: projects.rows,
      pagination: {
        total: projects.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(projects.count / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('프로젝트 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 프로젝트 상세 조회
export const getProject = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;

    const whereClause: any = { id, is_active: true };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const project = await (Project as any).findOne({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name', 'email', 'phone', 'address']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'username', 'email', 'department', 'position', 'phone']
        }
      ]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('프로젝트 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로젝트 생성
export const createProject = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const projectData = { ...req.body, tenant_id, company_id, created_by: user_id, is_active: true };

    const project = await (Project as any).create(projectData);

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로젝트 수정
export const updateProject = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const project = await (Project as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    }

    await project.update(req.body);

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('프로젝트 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로젝트 삭제
export const deleteProject = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const project = await (Project as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    }

    // 소프트 삭제: is_active를 false로 설정
    await project.update({ is_active: false });

    res.json({ success: true, message: '프로젝트가 비활성화되었습니다.' });
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로젝트 상태 변경
export const updateProjectStatus = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tenant_id, company_id } = req.user;

    const project = await (Project as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    }

    await project.update({ status });

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('프로젝트 상태 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로젝트 매니저 변경
export const updateProjectManager = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { project_manager } = req.body;
    const { tenant_id, company_id } = req.user;

    const project = await (Project as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    }

    await project.update({ project_manager });

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('프로젝트 매니저 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로젝트 통계 조회
export const getProjectStats = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;

    // 전체 프로젝트 통계
    const totalStats = await (Project as any).findOne({
      where: { tenant_id, company_id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_count'],
        [sequelize.fn('SUM', sequelize.col('budget')), 'total_budget']
      ]
    });

    // 상태별 통계
    const statusStats = await (Project as any).findAll({
      where: { tenant_id, company_id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // 우선순위별 통계
    const priorityStats = await (Project as any).findAll({
      where: { tenant_id, company_id },
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });

    res.json({
      success: true,
      data: {
        totalStats,
        statusBreakdown: statusStats,
        priorityBreakdown: priorityStats
      }
    });
  } catch (error) {
    console.error('프로젝트 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};
