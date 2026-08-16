import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
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
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import { accountingService } from '../../services/api';
import { getGlAccountName } from '../../utils/glAccountLabel';
import { formatInr } from '../../utils/formatInr';
import { exportBalanceSheetExcel } from '../../utils/exportFinancialStatementExcel';
import {
  AmountRow,
  BsBundle,
  ComparativeLine,
  PlBundle,
  TbRow,
  buildBsSheet,
  buildCapitalSheet,
  buildGstRows,
  buildOtherExpenseRows,
  buildPlSheet,
  buildSchBsSheet,
  buildSchPlSheet,
  buildTradePayableRows,
  sumAmounts,
} from '../../utils/financialStatementSheets';
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

type BsData = BsBundle & {
  asOf: string | null;
  from: string | null;
  balanced: boolean;
  source?: string;
  tallyVoucherCount?: number;
};

type PlData = PlBundle & {
  from: string | null;
  to: string | null;
};

type FinancialYearRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_open: boolean;
};

type BsPeriodKey = 'q1' | 'q2' | 'q3' | 'q4' | 'fiscalYear';

type SheetKey =
  | 'bs'
  | 'pl'
  | 'capital'
  | 'schBs'
  | 'schPl'
  | 'trialBalance'
  | 'tradePayable'
  | 'outputGst'
  | 'inputGst'
  | 'otherExpenses';

const BS_PERIOD_KEYS: BsPeriodKey[] = ['q1', 'q2', 'q3', 'q4', 'fiscalYear'];

const SHEET_KEYS: SheetKey[] = [
  'bs',
  'pl',
  'capital',
  'schBs',
  'schPl',
  'trialBalance',
  'tradePayable',
  'outputGst',
  'inputGst',
  'otherExpenses',
];

/** Note No. → 이동 탭 (SEDA 스케줄 매핑) */
const NOTE_SHEET_MAP: Record<string, SheetKey> = {
  '1': 'capital',
  '2': 'capital',
  '3': 'capital',
  '4': 'schBs',
  '5': 'schBs',
  '6': 'schBs',
  '7': 'schBs',
  '8': 'schPl',
  '9': 'schPl',
  '10': 'schPl',
};

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
  const fy =
    fiscalYear?.start_date && fiscalYear?.end_date
      ? { start_date: fiscalYear.start_date, end_date: fiscalYear.end_date }
      : fallbackIndiaFiscalYear();

  if (key === 'fiscalYear') {
    return { from: fy.start_date, asOf: fy.end_date };
  }

  const quarterIndex = ({ q1: 0, q2: 1, q3: 2, q4: 3 } as const)[key];
  const fyStart = parseYmdLocal(fy.start_date);
  const qStart = new Date(fyStart.getFullYear(), fyStart.getMonth() + quarterIndex * 3, fyStart.getDate());
  const qEndExclusive = new Date(
    fyStart.getFullYear(),
    fyStart.getMonth() + (quarterIndex + 1) * 3,
    fyStart.getDate()
  );
  const qEnd = new Date(qEndExclusive);
  qEnd.setDate(qEnd.getDate() - 1);

  const from = toYmdLocal(qStart);
  let asOf = toYmdLocal(qEnd);
  if (asOf > fy.end_date) asOf = fy.end_date;
  if (from < fy.start_date) return { from: fy.start_date, asOf };
  return { from, asOf };
};

