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
  Checkbox
} from '@mui/material';
import {
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { api, API_BASE_URL } from '../../services/api';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useStore();
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
    if (planType === 'year_50000') return 'Rs.50000 /year';
    if (planType === 'month_5000') return 'Rs.5000 /month';
    return '무료 1일 체험';
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
    const days = planType === 'year_50000' ? 365 : planType === 'free_day_1' ? 1 : 30;
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
        errorMessage = `네트워크 오류: 백엔드 서버(${API_BASE_URL})에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.`;
      } else if (err.response?.status === 404) {
        errorMessage = `API 엔드포인트를 찾을 수 없습니다: ${err.config?.baseURL || API_BASE_URL}${err.config?.url || '/auth/login'}`;
      } else if (err.response?.status === 0) {
        errorMessage = 'CORS 오류: 백엔드 서버의 CORS 설정을 확인해주세요.';
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
      setSignupError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setSignupStep('payment');
    if (signupData.planType !== 'free_day_1') {
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
        `결제 완료: ${signupData.startDate} ~ ${getPeriodEndDate(signupData.startDate, signupData.planType)}`
      );
      setSignupStep('done');
      setFormData((prev) => ({
        ...prev,
        userid: signupData.adminUserid,
        password: signupData.adminPassword
      }));
    } else {
      setSignupError(response.data?.message || '가입에 실패했습니다.');
    }
  };

  const handleSignupPaymentComplete = async () => {
    if (signupData.planType !== 'free_day_1' && paymentBlockedReason) {
      return;
    }
    setSignupError('');
    setSignupSuccess('');
    setSignupLoading(true);
    try {
      if (signupData.planType === 'free_day_1') {
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
        const message = orderResponse.data?.message || '결제 주문 생성에 실패했습니다.';
        setSignupError(message);
        if (message.includes('환경 변수를 확인')) {
          setPaymentBlockedReason(message);
        }
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setSignupError('Razorpay 스크립트를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.');
        return;
      }

      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) {
        setSignupError('Razorpay 결제창을 초기화하지 못했습니다.');
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
          description: `${getPlanLabel(signupData.planType)} 가입 결제`,
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
            ondismiss: () => reject(new Error('결제가 취소되었습니다.'))
          },
          handler: (response: any) => resolve(response)
        });
        rzp.on('payment.failed', (failure: any) => {
          const reason = failure?.error?.description || '결제에 실패했습니다.';
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
      const message = err?.response?.data?.message || err?.message || '결제/가입 처리 중 오류가 발생했습니다.';
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

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      height: 42,
      borderRadius: '10px',
      backgroundColor: '#ffffff !important',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      '& fieldset': {
        borderColor: '#d0d7e2 !important',
        borderWidth: '1px'
      },
      '&:hover fieldset': {
        borderColor: '#9fb0c6 !important'
      },
      '&.Mui-focused fieldset': {
        borderColor: '#3b82f6 !important',
        borderWidth: '1px'
      },
      '&.Mui-focused': {
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)'
      }
    },
    '& .MuiInputBase-input': {
      py: 1,
      px: 1.5,
      fontSize: '14px !important',
      color: '#0f172a !important',
      '&::placeholder': {
        color: '#94a3b8 !important',
        opacity: 1
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #f8fbff 0%, #eef4ff 45%, #f9fbff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        position: 'relative'
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={0}
          sx={{
            px: 2.6,
            py: 2.5,
            borderRadius: '12px',
            backgroundColor: '#ffffff !important',
            border: '1px solid #e2e8f0 !important',
            boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)',
            width: `min(100%, ${cardWidth}px)`,
            mx: 'auto'
          }}
        >
          <Box sx={{ textAlign: 'left', mb: 2, width: `min(100%, ${controlWidth}px)`, mx: 'auto' }}>
            <Typography
              component="div"
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.8rem',
                color: '#0f172a !important',
                letterSpacing: '-0.005em',
                mb: 0
              }}
            >
              Log in
            </Typography>
          </Box>

          <Box sx={{ width: `min(100%, ${controlWidth}px)`, mx: 'auto' }}>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 1.5,
                  fontSize: '0.82rem',
                  borderRadius: '10px',
                  backgroundColor: '#3f1d2e',
                  color: '#fecdd3',
                  border: '1px solid #7f1d1d',
                  '& .MuiAlert-icon': {
                    color: '#f87171'
                  }
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ mb: 1.25 }}>
                <Typography
                  component="label"
                  htmlFor="userid"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    color: '#334155 !important',
                    fontSize: '14px !important',
                    fontWeight: 500,
                    letterSpacing: '0.01em'
                  }}
                >
                  Email
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
                  sx={inputSx}
                />
              </Box>

              <Box sx={{ mb: 1.75 }}>
                <Typography
                  component="label"
                  htmlFor="password"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    color: '#334155 !important',
                    fontSize: '14px !important',
                    fontWeight: 500,
                    letterSpacing: '0.01em'
                  }}
                >
                  Password
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
                            color: '#64748b !important',
                            '&:hover': {
                              color: '#1e293b !important',
                              backgroundColor: 'rgba(148, 163, 184, 0.14)'
                            }
                          }}
                        >
                          {showPassword ? <VisibilityOff sx={{ fontSize: '1rem' }} /> : <Visibility sx={{ fontSize: '1rem' }} />}
                        </IconButton>
                      </Box>
                    )
                  }}
                  sx={inputSx}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.2,
                  mt: 0.4,
                  minHeight: '42px',
                  fontSize: '14px !important',
                  fontWeight: 700,
                  borderRadius: '10px',
                  backgroundColor: '#2563eb',
                  boxShadow: 'none',
                  textTransform: 'none',
                  color: '#ffffff !important',
                  '&:hover': {
                    backgroundColor: '#1d4ed8',
                    boxShadow: 'none'
                  },
                  '&:disabled': {
                    backgroundColor: '#cbd5e1 !important',
                    color: '#64748b !important'
                  }
                }}
              >
                {loading ? t('common.loading') : 'Log in'}
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
                  mt: 0.7,
                  py: 0.2,
                  minHeight: 'auto',
                  fontSize: '13px !important',
                  fontWeight: 500,
                  border: 'none',
                  color: '#2563eb !important',
                  backgroundColor: 'transparent',
                  textTransform: 'none',
                  '&:hover': {
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#1d4ed8 !important',
                    textDecoration: 'underline'
                  }
                }}
              >
                Sign up
              </Button>
            </Box>
          </Box>

        </Paper>
      </Container>
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: 14,
          transform: 'translateX(-50%)',
          color: '#94a3b8 !important',
          letterSpacing: '0.04em',
          textTransform: 'lowercase',
          fontSize: '0.68rem'
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
            width: 'min(96vw, 980px)',
            maxHeight: '92vh'
          }
        }}
      >
        <DialogTitle>
          {signupStep === 'form' && '신규 가입'}
          {signupStep === 'payment' && '결제 진행'}
          {signupStep === 'done' && '가입 완료'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSignupSubmit}>
          <DialogContent
            dividers
            sx={{
              display: signupStep === 'form' ? 'grid' : 'block',
              gridTemplateColumns: signupStep === 'form' ? { xs: '1fr', md: '1.45fr 1fr' } : undefined,
              gap: signupStep === 'form' ? 1.25 : 0,
              py: 1.2,
              overflow: 'hidden'
            }}
          >
            {signupError && (
              <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
                {signupError}
              </Alert>
            )}
            {signupSuccess && (
              <Alert severity="success" sx={{ gridColumn: '1 / -1' }}>
                {signupSuccess}
              </Alert>
            )}

            {signupStep === 'form' && (
              <>
                <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="subtitle2">초기 데이터</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.9 }}>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>회사명 *</Typography>
                  <TextField hiddenLabel placeholder="회사명" size="small" fullWidth value={signupData.companyName} onChange={(e) => handleSignupChange('companyName', e.target.value)} required />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>사업자번호 *</Typography>
                  <TextField hiddenLabel placeholder="사업자번호" size="small" fullWidth value={signupData.businessNumber} onChange={(e) => handleSignupChange('businessNumber', e.target.value)} required />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>GST 번호 *</Typography>
                  <TextField hiddenLabel placeholder="15자리 GST 번호" size="small" fullWidth value={signupData.gstNumber} onChange={(e) => handleSignupChange('gstNumber', e.target.value.toUpperCase())} inputProps={{ maxLength: 15 }} required />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>전화번호</Typography>
                  <TextField hiddenLabel placeholder="전화번호" size="small" fullWidth value={signupData.phone} onChange={(e) => handleSignupChange('phone', e.target.value)} />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>주소</Typography>
                  <TextField hiddenLabel placeholder="주소" size="small" fullWidth value={signupData.address} onChange={(e) => handleSignupChange('address', e.target.value)} />
                </Box>
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 0.4 }}>관리자 계정</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.9 }}>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>관리자 이름 *</Typography>
                  <TextField hiddenLabel placeholder="관리자 이름" size="small" fullWidth value={signupData.adminName} onChange={(e) => handleSignupChange('adminName', e.target.value)} required />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>관리자 ID *</Typography>
                  <TextField hiddenLabel placeholder="관리자 ID" size="small" fullWidth value={signupData.adminUserid} onChange={(e) => handleSignupChange('adminUserid', e.target.value)} required />
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>관리자 이메일 *</Typography>
                  <TextField hiddenLabel placeholder="관리자 이메일" size="small" fullWidth type="email" value={signupData.adminEmail} onChange={(e) => handleSignupChange('adminEmail', e.target.value)} required />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>비밀번호 *</Typography>
                  <TextField hiddenLabel placeholder="비밀번호" size="small" fullWidth type="password" value={signupData.adminPassword} onChange={(e) => handleSignupChange('adminPassword', e.target.value)} required />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>비밀번호 확인 *</Typography>
                  <TextField hiddenLabel placeholder="비밀번호 확인" size="small" fullWidth type="password" value={signupData.adminPasswordConfirm} onChange={(e) => handleSignupChange('adminPasswordConfirm', e.target.value)} required />
                </Box>
              </Box>
                </Box>

                <Box sx={{ display: 'grid', gap: 0.9, alignContent: 'start' }}>
              <Typography variant="subtitle2">요금제 / 사용기간</Typography>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>요금제</Typography>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1, py: 0.35 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.1, cursor: 'pointer' }} onClick={() => handleSignupChange('planType', 'free_day_1')}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox size="small" checked={signupData.planType === 'free_day_1'} onChange={() => handleSignupChange('planType', 'free_day_1')} />
                      <Typography variant="body2">무료 1일 체험</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>회사당 1회</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.1, cursor: 'pointer' }} onClick={() => handleSignupChange('planType', 'month_5000')}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox size="small" checked={signupData.planType === 'month_5000'} onChange={() => handleSignupChange('planType', 'month_5000')} />
                      <Typography variant="body2">Rs.5000 /month</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">정가</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.1, cursor: 'pointer' }} onClick={() => handleSignupChange('planType', 'year_50000')}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox size="small" checked={signupData.planType === 'year_50000'} onChange={() => handleSignupChange('planType', 'year_50000')} />
                      <Typography variant="body2">Rs.50000 /year</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>{yearlyDiscountRate}% 할인</Typography>
                  </Box>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 600 }}>사용 시작일</Typography>
                <TextField hiddenLabel type="date" size="small" fullWidth value={signupData.startDate} onChange={(e) => handleSignupChange('startDate', e.target.value)} />
              </Box>
              <Alert severity="info" sx={{ py: 0.6, '& .MuiAlert-message': { fontSize: '0.78rem' } }}>
                사용 기간: {signupData.startDate} ~ {getPeriodEndDate(signupData.startDate, signupData.planType)}
                <br />
                무료 1일 체험은 동일 회사 기준 1회만 가능합니다.
                <br />
                가입 시 기본 `admin` 권한 + 결제 처리 권한이 자동 부여됩니다.
              </Alert>
                </Box>
              </>
            )}

            {signupStep === 'payment' && (
              <Box sx={{ maxWidth: 640, mx: 'auto' }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  결제 완료 후 세금계산서 다운로드를 진행하고, 마지막으로 가입 완료 버튼을 눌러 종료합니다.
                </Alert>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>결제 정보</Typography>
                  <Box sx={{ display: 'grid', gap: 0.8 }}>
                    <Typography variant="body2">회사명: {signupData.companyName || '-'}</Typography>
                    <Typography variant="body2">요금제: {getPlanLabel(signupData.planType)}</Typography>
                    <Typography variant="body2">사용 기간: {signupData.startDate} ~ {getPeriodEndDate(signupData.startDate, signupData.planType)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      결제 금액: Rs.{getPlanAmount(signupData.planType).toLocaleString()}
                    </Typography>
                    {signupData.planType === 'free_day_1' && (
                      <Typography variant="caption" color="text.secondary">
                        무료 체험도 동일 절차로 확인 후 가입이 완료됩니다.
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>
            )}

            {signupStep === 'done' && (
              <Box sx={{ maxWidth: 640, mx: 'auto' }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  결제 처리 및 가입 데이터 생성이 완료되었습니다.
                </Alert>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>세금계산서</Typography>
                  <Typography variant="body2">
                    인보이스 번호: {signupResult?.taxInvoiceNumber || `FREE-${signupData.businessNumber || 'TRIAL'}`}
                  </Typography>
                  <Typography variant="body2">
                    사용 기간: {signupResult?.usageStartDate || signupData.startDate} ~ {signupResult?.usageEndDate || getPeriodEndDate(signupData.startDate, signupData.planType)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1.4 }}>
                    결제 금액: Rs.{(signupResult?.billingAmount ?? getPlanAmount(signupData.planType)).toLocaleString()}
                  </Typography>
                  <Button variant="outlined" onClick={handleDownloadTaxInvoice}>
                    Tax Invoice 다운로드
                  </Button>
                  {!invoiceDownloaded && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      가입 완료 버튼 활성화를 위해 먼저 세금계산서를 다운로드해 주세요.
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ py: 0.8 }}>
            <Button onClick={closeSignupDialog} disabled={signupLoading}>취소</Button>
            {signupStep === 'form' && (
              <Button type="submit" variant="contained" disabled={signupLoading}>
                {signupData.planType === 'free_day_1' ? '다음' : '즉시 결제'}
              </Button>
            )}
            {signupStep === 'payment' && (
              <>
                <Button onClick={() => setSignupStep('form')} disabled={signupLoading} variant="outlined">
                  이전
                </Button>
                <Button
                  onClick={handleSignupPaymentComplete}
                  variant="contained"
                  disabled={signupLoading || (signupData.planType !== 'free_day_1' && Boolean(paymentBlockedReason))}
                >
                  {signupLoading ? '처리 중...' : (signupData.planType === 'free_day_1' ? '무료가입 확인' : '결제 완료')}
                </Button>
              </>
            )}
            {signupStep === 'done' && (
              <Button
                variant="contained"
                disabled={signupLoading || !invoiceDownloaded}
                onClick={() => {
                  closeSignupDialog();
                }}
              >
                가입 완료
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Login;