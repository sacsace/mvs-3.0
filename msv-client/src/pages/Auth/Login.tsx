import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
  InputAdornment,
  IconButton,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGlobalStore } from '../../store';
import { apiService } from '../../services/api';
import { LoginRequest } from '../../types';

// 유효성 검사 스키마
const loginSchema = yup.object({
  userid: yup.string().required('사용자 ID는 필수입니다'),
  password: yup.string().required('비밀번호는 필수입니다'),
  remember: yup.boolean(),
});

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser, setAuthenticated, setLoading } = useGlobalStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      userid: '',
      password: '',
      remember: false,
    },
  });

  const handleLogin = async (data: LoginRequest) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await apiService.login(data);
      const { user, token, refresh_token } = response.data.data;
      
      // 토큰 저장
      localStorage.setItem('access_token', token);
      if (data.remember) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      
      // 전역 상태 업데이트
      setUser(user);
      setAuthenticated(true);
      
      // 대시보드로 이동
      navigate('/dashboard');
    } catch (error: any) {
      console.error('로그인 오류:', error);
      setError(
        error.response?.data?.message || 
        error.message || 
        '로그인에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 4,
            borderRadius: 2,
          }}
        >
          {/* 로고 및 제목 */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              MVS 3.0
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {t('auth.login')}
            </Typography>
          </Box>

          {/* 에러 메시지 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit(handleLogin)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 사용자 ID */}
              <Controller
                name="userid"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('auth.userid')}
                    error={!!errors.userid}
                    helperText={errors.userid?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    disabled={isLoading}
                  />
                )}
              />

              {/* 비밀번호 */}
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={t('auth.password')}
                    type={showPassword ? 'text' : 'password'}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleShowPassword}
                            edge="end"
                            disabled={isLoading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    disabled={isLoading}
                  />
                )}
              />

              {/* 로그인 상태 유지 */}
              <Controller
                name="remember"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={field.value}
                        disabled={isLoading}
                      />
                    }
                    label={t('auth.rememberMe')}
                  />
                )}
              />

              {/* 로그인 버튼 */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ mt: 2, py: 1.5 }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  t('auth.login')
                )}
              </Button>
            </Box>
          </form>

          {/* 추가 링크 */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              비밀번호를 잊으셨나요?{' '}
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  // 비밀번호 찾기 페이지로 이동
                  console.log('비밀번호 찾기');
                }}
                disabled={isLoading}
              >
                {t('auth.forgotPassword')}
              </Button>
            </Typography>
          </Box>
        </Paper>

        {/* 푸터 */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © 2024 MVS 3.0. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
