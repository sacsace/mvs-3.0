import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Alert, Typography, Button } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useStore, useMenuStore } from '../../store';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // 사이드바 너비 상태 관리 (localStorage에서 불러오기)
  const getDefaultSidebarWidth = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarWidth');
      return saved ? parseInt(saved, 10) : 280;
    }
    return 280;
  };
  const getDefaultAutoCollapse = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarAutoCollapse');
      return saved === 'true';
    }
    return false;
  };
  const [sidebarWidth, setSidebarWidth] = useState<number>(getDefaultSidebarWidth());
  const [autoCollapseEnabled, setAutoCollapseEnabled] = useState<boolean>(getDefaultAutoCollapse());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(getDefaultAutoCollapse());
  const collapsedWidth = 72;
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const { menus, hasMenuPermission } = useMenuStore();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // 사이드바 너비 변경 핸들러
  const handleSidebarWidthChange = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
    localStorage.setItem('sidebarWidth', newWidth.toString());
  }, []);

  const handleSidebarToggle = () => {
    // 사이드바 토글 비활성화 - 항상 열린 상태 유지
    // setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleAutoCollapseChange = () => {
      const nextValue = getDefaultAutoCollapse();
      setAutoCollapseEnabled(nextValue);
    };

    window.addEventListener('mvs-sidebar-auto-collapse', handleAutoCollapseChange as EventListener);
    return () => {
      window.removeEventListener('mvs-sidebar-auto-collapse', handleAutoCollapseChange as EventListener);
    };
  }, []);

  useEffect(() => {
    setIsSidebarCollapsed(autoCollapseEnabled);
  }, [autoCollapseEnabled]);

  // 경로로 메뉴 찾기 함수
  const findMenuByRoute = (route: string): number | null => {
    // 경로 정규화 (앞뒤 슬래시 제거)
    const normalizedRoute = route.replace(/^\/+|\/+$/g, '');
    
    const findMenu = (menuList: any[]): any | null => {
      for (const menu of menuList) {
        if (!menu.route) {
          // 자식 메뉴가 있으면 재귀적으로 검색
          if (menu.children && menu.children.length > 0) {
            const found = findMenu(menu.children);
            if (found) return found;
          }
          continue;
        }
        
        // 메뉴 경로 정규화
        const normalizedMenuRoute = menu.route.replace(/^\/+|\/+$/g, '');
        
        // 정확한 경로 매칭 (가장 우선순위)
        if (normalizedMenuRoute === normalizedRoute) {
          console.log('✅ [메뉴 찾기] 정확한 매칭:', { menuRoute: normalizedMenuRoute, route: normalizedRoute, menuId: menu.id });
          return menu;
        }
        
        // 경로가 메뉴 경로로 시작하는지 확인 (하위 경로)
        if (normalizedRoute.startsWith(normalizedMenuRoute + '/')) {
          console.log('✅ [메뉴 찾기] 하위 경로 매칭:', { menuRoute: normalizedMenuRoute, route: normalizedRoute, menuId: menu.id });
          return menu;
        }
        
        // 메뉴 경로가 요청 경로로 시작하는지 확인 (상위 경로) - 제거 (너무 관대함)
        // if (normalizedMenuRoute.startsWith(normalizedRoute + '/')) {
        //   return menu;
        // }
        
        // 자식 메뉴 검색
        if (menu.children && menu.children.length > 0) {
          const found = findMenu(menu.children);
          if (found) return found;
        }
      }
      return null;
    };
    const menu = findMenu(menus);
    return menu ? menu.id : null;
  };

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
      
      // 디버깅: 메뉴 찾기 결과 확인
      console.log('🔍 [권한 체크]', {
        pathname: location.pathname,
        menuId: menuId,
        menusCount: menus.length,
        userRole: user?.role
      });
      
      if (!menuId) {
        // 메뉴를 찾을 수 없으면 접근 차단 (보안상 안전하게 처리)
        // 단, 대시보드나 로그인 페이지가 아닌 경우에만 차단
        console.warn('⚠️ [권한 체크] 메뉴를 찾을 수 없음:', location.pathname);
        setHasAccess(false);
        return;
      }

      // view 권한 체크
      const canView = hasMenuPermission(menuId, 'view');
      console.log('🔍 [권한 체크] 권한 확인:', {
        menuId,
        canView,
        hasPermission: hasMenuPermission(menuId, 'view')
      });
      
      setHasAccess(canView);
    };

    // 메뉴가 로드된 후에만 권한 체크
    if (menus.length > 0) {
      checkMenuPermission();
    } else {
      // 메뉴가 아직 로드되지 않았으면
      // root만 일단 허용 (admin도 권한 체크 필요)
      if (user?.role === 'root') {
        setHasAccess(true);
      } else {
        // 메뉴가 로드되지 않았으면 접근 차단
        setHasAccess(false);
      }
    }
  }, [location.pathname, menus, hasMenuPermission, user?.role, findMenuByRoute]);

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'bodyArea.main',
        fontFamily: 'var(--font-sans)',
        // CSS 변수로 사이드바 너비 정의
        '--sidebar-width': '280px',
        '--sidebar-width-mobile': '240px',
        '--sidebar-width-tablet': '260px',
      }}
    >
      {/* 헤더 - 최상단 */}
      <Header />
      
      {/* 메인 컨테이너 - 전체 화면 사용 */}
      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          minHeight: 'calc(100vh - 56px)', // 헤더 높이 제외
          backgroundColor: 'bodyArea.main',
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
            minHeight: 'calc(100vh - 56px)', // 헤더 높이 제외
            display: 'flex',
            justifyContent: 'center', // 수평 중앙 정렬
            alignItems: 'flex-start', // 상단 정렬
            backgroundColor: 'bodyArea.main',
            position: 'relative',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            // 사이드바 너비만큼 왼쪽 패딩 추가 (동적 적용)
            paddingLeft: `${autoCollapseEnabled && isSidebarCollapsed ? collapsedWidth : sidebarWidth}px`,
            paddingRight: '24px',
            paddingTop: '32px',
            paddingBottom: '32px',
            // 반응형 패딩
            '@media (max-width: 600px)': {
              paddingLeft: `${Math.min(autoCollapseEnabled && isSidebarCollapsed ? collapsedWidth : sidebarWidth, 240)}px`,
              paddingRight: '8px',
              paddingTop: '16px',
              paddingBottom: '16px',
            },
            '@media (min-width: 600px) and (max-width: 960px)': {
              paddingLeft: `${Math.min(autoCollapseEnabled && isSidebarCollapsed ? collapsedWidth : sidebarWidth, 260)}px`,
              paddingRight: '16px',
              paddingTop: '24px',
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
              // 브라우저 크기에 따라 자동 조정되는 최대 너비 (모든 페이지 2배 크기)
              maxWidth: { 
                xs: '100%',    // 모바일: 전체 너비
                sm: '100%',    // 태블릿: 전체 너비
                md: '100%',    // 데스크톱: 전체 너비 (사이드바 고려)
                lg: '2400px',  // 큰 화면: 최대 2400px (2배)
                xl: '2800px'   // 매우 큰 화면: 최대 2800px (2배)
              },
              backgroundColor: 'workArea.main',
              borderRadius: 0,
              boxShadow: 'none',
              border: 'none',
              borderTop: 'none',
              borderBottom: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              outline: 'none',
              overflow: 'hidden',
              position: 'relative',
              minHeight: 'calc(100vh - 128px)', // 헤더와 패딩 고려
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
                flexGrow: 1,
                width: '100%',
                fontSize: '0.75rem', // 메뉴 폰트 사이즈와 동일
                // 좌우 공백을 동일하게 유지하는 반응형 패딩
                px: { 
                  xs: 2, // 모바일: 16px
                  sm: 3, // 태블릿: 24px
                  md: 4, // 데스크톱: 32px
                  lg: 5, // 큰 화면: 40px
                  xl: 6  // 매우 큰 화면: 48px
                },
                py: { xs: 2, sm: 3, md: 4 }, // 내부 상하 패딩
                display: 'flex',
                flexDirection: 'column',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
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
