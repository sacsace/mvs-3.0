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
  AccountBalance as EquityIcon,
  RestartAlt as ResetIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  AccountBalanceWallet as AssetIcon,
  CreditCard as LiabilityIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import { accountingService } from '../../services/api';
import { getGlAccountLabel } from '../../utils/glAccountLabel';
import { formatInr } from '../../utils/formatInr';
import { exportBalanceSheetExcel } from '../../utils/exportFinancialStatementExcel';
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

type BsRow = {
  accountId: number;
  code: string;
  name: string;
  nameEn?: string | null;
  amount: number;
  synthetic?: boolean;
};

type BsData = {
  asOf: string | null;
  from: string | null;
  assetRows: BsRow[];
  liabilityRows: BsRow[];
  equityRows: BsRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  netProfit: number;
  balanced: boolean;
  source?: string;
  tallyVoucherCount?: number;
};

type FinancialYearRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_open: boolean;
};

type BsPeriodKey = 'q1' | 'q2' | 'q3' | 'q4' | 'fiscalYear';

const BS_PERIOD_KEYS: BsPeriodKey[] = ['q1', 'q2', 'q3', 'q4', 'fiscalYear'];

const toYmdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const resolveCurrentFinancialYear = (
  rows: FinancialYearRow[],
  now = new Date()
): FinancialYearRow | null => {
  if (!rows.length) return null;
  const today = toYmdLocal(now);
  const containing = rows.filter((fy) => today >= fy.start_date && today <= fy.end_date);
  if (containing.length) {
    return containing.find((fy) => fy.is_open) || containing[0];
  }
  return rows[0];
};

/** 회계연도 마스터 없거나 폴백: 인도식 FY (4/1 ~ 익년 3/31) */
const fallbackIndiaFiscalYear = (now = new Date()): { start_date: string; end_date: string } => {
  const y = now.getFullYear();
  const startYear = now.getMonth() + 1 >= 4 ? y : y - 1;
  return { start_date: `${startYear}-04-01`, end_date: `${startYear + 1}-03-31` };
};

const parseYmdLocal = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const getBalanceSheetPeriodRange = (
  key: BsPeriodKey,
  fiscalYear?: FinancialYearRow | null
): { from: string; asOf: string } => {
  const fy = fiscalYear?.start_date && fiscalYear?.end_date
    ? { start_date: fiscalYear.start_date, end_date: fiscalYear.end_date }
    : fallbackIndiaFiscalYear();

  if (key === 'fiscalYear') {
    return { from: fy.start_date, asOf: fy.end_date };
  }

  const quarterIndex = ({ q1: 0, q2: 1, q3: 2, q4: 3 } as const)[key];
  const fyStart = parseYmdLocal(fy.start_date);
  const qStart = new Date(fyStart.getFullYear(), fyStart.getMonth() + quarterIndex * 3, fyStart.getDate());
  const qEndExclusive = new Date(fyStart.getFullYear(), fyStart.getMonth() + (quarterIndex + 1) * 3, fyStart.getDate());
  const qEnd = new Date(qEndExclusive);
  qEnd.setDate(qEnd.getDate() - 1);

  const from = toYmdLocal(qStart);
  let asOf = toYmdLocal(qEnd);
  if (asOf > fy.end_date) asOf = fy.end_date;
  if (from < fy.start_date) return { from: fy.start_date, asOf };
  return { from, asOf };
};

const periodToggleGroupSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
  flex: '1 1 auto',
  minWidth: 0,
} as const;

