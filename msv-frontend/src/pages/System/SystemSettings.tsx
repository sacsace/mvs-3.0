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
  Snackbar
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  CloudUpload as CloudUploadIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { systemSettingsService } from '../../services/api';
import { useStore, useMenuStore } from '../../store';

const SystemSettings: React.FC = () => {
  const { user } = useStore();
  const { language, setLanguage } = useMenuStore();
  const canManageAll = user?.role === 'root' || user?.role === 'admin';
  const [settings, setSettings] = useState({
    general: {
      companyName: 'MVS',
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

  // 설정 로드
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await systemSettingsService.getSettings();
      if (response.success && response.data) {
        const normalizedSettings = {
          ...response.data,
          general: {
            ...response.data.general,
            // 인도 서비스 기본 통화 고정
            currency: 'INR'
          }
        };
        setSettings(normalizedSettings);
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
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sidebarAutoCollapse', settings.appearance.sidebarCollapsed ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('mvs-sidebar-auto-collapse'));
  }, [settings.appearance.sidebarCollapsed]);

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
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
      const payload = canManageAll ? settings : { appearance: settings.appearance };
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
    setDialogType('backup');
    setOpenDialog(true);
  };

  const handleBackupConfirm = async () => {
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
        p: 3, 
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

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SettingsIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
            <Typography component="h1" sx={{
              fontSize: '16px !important',
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.5
            }}>
              시스템 설정
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            시스템 전반의 설정을 관리하는 페이지입니다.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 2 }}
        >
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {/* 일반 설정 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">일반 설정</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                sx={{ mr: 2, width: 60, height: 60 }}
                src={previewLogo || settings.general.companyLogo}
              >
                {settings.general.companyName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  회사 로고
                </Typography>
                <Button size="small" onClick={handleLogoUpload} disabled={!canManageAll}>
                  로고 변경
                </Button>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                회사명
              </Typography>
              <TextField
                fullWidth
                value={settings.general.companyName}
                onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
                variant="outlined"
                disabled={!canManageAll}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                사무실 위치 (출근 제한 기준)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                    위도
                  </Typography>
                  <TextField
                    type="number"
                    inputProps={{ step: '0.000001' }}
                    value={settings.general.officeLocation.latitude}
                    onChange={(e) => handleOfficeLocationChange('latitude', e.target.value)}
                    fullWidth
                    disabled={!canManageAll}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                    경도
                  </Typography>
                  <TextField
                    type="number"
                    inputProps={{ step: '0.000001' }}
                    value={settings.general.officeLocation.longitude}
                    onChange={(e) => handleOfficeLocationChange('longitude', e.target.value)}
                    fullWidth
                    disabled={!canManageAll}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="caption" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                    허용 반경 (미터)
                  </Typography>
                  <TextField
                    type="number"
                    inputProps={{ min: 10, step: '10' }}
                    value={settings.general.officeLocation.radiusMeters}
                    onChange={(e) => handleOfficeLocationChange('radiusMeters', e.target.value)}
                    fullWidth
                    disabled={!canManageAll}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ height: '18px', mb: 0.5 }} />
                  <Button
                    variant="outlined"
                    onClick={handleUseCurrentLocation}
                    disabled={locatingOffice || !canManageAll}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    {locatingOffice ? '위치 확인 중...' : '현재 위치 가져오기'}
                  </Button>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem' }}>
                등록된 위치에서만 출근할 수 있습니다.
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                시간대
              </Typography>
              <TextField
                value="인도 표준시 (IST)"
                fullWidth
                disabled
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: 'action.disabledBackground'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem' }}>
                시간대는 항상 인도 표준시(IST)로 고정됩니다.
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                언어
              </Typography>
              <FormControl fullWidth>
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
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                통화
              </Typography>
              <FormControl fullWidth>
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

        {/* 외관 설정 */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>화면 설정</Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                테마
              </Typography>
              <FormControl fullWidth>
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
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
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

            <FormControlLabel
              control={
                <Switch
                  checked={settings.appearance.sidebarCollapsed}
                  onChange={(e) => handleSettingChange('appearance', 'sidebarCollapsed', e.target.checked)}
                />
              }
              label="사이드바 자동 접기"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.appearance.showNotifications}
                  onChange={(e) => handleSettingChange('appearance', 'showNotifications', e.target.checked)}
                />
              }
              label="알림 표시"
            />
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">알림 설정</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.emailNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="이메일 알림"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.pushNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="푸시 알림"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.smsNotifications}
                  onChange={(e) => handleSettingChange('notifications', 'smsNotifications', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="SMS 알림"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.taskReminders}
                  onChange={(e) => handleSettingChange('notifications', 'taskReminders', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="업무 알림"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.systemAlerts}
                  onChange={(e) => handleSettingChange('notifications', 'systemAlerts', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="시스템 알림"
            />
          </CardContent>
        </Card>

        {/* 보안 설정 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">보안 설정</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                최소 비밀번호 길이
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={settings.security.passwordMinLength}
                onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                variant="outlined"
                disabled={!canManageAll}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                세션 타임아웃 (분)
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                variant="outlined"
                disabled={!canManageAll}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.security.requireSpecialChars}
                  onChange={(e) => handleSettingChange('security', 'requireSpecialChars', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="특수문자 필수"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.security.twoFactorAuth}
                  onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="2단계 인증"
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.security.ipWhitelist}
                  onChange={(e) => handleSettingChange('security', 'ipWhitelist', e.target.checked)}
                  disabled={!canManageAll}
                />
              }
              label="IP 화이트리스트"
            />
          </CardContent>
        </Card>

        {/* 백업 설정 */}
        <Card sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">백업 설정</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.backup.autoBackup}
                      onChange={(e) => handleSettingChange('backup', 'autoBackup', e.target.checked)}
                      disabled={!canManageAll}
                    />
                  }
                  label="자동 백업"
                  sx={{ mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                    백업 주기
                  </Typography>
                  <FormControl fullWidth>
                    <Select
                      value={settings.backup.backupFrequency}
                      onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                      displayEmpty
                      disabled={!canManageAll}
                    >
                      <MenuItem value="hourly">매시간</MenuItem>
                      <MenuItem value="daily">매일</MenuItem>
                      <MenuItem value="weekly">매주</MenuItem>
                      <MenuItem value="monthly">매월</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                    보관 기간 (일)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={settings.backup.retentionDays}
                    onChange={(e) => handleSettingChange('backup', 'retentionDays', parseInt(e.target.value))}
                    variant="outlined"
                    disabled={!canManageAll}
                  />
                </Box>
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.backup.cloudBackup}
                      onChange={(e) => handleSettingChange('backup', 'cloudBackup', e.target.checked)}
                      disabled={!canManageAll}
                    />
                  }
                  label="클라우드 백업"
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleBackupNow}
                  disabled={!canManageAll}
                  sx={{ mb: 2 }}
                >
                  지금 백업하기
                </Button>

                <Typography variant="body2" color="text.secondary">
                  마지막 백업: {settings.backup.lastBackup 
                    ? new Date(settings.backup.lastBackup).toLocaleString('ko-KR')
                    : '없음'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

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
                    src={previewLogo} 
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
