import { Response } from 'express';
import { AuthRequest } from '../types';
import { Company } from '../models';
import {
  getHeresnowIntegrationStatus,
  getHeresnowSettings,
  mergeHeresnowSettings,
  processHeresnowDispatch,
  pullHeresnowAttendance,
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

    return res.json({
      success: true,
      data: await getHeresnowIntegrationStatus(company)
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

    return res.json({
      success: true,
      message: `HeresNow에서 ${result.applied}건의 근태를 반영했습니다.`,
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
            ? '서버에 MVS_INTEGRATION_API_KEY가 설정되지 않았습니다.'
            : 'HeresNow 동기화 중 오류가 발생했습니다.',
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

    const { enabled, externalCompanyId } = req.body || {};
    const current = getHeresnowSettings(company);
    const nextSettings = mergeHeresnowSettings(company, {
      enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
      externalCompanyId:
        externalCompanyId != null && String(externalCompanyId).trim()
          ? String(externalCompanyId).trim()
          : current.externalCompanyId || String(company.id)
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