const periodBtnSx = {
  border: '1px solid #C5CED9',
  borderRadius: '10px',
  px: 1.25,
  height: 40,
  minWidth: 0,
  textTransform: 'none' as const,
  fontWeight: 600,
  fontSize: '0.8125rem',
  whiteSpace: 'nowrap' as const,
  boxShadow: 'none',
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

const BalanceSheet: React.FC = () => {
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
  const [asOf, setAsOf] = useState('');
  const [periodKey, setPeriodKey] = useState<BsPeriodKey | null>(null);
  const [financialYears, setFinancialYears] = useState<FinancialYearRow[]>([]);
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<BsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const currentFinancialYear = useMemo(
    () => resolveCurrentFinancialYear(financialYears),
    [financialYears]
  );

  useEffect(() => {
    if (!effectiveCompanyId) {
      setFinancialYears([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await accountingService.getFinancialYears(effectiveCompanyId);
        if (!cancelled) {
          setFinancialYears(Array.isArray(res?.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) setFinancialYears([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveCompanyId]);

  const load = useCallback(async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);
    setError('');
    try {
      const response = await accountingService.getBalanceSheet({
        from: from || undefined,
        asOf: asOf || undefined,
        ...companyQuery,
      });
      setData(response?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('balanceSheet.errors.load'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, asOf, effectiveCompanyId, companyQuery, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPeriod = (key: BsPeriodKey) => {
    const range = getBalanceSheetPeriodRange(key, currentFinancialYear);
    setPeriodKey(key);
    setFrom(range.from);
    setAsOf(range.asOf);
  };

  const handleReset = () => {
    setFrom('');
    setAsOf('');
    setPeriodKey(null);
    setTab(0);
  };

  const handleExcelDownload = async () => {
    if (!data) {
      setError(t('balanceSheet.errors.noDataForExport'));
      return;
    }
    try {
      setExporting(true);
      await exportBalanceSheetExcel({
        data,
        companyName: selectedCompanyName || undefined,
        language: i18n.language,
        filePrefix: i18n.language?.startsWith('en') ? 'Balance_Sheet' : '재무상태표',
      });
    } catch (err: any) {
      setError(err?.message || t('balanceSheet.errors.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const kpis = useMemo(
    () => [
      {
        key: 'assets',
        label: t('balanceSheet.kpi.totalAssets'),
        value: data?.totalAssets ?? 0,
        color: 'primary.main',
      },
      {
        key: 'liab',
        label: t('balanceSheet.kpi.totalLiabilities'),
        value: data?.totalLiabilities ?? 0,
        color: 'warning.main',
      },
      {
        key: 'equity',
        label: t('balanceSheet.kpi.totalEquity'),
        value: data?.totalEquity ?? 0,
        color: 'success.main',
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

  const renderAmountTable = (rows: BsRow[], total: number, emptyKey: string, totalColor: string) => {
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
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
            {t('balanceSheet.empty.hint')}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
        <Table size="small" sx={tableSx}>
          <TableHead sx={mvsTableHeadHighlightSx}>
            <TableRow>
              <TableCell width="18%">{t('balanceSheet.columns.code')}</TableCell>
              <TableCell width="52%">{t('balanceSheet.columns.account')}</TableCell>
              <TableCell width="30%" align="right">
                {t('balanceSheet.columns.amount')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={mvsTableBodyRowSx}>
            {rows.map((row) => (
              <TableRow key={`${row.accountId}-${row.code}`} hover>
                <TableCell sx={cellEllipsisSx}>{row.code}</TableCell>
                <TableCell sx={cellEllipsisSx}>
                  {row.synthetic ? row.name : getGlAccountLabel(row, i18n.language)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatInr(row.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#F8FAFC !important' }}>
              <TableCell colSpan={2} sx={{ fontWeight: 700 }}>
                {t('balanceSheet.total')}
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
      <MvsPageHeader title={t('balanceSheet.title')} description={t('balanceSheet.description')} />

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

      <Alert severity={data?.balanced === false ? 'warning' : 'info'} sx={{ mb: 2 }}>
        {data?.balanced === false ? t('balanceSheet.unbalancedHint') : t('balanceSheet.hint')}
      </Alert>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
        <Box sx={mvsBodyFilterWrapSx}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={periodToggleGroupSx}>
              {BS_PERIOD_KEYS.map((key) => {
                const selected = periodKey === key;
                return (
                  <Button
                    key={key}
                    size="small"
                    variant={selected ? 'contained' : 'outlined'}
                    disableElevation
                    disabled={loading}
                    onClick={() => applyPeriod(key)}
                    sx={{
                      ...periodBtnSx,
                      ...(selected
                        ? {
                            bgcolor: 'primary.main',
                            color: '#fff',
                            borderColor: 'primary.main',
                            '&:hover': { bgcolor: 'primary.dark', borderColor: 'primary.dark' },
                          }
                        : {
                            bgcolor: '#fff',
                            color: 'text.primary',
                            '&:hover': { bgcolor: '#F8FAFC', borderColor: '#9AA8B8' },
                          }),
                    }}
                  >
                    {t(`balanceSheet.periods.${key}`)}
                  </Button>
                );
              })}
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'minmax(0, 1fr) minmax(0, 1fr) auto auto auto',
                },
                gap: 2,
                alignItems: 'flex-end',
                maxWidth: { sm: 920 },
                ...(mvsSearchFieldSx as Record<string, unknown>),
              }}
            >
              <TextField
                fullWidth
                size="small"
                type="date"
                label={t('balanceSheet.from')}
                value={from}
                onChange={(e) => {
                  setPeriodKey(null);
                  setFrom(e.target.value);
                }}
                disabled={loading}
                sx={filterFieldSx}
                {...mvsOutlinedLabelProps}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label={t('balanceSheet.asOf')}
                value={asOf}
                onChange={(e) => {
                  setPeriodKey(null);
                  setAsOf(e.target.value);
                }}
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
                {t('balanceSheet.search')}
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
              <Button
                variant="outlined"
                startIcon={<DownloadIcon fontSize="small" />}
                sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
                onClick={handleExcelDownload}
                disabled={loading || exporting || !data}
              >
                {t('balanceSheet.excelDownload')}
              </Button>
            </Box>
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
          <Tab icon={<AssetIcon fontSize="small" />} iconPosition="start" label={t('balanceSheet.tabs.assets')} />
          <Tab
            icon={<LiabilityIcon fontSize="small" />}
            iconPosition="start"
            label={t('balanceSheet.tabs.liabilities')}
          />
          <Tab icon={<EquityIcon fontSize="small" />} iconPosition="start" label={t('balanceSheet.tabs.equity')} />
          <Tab label={t('balanceSheet.tabs.summary')} />
        </Tabs>
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        {tab === 0 &&
          renderAmountTable(data?.assetRows || [], data?.totalAssets ?? 0, 'balanceSheet.empty.assets', 'primary.main')}
        {tab === 1 &&
          renderAmountTable(
            data?.liabilityRows || [],
            data?.totalLiabilities ?? 0,
            'balanceSheet.empty.liabilities',
            'warning.main'
          )}
        {tab === 2 &&
          renderAmountTable(data?.equityRows || [], data?.totalEquity ?? 0, 'balanceSheet.empty.equity', 'success.main')}
        {tab === 3 &&
          (loading ? (
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
                    <TableCell width="60%">{t('balanceSheet.sections.equation')}</TableCell>
                    <TableCell width="40%" align="right">
                      {t('balanceSheet.columns.amount')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={mvsTableBodyRowSx}>
                  <TableRow hover>
                    <TableCell>{t('balanceSheet.kpi.totalAssets')}</TableCell>
                    <TableCell align="right" sx={{ color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(data?.totalAssets ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>{t('balanceSheet.kpi.totalLiabilities')}</TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(data?.totalLiabilities ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>{t('balanceSheet.kpi.totalEquity')}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatInr(data?.totalEquity ?? 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#F8FAFC !important' }}>
                    <TableCell sx={{ fontWeight: 700 }}>{t('balanceSheet.kpi.liabilitiesAndEquity')}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: data?.balanced ? 'success.main' : 'error.main',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatInr(data?.totalLiabilitiesAndEquity ?? 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ))}
        {!loading && tab === 3 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            {t('balanceSheet.formula', {
              assets: formatInr(data?.totalAssets ?? 0),
              liabilityEquity: formatInr(data?.totalLiabilitiesAndEquity ?? 0),
            })}
          </Typography>
        )}
      </Box>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} message={error} />
    </Box>
  );
};

export default BalanceSheet;
