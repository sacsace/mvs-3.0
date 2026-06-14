import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { companyService, loginInfoService } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useStore } from '../../store';

interface Company {
  id: number;
  name: string;
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

/** MSV 시스템 로그인 감사 로그 (시스템 설정 탭) */
const SystemLoginHistoryTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logFilters, setLogFilters] = useState({
    userid: '',
    status: '' as '' | 'success' | 'failure',
    start_date: '',
    end_date: ''
  });

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );

  const loadCompanies = useCallback(async () => {
    try {
      const companyList = await useReferenceDataStore.getState().fetchCompanies();
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
          !!userCompanyId && companyList.some((company: Company) => company.id === userCompanyId);

        setSelectedCompanyId(hasUserCompany ? Number(userCompanyId) : companyList[0].id);
    } catch (error: any) {
      console.error('회사 목록 로드 오류:', error);
      setErrorMessage(error?.response?.data?.message || t('loginInfoManagement.errors.loadCompaniesFailed'));
    }
  }, [selectedCompanyId, t, user?.company_id]);

  const loadLoginLogs = useCallback(
    async (companyId?: number) => {
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
    },
    [logFilters.end_date, logFilters.start_date, logFilters.status, logFilters.userid, t]
  );

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadLoginLogs(Number(selectedCompanyId));
    } else {
      setLoginLogs([]);
    }
  }, [loadLoginLogs, selectedCompanyId]);

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

  const fieldLabelSx = {
    display: 'block',
    mb: 0.75,
    ml: 0.5,
    fontWeight: 500,
    color: 'text.secondary'
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('systemSettings.loginHistoryHint')}
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

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
                onChange={(event) => setLogFilters((prev) => ({ ...prev, userid: event.target.value }))}
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
                onChange={(event) => setLogFilters((prev) => ({ ...prev, start_date: event.target.value }))}
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
                onChange={(event) => setLogFilters((prev) => ({ ...prev, end_date: event.target.value }))}
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
              {t('systemSettings.tabs.systemLoginHistory')}
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
                          label={
                            log.status === 'success'
                              ? t('loginInfoManagement.status.success')
                              : t('loginInfoManagement.status.failure')
                          }
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
    </Box>
  );
};

export default SystemLoginHistoryTab;
