import { Request, Response } from 'express';
import { RequestWithUser } from '../types';
import { Invoice, InvoiceItem, Customer } from '../models';
import { Op, Sequelize } from 'sequelize';
import sequelize from '../config/database';

// 인보이스 목록 조회
export const getInvoices = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { page = 1, limit = 10, status = '', customer_id = '' } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (customer_id) {
      whereClause.customer_id = customer_id;
    }

    const invoices = await Invoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name', 'email']
        }
      ],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['invoice_date', 'DESC']]
    });

    res.json({
      success: true,
      data: invoices.rows,
      pagination: {
        total: invoices.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(invoices.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('인보이스 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 상세 조회
export const getInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const invoice = await Invoice.findOne({
      where: { id, tenant_id, company_id },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name', 'email', 'phone', 'address']
        },
        {
          model: InvoiceItem,
          as: 'items',
          attributes: ['id', 'item_name', 'description', 'quantity', 'unit_price', 'total_price', 'tax_rate', 'tax_amount']
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('인보이스 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 생성
export const createInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const { items, ...invoiceData } = req.body;

    // 인보이스 생성
    const invoice = await Invoice.create({
      ...invoiceData,
      tenant_id,
      company_id,
      created_by: user_id
    });

    // 인보이스 아이템들 생성
    if (items && items.length > 0) {
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoice_id: invoice.id
      }));
      
      await InvoiceItem.bulkCreate(invoiceItems);
    }

    // 생성된 인보이스와 아이템들을 함께 반환
    const createdInvoice = await Invoice.findOne({
      where: { id: invoice.id },
      include: [
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.status(201).json({ success: true, data: createdInvoice });
  } catch (error) {
    console.error('인보이스 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 수정
export const updateInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const { items, ...invoiceData } = req.body;

    const invoice = await Invoice.findOne({
      where: { id, tenant_id, company_id }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    // 인보이스 정보 업데이트
    await invoice.update(invoiceData);

    // 기존 아이템들 삭제 후 새로 생성
    if (items) {
      await InvoiceItem.destroy({ where: { invoice_id: id } });
      
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoice_id: id
      }));
      
      await InvoiceItem.bulkCreate(invoiceItems);
    }

    // 업데이트된 인보이스 반환
    const updatedInvoice = await Invoice.findOne({
      where: { id },
      include: [
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error('인보이스 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 삭제
export const deleteInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const invoice = await Invoice.findOne({
      where: { id, tenant_id, company_id }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    // 관련 아이템들 먼저 삭제
    await InvoiceItem.destroy({ where: { invoice_id: id } });
    
    // 인보이스 삭제
    await invoice.destroy();

    res.json({ success: true, message: '인보이스가 삭제되었습니다.' });
  } catch (error) {
    console.error('인보이스 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 상태 변경
export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    const { tenant_id, company_id } = (req as any).user;

    const invoice = await Invoice.findOne({
      where: { id, tenant_id, company_id }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;

    await invoice.update(updateData);

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('인보이스 상태 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 회계 통계 조회
export const getAccountingStats = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { start_date, end_date } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (start_date && end_date) {
      whereClause.invoice_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const invoices = await Invoice.findAll({
      where: whereClause,
      attributes: [
        'status',
        'payment_status',
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status', 'payment_status']
    });

    // 전체 통계 계산
    const totalStats = await Invoice.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_count']
      ]
    });

    res.json({
      success: true,
      data: {
        invoices,
        totalStats
      }
    });
  } catch (error) {
    console.error('회계 통계 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};
