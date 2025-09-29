import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  CloudUpload as CloudUploadIcon,
  Save as SaveIcon,
  Edit as EditIcon
} from '@mui/icons-material';

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    general: {
      companyName: 'MVS 3.0',
      companyLogo: '',
      timezone: 'Asia/Seoul',
      language: 'ko',
      dateFormat: 'YYYY-MM-DD',
      currency: 'KRW'
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

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    console.log('설정 저장:', settings);
    // 실제 저장 로직 구현
  };

  const handleLogoUpload = () => {
    setDialogType('logo');
    setOpenDialog(true);
  };

  const handleBackupNow = () => {
    setDialogType('backup');
    setOpenDialog(true);
  };

  return (
    <Box sx={{ 
      width: '100%',
      px: 2,
      py: 3
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          시스템 설정
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          설정 저장
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
              <Avatar sx={{ mr: 2, width: 60, height: 60 }}>
                {settings.general.companyName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  회사 로고
                </Typography>
                <Button size="small" onClick={handleLogoUpload}>
                  로고 변경
                </Button>
              </Box>
            </Box>

            <TextField
              fullWidth
              label="회사명"
              value={settings.general.companyName}
              onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>시간대</InputLabel>
              <Select
                value={settings.general.timezone}
                onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
              >
                <MenuItem value="Asia/Seoul">한국 표준시 (KST)</MenuItem>
                <MenuItem value="UTC">협정 세계시 (UTC)</MenuItem>
                <MenuItem value="America/New_York">미국 동부시 (EST)</MenuItem>
                <MenuItem value="Europe/London">영국 표준시 (GMT)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>언어</InputLabel>
              <Select
                value={settings.general.language}
                onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
              >
                <MenuItem value="ko">한국어</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ja">日本語</MenuItem>
                <MenuItem value="zh">中文</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>통화</InputLabel>
              <Select
                value={settings.general.currency}
                onChange={(e) => handleSettingChange('general', 'currency', e.target.value)}
              >
                <MenuItem value="KRW">원 (₩)</MenuItem>
                <MenuItem value="USD">달러 ($)</MenuItem>
                <MenuItem value="EUR">유로 (€)</MenuItem>
                <MenuItem value="JPY">엔 (¥)</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* 외관 설정 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PaletteIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">외관 설정</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>테마</InputLabel>
              <Select
                value={settings.appearance.theme}
                onChange={(e) => handleSettingChange('appearance', 'theme', e.target.value)}
              >
                <MenuItem value="light">라이트 테마</MenuItem>
                <MenuItem value="dark">다크 테마</MenuItem>
                <MenuItem value="auto">시스템 설정</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="주 색상"
              type="color"
              value={settings.appearance.primaryColor}
              onChange={(e) => handleSettingChange('appearance', 'primaryColor', e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>글자 크기</InputLabel>
              <Select
                value={settings.appearance.fontSize}
                onChange={(e) => handleSettingChange('appearance', 'fontSize', e.target.value)}
              >
                <MenuItem value="small">작게</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="large">크게</MenuItem>
              </Select>
            </FormControl>

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

            <TextField
              fullWidth
              label="최소 비밀번호 길이"
              type="number"
              value={settings.security.passwordMinLength}
              onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="세션 타임아웃 (분)"
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.security.requireSpecialChars}
                  onChange={(e) => handleSettingChange('security', 'requireSpecialChars', e.target.checked)}
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
                    />
                  }
                  label="자동 백업"
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>백업 주기</InputLabel>
                  <Select
                    value={settings.backup.backupFrequency}
                    onChange={(e) => handleSettingChange('backup', 'backupFrequency', e.target.value)}
                  >
                    <MenuItem value="hourly">매시간</MenuItem>
                    <MenuItem value="daily">매일</MenuItem>
                    <MenuItem value="weekly">매주</MenuItem>
                    <MenuItem value="monthly">매월</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="보관 기간 (일)"
                  type="number"
                  value={settings.backup.retentionDays}
                  onChange={(e) => handleSettingChange('backup', 'retentionDays', parseInt(e.target.value))}
                  sx={{ mb: 2 }}
                />
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.backup.cloudBackup}
                      onChange={(e) => handleSettingChange('backup', 'cloudBackup', e.target.checked)}
                    />
                  }
                  label="클라우드 백업"
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleBackupNow}
                  sx={{ mb: 2 }}
                >
                  지금 백업하기
                </Button>

                <Typography variant="body2" color="text.secondary">
                  마지막 백업: 2024-01-15 14:30
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
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" gutterBottom>
                로고 파일을 선택하세요
              </Typography>
              <Button variant="contained" component="label">
                파일 선택
                <input type="file" hidden accept="image/*" />
              </Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <StorageIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
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
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            {dialogType === 'logo' ? '업로드' : '백업 시작'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemSettings;
