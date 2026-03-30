import express from 'express';
import { Company, User } from '../models';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

const buildDefaultSettings = (company: Company) => ({
  general: {
    companyName: company.name || 'MVS',
    companyLogo: '',
    timezone: company.timezone || 'Asia/Kolkata',
    language: 'ko',
    dateFormat: 'YYYY-MM-DD',
    currency: 'INR',
    officeLocation: {
      latitude: null,
      longitude: null,
      radiusMeters: 200
    }
  },
  appearance: {
    theme: 'light',
    primaryColor: '#1976d2',
    fontSize: 'medium',
    sidebarCollapsed: false,
    showNotifications: true
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    taskReminders: true,
    systemAlerts: true
  },
  security: {
    passwordMinLength: 8,
    requireSpecialChars: true,
    sessionTimeout: 30,
    twoFactorAuth: false,
    ipWhitelist: false
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    cloudBackup: false
  }
});

const buildSettingsResponse = (company: Company, user?: User | null) => {
  const defaultSettings = buildDefaultSettings(company);
  const companySettings = company.settings || {};
  const userSettings = user?.settings || {};

  return {
    ...defaultSettings,
    ...companySettings,
    general: {
      ...defaultSettings.general,
      companyName: company.name || defaultSettings.general.companyName,
      timezone: company.timezone || defaultSettings.general.timezone,
      ...(companySettings.general || {})
    },
    appearance: {
      ...defaultSettings.appearance,
      ...(companySettings.appearance || {}),
      ...(userSettings.appearance || {})
    }
  };
};

