import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  ListItemIcon,
  Menu,
  MenuItem,
  Pagination,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme, type SxProps, type Theme } from '@mui/material/styles';
import {
  Assessment as ReportIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  MenuBook as BooksIcon,
  MoreHoriz as MoreHorizIcon,
  Preview as PreviewIcon,
  RestartAlt as ResetIcon,
  Science as DryRunIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import { accountingService } from '../../services/api';
import {
  mvsBodyCardSx,
  mvsBodyFilterWrapSx,
  mvsBodyListTableSx,
  mvsBodyListZoneSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPaginationSx,
  mvsBodyPrimaryBtnSx,
  mvsKpiCardSx,
  mvsPageRootSx,
  mvsTableBodyRowSx,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';

const ROWS_PER_PAGE = 10;
/** Keep in sync with server default `TALLY_IMPORT_MAX_MB` (2048 = 2GB) */
const TALLY_IMPORT_MAX_BYTES = 2048 * 1024 * 1024;

const cellEllipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
} as const;

const tableSx = {
  width: '100%',
  tableLayout: 'fixed' as const,
  minWidth: 560,
  borderCollapse: 'collapse',
  bgcolor: 'transparent',
  '& .MuiTableCell-root': {
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
  },
} as const;

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

const tableBodyRowSx: SxProps<Theme> = (theme) => {
  const base = typeof mvsTableBodyRowSx === 'function' ? mvsTableBodyRowSx(theme) : mvsTableBodyRowSx;
  const rowBg = theme.palette.mode === 'light' ? '#FFFFFF' : theme.palette.background.paper;
  const hoverBg = theme.palette.mode === 'light' ? '#EFF6FF' : theme.palette.action.hover;
  return {
    ...(base as object),
    '& .MuiTableRow-root:nth-of-type(odd)': { bgcolor: rowBg },
    '& .MuiTableRow-root:nth-of-type(even)': { bgcolor: rowBg },
    '& .MuiTableRow-root:hover': { bgcolor: hoverBg },
  };
};

type PreviewData = {
  format: string;
  fileName?: string;
  ledgers: Array<{ name: string; parent?: string; openingBalance?: number }>;
  vouchers: Array<{
    date: string;
    voucherType: string;
    voucherNumber: string;
    narration?: string;
    lineCount: number;
    totalDebit: number;
    totalCredit: number;
  }>;
  totals: { ledgers: number; vouchers: number };
};

type ImportResult = {
  dryRun: boolean;
  format: string;
  batchId?: number | null;
  parsed: { ledgers: number; vouchers: number };
  ledgers: { matched: number; created: number; skipped: number };
  vouchers: { created: number; skipped: number; failed: number };
  issues: Array<{ level: string; message: string; context?: string }>;
  createdVoucherIds: number[];
  createdAccountCodes: string[];
};

type ReconciliationData = {
  status: 'PASS' | 'FAIL';
  scope: string;
  note: string;
  checks: {
    voucherCount: { status: string; source: number; mvs: number };
    debitTotal: { status: string; source: string; mvs: string; difference: string };
    creditTotal: { status: string; source: string; mvs: string; difference: string };
    ledgerMovements: { status: string; differenceCount: number };
  };
};

type ReportIssueSource = 'preview' | 'dryRun' | 'import';

type ReportIssue = {
  level: string;
  message: string;
  context?: string;
  source: ReportIssueSource;
  at: string;
};

type ListTab = 'preview' | 'report';

type IssueLevelFilter = 'all' | 'error' | 'warn' | 'info';

const ISSUE_LEVEL_ORDER: Record<string, number> = { error: 0, warn: 1, info: 2 };

const renderEllipsis = (text: string) => (
  <Tooltip title={text} placement="top-start" enterDelay={400}>
    <Box
      component="span"
      sx={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </Box>
  </Tooltip>
);

const IssueLevelChip: React.FC<{ level: string; label: string }> = ({ level, label }) => {
  const color =
    level === 'error' ? 'error' : level === 'warn' ? 'warning' : level === 'info' ? 'info' : 'default';
  return (
    <Chip
      size="small"
      label={label}
      color={color}
      variant="outlined"
      sx={{ height: 22, fontWeight: 600, fontSize: '0.7rem' }}
    />
  );
};

const TallyImport: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isCompactToolbar = useMediaQuery(theme.breakpoints.down('md'));
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    canSelectCompany,
    companies,
    selectedCompanyId,
    effectiveCompanyId,
    selectedCompanyName,
    changeCompany,
  } = useAccountingCompany();

  const [file, setFile] = useState<File | null>(null);
  const [importLedgers, setImportLedgers] = useState(true);
  const [importVouchers, setImportVouchers] = useState(true);
  const [createMissingLedgers, setCreateMissingLedgers] = useState(true);
  const [createMissingParties, setCreateMissingParties] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [reportIssues, setReportIssues] = useState<ReportIssue[]>([]);
  const [listTab, setListTab] = useState<ListTab>('preview');
  const [previewPage, setPreviewPage] = useState(1);
  const [issuesPage, setIssuesPage] = useState(1);
  const [issueLevelFilter, setIssueLevelFilter] = useState<IssueLevelFilter>('all');
  const [toolbarMenuAnchor, setToolbarMenuAnchor] = useState<null | HTMLElement>(null);

  const booksHref = effectiveCompanyId
    ? `/accounting/books?tab=vouchers&company_id=${effectiveCompanyId}`
    : '/accounting/books?tab=vouchers';

  const kpiItems = useMemo(() => {
    if (result) {
      return [
        { key: 'ledgers', label: t('tallyImport.kpi.parsedLedgers'), value: result.parsed.ledgers },
        { key: 'vouchers', label: t('tallyImport.kpi.parsedVouchers'), value: result.parsed.vouchers },
        { key: 'createdAcc', label: t('tallyImport.kpi.createdAccounts'), value: result.ledgers.created },
        { key: 'createdVch', label: t('tallyImport.kpi.createdVouchers'), value: result.vouchers.created },
      ];
    }
    if (preview) {
      return [
        { key: 'ledgers', label: t('tallyImport.kpi.parsedLedgers'), value: preview.totals.ledgers },
        { key: 'vouchers', label: t('tallyImport.kpi.parsedVouchers'), value: preview.totals.vouchers },
        {
          key: 'format',
          label: t('tallyImport.kpi.format'),
          value: String(preview.format || '-').toUpperCase(),
        },
        {
          key: 'file',
          label: t('tallyImport.kpi.file'),
          value: file?.name ? '1' : '0',
        },
      ];
    }
    return [
      { key: 'ledgers', label: t('tallyImport.kpi.parsedLedgers'), value: 0 },
      { key: 'vouchers', label: t('tallyImport.kpi.parsedVouchers'), value: 0 },
      { key: 'createdAcc', label: t('tallyImport.kpi.createdAccounts'), value: 0 },
      { key: 'createdVch', label: t('tallyImport.kpi.createdVouchers'), value: 0 },
    ];
  }, [preview, result, file, t]);

  const previewRows = preview?.vouchers || [];
  const previewPageCount = Math.max(1, Math.ceil(previewRows.length / ROWS_PER_PAGE));
  const pagedPreview = previewRows.slice((previewPage - 1) * ROWS_PER_PAGE, previewPage * ROWS_PER_PAGE);

  const issueCounts = useMemo(() => {
    const all = reportIssues;
    return {
      all: all.length,
      error: all.filter((i) => i.level === 'error').length,
      warn: all.filter((i) => i.level === 'warn').length,
      info: all.filter((i) => i.level === 'info').length,
    };
  }, [reportIssues]);

  const issueRows = useMemo(() => {
    const all = [...reportIssues];
    all.sort((a, b) => {
      const levelDiff = (ISSUE_LEVEL_ORDER[a.level] ?? 9) - (ISSUE_LEVEL_ORDER[b.level] ?? 9);
      if (levelDiff !== 0) return levelDiff;
      return String(a.at).localeCompare(String(b.at));
    });
    if (issueLevelFilter === 'all') return all;
    return all.filter((i) => i.level === issueLevelFilter);
  }, [reportIssues, issueLevelFilter]);

  const issuesPageCount = Math.max(1, Math.ceil(issueRows.length / ROWS_PER_PAGE));
  const pagedIssues = issueRows.slice((issuesPage - 1) * ROWS_PER_PAGE, issuesPage * ROWS_PER_PAGE);

  const issueLevelLabel = (level: string) => {
    if (level === 'error') return t('tallyImport.issueLevel.error');
    if (level === 'warn') return t('tallyImport.issueLevel.warn');
    if (level === 'info') return t('tallyImport.issueLevel.info');
    return level;
  };

  const issueSourceLabel = (source: ReportIssueSource) => {
    if (source === 'preview') return t('tallyImport.reportSource.preview');
    if (source === 'dryRun') return t('tallyImport.reportSource.dryRun');
    return t('tallyImport.reportSource.import');
  };

  const appendReportIssues = (
    source: ReportIssueSource,
    issues: Array<{ level: string; message: string; context?: string }> | undefined,
    opts?: { switchToReport?: boolean }
  ) => {
    const at = new Date().toISOString();
    const rows = (issues || []).map((issue) => ({
      level: issue.level || 'info',
      message: issue.message || '',
      context: issue.context,
      source,
      at,
    }));
    if (!rows.length) return;
    setReportIssues((prev) => [...prev, ...rows]);
    setIssuesPage(1);
    if (opts?.switchToReport !== false) {
      setListTab('report');
      const failed = rows.some((r) => r.level === 'error');
      setIssueLevelFilter(failed ? 'error' : 'all');
    }
  };

  const clearSessionResults = () => {
    setPreview(null);
    setResult(null);
    setReconciliation(null);
    setReportIssues([]);
    setPreviewPage(1);
    setIssuesPage(1);
    setIssueLevelFilter('all');
    setListTab('preview');
  };

  const handleDownloadImportLog = async () => {
    if (reportIssues.length === 0) {
      setError(t('tallyImport.errors.noLogToDownload'));
      return;
    }

    try {
      const stamp = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const fileStamp = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}`;

      const ExcelJS = (await import('exceljs')).default;
      const { addSheetFromAoA, downloadExcelWorkbook } = await import('../../utils/excelExportStyle');
      const {
        tallyIssueLevelToEn,
        tallyIssueMessageToEn,
        tallyIssueContextToEn,
      } = await import('../../utils/tallyImportLogEn');

      const workbook = new ExcelJS.Workbook();
      const header = ['Level', 'Source', 'Time', 'Message', 'Reason / Detail'];

      const toEnRows = (issues: ReportIssue[]) =>
        issues.map((issue) => [
          tallyIssueLevelToEn(issue.level),
          issue.source,
          issue.at,
          tallyIssueMessageToEn(issue.message),
          tallyIssueContextToEn(issue.context),
        ]);

      const failed = reportIssues.filter((i) => i.level === 'error');
      const warnings = reportIssues.filter((i) => i.level === 'warn');
      const infos = reportIssues.filter((i) => i.level === 'info');

      addSheetFromAoA(workbook, 'Summary', [
        ['Tally Import Report'],
        result
          ? [
              `Accounts matched ${result.ledgers.matched} · Accounts created ${result.ledgers.created} · Vouchers created ${result.vouchers.created} · Skipped ${result.vouchers.skipped} · Failed ${result.vouchers.failed}`,
            ]
          : ['No import result summary (preview / accumulated issues only)'],
        [`Failed ${failed.length} · Warning ${warnings.length} · Info ${infos.length} · Total ${reportIssues.length}`],
        ...(file?.name ? [[`File: ${file.name}`]] : []),
        [],
        ['Sheet', 'Rows'],
        ['All', String(reportIssues.length)],
        ['Failed', String(failed.length)],
        ['Warnings', String(warnings.length)],
        ['Info', String(infos.length)],
      ]);
      addSheetFromAoA(workbook, 'All', [header, ...toEnRows(reportIssues)]);
      addSheetFromAoA(workbook, 'Failed', [header, ...toEnRows(failed)]);
      addSheetFromAoA(workbook, 'Warnings', [header, ...toEnRows(warnings)]);
      addSheetFromAoA(workbook, 'Info', [header, ...toEnRows(infos)]);

      await downloadExcelWorkbook(workbook, `Tally_Import_Report_${fileStamp}.xlsx`);
      setSuccess(t('tallyImport.success.logDownloaded'));
    } catch (err: any) {
      setError(err?.message || t('tallyImport.errors.import'));
    }
  };

  const closeToolbarMenu = () => setToolbarMenuAnchor(null);

  const handleReset = () => {
    setFile(null);
    setImportLedgers(true);
    setImportVouchers(true);
    setCreateMissingLedgers(true);
    setCreateMissingParties(true);
    clearSessionResults();
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildFormData = (dryRun?: boolean) => {
    if (!file) throw new Error(t('tallyImport.errors.noFile'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('importLedgers', String(importLedgers));
    fd.append('importVouchers', String(importVouchers));
    fd.append('createMissingLedgers', String(createMissingLedgers));
    fd.append('createMissingParties', String(createMissingParties));
    if (dryRun != null) fd.append('dryRun', String(dryRun));
    return fd;
  };

  const handlePreview = async () => {
    if (!effectiveCompanyId) {
      setError(t('tallyImport.errors.noCompany'));
      return;
    }
    if (file && file.size > TALLY_IMPORT_MAX_BYTES) {
      setError(t('tallyImport.errors.fileTooLarge'));
      return;
    }
    try {
      setLoading(true);
      setError('');
      setResult(null);
      const fd = buildFormData();
      const res = await accountingService.previewTallyImport(fd, effectiveCompanyId);
      setPreview(res?.data || null);
      setPreviewPage(1);
      setListTab('preview');
      const data = res?.data;
      appendReportIssues(
        'preview',
        [
          {
            level: 'info',
            message: t('tallyImport.success.preview'),
            context: data
              ? `ledgers=${data.totals?.ledgers ?? 0}, vouchers=${data.totals?.vouchers ?? 0}, format=${data.format || '-'}`
              : undefined,
          },
        ],
        { switchToReport: false }
      );
      setSuccess(t('tallyImport.success.preview'));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('tallyImport.errors.preview');
      appendReportIssues('preview', [{ level: 'error', message }]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (dryRun: boolean) => {
    if (!effectiveCompanyId) {
      setError(t('tallyImport.errors.noCompany'));
      return;
    }
    if (file && file.size > TALLY_IMPORT_MAX_BYTES) {
      setError(t('tallyImport.errors.fileTooLarge'));
      return;
    }
    try {
      setLoading(true);
      setError('');
      const fd = buildFormData(dryRun);
      const res = await accountingService.importTallyExport(fd, effectiveCompanyId);
      const importResult = res?.data || null;
      setResult(importResult);
      setReconciliation(null);
      appendReportIssues(dryRun ? 'dryRun' : 'import', importResult?.issues || []);
      setSuccess(res?.message || (dryRun ? t('tallyImport.success.dryRun') : t('tallyImport.success.import')));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('tallyImport.errors.import');
      appendReportIssues(dryRun ? 'dryRun' : 'import', [{ level: 'error', message }]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReconciliation = async () => {
    if (!effectiveCompanyId || !result?.batchId) return;
    try {
      setLoading(true);
      setError('');
      const res = await accountingService.getTallyImportReconciliation(result.batchId, effectiveCompanyId);
      setReconciliation(res?.data || null);
      setSuccess(t('tallyImport.success.reconciliation'));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('tallyImport.errors.reconciliation'));
    } finally {
      setLoading(false);
    }
  };

  const secondaryActions = (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<BooksIcon fontSize="small" />}
        sx={mvsBodyOutlinedBtnSx}
        onClick={() => navigate(booksHref)}
      >
        {t('tallyImport.booksLink')}
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<DryRunIcon fontSize="small" />}
        sx={mvsBodyOutlinedBtnSx}
        disabled={!file || loading}
        onClick={() => handleImport(true)}
      >
        {t('tallyImport.dryRun')}
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PreviewIcon fontSize="small" />}
        sx={mvsBodyOutlinedBtnSx}
        disabled={!file || loading}
        onClick={handlePreview}
      >
        {t('tallyImport.preview')}
      </Button>
      <Button
        variant={listTab === 'report' ? 'contained' : 'outlined'}
        size="small"
        startIcon={<ReportIcon fontSize="small" />}
        sx={{
          ...mvsBodyOutlinedBtnSx,
          ...(listTab === 'report' ? { boxShadow: 'none', color: '#fff' } : {}),
        }}
        disabled={reportIssues.length === 0 && !result}
        onClick={() => setListTab('report')}
      >
        {t('tallyImport.reportTab')}
        {reportIssues.length > 0 ? ` (${reportIssues.length})` : ''}
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ReportIcon fontSize="small" />}
        sx={mvsBodyOutlinedBtnSx}
        disabled={!result?.batchId || loading}
        onClick={() => void handleReconciliation()}
      >
        {t('tallyImport.reconciliation')}
      </Button>
    </>
  );

  const showList = Boolean(preview || result || reportIssues.length > 0);

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader title={t('tallyImport.title')} description={t('tallyImport.description')} />

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
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
        {kpiItems.map((item) => (
          <Card key={item.key} elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
              >
                {item.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}
              >
                {loading ? '…' : item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {reconciliation && (
        <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Stack spacing={1.25}>
              <Alert severity={reconciliation.status === 'PASS' ? 'success' : 'warning'} variant="outlined">
                {reconciliation.status === 'PASS'
                  ? t('tallyImport.reconciliationPass')
                  : t('tallyImport.reconciliationFail')}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                {reconciliation.note}
              </Typography>
              <TableContainer sx={{ border: '1px solid #D1D5DB' }}>
                <Table size="small" sx={tableSx}>
                  <TableHead sx={mvsTableHeadHighlightSx}>
                    <TableRow>
                      <TableCell>{t('tallyImport.reconciliationColumns.check')}</TableCell>
                      <TableCell align="right">{t('tallyImport.reconciliationColumns.source')}</TableCell>
                      <TableCell align="right">{t('tallyImport.reconciliationColumns.mvs')}</TableCell>
                      <TableCell align="right">{t('tallyImport.reconciliationColumns.difference')}</TableCell>
                      <TableCell>{t('tallyImport.reconciliationColumns.status')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={tableBodyRowSx}>
                      <TableCell>{t('tallyImport.reconciliationChecks.voucherCount')}</TableCell>
                      <TableCell align="right">{reconciliation.checks.voucherCount.source}</TableCell>
                      <TableCell align="right">{reconciliation.checks.voucherCount.mvs}</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell>{reconciliation.checks.voucherCount.status}</TableCell>
                    </TableRow>
                    <TableRow sx={tableBodyRowSx}>
                      <TableCell>{t('tallyImport.reconciliationChecks.debitTotal')}</TableCell>
                      <TableCell align="right">{reconciliation.checks.debitTotal.source}</TableCell>
                      <TableCell align="right">{reconciliation.checks.debitTotal.mvs}</TableCell>
                      <TableCell align="right">{reconciliation.checks.debitTotal.difference}</TableCell>
                      <TableCell>{reconciliation.checks.debitTotal.status}</TableCell>
                    </TableRow>
                    <TableRow sx={tableBodyRowSx}>
                      <TableCell>{t('tallyImport.reconciliationChecks.creditTotal')}</TableCell>
                      <TableCell align="right">{reconciliation.checks.creditTotal.source}</TableCell>
                      <TableCell align="right">{reconciliation.checks.creditTotal.mvs}</TableCell>
                      <TableCell align="right">{reconciliation.checks.creditTotal.difference}</TableCell>
                      <TableCell>{reconciliation.checks.creditTotal.status}</TableCell>
                    </TableRow>
                    <TableRow sx={tableBodyRowSx}>
                      <TableCell>{t('tallyImport.reconciliationChecks.ledgerMovements')}</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">{reconciliation.checks.ledgerMovements.differenceCount}</TableCell>
                      <TableCell>{reconciliation.checks.ledgerMovements.status}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 0 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            flexWrap: 'wrap',
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: { md: 'space-between' },
            gap: { xs: 1.25, md: 1 },
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            bgcolor: '#FFFFFF',
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {isCompactToolbar ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<MoreHorizIcon fontSize="small" />}
                  onClick={(e) => setToolbarMenuAnchor(e.currentTarget)}
                  sx={mvsBodyOutlinedBtnSx}
                >
                  {t('tallyImport.moreTools')}
                </Button>
                <Menu
                  anchorEl={toolbarMenuAnchor}
                  open={Boolean(toolbarMenuAnchor)}
                  onClose={closeToolbarMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.5,
                        minWidth: 220,
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
                      },
                    },
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      closeToolbarMenu();
                      navigate(booksHref);
                    }}
                  >
                    <ListItemIcon>
                      <BooksIcon fontSize="small" />
                    </ListItemIcon>
                    {t('tallyImport.booksLink')}
                  </MenuItem>
                  <MenuItem
                    disabled={!file || loading}
                    onClick={() => {
                      closeToolbarMenu();
                      void handleImport(true);
                    }}
                  >
                    <ListItemIcon>
                      <DryRunIcon fontSize="small" />
                    </ListItemIcon>
                    {t('tallyImport.dryRun')}
                  </MenuItem>
                  <MenuItem
                    disabled={!file || loading}
                    onClick={() => {
                      closeToolbarMenu();
                      void handlePreview();
                    }}
                  >
                    <ListItemIcon>
                      <PreviewIcon fontSize="small" />
                    </ListItemIcon>
                    {t('tallyImport.preview')}
                  </MenuItem>
                  <MenuItem
                    disabled={reportIssues.length === 0 && !result}
                    onClick={() => {
                      closeToolbarMenu();
                      setListTab('report');
                    }}
                  >
                    <ListItemIcon>
                      <ReportIcon fontSize="small" />
                    </ListItemIcon>
                    {t('tallyImport.reportTab')}
                    {reportIssues.length > 0 ? ` (${reportIssues.length})` : ''}
                  </MenuItem>
                  <MenuItem
                    disabled={!result?.batchId || loading}
                    onClick={() => {
                      closeToolbarMenu();
                      void handleReconciliation();
                    }}
                  >
                    <ListItemIcon>
                      <ReportIcon fontSize="small" />
                    </ListItemIcon>
                    {t('tallyImport.reconciliation')}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              secondaryActions
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
              flexShrink: 0,
              width: { xs: '100%', md: 'auto' },
              ml: { md: 'auto' },
            }}
          >
            <Button
              variant="contained"
              disableElevation
              size="small"
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon fontSize="small" />
              }
              sx={mvsBodyPrimaryBtnSx}
              disabled={!file || loading}
              onClick={() => handleImport(false)}
            >
              {t('tallyImport.import')}
            </Button>
          </Box>
        </Box>

        <Box sx={mvsBodyFilterWrapSx}>
          <input
            ref={fileRef}
            type="file"
            accept=".xml,.json,.txt,application/xml,text/xml,application/json"
            hidden
            onChange={(e) => {
              const next = e.target.files?.[0] || null;
              setFile(next);
              clearSessionResults();
            }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'auto minmax(0, 1fr) auto' },
              gap: 1.5,
              alignItems: 'center',
              mb: 1.5,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadIcon fontSize="small" />}
              sx={{ ...mvsBodyOutlinedBtnSx, height: 40 }}
              onClick={() => fileRef.current?.click()}
            >
              {t('tallyImport.selectFile')}
            </Button>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
              title={file?.name || undefined}
            >
              {file?.name || t('tallyImport.noFile')}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ResetIcon fontSize="small" />}
              onClick={handleReset}
              sx={{
                ...mvsBodyOutlinedBtnSx,
                height: 40,
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' },
                minWidth: { sm: 120 },
              }}
            >
              {t('common.reset')}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1.5 }, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={importLedgers}
                  onChange={(e) => setImportLedgers(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  {t('tallyImport.options.importLedgers')}
                </Typography>
              }
              sx={{ mr: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={importVouchers}
                  onChange={(e) => setImportVouchers(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  {t('tallyImport.options.importVouchers')}
                </Typography>
              }
              sx={{ mr: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={createMissingLedgers}
                  onChange={(e) => setCreateMissingLedgers(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  {t('tallyImport.options.createMissing')}
                </Typography>
              }
              sx={{ mr: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={createMissingParties}
                  onChange={(e) => setCreateMissingParties(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.8125rem' }}>
                  {t('tallyImport.options.createParties')}
                </Typography>
              }
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.5 }}>
            {t('tallyImport.hint')}
          </Typography>
        </Box>
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        {loading && !showList ? (
          <Box sx={listStateBoxSx}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              {t('tallyImport.empty.loading')}
            </Typography>
          </Box>
        ) : !showList && !file ? (
          <Box sx={listStateBoxSx}>
            <UploadIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body1" color="text.secondary">
              {t('tallyImport.empty.noItems')}
            </Typography>
            <Button
              variant="contained"
              disableElevation
              size="small"
              startIcon={<UploadIcon fontSize="small" />}
              sx={mvsBodyPrimaryBtnSx}
              onClick={() => fileRef.current?.click()}
            >
              {t('tallyImport.selectFile')}
            </Button>
          </Box>
        ) : !showList && file ? (
          <Box sx={listStateBoxSx}>
            <UploadIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body1" color="text.secondary" sx={{ px: 2, maxWidth: 480 }}>
              {t('tallyImport.empty.fileReady', { name: file.name })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('tallyImport.empty.fileReadyHint')}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ borderBottom: '1px solid #CBD5E1', bgcolor: '#fff', px: { xs: 1, sm: 1.5 } }}>
              <Tabs
                value={listTab}
                onChange={(_e, v: ListTab) => setListTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 42,
                  '& .MuiTab-root': { minHeight: 42, textTransform: 'none', fontWeight: 600 },
                }}
              >
                <Tab
                  value="preview"
                  label={t('tallyImport.previewTab')}
                  disabled={!preview}
                />
                <Tab
                  value="report"
                  label={`${t('tallyImport.reportTab')}${
                    reportIssues.length > 0 ? ` (${reportIssues.length})` : ''
                  }`}
                  disabled={reportIssues.length === 0 && !result}
                />
              </Tabs>
            </Box>

            {listTab === 'preview' && preview && (
              <Box sx={{ mb: 0 }}>
                {previewRows.length === 0 ? (
                  <Box sx={listStateBoxSx}>
                    <Typography variant="body2" color="text.secondary">
                      {t('tallyImport.emptyVouchers')}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                      <Table size="small" sx={tableSx}>
                        <TableHead sx={mvsTableHeadHighlightSx}>
                          <TableRow>
                            <TableCell sx={{ width: '14%' }}>{renderEllipsis(t('tallyImport.columns.date'))}</TableCell>
                            <TableCell sx={{ width: '16%' }}>{renderEllipsis(t('tallyImport.columns.type'))}</TableCell>
                            <TableCell sx={{ width: '18%' }}>{renderEllipsis(t('tallyImport.columns.number'))}</TableCell>
                            <TableCell sx={{ width: '12%' }}>{renderEllipsis(t('tallyImport.columns.lines'))}</TableCell>
                            <TableCell sx={{ width: '20%' }} align="right">
                              {renderEllipsis(t('tallyImport.columns.debit'))}
                            </TableCell>
                            <TableCell sx={{ width: '20%' }} align="right">
                              {renderEllipsis(t('tallyImport.columns.credit'))}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody sx={tableBodyRowSx}>
                          {pagedPreview.map((v, idx) => (
                            <TableRow key={`${v.voucherNumber}-${idx}`}>
                              <TableCell sx={cellEllipsisSx}>{renderEllipsis(v.date)}</TableCell>
                              <TableCell sx={cellEllipsisSx}>{renderEllipsis(v.voucherType)}</TableCell>
                              <TableCell sx={cellEllipsisSx}>{renderEllipsis(v.voucherNumber)}</TableCell>
                              <TableCell sx={cellEllipsisSx}>{v.lineCount}</TableCell>
                              <TableCell align="right" sx={cellEllipsisSx}>
                                {Number(v.totalDebit || 0).toLocaleString()}
                              </TableCell>
                              <TableCell align="right" sx={cellEllipsisSx}>
                                {Number(v.totalCredit || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {previewRows.length > ROWS_PER_PAGE && (
                      <Box sx={mvsBodyPaginationSx}>
                        <Pagination
                          count={previewPageCount}
                          page={previewPage}
                          onChange={(_e, p) => setPreviewPage(p)}
                          color="primary"
                          shape="rounded"
                          size="small"
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}

            {listTab === 'report' && (
              <Box>
                {result && (
                  <Alert
                    severity={result.vouchers.failed > 0 ? 'warning' : 'success'}
                    sx={{
                      mb: 1.5,
                      mt: 1.5,
                      mx: { xs: 1.5, sm: 2 },
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      boxShadow: 'none',
                    }}
                  >
                    {t('tallyImport.resultSummary', {
                      matched: result.ledgers.matched,
                      createdAcc: result.ledgers.created,
                      createdVch: result.vouchers.created,
                      skipped: result.vouchers.skipped,
                      failed: result.vouchers.failed,
                    })}
                    {result.dryRun ? ` · ${t('tallyImport.resultDryRun')}` : ''}
                  </Alert>
                )}
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  useFlexGap
                  spacing={1}
                  sx={{
                    mb: 1.5,
                    mt: result ? 0 : 1.5,
                    px: { xs: 1.5, sm: 2 },
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                      {t('tallyImport.logFilter.label')}
                    </Typography>
                    {(
                      [
                        { key: 'all' as const, count: issueCounts.all },
                        { key: 'error' as const, count: issueCounts.error },
                        { key: 'warn' as const, count: issueCounts.warn },
                        { key: 'info' as const, count: issueCounts.info },
                      ] as const
                    ).map(({ key, count }) => (
                      <Button
                        key={key}
                        size="small"
                        variant={issueLevelFilter === key ? 'contained' : 'outlined'}
                        color={
                          key === 'error'
                            ? 'error'
                            : key === 'warn'
                              ? 'warning'
                              : key === 'info'
                                ? 'info'
                                : 'inherit'
                        }
                        disabled={key !== 'all' && count === 0}
                        onClick={() => {
                          setIssueLevelFilter(key);
                          setIssuesPage(1);
                        }}
                        sx={{
                          ...mvsBodyOutlinedBtnSx,
                          minWidth: 0,
                          px: 1.25,
                          ...(issueLevelFilter === key
                            ? { boxShadow: 'none', color: '#fff' }
                            : {}),
                        }}
                      >
                        {t(`tallyImport.logFilter.${key}`)} ({count})
                      </Button>
                    ))}
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon fontSize="small" />}
                    disabled={issueRows.length === 0}
                    onClick={handleDownloadImportLog}
                    sx={mvsBodyOutlinedBtnSx}
                  >
                    {t('tallyImport.downloadLog')}
                  </Button>
                </Stack>
                <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                  <Table size="small" sx={tableSx}>
                    <TableHead sx={mvsTableHeadHighlightSx}>
                      <TableRow>
                        <TableCell sx={{ width: '10%' }}>{renderEllipsis(t('tallyImport.columns.level'))}</TableCell>
                        <TableCell sx={{ width: '12%' }}>{renderEllipsis(t('tallyImport.columns.source'))}</TableCell>
                        <TableCell sx={{ width: '40%' }}>{renderEllipsis(t('tallyImport.columns.message'))}</TableCell>
                        <TableCell sx={{ width: '38%' }}>{renderEllipsis(t('tallyImport.columns.context'))}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={tableBodyRowSx}>
                      {pagedIssues.map((issue, idx) => (
                        <TableRow key={`${issue.source}-${issue.level}-${issue.message}-${idx}`}>
                          <TableCell>
                            <IssueLevelChip level={issue.level} label={issueLevelLabel(issue.level)} />
                          </TableCell>
                          <TableCell sx={cellEllipsisSx}>
                            {renderEllipsis(issueSourceLabel(issue.source))}
                          </TableCell>
                          <TableCell sx={cellEllipsisSx}>{renderEllipsis(issue.message)}</TableCell>
                          <TableCell sx={cellEllipsisSx}>{renderEllipsis(issue.context || '-')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {issueRows.length === 0 && (
                  <Box sx={{ ...listStateBoxSx, mt: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                    <Typography variant="body2" color="text.secondary">
                      {issueLevelFilter === 'error'
                        ? t('tallyImport.emptyErrors')
                        : t('tallyImport.emptyIssues')}
                    </Typography>
                  </Box>
                )}
                {issueRows.length > ROWS_PER_PAGE && (
                  <Box sx={mvsBodyPaginationSx}>
                    <Pagination
                      count={issuesPageCount}
                      page={issuesPage}
                      onChange={(_e, p) => setIssuesPage(p)}
                      color="primary"
                      shape="rounded"
                      size="small"
                    />
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TallyImport;
