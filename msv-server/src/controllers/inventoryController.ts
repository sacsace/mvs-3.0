import { Request, Response } from 'express';
import { RequestWithUser } from '../types';
import { Product, InventoryTransaction } from '../models';
import { Op, Sequelize } from 'sequelize';
import sequelize from '../config/database';

// 제품 목록 조회
export const getProducts = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { page = 1, limit = 10, search = '', category = '' } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { product_code: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }

    const products = await (Product as any).findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: products.rows,
      pagination: {
        total: products.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(products.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('제품 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 제품 상세 조회
export const getProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const product = await (Product as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('제품 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 제품 생성
export const createProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const productData = { ...req.body, tenant_id, company_id, created_by: user_id };

    const product = await (Product as any).create(productData);

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('제품 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 제품 수정
export const updateProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const product = await (Product as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    await product.update(req.body);

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('제품 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 제품 삭제
export const deleteProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    const product = await (Product as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    await product.destroy();

    res.json({ success: true, message: '제품이 삭제되었습니다.' });
  } catch (error) {
    console.error('제품 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 재고 거래 내역 조회
export const getInventoryTransactions = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { page = 1, limit = 10, product_id = '', transaction_type = '' } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (product_id) {
      whereClause.product_id = product_id;
    }
    
    if (transaction_type) {
      whereClause.transaction_type = transaction_type;
    }

    const transactions = await (InventoryTransaction as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['name', 'product_code']
        }
      ],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['transaction_date', 'DESC']]
    });

    res.json({
      success: true,
      data: transactions.rows,
      pagination: {
        total: transactions.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(transactions.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('재고 거래 내역 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 재고 입고
export const stockIn = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const { product_id, quantity, notes } = req.body;

    const product = await (Product as any).findOne({
      where: { id: product_id, tenant_id, company_id }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    // 재고 거래 기록 생성
    const transaction = await (InventoryTransaction as any).create({
      tenant_id,
      company_id,
      product_id,
      transaction_type: 'in',
      quantity,
      created_at: new Date(),
      notes,
      created_by: user_id
    });

    // 제품 재고 수량 업데이트
    await product.update({
      stock_quantity: product.stock_quantity + quantity
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('재고 입고 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 재고 출고
export const stockOut = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const { product_id, quantity, notes } = req.body;

    const product = await (Product as any).findOne({
      where: { id: product_id, tenant_id, company_id }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ success: false, message: '재고가 부족합니다.' });
    }

    // 재고 거래 기록 생성
    const transaction = await (InventoryTransaction as any).create({
      tenant_id,
      company_id,
      product_id,
      transaction_type: 'out',
      quantity,
      created_at: new Date(),
      notes,
      created_by: user_id
    });

    // 제품 재고 수량 업데이트
    await product.update({
      stock_quantity: product.stock_quantity - quantity
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('재고 출고 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 재고 조정
export const adjustStock = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const { product_id, new_quantity, notes } = req.body;

    const product = await (Product as any).findOne({
      where: { id: product_id, tenant_id, company_id }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    const quantity_diff = new_quantity - product.stock_quantity;

    // 재고 거래 기록 생성
    const transaction = await (InventoryTransaction as any).create({
      tenant_id,
      company_id,
      product_id,
      transaction_type: 'adjustment',
      quantity: Math.abs(quantity_diff),
      created_at: new Date(),
      notes: `${notes || ''} (조정: ${quantity_diff > 0 ? '+' : ''}${quantity_diff})`,
      created_by: user_id
    });

    // 제품 재고 수량 업데이트
    await product.update({
      stock_quantity: new_quantity
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('재고 조정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};
