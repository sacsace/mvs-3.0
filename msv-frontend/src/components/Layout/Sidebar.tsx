import React, { useState, useEffect } from 'react';
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
  IconButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  BarChart as BarChartIcon,
  List as ListIcon,
  PersonAdd as PersonAddIcon,
  Tune as TuneIcon,
  Lock as LockIcon,
  ExpandLess,
  ExpandMore,
  Menu as MenuIcon,
  // 새로운 아이콘들
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  AccountBalance as AccountBalanceIcon,
  Inventory as InventoryIcon,
  Psychology as PsychologyIcon,
  Chat as ChatIcon,
  Forum as ForumIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

interface MenuItem {
  id: number;
  name_ko: string;
  name_en: string;
  route: string;
  icon: string;
  description: string;
  parent_id: number | null;
  level: number;
  order: number;
  children?: MenuItem[];
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<number[]>([]);

  // 아이콘 매핑
  const getIcon = (iconName: string, menuName?: string) => {
    // 메뉴 이름에 따른 아이콘 매핑 (우선순위)
    if (menuName) {
      if (menuName.includes('업무관리') || menuName.includes('프로젝트')) {
        return <WorkIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />;
      }
      if (menuName.includes('회계관리') || menuName.includes('회계')) {
        return <AccountBalanceIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />;
      }
      if (menuName.includes('재고관리') || menuName.includes('재고')) {
        return <InventoryIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />;
      }
      if (menuName.includes('AI 분석') || menuName.includes('AI')) {
        return <PsychologyIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />;
      }
      if (menuName.includes('커뮤니케이션') || menuName.includes('채팅')) {
        return <ChatIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />;
      }
    }

    // 기존 아이콘 매핑
    const iconMap: { [key: string]: React.ReactElement } = {
      'dashboard': <DashboardIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'people': <PeopleIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'menu': <MenuIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'analytics': <AnalyticsIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'bar_chart': <BarChartIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'list': <ListIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'person_add': <PersonAddIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'security': <LockIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'tune': <TuneIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'business': <BusinessIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'settings': <SettingsIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      // 새로운 아이콘 매핑
      'work': <WorkIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'assignment': <AssignmentIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'account_balance': <AccountBalanceIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'inventory': <InventoryIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'psychology': <PsychologyIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'chat': <ChatIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'forum': <ForumIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />,
      'message': <MessageIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />
    };
    return iconMap[iconName] || <MenuIcon sx={{ fontSize: '1.1rem', color: 'var(--primary-600)' }} />;
  };

  // 메뉴 데이터 가져오기
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await api.get('/menus');
        const menuData = response.data.data || response.data;
        
        // 계층 구조로 변환
        const menuMap = new Map();
        const rootMenus: MenuItem[] = [];
        
        menuData.forEach((menu: MenuItem) => {
          menuMap.set(menu.id, { ...menu, children: [] });
        });
        
        menuData.forEach((menu: MenuItem) => {
          if (menu.parent_id) {
            const parent = menuMap.get(menu.parent_id);
            if (parent) {
              parent.children.push(menuMap.get(menu.id));
            }
          } else {
            rootMenus.push(menuMap.get(menu.id));
          }
        });
        
        setMenus(rootMenus);
      } catch (error) {
        console.error('메뉴 데이터를 가져오는데 실패했습니다:', error);
        // 기본 메뉴 데이터
        setMenus([
          {
            id: 1,
            name_ko: '대시보드',
            name_en: 'Dashboard',
            route: '/dashboard',
            icon: 'dashboard',
            description: '시스템 현황 및 통계',
            parent_id: null,
            level: 1,
            order: 1
          },
          {
            id: 2,
            name_ko: '기본정보관리',
            name_en: 'Basic Info',
            route: '/company',
            icon: 'business',
            description: '회사 정보 및 기본 설정',
            parent_id: null,
            level: 1,
            order: 2
          }
        ]);
      }
    };

    fetchMenus();
  }, []);

  const handleNavigation = (route: string) => {
    navigate(route);
  };

  const handleMenuToggle = (menuId: number) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const renderMenuItem = (menu: MenuItem) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isExpanded = expandedMenus.includes(menu.id);
    const isActive = location.pathname === menu.route;

    return (
      <React.Fragment key={menu.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => hasChildren ? handleMenuToggle(menu.id) : handleNavigation(menu.route)}
            sx={{
              py: 0.5,
              px: 1.5,
              mx: 0.5,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
              color: isActive ? 'var(--primary-700)' : 'var(--text-secondary)',
              fontWeight: isActive ? '600' : '500',
              '&:hover': {
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-700)',
              },
              transition: 'all var(--transition-fast)'
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {getIcon(menu.icon, menu.name_ko)}
            </ListItemIcon>
            <ListItemText 
              primary={menu.name_ko}
              secondary={menu.description}
              primaryTypographyProps={{
                fontSize: '0.8rem',
                fontWeight: isActive ? '600' : '500'
              }}
              secondaryTypographyProps={{
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)'
              }}
            />
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {menu.children!.map((child) => (
                <ListItem key={child.id} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation(child.route)}
                    sx={{
                      py: 0.5,
                      px: 3,
                      mx: 0.5,
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: location.pathname === child.route ? 'var(--primary-50)' : 'transparent',
                      color: location.pathname === child.route ? 'var(--primary-700)' : 'var(--text-secondary)',
                      fontWeight: location.pathname === child.route ? '600' : '500',
                      '&:hover': {
                        backgroundColor: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                      },
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getIcon(child.icon, child.name_ko)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={child.name_ko}
                      primaryTypographyProps={{
                        fontSize: '0.75rem',
                        fontWeight: location.pathname === child.route ? '600' : '500'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 280 : 72,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 280 : 72,
          boxSizing: 'border-box',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'width 0.3s ease-in-out',
          overflowX: 'hidden'
        },
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: open ? 'space-between' : 'center',
        p: 2,
        minHeight: 64,
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)'
      }}>
        {open && (
          <Typography variant="h6" sx={{ 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            fontSize: '1.125rem'
          }}>
            메뉴
          </Typography>
        )}
        <IconButton onClick={onToggle} sx={{ 
          color: 'var(--text-secondary)',
          '&:hover': {
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-700)'
          }
        }}>
          <MenuIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      <List sx={{ px: 0.5, py: 1 }}>
        {menus.map(renderMenuItem)}
      </List>
    </Drawer>
  );
};

export default Sidebar;