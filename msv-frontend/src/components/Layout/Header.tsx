import React, { useState, useEffect, useMemo } from 'react';
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
  ListItemText,
  Tooltip,
  Button
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Language as LanguageIcon,
  Check as CheckIcon,
  DeleteSweep as DeleteSweepIcon,
  Announcement as AnnouncementIcon,
  AutoAwesome as AutoAwesomeIcon,
  Menu as MenuIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useStore, useMenuStore } from '../../store';
import { api, userUiPreferencesService } from '../../services/api';
import { useTranslation } from 'react-i18next';
import i18n from '../../locales/i18n';
import { useErrorStore } from '../../store/errorStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useNavigate, useLocation } from 'react-router-dom';
import FullMenuOverlay from './FullMenuOverlay';
import NotificationDetailDialog from '../Notifications/NotificationDetailDialog';
import {
  ActionInboxRow,
  AppNotification,
  buildNotificationsFromSources,
  getNotificationChipColor,
  getNotificationChipLabel,
  ServerNotificationItem,
} from '../../utils/notificationFeed';

interface CalendarScheduleItem {
  id: string;
  title: string;
  type: 'normal' | 'company_holiday';
}

const Header: React.FC = () => {
  const { user, logout } = useStore();
  const { language, setLanguage } = useMenuStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isNoticeRoute = location.pathname.startsWith('/communication/notice');
  const isAiRoute =
    location.pathname.startsWith('/ai') ||
    /^\/(cost-analysis|efficiency|forecasting|recommendations)(\/|$)/.test(location.pathname);
  const { errors, notifications, clearNotifications, clearErrors } = useErrorStore();
  const {
    items: notificationItems,
    mergeFromSources,
    markRead,
    markAllRead,
    clearAll: clearNotificationStore,
  } = useNotificationStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [languageAnchorEl, setLanguageAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [inboxActions, setInboxActions] = useState<ActionInboxRow[]>([]);
  const [serverNotifications, setServerNotifications] = useState<ServerNotificationItem[]>([]);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    logo: string;
  } | null>(null);

  // 회사 정보 로드
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        // 사용자의 company_id로 회사 정보 조회
        if (user?.company_id) {
          const response = await api.get(`/company/${user.company_id}`, {
            headers: { 'x-skip-error-popup': 'true' },
          });
          if (response.data.success) {
            const company = response.data.data;
            setCompanyInfo({
              name: company.name || '',
              logo: company.company_logo || ''
            });
            return;
          }
        }
        
        const response = await api.get('/company', {
          headers: { 'x-skip-error-popup': 'true' },
        });
        if (response.data.success) {
          const companies = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
          if (companies.length > 0) {
            const company = companies[0];
            setCompanyInfo({
              name: company.name || '',
              logo: company.company_logo || ''
            });
          } else {
            setCompanyInfo({ name: '', logo: '' });
          }
        }
      } catch (error) {
        console.error('회사 정보 로드 오류:', error);
        setCompanyInfo({ name: '', logo: '' });
      }
    };

    if (user) {
      fetchCompanyInfo();
    }
  }, [user]);

  const cleanCompanyName = (name: string) => {
    if (!name) return '';
    return name
      .replace(/\s+(Private Limited|Pvt Ltd|LLP|Ltd|Inc|Corp|Corporation|Company|Co\.|Limited)$/gi, '')
      .trim() || '';
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

  const handleOpenSettings = () => {
    navigate('/basic-info/system-settings');
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
    i18n.changeLanguage(lang);
    userUiPreferencesService.patch({ language: lang }).catch(() => {});
    handleLanguageClose();
  };

  // 컴포넌트 마운트 시 i18n 언어 동기화
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    const loadServerNotifications = async () => {
      try {
        const response = await api.get('/notifications', {
          params: { page: 1, limit: 20 }
        });
        if (response.data?.success) {
          const rows = Array.isArray(response.data.data) ? response.data.data : [];
          setServerNotifications(rows);
        }
      } catch (error) {
        console.error('서버 알림 로드 오류:', error);
      }
    };

    void loadServerNotifications();
    const intervalId = window.setInterval(() => {
      void loadServerNotifications();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setInboxActions([]);
      return;
    }
    const loadInbox = async () => {
      try {
        const response = await api.get('/notifications/inbox');
        if (response.data?.success && Array.isArray(response.data.data)) {
          setInboxActions(response.data.data as ActionInboxRow[]);
        } else {
          setInboxActions([]);
        }
      } catch (error) {
        console.error('알림 인박스 로드 오류:', error);
      }
    };
    void loadInbox();
    const inboxInterval = window.setInterval(() => {
      void loadInbox();
    }, 15000);
    return () => {
      window.clearInterval(inboxInterval);
    };
  }, [user?.id]);

  useEffect(() => {
    const merged = buildNotificationsFromSources({
      serverNotifications,
      clientNotifications: notifications,
      errors,
      inboxActions,
      t,
    });
    mergeFromSources(merged);
  }, [errors, notifications, serverNotifications, inboxActions, t, mergeFromSources]);

  useEffect(() => {
    if (!user?.id) return;

    const toDateKey = (date: Date) => (
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    );

    const checkCompanyHolidayReminder = async () => {
      try {
        const prefs = await userUiPreferencesService.get();
        const parsed = prefs.calendarSchedules || {};
        if (!parsed || typeof parsed !== 'object') return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const todayKey = toDateKey(today);
        const tomorrowKey = toDateKey(tomorrow);

        const tomorrowSchedules = Array.isArray((parsed as Record<string, unknown>)[tomorrowKey])
          ? ((parsed as Record<string, unknown>)[tomorrowKey] as CalendarScheduleItem[])
          : [];

        const companyHolidays = tomorrowSchedules.filter((item) => item?.type === 'company_holiday');
        if (companyHolidays.length === 0) return;

        const shownMap = prefs.companyHolidayReminderShown || {};
        if (shownMap[tomorrowKey] === todayKey) return;

        const titles = Array.from(
          new Set(
            companyHolidays
              .map((item) => item.title?.trim())
              .filter((title): title is string => Boolean(title))
          )
        );

        const fallbackTitle = language === 'en' ? 'Company Holiday' : '회사 휴일';
        const visibleTitles = titles.length > 0 ? titles : [fallbackTitle];
        const maxVisible = 2;
        const titleText = visibleTitles.slice(0, maxVisible).join(', ');
        const extraCount = visibleTitles.length - maxVisible;

        const message = language === 'en'
          ? `Reminder: Company holiday is tomorrow (${titleText}${extraCount > 0 ? ` +${extraCount}` : ''}).`
          : `알림: 내일 회사 휴일입니다 (${titleText}${extraCount > 0 ? ` 외 ${extraCount}건` : ''}).`;

        useErrorStore.getState().showNotification(message, 'warning');
        await userUiPreferencesService.patch({
          companyHolidayReminderShown: {
            ...shownMap,
            [tomorrowKey]: todayKey
          }
        });
      } catch (error) {
        console.error('회사 휴일 사전 알림 처리 오류:', error);
      }
    };

    checkCompanyHolidayReminder();
    const intervalId = window.setInterval(() => {
      void checkCompanyHolidayReminder();
    }, 10 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user?.id, language]);

  const displayNotificationFeed = useMemo(
    () => notificationItems.slice(0, 40),
    [notificationItems]
  );

  const unreadCount = useMemo(
    () => notificationItems.filter((item) => !item.read).length,
    [notificationItems]
  );

  const handleNotificationMenu = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleOpenNotificationDetail = (item: AppNotification) => {
    setSelectedNotification(item);
    setDetailDialogOpen(true);
    markRead(item.id);
    handleNotificationClose();
  };

  const handleOpenNotificationsPage = () => {
    navigate('/notifications');
    handleNotificationClose();
  };

  const handleClearNotificationFeed = () => {
    clearNotificationStore();
    clearNotifications();
    clearErrors();
    handleNotificationClose();
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        backgroundColor: 'background.paper',
        backgroundImage: 'none',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: '#E5E7EB',
        boxShadow: 'none',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        '&::after': {
          display: 'none'
        }
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: '56px !important', sm: '60px !important' },
          px: { xs: 2, sm: 3 },
          borderBottom: 'none !important',
          boxShadow: 'none !important',
          '&::before, &::after': {
            display: 'none !important',
            content: 'none'
          }
        }}
      >
        {/* 왼쪽: 회사 로고 및 회사명 */}
        {companyInfo && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 4 }}>
            {companyInfo.logo ? (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  background: 'transparent'
                }}
              >
                <img
                  src={companyInfo.logo}
                  alt={t('common.companyNameFallback')}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--accent-500) 100%)'
                }}
              >
                <BusinessIcon sx={{ color: 'white', fontSize: '1.5rem' }} />
              </Box>
            )}
            <Box>
              <Typography variant="h6" component="div" sx={{ 
                fontWeight: 500, 
                color: 'text.primary', 
                fontSize: '1.0625rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.25
              }}>
                {cleanCompanyName(companyInfo.name) || t('common.companyNameFallback')}
              </Typography>
            </Box>
          </Box>
        )}

        {/* 빈 공간 */}
        <Box sx={{ flexGrow: 1 }} />
        
        {/* 알림 및 사용자 메뉴 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={language === 'en' ? 'Notices' : '공지사항'}>
            <Button
              variant="text"
              size="small"
              startIcon={<AnnouncementIcon sx={{ fontSize: '1.125rem !important' }} />}
              onClick={() => navigate('/communication/notice')}
              aria-label={language === 'en' ? 'Notices' : '공지사항'}
              sx={{
                minWidth: 'auto',
                px: 0.75,
                py: 0.5,
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isNoticeRoute ? 'primary.main' : 'text.secondary',
                '& .MuiButton-startIcon': {
                  mr: 0.35,
                  ml: 0
                },
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: isNoticeRoute ? 'primary.dark' : 'text.primary'
                }
              }}
            >
              <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                {language === 'en' ? 'Notices' : '공지사항'}
              </Box>
            </Button>
          </Tooltip>

          <Tooltip title={language === 'en' ? 'AI Analysis' : 'AI 분석'}>
            <Button
              variant="text"
              size="small"
              startIcon={<AutoAwesomeIcon sx={{ fontSize: '1.125rem !important' }} />}
              onClick={() => navigate('/ai')}
              aria-label={language === 'en' ? 'AI Analysis' : 'AI 분석'}
              sx={{
                minWidth: 'auto',
                px: 0.75,
                py: 0.5,
                textTransform: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isAiRoute ? 'primary.main' : 'text.secondary',
                '& .MuiButton-startIcon': {
                  mr: 0.35,
                  ml: 0
                },
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: isAiRoute ? 'primary.dark' : 'text.primary'
                }
              }}
            >
              <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                {language === 'en' ? 'AI Analysis' : 'AI 분석'}
              </Box>
            </Button>
          </Tooltip>

          {/* 언어 전환 버튼 */}
          <IconButton 
            size="small"
            onClick={handleLanguageMenu}
            sx={{ 
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
                transform: 'translateY(-1px)',
              }
            }}
          >
            <LanguageIcon sx={{ fontSize: '1.125rem' }} />
          </IconButton>

          <IconButton 
            size="small"
            onClick={handleNotificationMenu}
            sx={{ 
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
                transform: 'translateY(-1px)',
              }
            }}
          >
            <Badge 
              badgeContent={unreadCount}
              invisible={unreadCount === 0}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: 'rgba(220, 80, 80, 0.92)',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: 500,
                  minWidth: '16px',
                  height: '16px'
                }
              }}
            >
              <NotificationsIcon sx={{ fontSize: '1.125rem' }} />
            </Badge>
          </IconButton>
          
          {/* 사용자명 표시 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500, 
                color: 'text.primary',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap'
              }}
            >
              {user?.username || '사용자'}
            </Typography>
          </Box>
          
          <IconButton
            size="small"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{ 
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                transform: 'translateY(-1px)',
              }
            }}
          >
            <Avatar sx={{ 
              width: 28, 
              height: 28, 
              bgcolor: 'rgba(102, 126, 234, 0.88)',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.7rem'
            }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>

          <Tooltip title={language === 'en' ? 'All menus' : '전체 메뉴'}>
            <IconButton
              size="small"
              aria-label={language === 'en' ? 'Open full menu' : '전체 메뉴 열기'}
              aria-expanded={fullMenuOpen}
              onClick={() => setFullMenuOpen((prev) => !prev)}
              sx={{
                width: 36,
                height: 36,
                ml: 0.5,
                bgcolor: fullMenuOpen ? 'primary.main' : '#1F2937',
                color: '#FFFFFF',
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  bgcolor: fullMenuOpen ? 'primary.dark' : '#111827',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <MenuIcon sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>
          
          <Menu
            id="notification-menu"
            anchorEl={notificationAnchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(notificationAnchorEl)}
            onClose={handleNotificationClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 340,
                maxWidth: 420,
                maxHeight: 420,
                overflowY: 'auto',
                p: 0.5
              }
            }}
          >
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {language === 'en' ? 'Notifications' : '알림'}
              </Typography>
              <Tooltip title={t('notifications.markAllAsRead')}>
                <IconButton
                  size="small"
                  onClick={markAllRead}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider />
            {displayNotificationFeed.length === 0 ? (
              <Box sx={{ px: 2, py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {language === 'en' ? 'No notifications yet.' : '새 알림이 없습니다.'}
                </Typography>
              </Box>
            ) : (
              displayNotificationFeed.map((item) => (
                <MenuItem
                  key={item.id}
                  onClick={() => handleOpenNotificationDetail(item)}
                  sx={{
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    py: 1,
                    borderRadius: 1,
                    bgcolor: item.read ? 'transparent' : 'action.hover'
                  }}
                >
                  <ListItemIcon sx={{ mt: 0.25, minWidth: 24 }}>
                    <Chip
                      size="small"
                      label={getNotificationChipLabel(item, t)}
                      color={getNotificationChipColor(item)}
                      sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: '0.625rem' } }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <Box component="span" sx={{ display: 'inline-block' }}>
                        <Typography component="span" variant="body2" sx={{ display: 'block', color: 'text.primary' }}>
                          {item.message}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary">
                          {new Date(item.timestamp).toLocaleString(language === 'en' ? 'en-US' : 'ko-KR')}
                        </Typography>
                      </Box>
                    }
                    primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </MenuItem>
              ))
            )}
            <Divider sx={{ mt: displayNotificationFeed.length > 0 ? 0.5 : 0 }} />
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Tooltip title={t('notifications.openPage')}>
                <IconButton size="small" onClick={handleOpenNotificationsPage} color="primary">
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {displayNotificationFeed.length > 0 ? (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<DeleteSweepIcon />}
                  onClick={handleClearNotificationFeed}
                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                >
                  {t('notifications.clearAll')}
                </Button>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ pr: 0.5 }}>
                  {t('notifications.openPage')}
                </Typography>
              )}
            </Box>
          </Menu>

          <NotificationDetailDialog
            open={detailDialogOpen}
            notification={selectedNotification}
            onClose={() => {
              setDetailDialogOpen(false);
              setSelectedNotification(null);
            }}
            onNavigate={(href) => navigate(href)}
          />

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
                  {user?.role === 'root' ? 'Root' : user?.role || 'user'} • {user?.email || 'user@example.com'}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleOpenSettings} sx={{ fontSize: '0.75rem' }}>
              <SettingsIcon sx={{ mr: 1, fontSize: '0.875rem' }} />
              {t('common.settings')}
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
                backgroundColor: language === 'ko' ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              🇰🇷 {t('common.languageKo')}
            </MenuItem>
            <MenuItem 
              onClick={() => handleLanguageChange('en')} 
              sx={{ 
                fontSize: '0.75rem',
                backgroundColor: language === 'en' ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              🇺🇸 {t('common.languageEn')}
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      <FullMenuOverlay
        open={fullMenuOpen}
        onClose={() => setFullMenuOpen(false)}
        onLanguageClick={handleLanguageMenu}
      />
    </AppBar>
  );
};

export default Header;
