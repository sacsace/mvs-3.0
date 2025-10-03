import React, { useEffect, useState } from 'react';
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
  AttachMoney
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore, useMenuStore } from '../../store';
import menuService from '../../services/menuService';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle?: () => void;
  width?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, width = 280 }) => {
  // 반응형 너비 설정
  const responsiveWidth = {
    xs: 240, // 모바일: 240px
    sm: 260, // 태블릿: 260px
    md: 280, // 데스크톱: 280px
    lg: 280, // 큰 화면: 280px
    xl: 280  // 매우 큰 화면: 280px
  };
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
      attach_money: <AttachMoney />
    };
    return iconMap[iconName] || <MenuIcon />;
  };

  // 메뉴 데이터 로드
  useEffect(() => {
    const loadMenus = async () => {
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
      } catch (error) {
        console.error('메뉴 로드 오류:', error);
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

  // 메뉴 렌더링
  const renderMenuItem = (menu: any, level: number = 0) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedMenus.has(menu.id);
    const isActive = location.pathname === menu.route;
    
    return (
      <React.Fragment key={menu.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleMenuClick(menu)}
            sx={{
              pl: 2 + level * 2,
              py: level === 0 ? 0.3 : 0.2, // 하위 메뉴는 더 작은 패딩
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
              {getIcon(menu.icon)}
            </ListItemIcon>
            <ListItemText 
              primary={language === 'ko' ? menu.name_ko : menu.name_en} 
              secondary={level === 0 ? menu.description : null} // 최상위 메뉴에만 설명 표시
              sx={{ 
                '& .MuiListItemText-primary': {
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1.1
                },
                '& .MuiListItemText-secondary': {
                  fontSize: '0.65rem',
                  lineHeight: 1.3, // 줄 간격을 1.0에서 1.3으로 증가
                  color: 'text.secondary',
                  mt: 0.4 // 상단 마진을 0.2에서 0.4로 증가하여 줄간격 늘림
                }
              }}
            />
            {/* 디버깅용 */}
            {process.env.NODE_ENV === 'development' && (
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'gray' }}>
                {language}
              </Typography>
            )}
            {hasChildren && (
              <IconButton size="small" onClick={(e) => {
                e.stopPropagation();
                handleMenuToggle(menu.id);
              }}>
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
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
      <Drawer
        variant="temporary"
        open={open}
        onClose={handleClose}
        sx={{
          width,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box'
          }
        }}
      >
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography>메뉴 로딩 중...</Typography>
        </Box>
      </Drawer>
    );
  }

  if (error) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={handleClose}
        sx={{
          width,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box'
          }
        }}
      >
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      open={true}
      sx={{
        width: responsiveWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: responsiveWidth,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed', // 고정 위치로 변경하여 동적 높이 조정
          top: '64px', // 헤더 아래에서 시작
          left: 0,
          height: 'calc(100vh - 64px)', // 헤더 높이 제외한 나머지 높이
          minHeight: 'calc(100vh - 64px)', // 최소 높이 보장
          backgroundColor: '#ffffff', // 사이드바 배경색 (흰색)
          borderRight: '1px solid #e2e8f0',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.04)',
          zIndex: 1200, // 헤더보다 낮은 z-index
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '1px',
            height: '100%',
            background: 'linear-gradient(180deg, transparent 0%, #e2e8f0 20%, #e2e8f0 80%, transparent 100%)',
          }
        }
      }}
    >
      {/* 메뉴 리스트 - 헤더 바로 아래부터 시작, 전체 높이 사용 */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        backgroundColor: '#ffffff',
        pt: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <List sx={{ flexGrow: 1, px: 1 }}>
          {menus.map((menu) => renderMenuItem(menu))}
        </List>
        
        {/* 저작권 정보 - 메뉴 영역 내부 하단 고정 */}
        <Box sx={{ 
          mt: 'auto', 
          p: 2, 
          textAlign: 'center',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
          flexShrink: 0,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: '20%',
            right: '20%',
            top: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, #e2e8f0 20%, #e2e8f0 80%, transparent 100%)',
          }
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
  );
};

export default Sidebar;