import { Request, Response } from 'express';
import { RequestWithUser } from '../types';
import { Project, Customer, User } from '../models';
import { Op, Sequelize } from 'sequelize';
import sequelize from '../config/database';

// 프로젝트 목록 조회
export const getProjects = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { page = 1, limit = 10, status = '', manager_id = '' } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (manager_id) {
      whereClause.project_manager = manager_id;
    }

    const projects = await Project.findAndCountAll({
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
          attributes: ['username', 'first_name', 'last_name']
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
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로젝트 상세 조회
export const getProject = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const project = await Project.findOne({
      where: { id, tenant_id, company_id },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name', 'email', 'phone', 'address']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['username', 'email', 'first_name', 'last_name', 'phone']
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
    const projectData = { ...req.body, tenant_id, company_id, created_by: user_id };

    const project = await Project.create(projectData);

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

    const project = await Project.findOne({
      where: { id, tenant_id, company_id }
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

    const project = await Project.findOne({
      where: { id, tenant_id, company_id }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: '프로젝트를 찾을 수 없습니다.' });
    }

    await project.destroy();

    res.json({ success: true, message: '프로젝트가 삭제되었습니다.' });
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

    const project = await Project.findOne({
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

    const project = await Project.findOne({
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
    const totalStats = await Project.findOne({
      where: { tenant_id, company_id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_count'],
        [sequelize.fn('SUM', sequelize.col('budget')), 'total_budget']
      ]
    });

    // 상태별 통계
    const statusStats = await Project.findAll({
      where: { tenant_id, company_id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // 우선순위별 통계
    const priorityStats = await Project.findAll({
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