// 시스템 설정 조회
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userCompanyId = (req as any).user.company_id;
    const tenantId = (req as any).user.tenant_id;
    const userId = (req as any).user.id;

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.'
      });
    }

    const company = await Company.findOne({
      where: {
        id: userCompanyId,
        tenant_id: tenantId
      }
    });

    const user = await User.findOne({
      where: {
        id: userId,
        tenant_id: tenantId,
        company_id: userCompanyId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const settings = buildSettingsResponse(company, user);

    // 회사 로고가 있으면 Base64로 변환
    if (company.company_logo && Buffer.isBuffer(company.company_logo)) {
      settings.general.companyLogo = `data:image/png;base64,${company.company_logo.toString('base64')}`;
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    console.error('시스템 설정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 설정 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 사무실 위치 조회 (근태용)
router.get('/office-location', authenticateToken, async (req, res) => {
  try {
    const userCompanyId = (req as any).user.company_id;
    const tenantId = (req as any).user.tenant_id;

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.'
      });
    }

    const company = await Company.findOne({
      where: {
        id: userCompanyId,
        tenant_id: tenantId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const settings = buildSettingsResponse(company, null);
    const officeLocation = settings.general?.officeLocation || null;

    res.json({
      success: true,
      data: {
        officeLocation
      }
    });
  } catch (error: any) {
    console.error('사무실 위치 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사무실 위치 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 시스템 설정 저장
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userCompanyId = (req as any).user.company_id;
    const tenantId = (req as any).user.tenant_id;
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;
    const settings = req.body;
    const canManageAll = userRole === 'root' || userRole === 'admin';

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.'
      });
    }

    const company = await Company.findOne({
      where: {
        id: userCompanyId,
        tenant_id: tenantId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const user = await User.findOne({
      where: {
        id: userId,
        tenant_id: tenantId,
        company_id: userCompanyId
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    if (canManageAll) {
      // 회사명 업데이트
      if (settings.general?.companyName) {
        await company.update({
          name: settings.general.companyName
        });
      }

      // 타임존은 항상 인도 표준시(IST)로 고정
      // 시간대 업데이트 제거 - 항상 Asia/Kolkata로 유지

      // 로고 업데이트 (Base64 이미지가 있는 경우)
      if (settings.general?.companyLogo && settings.general.companyLogo.startsWith('data:image')) {
        const base64Data = settings.general.companyLogo.replace(/^data:image\/\w+;base64,/, '');
        const logoBuffer = Buffer.from(base64Data, 'base64');
        await company.update({
          company_logo: logoBuffer
        });
      }

      const { appearance, ...restSettings } = settings || {};
      const existingCompanySettings = company.settings || {};
      const settingsToSave = {
        ...existingCompanySettings,
        ...restSettings,
        general: restSettings.general
          ? {
              ...existingCompanySettings.general,
              ...restSettings.general,
              companyLogo: undefined // 로고는 별도 필드에 저장되므로 settings에서 제거
            }
          : existingCompanySettings.general
      };

      await company.update({
        settings: settingsToSave
      });
    }

    let updatedUser = user;

    // 외관 설정은 사용자별로 저장
    if (settings.appearance) {
      const existingUserSettings = user.settings || {};
      const updatedUserSettings = {
        ...existingUserSettings,
        appearance: {
          ...(existingUserSettings.appearance || {}),
          ...settings.appearance
        }
      };

      updatedUser = await user.update({
        settings: updatedUserSettings
      });
    }

    res.json({
      success: true,
      message: '시스템 설정이 저장되었습니다.',
      data: buildSettingsResponse(company, updatedUser)
    });
  } catch (error: any) {
    console.error('시스템 설정 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 설정 저장 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 시스템 설정 초기화
router.delete('/', authenticateToken, requireRole(['root', 'admin']), async (req, res) => {
  try {
    const userCompanyId = (req as any).user.company_id;
    const tenantId = (req as any).user.tenant_id;

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.'
      });
    }

    const company = await Company.findOne({
      where: {
        id: userCompanyId,
        tenant_id: tenantId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    await company.update({
      settings: {},
      company_logo: null
    });

    const settings = buildSettingsResponse(company, null);

    res.json({
      success: true,
      message: '시스템 설정이 초기화되었습니다.',
      data: settings
    });
  } catch (error: any) {
    console.error('시스템 설정 초기화 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 설정 초기화 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 로고 업로드
router.post('/logo', authenticateToken, requireRole(['root', 'admin']), async (req, res) => {
  try {
    const userCompanyId = (req as any).user.company_id;
    const tenantId = (req as any).user.tenant_id;
    const { logo } = req.body; // Base64 이미지

    if (!userCompanyId) {
      return res.status(400).json({
        success: false,
        message: '회사 정보가 없습니다.'
      });
    }

    if (!logo || !logo.startsWith('data:image')) {
      return res.status(400).json({
        success: false,
        message: '유효한 이미지 파일이 아닙니다.'
      });
    }

    const company = await Company.findOne({
      where: {
        id: userCompanyId,
        tenant_id: tenantId
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const base64Data = logo.replace(/^data:image\/\w+;base64,/, '');
    const logoBuffer = Buffer.from(base64Data, 'base64');

    await company.update({
      company_logo: logoBuffer
    });

    res.json({
      success: true,
      message: '로고가 업로드되었습니다.',
      data: {
        logo: `data:image/png;base64,${logoBuffer.toString('base64')}`
      }
    });
  } catch (error: any) {
    console.error('로고 업로드 오류:', error);
    res.status(500).json({
      success: false,
      message: '로고 업로드 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// 백업 실행
router.post('/backup', authenticateToken, requireRole(['root', 'admin']), async (req, res) => {
  try {
    const tenantId = (req as any).user.tenant_id;

    // 실제 백업 로직은 나중에 구현
    // 현재는 성공 응답만 반환
    res.json({
      success: true,
      message: '백업이 시작되었습니다.',
      data: {
        backupId: `backup_${Date.now()}`,
        startedAt: new Date().toISOString(),
        status: 'in_progress'
      }
    });
  } catch (error: any) {
    console.error('백업 실행 오류:', error);
    res.status(500).json({
      success: false,
      message: '백업 실행 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

export default router;

