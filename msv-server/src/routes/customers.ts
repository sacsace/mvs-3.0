import express from 'express';
import { Request, Response } from 'express';
import { Customer } from '../models';

const router = express.Router();

// 고객 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const customers = await Customer.findAll({
      where: { tenant_id: 1 },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: customers
    });
  } catch (error: any) {
    console.error('고객 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 특정 고객 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error: any) {
    console.error('고객 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 조회 중 오류가 발생했습니다.'
    });
  }
});

// 고객 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const customerData = {
      ...req.body,
      tenant_id: 1,
      company_id: 1
    };

    const customer = await Customer.create(customerData);

    res.status(201).json({
      success: true,
      message: '고객이 성공적으로 등록되었습니다.',
      data: customer
    });
  } catch (error: any) {
    console.error('고객 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 생성 중 오류가 발생했습니다.'
    });
  }
});

// 고객 수정
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.'
      });
    }

    await customer.update(req.body);

    res.json({
      success: true,
      message: '고객 정보가 성공적으로 수정되었습니다.',
      data: customer
    });
  } catch (error: any) {
    console.error('고객 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 수정 중 오류가 발생했습니다.'
    });
  }
});

// 고객 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: '고객을 찾을 수 없습니다.'
      });
    }

    await customer.destroy();

    res.json({
      success: true,
      message: '고객이 성공적으로 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('고객 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '고객 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;
