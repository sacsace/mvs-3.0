import React, { useState, useEffect, useCallback } from 'react';
import { Box, Alert, Typography, Button, CircularProgress, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import MobileNavDrawer from './MobileNavDrawer';
import { useStore, useMenuStore } from '../../store';
import { userUiPreferencesService } from '../../services/api';
import { ensureI18nLanguage } from '../../locales/i18n';
import { useMenuLoader } from '../../hooks/useMenuLoader';
import { mvsPageShellSx, mvsWorkBoardPageBg } from '../../theme/mvsLayout';

/** 서버 prefs의 ko가 클라이언트 영어 선택보다 늦게 도착할 때 UI 언어를 덮어쓰지 않음 */
function shouldApplyPrefsLanguage(prefsLang: 'ko' | 'en', current: 'ko' | 'en'): boolean {
  if (current === 'en' && prefsLang === 'ko') return false;
  return true;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const WORK_AREA_OUTSET = 16;
const HEADER_MENU_GAP_PX = 8;
const HEADER_TOP_INSET_PX = 0;
const HEADER_LAYOUT_HEIGHT = HEADER_TOP_INSET_PX + 60;

/** 로그인한 사용자 본인의 계정 설정은 메뉴 권한과 무관한 셀프서비스 경로 */
const isPersonalAccountRoute = (pathname: string): boolean =>
  pathname === '/account/settings' || pathname.startsWith('/account/settings/');

/** 이용약관·개인정보·고객센터 — 메뉴 권한 없이 본문 표시 */
const isLegalPublicRoute = (pathname: string): boolean =>
  pathname === '/legal/terms' ||
  pathname === '/legal/privacy' ||
  pathname === '/legal/support' ||
  pathname.startsWith('/legal/');

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobileNav = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const { menus, hasMenuPermission, setLanguage, loading: menusLoading } = useMenuStore();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useMenuLoader();

  const handleMobileNavToggle = () => {
    if (isMobileNav) setMobileNavOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isMobileNav) setMobileNavOpen(false);
  }, [isMobileNav]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    userUiPreferencesService
      .get()
      .then((prefs) => {
        if (cancelled) return;
        if (prefs.language === 'ko' || prefs.language === 'en') {
          const current = useMenuStore.getState().language;
          if (!shouldApplyPrefsLanguage(prefs.language, current)) {
            void ensureI18nLanguage(current);
            return;
          }
          setLanguage(prefs.language);
          void ensureI18nLanguage(prefs.language);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, setLanguage]);

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

  useEffect(() => {
    const checkMenuPermission = () => {
      if (location.pathname === '/login') {
        setHasAccess(true);
        return;
      }

      if (user?.id && isPersonalAccountRoute(location.pathname)) {
        setHasAccess(true);
        return;
      }

      if (user?.id && isLegalPublicRoute(location.pathname)) {
        setHasAccess(true);
        return;
      }

      if (user?.role === 'root') {
        setHasAccess(true);
        return;
      }

      if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')) {
        setHasAccess(true);
        return;
      }

      const menuId = findMenuByRoute(location.pathname);

      if (!menuId) {
        setHasAccess(false);
        return;
      }

      setHasAccess(hasMenuPermission(menuId, 'view'));
    };

    if (menus.length > 0) {
      checkMenuPermission();
    } else if (menusLoading) {
      setHasAccess(null);
    } else if (user?.role === 'root') {
      setHasAccess(true);
    } else {
      checkMenuPermission();
    }
  }, [location.pathname, menus, menusLoading, hasMenuPermission, user?.id, user?.role, findMenuByRoute]);

  const useChromelessWorkArea = true;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: useChromelessWorkArea ? 'transparent' : 'bodyArea.main',
        ...(useChromelessWorkArea
          ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
          : {}),
        fontFamily: 'var(--font-sans)',
      }}
    >
      <Header
        showMobileNav={isMobileNav}
        mobileNavOpen={mobileNavOpen}
        onMobileNavToggle={handleMobileNavToggle}
      />
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <Box
        aria-hidden
        sx={{
          height: HEADER_LAYOUT_HEIGHT,
          flexShrink: 0,
          width: '100%',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 'min-content',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: useChromelessWorkArea ? 'transparent' : 'bodyArea.main',
          ...(useChromelessWorkArea
            ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
            : {}),
        }}
      >
        <Box
          sx={{
            width: '100%',
            flex: 1,
            minHeight: 'min-content',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            backgroundColor: useChromelessWorkArea ? 'transparent' : 'bodyArea.main',
            ...(useChromelessWorkArea
              ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
              : {}),
            position: 'relative',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            paddingLeft: { xs: 1, sm: 1.5, md: `${WORK_AREA_OUTSET + 8}px` },
            paddingRight: { xs: 1, sm: 1.5, md: `${WORK_AREA_OUTSET + 8}px` },
            paddingTop: { xs: 0.75, sm: `${HEADER_MENU_GAP_PX + 4}px` },
            paddingBottom: { xs: 1.5, sm: 2, md: `${WORK_AREA_OUTSET + 16}px` },
            '& > *': {
              width: '100%',
              maxWidth: '100%',
            },
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: '100%',
              mx: 0,
              backgroundColor: useChromelessWorkArea ? 'transparent' : 'workArea.main',
              borderRadius: useChromelessWorkArea ? 0 : { xs: '12px', sm: '18px', md: '24px' },
              boxShadow: useChromelessWorkArea ? 'none' : '0 4px 16px rgba(15, 23, 42, 0.08)',
              border: useChromelessWorkArea ? 'none' : '1px solid #CBD5E1',
              ...(useChromelessWorkArea
                ? { background: mvsWorkBoardPageBg, backgroundColor: 'transparent' }
                : {}),
              outline: 'none',
              overflow: 'visible',
              position: 'relative',
              flex: 1,
              minHeight: 'min-content',
              display: 'flex',
              flexDirection: 'column',
              backgroundImage: 'none',
              backgroundSize: 'none',
              '&::before': { display: 'none' },
              '&::after': { display: 'none' },
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 'min-content',
                width: '100%',
                overflow: 'visible',
                color: 'text.primary',
                fontSize: '13.5px',
                lineHeight: 1.6,
                display: 'flex',
                flexDirection: 'column',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                ...(useChromelessWorkArea
                  ? {
                      flex: 1,
                      minHeight: 'min-content',
                      background: mvsWorkBoardPageBg,
                      backgroundColor: 'transparent',
                    }
                  : {}),
                ...mvsPageShellSx,
                '&::before': { display: 'none' },
                '&::after': { display: 'none' },
                '& > *': {
                  width: '100%',
                  maxWidth: '100%',
                },
                '& .MuiGrid-container': {
                  width: '100%',
                  maxWidth: '100%',
                },
                '& .MuiGrid-item': {
                  width: '100%',
                  maxWidth: '100%',
                },
                '& .MuiCard-root, & .MuiPaper-root': {
                  width: '100%',
                  maxWidth: '100%',
                },
                '& .MuiTableContainer-root': {
                  width: '100%',
                  maxWidth: '100%',
                },
                '& .MuiTypography-colorTextSecondary, & .MuiFormHelperText-root, & .MuiInputBase-input::placeholder, & .MuiTableSortLabel-root, & .MuiInputAdornment-root, & .MuiFormLabel-root':
                  {
                    color: (t) => alpha(t.palette.text.primary, 0.84),
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
                    p: 3,
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
                    py: 6,
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
