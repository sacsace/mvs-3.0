import express from 'express';
import { Request, Response } from 'express';
import { Contract } from '../models';

const router = express.Router();

// 계약 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const contracts = await Contract.findAll({
      where: { tenant_id: 1 },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: contracts
    });
  } catch (error: any) {
    console.error('계약 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '계약 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 특정 계약 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '계약을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (error: any) {
    console.error('계약 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '계약 조회 중 오류가 발생했습니다.'
    });
  }
});

// 계약 생성
router.post('/', async (req: Request, res: Response) => {
  try {
    const contractData = {
      ...req.body,
      tenant_id: 1,
      company_id: 1
    };

    const contract = await Contract.create(contractData);

    res.status(201).json({
      success: true,
      message: '계약이 성공적으로 등록되었습니다.',
      data: contract
    });
  } catch (error: any) {
    console.error('계약 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '계약 생성 중 오류가 발생했습니다.'
    });
  }
});

// 계약 수정
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '계약을 찾을 수 없습니다.'
      });
    }

    await contract.update(req.body);

    res.json({
      success: true,
      message: '계약이 성공적으로 수정되었습니다.',
      data: contract
    });
  } catch (error: any) {
    console.error('계약 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '계약 수정 중 오류가 발생했습니다.'
    });
  }
});

// 계약 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contract = await Contract.findOne({
      where: { id, tenant_id: 1 }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '계약을 찾을 수 없습니다.'
      });
    }

    await contract.destroy();

    res.json({
      success: true,
      message: '계약이 성공적으로 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('계약 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '계약 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;
