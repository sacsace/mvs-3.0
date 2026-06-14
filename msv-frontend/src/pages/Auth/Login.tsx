import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useStore, useMenuStore } from '../../store';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { api, API_BASE_URL } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material/styles';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { login } = useStore();
  const setMenuLanguage = useMenuStore((s) => s.setLanguage);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userid: '',
    password: '',
    remember: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [signupStep, setSignupStep] = useState<'form' | 'done'>('form');
  const [signupResult, setSignupResult] = useState<{
    usageStartDate: string;
    usageEndDate: string;
    plan: string;
  } | null>(null);
  const [signupData, setSignupData] = useState({
    companyName: '',
    businessNumber: '',
    gstNumber: '',
    adminName: '',
    adminUserid: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    planType: 'free_3months',
    startDate: new Date().toISOString().slice(0, 10),
    phone: '',
    address: ''
  });

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [errorTimeout]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // 에러 메시지를 즉시 지우지 않고 사용자가 로그인 버튼을 다시 클릭할 때까지 유지
  };

  const cardWidth = 400;
  const controlWidth = 320;

  const getPeriodEndDate = (startDate: string): string => {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return '-';
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);
    end.setDate(end.getDate() - 1);
    return end.toISOString().slice(0, 10);
  };

  const handleSignupChange = (field: string, value: string) => {
    setSignupData((prev) => ({ ...prev, [field]: value }));
  };

  const showError = (message: string) => {
    setError(message);
    // 기존 타이머가 있으면 클리어
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }
    // 10초 후에 에러 메시지 자동 제거
    const timeout = setTimeout(() => {
      setError('');
      setErrorTimeout(null);
    }, 10000);
    setErrorTimeout(timeout);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');
    
    // 기존 타이머가 있으면 클리어
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }

    try {
      const response = await api.post('/auth/login', formData);
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        login(token, user);
        // replace: true를 사용하여 리다이렉트 중복 방지
        navigate('/dashboard', { replace: true });
      } else {
        showError(response.data.message || t('login.loginFailed'));
      }
    } catch (err: any) {
      console.error('로그인 오류:', err);
      console.error('에러 상세:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      // 네트워크 오류인 경우 더 자세한 메시지 표시
      let errorMessage = '';
      
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || err.message?.includes('network')) {
        errorMessage = t('login.networkError', { url: API_BASE_URL });
      } else if (err.response?.status === 404) {
        errorMessage = t('login.apiNotFound', {
          path: `${err.config?.baseURL || API_BASE_URL}${err.config?.url || '/auth/login'}`
        });
      } else if (err.response?.status === 0) {
        errorMessage = t('login.corsError');
      } else {
        errorMessage = err.response?.data?.message || err.message || t('login.loginFailed');
      }
      
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');
    setSignupResult(null);

    if (signupData.adminPassword !== signupData.adminPasswordConfirm) {
      setSignupError(t('login.signup.passwordMismatch'));
      return;
    }

    setSignupLoading(true);
    try {
      await submitSignupRegistration();
    } catch (err: any) {
      setSignupError(err?.response?.data?.message || err?.message || t('login.signup.registerFailed'));
    } finally {
      setSignupLoading(false);
    }
  };

  const submitSignupRegistration = async () => {
    const response = await api.post('/auth/register', {
      companyName: signupData.companyName,
      businessNumber: signupData.businessNumber,
      gstNumber: signupData.gstNumber,
      adminName: signupData.adminName,
      adminUserid: signupData.adminUserid,
      adminEmail: signupData.adminEmail,
      adminPassword: signupData.adminPassword,
      planType: signupData.planType,
      startDate: signupData.startDate,
      phone: signupData.phone,
      address: signupData.address
    }, {
      headers: {
        'x-skip-error-popup': 'true'
      }
    });

    if (response.data?.success) {
      const resultData = response.data?.data || {};
      const usageEnd = resultData.usageEndDate || getPeriodEndDate(signupData.startDate);
      setSignupResult({
        usageStartDate: resultData.usageStartDate || signupData.startDate,
        usageEndDate: usageEnd,
        plan: String(resultData.plan || signupData.planType)
      });
      setSignupSuccess(
        t('login.signup.signupSuccessAlert', {
          start: signupData.startDate,
          end: usageEnd
        })
      );
      setSignupStep('done');
      setFormData((prev) => ({
        ...prev,
        userid: signupData.adminUserid,
        password: signupData.adminPassword
      }));
    } else {
      setSignupError(response.data?.message || t('login.signup.registerFailed'));
    }
  };

  const closeSignupDialog = () => {
    if (signupLoading) return;
    setSignupOpen(false);
    setSignupStep('form');
    setSignupError('');
    setSignupSuccess('');
    setSignupResult(null);
  };

  const loginInputSx = {
    '& .MuiOutlinedInput-root': {
      minHeight: 40,
      borderRadius: '8px',
      bgcolor: '#FFFFFF',
      '& fieldset': {
        borderColor: '#C5CED9',
      },
      '&:hover fieldset': {
        borderColor: '#B8C4D0',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'primary.main',
        borderWidth: '1px',
      },
    },
    '& .MuiInputBase-input': {
      py: 1,
      px: 1.25,
      fontSize: '0.875rem',
    },
  } as const;

  const loginFieldLabelSx = {
    display: 'block',
    mb: 0.5,
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 600,
  } as const;

  const signupFieldSx = {
    '& .MuiOutlinedInput-root': {
      minHeight: 44,
      borderRadius: '12px',
      bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.06),
      transition: theme.transitions.create(['background-color', 'box-shadow'], { duration: 150 }),
      '& fieldset': {
        borderColor: alpha(theme.palette.divider, 0.9),
      },
      '&:hover': {
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.16 : 0.09),
      },
      '&.Mui-focused': {
        bgcolor: 'background.paper',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
        '& fieldset': {
          borderColor: alpha(theme.palette.divider, 0.95),
        },
      },
    },
    '& .MuiInputBase-input': {
      fontSize: '0.875rem',
      py: 1.05,
      letterSpacing: '-0.015em',
    },
    '& .MuiOutlinedInput-input::placeholder': {
      color: alpha(theme.palette.text.secondary, 0.72),
      opacity: 1,
    },
  } as const;

  const signupLabelSx = {
    display: 'block',
    mb: 0.65,
    color: 'text.secondary',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
  } as const;

  const signupSectionTitleSx = {
    fontSize: '0.875rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'text.primary',
    lineHeight: 1.35,
  } as const;

  const handleLoginLanguage = (_event: React.MouseEvent<HTMLElement>, newLang: 'ko' | 'en' | null) => {
    if (newLang === null) return;
    void i18n.changeLanguage(newLang);
    setMenuLanguage(newLang);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.mode === 'light' ? '#F0F4F8' : theme.palette.grey[900],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: { xs: 2, sm: 3 },
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 14, sm: 22 },
          right: { xs: 14, sm: 22 },
          zIndex: 2,
        }}
      >
        <ToggleButtonGroup
          exclusive
          value={i18n.language?.startsWith('en') ? 'en' : 'ko'}
          onChange={handleLoginLanguage}
          aria-label={t('login.languageToggleAria')}
          sx={{
            bgcolor: 'background.paper',
            p: 0.25,
            borderRadius: '8px',
            border: '1px solid #C5CED9',
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              mx: 0.15,
              borderRadius: '6px !important',
              px: 1.5,
              py: 0.45,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'none',
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                },
              },
            },
          }}
        >
          <ToggleButton value="en" disableRipple>
            {t('login.langEn')}
          </ToggleButton>
          <ToggleButton value="ko" disableRipple>
            {t('login.langKo')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            px: { xs: 3, sm: 3.5 },
            py: { xs: 3, sm: 3.5 },
            borderRadius: '10px',
            bgcolor: 'background.paper',
            border: theme.palette.mode === 'light' ? '1px solid #C5CED9' : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            boxShadow: 'none',
            width: `min(100%, ${cardWidth}px)`,
            mx: 'auto',
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              mb: 2,
              width: `min(100%, ${controlWidth}px)`,
              mx: 'auto',
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'text.primary',
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
              }}
            >
              {t('login.cardTitle')}
            </Typography>
          </Box>

          <Box sx={{ width: `min(100%, ${controlWidth}px)`, mx: 'auto' }}>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ mb: 1.5 }}>
                <Typography component="label" htmlFor="userid" sx={loginFieldLabelSx}>
                  {t('login.emailLabel')}
                </Typography>
                <TextField
                  fullWidth
                  required
                  id="userid"
                  name="userid"
                  autoComplete="username"
                  autoFocus
                  value={formData.userid}
                  onChange={handleChange}
                  inputProps={{ 'aria-label': t('login.userID') }}
                  sx={loginInputSx}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography component="label" htmlFor="password" sx={loginFieldLabelSx}>
                  {t('login.password')}
                </Typography>
                <TextField
                  fullWidth
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  inputProps={{ 'aria-label': t('login.password') }}
                  InputProps={{
                    endAdornment: (
                      <Box sx={{ pr: 0.25 }}>
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={
                            showPassword ? t('login.hidePassword') : t('login.showPassword')
                          }
                          size="small"
                          sx={{ color: 'text.secondary' }}
                        >
                          {showPassword ? <VisibilityOff sx={{ fontSize: '1rem' }} /> : <Visibility sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Box>
                    )
                  }}
                  sx={loginInputSx}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disableElevation
                disabled={loading}
                sx={{
                  py: 1,
                  minHeight: 40,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textTransform: 'none',
                }}
              >
                {loading ? t('common.loading') : t('login.loginButton')}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => {
                  setSignupOpen(true);
                  setSignupStep('form');
                  setSignupError('');
                  setSignupSuccess('');
                  setSignupResult(null);
                }}
                sx={{
                  mt: 1,
                  py: 0.75,
                  minHeight: 36,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'primary.main',
                  textTransform: 'none',
                }}
              >
                {t('login.signUpCta')}
              </Button>
            </Box>
          </Box>

        </Paper>
      </Container>
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: 38,
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          flexWrap: 'wrap',
          maxWidth: 'min(96vw, 640px)',
          px: 1,
        }}
      >
        {[
          { to: '/legal/terms', label: t('login.footerTerms') },
          { to: '/legal/privacy', label: t('login.footerPrivacy') },
          { to: '/legal/support', label: t('login.footerSupport') },
        ].map((link, index) => (
          <React.Fragment key={link.to}>
            {index > 0 && (
              <Typography
                variant="caption"
                sx={{ color: alpha(theme.palette.text.secondary, 0.45), fontSize: '0.6875rem' }}
              >
                ·
              </Typography>
            )}
            <Typography
              component={RouterLink}
              to={link.to}
              variant="caption"
              sx={{
                color: alpha(theme.palette.text.secondary, 0.82),
                fontSize: '0.6875rem',
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              {link.label}
            </Typography>
          </React.Fragment>
        ))}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: 14,
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          flexWrap: 'nowrap',
          maxWidth: 'min(96vw, 560px)',
          px: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.text.secondary, 0.7),
            fontSize: '0.6875rem',
            whiteSpace: 'nowrap',
          }}
        >
          {t('login.footerDevelopedBy')}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: alpha(theme.palette.text.secondary, 0.45), fontSize: '0.6875rem' }}
        >
          ·
        </Typography>
        <Typography
          component="a"
          href="https://www.msventures.in"
          target="_blank"
          rel="noopener noreferrer"
          variant="caption"
          sx={{
            color: alpha(theme.palette.text.secondary, 0.85),
            fontSize: '0.6875rem',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            '&:hover': {
              color: 'primary.main',
              textDecoration: 'underline',
            },
          }}
        >
          {t('login.footerCompanyName')}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: alpha(theme.palette.text.secondary, 0.45), fontSize: '0.6875rem' }}
        >
          ·
        </Typography>
        <Typography
          component="a"
          href="https://www.msventures.in"
          target="_blank"
          rel="noopener noreferrer"
          variant="caption"
          sx={{
            color: alpha(theme.palette.text.secondary, 0.75),
            fontSize: '0.6875rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            '&:hover': {
              color: 'primary.main',
              textDecoration: 'underline',
            },
          }}
        >
          {t('login.footerWebsite')}
        </Typography>
      </Box>

      <Dialog
        open={signupOpen}
        onClose={closeSignupDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            width: 'min(96vw, 1176px)',
            maxHeight: '92vh',
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.12 : 0.35)}`,
            boxShadow:
              theme.palette.mode === 'light'
                ? '0 24px 60px rgba(15, 23, 42, 0.1)'
                : '0 24px 60px rgba(0,0,0,0.5)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pt: 2.5,
            px: 3,
            pb: 1.25,
            fontSize: '1.125rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          {signupStep === 'form' && t('login.signup.titleForm')}
          {signupStep === 'done' && t('login.signup.titleDone')}
        </DialogTitle>
        <Box component="form" onSubmit={handleSignupSubmit}>
          <DialogContent
            dividers
            sx={{
              display: signupStep === 'form' ? 'grid' : 'block',
              gridTemplateColumns: signupStep === 'form' ? { xs: '1fr', md: '1.45fr 1fr' } : undefined,
              gap: signupStep === 'form' ? { xs: 2, md: 2.5 } : 0,
              px: { xs: 2.5, sm: 3 },
              py: { xs: 2, sm: 2.5 },
              overflowY: 'auto',
              borderColor: alpha(theme.palette.divider, 0.85),
            }}
          >
            {signupError && (
              <Alert
                severity="error"
                variant="outlined"
                sx={{ gridColumn: '1 / -1', borderRadius: '12px', fontSize: '0.8125rem' }}
              >
                {signupError}
              </Alert>
            )}
            {signupSuccess && (
              <Alert
                severity="success"
                variant="outlined"
                sx={{ gridColumn: '1 / -1', borderRadius: '12px', fontSize: '0.8125rem' }}
              >
                {signupSuccess}
              </Alert>
            )}

            {signupStep === 'form' && (
              <>
                <Box sx={{ display: 'grid', gap: 1.75 }}>
                  <Typography variant="subtitle2" sx={signupSectionTitleSx}>
                    {t('login.signup.sectionInitial')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelCompanyName')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phCompanyName')}
                        size="small"
                        fullWidth
                        value={signupData.companyName}
                        onChange={(e) => handleSignupChange('companyName', e.target.value)}
                        required
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelBusinessNumber')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phBusinessNumber')}
                        size="small"
                        fullWidth
                        value={signupData.businessNumber}
                        onChange={(e) => handleSignupChange('businessNumber', e.target.value)}
                        required
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelGst')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phGst')}
                        size="small"
                        fullWidth
                        value={signupData.gstNumber}
                        onChange={(e) => handleSignupChange('gstNumber', e.target.value.toUpperCase())}
                        inputProps={{ maxLength: 15 }}
                        required
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelPhone')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phPhone')}
                        size="small"
                        fullWidth
                        value={signupData.phone}
                        onChange={(e) => handleSignupChange('phone', e.target.value)}
                      />
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelAddress')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phAddress')}
                        size="small"
                        fullWidth
                        value={signupData.address}
                        onChange={(e) => handleSignupChange('address', e.target.value)}
                      />
                    </Box>
                  </Box>

                  <Typography variant="subtitle2" sx={{ ...signupSectionTitleSx, mt: 0.5 }}>
                    {t('login.signup.sectionAdmin')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelAdminName')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phAdminName')}
                        size="small"
                        fullWidth
                        value={signupData.adminName}
                        onChange={(e) => handleSignupChange('adminName', e.target.value)}
                        required
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelAdminId')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phAdminId')}
                        size="small"
                        fullWidth
                        value={signupData.adminUserid}
                        onChange={(e) => handleSignupChange('adminUserid', e.target.value)}
                        required
                      />
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelAdminEmail')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phAdminEmail')}
                        size="small"
                        fullWidth
                        type="email"
                        value={signupData.adminEmail}
                        onChange={(e) => handleSignupChange('adminEmail', e.target.value)}
                        required
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelPassword')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phPassword')}
                        size="small"
                        fullWidth
                        type="password"
                        value={signupData.adminPassword}
                        onChange={(e) => handleSignupChange('adminPassword', e.target.value)}
                        required
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={signupLabelSx}>
                        {t('login.signup.labelPasswordConfirm')}
                      </Typography>
                      <TextField
                        hiddenLabel
                        sx={signupFieldSx}
                        placeholder={t('login.signup.phPasswordConfirm')}
                        size="small"
                        fullWidth
                        type="password"
                        value={signupData.adminPasswordConfirm}
                        onChange={(e) => handleSignupChange('adminPasswordConfirm', e.target.value)}
                        required
                      />
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gap: 1.25, alignContent: 'start' }}>
                  <Typography variant="subtitle2" sx={signupSectionTitleSx}>
                    {t('login.signup.sectionPlan')}
                  </Typography>
                  <Alert
                    severity="success"
                    variant="outlined"
                    sx={{
                      borderRadius: '12px',
                      py: 1.25,
                      '& .MuiAlert-message': { fontSize: '0.875rem', lineHeight: 1.55, letterSpacing: '-0.01em' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {t('login.signup.planFreeTrial')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
                      {t('login.signup.oncePerCompany')}
                    </Typography>
                  </Alert>
                  <Box>
                    <Typography variant="caption" sx={signupLabelSx}>
                      {t('login.signup.labelStartDate')}
                    </Typography>
                    <TextField
                      hiddenLabel
                      sx={signupFieldSx}
                      type="date"
                      size="small"
                      fullWidth
                      value={signupData.startDate}
                      onChange={(e) => handleSignupChange('startDate', e.target.value)}
                    />
                  </Box>
                  <Alert
                    severity="info"
                    variant="outlined"
                    sx={{
                      borderRadius: '12px',
                      py: 1,
                      bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'light' ? 0.06 : 0.12),
                      borderColor: alpha(theme.palette.info.main, 0.28),
                      '& .MuiAlert-message': { fontSize: '0.8125rem', lineHeight: 1.55, letterSpacing: '-0.01em' },
                    }}
                  >
                    {t('login.signup.infoUsageLine', {
                      start: signupData.startDate,
                      end: getPeriodEndDate(signupData.startDate)
                    })}
                    <br />
                    {t('login.signup.infoFreeTrialPolicy')}
                    <br />
                    {t('login.signup.infoMaxUsers')}
                    <br />
                    {t('login.signup.infoAdminGrant')}
                  </Alert>
                </Box>
              </>
            )}

            {signupStep === 'done' && (
              <Box sx={{ maxWidth: 768, mx: 'auto' }}>
                <Alert severity="success" variant="outlined" sx={{ mb: 2, borderRadius: '12px', fontSize: '0.875rem' }}>
                  {t('login.signup.doneSuccess')}
                </Alert>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    borderColor: alpha(theme.palette.divider, 0.9),
                    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.04 : 0.02),
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25, letterSpacing: '-0.02em' }}>
                    {t('login.signup.planFreeTrial')}
                  </Typography>
                  <Typography variant="body2">
                    {t('login.signup.lineCompany', { name: signupData.companyName || '-' })}
                  </Typography>
                  <Typography variant="body2">
                    {t('login.signup.lineUsage', {
                      start: signupResult?.usageStartDate || signupData.startDate,
                      end: signupResult?.usageEndDate || getPeriodEndDate(signupData.startDate)
                    })}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    {t('login.signup.infoMaxUsers')}
                  </Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              py: 2.25,
              gap: 1,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
            }}
          >
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={closeSignupDialog}
              disabled={signupLoading}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', px: 2 }}
            >
              {t('common.cancel')}
            </Button>
            {signupStep === 'form' && (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disableElevation
                disabled={signupLoading}
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
              >
                {signupLoading ? t('login.signup.processing') : t('login.signup.registerButton')}
              </Button>
            )}
            {signupStep === 'done' && (
              <Button
                variant="contained"
                color="primary"
                disableElevation
                disabled={signupLoading}
                onClick={() => {
                  closeSignupDialog();
                }}
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
              >
                {t('login.signup.finishSignup')}
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Login;