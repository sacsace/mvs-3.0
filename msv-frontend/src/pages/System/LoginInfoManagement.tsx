import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { companyService, loginInfoService } from '../../services/api';
import { useStore } from '../../store';

interface Company {
  id: number;
  name: string;
}

interface LoginInfo {
  id: number;
  tenant_id: number;
  company_id: number;
  division: string;
  login_id: string;
  password: string;
  open_file_returns?: string;
  url?: string;
}

interface LoginLog {
  id: number;
  tenant_id?: number | null;
  company_id?: number | null;
  user_id?: number | null;
  userid?: string | null;
  status: 'success' | 'failure';
  reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  logged_at?: string;
  user?: {
    id: number;
    username?: string;
    userid?: string;
  } | null;
}

interface LoginInfoForm {
  id?: number;
  company_id: number | '';
  division: string;
  login_id: string;
  password: string;
  open_file_returns: string;
  url: string;
}

const emptyForm: LoginInfoForm = {
  company_id: '',
  division: '',
  login_id: '',
  password: '',
  open_file_returns: '',
  url: ''
};

const LoginInfoManagement: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t, i18n } = useTranslation();
  const { user } = useStore();
  const fieldLabelSx = {
    display: 'block',
    mb: 0.75,
    ml: 0.5,
    fontWeight: 500,
    color: isDark ? 'rgba(224, 235, 255, 0.9)' : theme.palette.text.secondary
  };
  const [activeTab, setActiveTab] = useState<'info' | 'log'>('info');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [loginInfos, setLoginInfos] = useState<LoginInfo[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logFilters, setLogFilters] = useState({
    userid: '',
    status: '' as '' | 'success' | 'failure',
    start_date: '',
    end_date: ''
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<LoginInfoForm>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId),
    [companies, selectedCompanyId]
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

  const loadLoginInfos = useCallback(async (companyId?: number) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await loginInfoService.getLoginInfos(
        companyId ? { company_id: companyId } : undefined
      );
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
  }, []);

  const loadLoginLogs = useCallback(async (companyId?: number) => {
    setLogLoading(true);
    setErrorMessage(null);
    try {
      const response = await loginInfoService.getLoginLogs({
        company_id: companyId,
        userid: logFilters.userid.trim() || undefined,
        status: logFilters.status || undefined,
        start_date: logFilters.start_date || undefined,
        end_date: logFilters.end_date || undefined,
        limit: 300
      });
      if (response?.success) {
        setLoginLogs(response.data || []);
      } else {
        setLoginLogs([]);
      }
    } catch (error: any) {
      console.error('로그인 로그 로드 오류:', error);
      setLoginLogs([]);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.loadLogsFailed'));
    } finally {
      setLogLoading(false);
    }
  }, [logFilters.end_date, logFilters.start_date, logFilters.status, logFilters.userid, t]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (selectedCompanyId) {
      if (activeTab === 'info') {
        loadLoginInfos(Number(selectedCompanyId));
      } else {
        loadLoginLogs(Number(selectedCompanyId));
      }
    } else {
      if (activeTab === 'info') {
        setLoginInfos([]);
      } else {
        setLoginLogs([]);
      }
    }
  }, [activeTab, loadLoginInfos, loadLoginLogs, selectedCompanyId]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setFormData({
      ...emptyForm,
      company_id: selectedCompanyId || ''
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: LoginInfo) => {
    setDialogMode('edit');
    setFormData({
      id: item.id,
      company_id: item.company_id,
      division: item.division,
      login_id: item.login_id,
      password: item.password,
      open_file_returns: item.open_file_returns || '',
      url: item.url || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.company_id || !formData.division || !formData.login_id || !formData.password) {
      setErrorMessage(t('loginInfoManagement.errors.requiredFields'));
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const payload = {
        company_id: formData.company_id,
        division: formData.division.trim(),
        login_id: formData.login_id.trim(),
        password: formData.password.trim(),
        open_file_returns: formData.open_file_returns.trim() || null,
        url: formData.url.trim() || null
      };

      if (dialogMode === 'create') {
        await loginInfoService.createLoginInfo(payload);
      } else if (formData.id) {
        await loginInfoService.updateLoginInfo(formData.id, payload);
      }

      setDialogOpen(false);
      if (selectedCompanyId) {
        await loadLoginInfos(Number(selectedCompanyId));
      }
    } catch (error: any) {
      console.error('로그인 정보 저장 오류:', error);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(t('loginInfoManagement.confirm.delete'));
    if (!confirmed) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      await loginInfoService.deleteLoginInfo(id);
      if (selectedCompanyId) {
        await loadLoginInfos(Number(selectedCompanyId));
      }
    } catch (error: any) {
      console.error('로그인 정보 삭제 오류:', error);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    if (!selectedCompanyId) {
      setErrorMessage(t('loginInfoManagement.errors.selectCompanyForImport'));
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCompanyId) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await loginInfoService.importExcel(file, Number(selectedCompanyId));
      await loadLoginInfos(Number(selectedCompanyId));
    } catch (error: any) {
      console.error('엑셀 가져오기 오류:', error);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.importFailed'));
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleLogSearch = async () => {
    if (!selectedCompanyId) {
      setErrorMessage(t('loginInfoManagement.errors.selectCompanyFirst'));
      return;
    }
    await loadLoginLogs(Number(selectedCompanyId));
  };

  const handleLogFilterReset = async () => {
    const nextFilters = {
      userid: '',
      status: '' as '' | 'success' | 'failure',
      start_date: '',
      end_date: ''
    };
    setLogFilters(nextFilters);

    if (!selectedCompanyId) {
      setLoginLogs([]);
      return;
    }

    setLogLoading(true);
    try {
      const response = await loginInfoService.getLoginLogs({
        company_id: Number(selectedCompanyId),
        limit: 300
      });
      if (response?.success) {
        setLoginLogs(response.data || []);
      } else {
        setLoginLogs([]);
      }
    } catch (error: any) {
      console.error('로그인 로그 초기화 조회 오류:', error);
      setLoginLogs([]);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.loadLogsFailed'));
    } finally {
      setLogLoading(false);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ko-KR', { hour12: false });
  };

  return (
    <Box
      sx={{
        p: 3,
        color: 'text.primary',
        '& .MuiCard-root': isDark
          ? {
              backgroundColor: 'rgba(10, 20, 44, 0.72)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }
          : undefined,
        '& .MuiTypography-root': isDark ? { color: 'rgba(245, 248, 255, 0.92)' } : undefined,
        '& .MuiTab-root': isDark ? { color: 'rgba(235, 241, 255, 0.72)' } : undefined,
        '& .Mui-selected': isDark ? { color: '#9cc2ff !important' } : undefined,
        '& .MuiInputLabel-root': isDark ? { color: 'rgba(230, 236, 255, 0.78)' } : undefined,
        '& .MuiInputBase-input': isDark ? { color: 'rgba(246, 249, 255, 0.95)' } : undefined,
        '& .MuiInputBase-input::placeholder': isDark ? { color: 'rgba(223, 232, 255, 0.56)', opacity: 1 } : undefined,
        '& .MuiOutlinedInput-notchedOutline': isDark ? { borderColor: 'rgba(222, 231, 255, 0.32)' } : undefined,
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': isDark ? { borderColor: 'rgba(181, 206, 255, 0.48)' } : undefined,
        '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': isDark ? { borderColor: 'rgba(138, 181, 255, 0.82)' } : undefined,
        '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': isDark ? { color: 'rgba(220, 231, 255, 0.8)' } : undefined,
        '& .MuiTableCell-root': isDark ? { color: 'rgba(241, 246, 255, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)' } : undefined,
        '& .MuiTableHead-root .MuiTableCell-root': isDark ? { color: 'rgba(199, 217, 255, 0.92)', backgroundColor: 'rgba(255, 255, 255, 0.03)' } : undefined
      }}
    >
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        {t('loginInfoManagement.title')}
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={{ minHeight: 42, '& .MuiTab-root': { minHeight: 42 } }}
          >
            <Tab value="info" label={t('loginInfoManagement.tabs.info')} />
            <Tab value="log" label={t('loginInfoManagement.tabs.log')} />
          </Tabs>
        </CardContent>
      </Card>

      {activeTab === 'info' ? (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: { xs: 'stretch', md: 'center' },
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 2
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={fieldLabelSx}>
                    {t('loginInfoManagement.fields.company')}
                  </Typography>
                  <Autocomplete
                    options={companies}
                    value={selectedCompany || null}
                    onChange={(_, newValue) => setSelectedCompanyId(newValue?.id ?? '')}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                      <TextField {...params} size="small" placeholder={t('loginInfoManagement.placeholders.selectCompany')} />
                    )}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                    gap: 1,
                    flexWrap: 'wrap',
                    alignSelf: { xs: 'stretch', md: 'flex-end' },
                    '& .MuiButton-root': {
                      height: 40
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => selectedCompanyId && loadLoginInfos(Number(selectedCompanyId))}
                  >
                    {t('loginInfoManagement.actions.refresh')}
                  </Button>
                  <Button variant="outlined" onClick={handleImportClick}>
                    {t('loginInfoManagement.actions.importExcel')}
                  </Button>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                    {t('loginInfoManagement.actions.addNew')}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {selectedCompany
                    ? t('loginInfoManagement.companyInfoTitle', { companyName: selectedCompany.name })
                    : t('loginInfoManagement.tabs.info')}
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 60 }}>No</TableCell>
                      <TableCell>{t('loginInfoManagement.fields.division')}</TableCell>
                      <TableCell>{t('loginInfoManagement.fields.loginId')}</TableCell>
                      <TableCell>{t('loginInfoManagement.fields.password')}</TableCell>
                      <TableCell>{t('loginInfoManagement.fields.openFileReturns')}</TableCell>
                      <TableCell>URL</TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>
                        {t('loginInfoManagement.fields.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginInfos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          {t('loginInfoManagement.empty.noData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginInfos.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.division}</TableCell>
                          <TableCell>{item.login_id}</TableCell>
                          <TableCell>{item.password}</TableCell>
                          <TableCell>{item.open_file_returns || '-'}</TableCell>
                          <TableCell>
                            {item.url ? (
                              <a href={item.url} target="_blank" rel="noreferrer">
                                {item.url}
                              </a>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title={t('loginInfoManagement.actions.edit')}>
                              <IconButton size="small" onClick={() => openEditDialog(item)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('loginInfoManagement.actions.delete')}>
                              <IconButton size="small" onClick={() => handleDelete(item.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr auto auto' },
                  gap: 1.5,
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="caption" sx={fieldLabelSx}>
                    {t('loginInfoManagement.fields.company')}
                  </Typography>
                  <Autocomplete
                    options={companies}
                    value={selectedCompany || null}
                    onChange={(_, newValue) => setSelectedCompanyId(newValue?.id ?? '')}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                      <TextField {...params} size="small" placeholder={t('loginInfoManagement.placeholders.selectCompany')} />
                    )}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={fieldLabelSx}>
                    {t('loginInfoManagement.fields.searchUserId')}
                  </Typography>
                  <TextField
                    size="small"
                    placeholder={t('loginInfoManagement.placeholders.searchUserId')}
                    value={logFilters.userid}
                    onChange={(event) =>
                      setLogFilters((prev) => ({ ...prev, userid: event.target.value }))
                    }
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={fieldLabelSx}>
                    {t('loginInfoManagement.fields.result')}
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={logFilters.status}
                      displayEmpty
                      onChange={(event) =>
                        setLogFilters((prev) => ({
                          ...prev,
                          status: event.target.value as '' | 'success' | 'failure'
                        }))
                      }
                    >
                      <MenuItem value="">{t('loginInfoManagement.filters.all')}</MenuItem>
                      <MenuItem value="success">{t('loginInfoManagement.status.success')}</MenuItem>
                      <MenuItem value="failure">{t('loginInfoManagement.status.failure')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <Typography variant="caption" sx={fieldLabelSx}>
                    {t('loginInfoManagement.fields.startDate')}
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    placeholder={t('loginInfoManagement.placeholders.date')}
                    value={logFilters.start_date}
                    onChange={(event) =>
                      setLogFilters((prev) => ({ ...prev, start_date: event.target.value }))
                    }
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption" sx={fieldLabelSx}>
                    {t('loginInfoManagement.fields.endDate')}
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    placeholder={t('loginInfoManagement.placeholders.date')}
                    value={logFilters.end_date}
                    onChange={(event) =>
                      setLogFilters((prev) => ({ ...prev, end_date: event.target.value }))
                    }
                    fullWidth
                  />
                </Box>
                <Button
                  variant="outlined"
                  onClick={handleLogFilterReset}
                  sx={{
                    alignSelf: 'end',
                    height: 40,
                    mb: 0.1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t('loginInfoManagement.actions.reset')}
                </Button>
                <Button variant="contained" onClick={handleLogSearch} startIcon={<RefreshIcon />}>
                  {t('loginInfoManagement.actions.search')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box
                sx={{
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  flexWrap: 'wrap'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t('loginInfoManagement.tabs.log')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('loginInfoManagement.recentCount', { count: loginLogs.length })}
                </Typography>
              </Box>

              {logLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 70 }}>No</TableCell>
                      <TableCell sx={{ width: 190 }}>{t('loginInfoManagement.fields.loginAt')}</TableCell>
                      <TableCell sx={{ width: 110 }}>{t('loginInfoManagement.fields.result')}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>{t('loginInfoManagement.fields.userId')}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>{t('loginInfoManagement.fields.userName')}</TableCell>
                      <TableCell sx={{ minWidth: 130 }}>IP</TableCell>
                      <TableCell sx={{ minWidth: 170 }}>{t('loginInfoManagement.fields.reason')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          {t('loginInfoManagement.empty.noData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      loginLogs.map((log, index) => (
                        <TableRow key={log.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{formatDateTime(log.logged_at)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={log.status === 'success' ? t('loginInfoManagement.status.success') : t('loginInfoManagement.status.failure')}
                              color={log.status === 'success' ? 'success' : 'error'}
                              variant={log.status === 'success' ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>{log.userid || '-'}</TableCell>
                          <TableCell>{log.user?.username || '-'}</TableCell>
                          <TableCell>{log.ip_address || '-'}</TableCell>
                          <TableCell>{log.reason || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? t('loginInfoManagement.dialog.createTitle') : t('loginInfoManagement.dialog.editTitle')}
        </DialogTitle>
        <DialogContent sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={fieldLabelSx}>
              {t('loginInfoManagement.fields.company')}
            </Typography>
            <Autocomplete
              options={companies}
              value={companies.find((company) => company.id === formData.company_id) || null}
              onChange={(_, newValue) =>
                setFormData((prev) => ({ ...prev, company_id: newValue?.id ?? '' }))
              }
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder={t('loginInfoManagement.placeholders.selectCompany')} />
              )}
            />
          </Box>
          <Box>
            <Typography variant="caption" sx={fieldLabelSx}>
              {t('loginInfoManagement.fields.divisionRequired')}
            </Typography>
            <TextField
              value={formData.division}
              onChange={(event) => setFormData((prev) => ({ ...prev, division: event.target.value }))}
              size="small"
              placeholder={t('loginInfoManagement.placeholders.enterDivision')}
              fullWidth
              required
            />
          </Box>
          <Box>
            <Typography variant="caption" sx={fieldLabelSx}>
              {t('loginInfoManagement.fields.loginIdRequired')}
            </Typography>
            <TextField
              value={formData.login_id}
              onChange={(event) => setFormData((prev) => ({ ...prev, login_id: event.target.value }))}
              size="small"
              placeholder={t('loginInfoManagement.placeholders.enterLoginId')}
              fullWidth
              required
            />
          </Box>
          <Box>
            <Typography variant="caption" sx={fieldLabelSx}>
              {t('loginInfoManagement.fields.passwordRequired')}
            </Typography>
            <TextField
              value={formData.password}
              onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
              size="small"
              placeholder={t('loginInfoManagement.placeholders.enterPassword')}
              fullWidth
              required
            />
          </Box>
          <Box>
            <Typography variant="caption" sx={fieldLabelSx}>
              {t('loginInfoManagement.fields.openFileReturns')}
            </Typography>
            <TextField
              value={formData.open_file_returns}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, open_file_returns: event.target.value }))
              }
              size="small"
              placeholder={t('loginInfoManagement.placeholders.enterValue')}
              fullWidth
            />
          </Box>
          <Box>
            <Typography variant="caption" sx={fieldLabelSx}>
              URL
            </Typography>
            <TextField
              value={formData.url}
              onChange={(event) => setFormData((prev) => ({ ...prev, url: event.target.value }))}
              size="small"
              placeholder="https://example.com"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? t('loginInfoManagement.actions.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginInfoManagement;
