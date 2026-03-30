import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { DataTypes, Op } from 'sequelize';
import { LoginInfo, LoginLog, Company, User } from '../models';
import { authenticateToken, requireRootOrMinsubEmployee } from '../middleware/auth';
import { AuthRequest } from '../types';
import sequelize from '../config/database';

const router = express.Router();
const allowedExcelTypes = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const allowedExcelExtensions = ['.xls', '.xlsx'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExcelTypes.includes(file.mimetype) || !allowedExcelExtensions.includes(extension)) {
      return cb(new Error('허용되지 않은 파일 형식입니다.'));
    }
    return cb(null, true);
  }
});

router.use(authenticateToken);
router.use(requireRootOrMinsubEmployee);

const ensureCompanyInTenant = async (companyId: number, tenantId: number) => {
  const company = await (Company as any).findOne({
    where: { id: companyId, tenant_id: tenantId },
    attributes: ['id', 'tenant_id']
  });
  return !!company;
};

const normalizeHeader = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');

const resolveColumnIndex = (headers: string[], aliases: string[], fallbackIndex: number) => {
  const normalizedHeaders = headers.map(normalizeHeader);
  const matchIndex = normalizedHeaders.findIndex((header) =>
    aliases.map(normalizeHeader).includes(header)
  );
  return matchIndex >= 0 ? matchIndex : fallbackIndex;
};

const getCellValue = (row: any[], index: number) =>
  index >= 0 && index < row.length ? String(row[index] ?? '').trim() : '';

const trimString = (value: unknown) => String(value ?? '').trim();

const isMissingLoginLogsTableError = (error: any) => {
  const message = String(error?.message || '');
  const originalMessage = String(error?.original?.message || '');
  const combined = `${message} ${originalMessage}`.toLowerCase();
  return (
    combined.includes('login_logs') &&
    (combined.includes('does not exist') ||
      combined.includes('relation') ||
      combined.includes('no such table') ||
      combined.includes('unknown table'))
  );
};

