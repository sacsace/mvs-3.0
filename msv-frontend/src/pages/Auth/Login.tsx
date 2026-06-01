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
  Checkbox,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import { useStore, useMenuStore } from '../../store';
import { useNavigate } from 'react-router-dom';
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
  const [signupStep, setSignupStep] = useState<'form' | 'payment' | 'done'>('form');
  const [invoiceDownloaded, setInvoiceDownloaded] = useState(false);
  const [paymentBlockedReason, setPaymentBlockedReason] = useState('');
  const [signupResult, setSignupResult] = useState<{
    taxInvoiceNumber: string | null;
    usageStartDate: string;
    usageEndDate: string;
    billingAmount: number;
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
    planType: 'month_5000',
    startDate: new Date().toISOString().slice(0, 10),
    phone: '',
    address: ''
  });
  const cardWidth = 420;
  const controlWidth = 340;
  const yearlyDiscountRate = (((5000 * 12 - 50000) / (5000 * 12)) * 100).toFixed(1);
  const getPlanAmount = (planType: string): number => {
    if (planType === 'year_50000') return 50000;
    if (planType === 'month_5000') return 5000;
    return 0;
  };

  const getPlanLabel = (planType: string): string => {
    if (planType === 'year_50000') return t('login.signup.planYearly');
    if (planType === 'month_5000') return t('login.signup.planMonthly');
    return t('login.signup.planFreeTrial');
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[data-razorpay-checkout="true"]');
      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.setAttribute('data-razorpay-checkout', 'true');
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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

  const getPeriodEndDate = (startDate: string, planType: string): string => {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return '-';
    const days =
      planType === 'year_50000' ? 365 : planType === 'free_week_7' || planType === 'free_day_1' ? 7 : 30;
    start.setDate(start.getDate() + days - 1);
    return start.toISOString().slice(0, 10);
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
    setInvoiceDownloaded(false);
    setPaymentBlockedReason('');

    if (signupData.adminPassword !== signupData.adminPasswordConfirm) {
      setSignupError(t('login.signup.passwordMismatch'));
      return;
    }

    setSignupStep('payment');
    if (signupData.planType !== 'free_week_7') {
      // 유료 플랜은 "결제창으로" 클릭 즉시 Razorpay 결제창을 오픈
      setTimeout(() => {
        void handleSignupPaymentComplete();
      }, 0);
    }
  };

  const submitSignupRegistration = async (paymentMeta?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => {
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
      address: signupData.address,
      razorpayOrderId: paymentMeta?.razorpayOrderId,
      razorpayPaymentId: paymentMeta?.razorpayPaymentId,
      razorpaySignature: paymentMeta?.razorpaySignature
    }, {
      headers: {
        'x-skip-error-popup': 'true'
      }
    });

    if (response.data?.success) {
      const resultData = response.data?.data || {};
      setSignupResult({
        taxInvoiceNumber: resultData.taxInvoiceNumber || null,
        usageStartDate: resultData.usageStartDate || signupData.startDate,
        usageEndDate: resultData.usageEndDate || getPeriodEndDate(signupData.startDate, signupData.planType),
        billingAmount: Number(resultData.billingAmount || 0),
        plan: String(resultData.plan || signupData.planType)
      });
      setSignupSuccess(
        t('login.signup.paymentSuccessAlert', {
          start: signupData.startDate,
          end: getPeriodEndDate(signupData.startDate, signupData.planType)
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

  const handleSignupPaymentComplete = async () => {
    if (signupData.planType !== 'free_week_7' && paymentBlockedReason) {
      return;
    }
    setSignupError('');
    setSignupSuccess('');
    setSignupLoading(true);
    try {
      if (signupData.planType === 'free_week_7') {
        await submitSignupRegistration();
        return;
      }

      const orderResponse = await api.post('/auth/signup/payment-order', {
        companyName: signupData.companyName,
        businessNumber: signupData.businessNumber,
        adminEmail: signupData.adminEmail,
        planType: signupData.planType
      }, {
        headers: {
          'x-skip-error-popup': 'true'
        }
      });

      const orderData = orderResponse.data?.data;
      if (!orderResponse.data?.success || !orderData?.orderId || !orderData?.keyId) {
        const message = orderResponse.data?.message || t('login.signup.paymentOrderFailed');
        setSignupError(message);
        if (message.includes('환경 변수를 확인')) {
          setPaymentBlockedReason(message);
        }
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setSignupError(t('login.signup.razorpayScriptError'));
        return;
      }

      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) {
        setSignupError(t('login.signup.razorpayInitError'));
        return;
      }

      const paymentResult = await new Promise<{
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }>((resolve, reject) => {
        const rzp = new RazorpayCtor({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Minsub Ventures Private Limited',
          description: t('login.signup.razorpayDescription', { plan: getPlanLabel(signupData.planType) }),
          order_id: orderData.orderId,
          prefill: {
            name: signupData.adminName,
            email: signupData.adminEmail,
            contact: signupData.phone
          },
          notes: {
            companyName: signupData.companyName,
            businessNumber: signupData.businessNumber
          },
          theme: {
            color: '#3b82f6'
          },
          modal: {
            ondismiss: () => reject(new Error(t('login.signup.paymentCanceled')))
          },
          handler: (response: any) => resolve(response)
        });
        rzp.on('payment.failed', (failure: any) => {
          const reason = failure?.error?.description || t('login.signup.paymentFailedGeneric');
          reject(new Error(reason));
        });
        rzp.open();
      });

      await submitSignupRegistration({
        razorpayOrderId: paymentResult.razorpay_order_id,
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpaySignature: paymentResult.razorpay_signature
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('login.signup.paymentRegisterGeneric');
      setSignupError(message);
      if (String(message).includes('환경 변수를 확인')) {
        setPaymentBlockedReason(String(message));
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const handleDownloadTaxInvoice = () => {
    const usageStart = signupResult?.usageStartDate || signupData.startDate;
    const usageEnd = signupResult?.usageEndDate || getPeriodEndDate(signupData.startDate, signupData.planType);
    const amount = signupResult?.billingAmount ?? getPlanAmount(signupData.planType);
    const invoiceNumber = signupResult?.taxInvoiceNumber || `FREE-${signupData.businessNumber || 'TRIAL'}`;
    const planLabel = getPlanLabel(signupResult?.plan || signupData.planType);
    const issuedDate = new Date().toISOString().slice(0, 10);
    const subtotal = amount;
    const taxRate = 18;
    const taxAmount = Number((subtotal * taxRate / 100).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    const paymentStatus = amount > 0 ? 'Paid via Razorpay' : 'Free Trial Confirmed';

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFillColor(245, 249, 255);
    pdf.rect(0, 0, pageWidth, 34, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('TAX INVOICE', 14, 15);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Minsub Ventures Private Limited', 14, 21);
    pdf.text(`Issue Date: ${issuedDate}`, 14, 27);
    pdf.text(`Invoice No: ${invoiceNumber}`, pageWidth - 14, 27, { align: 'right' });

    pdf.setDrawColor(220, 227, 238);
    pdf.rect(14, 39, pageWidth - 28, 34);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Bill To', 18, 46);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Company: ${signupData.companyName}`, 18, 52);
    pdf.text(`Business No: ${signupData.businessNumber}`, 18, 58);
    pdf.text(`GST No: ${signupData.gstNumber}`, 18, 64);

    pdf.setDrawColor(220, 227, 238);
    pdf.rect(14, 79, pageWidth - 28, 78);
    pdf.setFillColor(247, 250, 252);
    pdf.rect(14, 79, pageWidth - 28, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Description', 18, 86);
    pdf.text('Amount (INR)', pageWidth - 18, 86, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.text(`MVS Subscription - ${planLabel}`, 18, 97);
    pdf.text(`Rs.${subtotal.toLocaleString()}`, pageWidth - 18, 97, { align: 'right' });

    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(9);
    pdf.text(`Usage Period: ${usageStart} ~ ${usageEnd}`, 18, 104);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);

    pdf.line(18, 112, pageWidth - 18, 112);
    pdf.text('Subtotal', pageWidth - 58, 122);
    pdf.text(`Rs.${subtotal.toLocaleString()}`, pageWidth - 18, 122, { align: 'right' });
    pdf.text(`GST (${taxRate}%)`, pageWidth - 58, 129);
    pdf.text(`Rs.${taxAmount.toLocaleString()}`, pageWidth - 18, 129, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Total', pageWidth - 58, 139);
    pdf.text(`Rs.${total.toLocaleString()}`, pageWidth - 18, 139, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Payment Status: ${paymentStatus}`, 18, 168);
    pdf.text('Generated during signup onboarding workflow.', 18, 174);
    pdf.text('This is a system-generated invoice.', 18, 180);

    pdf.setDrawColor(220, 227, 238);
    pdf.line(14, 274, pageWidth - 14, 274);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Minsub Ventures Private Limited', 14, 280);
    pdf.text('support@msventures.in', pageWidth - 14, 280, { align: 'right' });

    pdf.save(`tax-invoice-${invoiceNumber}.pdf`);
    setInvoiceDownloaded(true);
  };

  const closeSignupDialog = () => {
    if (signupLoading) return;
    setSignupOpen(false);
    setSignupStep('form');
    setSignupError('');
    setSignupSuccess('');
    setInvoiceDownloaded(false);
    setSignupResult(null);
    setPaymentBlockedReason('');
  };

  const loginInputSx = {
    '& .MuiOutlinedInput-root': {
      minHeight: 48,
      borderRadius: '12px',
      bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.07),
      transition: theme.transitions.create(['background-color', 'box-shadow'], { duration: 180 }),
      '& fieldset': {
        borderColor: alpha(theme.palette.divider, 0.9),
        borderWidth: 1,
      },
      '&:hover': {
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.16 : 0.1),
        '& fieldset': {
          borderColor: alpha(theme.palette.divider, 1),
        },
      },
      '&.Mui-focused': {
        bgcolor: 'background.paper',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.22)}`,
        '& fieldset': {
          borderColor: alpha(theme.palette.divider, 0.95),
          borderWidth: 1,
        },
      },
    },
    '& .MuiInputBase-input': {
      py: 1.35,
      px: 1.5,
      fontSize: '0.9375rem',
      letterSpacing: '-0.02em',
      '&::placeholder': {
        color: alpha(theme.palette.text.secondary, 0.85),
        opacity: 1,
      },
    },
  } as const;

  const loginFieldLabelSx = {
    display: 'block',
    mb: 0.75,
    color: 'text.secondary',
    fontSize: '0.8125rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
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
        background:
          theme.palette.mode === 'light'
            ? 'radial-gradient(100% 70% at 50% -10%, rgba(99, 102, 241, 0.08) 0%, transparent 55%), linear-gradient(180deg, #f1f5f9 0%, #f8fafc 40%, #f1f5f9 100%)'
            : `linear-gradient(180deg, ${theme.palette.grey[900]} 0%, ${alpha(theme.palette.common.black, 0.92)} 100%)`,
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
            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'light' ? 0.1 : 0.2),
            p: 0.4,
            borderRadius: '999px',
            border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              mx: 0.2,
              borderRadius: '999px !important',
              px: 1.85,
              py: 0.55,
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textTransform: 'none',
              color: 'text.secondary',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              },
              '&.Mui-selected': {
                bgcolor: 'background.paper',
                color: 'primary.main',
                boxShadow: `0 1px 4px ${alpha(theme.palette.common.black, 0.1)}`,
                '&:hover': {
                  bgcolor: 'background.paper',
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
            py: { xs: 3.25, sm: 3.5 },
            borderRadius: '20px',
            bgcolor: 'background.paper',
            border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.12 : 0.35)}`,
            boxShadow:
              theme.palette.mode === 'light'
                ? '0 20px 50px rgba(15, 23, 42, 0.07)'
                : '0 20px 50px rgba(0,0,0,0.45)',
            width: `min(100%, ${cardWidth}px)`,
            mx: 'auto',
          }}
        >
          <Box sx={{ textAlign: 'left', mb: 2.5, width: `min(100%, ${controlWidth}px)`, mx: 'auto' }}>
            <Typography
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.5rem', sm: '1.625rem' },
                color: 'text.primary',
                letterSpacing: '-0.025em',
                lineHeight: 1.25,
                mb: 0,
              }}
            >
              {t('login.cardTitle')}
            </Typography>
          </Box>

          <Box sx={{ width: `min(100%, ${controlWidth}px)`, mx: 'auto' }}>
            {error && (
              <Alert
                severity="error"
                variant="outlined"
                sx={{
                  mb: 2,
                  borderRadius: '12px',
                  fontSize: '0.8125rem',
                  lineHeight: 1.45,
                  bgcolor: alpha(theme.palette.error.main, theme.palette.mode === 'light' ? 0.06 : 0.12),
                  color: theme.palette.mode === 'light' ? 'error.dark' : theme.palette.error.light,
                  borderColor: alpha(theme.palette.error.main, 0.35),
                  '& .MuiAlert-icon': {
                    color: 'error.main',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ mb: 2 }}>
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

              <Box sx={{ mb: 2.25 }}>
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
                          sx={{
                            color: 'text.secondary',
                            borderRadius: '10px',
                            '&:hover': {
                              color: 'text.primary',
                              bgcolor: alpha(theme.palette.action.hover, 1),
                            },
                          }}
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
                  py: 1.35,
                  mt: 0.5,
                  minHeight: 48,
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  borderRadius: '12px',
                  textTransform: 'none',
                  letterSpacing: '-0.01em',
                  '&:disabled': {
                    bgcolor: alpha(theme.palette.action.disabledBackground, 1),
                    color: 'text.disabled',
                  },
                }}
              >
                {loading ? t('common.loading') : t('login.loginButton')}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSignupOpen(true);
                  setSignupStep('form');
                  setSignupError('');
                  setSignupSuccess('');
                  setInvoiceDownloaded(false);
                  setSignupResult(null);
                }}
                sx={{
                  mt: 1.25,
                  py: 0.5,
                  minHeight: 'auto',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  border: 'none',
                  color: 'primary.main',
                  bgcolor: 'transparent',
                  textTransform: 'none',
                  letterSpacing: '-0.01em',
                  borderRadius: '10px',
                  '&:hover': {
                    border: 'none',
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    color: 'primary.dark',
                    textDecoration: 'none',
                  },
                }}
              >
                {t('login.signUpCta')}
              </Button>
            </Box>
          </Box>

        </Paper>
      </Container>
      <Typography
        component="a"
        href="https://www.msvetnures.in"
        target="_blank"
        rel="noopener noreferrer"
        variant="caption"
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: 14,
          transform: 'translateX(-50%)',
          color: alpha(theme.palette.text.secondary, 0.85),
          letterSpacing: '0.06em',
          textTransform: 'lowercase',
          fontSize: '0.6875rem',
          textDecoration: 'none',
          cursor: 'pointer',
          '&:hover': {
            color: 'primary.main',
            textDecoration: 'underline',
          },
        }}
      >
        minsub ventures private limited
      </Typography>

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
          {signupStep === 'payment' && t('login.signup.titlePayment')}
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
                  <Box>
                    <Typography variant="caption" sx={signupLabelSx}>
                      {t('login.signup.labelPlan')}
                    </Typography>
                    <Box
                      sx={{
                        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                        borderRadius: '14px',
                        px: 1.25,
                        py: 0.5,
                        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
                        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.4)}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 0.65,
                          cursor: 'pointer',
                          borderRadius: '10px',
                          px: 0.5,
                          mx: -0.5,
                          '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.6) },
                        }}
                        onClick={() => handleSignupChange('planType', 'free_week_7')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Checkbox
                            size="small"
                            checked={signupData.planType === 'free_week_7'}
                            onChange={() => handleSignupChange('planType', 'free_week_7')}
                            sx={{ borderRadius: '6px' }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
                            {t('login.signup.planFreeTrial')}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
                          {t('login.signup.oncePerCompany')}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 0.65,
                          cursor: 'pointer',
                          borderRadius: '10px',
                          px: 0.5,
                          mx: -0.5,
                          '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.6) },
                        }}
                        onClick={() => handleSignupChange('planType', 'month_5000')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Checkbox
                            size="small"
                            checked={signupData.planType === 'month_5000'}
                            onChange={() => handleSignupChange('planType', 'month_5000')}
                            sx={{ borderRadius: '6px' }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
                            {getPlanLabel('month_5000')}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('login.signup.regularPrice')}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 0.65,
                          cursor: 'pointer',
                          borderRadius: '10px',
                          px: 0.5,
                          mx: -0.5,
                          '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.6) },
                        }}
                        onClick={() => handleSignupChange('planType', 'year_50000')}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Checkbox
                            size="small"
                            checked={signupData.planType === 'year_50000'}
                            onChange={() => handleSignupChange('planType', 'year_50000')}
                            sx={{ borderRadius: '6px' }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
                            {getPlanLabel('year_50000')}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                          {t('login.signup.discountOff', { rate: yearlyDiscountRate })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
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
                      end: getPeriodEndDate(signupData.startDate, signupData.planType)
                    })}
                    <br />
                    {t('login.signup.infoFreeTrialPolicy')}
                    <br />
                    {t('login.signup.infoAdminGrant')}
                  </Alert>
                </Box>
              </>
            )}

            {signupStep === 'payment' && (
              <Box sx={{ maxWidth: 768, mx: 'auto' }}>
                <Alert severity="info" variant="outlined" sx={{ mb: 2, borderRadius: '12px', fontSize: '0.875rem' }}>
                  {t('login.signup.paymentHint')}
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
                    {t('login.signup.paymentInfoTitle')}
                  </Typography>
                  <Box sx={{ display: 'grid', gap: 0.8 }}>
                    <Typography variant="body2">
                      {t('login.signup.lineCompany', { name: signupData.companyName || '-' })}
                    </Typography>
                    <Typography variant="body2">
                      {t('login.signup.linePlan', { plan: getPlanLabel(signupData.planType) })}
                    </Typography>
                    <Typography variant="body2">
                      {t('login.signup.lineUsage', {
                        start: signupData.startDate,
                        end: getPeriodEndDate(signupData.startDate, signupData.planType)
                      })}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t('login.signup.lineAmount', {
                        amount: getPlanAmount(signupData.planType).toLocaleString('en-IN')
                      })}
                    </Typography>
                    {signupData.planType === 'free_week_7' && (
                      <Typography variant="caption" color="text.secondary">
                        {t('login.signup.freeTrialSameFlow')}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>
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
                    {t('login.signup.taxInvoiceTitle')}
                  </Typography>
                  <Typography variant="body2">
                    {t('login.signup.lineInvoiceNo', {
                      no: signupResult?.taxInvoiceNumber || `FREE-${signupData.businessNumber || 'TRIAL'}`
                    })}
                  </Typography>
                  <Typography variant="body2">
                    {t('login.signup.lineUsage', {
                      start: signupResult?.usageStartDate || signupData.startDate,
                      end:
                        signupResult?.usageEndDate ||
                        getPeriodEndDate(signupData.startDate, signupData.planType)
                    })}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1.4 }}>
                    {t('login.signup.lineAmount', {
                      amount: (signupResult?.billingAmount ?? getPlanAmount(signupData.planType)).toLocaleString(
                        'en-IN'
                      )
                    })}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleDownloadTaxInvoice}
                    sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('login.signup.downloadTaxInvoice')}
                  </Button>
                  {!invoiceDownloaded && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      {t('login.signup.downloadFirstHint')}
                    </Typography>
                  )}
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
                {signupData.planType === 'free_week_7' ? t('login.signup.next') : t('login.signup.payNow')}
              </Button>
            )}
            {signupStep === 'payment' && (
              <>
                <Button
                  onClick={() => setSignupStep('form')}
                  disabled={signupLoading}
                  variant="outlined"
                  sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2 }}
                >
                  {t('login.signup.previous')}
                </Button>
                <Button
                  onClick={handleSignupPaymentComplete}
                  variant="contained"
                  color="primary"
                  disableElevation
                  disabled={signupLoading || (signupData.planType !== 'free_week_7' && Boolean(paymentBlockedReason))}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
                >
                  {signupLoading
                    ? t('login.signup.processing')
                    : signupData.planType === 'free_week_7'
                      ? t('login.signup.confirmFreeSignup')
                      : t('login.signup.paymentComplete')}
                </Button>
              </>
            )}
            {signupStep === 'done' && (
              <Button
                variant="contained"
                color="primary"
                disableElevation
                disabled={signupLoading || !invoiceDownloaded}
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