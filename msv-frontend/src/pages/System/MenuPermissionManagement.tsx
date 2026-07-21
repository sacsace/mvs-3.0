import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Chip,
  Avatar,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Security as SecurityIcon,
  Business as BusinessIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  PersonAdd as PersonAddIcon,
  AutoAwesome as AutoAwesomeIcon,
  VisibilityOff as VisibilityOffIcon,
  EditNote as EditNoteIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';
import { useStore, useMenuStore } from '../../store';
import menuService from '../../services/menuService';
import { Menu } from '../../services/menuService';
import { api } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { showErrorPopup, showSuccessPopup } from '../../utils/errorHandler';
import { useTranslation } from 'react-i18next';
import { mvsPageDescriptionSx, mvsPageTitleSx } from '../../theme/mvsLayout';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  company: string;
  company_id?: number;
  status?: string;
}

interface Company {
  id: number;
  name: string;
  domain: string;
}

interface MenuPermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// 메뉴 권한 아이템 컴포넌트
interface MenuPermissionItemProps {
  menu: Menu;
  level: number;
  index: number;
  hasChildren: boolean;
  isExpanded: boolean;
  permission: MenuPermission;
  hasAnyPermission: boolean;
  menuKey: string;
  language: string;
  expandedMenus: Set<number>;
  /** admin이 해당 메뉴/플래그를 부여할 수 있는지 */
  canGrant: {
    all: boolean;
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
  onToggleExpand: (menuId: number) => void;
  onPermissionChange: (menuKey: string, permissionType: keyof MenuPermission | 'all', value: boolean) => void;
  onToggleChildren: (menuId: number) => void;
  onOrderChange: (menuId: number, newOrder: number) => void;
  onNameChange: (menuId: number, nameKo: string, nameEn: string) => void;
  currentOrder: number;
  totalCount: number;
  renderMenuTree: (menuList: Menu[], level: number, parentIndex: number, isLast: boolean) => React.ReactNode;
}

const MenuPermissionItem: React.FC<MenuPermissionItemProps> = ({
  menu,
  level,
  index,
  hasChildren,
  isExpanded,
  permission,
  hasAnyPermission,
  menuKey,
  language,
  expandedMenus,
  canGrant,
  onToggleExpand,
  onPermissionChange,
  onToggleChildren,
  onOrderChange,
  onNameChange,
  currentOrder,
  totalCount,
  renderMenuTree
}) => {
  const { t } = useTranslation();
  const [orderValue, setOrderValue] = useState(String(currentOrder));

  const handleOrderBlur = () => {
    const newOrder = parseInt(orderValue, 10);
    if (!isNaN(newOrder) && newOrder >= 1 && newOrder <= totalCount && newOrder !== currentOrder) {
      onOrderChange(menu.id, newOrder);
    } else {
      setOrderValue(String(currentOrder));
    }
  };

  const handleOrderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleOrderBlur();
    }
  };

  useEffect(() => {
    setOrderValue(String(currentOrder));
  }, [currentOrder]);

  return (
    <Box 
      sx={{ 
        mb: level === 0 ? 0.448 : 0.72, // 줄 간격 20% 감소 (0.56 * 0.8 = 0.448, 0.9 * 0.8 = 0.72)
        pl: level > 0 ? `${level * 24 + 8}px` : 0,
        position: 'relative'
      }}
    >
      <Accordion
        expanded={isExpanded}
        onChange={() => onToggleExpand(menu.id)}
        sx={{
          '&:before': { display: 'none' },
          boxShadow: 'none',
          border: 'none',
          borderRadius: 0,
          backgroundColor: 'transparent',
          mb: level === 0 ? 0.768 : 0.72, // 줄 간격 20% 감소 (0.96 * 0.8 = 0.768, 0.9 * 0.8 = 0.72)
          position: 'relative',
          '&::before': level === 0 ? {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '3px',
            backgroundColor: '#ffffff', // 기본 흰색
            borderRadius: '4px 4px 0 0',
            transition: 'background-color 0.2s ease'
          } : { display: 'none' },
          '&::after': level === 0 ? {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '5px',
            backgroundColor: '#ffffff', // 기본 흰색
            borderRadius: '4px 0 0 4px',
            transition: 'background-color 0.2s ease'
          } : { display: 'none' },
          '& .MuiAccordionSummary-root': {
            backgroundColor: '#ffffff', // 기본 흰색 배경
            borderRadius: level === 0 ? '0 4px 4px 0' : 0,
            borderLeft: 'none',
            pl: level === 0 ? 2 : 0.5,
            position: 'relative',
            transition: 'background-color 0.2s ease',
            '&::before': level > 0 ? {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              backgroundColor: '#ffffff',
              borderRadius: '2px 0 0 2px',
              transition: 'background-color 0.2s ease'
            } : { display: 'none' },
            '&:hover': {
              backgroundColor: hasAnyPermission ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)',
              '&::before': level > 0 ? {
                backgroundColor: 'primary.main'
              } : {}
            }
          },
          '&:hover': level === 0 ? {
            '&::before': {
              backgroundColor: 'primary.main',
              height: '4px'
            },
            '&::after': {
              backgroundColor: 'primary.main',
              width: '6px'
            }
          } : {}
        }}
      >
        <AccordionSummary
          expandIcon={hasChildren ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : null}
          sx={{ 
            minHeight: level === 0 ? 5 : 5, // 박스 최소 높이 5
            '&.Mui-expanded': { minHeight: level === 0 ? 5 : 5 },
            py: level === 0 ? 0.064 : 0.064,
            px: 0.5,
            pl: level === 0 ? 2 : 0.5,
            '& .MuiAccordionSummary-content': {
              margin: '0 !important',
              my: 0,
              minWidth: 0,
              flexGrow: 1,
              overflow: 'visible',
            },
            '& .MuiAccordionSummary-content.Mui-expanded': {
              margin: '0 !important',
              minWidth: 0,
            },
            '& .MuiAccordionSummary-expandIconWrapper': {
              padding: 0
            }
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'auto 76px auto',
              columnGap: 2,
              alignItems: 'center',
              width: '100%',
              minWidth: 0,
              pr: 0.5,
            }}
          >
            {/* 1. 메뉴명 */}
            <Typography
              variant="body2"
              sx={{
                minWidth: '12ch',
                py: 0.35,
                fontSize: level === 0 ? '0.875rem' : level === 1 ? '0.8125rem' : '0.75rem',
                fontWeight: level === 0 ? 600 : level === 1 ? 500 : 400,
                color: hasAnyPermission ? 'text.primary' : 'text.secondary',
                maxWidth: 380,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.35,
                letterSpacing: '-0.01em',
              }}
            >
              {language === 'ko' ? menu.name_ko : menu.name_en}
            </Typography>

            {/* 2. 메뉴 순서 */}
            <TextField
              type="number"
              value={orderValue}
              onChange={(e) => setOrderValue(e.target.value)}
              onBlur={handleOrderBlur}
              onKeyDown={handleOrderKeyDown}
              onClick={(e) => e.stopPropagation()}
              inputProps={{
                min: 1,
                max: totalCount,
                style: {
                  textAlign: 'center',
                  padding: '6px 4px',
                  fontSize: '0.8125rem',
                },
              }}
              sx={{
                width: '100%',
                maxWidth: 76,
                justifySelf: 'end',
                '& .MuiOutlinedInput-root': {
                  height: 32,
                  borderRadius: '10px',
                  bgcolor: (theme) => alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.06),
                  '& fieldset': {
                    borderColor: (theme) => alpha(theme.palette.divider, 0.9),
                  },
                  '&:hover fieldset': {
                    borderColor: (theme) => alpha(theme.palette.text.primary, 0.15),
                  },
                  '&.Mui-focused fieldset': {
                    borderWidth: 1,
                  },
                  '& input': {
                    padding: '6px 4px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  },
                },
              }}
            />

            {/* 3. 권한 체크박스 */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: 0.5,
                alignItems: 'center',
                justifyContent: 'flex-end',
                minWidth: 'min-content',
              }}
            >
              <Tooltip
                title={
                  canGrant.all
                    ? t('menuPermissionManagement.toggleAll')
                    : t('menuPermissionManagement.adminScopeBlocked')
                }
                arrow
              >
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canGrant.all) return;
                    const allChecked = permission.can_view && permission.can_create && permission.can_edit && permission.can_delete;
                    onPermissionChange(menuKey, 'all', !allChecked);
                  }}
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.125,
                    p: 0.375,
                    borderRadius: 0.5,
                    border: '1px solid',
                    borderColor: (permission.can_view && permission.can_create && permission.can_edit && permission.can_delete) ? 'primary.main' : 'divider',
                    backgroundColor: (permission.can_view && permission.can_create && permission.can_edit && permission.can_delete) ? 'primary.50' : 'transparent',
                    cursor: canGrant.all ? 'pointer' : 'not-allowed',
                    opacity: canGrant.all ? 1 : 0.45,
                    transition: 'all 0.15s ease',
                    '&:hover': canGrant.all ? {
                      borderColor: 'primary.main',
                      backgroundColor: 'primary.50'
                    } : undefined
                  }}
                >
                  <Checkbox
                    checked={permission.can_view && permission.can_create && permission.can_edit && permission.can_delete}
                    indeterminate={hasAnyPermission && !(permission.can_view && permission.can_create && permission.can_edit && permission.can_delete)}
                    disabled={!canGrant.all}
                    size="small"
                    sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 15.4 } }}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (!canGrant.all) return;
                      onPermissionChange(menuKey, 'all', e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.6875rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {t('menuPermissionManagement.all')}
                  </Typography>
                </Box>
              </Tooltip>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={permission.can_view}
                    disabled={!canGrant.can_view}
                    onChange={(e) => {
                      e.stopPropagation();
                      onPermissionChange(menuKey, 'can_view', e.target.checked);
                    }}
                    size="small"
                    sx={{ '& .MuiSvgIcon-root': { fontSize: 15.4 } }}
                  />
                }
                label={t('menuPermissionManagement.view')}
                sx={{
                  m: 0,
                  opacity: canGrant.can_view ? 1 : 0.45,
                  '& .MuiFormControlLabel-label': { fontSize: '0.6875rem' }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={permission.can_create}
                    disabled={!canGrant.can_create}
                    onChange={(e) => {
                      e.stopPropagation();
                      onPermissionChange(menuKey, 'can_create', e.target.checked);
                    }}
                    size="small"
                    sx={{ '& .MuiSvgIcon-root': { fontSize: 15.4 } }}
                  />
                }
                label={t('menuPermissionManagement.create')}
                sx={{
                  m: 0,
                  opacity: canGrant.can_create ? 1 : 0.45,
                  '& .MuiFormControlLabel-label': { fontSize: '0.6875rem' }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={permission.can_edit}
                    disabled={!canGrant.can_edit}
                    onChange={(e) => {
                      e.stopPropagation();
                      onPermissionChange(menuKey, 'can_edit', e.target.checked);
                    }}
                    size="small"
                    sx={{ '& .MuiSvgIcon-root': { fontSize: 15.4 } }}
                  />
                }
                label={t('menuPermissionManagement.edit')}
                sx={{
                  m: 0,
                  opacity: canGrant.can_edit ? 1 : 0.45,
                  '& .MuiFormControlLabel-label': { fontSize: '0.6875rem' }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={permission.can_delete}
                    disabled={!canGrant.can_delete}
                    onChange={(e) => {
                      e.stopPropagation();
                      onPermissionChange(menuKey, 'can_delete', e.target.checked);
                    }}
                    size="small"
                    sx={{ '& .MuiSvgIcon-root': { fontSize: 15.4 } }}
                  />
                }
                label={t('menuPermissionManagement.delete')}
                sx={{
                  m: 0,
                  opacity: canGrant.can_delete ? 1 : 0.45,
                  '& .MuiFormControlLabel-label': { fontSize: '0.6875rem' }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Box>
          </Box>
        </AccordionSummary>
        {hasChildren && (
          <AccordionDetails sx={{
            pl: 0.5,
            pt: 1.2, // 줄 간격 20% 감소 (1.5 * 0.8 = 1.2)
            pb: 0,
            backgroundColor: 'transparent',
            ml: 0.75
          }}>
            {renderMenuTree(menu.children!, level + 1, index, false)}
          </AccordionDetails>
        )}
      </Accordion>
    </Box>
  );
};

const MenuPermissionManagement: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useStore();
  const { menus, language, userPermissions, hasMenuPermission } = useMenuStore();
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());
  const [permissions, setPermissions] = useState<{ [key: string]: MenuPermission }>({});
  const [adminPermissions, setAdminPermissions] = useState<{ [key: string]: MenuPermission }>({});
  const [menuList, setMenuList] = useState<Menu[]>(menus || []);
  const { setMenus } = useMenuStore();
  const [delegationTargetId, setDelegationTargetId] = useState<number | null>(null);
  const [delegationDialogOpen, setDelegationDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultPermissionDialogOpen, setDefaultPermissionDialogOpen] = useState(false);
  /** 레이아웃 추정용 기본 사이드바 너비 (실제 너비는 DB 사용자 UI 설정) */
  const getSidebarWidth = () => 280;

  // 4:6 비율을 위한 기본 너비 계산 (전체 너비의 40%)
  const getDefaultLeftPanelWidth = () => {
    if (typeof window !== 'undefined') {
      const sidebarWidth = getSidebarWidth();
      // 사이드바 너비 + 패딩(48px)을 제외한 실제 컨텐츠 너비
      const availableWidth = Math.min(2400, window.innerWidth - sidebarWidth - 48);
      return Math.max(300, Math.min(1000, availableWidth * 0.4)); // 최소 300px, 최대 1000px, 기본 40%
    }
    return 480; // 서버 사이드 렌더링 시 기본값 (2400px * 0.4 = 960px, 하지만 안전하게 480px)
  };
  
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(getDefaultLeftPanelWidth());
  const [isResizing, setIsResizing] = useState(false);

  // 사용자/회사 영역 비율 (위 6: 아래 4)
  const getDefaultUserSectionHeight = () => {
    if (typeof window !== 'undefined') {
      const cardHeight = window.innerHeight - 300; // 대략적인 카드 높이
      return cardHeight * 0.6; // 60%
    }
    return 400;
  };
  
  const [userSectionHeight, setUserSectionHeight] = useState<number>(getDefaultUserSectionHeight());
  const [isVerticalResizing, setIsVerticalResizing] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 권한 확인 (root 또는 메뉴 권한이 있는 admin)
  const isRoot = user?.role === 'root';
  const isAdmin = user?.role === 'admin';
  const menuPermissionMenuId = useMemo(() => {
    const targetRoute = '/basic-info/menu-permissions';

    const findMenuIdByRoute = (menuItems: Menu[]): number | null => {
      for (const menu of menuItems) {
        const route = String(menu.route || '');
        if (route === targetRoute || route.startsWith(`${targetRoute}/`)) {
          return menu.id;
        }
        if (menu.children && menu.children.length > 0) {
          const childId = findMenuIdByRoute(menu.children);
          if (childId) return childId;
        }
      }
      return null;
    };

    const idFromMenus = findMenuIdByRoute(menus || []);
    if (idFromMenus) return idFromMenus;

    const permissionWithRoute = userPermissions.find(
      (perm) =>
        perm?.menu?.route === targetRoute ||
        String(perm?.menu?.route || '').startsWith(`${targetRoute}/`)
    );
    return permissionWithRoute?.menu_id || null;
  }, [menus, userPermissions]);

  const hasMenuPermissionControlAuth = useMemo(() => {
    if (!menuPermissionMenuId) return false;
    return (
      hasMenuPermission(menuPermissionMenuId, 'view') ||
      hasMenuPermission(menuPermissionMenuId, 'create') ||
      hasMenuPermission(menuPermissionMenuId, 'edit') ||
      hasMenuPermission(menuPermissionMenuId, 'delete')
    );
  }, [menuPermissionMenuId, hasMenuPermission]);

  const canManagePermissionPage = isRoot || (isAdmin && hasMenuPermissionControlAuth);

  // 리사이즈 핸들러 (좌우)
  const resizeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // 리사이즈 핸들러 (상하)
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = leftPanelWidth;
  }, [leftPanelWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startXRef.current;
    // 4:6 비율 유지를 위해 최소 300px, 최대는 화면 너비의 60%까지 허용
    const sidebarWidth = getSidebarWidth();
    const maxWidth = typeof window !== 'undefined' ? Math.min(1000, (window.innerWidth - sidebarWidth - 48) * 0.6) : 800;
    const newWidth = Math.max(300, Math.min(maxWidth, startWidthRef.current + diff));
    setLeftPanelWidth(newWidth);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 수직 리사이즈 핸들러
  const handleVerticalMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsVerticalResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = userSectionHeight;
  }, [userSectionHeight]);

  const handleVerticalMouseMove = useCallback((e: MouseEvent) => {
    if (!isVerticalResizing) return;
    
    const diff = e.clientY - startYRef.current;
    const minHeight = 150; // 최소 높이
    const maxHeight = typeof window !== 'undefined' ? (window.innerHeight - 400) : 600; // 최대 높이
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + diff));
    setUserSectionHeight(newHeight);
  }, [isVerticalResizing]);

  const handleVerticalMouseUp = useCallback(() => {
    setIsVerticalResizing(false);
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
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isVerticalResizing) {
      document.addEventListener('mousemove', handleVerticalMouseMove);
      document.addEventListener('mouseup', handleVerticalMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleVerticalMouseMove);
      document.removeEventListener('mouseup', handleVerticalMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleVerticalMouseMove);
      document.removeEventListener('mouseup', handleVerticalMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isVerticalResizing, handleVerticalMouseMove, handleVerticalMouseUp]);

  // 화면 크기 변경 시 4:6 비율 유지 (선택적)
  useEffect(() => {
    const handleResize = () => {
      // 사용자가 수동으로 조정한 경우는 유지
      // 초기 로드 시에만 비율 적용
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 사용자 및 회사 목록 로드
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setDataLoading(false);
        return;
      }

      // 접근 권한이 없으면 데이터 로드 중단
      if (!canManagePermissionPage) {
        setDataLoading(false);
        return;
      }
      
      try {
        setDataLoading(true);
        const currentUserCompanyId = user.company_id;
        
        // 사용자 목록 로드
        const usersArray = await useReferenceDataStore.getState().fetchUsers();
        
        let usersData: User[] = [];
        if (usersArray.length >= 0) {
          usersData = usersArray
            .filter((u: any) => u.status === 'active') // 비활성 사용자 제외
            .filter((u: any) => {
              // root를 제외한 사용자는 본인 회사 사용자만 표시
              if (isRoot) return true;
              return Number(u.company_id) === Number(currentUserCompanyId);
            })
            .map((u: any) => ({
              id: u.id,
              name: u.username,
              email: u.email,
              role: u.role,
              company: '',
              company_id: u.company_id,
              status: u.status
            }));
        }
        
        // 회사 목록 로드
        try {
          const companiesData = await useReferenceDataStore.getState().fetchCompanies();

          if (companiesData.length >= 0) {
            const scopedCompanies = isRoot
              ? companiesData
              : companiesData.filter((c: any) => Number(c.id) === Number(currentUserCompanyId));

            const formattedCompanies = scopedCompanies.map((c: any) => ({
              id: c.id,
              name: c.name,
              domain: c.website || c.email || ''
            }));
            setCompanies(formattedCompanies);
            
            // 사용자 데이터에 회사명 추가
            usersData = usersData.map(u => {
              const company = scopedCompanies.find((c: any) => c.id === u.company_id);
              return {
                ...u,
                company: company ? company.name : ''
              };
            });
          }
        } catch (companyError: any) {
          console.error('❌ [메뉴 권한 관리] 회사 목록 로드 오류:', companyError);
        }
        
        setUsers(usersData);
      } catch (error: any) {
        console.error('❌ [메뉴 권한 관리] 데이터 로드 오류:', error);
        setUsers([]);
        setCompanies([]);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [user, canManagePermissionPage]);

  // Admin 권한 로드 (admin이 user에게 권한을 줄 때 자신의 권한 범위 내에서만 가능하도록)
  useEffect(() => {
    const loadAdminPermissions = async () => {
      if (!user || !canManagePermissionPage || user.role !== 'admin') return;
      
      try {
        const response = await api.get(`/menus/permissions/user/${user.id}`);
        if (response.data.success && response.data.data) {
          const permissionsMap: { [key: string]: MenuPermission } = {};
          response.data.data.forEach((perm: any) => {
            permissionsMap[String(perm.menu_id)] = {
              can_view: perm.can_view || false,
              can_create: perm.can_create || false,
              can_edit: perm.can_edit || false,
              can_delete: perm.can_delete || false
            };
          });
          setAdminPermissions(permissionsMap);
        } else {
          setAdminPermissions({});
        }
      } catch (error) {
        console.error('Admin 권한 로드 오류:', error);
        setAdminPermissions({});
      }
    };
    
    loadAdminPermissions();
  }, [user, canManagePermissionPage]);

  // 메뉴 로드 및 초기화
  useEffect(() => {
    const loadMenus = async () => {
      if (!user || !canManagePermissionPage) return;
      try {
        const response = await menuService.getAllMenus(user.tenant_id, language);
        if (response.success && response.data) {
          // 기본적으로 모든 메뉴를 펼치지 않도록 빈 Set으로 초기화
          setExpandedMenus(new Set<number>());
          setMenuList(response.data);
        }
      } catch (error) {
        console.error('메뉴 로드 오류:', error);
      }
    };
    loadMenus();
  }, [user, language, canManagePermissionPage]);

  // menus가 변경되면 menuList 업데이트
  useEffect(() => {
    if (menus && menus.length > 0) {
      setMenuList(menus);
    }
  }, [menus]);

  // 메뉴명 변경
  const handleNameChange = async (menuId: number, nameKo: string, nameEn: string) => {
    const updateMenuName = (menus: Menu[]): Menu[] => {
      return menus.map(menu => {
        if (menu.id === menuId) {
          return { ...menu, name_ko: nameKo, name_en: nameEn };
        }
        if (menu.children && menu.children.length > 0) {
          return { ...menu, children: updateMenuName(menu.children) };
        }
        return menu;
      });
    };

    const newMenuList = updateMenuName(menuList);
    setMenuList(newMenuList);

    // 서버에 메뉴명 저장
    try {
      await api.put(`/menus/${menuId}`, { name_ko: nameKo, name_en: nameEn });
      
      // 사이드바 메뉴 즉시 업데이트
      setMenus(newMenuList);
    } catch (error) {
      console.error('메뉴명 저장 오류:', error);
      // 실패 시 원래 메뉴명으로 복구
      setMenuList(menus || []);
    }
  };

  // 메뉴 순서 변경
  const handleOrderChange = async (menuId: number, newOrder: number) => {
    const reorderMenuInList = (menus: Menu[]): Menu[] => {
      for (let i = 0; i < menus.length; i++) {
        if (menus[i].id === menuId) {
          // 같은 레벨에서 순서 변경
          const currentIndex = i;
          const targetIndex = newOrder - 1; // 1-based to 0-based
          
          if (currentIndex === targetIndex || targetIndex < 0 || targetIndex >= menus.length) {
            return menus; // 변경할 필요 없음
          }
          
          const newMenus = [...menus];
          const [movedMenu] = newMenus.splice(currentIndex, 1);
          newMenus.splice(targetIndex, 0, movedMenu);
          return newMenus;
        }
        // 하위 메뉴에서 찾기
        if (menus[i].children && menus[i].children!.length > 0) {
          const reorderedChildren = reorderMenuInList(menus[i].children!);
          if (reorderedChildren !== menus[i].children) {
            return menus.map((menu, idx) => 
              idx === i ? { ...menu, children: reorderedChildren } : menu
            );
          }
        }
      }
      return menus;
    };

    const newMenuList = reorderMenuInList(menuList);
    if (JSON.stringify(newMenuList) === JSON.stringify(menuList)) {
      return; // 변경사항이 없으면 종료
    }

    await saveMenuOrder(newMenuList);
  };

  // 메뉴 순서 저장 및 사이드바 업데이트
  const saveMenuOrder = async (newMenuList: Menu[]) => {
    setMenuList(newMenuList);

    // 모든 메뉴의 순서를 수집 (계층 구조를 평면화)
    const collectMenuOrders = (menus: Menu[], orders: Array<{ id: number; order: number }> = []): Array<{ id: number; order: number }> => {
      menus.forEach((menu, index) => {
        orders.push({ id: menu.id, order: index + 1 });
        if (menu.children && menu.children.length > 0) {
          collectMenuOrders(menu.children, orders);
        }
      });
      return orders;
    };

    const menuOrders = collectMenuOrders(newMenuList);

    // 서버에 순서 저장
    try {
      await api.put('/menus/order', { menus: menuOrders });
      
      // 사이드바 메뉴 즉시 업데이트
      setMenus(newMenuList);
    } catch (error) {
      console.error('메뉴 순서 저장 오류:', error);
      // 실패 시 원래 순서로 복구
      setMenuList(menus || []);
    }
  };

  // 사용자/회사 선택 시 권한 로드
  useEffect(() => {
    const loadPermissions = async () => {
      if (!canManagePermissionPage) return;
      
      if (selectedUserId) {
        try {
          setLoading(true);
          const response = await api.get(`/menus/permissions/user/${selectedUserId}`);
          if (response.data.success && response.data.data) {
            const permissionsMap: { [key: string]: MenuPermission } = {};
            response.data.data.forEach((perm: any) => {
              permissionsMap[String(perm.menu_id)] = {
                can_view: perm.can_view || false,
                can_create: perm.can_create || false,
                can_edit: perm.can_edit || false,
                can_delete: perm.can_delete || false
              };
            });
            setPermissions(permissionsMap);
          } else {
            setPermissions({});
          }
        } catch (error) {
          console.error('권한 로드 오류:', error);
          setPermissions({});
        } finally {
          setLoading(false);
        }
      } else if (selectedCompanyId) {
        setPermissions({});
      } else {
        setPermissions({});
      }
    };
    
    loadPermissions();
  }, [selectedUserId, selectedCompanyId, canManagePermissionPage]);

  // 메뉴 트리 렌더링
  const renderMenuTree = (menuList: Menu[], level: number = 0, parentIndex: number = 0, isLast: boolean = false) => {
    // 메뉴 순서 조정: 회사 정보 관리와 파트너 업체 관리 순서 바꾸기
    const sortedMenuList = [...menuList].sort((a, b) => {
      // 기본정보관리 하위 메뉴인 경우 (route로 확인)
      const aIsCompany = a.route === '/basic-info/company' || a.route?.includes('/basic-info/company');
      const bIsCompany = b.route === '/basic-info/company' || b.route?.includes('/basic-info/company');
      const aIsPartner = a.route === '/basic-info/partners' || a.route?.includes('/basic-info/partners');
      const bIsPartner = b.route === '/basic-info/partners' || b.route?.includes('/basic-info/partners');
      
      // 회사 정보 관리와 파트너 업체 관리 순서 바꾸기
      if (aIsCompany && bIsPartner) {
        return 1; // 회사 정보 관리를 뒤로
      }
      if (aIsPartner && bIsCompany) {
        return -1; // 파트너 업체 관리를 앞으로
      }
      
      // 기본 정렬은 order 필드 사용
      return (a.order || 0) - (b.order || 0);
    });

    return (
      <>
        {sortedMenuList.map((menu, index) => {
          const hasChildren = !!(menu.children && menu.children.length > 0);
          const isExpanded = expandedMenus.has(menu.id);
          const menuKey = String(menu.id);
          const permission = permissions[menuKey] || {
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false
          };

          const hasAnyPermission = permission.can_view || permission.can_create || permission.can_edit || permission.can_delete;
          const isLastItem = index === sortedMenuList.length - 1;
          const canMoveUp = index > 0;
          const canMoveDown = index < sortedMenuList.length - 1;
          const canGrant = getCanGrantFlags(menuKey);

          return (
            <MenuPermissionItem
              key={menu.id}
              menu={menu}
              level={level}
              index={index}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              permission={permission}
              hasAnyPermission={hasAnyPermission}
              menuKey={menuKey}
              language={language}
              expandedMenus={expandedMenus}
              canGrant={canGrant}
              onToggleExpand={(menuId) => {
                const newExpanded = new Set(expandedMenus);
                if (expandedMenus.has(menuId)) {
                  newExpanded.delete(menuId);
                } else {
                  newExpanded.add(menuId);
                }
                setExpandedMenus(newExpanded);
              }}
              onPermissionChange={handlePermissionChange}
              onToggleChildren={(menuId) => {
                const newExpanded = new Set(expandedMenus);
                if (expandedMenus.has(menuId)) {
                  newExpanded.delete(menuId);
                } else {
                  newExpanded.add(menuId);
                }
                setExpandedMenus(newExpanded);
              }}
              onOrderChange={handleOrderChange}
              onNameChange={handleNameChange}
              currentOrder={index + 1}
              totalCount={sortedMenuList.length}
              renderMenuTree={renderMenuTree}
            />
          );
        })}
      </>
    );
  };

  // 메뉴 트리에서 특정 메뉴의 모든 자식 메뉴 ID를 재귀적으로 수집
  const getAllChildMenuIds = (menuList: Menu[], parentId: number): number[] => {
    const childIds: number[] = [];
    
    const collectChildIds = (menus: Menu[]): void => {
      menus.forEach(menu => {
        if (menu.id === parentId && menu.children) {
          // 부모 메뉴를 찾았으면 모든 자식을 재귀적으로 수집
          const collectAllDescendants = (children: Menu[]): void => {
            children.forEach(child => {
              childIds.push(child.id);
              if (child.children && child.children.length > 0) {
                collectAllDescendants(child.children);
              }
            });
          };
          collectAllDescendants(menu.children);
        } else if (menu.children) {
          // 자식이 있으면 재귀적으로 탐색
          collectChildIds(menu.children);
        }
      });
    };
    
    collectChildIds(menuList);
    return childIds;
  };

  // Admin의 권한 범위 내에서만 권한을 설정할 수 있는지 체크
  const canSetPermission = (menuKey: string, permissionType: keyof MenuPermission | 'all', _value: boolean): boolean => {
    if (user?.role === 'root') return true;

    if (user?.role === 'admin') {
      const adminPerm = adminPermissions[menuKey];
      if (!adminPerm) {
        return false;
      }

      if (permissionType === 'all') {
        return adminPerm.can_view && adminPerm.can_create && adminPerm.can_edit && adminPerm.can_delete;
      }
      return adminPerm[permissionType] === true;
    }

    return true;
  };

  const getCanGrantFlags = (menuKey: string) => {
    if (user?.role !== 'admin') {
      return {
        all: true,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true
      };
    }
    const adminPerm = adminPermissions[menuKey];
    return {
      all: Boolean(
        adminPerm?.can_view && adminPerm?.can_create && adminPerm?.can_edit && adminPerm?.can_delete
      ),
      can_view: Boolean(adminPerm?.can_view),
      can_create: Boolean(adminPerm?.can_create),
      can_edit: Boolean(adminPerm?.can_edit),
      can_delete: Boolean(adminPerm?.can_delete)
    };
  };

  /** admin은 root가 부여한 메뉴만 전송 (범위 밖 메뉴는 서버에서 유지) */
  const buildPermissionPayload = (targetUserId: number) => {
    return Object.keys(permissions)
      .filter((menuId) => {
        if (user?.role !== 'admin') return true;
        return Boolean(adminPermissions[menuId]);
      })
      .map((menuId) => {
        const current = permissions[menuId] || {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false
        };
        if (user?.role === 'admin') {
          const adminPerm = adminPermissions[menuId];
          return {
            user_id: targetUserId,
            menu_id: parseInt(menuId, 10),
            can_view: Boolean(current.can_view && adminPerm?.can_view),
            can_create: Boolean(current.can_create && adminPerm?.can_create),
            can_edit: Boolean(current.can_edit && adminPerm?.can_edit),
            can_delete: Boolean(current.can_delete && adminPerm?.can_delete)
          };
        }
        return {
          user_id: targetUserId,
          menu_id: parseInt(menuId, 10),
          ...current
        };
      });
  };

  const handlePermissionChange = (menuKey: string, permissionType: keyof MenuPermission | 'all', value: boolean) => {
    if (!canSetPermission(menuKey, permissionType, value)) {
      showErrorPopup(t('menuPermissionManagement.adminScopeBlocked'), t('menuPermissionManagement.scopeTitle'));
      return;
    }
    
    const menuId = parseInt(menuKey);
    
    // 현재 메뉴의 모든 자식 메뉴 ID 찾기
    const childMenuIds = getAllChildMenuIds(menuList, menuId);
    
    setPermissions(prev => {
      const current = prev[menuKey] || {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      };

      const newPermissions: { [key: string]: MenuPermission } = { ...prev };

      // 부모 메뉴 권한 업데이트
      if (permissionType === 'all') {
        newPermissions[menuKey] = {
          can_view: value,
          can_create: value,
          can_edit: value,
          can_delete: value
        };
      } else {
        newPermissions[menuKey] = {
          ...current,
          [permissionType]: value
        };
      }

      // 모든 자식 메뉴의 권한도 동일하게 업데이트 (admin 권한 범위 내에서만)
      childMenuIds.forEach(childId => {
        const childKey = String(childId);
        const childCurrent = prev[childKey] || {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false
        };

        // 자식 메뉴도 admin 권한 범위 체크
        if (!canSetPermission(childKey, permissionType, value)) {
          return; // 권한이 없으면 스킵
        }

        if (permissionType === 'all') {
          newPermissions[childKey] = {
            can_view: value,
            can_create: value,
            can_edit: value,
            can_delete: value
          };
        } else {
          newPermissions[childKey] = {
            ...childCurrent,
            [permissionType]: value
          };
        }
      });

      return newPermissions;
    });
  };

  const handleSave = async () => {
    if (!selectedUserId && !selectedCompanyId) return;

    try {
      setSaving(true);
      if (selectedUserId) {
        const permissionData = buildPermissionPayload(selectedUserId);
        await menuService.setUserPermissions(selectedUserId, permissionData);
        showSuccessPopup(t('menuPermissionManagement.permissionsSaved'));
      } else if (selectedCompanyId) {
        const companyUsers = users.filter(u => u.company_id === selectedCompanyId);
        
        for (const companyUser of companyUsers) {
          const permissionData = buildPermissionPayload(companyUser.id);
          await menuService.setUserPermissions(companyUser.id, permissionData);
        }
        showSuccessPopup(
          t('menuPermissionManagement.companyPermissionsSaved', { count: companyUsers.length })
        );
      }
    } catch (error: any) {
      console.error('권한 저장 오류:', error);
      showErrorPopup(error, t('menuPermissionManagement.permissionsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelegation = async () => {
    if (!selectedUserId || !delegationTargetId) return;

    try {
      setSaving(true);
      const permissionData = buildPermissionPayload(delegationTargetId);
      await menuService.setUserPermissions(delegationTargetId, permissionData);
      showSuccessPopup(t('menuPermissionManagement.delegated'));
      setDelegationDialogOpen(false);
      setDelegationTargetId(null);
    } catch (error: any) {
      console.error('권한 위임 오류:', error);
      showErrorPopup(error, t('menuPermissionManagement.delegationFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 기본 권한 템플릿 적용
  const applyDefaultPermissions = async (template: 'view_only' | 'read_write' | 'full') => {
    if (!menuList || menuList.length === 0) return;
    if (!selectedUserId && !selectedCompanyId) return;

    const newPermissions: { [key: string]: MenuPermission } = {};
    
    // 모든 메뉴에 기본 권한 적용 (admin 권한 범위 내에서만)
    const applyToMenu = (menuList: Menu[]) => {
      menuList.forEach(menu => {
        const menuKey = String(menu.id);
        const adminPerm = user?.role === 'admin' ? adminPermissions[menuKey] : null;
        
        let permission: MenuPermission;
        switch (template) {
          case 'view_only':
            permission = {
              can_view: true,
              can_create: false,
              can_edit: false,
              can_delete: false
            };
            break;
          case 'read_write':
            permission = {
              can_view: true,
              can_create: true,
              can_edit: true,
              can_delete: false
            };
            break;
          case 'full':
            permission = {
              can_view: true,
              can_create: true,
              can_edit: true,
              can_delete: true
            };
            break;
        }
        
        // Admin인 경우 자신의 권한 범위 내에서만 적용
        if (user?.role === 'admin' && adminPerm) {
          permission = {
            can_view: permission.can_view && adminPerm.can_view,
            can_create: permission.can_create && adminPerm.can_create,
            can_edit: permission.can_edit && adminPerm.can_edit,
            can_delete: permission.can_delete && adminPerm.can_delete
          };
        } else if (user?.role === 'admin' && !adminPerm) {
          // Admin이 해당 메뉴에 대한 권한이 없으면 스킵
          return;
        }
        
        newPermissions[menuKey] = permission;
        
        // 하위 메뉴에도 동일하게 적용
        if (menu.children && menu.children.length > 0) {
          applyToMenu(menu.children);
        }
      });
    };
    
    applyToMenu(menuList);
    setPermissions(newPermissions);
    
    // 서버에 저장
    try {
      setSaving(true);
      if (selectedUserId) {
        const permissionData = Object.keys(newPermissions).map(menuId => ({
          user_id: selectedUserId,
          menu_id: parseInt(menuId),
          ...newPermissions[menuId]
        }));
        await menuService.setUserPermissions(selectedUserId, permissionData);
        showSuccessPopup('기본 권한이 적용되었습니다.');
      } else if (selectedCompanyId) {
        const companyUsers = users.filter(u => u.company_id === selectedCompanyId);
        for (const companyUser of companyUsers) {
          const permissionData = Object.keys(newPermissions).map(menuId => ({
            user_id: companyUser.id,
            menu_id: parseInt(menuId),
            ...newPermissions[menuId]
          }));
          await menuService.setUserPermissions(companyUser.id, permissionData);
        }
        showSuccessPopup(`${companyUsers.length}명의 사용자에게 기본 권한이 적용되었습니다.`);
      }
    } catch (error: any) {
      console.error('기본 권한 적용 오류:', error);
      showErrorPopup(error, '기본 권한 적용 오류');
    } finally {
      setSaving(false);
    }
    
    setDefaultPermissionDialogOpen(false);
  };

  // 역할별 기본 권한 적용
  const applyRoleBasedPermissions = async () => {
    if (!selectedUserId || !menuList || menuList.length === 0) return;
    
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) return;

    const newPermissions: { [key: string]: MenuPermission } = {};
    
    // 역할별 기본 권한 정의
    const rolePermissions: { [key: string]: { view: boolean; create: boolean; edit: boolean; delete: boolean } } = {
      'admin': { view: true, create: true, edit: true, delete: true },
      'manager': { view: true, create: true, edit: true, delete: false },
      'user': { view: true, create: false, edit: false, delete: false },
      'audit': { view: true, create: false, edit: false, delete: false }
    };
    
    const defaultPerm = rolePermissions[selectedUser.role.toLowerCase()] || rolePermissions['user'];
    
    // 모든 메뉴에 역할별 권한 적용 (admin 권한 범위 내에서만)
    const applyToMenu = (menuList: Menu[]) => {
      menuList.forEach(menu => {
        const menuKey = String(menu.id);
        const adminPerm = user?.role === 'admin' ? adminPermissions[menuKey] : null;
        
        let permission: MenuPermission = {
          can_view: defaultPerm.view,
          can_create: defaultPerm.create,
          can_edit: defaultPerm.edit,
          can_delete: defaultPerm.delete
        };
        
        // Admin인 경우 자신의 권한 범위 내에서만 적용
        if (user?.role === 'admin' && adminPerm) {
          permission = {
            can_view: permission.can_view && adminPerm.can_view,
            can_create: permission.can_create && adminPerm.can_create,
            can_edit: permission.can_edit && adminPerm.can_edit,
            can_delete: permission.can_delete && adminPerm.can_delete
          };
        } else if (user?.role === 'admin' && !adminPerm) {
          // Admin이 해당 메뉴에 대한 권한이 없으면 스킵
          return;
        }
        
        newPermissions[menuKey] = permission;
        
        // 하위 메뉴에도 동일하게 적용
        if (menu.children && menu.children.length > 0) {
          applyToMenu(menu.children);
        }
      });
    };
    
    applyToMenu(menuList);
    setPermissions(newPermissions);
    
    // 서버에 저장
    try {
      setSaving(true);
      const permissionData = Object.keys(newPermissions).map(menuId => ({
        user_id: selectedUserId,
        menu_id: parseInt(menuId),
        ...newPermissions[menuId]
      }));
      await menuService.setUserPermissions(selectedUserId, permissionData);
      showSuccessPopup(`${selectedUser.role} 역할의 기본 권한이 적용되었습니다.`);
    } catch (error: any) {
      console.error('역할별 기본 권한 적용 오류:', error);
      showErrorPopup(error, '역할별 기본 권한 적용 오류');
    } finally {
      setSaving(false);
    }
    
    setDefaultPermissionDialogOpen(false);
  };

  const filteredUsers = users.filter(u => {
    const matchesUserSearch = !userSearchTerm || 
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesCompanySearch = !companySearchTerm ||
      u.company.toLowerCase().includes(companySearchTerm.toLowerCase());
    // 회사가 선택된 경우 해당 회사의 사용자만 표시
    const matchesSelectedCompany = !selectedCompanyId || u.company_id === selectedCompanyId;
    return matchesUserSearch && matchesCompanySearch && matchesSelectedCompany;
  });

  const filteredCompanies = companies.filter(c => {
    const matchesCompanySearch = !companySearchTerm ||
      c.name.toLowerCase().includes(companySearchTerm.toLowerCase()) ||
      c.domain.toLowerCase().includes(companySearchTerm.toLowerCase());
    return matchesCompanySearch;
  });

  const cardShellSx = {
    borderRadius: '20px',
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? '#C5CED9' : alpha(theme.palette.divider, 0.35),
    boxShadow:
      theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.08)' : '0 4px 24px rgba(15, 23, 42, 0.06)',
    bgcolor: 'background.paper',
    overflow: 'hidden' as const,
  };

  const selectionInputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: 'background.paper',
      '& fieldset': {
        borderColor: theme.palette.mode === 'light' ? '#C5CED9' : undefined,
      },
      '&:hover fieldset': {
        borderColor: theme.palette.mode === 'light' ? '#B8C4D0' : undefined,
      },
    },
  };

  const listSectionTitleSx = {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: 'text.primary',
    mb: 1.25,
  };

  const listItemSelectedSx = {
    '&.Mui-selected': {
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      color: 'text.primary',
      '&:hover': {
        bgcolor: alpha(theme.palette.primary.main, 0.16),
      },
    },
  };

  // 권한이 없으면 접근 불가 메시지 표시
  if (!canManagePermissionPage) {
    return (
      <Box sx={{ p: 0, width: '100%' }}>
        <Alert severity="error" sx={{ borderRadius: '14px' }}>
          이 페이지는 메뉴 권한 관리 권한이 필요합니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 0,
      backgroundColor: 'transparent',
      borderRadius: 0,
      minHeight: '100%',
      width: '100%',
      maxWidth: '100%',
      marginLeft: { xs: -2, sm: -2, md: -3, lg: -3, xl: -3 },
      marginRight: { xs: -2, sm: -2, md: -3, lg: -3, xl: -3 },
      paddingLeft: { xs: 2, sm: 2, md: 3, lg: 3, xl: 3 },
      paddingRight: { xs: 2, sm: 2, md: 3, lg: 3, xl: 3 },
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* 헤더 */}
      <MvsPageHeader
        title={t('menuPermissionManagement.title')}
        description={t('menuPermissionManagement.description')}
        actions={
          (selectedUserId || selectedCompanyId) ? (
            <>
              {selectedUserId && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => setDefaultPermissionDialogOpen(true)}
                    size="small"
                    sx={{
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 2,
                      borderColor: alpha(theme.palette.divider, 0.95),
                    }}
                  >
                    {t('menuPermissionManagement.defaultPermissions')}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setDelegationDialogOpen(true)}
                    size="small"
                    sx={{
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 2,
                      borderColor: alpha(theme.palette.divider, 0.95),
                    }}
                  >
                    {t('menuPermissionManagement.permissionDelegation')}
                  </Button>
                </>
              )}
              <Button
                variant="contained"
                disableElevation
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                size="small"
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.25 }}
              >
                {saving ? t('menuPermissionManagement.saving') : t('menuPermissionManagement.save')}
              </Button>
            </>
          ) : undefined
        }
      />

      <Box sx={{ 
        display: 'flex',
        height: 'calc(100vh - 200px)',
        width: '100%',
        gap: 0,
        position: 'relative'
      }}>
        {/* 왼쪽: 사용자/회사 선택 */}
        <Box sx={{ 
          width: `${leftPanelWidth}px`,
          minWidth: '300px',
          maxWidth: '1000px',
          flexShrink: 0,
          position: 'relative'
        }}>
          <Card elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', mr: 0, ...cardShellSx }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', py: 2.75, px: { xs: 2.25, sm: 2.75 }, '&:last-child': { pb: 2.75 } }}>
              <Typography component="h2" variant="subtitle1" sx={{ ...listSectionTitleSx, fontSize: '15px', mb: 2 }}>
                {t('menuPermissionManagement.select')}
              </Typography>
              
              {/* 사용자 검색 */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('menuPermissionManagement.userSearch')}
                  placeholder={t('menuPermissionManagement.userSearchPlaceholder')}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={selectionInputSx}
                />
              </Box>

              {/* 회사 검색 */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('menuPermissionManagement.companySearch')}
                  placeholder={t('menuPermissionManagement.companySearchPlaceholder')}
                  value={companySearchTerm}
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={selectionInputSx}
                />
              </Box>

              {/* 사용자 영역 (위 60%) */}
              <Box sx={{ 
                height: `${userSectionHeight}px`,
                minHeight: '150px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <Typography component="h3" variant="subtitle2" sx={listSectionTitleSx}>
                  {t('menuPermissionManagement.users')}
                </Typography>
                {dataLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : filteredUsers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    {userSearchTerm || companySearchTerm ? t('common.search') : t('menuPermissionManagement.noUsers')}
                  </Typography>
                ) : (
                  <List dense sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
                    {filteredUsers.map((u) => (
                      <ListItemButton
                        key={u.id}
                        selected={selectedUserId === u.id}
                        onClick={() => {
                          setSelectedUserId(u.id);
                          // 회사 필터는 유지 (사용자 선택 시 회사 필터 해제하지 않음)
                        }}
                        sx={{
                          mb: 0.5,
                          borderRadius: '12px',
                          py: 1,
                          ...listItemSelectedSx,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              bgcolor:
                                selectedUserId === u.id
                                  ? alpha(theme.palette.primary.main, 0.22)
                                  : theme.palette.primary.main,
                              color: selectedUserId === u.id ? 'primary.dark' : theme.palette.primary.contrastText,
                            }}
                          >
                            {u.name.charAt(0)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={u.name}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip
                                label={u.role}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.6875rem',
                                  fontWeight: 600,
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: 'primary.dark',
                                  border: 'none',
                                  '& .MuiChip-label': { px: 1 },
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 0 }}>
                                {u.company}
                              </Typography>
                            </Box>
                          }
                          primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '-0.01em' }}
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>

              {/* 수직 리사이즈 핸들 */}
              <Box
                onMouseDown={handleVerticalMouseDown}
                sx={{
                  height: '4px',
                  cursor: 'row-resize',
                  backgroundColor: isVerticalResizing ? alpha(theme.palette.primary.main, 0.35) : alpha(theme.palette.divider, 0.9),
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                  position: 'relative',
                  flexShrink: 0,
                  transition: isVerticalResizing ? 'none' : 'background-color 0.2s',
                  zIndex: 10,
                  my: 1,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-2px',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    cursor: 'row-resize'
                  }
                }}
              />

              {/* 회사 영역 (아래 40%) */}
              <Box sx={{ 
                flex: 1,
                minHeight: '150px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <Typography component="h3" variant="subtitle2" sx={listSectionTitleSx}>
                  {t('menuPermissionManagement.companies')}
                </Typography>
                {dataLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : filteredCompanies.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    {companySearchTerm ? t('common.search') : t('menuPermissionManagement.noCompanies')}
                  </Typography>
                ) : (
                  <List dense sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
                    {filteredCompanies.map((c) => (
                      <ListItemButton
                        key={c.id}
                        selected={selectedCompanyId === c.id}
                        onClick={() => {
                          setSelectedCompanyId(c.id);
                          setSelectedUserId(null);
                        }}
                        sx={{
                          mb: 0.5,
                          borderRadius: '12px',
                          py: 1,
                          ...listItemSelectedSx,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <BusinessIcon
                            sx={{
                              fontSize: '1.25rem',
                              color: selectedCompanyId === c.id ? 'primary.main' : alpha(theme.palette.text.secondary, 0.85),
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={c.name}
                          primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 리사이즈 핸들 */}
        <Box
          ref={resizeRef}
          onMouseDown={handleMouseDown}
          sx={{
            width: '4px',
            cursor: 'col-resize',
            backgroundColor: isResizing ? alpha(theme.palette.primary.main, 0.35) : alpha(theme.palette.divider, 0.9),
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
            },
            position: 'relative',
            flexShrink: 0,
            transition: isResizing ? 'none' : 'background-color 0.2s',
            zIndex: 10,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '-2px',
              right: '-2px',
              top: 0,
              bottom: 0,
              cursor: 'col-resize'
            }
          }}
        />

        {/* 오른쪽: 메뉴 권한 트리 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', ml: 0, ...cardShellSx }}>
            <CardContent
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minWidth: 0,
                py: 2.75,
                px: { xs: 2.25, sm: 2.75 },
                '&:last-child': { pb: 2.75 },
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                mb: 2.5,
                pb: 2,
                borderBottom: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.85),
              }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: '1.0625rem', letterSpacing: '-0.02em' }}>
                    {selectedUserId
                      ? `${users.find(u => u.id === selectedUserId)?.name}의 메뉴 권한`
                      : selectedCompanyId
                      ? `${companies.find(c => c.id === selectedCompanyId)?.name}의 메뉴 권한`
                      : t('menuPermissionManagement.selectUserOrCompany')}
                  </Typography>
                  {(selectedUserId || selectedCompanyId) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, fontSize: '0.8125rem', lineHeight: 1.55 }}>
                      각 권한 박스를 클릭하여 설정하세요
                    </Typography>
                  )}
                </Box>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, flex: 1 }}>
                  <CircularProgress />
                </Box>
              ) : menuList.length > 0 && (selectedUserId || selectedCompanyId) ? (
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overflow: 'auto',
                    pr: 1.5,
                    pb: 1,
                    maxHeight: 'calc(100vh - 350px)',
                  }}
                >
                  <Box sx={{ minWidth: 'max-content', width: '100%' }}>
                    {/* 헤더 — 행과 동일 그리드로 정렬 */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 76px auto',
                        columnGap: 2,
                        alignItems: 'center',
                        width: '100%',
                        mb: 1.5,
                        pb: 1.25,
                        pr: 0.5,
                        borderBottom: '1px solid',
                        borderColor: alpha(theme.palette.divider, 0.75),
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ minWidth: '12ch', fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '-0.01em', color: 'text.secondary' }}
                      >
                        {t('menuPermissionManagement.menuName')}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          justifySelf: 'end',
                          width: '100%',
                          maxWidth: 76,
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          letterSpacing: '-0.01em',
                          color: 'text.secondary',
                        }}
                      >
                        {t('menuPermissionManagement.menuOrder')}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          justifySelf: 'end',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          letterSpacing: '-0.01em',
                          color: 'text.secondary',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('menuPermissionManagement.permissions')}
                      </Typography>
                    </Box>
                    {renderMenuTree(menuList)}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    py: 6,
                    px: 3,
                    borderRadius: '16px',
                    border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
                    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.04),
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 40, mb: 2, opacity: 0.22, color: 'text.secondary' }} />
                  <Typography variant="body1" sx={{ mb: 0.75, fontWeight: 600, letterSpacing: '-0.01em', color: 'text.primary' }}>
                    {t('menuPermissionManagement.selectUserOrCompany')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320, lineHeight: 1.6, fontSize: '0.8125rem' }}>
                    {t('menuPermissionManagement.emptyPanelHint')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 기본 권한 설정 다이얼로그 */}
      <Dialog 
        open={defaultPermissionDialogOpen} 
        onClose={() => setDefaultPermissionDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', pt: 2.5, px: 3 }}>
          기본 권한 설정
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            {selectedUserId && users.find(u => u.id === selectedUserId)?.name} 사용자에게 기본 권한을 적용합니다.
          </Typography>
          
          {/* 역할별 기본 권한 적용 */}
          {selectedUserId && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                역할별 기본 권한
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AdminPanelSettingsIcon />}
                onClick={applyRoleBasedPermissions}
                sx={{ 
                  mb: 1,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  py: 1.5,
                  borderRadius: '12px',
                  borderColor: alpha(theme.palette.divider, 0.95),
                }}
              >
                {users.find(u => u.id === selectedUserId)?.role} 역할 기본 권한 적용
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                • Admin: 전체 권한 (보기, 등록, 수정, 삭제)
                <br />
                • Manager: 읽기/쓰기 권한 (보기, 등록, 수정)
                <br />
                • User: 읽기 전용 (보기만)
                <br />
                • Audit: 읽기 전용 (보기만)
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* 템플릿 선택 */}
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            권한 템플릿
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<VisibilityOffIcon />}
              onClick={() => applyDefaultPermissions('view_only')}
              sx={{ 
                justifyContent: 'flex-start',
                textTransform: 'none',
                py: 1.5,
                borderRadius: '12px',
                borderColor: 'success.main',
                color: 'success.main',
                '&:hover': {
                  borderColor: 'success.dark',
                  backgroundColor: 'rgba(46, 125, 50, 0.08)'
                }
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  보기 전용
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  모든 메뉴에 보기 권한만 부여
                </Typography>
              </Box>
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditNoteIcon />}
              onClick={() => applyDefaultPermissions('read_write')}
              sx={{ 
                justifyContent: 'flex-start',
                textTransform: 'none',
                py: 1.5,
                borderRadius: '12px',
                borderColor: 'info.main',
                color: 'info.main',
                '&:hover': {
                  borderColor: 'info.dark',
                  backgroundColor: 'rgba(33, 150, 243, 0.08)'
                }
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  읽기/쓰기
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  모든 메뉴에 보기, 등록, 수정 권한 부여
                </Typography>
              </Box>
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => applyDefaultPermissions('full')}
              sx={{ 
                justifyContent: 'flex-start',
                textTransform: 'none',
                py: 1.5,
                borderRadius: '12px',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'rgba(25, 118, 210, 0.08)'
                }
              }}
            >
              <Box sx={{ flex: 1, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  전체 권한
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  모든 메뉴에 전체 권한 부여 (보기, 등록, 수정, 삭제)
                </Typography>
              </Box>
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDefaultPermissionDialogOpen(false)} sx={{ borderRadius: '12px', textTransform: 'none' }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 권한 위임 다이얼로그 */}
      <Dialog
        open={delegationDialogOpen}
        onClose={() => setDelegationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', pt: 2.5, px: 3 }}>
          권한 위임
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            현재 선택된 사용자({users.find(u => u.id === selectedUserId)?.name})의 권한을 다른 사용자에게 위임합니다.
          </Typography>
          <FormControl fullWidth>
            <Typography variant="body2" sx={{ mb: 1 }}>
              위임 대상 사용자
            </Typography>
            <Select
              value={delegationTargetId || ''}
              onChange={(e) => setDelegationTargetId(e.target.value as number)}
              displayEmpty
              sx={{ borderRadius: '12px' }}
            >
              <MenuItem value="">선택하세요</MenuItem>
              {users.filter(u => u.id !== selectedUserId && u.status === 'active').map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.role}) - {u.company}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDelegationDialogOpen(false)} sx={{ borderRadius: '12px', textTransform: 'none' }}>
            취소
          </Button>
          <Button
            onClick={handleDelegation}
            variant="contained"
            disableElevation
            disabled={!delegationTargetId || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
          >
            {saving ? '위임 중...' : '위임'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuPermissionManagement;