let loginLogsSchemaEnsured = false;
const ensureLoginLogsSchema = async () => {
  if (loginLogsSchemaEnsured) return;
  const queryInterface = sequelize.getQueryInterface();
  let table: any = null;
  try {
    table = await queryInterface.describeTable('login_logs');
  } catch (error: any) {
    if (isMissingLoginLogsTableError(error)) {
      await queryInterface.createTable('login_logs', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        tenant_id: { type: DataTypes.INTEGER, allowNull: true },
        company_id: { type: DataTypes.INTEGER, allowNull: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        userid: { type: DataTypes.STRING(100), allowNull: true },
        status: { type: DataTypes.ENUM('success', 'failure'), allowNull: false, defaultValue: 'success' },
        reason: { type: DataTypes.STRING(255), allowNull: true },
        ip_address: { type: DataTypes.STRING(64), allowNull: true },
        user_agent: { type: DataTypes.STRING(500), allowNull: true },
        logged_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
      loginLogsSchemaEnsured = true;
      return;
    }
    throw error;
  }

  const ensureColumn = async (columnName: string, definition: any) => {
    if (!table?.[columnName]) {
      await queryInterface.addColumn('login_logs', columnName, definition);
    }
  };

  await ensureColumn('tenant_id', { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn('company_id', { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn('user_id', { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn('userid', { type: DataTypes.STRING(100), allowNull: true });
  await ensureColumn('status', {
    type: DataTypes.ENUM('success', 'failure'),
    allowNull: false,
    defaultValue: 'success'
  });
  await ensureColumn('reason', { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn('ip_address', { type: DataTypes.STRING(64), allowNull: true });
  await ensureColumn('user_agent', { type: DataTypes.STRING(500), allowNull: true });
  await ensureColumn('logged_at', { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW });
  loginLogsSchemaEnsured = true;
};

const validateLoginInfoPayload = (payload: any, isUpdate = false) => {
  const errors: string[] = [];
  const hasField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);

  const division = hasField('division') ? trimString(payload.division) : '';
  const loginId = hasField('login_id') ? trimString(payload.login_id) : '';
  const password = hasField('password') ? trimString(payload.password) : '';
  const url = hasField('url') ? trimString(payload.url) : '';

  if (!isUpdate) {
    if (!payload.company_id) {
      errors.push('company_id는 필수입니다.');
    }
    if (!division) {
      errors.push('division은 필수입니다.');
    }
    if (!loginId) {
      errors.push('login_id는 필수입니다.');
    }
    if (!password) {
      errors.push('password는 필수입니다.');
    }
  }

  const fieldsToValidate = [
    { key: 'division', value: division },
    { key: 'login_id', value: loginId },
    { key: 'password', value: password },
    { key: 'open_file_returns', value: hasField('open_file_returns') ? trimString(payload.open_file_returns) : '' },
    { key: 'url', value: url }
  ];

  for (const field of fieldsToValidate) {
    if (field.value && field.value.length > 200) {
      errors.push(`${field.key}는 200자 이하로 입력해주세요.`);
    }
  }

  if (url && !/^https?:\/\//i.test(url)) {
    errors.push('url은 http 또는 https로 시작해야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: {
      division,
      login_id: loginId,
      password,
      open_file_returns: hasField('open_file_returns') ? trimString(payload.open_file_returns) : undefined,
      url: url || undefined
    }
  };
};

// 로그인 정보 목록 조회 (회사별 필터 가능)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const companyId = req.query.company_id ? Number(req.query.company_id) : null;

    if (companyId && Number.isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'company_id가 올바르지 않습니다.'
      });
    }

    const whereClause: any = { tenant_id: tenantId };
    if (companyId) {
      const isValidCompany = await ensureCompanyInTenant(companyId, tenantId);
      if (!isValidCompany) {
        return res.status(403).json({
          success: false,
          message: '해당 회사에 대한 접근 권한이 없습니다.'
        });
      }
      whereClause.company_id = companyId;
    }

    const loginInfos = await (LoginInfo as any).findAll({
      where: whereClause,
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      data: loginInfos
    });
  } catch (error: any) {
    console.error('로그인 정보 목록 조회 오류:', error);
    res.status(200).json({
      success: true,
      message: '데이터가 없습니다.',
      data: []
    });
  }
});

// 로그인 로그 목록 조회
router.get('/logs', async (req: AuthRequest, res) => {
  try {
    await ensureLoginLogsSchema();
    const tenantId = req.user.tenant_id;
    const companyId = req.query.company_id ? Number(req.query.company_id) : null;
    const status = String(req.query.status || '').trim().toLowerCase();
    const userid = String(req.query.userid || '').trim();
    const startDate = String(req.query.start_date || '').trim();
    const endDate = String(req.query.end_date || '').trim();
    const rawLimit = req.query.limit ? Number(req.query.limit) : 200;
    const limit = Number.isNaN(rawLimit) ? 200 : Math.max(1, Math.min(rawLimit, 1000));

    if (companyId && Number.isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'company_id가 올바르지 않습니다.'
      });
    }

    if (status && status !== 'success' && status !== 'failure') {
      return res.status(400).json({
        success: false,
        message: 'status는 success 또는 failure만 가능합니다.'
      });
    }

    const whereClause: any = { tenant_id: tenantId };
    if (companyId) {
      const isValidCompany = await ensureCompanyInTenant(companyId, tenantId);
      if (!isValidCompany) {
        return res.status(403).json({
          success: false,
          message: '해당 회사에 대한 접근 권한이 없습니다.'
        });
      }
      whereClause.company_id = companyId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (userid) {
      whereClause.userid = { [Op.like]: `%${userid}%` };
    }

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        dateFilter[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
      }
      whereClause.logged_at = dateFilter;
    }

    const logs = await (LoginLog as any).findAll({
      where: whereClause,
      order: [['logged_at', 'DESC'], ['id', 'DESC']],
      limit
    });

    const userIds = Array.from(
      new Set(
        logs
          .map((log: any) => log.user_id)
          .filter((id: unknown) => typeof id === 'number')
      )
    ) as number[];

    let usersById = new Map<number, { id: number; username?: string; userid?: string }>();
    if (userIds.length > 0) {
      const users = await (User as any).findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'userid']
      });
      usersById = new Map(
        users.map((user: any) => [
          user.id,
          { id: user.id, username: user.username, userid: user.userid }
        ])
      );
    }

    const mergedLogs = logs.map((log: any) => ({
      ...log.toJSON(),
      user: log.user_id ? usersById.get(log.user_id) || null : null
    }));

    res.json({
      success: true,
      data: mergedLogs
    });
  } catch (error: any) {
    console.error('로그인 로그 목록 조회 오류:', error);
    if (isMissingLoginLogsTableError(error)) {
      return res.json({
        success: true,
        message: '로그인 로그 테이블이 아직 준비되지 않았습니다.',
        data: []
      });
    }
    res.status(500).json({
      success: false,
      message: '로그인 로그를 불러오지 못했습니다.'
    });
  }
});

