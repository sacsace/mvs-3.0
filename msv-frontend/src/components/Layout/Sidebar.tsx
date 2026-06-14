import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  IconButton,
  Tooltip,
  Link
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
  TrendingUp,
  MoveToInbox,
  PostAdd,
  QrCodeScanner,
  Business,
  Email
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { useStore, useMenuStore } from '../../store';
import menuService, { type Menu } from '../../services/menuService';
import { isRemovedNavMenuRoute } from '../../utils/isRemovedNavMenuRoute';

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

/** AppBar Toolbar 높이와 동일 */
const HEADER_HEIGHT_PX = 60;
/** 헤더 하단과 좌측 메뉴 패널 사이 여백 */
const HEADER_MENU_GAP_PX = 8;
const SIDEBAR_TOP_PX = HEADER_HEIGHT_PX + HEADER_MENU_GAP_PX;
/** 메뉴 패널 하단과 화면 맨 아래 사이 여백 */
const SIDEBAR_BOTTOM_GAP_PX = 12;
const SIDEBAR_HEIGHT_CALC = `calc(100vh - ${SIDEBAR_TOP_PX + SIDEBAR_BOTTOM_GAP_PX}px)`;
/** 접기/펼치기·본문 패딩과 동일한 easing */
export const SIDEBAR_WIDTH_TRANSITION_MS = 300;
export const SIDEBAR_WIDTH_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** 마우스 이탈 후 접기 — 살짝 여유를 두어 자연스럽게 */
const SIDEBAR_HOVER_CLOSE_DELAY_MS = 380;
/** 선택 영역·좌측 강조선 모서리 직각 */
const MENU_ITEM_RADIUS_PX = 10;

