import { Response } from 'express';
import { AuthRequest } from '../types';
import { Company } from '../models';
import {
  getHeresnowIntegrationStatus,
  getHeresnowSettings,
  mergeHeresnowSettings,
  processHeresnowDispatch,
  pullHeresnowAttendance,
  testHeresnowConnection,
  verifyHeresnowDispatchAuth
} from '../services/heresnowIntegrationService';

const loadCompanyForUser = async (req: AuthRequest) => {
  const companyId = req.user?.company_id;
  const tenantId = req.user?.tenant_id;
  if (!companyId || !tenantId) return null;
  return Company.findOne({ where: { id: companyId, tenant_id: tenantId } });
};

export const dispatchHeresnowAttendance = async (req: AuthRequest, res: Response) => {
  try {
    if (!verifyHeresnowDispatchAuth(req.headers as Record<string, unknown>)) {
      return res.status(401).json({ success: false, message: '연동 인증에 실패했습니다.' });
    }

    const result = await processHeresnowDispatch(req.body);
    return res.json({
      success: true,
      message: 'HeresNow 근태 이벤트를 처리했습니다.',
      data: result
    });
  } catch (error: any) {
    const code = String(error?.message || '');
    const status = code === 'COMPANY_NOT_FOUND'
      ? 404
      : code === 'INTEGRATION_DISABLED'
        ? 403
        : code === 'EVENTS_REQUIRED'
          ? 400
          : 500;

    return res.status(status).json({
      success: false,
      message:
        code === 'COMPANY_NOT_FOUND'
          ? '연동된 회사를 찾을 수 없습니다.'
          : code === 'INTEGRATION_DISABLED'
            ? 'HeresNow 연동이 비활성화되어 있습니다.'
            : code === 'EVENTS_REQUIRED'
              ? '전송할 근태 이벤트가 없습니다.'
              : 'HeresNow 연동 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? code : undefined
    });
  }
};

export const getHeresnowStatus = async (req: AuthRequest, res: Response) => {
  try {
    const company = await loadCompanyForUser(req);
    if (!company) {
      return res.status(404).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
    }

    const role = String(req.user?.role || '');
    const canManage = role === 'admin' || role === 'root';
    const status = await getHeresnowIntegrationStatus(company);
    if (!canManage) {
      // 일반 사용자에게는 연동 민감 상태(키 힌트/설정 상태)를 노출하지 않음
      delete (status as any).apiKeyHint;
      delete (status as any).apiConfigured;
      delete (status as any).dispatchConfigured;
    }

    return res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'HeresNow 연동 상태 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const syncHeresnowAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const company = await loadCompanyForUser(req);
    if (!company) {
      return res.status(404).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
    }

    const since = typeof req.body?.since === 'string' ? req.body.since : undefined;
    const result = await pullHeresnowAttendance(company, { since });
    console.info('[HeresNow sync]', {
      companyId: company.id,
      tenantId: company.tenant_id,
      since,
      total: result.total,
      applied: result.applied,
      errors: Array.isArray(result.errors) ? result.errors.slice(0, 5) : [],
      debug: (result as any).debug
    });
    const message =
      result.total > 0 && result.applied === 0
        ? `HeresNow 데이터 ${result.total}건을 찾았지만 적용 0건입니다. 사용자 매핑(이메일/사번) 또는 데이터 형식을 확인해주세요.`
        : `HeresNow에서 ${result.applied}건의 근태를 반영했습니다.`;

    return res.json({
      success: true,
      message,
      data: result
    });
  } catch (error: any) {
    const code = String(error?.message || '');
    const status = code === 'INTEGRATION_DISABLED'
      ? 403
      : code === 'API_KEY_NOT_CONFIGURED'
        ? 503
        : 500;

    return res.status(status).json({
      success: false,
      message:
        code === 'INTEGRATION_DISABLED'
          ? 'HeresNow 연동이 비활성화되어 있습니다.'
          : code === 'API_KEY_NOT_CONFIGURED'
            ? '회사별 HeresNow 연동 API 키가 설정되지 않았습니다.'
            : 'HeresNow 동기화 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? code : undefined
    });
  }
};

