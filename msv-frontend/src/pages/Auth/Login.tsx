import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const Login: React.FC = () => {
  const { login } = useStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userid: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);

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
        navigate('/dashboard');
      } else {
        showError(response.data.message || '로그인에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('로그인 오류:', err);
      const errorMessage = err.response?.data?.message || err.message || '로그인에 실패했습니다.';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          animation: 'float 20s ease-in-out infinite'
        }
      }}
    >
      <Container maxWidth="xs">
        <Paper 
          elevation={0} 
          sx={{ 
            padding: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            maxWidth: 400,
            mx: 'auto',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* 제목 영역 */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.75rem',
                letterSpacing: '-0.025em',
                mb: 0.5
              }}
            >
              Welcome
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#718096',
                fontSize: '0.875rem'
              }}
            >
              Sign in to your account
            </Typography>
          </Box>
          
          {/* 에러 메시지 */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                fontSize: '0.9rem',
                borderRadius: 2,
                animation: 'shake 0.6s ease-in-out, pulse 2s ease-in-out infinite',
                border: '3px solid #e53e3e',
                backgroundColor: '#fed7d7',
                boxShadow: '0 4px 12px rgba(229, 62, 62, 0.3)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, rgba(229, 62, 62, 0.1), rgba(197, 48, 48, 0.1))',
                  animation: 'glow 2s ease-in-out infinite alternate'
                },
                '& .MuiAlert-message': {
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#c53030',
                  position: 'relative',
                  zIndex: 1
                },
                '& .MuiAlert-icon': {
                  fontSize: '1.3rem',
                  color: '#c53030',
                  position: 'relative',
                  zIndex: 1
                },
                '@keyframes shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
                  '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
                },
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.8 },
                  '100%': { opacity: 1 }
                },
                '@keyframes glow': {
                  '0%': { opacity: 0.3 },
                  '100%': { opacity: 0.6 }
                }
              }}
            >
              {error}
            </Alert>
          )}

          {/* 로그인 폼 */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              required
              id="userid"
              label="User ID"
              name="userid"
              autoComplete="username"
              autoFocus
              value={formData.userid}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ 
                      color: '#a0aec0', 
                      fontSize: '1.25rem',
                      margin: '0 4px'
                    }} />
                  </InputAdornment>
                ),
                style: {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none'
                }
              }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                  outline: 'none !important',
                  '& fieldset': {
                    borderColor: '#e2e8f0',
                    borderWidth: 2,
                  },
                  '&:hover fieldset': {
                    borderColor: '#cbd5e0',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3b82f6 !important',
                    borderWidth: '2px !important',
                    outline: 'none !important',
                    boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                  },
                  '&.Mui-focused': {
                    outline: 'none !important',
                    boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                  },
                },
                '& .MuiOutlinedInput-root:focus': {
                  outline: 'none !important',
                  boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                },
                '& .MuiOutlinedInput-root:focus-visible': {
                  outline: 'none !important',
                  boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                },
                '& input:focus': {
                  outline: 'none !important',
                },
                '& input:focus-visible': {
                  outline: 'none !important',
                },
                '& input': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important'
                },
                '& *': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important'
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0 !important',
                  borderWidth: '2px !important',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6 !important',
                  borderWidth: '2px !important',
                  outline: 'none !important',
                  boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  color: '#718096',
                  backgroundColor: '#ffffff !important',
                  padding: '0 6px !important',
                  zIndex: 10,
                  position: 'relative',
                  transform: 'translate(14px, -9px) scale(0.75)',
                  transformOrigin: 'top left'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#3b82f6',
                  backgroundColor: '#ffffff !important',
                  zIndex: 10
                },
                '& .MuiInputLabel-shrink': {
                  backgroundColor: '#ffffff !important',
                  zIndex: 10
                },
                '& .MuiInputBase-input': {
                  padding: '12px 14px',
                  fontSize: '0.875rem',
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none !important',
                  MozAppearance: 'none !important',
                  appearance: 'none !important'
                },
                '& .MuiOutlinedInput-input': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none !important',
                  MozAppearance: 'none !important',
                  appearance: 'none !important'
                },
                '& input[type="text"], & input[type="password"]': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none !important',
                  MozAppearance: 'none !important',
                  appearance: 'none !important'
                }
              }}
            />
            
            <TextField
              fullWidth
              required
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ 
                            color: '#a0aec0', 
                            fontSize: '1.25rem',
                            margin: '0 4px'
                          }} />
                        </InputAdornment>
                      ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#a0aec0' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                style: {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none'
                }
              }}
              sx={{ 
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                  outline: 'none !important',
                  '& fieldset': {
                    borderColor: '#e2e8f0',
                    borderWidth: 2,
                  },
                  '&:hover fieldset': {
                    borderColor: '#cbd5e0',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3b82f6 !important',
                    borderWidth: '2px !important',
                    outline: 'none !important',
                    boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                  },
                  '&.Mui-focused': {
                    outline: 'none !important',
                    boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                  },
                },
                '& .MuiOutlinedInput-root:focus': {
                  outline: 'none !important',
                  boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                },
                '& .MuiOutlinedInput-root:focus-visible': {
                  outline: 'none !important',
                  boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                },
                '& input:focus': {
                  outline: 'none !important',
                },
                '& input:focus-visible': {
                  outline: 'none !important',
                },
                '& input': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important'
                },
                '& *': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important'
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0 !important',
                  borderWidth: '2px !important',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#3b82f6 !important',
                  borderWidth: '2px !important',
                  outline: 'none !important',
                  boxShadow: 'inset 0 0 0 1px #3b82f6 !important',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  color: '#718096',
                  backgroundColor: '#ffffff !important',
                  padding: '0 6px !important',
                  zIndex: 10,
                  position: 'relative',
                  transform: 'translate(14px, -9px) scale(0.75)',
                  transformOrigin: 'top left'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#3b82f6',
                  backgroundColor: '#ffffff !important',
                  zIndex: 10
                },
                '& .MuiInputLabel-shrink': {
                  backgroundColor: '#ffffff !important',
                  zIndex: 10
                },
                '& .MuiInputBase-input': {
                  padding: '12px 14px',
                  fontSize: '0.875rem',
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none !important',
                  MozAppearance: 'none !important',
                  appearance: 'none !important'
                },
                '& .MuiOutlinedInput-input': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none !important',
                  MozAppearance: 'none !important',
                  appearance: 'none !important'
                },
                '& input[type="text"], & input[type="password"]': {
                  outline: 'none !important',
                  outlineOffset: '0 !important',
                  WebkitTapHighlightColor: 'transparent !important',
                  WebkitAppearance: 'none !important',
                  MozAppearance: 'none !important',
                  appearance: 'none !important'
                }
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ 
                py: 1.5,
                fontSize: '0.875rem',
                fontWeight: '600',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                  boxShadow: '0 6px 20px rgba(59, 130, 246, 0.5)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: '#cbd5e0',
                  boxShadow: 'none',
                  transform: 'none',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>

          {/* 푸터 */}
          <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid #e2e8f0' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.75rem',
                color: '#a0aec0'
              }}
            >
              © 2025 Minsub Ventures Enterprise Solution
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;