// 로그인 정보 엑셀 가져오기
router.post('/import', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const companyId = Number(req.body.company_id);

    if (!companyId || Number.isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'company_id가 올바르지 않습니다.'
      });
    }

    const isValidCompany = await ensureCompanyInTenant(companyId, tenantId);
    if (!isValidCompany) {
      return res.status(403).json({
        success: false,
        message: '해당 회사에 대한 접근 권한이 없습니다.'
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: '엑셀 파일이 필요합니다.'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: '엑셀 파일에 데이터가 없습니다.'
      });
    }

    const headerRow = rows[0].map((cell: any) => String(cell || ''));

    const divisionIndex = resolveColumnIndex(headerRow, ['division', '구분'], 1);
    const loginIdIndex = resolveColumnIndex(headerRow, ['loginid', 'login_id', '로그인id', '로그인아이디'], 2);
    const passwordIndex = resolveColumnIndex(headerRow, ['password', '비밀번호'], 3);
    const openFileIndex = resolveColumnIndex(headerRow, ['toopenfiledreturns', 'toopenfilereturns', 'openfilereturns', '비고'], 4);
    const urlIndex = resolveColumnIndex(headerRow, ['url', '링크'], 5);

    const dataRows = rows.slice(1);
    const entries = [];
    let skipped = 0;

    for (const row of dataRows) {
      const division = getCellValue(row, divisionIndex);
      const login_id = getCellValue(row, loginIdIndex);
      const password = getCellValue(row, passwordIndex);
      const open_file_returns = getCellValue(row, openFileIndex);
      const url = getCellValue(row, urlIndex);

      if (!division || !login_id || !password) {
        skipped += 1;
        continue;
      }

      entries.push({
        tenant_id: tenantId,
        company_id: companyId,
        division,
        login_id,
        password,
        open_file_returns: open_file_returns || null,
        url: url || null,
        created_by: userId,
        updated_by: userId
      });
    }

    if (!entries.length) {
      return res.status(400).json({
        success: false,
        message: '가져올 수 있는 유효한 데이터가 없습니다.'
      });
    }

    const created = await (LoginInfo as any).bulkCreate(entries);

    res.status(201).json({
      success: true,
      message: '엑셀 가져오기가 완료되었습니다.',
      data: {
        created: created.length,
        skipped
      }
    });
  } catch (error: any) {
    console.error('로그인 정보 엑셀 가져오기 오류:', error);
    res.status(500).json({
      success: false,
      message: '엑셀 가져오기 중 오류가 발생했습니다.'
    });
  }
});

// 로그인 정보 생성
router.post('/', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { company_id } = req.body;
    const validation = validateLoginInfoPayload(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0]
      });
    }

    const isValidCompany = await ensureCompanyInTenant(Number(company_id), tenantId);
    if (!isValidCompany) {
      return res.status(403).json({
        success: false,
        message: '해당 회사에 대한 접근 권한이 없습니다.'
      });
    }

    const created = await (LoginInfo as any).create({
      tenant_id: tenantId,
      company_id,
      division: validation.normalized.division,
      login_id: validation.normalized.login_id,
      password: validation.normalized.password,
      open_file_returns: validation.normalized.open_file_returns || null,
      url: validation.normalized.url || null,
      created_by: userId,
      updated_by: userId
    });

    res.status(201).json({
      success: true,
      message: '로그인 정보가 등록되었습니다.',
      data: created
    });
  } catch (error: any) {
    console.error('로그인 정보 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 정보 생성 중 오류가 발생했습니다.'
    });
  }
});

// 로그인 정보 수정
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;
    const validation = validateLoginInfoPayload(req.body, true);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0]
      });
    }

    const loginInfo = await (LoginInfo as any).findOne({
      where: { id: Number(id), tenant_id: tenantId }
    });

    if (!loginInfo) {
      return res.status(404).json({
        success: false,
        message: '로그인 정보를 찾을 수 없습니다.'
      });
    }

    if (req.body.company_id) {
      const isValidCompany = await ensureCompanyInTenant(Number(req.body.company_id), tenantId);
      if (!isValidCompany) {
        return res.status(403).json({
          success: false,
          message: '해당 회사에 대한 접근 권한이 없습니다.'
        });
      }
    }

    const updates: any = {
      updated_by: userId
    };
    if (Object.prototype.hasOwnProperty.call(req.body, 'division')) {
      updates.division = validation.normalized.division;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'login_id')) {
      updates.login_id = validation.normalized.login_id;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'password')) {
      updates.password = validation.normalized.password;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'open_file_returns')) {
      updates.open_file_returns = validation.normalized.open_file_returns || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'url')) {
      updates.url = validation.normalized.url || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'company_id')) {
      updates.company_id = Number(req.body.company_id);
    }

    await loginInfo.update(updates);

    res.json({
      success: true,
      message: '로그인 정보가 수정되었습니다.',
      data: loginInfo
    });
  } catch (error: any) {
    console.error('로그인 정보 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 정보 수정 중 오류가 발생했습니다.'
    });
  }
});

// 로그인 정보 삭제
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const loginInfo = await (LoginInfo as any).findOne({
      where: { id: Number(id), tenant_id: tenantId }
    });

    if (!loginInfo) {
      return res.status(404).json({
        success: false,
        message: '로그인 정보를 찾을 수 없습니다.'
      });
    }

    await loginInfo.destroy();

    res.json({
      success: true,
      message: '로그인 정보가 삭제되었습니다.'
    });
  } catch (error: any) {
    console.error('로그인 정보 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '로그인 정보 삭제 중 오류가 발생했습니다.'
    });
  }
});

export default router;
