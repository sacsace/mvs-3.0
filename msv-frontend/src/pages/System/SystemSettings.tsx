import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  CloudUpload as CloudUploadIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  DisplaySettings as DisplaySettingsIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { systemSettingsService } from '../../services/api';
import { getUploadUrl } from '../../utils/uploadUrl';
import { useStore, useMenuStore } from '../../store';
import SystemLoginHistoryTab from './SystemLoginHistoryTab';

/** 시스템 설정 폼: 약간 촘촘한 줄간격·글자 크기 */
const CARD_CONTENT_COMPACT = { py: 1.5, px: 2, '&:last-child': { pb: 1.5 } } as const;
const SECTION_TITLE = { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.35 } as const;
const SECTION_HEADER = { display: 'flex', alignItems: 'center', mb: 1 } as const;
const SECTION_DIVIDER = { mb: 1.25 } as const;
const FIELD_LABEL = {
  fontSize: '0.75rem',
  mb: 0.5,
  fontWeight: 500,
  color: 'text.primary',
  lineHeight: 1.35
} as const;
const FIELD_BLOCK = { mb: 1.25 } as const;
const SWITCH_LABEL = { mb: 0.35, '& .MuiFormControlLabel-label': { fontSize: '0.8125rem', lineHeight: 1.35 } } as const;

/** 설정 카드 — 테두리·얕은 그림자로 블록 구분 */
const SETTINGS_CARD_SX = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.07)',
  bgcolor: 'background.paper',
  overflow: 'hidden'
} as const;

/** 우측 열(화면·알림·보안): 좌측 일반 설정과 같은 행 높이에 맞춤 — md 이상만 */
const SETTINGS_RIGHT_STACK_SX = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
  minHeight: 0,
  height: { xs: 'auto', md: '100%' }
} as const;

const SETTINGS_RIGHT_CARD_SX = {
  ...SETTINGS_CARD_SX,
  display: 'flex',
  flexDirection: 'column',
  flex: { xs: '0 0 auto', md: '1 1 0' },
  minHeight: { md: 0 }
} as const;

const SETTINGS_RIGHT_CARD_CONTENT_SX = {
  ...CARD_CONTENT_COMPACT,
  flex: { xs: 'none', md: 1 },
  display: 'flex',
  flexDirection: 'column',
  minHeight: { md: 0 }
} as const;

/** 서버에만 비밀번호가 있을 때 입력란에 보이는 마스크(실제 값과 무관) */
const MAIL_AUTH_PASS_MASK = '********';

const SystemSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useStore();
  const { language, setLanguage } = useMenuStore();
  const [settingsTab, setSettingsTab] = useState(0);
  const canManageAll = user?.role === 'root' || user?.role === 'admin';
  const isRoot = user?.role === 'root';
  const [settings, setSettings] = useState({
    general: {
      companyName: 'MVS',
      companyAbbreviation: 'MVS',
      companyLogo: '',
      timezone: 'Asia/Kolkata',
      language: 'ko',
      dateFormat: 'YYYY-MM-DD',
      currency: 'INR',
      officeLocation: {
        latitude: '',
        longitude: '',
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
      cloudBackup: false,
      lastBackup: null as string | null
    },
    mailServer: {
      host: '',
      port: 587,
      secure: false,
      authUser: '',
      authPass: '',
      authPassConfigured: false,
      fromEmail: '',
      fromName: ''
    }
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [locatingOffice, setLocatingOffice] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string>('');
  /** 메일 비밀번호: 저장만 되어 있을 때 필드에 마스크 표시, 포커스 시 편집용으로 비움 */
  const [mailAuthPassFocused, setMailAuthPassFocused] = useState(false);

  // 설정 로드
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await systemSettingsService.getSettings();
      if (response.success && response.data) {
        const d = response.data as typeof settings;
        const ms = (d as any).mailServer || {};
        const loginEmail = (user?.email && String(user.email).trim()) || '';
        const loginName = (user?.username && String(user.username).trim()) || '';
        const normalizedSettings = {
          ...d,
          general: {
            ...d.general,
            companyAbbreviation: String((d as any).general?.companyAbbreviation ?? 'MVS'),
            // 인도 서비스 기본 통화 고정
            currency: 'INR'
          },
          mailServer: {
            host: String(ms.host || ''),
            port: typeof ms.port === 'number' ? ms.port : parseInt(String(ms.port || 587), 10) || 587,
            secure: Boolean(ms.secure),
            authUser: String(ms.authUser || '').trim() || loginEmail,
            authPass: '',
            authPassConfigured: Boolean(ms.authPassConfigured),
            fromEmail: String(ms.fromEmail || '').trim() || loginEmail,
            fromName: String(ms.fromName || '').trim() || loginName
          }
        };
        setSettings(normalizedSettings);
        setMailAuthPassFocused(false);
        if (response.data.general?.companyLogo) {
          setPreviewLogo(response.data.general.companyLogo);
        }
      }
    } catch (error: any) {
      console.error('설정 로드 오류:', error);
      
      // Network Error인 경우 서버 연결 문제 안내
      let errorMessage = '설정을 불러오는 중 오류가 발생했습니다.';
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        errorMessage = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
      } else if (error.response?.status === 401) {
        errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
      } else if (error.response?.status === 403) {
        errorMessage = '접근 권한이 없습니다. root 권한이 필요합니다.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.username]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('mvs-sidebar-auto-collapse', {
        detail: { collapsed: settings.appearance.sidebarCollapsed }
      })
    );
  }, [settings.appearance.sidebarCollapsed]);

  const handleSettingChange = (category: string, key: string, value: any) => {
    let nextValue = value;
    if (category === 'security' && key === 'sessionTimeout') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        nextValue = Math.min(24 * 60, Math.max(5, Math.floor(parsed)));
      } else {
        nextValue = 30;
      }
    }
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: nextValue
      }
    }));
  };

  const handleMailServerChange = (key: string, value: string | number | boolean) => {
    setSettings((prev) => {
      const mailServer = {
        ...prev.mailServer,
        [key]: value
      } as typeof prev.mailServer;
      // 포트별 TLS 방식 고정(587=STARTTLS, 465=SSL) — Gmail 등 오설정 방지
      if (key === 'port') {
        const p = typeof value === 'number' ? value : parseInt(String(value), 10) || 587;
        if (p === 465) mailServer.secure = true;
        else if (p === 587 || p === 2525 || p === 25) mailServer.secure = false;
      }
      return { ...prev, mailServer };
    });
  };

  const applyGmailMailPreset = () => {
    setSettings((prev) => ({
      ...prev,
      mailServer: {
        ...prev.mailServer,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
      }
    }));
  };

  const handleOfficeLocationChange = (key: 'latitude' | 'longitude' | 'radiusMeters', value: string) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        officeLocation: {
          ...prev.general.officeLocation,
          [key]: value
        }
      }
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSnackbar({
        open: true,
        message: '이 브라우저에서는 위치 정보를 사용할 수 없습니다.',
        severity: 'error'
      });
      return;
    }

    setLocatingOffice(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSettings(prev => ({
          ...prev,
          general: {
            ...prev.general,
            officeLocation: {
              ...prev.general.officeLocation,
              latitude: latitude.toString(),
              longitude: longitude.toString()
            }
          }
        }));
        setLocatingOffice(false);
      },
      () => {
        setSnackbar({
          open: true,
          message: '현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.',
          severity: 'error'
        });
        setLocatingOffice(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let payload: typeof settings | { appearance: typeof settings.appearance } = canManageAll
        ? settings
        : { appearance: settings.appearance };
      if (canManageAll && !isRoot) {
        const { backup: _omitBackup, ...withoutBackup } = settings;
        payload = withoutBackup;
      }
      const response = await systemSettingsService.saveSettings(payload);
      if (response.success) {
        setSnackbar({
          open: true,
          message: '설정이 저장되었습니다.',
          severity: 'success'
        });
        
        // 언어 설정이 변경되면 store 업데이트
        if (canManageAll && settings.general.language !== language) {
          setLanguage(settings.general.language as 'ko' | 'en');
        }

        // 테마 모드 변경 반영
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (error: any) {
      console.error('설정 저장 오류:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || '설정 저장 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = () => {
    setDialogType('logo');
    setOpenDialog(true);
    setSelectedFile(null);
    setPreviewLogo('');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSnackbar({
          open: true,
          message: '이미지 파일만 업로드할 수 있습니다.',
          severity: 'error'
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        setSnackbar({
          open: true,
          message: '파일 크기는 5MB 이하여야 합니다.',
          severity: 'error'
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoConfirm = async () => {
    if (!previewLogo) {
      setSnackbar({
        open: true,
        message: '로고 파일을 선택해주세요.',
        severity: 'error'
      });
      return;
    }

    try {
      setUploading(true);
      const response = await systemSettingsService.uploadLogo(previewLogo);
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          general: {
            ...prev.general,
            companyLogo: response.data.logo
          }
        }));
        setSnackbar({
          open: true,
          message: '로고가 업로드되었습니다.',
          severity: 'success'
        });
        setOpenDialog(false);
      }
    } catch (error: any) {
      console.error('로고 업로드 오류:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || '로고 업로드 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBackupNow = () => {
    if (!isRoot) return;
    setDialogType('backup');
    setOpenDialog(true);
  };

  const handleBackupConfirm = async () => {
    if (!isRoot) return;
    try {
      setBackingUp(true);
      const response = await systemSettingsService.runBackup();
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          backup: {
            ...prev.backup,
            lastBackup: new Date().toISOString()
          }
        }));
        setSnackbar({
          open: true,
          message: '백업이 시작되었습니다.',
          severity: 'success'
        });
        setOpenDialog(false);
      }
    } catch (error: any) {
      console.error('백업 실행 오류:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || '백업 실행 중 오류가 발생했습니다.',
        severity: 'error'
      });
    } finally {
      setBackingUp(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        p: 0, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  const showMailPassMask =
    settings.mailServer.authPassConfigured &&
    settings.mailServer.authPass === '' &&
    !mailAuthPassFocused;

  return (
    <Box sx={{ 
      p: 0, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2 
      }}>
        <Box>
          <Typography component="h1" variant="pageTitle" sx={{ mb: 0.5 }}>
            시스템 설정
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>
            시스템 전반의 설정을 관리하는 페이지입니다.
          </Typography>
        </Box>
        {settingsTab === 0 && (
          <Button
            variant="contained"
            size="small"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon sx={{ fontSize: 18 }} />}
            onClick={handleSave}
            disabled={saving}
            sx={{ borderRadius: 1.5, py: 0.75 }}
          >
            {saving ? '저장 중...' : '설정 저장'}
          </Button>
        )}
      </Box>

      <Card sx={{ mb: 1.5 }}>
        <CardContent sx={{ py: 0.25, '&:last-child': { pb: 0.25 } }}>
          <Tabs
            value={settingsTab}
            onChange={(_, v) => setSettingsTab(v)}
            sx={{
              minHeight: 38,
              '& .MuiTab-root': {
                minHeight: 38,
                textTransform: 'none',
                fontSize: '0.8125rem',
                py: 0.75
              }
            }}
          >
            <Tab label={t('systemSettings.tabs.basic')} />
            <Tab label={t('systemSettings.tabs.systemLoginHistory')} />
          </Tabs>
        </CardContent>
      </Card>

      {settingsTab === 1 && <SystemLoginHistoryTab />}

      {settingsTab === 0 && (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          alignItems: 'stretch'
        }}
      >
        {/* 일반 설정 — 좌측 */}
        <Card sx={{ ...SETTINGS_CARD_SX, height: { md: '100%' }, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ ...CARD_CONTENT_COMPACT, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={SECTION_HEADER}>
              <SettingsIcon sx={{ mr: 0.75, color: 'primary.main', fontSize: 20 }} />
              <Typography component="h2" sx={SECTION_TITLE}>일반 설정</Typography>
            </Box>
            <Divider sx={SECTION_DIVIDER} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.25 }}>
              <Avatar 
                sx={{ mr: 1.5, width: 48, height: 48 }}
                src={getUploadUrl(previewLogo || settings.general.companyLogo)}
              >
                {settings.general.companyName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.35 }}>
                  회사 로고
                </Typography>
                <Button size="small" onClick={handleLogoUpload} disabled={!canManageAll} sx={{ mt: 0.25 }}>
                  로고 변경
                </Button>
              </Box>
            </Box>

            <Box sx={FIELD_BLOCK}>
              <Typography sx={FIELD_LABEL}>
                회사명
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={settings.general.companyName}
                onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
                variant="outlined"
                disabled={!canManageAll}
              />
            </Box>

            <Box sx={FIELD_BLOCK}>
              <Typography sx={FIELD_LABEL}>{t('systemSettings.general.companyAbbreviation')}</Typography>
              <TextField
                fullWidth
                size="small"
                value={settings.general.companyAbbreviation}
                onChange={(e) => handleSettingChange('general', 'companyAbbreviation', e.target.value.toUpperCase())}
                variant="outlined"
                disabled={!canManageAll}
                placeholder="MSV"
                helperText={t('systemSettings.general.companyAbbreviationHint')}
              />
            </Box>

            <Box sx={FIELD_BLOCK}>
              <Typography sx={{ ...FIELD_LABEL, mb: 0.75 }}>
                사무실 위치 (출근 제한 기준)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25, mb: 0.75 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 0.35, color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                    위도
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: '0.000001' }}
                    value={settings.general.officeLocation.latitude}
                    onChange={(e) => handleOfficeLocationChange('latitude', e.target.value)}
                    fullWidth
                    disabled={!canManageAll}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 0.35, color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                    경도
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: '0.000001' }}
                    value={settings.general.officeLocation.longitude}
                    onChange={(e) => handleOfficeLocationChange('longitude', e.target.value)}
                    fullWidth
                    disabled={!canManageAll}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 0.35, color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                    허용 반경 (미터)
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 10, step: '10' }}
                    value={settings.general.officeLocation.radiusMeters}
                    onChange={(e) => handleOfficeLocationChange('radiusMeters', e.target.value)}
                    fullWidth
                    disabled={!canManageAll}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleUseCurrentLocation}
                    disabled={locatingOffice || !canManageAll}
                    fullWidth
                    sx={{ py: 1 }}
                  >
                    {locatingOffice ? '위치 확인 중...' : '현재 위치 가져오기'}
                  </Button>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                등록된 위치에서만 출근할 수 있습니다.
              </Typography>
            </Box>

            <Box sx={FIELD_BLOCK}>
              <Typography sx={FIELD_LABEL}>
                시간대
              </Typography>
              <TextField
                value="인도 표준시 (IST)"
                fullWidth
                size="small"
                disabled
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: 'action.disabledBackground'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.35, display: 'block', fontSize: '0.7rem', lineHeight: 1.4 }}>
                시간대는 항상 인도 표준시(IST)로 고정됩니다.
              </Typography>
            </Box>

            <Box sx={FIELD_BLOCK}>
              <Typography sx={FIELD_LABEL}>
                언어
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={settings.general.language}
                  onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                  displayEmpty
                  disabled={!canManageAll}
                >
                  <MenuItem value="ko">한국어</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography sx={FIELD_LABEL}>
                통화
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={'INR'}
                  onChange={(e) => handleSettingChange('general', 'currency', e.target.value)}
                  displayEmpty
                  disabled={!canManageAll}
                >
                  <MenuItem value="INR">INR (Rs.)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* 우측: 화면 설정 → 알림 설정 → 보안 설정 (md: 좌측과 동일 행 높이) */}
        <Box sx={SETTINGS_RIGHT_STACK_SX}>
        {/* 외관 설정 */}
        <Card sx={SETTINGS_RIGHT_CARD_SX}>
          <CardContent sx={SETTINGS_RIGHT_CARD_CONTENT_SX}>
            <Box sx={SECTION_HEADER}>
              <DisplaySettingsIcon sx={{ mr: 0.75, color: 'primary.main', fontSize: 20 }} />
              <Typography component="h2" sx={SECTION_TITLE}>화면 설정</Typography>
            </Box>
            <Divider sx={SECTION_DIVIDER} />

            <Box sx={FIELD_BLOCK}>
              <Typography sx={FIELD_LABEL}>
                테마
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={(() => {
                    const rawTheme = String(settings.appearance.theme || 'light');
                    const normalizedTheme = rawTheme === 'ocean' ? 'forest' : rawTheme;
                    return ['light', 'dark', 'forest', 'sunset', 'lavender', 'graphite'].includes(normalizedTheme) ? normalizedTheme : 'light';
                  })()}
                  onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    const labelMap: Record<string, string> = {
                      light: '라이트 테마',
                      dark: '다크 테마',
                      forest: '포레스트 테마',
                      sunset: '선셋 테마',
                      lavender: '라벤더 테마',
                      graphite: '그래파이트 테마'
                    };
                    return labelMap[String(selected)] || '라이트 테마';
                  }}
                  sx={{
                    '& .MuiSelect-select': {
                      color: 'text.primary',
                      WebkitTextFillColor: (theme) => theme.palette.text.primary
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'text.primary'
                    }
                  }}
                >
                  <MenuItem value="light">라이트 테마</MenuItem>
                  <MenuItem value="dark">다크 테마</MenuItem>
                  <MenuItem value="forest">포레스트 테마</MenuItem>
                  <MenuItem value="sunset">선셋 테마</MenuItem>
                  <MenuItem value="lavender">라벤더 테마</MenuItem>
                  <MenuItem value="graphite">그래파이트 테마</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem', lineHeight: 1.45 }}>
                {{
                  light: '밝고 깔끔한 기본 테마',
                  dark: '중성 다크 톤의 기본 야간 테마',
                  forest: '차분한 딥그린 계열 테마 (헤더/카드/선택영역이 녹색 계열로 표현됨)',
                  sunset: '따뜻한 오렌지 계열 라이트 테마',
                  lavender: '부드러운 보라 계열 라이트 테마',
                  graphite: '무채색 중심의 고대비 다크 테마'
                }[(String(settings.appearance.theme) === 'ocean' ? 'forest' : String(settings.appearance.theme))] || '밝고 깔끔한 기본 테마'}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: { xs: 0.75, sm: 1 },
                columnGap: 1.25,
                rowGap: 0.75
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.appearance.sidebarCollapsed}
                    onChange={(e) => handleSettingChange('appearance', 'sidebarCollapsed', e.target.checked)}
                  />
                }
                label="사이드바 자동 접기"
                sx={{ ...SWITCH_LABEL, mb: 0 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.appearance.showNotifications}
                    onChange={(e) => handleSettingChange('appearance', 'showNotifications', e.target.checked)}
                  />
                }
                label="알림 표시"
                sx={{ ...SWITCH_LABEL, mb: 0 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card sx={SETTINGS_RIGHT_CARD_SX}>
          <CardContent sx={SETTINGS_RIGHT_CARD_CONTENT_SX}>
            <Box sx={SECTION_HEADER}>
              <NotificationsIcon sx={{ mr: 0.75, color: 'primary.main', fontSize: 20 }} />
              <Typography component="h2" sx={SECTION_TITLE}>알림 설정</Typography>
            </Box>
            <Divider sx={SECTION_DIVIDER} />

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: { xs: 0.75, sm: 1 },
                columnGap: 1.25,
                rowGap: 0.75
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.notifications.emailNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                    disabled={!canManageAll}
                  />
                }
                label="이메일 알림"
                sx={{ ...SWITCH_LABEL, mb: 0 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.notifications.pushNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                    disabled={!canManageAll}
                  />
                }
                label="푸시 알림"
                sx={{ ...SWITCH_LABEL, mb: 0 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.notifications.smsNotifications}
                    onChange={(e) => handleSettingChange('notifications', 'smsNotifications', e.target.checked)}
                    disabled={!canManageAll}
                  />
                }
                label="SMS 알림"
                sx={{ ...SWITCH_LABEL, mb: 0 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.notifications.taskReminders}
                    onChange={(e) => handleSettingChange('notifications', 'taskReminders', e.target.checked)}
                    disabled={!canManageAll}
                  />
                }
                label="업무 알림"
                sx={{ ...SWITCH_LABEL, mb: 0 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.notifications.systemAlerts}
                    onChange={(e) => handleSettingChange('notifications', 'systemAlerts', e.target.checked)}
                    disabled={!canManageAll}
                  />
                }
                label="시스템 알림"
                sx={{ ...SWITCH_LABEL, mb: 0 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* 보안 설정 */}
        <Card sx={SETTINGS_RIGHT_CARD_SX}>
          <CardContent sx={SETTINGS_RIGHT_CARD_CONTENT_SX}>
            <Box sx={SECTION_HEADER}>
              <SecurityIcon sx={{ mr: 0.75, color: 'primary.main', fontSize: 20 }} />
              <Typography component="h2" sx={SECTION_TITLE}>보안 설정</Typography>
            </Box>
            <Divider sx={SECTION_DIVIDER} />

            <Box sx={FIELD_BLOCK}>
              <Typography sx={FIELD_LABEL}>
                최소 비밀번호 길이
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={settings.security.passwordMinLength}
                onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                variant="outlined"
                disabled={!canManageAll}
              />
            </Box>

            <Box sx={FIELD_BLOCK}>
              <Typography sx={FIELD_LABEL}>
                세션 타임아웃 (분)
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                inputProps={{ min: 5, max: 1440, step: 1 }}
                variant="outlined"
                disabled={!canManageAll}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.security.requireSpecialChars}
                  onChange={(e) => handleSettingChange('security', 'requireSpecialChars', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="특수문자 필수"
              sx={SWITCH_LABEL}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="2단계 인증"
              sx={SWITCH_LABEL}
            />

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={settings.security.ipWhitelist}
                  onChange={(e) => handleSettingChange('security', 'ipWhitelist', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="IP 화이트리스트"
              sx={{ ...SWITCH_LABEL, mb: 0 }}
            />
          </CardContent>
        </Card>
        </Box>

        {/* 보내는 메일 서버 (SMTP) */}
        <Card sx={{ ...SETTINGS_CARD_SX, gridColumn: { xs: '1', md: '1 / -1' } }}>
          <CardContent sx={CARD_CONTENT_COMPACT}>
            <Box sx={SECTION_HEADER}>
              <EmailIcon sx={{ mr: 0.75, color: 'primary.main', fontSize: 20 }} />
              <Typography component="h2" sx={SECTION_TITLE}>{t('systemSettings.mailServer.title')}</Typography>
            </Box>
            <Divider sx={SECTION_DIVIDER} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8125rem', lineHeight: 1.45 }}>
              {t('systemSettings.mailServer.hint')}
            </Typography>
            <Alert severity="info" sx={{ mb: 1.5, py: 0.75, fontSize: '0.8125rem', '& .MuiAlert-message': { width: '100%' } }}>
              {t('systemSettings.mailServer.gmailHint')}
            </Alert>
            {canManageAll && (
              <Button
                size="small"
                variant="outlined"
                onClick={applyGmailMailPreset}
                sx={{ mb: 1.5, textTransform: 'none', fontSize: '0.8125rem' }}
              >
                {t('systemSettings.mailServer.gmailPreset')}
              </Button>
            )}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.25
              }}
            >
              <TextField
                fullWidth
                size="small"
                label={t('systemSettings.mailServer.host')}
                value={settings.mailServer.host}
                onChange={(e) => handleMailServerChange('host', e.target.value)}
                disabled={!canManageAll}
                placeholder="smtp.gmail.com"
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label={t('systemSettings.mailServer.port')}
                value={settings.mailServer.port}
                onChange={(e) => handleMailServerChange('port', parseInt(e.target.value, 10) || 587)}
                disabled={!canManageAll}
              />
              <FormControlLabel
                sx={{ gridColumn: { xs: '1', sm: '1 / -1' }, ...SWITCH_LABEL }}
                control={
                  <Switch
                    size="small"
                    checked={settings.mailServer.secure}
                    onChange={(e) => handleMailServerChange('secure', e.target.checked)}
                    disabled={!canManageAll}
                  />
                }
                label={t('systemSettings.mailServer.secure')}
              />
              <TextField
                fullWidth
                size="small"
                label={t('systemSettings.mailServer.authUser')}
                value={settings.mailServer.authUser}
                onChange={(e) => handleMailServerChange('authUser', e.target.value)}
                disabled={!canManageAll}
                autoComplete="off"
              />
              <TextField
                fullWidth
                size="small"
                type={showMailPassMask ? 'text' : 'password'}
                label={t('systemSettings.mailServer.authPass')}
                value={showMailPassMask ? MAIL_AUTH_PASS_MASK : settings.mailServer.authPass}
                onChange={(e) => handleMailServerChange('authPass', e.target.value)}
                onFocus={() => setMailAuthPassFocused(true)}
                onBlur={() => setMailAuthPassFocused(false)}
                disabled={!canManageAll}
                autoComplete="new-password"
                sx={
                  showMailPassMask
                    ? {
                        '& .MuiInputBase-input': {
                          fontFamily: 'ui-monospace, monospace',
                          letterSpacing: '0.08em'
                        }
                      }
                    : undefined
                }
                helperText={
                  settings.mailServer.authPassConfigured
                    ? t('systemSettings.mailServer.authPassHint')
                    : undefined
                }
              />
              <TextField
                fullWidth
                size="small"
                label={t('systemSettings.mailServer.fromEmail')}
                value={settings.mailServer.fromEmail}
                onChange={(e) => handleMailServerChange('fromEmail', e.target.value)}
                disabled={!canManageAll}
                placeholder="noreply@company.com"
              />
              <TextField
                fullWidth
                size="small"
                label={t('systemSettings.mailServer.fromName')}
                value={settings.mailServer.fromName}
                onChange={(e) => handleMailServerChange('fromName', e.target.value)}
                disabled={!canManageAll}
                placeholder="MVS"
              />
            </Box>
          </CardContent>
        </Card>

        {/* 백업 설정 — root 전용 */}
        {isRoot && (
        <Card sx={{ ...SETTINGS_CARD_SX, gridColumn: { xs: '1', md: '1 / -1' } }}>
          <CardContent sx={CARD_CONTENT_COMPACT}>
            <Box sx={SECTION_HEADER}>
              <StorageIcon sx={{ mr: 0.75, color: 'primary.main', fontSize: 20 }} />
              <Typography component="h2" sx={SECTION_TITLE}>백업 설정</Typography>
            </Box>
            <Divider sx={SECTION_DIVIDER} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={settings.backup.autoBackup}
                      onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                      disabled={!isRoot}
                    />
                  }
                  label="자동 백업"
                  sx={{ ...SWITCH_LABEL, mb: 1 }}
                />

                <Box sx={FIELD_BLOCK}>
                  <Typography sx={FIELD_LABEL}>
                    백업 주기
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={settings.backup.backupFrequency}
                      onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                      displayEmpty
                      disabled={!isRoot}
                    >
                      <MenuItem value="hourly">매시간</MenuItem>
                      <MenuItem value="daily">매일</MenuItem>
                      <MenuItem value="weekly">매주</MenuItem>
                      <MenuItem value="monthly">매월</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={FIELD_BLOCK}>
                  <Typography sx={FIELD_LABEL}>
                    보관 기간 (일)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={settings.backup.retentionDays}
                    onChange={(e) => handleSettingChange('backup', 'retentionDays', parseInt(e.target.value))}
                    variant="outlined"
                    disabled={!isRoot}
                  />
                </Box>
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={settings.backup.cloudBackup}
                      onChange={(e) => handleSettingChange('backup', 'cloudBackup', e.target.checked)}
                      disabled={!isRoot}
                    />
                  }
                  label="클라우드 백업"
                  sx={{ ...SWITCH_LABEL, mb: 1 }}
                />

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CloudUploadIcon sx={{ fontSize: 18 }} />}
                  onClick={handleBackupNow}
                  disabled={!isRoot}
                  sx={{ mb: 1 }}
                >
                  지금 백업하기
                </Button>

                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>
                  마지막 백업: {settings.backup.lastBackup 
                    ? new Date(settings.backup.lastBackup).toLocaleString('ko-KR')
                    : '없음'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        )}
      </Box>
      )}

      {/* 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'logo' ? '회사 로고 변경' : '백업 실행'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'logo' ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              {previewLogo ? (
                <Box sx={{ mb: 2 }}>
                  <Avatar 
                    src={getUploadUrl(previewLogo) || previewLogo || undefined}
                    sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    미리보기
                  </Typography>
                </Box>
              ) : (
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
              )}
              <Typography variant="body1" gutterBottom>
                로고 파일을 선택하세요
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                이미지 파일만 업로드 가능 (최대 5MB)
              </Typography>
              <Button 
                variant="contained" 
                component="label"
                disabled={uploading}
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
              >
                {uploading ? '업로드 중...' : '파일 선택'}
                <input 
                  type="file" 
                  hidden 
                  accept="image/*" 
                  onChange={handleFileSelect}
                />
              </Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <StorageIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                데이터베이스 백업을 시작하시겠습니까?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                백업 작업은 몇 분 소요될 수 있습니다.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={uploading || backingUp}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={dialogType === 'logo' ? handleLogoConfirm : handleBackupConfirm}
            disabled={uploading || backingUp || (dialogType === 'logo' && !previewLogo)}
            startIcon={(uploading || backingUp) ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {uploading ? '업로드 중...' : backingUp ? '백업 중...' : dialogType === 'logo' ? '업로드' : '백업 시작'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings;
