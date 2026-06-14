import React, { useState, useEffect, useCallback } from 'react';
import { Box, Alert, Typography, Button, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar, { SIDEBAR_WIDTH_EASING, SIDEBAR_WIDTH_TRANSITION_MS } from './Sidebar';
import { useStore, useMenuStore } from '../../store';
import { userUiPreferencesService } from '../../services/api';
import i18n from '../../locales/i18n';
import { mvsPageShellSx, mvsWorkBoardPageBg } from '../../theme/mvsLayout';

/** 서버 prefs의 ko가 클라이언트 영어 선택보다 늦게 도착할 때 UI 언어를 덮어쓰지 않음 */
function shouldApplyPrefsLanguage(prefsLang: 'ko' | 'en', current: 'ko' | 'en'): boolean {
  if (current === 'en' && prefsLang === 'ko') return false;
  return true;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

/** 사이드바·흰 작업 카드 좌우 간격(px) */
const WORK_AREA_OUTSET = 16;
/** Sidebar.tsx `HEADER_MENU_GAP_PX` 와 동일 — 헤더~좌측메뉴 / 헤더~본문 상단 회색 띠 */
const HEADER_MENU_GAP_PX = 8;
/** Toolbar와 동일 — 고정 헤더용 레이아웃 스페이서 높이 */
const HEADER_LAYOUT_HEIGHT = 60;

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [autoCollapseEnabled, setAutoCollapseEnabled] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const collapsedWidth = 72;
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const { menus, hasMenuPermission, setLanguage, loading: menusLoading } = useMenuStore();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // 사이드바 너비 변경 핸들러
  const handleSidebarWidthChange = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
    userUiPreferencesService.patch({ sidebarWidth: newWidth }).catch(() => {});
  }, []);

  const handleSidebarToggle = () => {
    // 사이드바 토글 비활성화 - 항상 열린 상태 유지
    // setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleAutoCollapseChange = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed?: boolean }>).detail;
      if (detail && typeof detail.collapsed === 'boolean') {
        setAutoCollapseEnabled(detail.collapsed);
      }
    };

    window.addEventListener('mvs-sidebar-auto-collapse', handleAutoCollapseChange as EventListener);
    return () => {
      window.removeEventListener('mvs-sidebar-auto-collapse', handleAutoCollapseChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    userUiPreferencesService
      .get()
      .then((prefs) => {
        if (cancelled) return;
        if (typeof prefs.sidebarWidth === 'number' && prefs.sidebarWidth >= 200 && prefs.sidebarWidth <= 480) {
          setSidebarWidth(prefs.sidebarWidth);
        }
        if (typeof prefs.sidebarAutoCollapse === 'boolean') {
          setAutoCollapseEnabled(prefs.sidebarAutoCollapse);
        }
        if (prefs.language === 'ko' || prefs.language === 'en') {
          const current = useMenuStore.getState().language;
          if (!shouldApplyPrefsLanguage(prefs.language, current)) {
            void i18n.changeLanguage(current);
            return;
          }
          setLanguage(prefs.language);
          void i18n.changeLanguage(prefs.language);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, setLanguage]);

  useEffect(() => {
    setIsSidebarCollapsed(autoCollapseEnabled);
  }, [autoCollapseEnabled]);

  const findMenuByRoute = useCallback(
    (route: string): number | null => {
      const normalizedRoute = route.replace(/^\/+|\/+$/g, '');

      const findMenu = (menuList: any[]): any | null => {
        for (const menu of menuList) {
          if (!menu.route) {
            if (menu.children && menu.children.length > 0) {
              const found = findMenu(menu.children);
              if (found) return found;
            }
            continue;
          }

          const normalizedMenuRoute = menu.route.replace(/^\/+|\/+$/g, '');

          if (normalizedMenuRoute === normalizedRoute) {
            return menu;
          }

          if (menu.children && menu.children.length > 0) {
            const found = findMenu(menu.children);
            if (found) return found;
          }

          if (normalizedRoute.startsWith(normalizedMenuRoute + '/')) {
            return menu;
          }
        }
        return null;
      };
      const menu = findMenu(menus);
      return menu ? menu.id : null;
    },
    [menus]
  );

  // 메뉴 권한 체크
  useEffect(() => {
    const checkMenuPermission = () => {
      // 로그인 페이지는 체크하지 않음
      if (location.pathname === '/login') {
        setHasAccess(true);
        return;
      }

      // root만 모든 메뉴 접근 가능 (admin도 권한 체크 필요)
      if (user?.role === 'root') {
        setHasAccess(true);
        return;
      }

      // 대시보드는 항상 접근 가능
      if (location.pathname === '/dashboard' || 
          location.pathname.startsWith('/dashboard/')) {
        setHasAccess(true);
        return;
      }

      // 현재 경로에 해당하는 메뉴 찾기
      const menuId = findMenuByRoute(location.pathname);

      if (!menuId) {
        // 메뉴를 찾을 수 없으면 접근 차단 (보안상 안전하게 처리)
        // 단, 대시보드나 로그인 페이지가 아닌 경우에만 차단
        console.warn('⚠️ [권한 체크] 메뉴를 찾을 수 없음:', location.pathname);
        setHasAccess(false);
        return;
      }

      // view 권한 체크
      const canView = hasMenuPermission(menuId, 'view');

      setHasAccess(canView);
    };

    // 메뉴 트리가 비어 있으면 Sidebar fetch 전/직후일 수 있음 → false로 두면 "권한 없음"이 한 프레임 깜빡임
    if (menus.length > 0) {
      checkMenuPermission();
    } else if (menusLoading) {
      setHasAccess(null);
    } else {
      if (user?.role === 'root') {
        setHasAccess(true);
      } else {
        checkMenuPermission();
      }
    }
  }, [location.pathname, menus, menusLoading, hasMenuPermission, user?.role, findMenuByRoute]);

  const contentInsetLeft =
    (autoCollapseEnabled && isSidebarCollapsed ? collapsedWidth : sidebarWidth) + WORK_AREA_OUTSET;

  const isWorkBoardChromeless =
    location.pathname === '/work/projects' ||
    /^\/work\/projects\/\d+$/.test(location.pathname);

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: isWorkBoardChromeless ? 'transparent' : 'bodyArea.main',
        ...(isWorkBoardChromeless
          ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
          : {}),
        fontFamily: 'var(--font-sans)',
        // CSS 변수로 사이드바 너비 정의
        '--sidebar-width': '280px',
        '--sidebar-width-mobile': '240px',
        '--sidebar-width-tablet': '260px',
      }}
    >
      {/* 헤더 - 최상단 (fixed라 문서 높이 0 → 아래 스페이서로 본문 시작 위치 확보) */}
      <Header />
      <Box
        aria-hidden
        sx={{
          height: HEADER_LAYOUT_HEIGHT,
          flexShrink: 0,
          width: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* 메인 컨테이너 - 스페이서 아래부터 = 헤더와 겹치지 않음 */}
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isWorkBoardChromeless ? 'transparent' : 'bodyArea.main',
        ...(isWorkBoardChromeless
          ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
          : {}),
        }}
      >
        {/* 사이드바 - 절대 위치로 고정 */}
        <Sidebar 
          open={sidebarOpen} 
          onClose={handleSidebarToggle} 
          onToggle={handleSidebarToggle}
          width={sidebarWidth}
          onWidthChange={handleSidebarWidthChange}
          autoCollapseEnabled={autoCollapseEnabled}
          isCollapsed={isSidebarCollapsed}
          collapsedWidth={collapsedWidth}
          onCollapseChange={setIsSidebarCollapsed}
        />
        
        {/* 메인 콘텐츠 영역 - 사이드바 공간을 고려한 중앙 정렬 */}
        <Box
          sx={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            backgroundColor: isWorkBoardChromeless ? 'transparent' : 'bodyArea.main',
            ...(isWorkBoardChromeless
              ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
              : {}),
            position: 'relative',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            // 사이드바 너비 + 카드와의 간격(회색 띠가 보이도록)
            paddingLeft: `${contentInsetLeft}px`,
            paddingRight: `${WORK_AREA_OUTSET + 8}px`,
            paddingTop: `${HEADER_MENU_GAP_PX + 4}px`,
            paddingBottom: `${WORK_AREA_OUTSET + 16}px`,
            transition: `padding-left ${SIDEBAR_WIDTH_TRANSITION_MS}ms ${SIDEBAR_WIDTH_EASING}`,
            // 반응형 패딩
            '@media (max-width: 600px)': {
              paddingLeft: `${Math.min(contentInsetLeft, 240 + WORK_AREA_OUTSET)}px`,
              paddingRight: '8px',
              paddingTop: `${HEADER_MENU_GAP_PX}px`,
              paddingBottom: '16px',
            },
            '@media (min-width: 600px) and (max-width: 960px)': {
              paddingLeft: `${Math.min(contentInsetLeft, 260 + WORK_AREA_OUTSET)}px`,
              paddingRight: '16px',
              paddingTop: `${HEADER_MENU_GAP_PX}px`,
              paddingBottom: '24px',
            },
            // CSS-in-JS로 즉시 적용되는 스타일
            '& > *': {
              width: '100%',
              maxWidth: '100%',
            }
          }}
        >
          {/* 작업 영역 컨테이너 - 중앙 정렬된 흰색 패널 */}
          <Box
            sx={{
              width: '100%',
              maxWidth: '100%',
              mx: 0,
              backgroundColor: isWorkBoardChromeless ? 'transparent' : 'workArea.main',
              borderRadius: isWorkBoardChromeless ? 0 : '24px',
              boxShadow: isWorkBoardChromeless ? 'none' : '0 4px 16px rgba(15, 23, 42, 0.08)',
              border: isWorkBoardChromeless ? 'none' : '1px solid #C5CED9',
              ...(isWorkBoardChromeless
                ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
                : {}),
              outline: 'none',
              overflow: 'hidden',
              position: 'relative',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              backgroundImage: 'none',
              backgroundSize: 'none',
              '&::before': {
                display: 'none'
              },
              '&::after': {
                display: 'none'
              }
            }}
          >
            {/* 페이지 콘텐츠 내부 - 완전히 중앙 정렬 */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                overflowX: 'hidden',
                overflowY: 'auto',
                color: 'text.primary',
                fontSize: '13.5px',
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                ...(isWorkBoardChromeless
                  ? {
                      flex: 1,
                      minHeight: '100%',
                      background: mvsWorkBoardPageBg,
                      backgroundColor: 'transparent',
                    }
                  : {}),
                ...mvsPageShellSx,
                '&::before': {
                  display: 'none'
                },
                '&::after': {
                  display: 'none'
                },
                // 모든 페이지 콘텐츠가 자동으로 조정되도록 설정
                '& > *': {
                  width: '100%',
                  maxWidth: '100%',
                },
                // 그리드나 플렉스 컨테이너가 자동 조정되도록
                '& .MuiGrid-container': {
                  width: '100%',
                  maxWidth: '100%',
                },
                '& .MuiGrid-item': {
                  width: '100%',
                  maxWidth: '100%',
                },
                // 카드나 페이퍼 컴포넌트가 자동 조정되도록
                '& .MuiCard-root, & .MuiPaper-root': {
                  width: '100%',
                  maxWidth: '100%',
                },
                // 테이블이 자동 조정되도록
                '& .MuiTableContainer-root': {
                  width: '100%',
                  maxWidth: '100%',
                },
                /* 보조 텍스트·플레이스홀더 등 (테이블 헤더 색은 테마 MuiTableCell head 유지) */
                '& .MuiTypography-colorTextSecondary, & .MuiFormHelperText-root, & .MuiInputBase-input::placeholder, & .MuiTableSortLabel-root, & .MuiInputAdornment-root, & .MuiFormLabel-root': {
                  color: (theme) => alpha(theme.palette.text.primary, 0.84),
                },
                '& .MuiTableSortLabel-root.Mui-active': {
                  color: 'text.primary',
                },
              }}
            >
              {hasAccess === false ? (
                <Box 
                  sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'calc(100vh - 200px)',
                    width: '100%',
                    p: 3
                  }}
                >
                  <Box sx={{ maxWidth: 500, width: '100%' }}>
                    <Alert severity="error" sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        접근 권한 없음
                      </Typography>
                      <Typography variant="body2">
                        이 페이지에 접근할 권한이 없습니다.
                      </Typography>
                    </Alert>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={() => navigate('/dashboard')}
                        sx={{ mt: 2 }}
                      >
                        대시보드로 이동
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ) : hasAccess === null ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'min(360px, 50vh)',
                    width: '100%',
                    py: 6
                  }}
                >
                  <CircularProgress size={36} />
                </Box>
              ) : (
                children
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
