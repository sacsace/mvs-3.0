import express from 'express';
import { Request, Response } from 'express';
import { SalesOpportunity } from '../models';

const router = express.Router();

// 영업 기회 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const opportunities = await (SalesOpportunity as any).findAll({
      where: { tenant_id: 1 },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: opportunities
    });
  } catch (error: any) {
    console.error('영업 기회 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '영업 기회 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 특정 영업 기회 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const opportunity = await (SalesOpportunity as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: '영업 기회를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: opportunity
    });
  } catch (error: any) {
    console.error('영업 기회 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '영업 기회 조회 중 오류가 발생했습니다.'
    });
  }
});

// 영업 기회 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const opportunityData = {
      ...req.body,
      tenant_id: 1,
      company_id: 1
    };

    const opportunity = await (SalesOpportunity as any).create(opportunityData);

    res.status(201).json({
      success: true,
      message: '영업 기회가 성공적으로 등록되었습니다.',
      data: opportunity
    });
  } catch (error: any) {
    console.error('영업 기회 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '영업 기회 생성 중 오류가 발생했습니다.'
    });
  }
});

// 영업 기회 수정
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const opportunity = await (SalesOpportunity as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: '영업 기회를 찾을 수 없습니다.'
      });
    }

    await opportunity.update(req.body);

    res.json({
      success: true,
      message: '영업 기회가 성공적으로 수정되었습니다.',
      data: opportunity
    });
  } catch (error: any) {
    console.error('영업 기회 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '영업 기회 수정 중 오류가 발생했습니다.'
    });
  }
});

// 영업 기회 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const opportunity = await (SalesOpportunity as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: '영업 기회를 찾을 수 없습니다.'
      });
    }

    await opportunity.destroy();

    res.json({
      success: true,
      message: '영업 기회가 성공적으로 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('영업 기회 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '영업 기회 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;
