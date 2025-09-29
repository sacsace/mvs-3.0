import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Collapse,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Info as InfoIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalStore } from '../../store';

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { sidebar, setSidebar } = useGlobalStore();

  const [expandedMenus, setExpandedMenus] = React.useState<{ [key: string]: boolean }>({});

  const menuItems = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      id: 'users',
      label: t('nav.users'),
      icon: <PeopleIcon />,
      path: '/users',
    },
    {
      id: 'menu',
      label: t('nav.menu'),
      icon: <MenuIcon />,
      path: '/menu',
    },
    {
      id: 'notifications',
      label: t('nav.notifications'),
      icon: <NotificationsIcon />,
      path: '/notifications',
    },
    {
      id: 'chat',
      label: t('nav.chat'),
      icon: <ChatIcon />,
      path: '/chat',
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: <SettingsIcon />,
      path: '/settings',
    },
  ];

  const bottomMenuItems = [
    {
      id: 'help',
      label: t('nav.help'),
      icon: <HelpIcon />,
      path: '/help',
    },
    {
      id: 'about',
      label: t('nav.about'),
      icon: <InfoIcon />,
      path: '/about',
    },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (window.innerWidth < theme.breakpoints.values.md) {
      setSidebar({ isOpen: false });
    }
  };

  const handleExpandClick = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebar.isCollapsed ? 'center' : 'flex-start',
          minHeight: 64,
        }}
      >
        {!sidebar.isCollapsed && (
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            MVS 3.0
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Main Menu */}
      <List sx={{ flexGrow: 1, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              onClick={() => handleMenuClick(item.path)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                backgroundColor: isActive(item.path) ? 'primary.main' : 'transparent',
                color: isActive(item.path) ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  backgroundColor: isActive(item.path) 
                    ? 'primary.dark' 
                    : 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? 'primary.contrastText' : 'text.primary',
                  minWidth: sidebar.isCollapsed ? 'auto' : 40,
                  mr: sidebar.isCollapsed ? 0 : 2,
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!sidebar.isCollapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Bottom Menu */}
      <List sx={{ px: 1 }}>
        {bottomMenuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              onClick={() => handleMenuClick(item.path)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                backgroundColor: isActive(item.path) ? 'primary.main' : 'transparent',
                color: isActive(item.path) ? 'primary.contrastText' : 'text.primary',
                '&:hover': {
                  backgroundColor: isActive(item.path) 
                    ? 'primary.dark' 
                    : 'action.hover',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? 'primary.contrastText' : 'text.primary',
                  minWidth: sidebar.isCollapsed ? 'auto' : 40,
                  mr: sidebar.isCollapsed ? 0 : 2,
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!sidebar.isCollapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
