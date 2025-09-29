import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../services/api';

const Header: React.FC = () => {
  const { user, logout } = useStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [languageAnchorEl, setLanguageAnchorEl] = useState<null | HTMLElement>(null);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    logo: string;
  } | null>(null);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');

  // 회사 정보 로드
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const response = await api.get('/company');
        if (response.data.success) {
          const company = response.data.data;
          setCompanyInfo({
            name: company.name || '회사명',
            logo: company.company_logo || ''
          });
        }
      } catch (error) {
        console.error('회사 정보 로드 오류:', error);
        setCompanyInfo({
          name: '회사명',
          logo: ''
        });
      }
    };

    fetchCompanyInfo();
  }, []);

  // 회사명에서 법인 형태 제거
  const cleanCompanyName = (name: string) => {
    if (!name) return '회사명';
    
    return name
      .replace(/\s+(Private Limited|Pvt Ltd|LLP|Ltd|Inc|Corp|Corporation|Company|Co\.|Limited)$/gi, '')
      .trim() || '회사명';
  };


  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const handleLanguageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageAnchorEl(null);
  };

  const handleLanguageChange = (lang: 'ko' | 'en') => {
    setLanguage(lang);
    handleLanguageClose();
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        '& *': {
          color: '#1e293b',
        }
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important', px: 3 }}>
        {/* 회사 로고 및 회사명 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              mr: 2,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              background: companyInfo?.logo ? 'transparent' : 'linear-gradient(135deg, var(--primary-500) 0%, var(--accent-500) 100%)',
              position: 'relative'
            }}
          >
            {companyInfo?.logo ? (
              <img
                src={companyInfo.logo}
                alt="회사 로고"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: '1.125rem',
                  fontWeight: '800',
                  color: 'white',
                  letterSpacing: '-0.05em'
                }}
              >
                {cleanCompanyName(companyInfo?.name || '').charAt(0).toUpperCase()}
              </Typography>
            )}
          </Box>
          <Box>
            <Typography variant="h6" component="div" sx={{ 
              fontWeight: '700', 
              color: '#1e293b', 
              fontSize: '1.125rem',
              letterSpacing: '-0.05em',
              lineHeight: 1.2,
              background: 'linear-gradient(135deg, #0ea5e9 0%, #d946ef 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {cleanCompanyName(companyInfo?.name || '회사명')}
            </Typography>
          </Box>
        </Box>

        {/* 빈 공간 */}
        <Box sx={{ flexGrow: 1 }} />
        
        {/* 알림 및 사용자 메뉴 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* 언어 전환 버튼 */}
          <IconButton 
            size="small"
            onClick={handleLanguageMenu}
            sx={{ 
              color: '#64748b',
              '&:hover': {
                bgcolor: '#f1f5f9',
                color: '#1e293b'
              }
            }}
          >
            <LanguageIcon sx={{ fontSize: '1.125rem' }} />
          </IconButton>

          <IconButton 
            size="small"
            sx={{ 
              color: '#64748b',
              '&:hover': {
                bgcolor: '#f1f5f9',
                color: '#1e293b'
              }
            }}
          >
            <Badge 
              badgeContent={3} 
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: '#ef4444',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: '600',
                  minWidth: '16px',
                  height: '16px'
                }
              }}
            >
              <NotificationsIcon sx={{ fontSize: '1.125rem' }} />
            </Badge>
          </IconButton>
          
          <IconButton
            size="small"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{ 
              color: '#64748b',
              '&:hover': {
                bgcolor: '#f1f5f9'
              }
            }}
          >
            <Avatar sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: '#667eea',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.75rem'
            }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 180,
                '& .MuiMenuItem-root': {
                  px: 1.5,
                  py: 0.75,
                }
              }
            }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                  {user?.username || '사용자'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.625rem' }}>
                  {user?.role || 'user'} • {user?.email || 'user@example.com'}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleClose} sx={{ fontSize: '0.75rem' }}>
              <SettingsIcon sx={{ mr: 1, fontSize: '0.875rem' }} />
              설정
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ fontSize: '0.75rem' }}>
              <LogoutIcon sx={{ mr: 1, fontSize: '0.875rem' }} />
              로그아웃
            </MenuItem>
          </Menu>

          {/* 언어 선택 메뉴 */}
          <Menu
            id="language-menu"
            anchorEl={languageAnchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(languageAnchorEl)}
            onClose={handleLanguageClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 120,
                '& .MuiMenuItem-root': {
                  px: 1.5,
                  py: 0.75,
                }
              }
            }}
          >
            <MenuItem 
              onClick={() => handleLanguageChange('ko')} 
              sx={{ 
                fontSize: '0.75rem',
                backgroundColor: language === 'ko' ? '#f1f5f9' : 'transparent',
                '&:hover': {
                  backgroundColor: '#f1f5f9'
                }
              }}
            >
              🇰🇷 한국어
            </MenuItem>
            <MenuItem 
              onClick={() => handleLanguageChange('en')} 
              sx={{ 
                fontSize: '0.75rem',
                backgroundColor: language === 'en' ? '#f1f5f9' : 'transparent',
                '&:hover': {
                  backgroundColor: '#f1f5f9'
                }
              }}
            >
              🇺🇸 English
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