export const previewHeresnowAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const company = await loadCompanyForUser(req);
    if (!company) {
      return res.status(404).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
    }

    const since = typeof req.body?.since === 'string' ? req.body.since : undefined;
    const result = await pullHeresnowAttendance(company, { since, dryRun: true });

    return res.json({
      success: true,
      message: `HeresNow API 미리보기: 선택 월 기준 ${result.total}건 조회됨 (DB 미반영).`,
      data: result
    });
  } catch (error: any) {
    const code = String(error?.message || '');
    const status = code === 'INTEGRATION_DISABLED'
      ? 403
      : code === 'API_KEY_NOT_CONFIGURED'
        ? 503
        : 500;

    return res.status(status).json({
      success: false,
      message:
        code === 'INTEGRATION_DISABLED'
          ? 'HeresNow 연동이 비활성화되어 있습니다.'
          : code === 'API_KEY_NOT_CONFIGURED'
            ? '회사별 HeresNow 연동 API 키가 설정되지 않았습니다.'
            : 'HeresNow 미리보기 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? code : undefined
    });
  }
};

export const testHeresnowAttendanceConnection = async (req: AuthRequest, res: Response) => {
  try {
    const company = await loadCompanyForUser(req);
    if (!company) {
      return res.status(404).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
    }

    const result = await testHeresnowConnection(company);
    return res.json({
      success: true,
      message: 'HeresNow 연동 테스트에 성공했습니다.',
      data: result
    });
  } catch (error: any) {
    const code = String(error?.message || '');
    const status = code === 'INTEGRATION_DISABLED'
      ? 403
      : code === 'API_KEY_NOT_CONFIGURED'
        ? 503
        : code === '연동된 회사를 찾을 수 없습니다.'
          ? 404
          : code.includes('Unauthorized') || code.includes('401')
            ? 401
            : 500;

    return res.status(status).json({
      success: false,
      message:
        code === 'INTEGRATION_DISABLED'
          ? 'HeresNow 연동이 비활성화되어 있습니다.'
          : code === 'API_KEY_NOT_CONFIGURED'
            ? '회사별 HeresNow 연동 API 키가 설정되지 않았습니다.'
            : code === '연동된 회사를 찾을 수 없습니다.'
              ? '외부 회사 ID 매핑을 찾을 수 없습니다. HeresNow 회사 연동 설정을 확인하세요.'
              : code.includes('Unauthorized') || code.includes('401')
                ? 'HeresNow API 키가 올바르지 않습니다.'
                : 'HeresNow 연동 테스트 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? code : undefined
    });
  }
};

export const updateHeresnowSettings = async (req: AuthRequest, res: Response) => {
  try {
    const company = await loadCompanyForUser(req);
    if (!company) {
      return res.status(404).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
    }

    const { enabled, companyId, externalCompanyId, apiKey } = req.body || {};
    const current = getHeresnowSettings(company);
    const normalizedApiKey =
      typeof apiKey === 'string'
        ? apiKey.trim()
        : undefined;
    const nextSettings = mergeHeresnowSettings(company, {
      enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
      companyId:
        companyId != null && String(companyId).trim()
          ? String(companyId).trim()
          : current.companyId || String(company.id),
      externalCompanyId:
        externalCompanyId != null && String(externalCompanyId).trim()
          ? String(externalCompanyId).trim()
          : current.externalCompanyId || String(company.id),
      ...(normalizedApiKey !== undefined
        ? { apiKey: normalizedApiKey || undefined }
        : {})
    });

    await company.update({ settings: nextSettings });
    await company.reload();

    return res.json({
      success: true,
      message: 'HeresNow 연동 설정을 저장했습니다.',
      data: await getHeresnowIntegrationStatus(company)
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'HeresNow 연동 설정 저장 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
