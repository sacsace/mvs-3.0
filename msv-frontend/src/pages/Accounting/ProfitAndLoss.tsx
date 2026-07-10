import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  RestartAlt as ResetIcon,
  Search as SearchIcon,
  TrendingDown,
  TrendingUp,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import { accountingService } from '../../services/api';
import { getGlAccountLabel } from '../../utils/glAccountLabel';
import { formatInr } from '../../utils/formatInr';
import {
  mvsBodyCardSx,
  mvsBodyFilterWrapSx,
  mvsBodyListTableSx,
  mvsBodyListZoneSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsFilterFieldHeightSx,
  mvsKpiCardSx,
  mvsOutlinedLabelProps,
  mvsPageRootSx,
  mvsSearchFieldSx,
  mvsTableBodyRowSx,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';

type PlRow = {
  accountId: number;
  code: string;
  name: string;
  nameEn?: string | null;
  amount: number;
};

type PlData = {
  from: string | null;
  to: string | null;
  incomeRows: PlRow[];
  expenseRows: PlRow[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
};

const cellEllipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
} as const;

const tableSx = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
  bgcolor: 'transparent',
  '& .MuiTableCell-root': {
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
  },
} as const;

const ProfitAndLoss: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    canSelectCompany,
    companies,
    selectedCompanyId,
    effectiveCompanyId,
    selectedCompanyName,
    companyQuery,
    changeCompany,
  } = useAccountingCompany();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<PlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);
    setError('');
    try {
      const response = await accountingService.getProfitAndLoss({
        from: from || undefined,
        to: to || undefined,
        ...companyQuery,
      });
      setData(response?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('profitAndLoss.errors.load'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, effectiveCompanyId, companyQuery, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReset = () => {
    setFrom('');
    setTo('');
    setTab(0);
  };

  const kpis = useMemo(
    () => [
      {
        key: 'income',
        label: t('profitAndLoss.kpi.totalIncome'),
        value: data?.totalIncome ?? 0,
        color: 'primary.main',
      },
      {
        key: 'expense',
        label: t('profitAndLoss.kpi.totalExpense'),
        value: data?.totalExpense ?? 0,
        color: 'error.main',
      },
      {
        key: 'net',
        label: t('profitAndLoss.kpi.netProfit'),
        value: data?.netProfit ?? 0,
        color: (data?.netProfit ?? 0) >= 0 ? 'success.main' : 'error.main',
      },
    ],
    [data, t]
  );

  const listStateBoxSx = {
    ...mvsBodyListTableSx,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    py: { xs: 6, sm: 8 },
    px: 3,
    gap: 1.5,
  } as const;

  const filterFieldSx = { ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx };

  const renderAmountTable = (rows: PlRow[], total: number, emptyKey: string, totalColor: string) => {
    if (loading) {
      return (
        <Box sx={listStateBoxSx}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            {t('common.loading')}
          </Typography>
        </Box>
      );
    }

    if (!rows.length) {
      return (
        <Box sx={listStateBoxSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
            {t(emptyKey)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {t('profitAndLoss.empty.hint')}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
        <Table size="small" sx={tableSx}>
          <TableHead sx={mvsTableHeadHighlightSx}>
            <TableRow>
              <TableCell width="18%">{t('profitAndLoss.columns.code')}</TableCell>
              <TableCell width="52%">{t('profitAndLoss.columns.account')}</TableCell>
              <TableCell width="30%" align="right">
                {t('profitAndLoss.columns.amount')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={mvsTableBodyRowSx}>
            {rows.map((row) => (
              <TableRow key={row.accountId} hover>
                <TableCell sx={cellEllipsisSx}>{row.code}</TableCell>
                <TableCell sx={cellEllipsisSx}>{getGlAccountLabel(row, i18n.language)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatInr(row.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#F8FAFC !important' }}>
              <TableCell colSpan={2} sx={{ fontWeight: 700 }}>
                {t('profitAndLoss.total')}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: totalColor, fontVariantNumeric: 'tabular-nums' }}>
                {formatInr(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader title={t('profitAndLoss.title')} description={t('profitAndLoss.description')} />

      <AccountingCompanyBar
        canSelectCompany={canSelectCompany}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        selectedCompanyName={selectedCompanyName}
        onChangeCompany={changeCompany}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5, mb: 3 }}>
        {kpis.map((kpi) => (
          <Card key={kpi.key} elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {kpi.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: kpi.color }}
              >
                {loading ? '…' : formatInr(kpi.value)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        {t('profitAndLoss.hint')}
      </Alert>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
        <Box sx={mvsBodyFilterWrapSx}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'minmax(0, 1fr) minmax(0, 1fr) auto auto',
              },
              gap: 2,
              alignItems: 'flex-end',
              maxWidth: { sm: 720 },
              ...(mvsSearchFieldSx as Record<string, unknown>),
            }}
          >
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t('profitAndLoss.from')}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={loading}
              sx={filterFieldSx}
              {...mvsOutlinedLabelProps}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t('profitAndLoss.to')}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={loading}
              sx={filterFieldSx}
              {...mvsOutlinedLabelProps}
            />
            <Button
              variant="contained"
              disableElevation
              startIcon={<SearchIcon fontSize="small" />}
              sx={{ ...mvsBodyPrimaryBtnSx, height: 40, whiteSpace: 'nowrap' }}
              onClick={() => void load()}
              disabled={loading}
            >
              {t('profitAndLoss.search')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ResetIcon fontSize="small" />}
              sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
              onClick={handleReset}
              disabled={loading}
            >
              {t('common.reset')}
            </Button>
          </Box>
        </Box>
      </Card>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, minHeight: 48, '& .MuiTab-root': { py: 1.5, textTransform: 'none', fontWeight: 600 } }}
        >
          <Tab icon={<TrendingUp fontSize="small" />} iconPosition="start" label={t('profitAndLoss.tabs.income')} />
          <Tab icon={<TrendingDown fontSize="small" />} iconPosition="start" label={t('profitAndLoss.tabs.expense')} />
          <Tab label={t('profitAndLoss.tabs.summary')} />
        </Tabs>
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        {tab === 0 &&
          renderAmountTable(data?.incomeRows || [], data?.totalIncome ?? 0, 'profitAndLoss.empty.income', 'primary.main')}
        {tab === 1 &&
          renderAmountTable(data?.expenseRows || [], data?.totalExpense ?? 0, 'profitAndLoss.empty.expense', 'error.main')}
        {tab === 2 && (
          loading ? (
            <Box sx={listStateBoxSx}>
              <CircularProgress size={36} />
              <Typography variant="body2" color="text.secondary">
                {t('common.loading')}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
              <Table size="small" sx={tableSx}>
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    <TableCell width="60%">{t('profitAndLoss.sections.netProfit')}</TableCell>
                    <TableCell width="40%" align="right">
                      {t('profitAndLoss.columns.amount')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={mvsTableBodyRowSx}>
                  <TableRow hover>
                    <TableCell>{t('profitAndLoss.kpi.totalIncome')}</TableCell>
                    <TableCell align="right" sx={{ color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(data?.totalIncome ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>{t('profitAndLoss.kpi.totalExpense')}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(data?.totalExpense ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#F8FAFC !important' }}>
                    <TableCell sx={{ fontWeight: 700 }}>{t('profitAndLoss.kpi.netProfit')}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: (data?.netProfit ?? 0) >= 0 ? 'success.main' : 'error.main',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatInr(data?.netProfit ?? 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
        {!loading && tab === 2 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            {t('profitAndLoss.formula', {
              income: formatInr(data?.totalIncome ?? 0),
              expense: formatInr(data?.totalExpense ?? 0),
            })}
          </Typography>
        )}
      </Box>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} message={error} />
    </Box>
  );
};

export default ProfitAndLoss;
