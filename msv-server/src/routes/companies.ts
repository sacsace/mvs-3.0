import express from 'express';
import { Company } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 모든 회사 조회 (테넌트별)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenant_id;
    
    const companies = await Company.findAll({
      where: { tenant_id: tenantId },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('회사 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 목록을 불러오는데 실패했습니다.'
    });
  }
});

// 특정 회사 조회
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenant_id;
    
    const company = await Company.findOne({
      where: { 
        id: id,
        tenant_id: tenantId 
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error('회사 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 정보를 불러오는데 실패했습니다.'
    });
  }
});

// 회사 생성
router.post('/', authenticateToken, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenant_id;
    const companyData = {
      ...req.body,
      tenant_id: tenantId
    };

    const company = await Company.create(companyData);

    res.status(201).json({
      success: true,
      data: company,
      message: '회사가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('회사 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 생성에 실패했습니다.'
    });
  }
});

// 회사 수정
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenant_id;
    
    const [updatedRowsCount] = await Company.update(req.body, {
      where: { 
        id: id,
        tenant_id: tenantId 
      }
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const updatedCompany = await Company.findByPk(id);

    res.json({
      success: true,
      data: updatedCompany,
      message: '회사 정보가 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('회사 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 수정에 실패했습니다.'
    });
  }
});

// 회사 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).user.tenant_id;
    
    const deletedRowsCount = await Company.destroy({
      where: { 
        id: id,
        tenant_id: tenantId 
      }
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      message: '회사가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('회사 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '회사 삭제에 실패했습니다.'
    });
  }
});

export default router;

