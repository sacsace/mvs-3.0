import { Response } from 'express';
import { RequestWithUser } from '../types';
import { WorkReport, User } from '../models';
import { Op } from 'sequelize';

// 업무 보고서 목록 조회
export const getWorkReports = async (req: RequestWithUser, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { author_id, status, type, priority, start_date, end_date, company_id } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 보고서 조회 가능, 아니면 자신의 회사 보고서만
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
      
      // 일반 사용자는 자신이 작성한 보고서만 조회 (또는 공개된 보고서)
      if (userRole === 'user') {
        whereClause[Op.or] = [
          { author_id: userId },
          { is_public: true }
        ];
      }
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

    if (author_id) {
      whereClause.author_id = author_id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (start_date && end_date) {
      whereClause.report_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    // 활성화된 보고서만 조회
    whereClause.is_active = true;

    const reports = await (WorkReport as any).findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username'],
          required: false
        }
      ],
      order: [['report_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: reports
    });
  } catch (error: any) {
    console.error('업무 보고서 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '업무 보고서 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 업무 보고서 상세 조회
export const getWorkReport = async (req: RequestWithUser, res: Response) => {
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
      
      // 일반 사용자는 자신이 작성한 보고서 또는 공개된 보고서만 조회
      if (userRole === 'user') {
        whereClause[Op.or] = [
          { author_id: userId },
          { is_public: true }
        ];
      }
    }

    // 활성화된 보고서만 조회
    whereClause.is_active = true;

    const report = await (WorkReport as any).findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: '업무 보고서를 찾을 수 없습니다.' 
      });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error('업무 보고서 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '업무 보고서 상세 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 업무 보고서 생성
export const createWorkReport = async (req: RequestWithUser, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    const { report_id, title, type, category, content, summary, achievements, challenges,
            next_steps, attachments, priority, report_date, due_date, tags, is_public } = req.body;

    if (!report_id || !title || !type || !category || !content || !summary || !report_date) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 필드가 누락되었습니다.' 
      });
    }

    // report_id 중복 확인
    const existing = await (WorkReport as any).findOne({
      where: {
        report_id,
        tenant_id: tenantId,
        company_id: companyId
      }
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 존재하는 보고서 ID입니다.' 
      });
    }

    const report = await (WorkReport as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      report_id,
      title,
      is_active: true,
      type,
      category,
      author_id: userId,
      content,
      summary,
      achievements: achievements ? JSON.stringify(achievements) : '[]',
      challenges: challenges ? JSON.stringify(challenges) : '[]',
      next_steps: next_steps ? JSON.stringify(next_steps) : '[]',
      attachments: attachments ? JSON.stringify(attachments) : '[]',
      status: 'draft',
      priority: priority || 'medium',
      report_date,
      due_date: due_date || null,
      tags: tags ? JSON.stringify(tags) : '[]',
      is_public: is_public !== undefined ? is_public : false
    });

    // 사용자 정보 포함하여 반환
    const reportWithUser = await (WorkReport as any).findByPk(report.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: reportWithUser 
    });
  } catch (error: any) {
    console.error('업무 보고서 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '업무 보고서 생성 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 업무 보고서 수정
export const updateWorkReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { title, type, category, content, summary, achievements, challenges, next_steps,
            attachments, priority, report_date, due_date, tags, is_public, status } = req.body;

    const whereClause: any = { id, is_active: true };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const report = await (WorkReport as any).findOne({
      where: whereClause
    });

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: '업무 보고서를 찾을 수 없습니다.' 
      });
    }

    // 일반 사용자는 자신이 작성한 보고서만 수정 가능 (draft, submitted 상태만)
    if (userRole === 'user' && report.author_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: '수정 권한이 없습니다.' 
      });
    }

    if (userRole === 'user' && report.status !== 'draft' && report.status !== 'submitted') {
      return res.status(403).json({ 
        success: false, 
        message: '수정할 수 없는 상태입니다.' 
      });
    }

    await report.update({
      title: title !== undefined ? title : report.title,
      type: type !== undefined ? type : report.type,
      category: category !== undefined ? category : report.category,
      content: content !== undefined ? content : report.content,
      summary: summary !== undefined ? summary : report.summary,
      achievements: achievements !== undefined ? JSON.stringify(achievements) : report.achievements,
      challenges: challenges !== undefined ? JSON.stringify(challenges) : report.challenges,
      next_steps: next_steps !== undefined ? JSON.stringify(next_steps) : report.next_steps,
      attachments: attachments !== undefined ? JSON.stringify(attachments) : report.attachments,
      priority: priority !== undefined ? priority : report.priority,
      report_date: report_date !== undefined ? report_date : report.report_date,
      due_date: due_date !== undefined ? due_date : report.due_date,
      tags: tags !== undefined ? JSON.stringify(tags) : report.tags,
      is_public: is_public !== undefined ? is_public : report.is_public,
      status: status !== undefined ? status : report.status
    });

    // 사용자 정보 포함하여 반환
    const reportWithUser = await (WorkReport as any).findByPk(report.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: reportWithUser 
    });
  } catch (error: any) {
    console.error('업무 보고서 수정 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '업무 보고서 수정 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 업무 보고서 삭제
export const deleteWorkReport = async (req: RequestWithUser, res: Response) => {
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
      
      // 일반 사용자는 자신이 작성한 보고서만 삭제 가능 (draft 상태만)
      if (userRole === 'user') {
        whereClause.author_id = userId;
        whereClause.status = 'draft';
      }
    }

    const report = await (WorkReport as any).findOne({
      where: whereClause
    });

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: '업무 보고서를 찾을 수 없습니다.' 
      });
    }

    // 소프트 삭제: is_active를 false로 설정
    await report.update({ is_active: false });

    res.json({ 
      success: true, 
      message: '업무 보고서가 비활성화되었습니다.' 
    });
  } catch (error: any) {
    console.error('업무 보고서 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '업무 보고서 삭제 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 업무 보고서 제출
export const submitWorkReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;

    const report = await (WorkReport as any).findOne({
      where: {
        id,
        tenant_id: tenantId,
        company_id: companyId,
        author_id: userId,
        status: 'draft'
      }
    });

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: '업무 보고서를 찾을 수 없거나 제출할 수 없습니다.' 
      });
    }

    await report.update({
      status: 'submitted'
    });

    // 사용자 정보 포함하여 반환
    const reportWithUser = await (WorkReport as any).findByPk(report.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        }
      ]
    });

    res.json({ 
      success: true, 
      data: reportWithUser 
    });
  } catch (error: any) {
    console.error('업무 보고서 제출 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '업무 보고서 제출 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 업무 보고서 승인/거부
export const reviewWorkReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_comment } = req.body;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 관리자만 승인/거부 가능
    if (userRole !== 'admin' && userRole !== 'root') {
      return res.status(403).json({ 
        success: false, 
        message: '승인/거부 권한이 없습니다.' 
      });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 상태입니다.' 
      });
    }

    const report = await (WorkReport as any).findOne({
      where: {
        id,
        tenant_id: tenantId,
        company_id: companyId,
        status: 'submitted'
      }
    });

    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: '업무 보고서를 찾을 수 없거나 검토할 수 없습니다.' 
      });
    }

    await report.update({
      status,
      reviewer_id: userId,
      review_comment: review_comment || null,
      reviewed_at: new Date()
    });

    // 사용자 정보 포함하여 반환
    const reportWithUser = await (WorkReport as any).findByPk(report.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email', 'department', 'position', 'employee_number']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: reportWithUser 
    });
  } catch (error: any) {
    console.error('업무 보고서 검토 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '업무 보고서 검토 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

