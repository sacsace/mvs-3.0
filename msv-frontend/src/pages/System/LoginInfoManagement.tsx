import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Autocomplete,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteOutlineIcon,
  FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  ViewColumn as ViewColumnIcon
} from '@mui/icons-material';
import { companyService, loginInfoService } from '../../services/api';
import { useStore } from '../../store';
import LoginInfoExcelGrid, { LoginInfoColumnSchema, LoginInfoExcelGridHandle } from './LoginInfoExcelGrid';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';

const LOGIN_INFO_MENU_ROUTES = ['/basic-info/login-info', '/basic-info'] as const;

interface Company {
  id: number;
  name: string;
}

interface LoginInfoTabRow {
  id: number;
  company_id: number;
  name: string;
  sort_order: number;
  column_headers?: Record<string, string> | null;
  column_hidden?: string[] | null;
  column_schema?: LoginInfoColumnSchema | null;
}

interface LoginInfo {
  id: number;
  tenant_id: number;
  company_id: number;
  tab_id?: number;
  division: string;
  login_id: string;
  password: string;
  open_file_returns?: string;
  url?: string;
  extra_fields?: Record<string, string> | null;
}

/** 행 검색: 대소문자 구분 없이 비교 (영문 기준 소문자화 + NFC 정규화) */
function normalizeForRowSearch(s: string): string {
  return String(s ?? '')
    .normalize('NFC')
    .toLocaleLowerCase('en');
}

