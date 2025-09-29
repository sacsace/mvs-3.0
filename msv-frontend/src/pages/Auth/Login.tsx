import React, { useState } from 'react';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      const { token, user } = response.data.data;
      
      login(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
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
              Login
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
                fontSize: '0.875rem',
                borderRadius: 2,
                '& .MuiAlert-message': {
                  fontSize: '0.875rem'
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
                    <PersonIcon sx={{ color: '#a0aec0', fontSize: '1.25rem' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  backgroundColor: '#f7fafc',
                  '& fieldset': {
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                  },
                  '&:hover fieldset': {
                    borderColor: '#e2e8f0',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#e2e8f0 !important',
                    borderWidth: '1px !important',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                  '&.Mui-focused': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0 !important',
                  borderWidth: '1px !important',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0 !important',
                  borderWidth: '1px !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  color: '#718096',
                  backgroundColor: '#f7fafc !important',
                  padding: '0 6px !important',
                  zIndex: 10,
                  position: 'relative',
                  transform: 'translate(14px, -9px) scale(0.75)',
                  transformOrigin: 'top left'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#667eea',
                  backgroundColor: '#f7fafc !important',
                  zIndex: 10
                },
                '& .MuiInputLabel-shrink': {
                  backgroundColor: '#f7fafc !important',
                  zIndex: 10
                },
                '& .MuiInputBase-input': {
                  padding: '12px 14px',
                  fontSize: '0.875rem'
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
                    <LockIcon sx={{ color: '#a0aec0', fontSize: '1.25rem' }} />
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
              }}
              sx={{ 
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  backgroundColor: '#f7fafc',
                  '& fieldset': {
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                  },
                  '&:hover fieldset': {
                    borderColor: '#e2e8f0',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#e2e8f0 !important',
                    borderWidth: '1px !important',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                  '&.Mui-focused': {
                    outline: 'none !important',
                    boxShadow: 'none !important',
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0 !important',
                  borderWidth: '1px !important',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0 !important',
                  borderWidth: '1px !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.875rem',
                  color: '#718096',
                  backgroundColor: '#f7fafc !important',
                  padding: '0 6px !important',
                  zIndex: 10,
                  position: 'relative',
                  transform: 'translate(14px, -9px) scale(0.75)',
                  transformOrigin: 'top left'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#667eea',
                  backgroundColor: '#f7fafc !important',
                  zIndex: 10
                },
                '& .MuiInputLabel-shrink': {
                  backgroundColor: '#f7fafc !important',
                  zIndex: 10
                },
                '& .MuiInputBase-input': {
                  padding: '12px 14px',
                  fontSize: '0.875rem'
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