const dateOneYearEarlier = (ymd: string) => {
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${year - 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const periodToggleGroupSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
  flex: '1 1 auto',
  minWidth: 0,
} as const;

const periodBtnSx = {
  border: '1px solid #CBD5E1',
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

const compactTableSx = {
  ...tableSx,
  '& .MuiTableCell-root': {
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
    py: 0.45,
    lineHeight: 1.25,
  },
} as const;

const compactHeadSx = {
  '& .MuiTableCell-head': {
    py: 0.85,
    lineHeight: 1.25,
  },
} as const;

/** 비교표 전기 열 연한 강조 */
const excelPrevColBg = '#F3FAF4';

const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const formatExcelMonthYear = (ymd: string) => {
  if (!ymd) return '';
  const [y, m] = ymd.split('-').map(Number);
  if (!y || !m) return '';
  return `${MONTH_SHORT[m - 1]}'${String(y).slice(-2)}`;
};

const formatExcelPeriodRange = (fromYmd: string, toYmd: string) => {
  const a = formatExcelMonthYear(fromYmd);
  const b = formatExcelMonthYear(toYmd);
  if (!a || !b) return '';
  return `${a}~${b}`;
};

const totalRowSx = {
  bgcolor: '#F8FAFC !important',
  '& .MuiTableCell-root': { fontWeight: 700 },
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

  const [from, setFrom] = useState(() => fallbackIndiaFiscalYear().start_date);
  const [asOf, setAsOf] = useState(() => fallbackIndiaFiscalYear().end_date);
  const [periodKey, setPeriodKey] = useState<BsPeriodKey | null>('fiscalYear');
  const [financialYears, setFinancialYears] = useState<FinancialYearRow[]>([]);
  const [sheet, setSheet] = useState<SheetKey>('bs');
  const [bsCurrent, setBsCurrent] = useState<BsData | null>(null);
  const [bsPrevious, setBsPrevious] = useState<BsData | null>(null);
  const [plCurrent, setPlCurrent] = useState<PlData | null>(null);
  const [plPrevious, setPlPrevious] = useState<PlData | null>(null);
  const [trialRows, setTrialRows] = useState<TbRow[]>([]);
  const [trialTotals, setTrialTotals] = useState({ debit: 0, credit: 0 });
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
      const prevFrom = dateOneYearEarlier(from);
      const prevAsOf = dateOneYearEarlier(asOf);
      const [
        bsRes,
        bsPrevRes,
        plRes,
        plPrevRes,
        tbRes,
      ] = await Promise.all([
        accountingService.getBalanceSheet({
          from: from || undefined,
          asOf: asOf || undefined,
          ...companyQuery,
        }),
        prevAsOf
          ? accountingService.getBalanceSheet({
              from: prevFrom || undefined,
              asOf: prevAsOf,
              ...companyQuery,
            })
          : Promise.resolve(null),
        accountingService.getProfitAndLoss({
          from: from || undefined,
          to: asOf || undefined,
          ...companyQuery,
        }),
        prevAsOf
          ? accountingService.getProfitAndLoss({
              from: prevFrom || undefined,
              to: prevAsOf,
              ...companyQuery,
            })
          : Promise.resolve(null),
        accountingService.getTrialBalance({
          from: from || undefined,
          to: asOf || undefined,
          ...companyQuery,
        }),
      ]);

      setBsCurrent(bsRes?.data || null);
      setBsPrevious(bsPrevRes?.data || null);
      setPlCurrent(plRes?.data || null);
      setPlPrevious(plPrevRes?.data || null);

      const tbData = tbRes?.data;
      const rows: TbRow[] = Array.isArray(tbData?.rows) ? tbData.rows : [];
      setTrialRows(rows);
      setTrialTotals({
        debit: Number(tbData?.totalDebit || 0),
        credit: Number(tbData?.totalCredit || 0),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || t('balanceSheet.errors.load'));
      setBsCurrent(null);
      setBsPrevious(null);
      setPlCurrent(null);
      setPlPrevious(null);
      setTrialRows([]);
      setTrialTotals({ debit: 0, credit: 0 });
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
    const range = getBalanceSheetPeriodRange('fiscalYear', currentFinancialYear);
    setFrom(range.from);
    setAsOf(range.asOf);
    setPeriodKey('fiscalYear');
    setSheet('bs');
  };

  const handleExcelDownload = async () => {
    if (!bsCurrent) {
      setError(t('balanceSheet.errors.noDataForExport'));
      return;
    }
    try {
      setExporting(true);
      await exportBalanceSheetExcel({
        data: bsCurrent,
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

  const currentPeriodLabel = asOf || bsCurrent?.asOf || '-';
  const previousPeriodLabel = dateOneYearEarlier(asOf || bsCurrent?.asOf || '');
  const currentPeriodCaption = formatExcelPeriodRange(from, asOf);
  const previousPeriodCaption = formatExcelPeriodRange(dateOneYearEarlier(from), dateOneYearEarlier(asOf));

  const comparativeSheets = useMemo(() => {
    return {
      bs: buildBsSheet(bsCurrent, bsPrevious),
      pl: buildPlSheet(plCurrent, plPrevious),
      capital: buildCapitalSheet(bsCurrent, bsPrevious),
      schBs: buildSchBsSheet(bsCurrent, bsPrevious),
      schPl: buildSchPlSheet(plCurrent, plPrevious),
    };
  }, [bsCurrent, bsPrevious, plCurrent, plPrevious]);

  const detailSheets = useMemo(() => {
    const liabilities = (bsCurrent?.liabilityRows || []) as AmountRow[];
    const assets = (bsCurrent?.assetRows || []) as AmountRow[];
    const expenses = (plCurrent?.expenseRows || []) as AmountRow[];
    return {
      tradePayable: buildTradePayableRows(liabilities),
      outputGst: buildGstRows([...liabilities, ...assets], 'output'),
      inputGst: buildGstRows([...assets, ...liabilities], 'input'),
      otherExpenses: buildOtherExpenseRows(expenses),
    };
  }, [bsCurrent, plCurrent]);

  const kpis = useMemo(
    () => [
      {
        key: 'assets',
        label: t('balanceSheet.kpi.totalAssets'),
        value: bsCurrent?.totalAssets ?? 0,
        color: 'primary.main',
      },
      {
        key: 'liab',
        label: t('balanceSheet.kpi.totalLiabilities'),
        value: bsCurrent?.totalLiabilities ?? 0,
        color: 'warning.main',
      },
      {
        key: 'equity',
        label: t('balanceSheet.kpi.totalEquity'),
        value: bsCurrent?.totalEquity ?? 0,
        color: 'success.main',
      },
      {
        key: 'profit',
        label: t('balanceSheet.kpi.netProfit'),
        value: plCurrent?.netProfit ?? bsCurrent?.netProfit ?? 0,
        color: (plCurrent?.netProfit ?? bsCurrent?.netProfit ?? 0) >= 0 ? 'success.main' : 'error.main',
      },
    ],
    [bsCurrent, plCurrent, t]
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

  const renderComparative = (lines: ComparativeLine[]) => {
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

    if (!lines.length) {
      return (
        <Box sx={listStateBoxSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t('balanceSheet.empty.hint')}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
        <Table size="small" sx={{ ...compactTableSx, minWidth: 860 }}>
          <TableHead sx={[mvsTableHeadHighlightSx, compactHeadSx] as any}>
            <TableRow>
              <TableCell width="6%" />
              <TableCell width="44%">{t('balanceSheet.statement.particulars')}</TableCell>
              <TableCell width="8%" align="center">
                {t('balanceSheet.statement.noteNo')}
              </TableCell>
              <TableCell width="21%" align="right">
                <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
                  {t('balanceSheet.statement.forPeriod', {
                    range: currentPeriodCaption || currentPeriodLabel,
                  })}
                </Box>
                <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>
                  {t('balanceSheet.statement.amountRs')}
                </Box>
              </TableCell>
              <TableCell
                width="21%"
                align="right"
                sx={{ bgcolor: `${excelPrevColBg} !important` }}
              >
                <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
                  {t('balanceSheet.statement.forPeriod', {
                    range:
                      previousPeriodCaption ||
                      previousPeriodLabel ||
                      t('balanceSheet.statement.previousPeriod'),
                  })}
                </Box>
                <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}>
                  {t('balanceSheet.statement.amountRs')}
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={mvsTableBodyRowSx}>
            {lines.map((row, idx) => {
              const isSection = Boolean(row.section);
              const isTotal = Boolean(row.total);
              const isCategory = !isSection && !isTotal && row.indent === 0 && row.current === null;
              const showAmount = row.current !== null || row.previous !== null;
              const bold = isSection || isTotal || isCategory;
              const labelIndent = isTotal || isSection || isCategory ? 0 : row.indent ?? 1;
              const noteKey = String(row.note || '').trim();
              const noteTarget = noteKey ? NOTE_SHEET_MAP[noteKey] : undefined;

              return (
                <TableRow
                  key={`${row.index || ''}-${row.label}-${idx}`}
                  hover={!isSection && !isTotal}
                  sx={isTotal ? totalRowSx : undefined}
                >
                  <TableCell
                    align="center"
                    sx={{ fontWeight: bold ? 700 : 400, whiteSpace: 'nowrap', color: 'text.secondary' }}
                  >
                    {isTotal ? '' : row.index || ''}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: bold ? 700 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      ...(isTotal ? { textAlign: 'center', pl: 1.5 } : { pl: 1.5 + labelIndent * 1.75 }),
                    }}
                  >
                    {row.label}
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {isSection || isCategory || isTotal || !noteKey ? (
                      ''
                    ) : noteTarget ? (
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => setSheet(noteTarget)}
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          border: 0,
                          background: 'none',
                          p: 0,
                          color: 'primary.main',
                        }}
                      >
                        {noteKey}
                      </Link>
                    ) : (
                      <Box component="span" sx={{ color: 'text.secondary' }}>
                        {noteKey}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: isTotal ? 700 : 400 }}
                  >
                    {showAmount && row.current !== null ? formatInr(row.current) : ''}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: isTotal ? 700 : 400,
                      bgcolor: `${excelPrevColBg} !important`,
                    }}
                  >
                    {showAmount && row.previous !== null ? formatInr(row.previous) : ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderLedgerList = (rows: AmountRow[], emptyKey: string) => {
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t(emptyKey)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
            {t('balanceSheet.empty.hint')}
          </Typography>
        </Box>
      );
    }

    const total = sumAmounts(rows);
    return (
      <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
        <Table size="small" sx={compactTableSx}>
          <TableHead sx={[mvsTableHeadHighlightSx, compactHeadSx] as any}>
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
              <TableRow key={`${row.accountId}-${row.code || row.name}`} hover>
                <TableCell sx={cellEllipsisSx}>{row.code || ''}</TableCell>
                <TableCell sx={cellEllipsisSx}>
                  {row.synthetic
                    ? row.name
                    : getGlAccountName(
                        { code: row.code, name: row.name, name_en: row.nameEn },
                        i18n.language
                      )}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatInr(row.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={totalRowSx}>
              <TableCell colSpan={2}>{t('balanceSheet.total')}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatInr(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderTrialBalance = () => {
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

    if (!trialRows.length) {
      return (
        <Box sx={listStateBoxSx}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t('balanceSheet.empty.trialBalance')}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
        <Table size="small" sx={{ ...compactTableSx, minWidth: 880 }}>
          <TableHead sx={[mvsTableHeadHighlightSx, compactHeadSx] as any}>
            <TableRow>
              <TableCell width="12%">{t('balanceSheet.columns.code')}</TableCell>
              <TableCell width="36%">{t('balanceSheet.statement.particulars')}</TableCell>
              <TableCell width="12%">{t('balanceSheet.columns.group')}</TableCell>
              <TableCell width="13%" align="right">
                {t('balanceSheet.columns.debit')}
              </TableCell>
              <TableCell width="13%" align="right">
                {t('balanceSheet.columns.credit')}
              </TableCell>
              <TableCell width="14%" align="right">
                {t('balanceSheet.columns.closing')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={mvsTableBodyRowSx}>
            {trialRows.map((row) => (
              <TableRow key={row.accountId} hover>
                <TableCell sx={cellEllipsisSx}>{row.code}</TableCell>
                <TableCell sx={cellEllipsisSx}>
                  {getGlAccountName(
                    { code: row.code, name: row.name, name_en: (row as any).nameEn ?? (row as any).name_en },
                    i18n.language
                  )}
                </TableCell>
                <TableCell sx={cellEllipsisSx}>{row.nature || ''}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatInr(row.debit)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatInr(row.credit)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatInr(row.balance)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={totalRowSx}>
              <TableCell colSpan={3}>{t('balanceSheet.total')}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatInr(trialTotals.debit)}
              </TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatInr(trialTotals.credit)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderSheet = () => {
    switch (sheet) {
      case 'bs':
        return renderComparative(comparativeSheets.bs);
      case 'pl':
        return renderComparative(comparativeSheets.pl);
      case 'capital':
        return renderComparative(comparativeSheets.capital);
      case 'schBs':
        return renderComparative(comparativeSheets.schBs);
      case 'schPl':
        return renderComparative(comparativeSheets.schPl);
      case 'trialBalance':
        return renderTrialBalance();
      case 'tradePayable':
        return renderLedgerList(detailSheets.tradePayable, 'balanceSheet.empty.tradePayable');
      case 'outputGst':
        return renderLedgerList(detailSheets.outputGst, 'balanceSheet.empty.outputGst');
      case 'inputGst':
        return renderLedgerList(detailSheets.inputGst, 'balanceSheet.empty.inputGst');
      case 'otherExpenses':
        return renderLedgerList(detailSheets.otherExpenses, 'balanceSheet.empty.otherExpenses');
      default:
        return null;
    }
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
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

      <Alert severity={bsCurrent?.balanced === false ? 'warning' : 'info'} sx={{ mb: 2 }}>
        {bsCurrent?.balanced === false ? t('balanceSheet.unbalancedHint') : t('balanceSheet.hint')}
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
                sx={filterFieldSx}
                {...mvsOutlinedLabelProps}
              />
              <Button
                variant="contained"
                disableElevation
                startIcon={<SearchIcon fontSize="small" />}
                onClick={() => void load()}
                disabled={loading}
                sx={{ ...mvsBodyPrimaryBtnSx, height: 40, whiteSpace: 'nowrap' }}
              >
                {t('balanceSheet.search')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<ResetIcon fontSize="small" />}
                onClick={handleReset}
                disabled={loading}
                sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
              >
                {t('common.reset')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon fontSize="small" />}
                onClick={() => void handleExcelDownload()}
                disabled={loading || exporting || !bsCurrent}
                sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
              >
                {t('balanceSheet.excelDownload')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 0 }}>
        <Tabs
          value={sheet}
          onChange={(_, value: SheetKey) => setSheet(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            minHeight: 48,
            '& .MuiTab-root': { py: 1.5, textTransform: 'none', fontWeight: 600 },
          }}
        >
          {SHEET_KEYS.map((key) => (
            <Tab key={key} value={key} label={t(`balanceSheet.sheets.${key}`)} />
          ))}
        </Tabs>
      </Card>

      <Box sx={mvsBodyListZoneSx}>{renderSheet()}</Box>

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BalanceSheet;