const LoginInfoManagement: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation();
  const { user } = useStore();
  const menuFlags = useMenuRoutePermissionFlags(LOGIN_INFO_MENU_ROUTES);
  const gridRef = useRef<LoginInfoExcelGridHandle>(null);
  const fieldLabelSx = {
    display: 'block',
    mb: 0.75,
    ml: 0.5,
    fontWeight: 500,
    color: isDark ? 'rgba(224, 235, 255, 0.9)' : theme.palette.text.secondary
  };
  const toolbarCardSx = isDark
    ? {}
    : {
        borderRadius: '18px',
        border: '1px solid #C5CED9',
        bgcolor: '#F0F4F8',
        boxShadow: 'none',
      };
  const toolbarInputSx = isDark
    ? { '& .MuiOutlinedInput-root': { borderRadius: '12px' } }
    : {
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          bgcolor: 'background.paper',
          '& fieldset': { borderColor: '#C5CED9' },
          '&:hover fieldset': { borderColor: '#B8C4D0' },
        },
      };
  const toolbarOutlinedBtnSx = isDark
    ? {}
    : {
        borderColor: '#C5CED9',
        '&:hover': { borderColor: '#B8C4D0', bgcolor: 'background.paper' },
      };
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [tabs, setTabs] = useState<LoginInfoTabRow[]>([]);
  const [tabsLoading, setTabsLoading] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<number | ''>('');
  const [loginInfos, setLoginInfos] = useState<LoginInfo[]>([]);
  /** 그리드 행 필터 (클라이언트 검색) */
  const [rowSearchQuery, setRowSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTabName, setRenameTabName] = useState('');
  const [deleteTabDialogOpen, setDeleteTabDialogOpen] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const activeTab = useMemo(
    () => tabs.find((x) => x.id === selectedTabId),
    [tabs, selectedTabId]
  );

  const filteredLoginInfos = useMemo(() => {
    const q = normalizeForRowSearch(rowSearchQuery.trim());
    if (!q) return loginInfos;
    return loginInfos.filter((row) => {
      const parts: string[] = [
        row.division,
        row.login_id,
        row.password,
        row.open_file_returns ?? '',
        row.url ?? '',
        ...Object.values(row.extra_fields ?? {})
      ];
      return parts.some((p) => normalizeForRowSearch(String(p ?? '')).includes(q));
    });
  }, [loginInfos, rowSearchQuery]);

  const dialogPaperSx = useMemo(
    () =>
      isDark
        ? {
            bgcolor: 'rgba(10, 20, 44, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            backgroundImage: 'none'
          }
        : undefined,
    [isDark]
  );

  const loadCompanies = useCallback(async () => {
    try {
      const response = await companyService.getCompanies();
      if (response?.success) {
        const companyList = response.data || [];
        setCompanies(companyList);

        if (!companyList.length) {
          setSelectedCompanyId('');
          return;
        }

        const hasSelectedCompany =
          selectedCompanyId !== '' &&
          companyList.some((company: Company) => company.id === selectedCompanyId);

        if (hasSelectedCompany) {
          return;
        }

        const userCompanyId = user?.company_id;
        const hasUserCompany =
          !!userCompanyId &&
          companyList.some((company: Company) => company.id === userCompanyId);

        setSelectedCompanyId(hasUserCompany ? Number(userCompanyId) : companyList[0].id);
      }
    } catch (error: any) {
      console.error('회사 목록 로드 오류:', error);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.loadCompaniesFailed'));
    }
  }, [selectedCompanyId, t, user?.company_id]);

  const loadTabs = useCallback(
    async (companyId: number, preferTabId?: number) => {
      if (menuFlags.menusLoading || !menuFlags.canRead) {
        setTabs([]);
        setSelectedTabId('');
        setTabsLoading(false);
        return;
      }
      setTabsLoading(true);
      setErrorMessage(null);
      try {
        const response = await loginInfoService.getLoginInfoTabs(companyId);
        const list: LoginInfoTabRow[] = response?.data || [];
        setTabs(list);
        if (preferTabId != null && list.some((x) => x.id === preferTabId)) {
          setSelectedTabId(preferTabId);
        } else {
          setSelectedTabId((prev) => {
            if (typeof prev === 'number' && list.some((x) => x.id === prev)) return prev;
            return list[0]?.id ?? '';
          });
        }
      } catch (error: any) {
        console.error('탭 로드 오류:', error);
        setTabs([]);
        setSelectedTabId('');
        setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.loadTabsFailed'));
      } finally {
        setTabsLoading(false);
      }
    },
    [menuFlags.canRead, menuFlags.menusLoading, t]
  );

  const loadLoginInfos = useCallback(async (companyId: number, tabId: number) => {
    if (menuFlags.menusLoading || !menuFlags.canRead) {
      setLoginInfos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await loginInfoService.getLoginInfos({ company_id: companyId, tab_id: tabId });
      if (response?.success) {
        setLoginInfos(response.data || []);
      }
    } catch (error: any) {
      console.error('로그인 정보 로드 오류:', error);
      setLoginInfos([]);
      setErrorMessage(null);
    } finally {
      setLoading(false);
    }
  }, [menuFlags.canRead, menuFlags.menusLoading]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (menuFlags.menusLoading || !menuFlags.canRead) {
      setTabs([]);
      setSelectedTabId('');
      setLoginInfos([]);
      return;
    }
    if (!selectedCompanyId) {
      setTabs([]);
      setSelectedTabId('');
      setLoginInfos([]);
      return;
    }
    loadTabs(Number(selectedCompanyId));
  }, [selectedCompanyId, loadTabs, menuFlags.menusLoading, menuFlags.canRead]);

  useEffect(() => {
    setRowSearchQuery('');
  }, [selectedCompanyId, selectedTabId]);

  useEffect(() => {
    if (menuFlags.menusLoading || !menuFlags.canRead) {
      setLoginInfos([]);
      return;
    }
    if (!selectedCompanyId || selectedTabId === '') {
      setLoginInfos([]);
      return;
    }
    setLoginInfos([]);
    loadLoginInfos(Number(selectedCompanyId), Number(selectedTabId));
  }, [selectedCompanyId, selectedTabId, loadLoginInfos, menuFlags.menusLoading, menuFlags.canRead]);

  const handleImportClick = () => {
    if (menuFlags.menusLoading || !menuFlags.canMutate) return;
    if (!selectedCompanyId || selectedTabId === '') {
      setErrorMessage(t('loginInfoManagement.errors.selectCompanyForImport'));
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (menuFlags.menusLoading || !menuFlags.canMutate) return;
    const file = event.target.files?.[0];
    if (!file || !selectedCompanyId || selectedTabId === '') {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await loginInfoService.importExcel(file, Number(selectedCompanyId), Number(selectedTabId));
      await loadLoginInfos(Number(selectedCompanyId), Number(selectedTabId));
    } catch (error: any) {
      console.error('엑셀 가져오기 오류:', error);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.importFailed'));
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const openAddTabDialog = () => {
    setNewTabName('');
    setAddDialogOpen(true);
  };

  const submitAddTab = async () => {
    if (menuFlags.menusLoading || !menuFlags.canCreate) return;
    const name = newTabName.trim();
    if (!name || !selectedCompanyId) {
      setErrorMessage(t('loginInfoManagement.errors.tabNameRequired'));
      return;
    }
    try {
      setErrorMessage(null);
      const res = await loginInfoService.createLoginInfoTab({
        company_id: Number(selectedCompanyId),
        name
      });
      setAddDialogOpen(false);
      setNewTabName('');
      if (res?.success && res.data?.id) {
        await loadTabs(Number(selectedCompanyId), res.data.id);
      } else {
        await loadTabs(Number(selectedCompanyId));
      }
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.saveTabFailed'));
    }
  };

  const openRenameDialog = () => {
    if (!activeTab) return;
    setRenameTabName(activeTab.name);
    setRenameDialogOpen(true);
  };

  const submitRenameTab = async () => {
    if (menuFlags.menusLoading || !menuFlags.canEdit) return;
    const name = renameTabName.trim();
    if (!name || selectedTabId === '' || !selectedCompanyId) {
      setErrorMessage(t('loginInfoManagement.errors.tabNameRequired'));
      return;
    }
    try {
      setErrorMessage(null);
      await loginInfoService.updateLoginInfoTab(Number(selectedTabId), { name });
      setRenameDialogOpen(false);
      await loadTabs(Number(selectedCompanyId), Number(selectedTabId));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.saveTabFailed'));
    }
  };

  const handleDeleteTab = () => {
    if (selectedTabId === '' || !selectedCompanyId) return;
    setDeleteTabDialogOpen(true);
  };

  const handleColumnHeadersPatch = useCallback(
    async (patch: Record<string, string>) => {
      if (menuFlags.menusLoading || !menuFlags.canMutate) return;
      if (selectedTabId === '' || !selectedCompanyId) return;
      try {
        setErrorMessage(null);
        await loginInfoService.updateLoginInfoTab(Number(selectedTabId), { column_headers: patch });
        await loadTabs(Number(selectedCompanyId), Number(selectedTabId));
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.saveTabFailed'));
        throw error;
      }
    },
    [loadTabs, menuFlags.canMutate, menuFlags.menusLoading, selectedCompanyId, selectedTabId, t]
  );

  const handleColumnSchemaChange = useCallback(
    async (schema: LoginInfoColumnSchema | null) => {
      if (menuFlags.menusLoading || !menuFlags.canMutate) return;
      if (selectedTabId === '' || !selectedCompanyId) return;
      try {
        setErrorMessage(null);
        await loginInfoService.updateLoginInfoTab(Number(selectedTabId), {
          column_schema: schema
        });
        await loadTabs(Number(selectedCompanyId), Number(selectedTabId));
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.saveTabFailed'));
        throw error;
      }
    },
    [loadTabs, menuFlags.canMutate, menuFlags.menusLoading, selectedCompanyId, selectedTabId, t]
  );

  const confirmDeleteTab = async () => {
    if (menuFlags.menusLoading || !menuFlags.canDelete) return;
    if (selectedTabId === '' || !selectedCompanyId) return;
    try {
      setErrorMessage(null);
      await loginInfoService.deleteLoginInfoTab(Number(selectedTabId));
      setDeleteTabDialogOpen(false);
      await loadTabs(Number(selectedCompanyId));
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.deleteTabFailed'));
    }
  };

  return (
    <Box
      sx={{
        p: 0,
        color: 'text.primary',
        '& .MuiCard-root': isDark
          ? {
              backgroundColor: 'rgba(10, 20, 44, 0.72)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }
          : undefined,
        '& .MuiTypography-root': isDark ? { color: 'rgba(245, 248, 255, 0.92)' } : undefined,
        '& .MuiInputLabel-root': isDark ? { color: 'rgba(230, 236, 255, 0.78)' } : undefined,
        '& .MuiInputBase-input': isDark ? { color: 'rgba(246, 249, 255, 0.95)' } : undefined,
        '& .MuiInputBase-input::placeholder': isDark ? { color: 'rgba(223, 232, 255, 0.56)', opacity: 1 } : undefined,
        '& .MuiOutlinedInput-notchedOutline': isDark ? { borderColor: 'rgba(222, 231, 255, 0.32)' } : undefined,
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': isDark ? { borderColor: 'rgba(181, 206, 255, 0.48)' } : undefined,
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': isDark ? { borderColor: 'rgba(138, 181, 255, 0.82)' } : undefined,
        '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': isDark ? { color: 'rgba(220, 231, 255, 0.8)' } : undefined
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography component="h1" variant="pageTitle">
          {t('loginInfoManagement.title')}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mt: 0.75,
            color: isDark ? 'rgba(200, 214, 235, 0.88)' : 'text.secondary',
            lineHeight: 1.5,
            maxWidth: 720
          }}
        >
          {t('loginInfoManagement.description')}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mt: 1,
            color: isDark ? 'rgba(180, 200, 230, 0.85)' : 'text.secondary',
            lineHeight: 1.5,
            maxWidth: 900,
            fontSize: '0.8125rem'
          }}
        >
          {t('loginInfoManagement.excelHint')}
        </Typography>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}
      {!menuFlags.menusLoading && !menuFlags.canRead && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('common.menuNoView')}
        </Alert>
      )}

      <Card elevation={0} sx={{ mb: 3, ...toolbarCardSx }}>
        <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', md: 'flex-end' },
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0, ...toolbarInputSx }}>
              <Typography variant="caption" sx={fieldLabelSx}>
                {t('loginInfoManagement.fields.company')}
              </Typography>
              <Autocomplete
                options={companies}
                value={selectedCompany || null}
                onChange={(_, newValue) => setSelectedCompanyId(newValue?.id ?? '')}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                disabled={menuFlags.menusLoading || !menuFlags.canRead}
                renderInput={(params) => (
                  <TextField {...params} size="small" placeholder={t('loginInfoManagement.placeholders.selectCompany')} />
                )}
              />
            </Box>
            <TextField
              size="small"
              placeholder={t('loginInfoManagement.placeholders.searchRows')}
              value={rowSearchQuery}
              onChange={(e) => setRowSearchQuery(e.target.value)}
              disabled={menuFlags.menusLoading || !menuFlags.canRead || !selectedCompanyId || selectedTabId === ''}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                )
              }}
              sx={{
                width: { xs: '100%', sm: '100%', md: 280 },
                flexShrink: 0,
                '& .MuiInputBase-root': { height: 40 },
                ...toolbarInputSx,
              }}
            />
            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                gap: 1,
                flexWrap: 'wrap',
                alignSelf: { xs: 'stretch', md: 'flex-end' },
                '& .MuiButton-root': {
                  height: 40
                },
                '& .MuiButton-outlined': toolbarOutlinedBtnSx,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() =>
                      selectedCompanyId &&
                      selectedTabId !== '' &&
                      loadLoginInfos(Number(selectedCompanyId), Number(selectedTabId))
                    }
                    disabled={menuFlags.menusLoading || !menuFlags.canRead || !selectedCompanyId || selectedTabId === ''}
                  >
                    {t('loginInfoManagement.actions.refresh')}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canMutate}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="outlined"
                    onClick={handleImportClick}
                    disabled={
                      menuFlags.menusLoading ||
                      !menuFlags.canMutate ||
                      !selectedCompanyId ||
                      selectedTabId === ''
                    }
                  >
                    {t('loginInfoManagement.actions.importExcel')}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={() => gridRef.current?.exportToExcel()}
                    disabled={menuFlags.menusLoading || !menuFlags.canRead || !selectedCompanyId || selectedTabId === ''}
                  >
                    {t('loginInfoManagement.actions.exportExcel')}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canMutate}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="outlined"
                    startIcon={<ViewColumnIcon />}
                    onClick={() => gridRef.current?.openAddColumnDialog()}
                    disabled={
                      menuFlags.menusLoading ||
                      !menuFlags.canMutate ||
                      !selectedCompanyId ||
                      selectedTabId === ''
                    }
                  >
                    {t('loginInfoManagement.actions.addColumn')}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => gridRef.current?.addRow()}
                    disabled={
                      menuFlags.menusLoading ||
                      !menuFlags.canCreate ||
                      !selectedCompanyId ||
                      selectedTabId === ''
                    }
                  >
                    {t('loginInfoManagement.actions.addNew')}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: '6px',
          overflow: 'hidden'
        }}
      >
        <CardContent>
          {!selectedCompanyId ? (
            <Typography color="text.secondary">{t('loginInfoManagement.errors.selectCompanyFirst')}</Typography>
          ) : tabsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : tabs.length === 0 ? (
            <Typography color="text.secondary">{t('loginInfoManagement.errors.noTabs')}</Typography>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 0.5,
                  mb: 1
                }}
              >
                <Tabs
                  value={selectedTabId === '' ? false : selectedTabId}
                  onChange={(_, v) => setSelectedTabId(v as number)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      ...(isDark ? { color: 'rgba(200, 214, 235, 0.75)' } : {})
                    },
                    '& .Mui-selected': isDark ? { color: 'rgba(199, 217, 255, 0.98) !important' } : undefined
                  }}
                >
                  {tabs.map((tab) => (
                    <Tab key={tab.id} value={tab.id} label={tab.name} disabled={menuFlags.menusLoading} />
                  ))}
                </Tabs>
                <Tooltip
                  title={
                    menuFlags.menusLoading || !menuFlags.canCreate
                      ? t('common.menuNoCreate')
                      : t('loginInfoManagement.tabs.addTab')
                  }
                >
                  <span style={{ display: 'inline-flex' }}>
                    <IconButton
                      size="small"
                      onClick={openAddTabDialog}
                      disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                      aria-label={t('loginInfoManagement.tabs.addTab')}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip
                  title={
                    menuFlags.menusLoading || !menuFlags.canEdit
                      ? t('common.menuNoEdit')
                      : t('loginInfoManagement.tabs.renameTab')
                  }
                >
                  <span style={{ display: 'inline-flex' }}>
                    <IconButton
                      size="small"
                      onClick={openRenameDialog}
                      disabled={menuFlags.menusLoading || !menuFlags.canEdit || !activeTab}
                      aria-label={t('loginInfoManagement.tabs.renameTab')}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip
                  title={
                    menuFlags.menusLoading || !menuFlags.canDelete
                      ? t('common.menuNoDelete')
                      : t('loginInfoManagement.tabs.deleteTab')
                  }
                >
                  <span style={{ display: 'inline-flex' }}>
                    <IconButton
                      size="small"
                      onClick={() => void handleDeleteTab()}
                      disabled={
                        menuFlags.menusLoading ||
                        !menuFlags.canDelete ||
                        !activeTab ||
                        tabs.length <= 1
                      }
                      aria-label={t('loginInfoManagement.tabs.deleteTab')}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t('loginInfoManagement.companyInfoTitleWithTab', {
                    companyName: selectedCompany?.name ?? '',
                    tabName: activeTab?.name ?? ''
                  })}
                </Typography>
              </Box>
              {loading && loginInfos.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : selectedTabId !== '' ? (
                <LoginInfoExcelGrid
                  key={`${selectedCompanyId}-${selectedTabId}`}
                  ref={gridRef}
                  companyId={Number(selectedCompanyId)}
                  companyName={selectedCompany?.name}
                  tabId={Number(selectedTabId)}
                  tabLabel={activeTab?.name ?? ''}
                  columnHeaders={activeTab?.column_headers}
                  columnSchema={activeTab?.column_schema}
                  columnHiddenLegacy={activeTab?.column_hidden}
                  onColumnHeadersPatch={handleColumnHeadersPatch}
                  onColumnSchemaChange={handleColumnSchemaChange}
                  loginInfos={filteredLoginInfos}
                  loading={loading}
                  isDark={isDark}
                  onReload={async () => {
                    if (selectedCompanyId) {
                      await loadLoginInfos(Number(selectedCompanyId), Number(selectedTabId));
                    }
                  }}
                  onError={setErrorMessage}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={isDark ? { color: 'rgba(245, 248, 255, 0.95)' } : undefined}>
          {t('loginInfoManagement.tabs.addTab')}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('loginInfoManagement.tabs.tabName')}
            fullWidth
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submitAddTab()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t('loginInfoManagement.actions.cancel')}</Button>
          <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                onClick={() => void submitAddTab()}
              >
                {t('loginInfoManagement.actions.add')}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={isDark ? { color: 'rgba(245, 248, 255, 0.95)' } : undefined}>
          {t('loginInfoManagement.tabs.renameTab')}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('loginInfoManagement.tabs.tabName')}
            fullWidth
            value={renameTabName}
            onChange={(e) => setRenameTabName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submitRenameTab()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>{t('loginInfoManagement.actions.cancel')}</Button>
          <Tooltip title={t('common.menuNoEdit')} disableHoverListener={menuFlags.menusLoading || menuFlags.canEdit}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                disabled={menuFlags.menusLoading || !menuFlags.canEdit}
                onClick={() => void submitRenameTab()}
              >
                {t('loginInfoManagement.actions.save')}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteTabDialogOpen}
        onClose={() => setDeleteTabDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontWeight: 600, ...(isDark ? { color: 'rgba(245, 248, 255, 0.95)' } : {}) }}>
          {t('loginInfoManagement.dialog.deleteTabTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(200, 214, 235, 0.92)' : 'text.secondary' }}>
            {t('loginInfoManagement.confirm.deleteTab')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTabDialogOpen(false)}>{t('loginInfoManagement.actions.cancel')}</Button>
          <Tooltip title={t('common.menuNoDelete')} disableHoverListener={menuFlags.menusLoading || menuFlags.canDelete}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                color="error"
                variant="contained"
                disabled={menuFlags.menusLoading || !menuFlags.canDelete}
                onClick={() => void confirmDeleteTab()}
              >
                {t('loginInfoManagement.actions.delete')}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginInfoManagement;

