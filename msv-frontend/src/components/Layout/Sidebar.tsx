import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Typography,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  Description,
  Receipt,
  ReceiptLong,
  LocalShipping,
  People,
  AccountBalance,
  Assessment,
  Person,
  Settings,
  Notifications,
  Psychology,
  Chat,
  AttachMoney,
  EventAvailable,
  Category,
  ViewKanban,
  TrendingUp
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore, useMenuStore } from '../../store';
import menuService from '../../services/menuService';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  autoCollapseEnabled?: boolean;
  isCollapsed?: boolean;
  collapsedWidth?: number;
  onCollapseChange?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  width = 280,
  onWidthChange,
  autoCollapseEnabled = false,
  isCollapsed = false,
  collapsedWidth = 72,
  onCollapseChange
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(width);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const effectiveWidth = autoCollapseEnabled && isCollapsed ? collapsedWidth : sidebarWidth;
  const hoverTimerRef = useRef<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  // width prop이 변경되면 내부 state 업데이트
  useEffect(() => {
    if (!isResizing) {
      setSidebarWidth(width);
    }
  }, [width, isResizing]);

  // 리사이즈 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (autoCollapseEnabled && isCollapsed) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [autoCollapseEnabled, isCollapsed, sidebarWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // requestAnimationFrame으로 부드러운 업데이트
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      const diff = e.clientX - startXRef.current; // 오른쪽으로 드래그하면 양수 (사이드바 확대), 왼쪽으로 드래그하면 음수 (사이드바 축소)
      const minWidth = 200; // 최소 너비
      const maxWidth = 500; // 최대 너비
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + diff));
      setSidebarWidth(newWidth);
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    });
  }, [isResizing, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };
  }, []);
  // 사이드바 닫기 기능 비활성화
  const handleClose = () => {
    // 사이드바가 닫히지 않도록 빈 함수로 설정
  };
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useStore();
  const { 
    menus, 
    userPermissions, 
    loading, 
    error, 
    language,
    setMenus, 
    setUserPermissions, 
    setLoading, 
    setError,
    hasMenuPermission 
  } = useMenuStore();
  
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

  // 아이콘 매핑
  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactElement } = {
      dashboard: <Dashboard />,
      inventory: <Inventory />,
      description: <Description />,
      receipt_long: <ReceiptLong />,
      receipt: <Receipt />,
      local_shipping: <LocalShipping />,
      people: <People />,
      account_balance: <AccountBalance />,
      assessment: <Assessment />,
      person: <Person />,
      settings: <Settings />,
      notifications: <Notifications />,
      psychology: <Psychology />,
      chat: <Chat />,
      attach_money: <AttachMoney />,
      event_available: <EventAvailable />,
      category: <Category />,
      view_kanban: <ViewKanban />
    };
    return iconMap[iconName] || <MenuIcon />;
  };

  const getSubmenuIconByRoute = (route: string) => {
    const normalized = String(route || '').toLowerCase();
    if (normalized.includes('/basic-info/company')) return <AccountBalance />;
    if (normalized.includes('/basic-info/partners')) return <People />;
    if (normalized.includes('/basic-info/organization')) return <Category />;
    if (normalized.includes('/basic-info/menu-permissions')) return <Settings />;
    if (normalized.includes('/basic-info/login-info')) return <Person />;
    if (normalized.includes('/basic-info/system-settings')) return <Settings />;

    if (normalized.includes('/hr/users')) return <Person />;
    if (normalized.includes('/hr/attendance')) return <EventAvailable />;
    if (normalized.includes('/hr/payroll')) return <AttachMoney />;
    if (normalized.includes('/hr/leave')) return <EventAvailable />;
    if (normalized.includes('/hr/performance')) return <Assessment />;

    if (normalized.includes('/work/projects')) return <ViewKanban />;
    if (normalized.includes('/work/statistics')) return <Assessment />;
    if (normalized.includes('/work/approval')) return <Description />;
    if (normalized.includes('/work/meeting-room')) return <EventAvailable />;
    if (normalized.includes('/work/room-reservation')) return <LocalShipping />;
    if (normalized.includes('/work/reports')) return <ReceiptLong />;

    if (normalized.includes('/hotel/front-desk')) return <Dashboard />;
    if (normalized.includes('/hotel/housekeeping')) return <Category />;
    if (normalized.includes('/hotel/fnb')) return <Receipt />;
    if (normalized.includes('/hotel/reservations')) return <EventAvailable />;
    if (normalized.includes('/hotel/room-types')) return <Inventory />;

    if (normalized.includes('/inventory/basic')) return <Inventory />;
    if (normalized.includes('/inventory/status')) return <Assessment />;
    if (normalized.includes('/inventory/transaction')) return <AttachMoney />;
    if (normalized.includes('/inventory/movement')) return <LocalShipping />;
    if (normalized.includes('/inventory/report')) return <ReceiptLong />;

    if (normalized.includes('/accounting/e-invoice')) return <ReceiptLong />;
    if (normalized.includes('/accounting/eway-bill')) return <LocalShipping />;
    if (normalized.includes('/accounting/expense')) return <AttachMoney />;
    if (normalized.includes('/accounting/budget')) return <AttachMoney />;
    if (normalized.includes('/accounting/assets')) return <AccountBalance />;
    if (normalized.includes('/accounting/statistics')) return <Assessment />;
    if (normalized.includes('/accounting/basic-info')) return <Settings />;

    if (normalized.includes('/customers/sales')) return <TrendingUp />;
    if (normalized.includes('/customers/contracts')) return <Description />;
    if (normalized.includes('/customers/support')) return <Chat />;

    if (normalized.includes('/communication/notice')) return <Notifications />;
    if (normalized.includes('/communication/email')) return <Chat />;
    if (normalized.includes('/communication/sms')) return <Notifications />;

    if (normalized.includes('/ai/')) return <Psychology />;
    if (normalized.includes('/reports/')) return <Assessment />;

    // 상위 메뉴(섹션) 라우트 매핑
    if (normalized.startsWith('/basic-info')) return <Settings />;
    if (normalized.startsWith('/hr')) return <People />;
    if (normalized.startsWith('/work')) return <ViewKanban />;
    if (normalized.startsWith('/hotel')) return <Dashboard />;
    if (normalized.startsWith('/inventory')) return <Inventory />;
    if (normalized.startsWith('/accounting')) return <AttachMoney />;
    if (normalized.startsWith('/customers')) return <TrendingUp />;
    if (normalized.startsWith('/communication')) return <Notifications />;
    if (normalized.startsWith('/ai')) return <Psychology />;
    if (normalized.startsWith('/reports')) return <Assessment />;
    return null;
  };

  const getContextualMenuIcon = (menu: any, level: number) => {
    const defaultIcon = getIcon(menu.icon);
    const routeIcon = getSubmenuIconByRoute(String(menu.route || ''));
    if (routeIcon) return routeIcon;

    const ko = String(menu.name_ko || '');
    const en = String(menu.name_en || '').toLowerCase();
    if (ko.includes('기초') || en.includes('basic')) return <Settings />;
    if (ko.includes('인사') || en.includes('hr')) return <People />;
    if (ko.includes('업무') || en.includes('work')) return <ViewKanban />;
    if (ko.includes('호텔') || en.includes('hotel')) return <Dashboard />;
    if (ko.includes('회사') || en.includes('company')) return <AccountBalance />;
    if (ko.includes('파트너') || ko.includes('고객') || en.includes('partner') || en.includes('customer')) return <People />;
    if (ko.includes('재고') || en.includes('inventory')) return <Inventory />;
    if (ko.includes('결재') || ko.includes('전자결재') || en.includes('approval')) return <Description />;
    if (ko.includes('매출') || ko.includes('통계') || en.includes('sales') || en.includes('statistics')) return <TrendingUp />;
    if (ko.includes('회계') || en.includes('accounting')) return <AttachMoney />;
    if (ko.includes('커뮤니케이션') || en.includes('communication')) return <Notifications />;
    if (ko.includes('ai') || en.includes('ai')) return <Psychology />;
    if (ko.includes('리포트') || en.includes('report')) return <Assessment />;
    if (ko.includes('설정') || en.includes('setting')) return <Settings />;
    if (ko.includes('공지') || en.includes('notice')) return <Notifications />;
    if (level === 0) return defaultIcon;
    return defaultIcon;
  };

  // 메뉴 데이터 로드 (재시도 로직 포함)
  useEffect(() => {
    const loadMenus = async (retryCount = 0) => {
      if (!user) return;
      
      setLoading(true);
      try {
        const [menusResponse, permissionsResponse] = await Promise.all([
          menuService.getUserMenus(user.id, user.tenant_id, language),
          menuService.getUserPermissions(user.id)
        ]);
        
        if (menusResponse.success) {
          setMenus(menusResponse.data);
        }
        
        if (permissionsResponse.success) {
          setUserPermissions(permissionsResponse.data);
        }
        
        // 성공 시 에러 초기화
        setError(null);
      } catch (error: any) {
        console.error('메뉴 로드 오류:', error);
        
        // 429 오류인 경우 재시도
        if (error.response?.status === 429 && retryCount < 3) {
          console.log(`Rate limit 오류, ${(retryCount + 1) * 2}초 후 재시도...`);
          setTimeout(() => {
            loadMenus(retryCount + 1);
          }, (retryCount + 1) * 2000); // 2초, 4초, 6초 후 재시도
          return;
        }
        
        setError('메뉴를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, [user, language, setMenus, setUserPermissions, setLoading, setError]);

  // 언어 변경 감지
  useEffect(() => {
    console.log('언어 변경됨:', language);
  }, [language]);

  // 메뉴 확장/축소 토글
  const handleMenuToggle = (menuId: number) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  // 메뉴 클릭 처리
  const handleMenuClick = (menu: any) => {
    if (menu.children && menu.children.length > 0) {
      handleMenuToggle(menu.id);
    } else if (menu.route) {
      navigate(menu.route);
      // 사이드바 닫기 비활성화 (데스크톱에서 항상 열린 상태 유지)
    }
  };

  const normalizePath = (path: string) => {
    const [pathname] = String(path || '').trim().split(/[?#]/);
    if (!pathname) return '';
    if (pathname === '/') return '/';
    return pathname.replace(/\/+$/, '');
  };

  const isRouteActive = (currentPath: string, route?: string) => {
    const normalizedCurrentPath = normalizePath(currentPath);
    const normalizedRoute = normalizePath(route || '');
    if (!normalizedCurrentPath || !normalizedRoute) return false;

    const routeCandidates = new Set<string>([normalizedRoute]);
    if (normalizedRoute === '/communication/notice') routeCandidates.add('/communication/notices');
    if (normalizedRoute === '/communication/notices') routeCandidates.add('/communication/notice');

    return Array.from(routeCandidates).some((candidate) => {
      if (!candidate) return false;
      return (
        normalizedCurrentPath === candidate ||
        normalizedCurrentPath.startsWith(`${candidate}/`)
      );
    });
  };

  const isRouteExactMatch = (currentPath: string, route?: string) => {
    const normalizedCurrentPath = normalizePath(currentPath);
    const normalizedRoute = normalizePath(route || '');
    if (!normalizedCurrentPath || !normalizedRoute) return false;
    return normalizedCurrentPath === normalizedRoute;
  };

  // 메뉴 렌더링
  const renderMenuItem = (menu: any, level: number = 0) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedMenus.has(menu.id);
    // 하위 메뉴 선택 시 상위 메뉴가 함께 활성화되지 않도록 분리 처리
    const isActive = hasChildren
      ? isRouteExactMatch(location.pathname, menu.route)
      : isRouteActive(location.pathname, menu.route);
    const isCompact = autoCollapseEnabled && isCollapsed;
    const isEnglish = language === 'en';
    const itemPaddingY = level === 0 ? (isEnglish ? 0.33 : 0.18) : (isEnglish ? 0.66 : 0.5);
    const activePaddingBoost = level === 0 ? 0.09 : 0.14;
    const activePaddingY = itemPaddingY + activePaddingBoost;
    const topLevelMinHeight = isEnglish ? 42 : 41;
    const labelText =
      language === 'ko' && menu.name_ko === '지출보고서'
        ? '지출결의서'
        : (language === 'ko' ? menu.name_ko : menu.name_en);
    const hideSecondaryDescription =
      menu.route === '/hotel' ||
      String(menu.route || '').startsWith('/ai') ||
      String(menu.route || '').startsWith('/communication/notice') ||
      menu.name_ko === '공지사항';
    
    return (
      <React.Fragment key={menu.id}>
        <ListItem disablePadding>
          {isCompact ? (
            <Tooltip title={labelText} placement="right">
              <ListItemButton
                onClick={() => handleMenuClick(menu)}
                sx={{
                  pl: 1,
                  py: isActive ? activePaddingY : itemPaddingY,
                  justifyContent: 'center',
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: isActive ? 'primary.contrastText' : 'inherit',
                  minWidth: '24px',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.1rem'
                  }
                }}>
                  {getContextualMenuIcon(menu, level)}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton
              onClick={() => handleMenuClick(menu)}
              sx={{
                pl: 2 + level * 2,
                py: isActive ? activePaddingY : itemPaddingY,
                minHeight: level === 0 ? topLevelMinHeight : 'auto',
                backgroundColor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  backgroundColor: isActive ? 'primary.dark' : 'action.hover'
                }
              }}
            >
              <ListItemIcon sx={{ 
                color: isActive ? 'primary.contrastText' : 'inherit',
                minWidth: '36px', // 아이콘 영역 축소
                '& .MuiSvgIcon-root': {
                  fontSize: '1.1rem' // 아이콘 크기 축소
                }
              }}>
                {getContextualMenuIcon(menu, level)}
              </ListItemIcon>
              <ListItemText 
                primary={labelText}
                secondary={level === 0 && !hideSecondaryDescription ? menu.description : null}
                sx={{ 
                  my: level === 0 ? (isEnglish ? 0.08 : 0) : (isEnglish ? 0.14 : 0.08),
                  '& .MuiListItemText-primary': {
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: level === 0 ? (isEnglish ? 1.2 : 0.94) : (isEnglish ? 1.28 : 1.12)
                  },
                  '& .MuiListItemText-secondary': {
                    fontSize: '0.7rem',
                    lineHeight: isEnglish ? 1.26 : 1.105,
                    color: 'text.secondary',
                    mt: isEnglish ? 0.45 : 0.34
                  }
                }}
              />
              {hasChildren && (
                <IconButton size="small" onClick={(e) => {
                  e.stopPropagation();
                  handleMenuToggle(menu.id);
                }}>
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </ListItemButton>
          )}
        </ListItem>
        
        {hasChildren && !isCompact && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {menu.children.map((child: any) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <Box sx={{ position: 'relative' }}>
        <Drawer
          variant="permanent"
          open={true}
          sx={{
            width: effectiveWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: effectiveWidth,
              boxSizing: 'border-box',
              position: 'fixed',
              top: '56px',
              left: 0,
              height: 'calc(100vh - 56px)',
              backgroundColor: 'background.paper',
              borderRight: 'none',
              transition: 'none',
            }
          }}
        >
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography>메뉴 로딩 중...</Typography>
          </Box>
        </Drawer>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ position: 'relative' }}>
        <Drawer
          variant="permanent"
          open={true}
          sx={{
            width: effectiveWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: effectiveWidth,
              boxSizing: 'border-box',
              position: 'fixed',
              top: '56px',
              left: 0,
              height: 'calc(100vh - 56px)',
              backgroundColor: 'background.paper',
              borderRight: 'none',
              transition: 'none',
            }
          }}
        >
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        </Drawer>
      </Box>
    );
  }

  return (
    <Box
      sx={{ position: 'relative' }}
      onMouseEnter={() => {
        if (!autoCollapseEnabled) return;
        if (leaveTimerRef.current) {
          window.clearTimeout(leaveTimerRef.current);
          leaveTimerRef.current = null;
        }
        if (hoverTimerRef.current) {
          window.clearTimeout(hoverTimerRef.current);
        }
        hoverTimerRef.current = window.setTimeout(() => {
          onCollapseChange?.(false);
        }, 170);
      }}
      onMouseLeave={() => {
        if (!autoCollapseEnabled) return;
        if (hoverTimerRef.current) {
          window.clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = null;
        }
        if (leaveTimerRef.current) {
          window.clearTimeout(leaveTimerRef.current);
        }
        leaveTimerRef.current = window.setTimeout(() => {
          onCollapseChange?.(true);
        }, 260);
      }}
    >
      <Drawer
        variant="permanent"
        open={true}
        sx={{
          width: effectiveWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: effectiveWidth,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed', // 고정 위치로 변경하여 동적 높이 조정
            top: '56px', // 헤더 아래에서 시작
            left: 0,
            height: 'calc(100vh - 56px)', // 헤더 높이 제외한 나머지 높이
            minHeight: 'calc(100vh - 56px)', // 최소 높이 보장
            backgroundColor: 'background.paper',
            borderRight: 'none',
            boxShadow: 'none',
            zIndex: 1200, // 헤더보다 낮은 z-index
            willChange: 'width',
            transition: isResizing ? 'none' : 'width 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          }
        }}
      >
      {/* 메뉴 리스트 - 헤더 바로 아래부터 시작, 전체 높이 사용 */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        backgroundColor: 'background.paper',
        pt: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <List sx={{ flexGrow: 1, px: 1 }}>
          {menus
            .filter((menu) => {
              // 시스템관리 메뉴 제외 (기본정보관리의 시스템 설정과 동일한 기능)
              const menuName = language === 'ko' ? menu.name_ko : menu.name_en;
              return menuName !== '시스템관리' && menuName !== 'System Management';
            })
            .map((menu) => renderMenuItem(menu))}
        </List>
        
        {/* 저작권 정보 - 메뉴 영역 내부 하단 고정 */}
        <Box sx={{ 
          mt: 'auto', 
          p: 2, 
          textAlign: 'center',
          backgroundColor: 'background.paper',
          flexShrink: 0,
          position: 'relative'
        }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              fontSize: '0.75rem',
              opacity: 0.7,
              display: 'block'
            }}
          >
            © 2025 Minsub Ventures
          </Typography>
        </Box>
      </Box>
      </Drawer>
      {/* 리사이즈 핸들 */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'fixed',
          top: '56px',
          left: effectiveWidth - 4,
          width: '8px',
          height: 'calc(100vh - 56px)',
          cursor: autoCollapseEnabled && isCollapsed ? 'default' : 'col-resize',
          zIndex: 1201,
          backgroundColor: 'transparent',
          transition: isResizing ? 'none' : 'left 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          '&:hover': {
            backgroundColor: autoCollapseEnabled && isCollapsed ? 'transparent' : 'rgba(0, 0, 0, 0.05)',
            '&::after': {
              content: '""',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '40px',
              backgroundColor: 'primary.main',
              borderRadius: '1px',
            }
          },
          ...(isResizing && {
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            '&::after': {
              content: '""',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '40px',
              backgroundColor: 'primary.main',
              borderRadius: '1px',
            }
          })
        }}
      />
    </Box>
  );
};

export default Sidebar;