const normalizeMenuPath = (path: string) => {
  const [pathname] = String(path || '').trim().split(/[?#]/);
  if (!pathname) return '';
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
};

const isMenuRouteActive = (currentPath: string, route?: string) => {
  const normalizedCurrentPath = normalizeMenuPath(currentPath);
  const normalizedRoute = normalizeMenuPath(route || '');
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

const routeMatchesMenuPath = (currentPath: string, route?: string) =>
  isMenuRouteActive(currentPath, route);

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose: _onClose,
  width = 280,
  onWidthChange,
  autoCollapseEnabled = false,
  isCollapsed = false,
  collapsedWidth = 72,
  onCollapseChange
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(width);
  const [isResizing, setIsResizing] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const isExpandedVisual = !autoCollapseEnabled || !isCollapsed || peekOpen;
  const isCompact = autoCollapseEnabled && !isExpandedVisual;
  const effectiveWidth = isExpandedVisual ? sidebarWidth : collapsedWidth;
  const leaveTimerRef = useRef<number | null>(null);
  const peekCloseTimerRef = useRef<number | null>(null);

  // width prop이 변경되면 내부 state 업데이트
  useEffect(() => {
    if (!isResizing) {
      setSidebarWidth(width);
    }
  }, [width, isResizing]);

  // 리사이즈 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCompact) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [isCompact, sidebarWidth]);

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
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      if (peekCloseTimerRef.current) {
        window.clearTimeout(peekCloseTimerRef.current);
        peekCloseTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!autoCollapseEnabled) {
      setPeekOpen(false);
    }
  }, [autoCollapseEnabled]);

  const schedulePeekClose = useCallback(() => {
    if (peekCloseTimerRef.current) {
      window.clearTimeout(peekCloseTimerRef.current);
    }
    peekCloseTimerRef.current = window.setTimeout(() => {
      setPeekOpen(false);
      peekCloseTimerRef.current = null;
    }, SIDEBAR_WIDTH_TRANSITION_MS + 40);
  }, []);

  const handleSidebarMouseEnter = useCallback(() => {
    if (!autoCollapseEnabled) return;
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (peekCloseTimerRef.current) {
      window.clearTimeout(peekCloseTimerRef.current);
      peekCloseTimerRef.current = null;
    }
    setPeekOpen(true);
    if (isCollapsed) {
      onCollapseChange?.(false);
    }
  }, [autoCollapseEnabled, isCollapsed, onCollapseChange]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!autoCollapseEnabled) return;
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = window.setTimeout(() => {
      onCollapseChange?.(true);
      schedulePeekClose();
      leaveTimerRef.current = null;
    }, SIDEBAR_HOVER_CLOSE_DELAY_MS);
  }, [autoCollapseEnabled, onCollapseChange, schedulePeekClose]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useStore();
  const {
    menus,
    loading,
    error,
    language,
    setMenus,
    setUserPermissions,
    setLoading,
    setError
  } = useMenuStore();
  
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

  /** 공지·AI·레거시 보고서는 헤더/다른 경로로만 진입 — 사이드바에서 제외 */
  const menusWithoutNotice = useMemo((): Menu[] => {
    const isNoticeMenu = (m: Menu) =>
      String(m.route || '').startsWith('/communication') ||
      m.name_ko === '공지사항' ||
      m.name_ko === '커뮤니케이션' ||
      /^notices?$/i.test(String(m.name_en || '').trim()) ||
      /^communication$/i.test(String(m.name_en || '').trim());

    const isLegacyReportsRoot = (m: Menu) => {
      const route = normalizeMenuPath(m.route || '');
      return route === '/reports' || m.name_ko === '보고서';
    };

    const isAiMenu = (m: Menu) => {
      const route = String(m.route || '');
      if (route.startsWith('/ai')) return true;
      if (/^\/(cost-analysis|efficiency|forecasting|recommendations)(\/|$)/.test(route)) return true;
      if (m.name_ko === 'AI 분석') return true;
      if (/^ai\s*analysis$/i.test(String(m.name_en || '').trim())) return true;
      return false;
    };

    const filterRec = (items: Menu[]): Menu[] =>
      items
        .filter((x) => !isNoticeMenu(x) && !isAiMenu(x) && !isLegacyReportsRoot(x) && !isRemovedNavMenuRoute(x.route))
        .map((x) => {
          if (x.children?.length) {
            const children = filterRec(x.children);
            return children.length ? { ...x, children } : null;
          }
          return x;
        })
        .filter((x): x is Menu => x != null);

    return filterRec(menus || []);
  }, [menus]);

  const allMenuRoutes = useMemo(() => {
    const out: string[] = [];
    const walk = (items: Menu[]) => {
      for (const m of items) {
        if (m.route) out.push(String(m.route));
        if (m.children?.length) walk(m.children);
      }
    };
    walk(menusWithoutNotice || []);
    return out;
  }, [menusWithoutNotice]);

  const getLongestMatchingMenuRoute = (currentPath: string): string | null => {
    if (!normalizeMenuPath(currentPath)) return null;
    const matches = allMenuRoutes
      .map((r) => normalizeMenuPath(r))
      .filter((r) => r && routeMatchesMenuPath(currentPath, r));
    if (matches.length === 0) return null;
    return matches.reduce((a, b) => (a.length >= b.length ? a : b));
  };

  const isRouteExactMatch = (currentPath: string, route?: string) => {
    const normalizedCurrentPath = normalizeMenuPath(currentPath);
    const normalizedRoute = normalizeMenuPath(route || '');
    if (!normalizedCurrentPath || !normalizedRoute) return false;
    return normalizedCurrentPath === normalizedRoute;
  };

  /** 현재 URL에 해당하는 하위 메뉴가 있으면 그 경로까지의 부모 메뉴 id — 항상 펼침 */
  const ancestorIdsToKeepOpen = useMemo(() => {
    const currentPath = location.pathname;
    if (!normalizeMenuPath(currentPath) || !menusWithoutNotice?.length) return new Set<number>();

    const matches = allMenuRoutes
      .map((r) => normalizeMenuPath(r))
      .filter((r) => r && routeMatchesMenuPath(currentPath, r));
    if (matches.length === 0) return new Set<number>();
    const best = matches.reduce((a, b) => (a.length >= b.length ? a : b));

    const findChainToRoute = (items: Menu[], acc: Menu[]): Menu[] | null => {
      for (const m of items) {
        const nr = normalizeMenuPath(m.route || '');
        if (nr && nr === best) return [...acc, m];
        if (m.children?.length) {
          const found = findChainToRoute(m.children, [...acc, m]);
          if (found) return found;
        }
      }
      return null;
    };

    const chain = findChainToRoute(menusWithoutNotice, []);
    if (!chain?.length) return new Set<number>();

    return new Set(chain.slice(0, -1).map((m) => m.id));
  }, [location.pathname, menusWithoutNotice, allMenuRoutes]);

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
      view_kanban: <ViewKanban />,
      move_to_inbox: <MoveToInbox />,
      post_add: <PostAdd />,
      qr_code_scanner: <QrCodeScanner />
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
    if (normalized.includes('/basic-info/mail-send-test')) return <Email />;

    if (normalized.includes('/hr/users')) return <Person />;
    if (normalized.includes('/hr/departments')) return <Business />;
    if (normalized.includes('/hr/attendance/statistics')) return <Assessment />;
    if (normalized.includes('/hr/attendance')) return <EventAvailable />;
    if (normalized.includes('/hr/payroll')) return <AttachMoney />;
    if (normalized.includes('/hr/leave')) return <EventAvailable />;
    if (normalized.includes('/hr/employment-contracts')) return <Description />;

    if (normalized.includes('/work/projects')) return <ViewKanban />;
    if (normalized.includes('/work/statistics')) return <Assessment />;
    if (normalized.includes('/work/approval')) return <Description />;
    if (normalized.includes('/work/room-reservation')) return <LocalShipping />;
    if (normalized.includes('/work/reports')) return <ReceiptLong />;

    if (normalized.includes('/hotel/front-desk')) return <Dashboard />;
    if (normalized.includes('/hotel/housekeeping')) return <Category />;
    if (normalized.includes('/hotel/fnb')) return <Receipt />;
    if (normalized.includes('/hotel/reservations')) return <EventAvailable />;
    if (normalized.includes('/hotel/room-types')) return <Inventory />;

    if (normalized.includes('/inventory/stock-in')) return <PostAdd />;
    if (normalized.includes('/inventory/stock-out')) return <QrCodeScanner />;
    if (normalized.includes('/inventory/basic')) return <Inventory />;
    if (normalized.includes('/inventory/status')) return <Assessment />;
    if (normalized.includes('/inventory/transaction')) return <AttachMoney />;
    if (normalized.includes('/inventory/report')) return <ReceiptLong />;

    if (normalized.includes('/accounting/e-invoice')) return <ReceiptLong />;
    if (normalized.includes('/accounting/eway-bill')) return <LocalShipping />;
    if (normalized.includes('/accounting/expense')) return <AttachMoney />;
    if (normalized.includes('/accounting/budget')) return <AttachMoney />;
    if (normalized.includes('/accounting/assets')) return <AccountBalance />;
    if (normalized.includes('/accounting/statistics')) return <Assessment />;
    if (normalized.includes('/accounting/basic-info')) return <Settings />;

    if (normalized.includes('/customers/contracts')) return <Description />;

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
      if (!user) {
        setLoading(false);
        setMenus([]);
        setUserPermissions([]);
        return;
      }

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

  // 메뉴 확장/축소 토글 (현재 페이지가 속한 섹션은 접지 않음)
  const handleMenuToggle = (menuId: number) => {
    if (ancestorIdsToKeepOpen.has(menuId)) {
      return;
    }
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

  // 메뉴 렌더링
  const renderMenuItem = (menu: any, level: number = 0) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = ancestorIdsToKeepOpen.has(menu.id) || expandedMenus.has(menu.id);
    // 하위 메뉴 선택 시 상위 메뉴가 함께 활성화되지 않도록 분리 처리
    const isActive = hasChildren
      ? isRouteExactMatch(location.pathname, menu.route)
      : (() => {
          const best = getLongestMatchingMenuRoute(location.pathname);
          const nr = normalizeMenuPath(menu.route || '');
          return !!nr && best === nr;
        })();
    const isCompactItem = isCompact;
    const isEnglish = language === 'en';
    const itemPaddingY = level === 0 ? (isEnglish ? 0.5 : 0.4) : (isEnglish ? 0.72 : 0.58);
    const activePaddingBoost = level === 0 ? 0.06 : 0.1;
    const activePaddingY = itemPaddingY + activePaddingBoost;
    const topLevelMinHeight = isEnglish ? 42 : 41;
    const labelText =
      language === 'ko' && menu.name_ko === '지출보고서'
        ? '지출결의서'
        : language === 'ko'
          ? menu.name_ko
          : String(menu.name_en ?? '').trim() || menu.name_ko;
    const hideSecondaryDescription =
      menu.route === '/hotel' ||
      String(menu.route || '').startsWith('/ai') ||
      String(menu.route || '').startsWith('/communication/notice') ||
      menu.name_ko === '공지사항';
    
    return (
      <React.Fragment key={menu.id}>
        <ListItem disablePadding>
          {isCompactItem ? (
            <Tooltip title={labelText} placement="right">
              <ListItemButton
                onClick={() => handleMenuClick(menu)}
                sx={(theme) => ({
                  pl: 1,
                  py: isActive ? activePaddingY : itemPaddingY,
                  justifyContent: 'center',
                  borderRadius: MENU_ITEM_RADIUS_PX,
                  borderLeft: 'none',
                  backgroundColor: isActive ? '#EAF2FF' : 'transparent',
                  color: isActive ? '#007A83' : '#4B5563',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: isActive ? '#E0EBFA' : theme.palette.action.hover,
                    transform: 'translateY(-1px)',
                  },
                })}
              >
                <ListItemIcon
                  sx={(theme) => ({
                    color: isActive ? 'primary.main' : alpha(theme.palette.text.primary, 0.45),
                    minWidth: '24px',
                    '& .MuiSvgIcon-root': {
                      fontSize: '1rem',
                    },
                  })}
                >
                  {getContextualMenuIcon(menu, level)}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton
              onClick={() => handleMenuClick(menu)}
              sx={(theme) => ({
                pl: 2 + level * 2,
                py: isActive ? activePaddingY : itemPaddingY,
                minHeight: level === 0 ? topLevelMinHeight : 'auto',
                borderRadius: MENU_ITEM_RADIUS_PX,
                borderLeft: 'none',
                backgroundColor: isActive ? '#EAF2FF' : 'transparent',
                color: isActive ? '#007A83' : '#4B5563',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: isActive ? '#E0EBFA' : theme.palette.action.hover,
                  transform: 'translateY(-1px)',
                },
              })}
            >
              <ListItemIcon
                sx={(theme) => ({
                  color: isActive ? 'primary.main' : alpha(theme.palette.text.primary, 0.45),
                  minWidth: '36px',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1rem',
                  },
                })}
              >
                {getContextualMenuIcon(menu, level)}
              </ListItemIcon>
              <ListItemText 
                primary={labelText}
                secondary={level === 0 && !hideSecondaryDescription ? menu.description : null}
                sx={{ 
                  my: level === 0 ? (isEnglish ? 0.08 : 0) : (isEnglish ? 0.14 : 0.08),
                  opacity: isExpandedVisual ? 1 : 0,
                  transform: isExpandedVisual ? 'translateX(0)' : 'translateX(-6px)',
                  transition: `opacity ${SIDEBAR_WIDTH_TRANSITION_MS - 80}ms ${SIDEBAR_WIDTH_EASING} 70ms, transform ${SIDEBAR_WIDTH_TRANSITION_MS - 80}ms ${SIDEBAR_WIDTH_EASING} 70ms`,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  '& .MuiListItemText-primary': {
                    fontSize: '13px',
                    fontWeight: isActive ? 500 : 400,
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
        
        {hasChildren && !isCompactItem && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {menu.children.map((child: any) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawerPaperSx = {
    width: effectiveWidth,
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    top: `${SIDEBAR_TOP_PX}px`,
    left: 0,
    height: SIDEBAR_HEIGHT_CALC,
    minHeight: SIDEBAR_HEIGHT_CALC,
    backgroundColor: '#F7F8FA',
    borderRight: '1px solid #C5CED9',
    zIndex: autoCollapseEnabled && peekOpen && isCollapsed ? 1300 : 1200,
    willChange: 'width, box-shadow',
    overflowX: 'hidden' as const,
    boxShadow:
      autoCollapseEnabled && peekOpen
        ? '8px 0 28px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.04)'
        : 'none',
    transition: isResizing
      ? 'none'
      : `width ${SIDEBAR_WIDTH_TRANSITION_MS}ms ${SIDEBAR_WIDTH_EASING}, box-shadow ${SIDEBAR_WIDTH_TRANSITION_MS}ms ${SIDEBAR_WIDTH_EASING}`,
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
              ...drawerPaperSx,
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
              ...drawerPaperSx,
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
      sx={{
        position: 'relative',
        width:
          effectiveWidth +
          (autoCollapseEnabled && isCollapsed && !peekOpen ? 12 : 0),
        flexShrink: 0,
        transition: isResizing
          ? 'none'
          : `width ${SIDEBAR_WIDTH_TRANSITION_MS}ms ${SIDEBAR_WIDTH_EASING}`,
      }}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      <Drawer
        variant="permanent"
        open={true}
        sx={{
          width: effectiveWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
      {/* 메뉴 리스트 - 헤더 바로 아래부터 시작, 전체 높이 사용 */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        backgroundColor: '#F7F8FA',
        p: 1.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <List sx={{ flexGrow: 1, p: 0 }}>
          {menusWithoutNotice
            .filter((menu: Menu) => {
              // 시스템관리 메뉴 제외 (기본정보관리의 시스템 설정과 동일한 기능)
              const menuName = language === 'ko' ? menu.name_ko : menu.name_en;
              return menuName !== '시스템관리' && menuName !== 'System Management';
            })
            .map((menu: Menu) => renderMenuItem(menu))}
        </List>
        
        {/* 저작권 정보 - 메뉴 영역 내부 하단 고정 */}
        <Box sx={{ 
          mt: 'auto', 
          p: 2, 
          textAlign: 'center',
          backgroundColor: '#F7F8FA',
          flexShrink: 0,
          position: 'relative'
        }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              fontSize: '0.75rem',
              opacity: isExpandedVisual ? 0.7 : 0,
              display: 'block',
              transition: `opacity ${SIDEBAR_WIDTH_TRANSITION_MS - 60}ms ${SIDEBAR_WIDTH_EASING} 90ms`,
            }}
          >
            © {new Date().getFullYear()}{' '}
            <Link
              href="https://www.msventures.in"
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              color="inherit"
              sx={{
                fontSize: 'inherit',
                cursor: 'pointer',
                '&:hover': {
                  color: 'inherit',
                  textDecoration: 'none',
                },
                '&:visited': {
                  color: 'inherit',
                },
              }}
            >
              Minsub Ventures
            </Link>
          </Typography>
        </Box>
      </Box>
      </Drawer>
      {/* 리사이즈 핸들 */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'fixed',
          top: `${SIDEBAR_TOP_PX}px`,
          left: effectiveWidth - 4,
          width: '8px',
          height: SIDEBAR_HEIGHT_CALC,
          cursor: isCompact ? 'default' : 'col-resize',
          zIndex: 1201,
          backgroundColor: 'transparent',
          transition: isResizing
            ? 'none'
            : `left ${SIDEBAR_WIDTH_TRANSITION_MS}ms ${SIDEBAR_WIDTH_EASING}`,
          '&:hover': {
            backgroundColor: isCompact ? 'transparent' : 'rgba(0, 0, 0, 0.05)',
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
            backgroundColor: 'rgba(10, 110, 125, 0.1)',
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