import express from 'express';
import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { DataTypes } from 'sequelize';
import { Contract, Customer } from '../models';
import { validateBody } from '../middleware/validate';
import sequelize from '../config/database';

const router = express.Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uploadRoot = process.env.UPLOAD_PATH || './uploads';
const contractUploadDir = path.resolve(uploadRoot, 'contracts');

let contractSchemaEnsured = false;

const ensureContractUploadDir = () => {
  if (!fs.existsSync(contractUploadDir)) {
    fs.mkdirSync(contractUploadDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureContractUploadDir();
    cb(null, contractUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeBase = path
      .basename(file.originalname || 'contract-file', ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    const timestamp = Date.now();
    cb(null, `${timestamp}_${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const generateContractNumber = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = String(Date.now()).slice(-6);
  return `CTR-${yyyy}${mm}${dd}-${suffix}`;
};

const ensureContractSchema = async () => {
  if (contractSchemaEnsured) return;

  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('contracts');

  if (!table.company_id) {
    // 레거시 DB 호환: company_id 컬럼이 없는 경우 자동 추가
    await queryInterface.addColumn('contracts', 'company_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  }

  if (!table.contract_value) {
    // 레거시 DB 호환: value 컬럼을 contract_value로 통합
    await queryInterface.addColumn('contracts', 'contract_value', {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    });

    if (table.value) {
      await sequelize.query(`
        UPDATE contracts
        SET contract_value = value
        WHERE contract_value IS NULL
      `);
    }
  }

  if (!table.contract_type) {
    await queryInterface.addColumn('contracts', 'contract_type', {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'sales'
    });
  }

  if (!table.attachments) {
    await queryInterface.addColumn('contracts', 'attachments', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    });
  }

  contractSchemaEnsured = true;
};

const resolveValidCustomerId = async (input: unknown) => {
  if (typeof input !== 'number' || Number.isNaN(input)) return null;
  // 고객 목록 API에서 숙박손님은 1,000,000,000+ 가상 ID로 내려옴
  if (input >= 1000000000) return null;
  const customer = await (Customer as any).findOne({
    where: { id: input, tenant_id: 1 },
    attributes: ['id']
  });
  return customer ? input : null;
};

// 계약 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    await ensureContractSchema();
    const contracts = await (Contract as any).findAll({
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
    await ensureContractSchema();
    const { id } = req.params;
    const contract = await (Contract as any).findOne({
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
router.post(
  '/',
  validateBody({
    contract_number: { type: 'string', minLength: 1, maxLength: 50 },
    title: { required: true, type: 'string', minLength: 1, maxLength: 200 },
    customer_id: { type: 'number' },
    contract_type: { type: 'string', oneOf: ['sales', 'purchase_lease'] },
    start_date: { required: true, type: 'string', pattern: datePattern },
    end_date: { required: true, type: 'string', pattern: datePattern },
    status: { type: 'string', maxLength: 20 }
  }),
  async (req: Request, res: Response) => {
  try {
    await ensureContractSchema();
    const parsedContractValue = Number(req.body.contract_value ?? req.body.value);
    if (!Number.isFinite(parsedContractValue) || parsedContractValue <= 0) {
      return res.status(400).json({
        success: false,
        message: '계약 가치를 올바르게 입력해 주세요.'
      });
    }

    const customerId = await resolveValidCustomerId(req.body.customer_id);
    const generatedContractNumber = req.body.contract_number || generateContractNumber();
    const contractData = {
      ...req.body,
      customer_id: customerId,
      contract_number: generatedContractNumber,
      contract_type: req.body.contract_type || 'sales',
      contract_value: parsedContractValue,
      tenant_id: 1,
      company_id: 1,
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : []
    };

    const contract = await (Contract as any).create(contractData);

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
router.put(
  '/:id',
  validateBody({
    contract_number: { type: 'string', minLength: 1, maxLength: 50 },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    customer_id: { type: 'number' },
    contract_type: { type: 'string', oneOf: ['sales', 'purchase_lease'] },
    start_date: { type: 'string', pattern: datePattern },
    end_date: { type: 'string', pattern: datePattern },
    status: { type: 'string', maxLength: 20 }
  }),
  async (req: Request, res: Response) => {
  try {
    await ensureContractSchema();
    const { id } = req.params;
    const contract = await (Contract as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '계약을 찾을 수 없습니다.'
      });
    }

    const updatePayload: Record<string, any> = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(updatePayload, 'contract_value') || Object.prototype.hasOwnProperty.call(updatePayload, 'value')) {
      const parsedContractValue = Number(updatePayload.contract_value ?? updatePayload.value);
      if (!Number.isFinite(parsedContractValue) || parsedContractValue <= 0) {
        return res.status(400).json({
          success: false,
          message: '계약 가치를 올바르게 입력해 주세요.'
        });
      }
      updatePayload.contract_value = parsedContractValue;
    }

    if (Object.prototype.hasOwnProperty.call(updatePayload, 'customer_id')) {
      updatePayload.customer_id = await resolveValidCustomerId(updatePayload.customer_id);
    }

    await contract.update(updatePayload);

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
    await ensureContractSchema();
    const { id } = req.params;
    const contract = await (Contract as any).findOne({
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

// 계약 파일 첨부
router.post('/:id/upload-files', upload.array('files'), async (req: Request, res: Response) => {
  try {
    await ensureContractSchema();
    const { id } = req.params;
    const contract = await (Contract as any).findOne({
      where: { id, tenant_id: 1 }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '계약을 찾을 수 없습니다.'
      });
    }

    const files = ((req as any).files || []) as Array<{ filename?: string }>;
    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: '첨부할 파일이 없습니다.'
      });
    }

    const existingAttachments = Array.isArray(contract.attachments) ? [...contract.attachments] : [];
    const uploadedPaths = files
      .filter((file) => file.filename)
      .map((file) => path.join('contracts', file.filename as string).replace(/\\/g, '/'));

    const attachments = [...existingAttachments, ...uploadedPaths];
    await contract.update({ attachments });

    return res.json({
      success: true,
      message: '계약 파일이 첨부되었습니다.',
      data: contract,
      uploaded: uploadedPaths
    });
  } catch (error: any) {
    console.error('계약 파일 첨부 오류:', error);
    return res.status(500).json({
      success: false,
      message: '계약 파일 첨부 중 오류가 발생했습니다.'
    });
  }
});

export default router;
