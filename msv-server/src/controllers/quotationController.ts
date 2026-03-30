import { Response } from 'express';
import { RequestWithUser } from '../types';
import { Quotation, Customer, User } from '../models';
import { Op } from 'sequelize';

// 견적서 목록 조회
export const getQuotations = async (req: RequestWithUser, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { customer_id, status, start_date, end_date, company_id } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 견적서 조회 가능, 아니면 자신의 회사 견적서만
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

    if (customer_id) {
      whereClause.customer_id = customer_id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [start_date, end_date]
      };
    }

    // 활성화된 견적서만 조회
    whereClause.is_active = true;

    const quotations = await (Quotation as any).findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: quotations
    });
  } catch (error: any) {
    console.error('견적서 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '견적서 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 견적서 상세 조회
export const getQuotation = async (req: RequestWithUser, res: Response) => {
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

    // 활성화된 견적서만 조회
    whereClause.is_active = true;

    const quotation = await (Quotation as any).findOne({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });

    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        message: '견적서를 찾을 수 없습니다.' 
      });
    }

    res.json({ success: true, data: quotation });
  } catch (error: any) {
    console.error('견적서 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '견적서 상세 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 견적서 생성
export const createQuotation = async (req: RequestWithUser, res: Response) => {
  try {
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    const { quotation_number, customer_id, customer_name, customer_email, customer_phone, 
            customer_address, items, subtotal, tax_rate, tax_amount, discount, total_amount, 
            currency, valid_until, notes, terms } = req.body;

    if (!quotation_number || !customer_name || !items || !total_amount) {
      return res.status(400).json({ 
        success: false, 
        message: '필수 필드가 누락되었습니다.' 
      });
    }

    // quotation_number 중복 확인
    const existing = await (Quotation as any).findOne({
      where: {
        quotation_number,
        tenant_id: tenantId,
        company_id: companyId
      }
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 존재하는 견적서 번호입니다.' 
      });
    }

    const quotation = await (Quotation as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      is_active: true,
      quotation_number,
      customer_id: customer_id || null,
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      customer_address: customer_address || null,
      items: items ? JSON.stringify(items) : '[]',
      subtotal: subtotal || 0,
      tax_rate: tax_rate || 0,
      tax_amount: tax_amount || 0,
      discount: discount || 0,
      total_amount,
      currency: currency || 'KRW',
      valid_until: valid_until || null,
      status: 'draft',
      notes: notes || null,
      terms: terms || null,
      created_by: userId
    });

    // 관련 정보 포함하여 반환
    const quotationWithRelations = await (Quotation as any).findByPk(quotation.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });

    res.status(201).json({ 
      success: true, 
      data: quotationWithRelations 
    });
  } catch (error: any) {
    console.error('견적서 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '견적서 생성 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 견적서 수정
export const updateQuotation = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userRole = req.user?.role;
    const { customer_id, customer_name, customer_email, customer_phone, customer_address,
            items, subtotal, tax_rate, tax_amount, discount, total_amount, currency, 
            valid_until, status, notes, terms } = req.body;

    const whereClause: any = { id, is_active: true };
    
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const quotation = await (Quotation as any).findOne({
      where: whereClause
    });

    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        message: '견적서를 찾을 수 없습니다.' 
      });
    }

    await quotation.update({
      customer_id: customer_id !== undefined ? customer_id : quotation.customer_id,
      customer_name: customer_name !== undefined ? customer_name : quotation.customer_name,
      customer_email: customer_email !== undefined ? customer_email : quotation.customer_email,
      customer_phone: customer_phone !== undefined ? customer_phone : quotation.customer_phone,
      customer_address: customer_address !== undefined ? customer_address : quotation.customer_address,
      items: items !== undefined ? JSON.stringify(items) : quotation.items,
      subtotal: subtotal !== undefined ? subtotal : quotation.subtotal,
      tax_rate: tax_rate !== undefined ? tax_rate : quotation.tax_rate,
      tax_amount: tax_amount !== undefined ? tax_amount : quotation.tax_amount,
      discount: discount !== undefined ? discount : quotation.discount,
      total_amount: total_amount !== undefined ? total_amount : quotation.total_amount,
      currency: currency !== undefined ? currency : quotation.currency,
      valid_until: valid_until !== undefined ? valid_until : quotation.valid_until,
      status: status !== undefined ? status : quotation.status,
      notes: notes !== undefined ? notes : quotation.notes,
      terms: terms !== undefined ? terms : quotation.terms
    });

    // 관련 정보 포함하여 반환
    const quotationWithRelations = await (Quotation as any).findByPk(quotation.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: quotationWithRelations 
    });
  } catch (error: any) {
    console.error('견적서 수정 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '견적서 수정 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 견적서 삭제
export const deleteQuotation = async (req: RequestWithUser, res: Response) => {
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

    const quotation = await (Quotation as any).findOne({
      where: whereClause
    });

    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        message: '견적서를 찾을 수 없습니다.' 
      });
    }

    // 소프트 삭제: is_active를 false로 설정
    await quotation.update({ is_active: false });

    res.json({ 
      success: true, 
      message: '견적서가 비활성화되었습니다.' 
    });
  } catch (error: any) {
    console.error('견적서 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '견적서 삭제 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 견적서 전송
export const sendQuotation = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;

    const quotation = await (Quotation as any).findOne({
      where: {
        id,
        tenant_id: tenantId,
        company_id: companyId,
        status: 'draft'
      }
    });

    if (!quotation) {
      return res.status(404).json({ 
        success: false, 
        message: '견적서를 찾을 수 없거나 전송할 수 없습니다.' 
      });
    }

    await quotation.update({
      status: 'sent'
    });

    // 관련 정보 포함하여 반환
    const quotationWithRelations = await (Quotation as any).findByPk(quotation.id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });

    res.json({ 
      success: true, 
      data: quotationWithRelations 
    });
  } catch (error: any) {
    console.error('견적서 전송 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '견적서 전송 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

