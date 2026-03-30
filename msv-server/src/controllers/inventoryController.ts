import { Request, Response } from 'express';
import { RequestWithUser } from '../types';
import { Product, InventoryTransaction } from '../models';
import { Op, Sequelize } from 'sequelize';
import sequelize from '../config/database';

// 제품 목록 조회
export const getProducts = async (req: RequestWithUser, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id;
    const company_id = req.user?.company_id;
    
    if (!tenant_id || !company_id) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 정보가 올바르지 않습니다.' 
      });
    }

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

    // Product 모델에는 status 필드가 있음 (기본값: 'active')
    // status가 'active'인 제품만 조회
    whereClause.status = 'active';

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
  } catch (error: any) {
    console.error('제품 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 제품 상세 조회
export const getProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenant_id = req.user?.tenant_id;
    const company_id = req.user?.company_id;

    if (!tenant_id || !company_id) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 정보가 올바르지 않습니다.' 
      });
    }

    const product = await (Product as any).findOne({
      where: { id, tenant_id, company_id, status: 'active' }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error('제품 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 제품 생성
export const createProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const tenant_id = req.user?.tenant_id;
    const company_id = req.user?.company_id;
    const user_id = req.user?.id;

    if (!tenant_id || !company_id || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 정보가 올바르지 않습니다.' 
      });
    }

    const productData = { 
      ...req.body, 
      tenant_id, 
      company_id, 
      created_by: user_id, 
      status: 'active' 
    };

    const product = await (Product as any).create(productData);

    res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    console.error('제품 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 제품 수정
export const updateProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const tenant_id = req.user?.tenant_id;
    const company_id = req.user?.company_id;

    if (!tenant_id || !company_id) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 정보가 올바르지 않습니다.' 
      });
    }

    const product = await (Product as any).findOne({
      where: { id, tenant_id, company_id, status: 'active' }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    await product.update(req.body);

    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error('제품 수정 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 제품 삭제
export const deleteProduct = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;

    if (!tenant_id || !company_id) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 정보가 올바르지 않습니다.' 
      });
    }

    const product = await (Product as any).findOne({
      where: { id, tenant_id, company_id, status: 'active' }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: '제품을 찾을 수 없습니다.' });
    }

    // 소프트 삭제: status를 'inactive'로 설정
    await product.update({ status: 'inactive' });

    res.json({ success: true, message: '제품이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('제품 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      order: [['created_at', 'DESC']]
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

// 재고 보고서 통계 조회
export const getInventoryReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    
    if (!tenant_id || !company_id) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자 정보가 올바르지 않습니다.' 
      });
    }

    // 전체 제품 조회
    const allProducts = await (Product as any).findAll({
      where: { tenant_id, company_id, status: 'active' }
    });

    // 통계 계산
    const totalProducts = allProducts.length;
    let totalValue = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    const categoryStats: { [key: string]: { count: number; value: number } } = {};

    allProducts.forEach((product: any) => {
      const stock = parseFloat(product.stock_quantity || 0);
      const price = parseFloat(product.unit_price || 0);
      const value = stock * price;
      
      totalValue += value;

      // 재고 부족 체크
      const minStock = parseFloat(product.min_stock_level || 0);
      if (stock === 0) {
        outOfStockItems++;
      } else if (minStock > 0 && stock <= minStock) {
        lowStockItems++;
      }

      // 카테고리별 통계
      const category = product.category || '기타';
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, value: 0 };
      }
      categoryStats[category].count++;
      categoryStats[category].value += value;
    });

    // 카테고리별 분포 데이터
    const categoryDistribution = Object.entries(categoryStats).map(([name, stats]) => ({
      name,
      value: stats.value,
      count: stats.count
    }));

    // 최근 6개월 재고 변동 추이 (거래 내역 기반)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTransactions = await (InventoryTransaction as any).findAll({
      where: {
        tenant_id,
        company_id,
        created_at: {
          [Op.gte]: sixMonthsAgo
        }
      },
      attributes: [
        [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('created_at')), 'month'],
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_quantity'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'transaction_count']
      ],
      group: [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('created_at')), 'ASC']]
    });

    // 재고 부족 항목 목록
    const lowStockProducts = allProducts
      .filter((product: any) => {
        const stock = parseFloat(product.stock_quantity || 0);
        const minStock = parseFloat(product.min_stock_level || 0);
        return minStock > 0 && stock <= minStock;
      })
      .map((product: any) => ({
        id: product.id,
        name: product.name,
        product_code: product.product_code,
        category: product.category || '기타',
        currentStock: parseFloat(product.stock_quantity || 0),
        minStock: parseFloat(product.min_stock_level || 0),
        unitPrice: parseFloat(product.unit_price || 0),
        totalValue: parseFloat(product.stock_quantity || 0) * parseFloat(product.unit_price || 0)
      }));

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          totalValue,
          lowStockItems,
          outOfStockItems,
          averageTurnover: 0 // 추후 계산 로직 추가 가능
        },
        categoryDistribution,
        monthlyTransactions: monthlyTransactions.map((t: any) => ({
          month: new Date(t.get('month')).toLocaleDateString('ko-KR', { month: 'long' }),
          stock: 0, // 현재 재고는 별도 계산 필요
          movements: parseInt(t.get('transaction_count') || 0)
        })),
        lowStockProducts
      }
    });
  } catch (error: any) {
    console.error('재고 보고서 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
