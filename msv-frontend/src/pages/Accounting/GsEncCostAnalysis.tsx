import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  DeleteOutline as ClearIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsBodyCardSx,
  mvsBodyListTableSx,
  mvsBodyListZoneSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsFilterFieldHeightSx,
  mvsKpiCardSx,
  mvsOutlinedLabelProps,
  mvsPageRootFullBleedSx,
  mvsSearchFieldSx,
  mvsTableBodyRowSx,
  mvsTableHeadHighlightSx,
} from '../../theme/mvsLayout';
import {
  buildSummary,
  clearGsEncCostLocalData,
  formatInr,
  formatLedgerDate,
  formatLedgerMonth,
  displayEnglishLabel,
  formatEnglishLabel,
  loadBasicInfo,
  loadGasAccounts,
  loadLedgerRows,
  matchLedgerRows,
  parseGasAccountsWorkbook,
  parseLedgerWorkbook,
  resolveAmountKrw,
  saveBasicInfo,
  saveGasAccounts,
  saveLedgerRows,
  type GasAccount,
  type GsEncBasicInfo,
  type LedgerRow,
  type SummaryGroupKey,
} from '../../utils/gsEncCostAnalysis';
import { isPdfFile, parseLedgerPdf } from '../../utils/gsEncCostLedgerPdfImport';

type ListSortKey =
  | 'voucherNo'
  | 'voucherDate'
  | 'accountNameTally'
  | 'accountName'
  | 'accountNameHqEn'
  | 'amountInr'
  | 'costCategory'
  | 'clientName'
  | 'narration'
  | 'division'
  | 'amountKrw'
  | 'month'
  | 'gsIndiaCost';

type AccountSortKey = 'accountCode' | 'nameKo' | 'nameEn' | 'companyName' | 'accountType';

type SummarySortKey = 'label' | 'count' | 'amountInr' | 'amountKrw' | 'sharePct';

const SORT_TO_SUMMARY: Partial<Record<ListSortKey, SummaryGroupKey>> = {
  accountNameTally: 'accountNameTally',
  accountName: 'matchedNameKo',
  accountNameHqEn: 'matchedNameEn',
  month: 'month',
  clientName: 'clientName',
  gsIndiaCost: 'gsIndiaCost',
  costCategory: 'costCategory',
  division: 'division',
};

const SUMMARY_LABEL_KEY: Record<SummaryGroupKey, string> = {
  matchedNameKo: 'gsEncCostAnalysis.cols.accountName',
  matchedNameEn: 'gsEncCostAnalysis.cols.accountNameHqEn',
  accountCode: 'gsEncCostAnalysis.cols.accountCode',
  costCategory: 'gsEncCostAnalysis.cols.costCategory',
  month: 'gsEncCostAnalysis.cols.month',
  clientName: 'gsEncCostAnalysis.cols.clientName',
  gsIndiaCost: 'gsEncCostAnalysis.cols.gsIndia',
  accountNameTally: 'gsEncCostAnalysis.cols.accountNameTally',
  division: 'gsEncCostAnalysis.cols.division',
};

const LEDGER_HEADER_SX: Partial<Record<ListSortKey, object>> = {
  accountNameTally: { color: '#C00000', fontWeight: 700 },
  accountName: { color: '#C00000', fontWeight: 700 },
  accountNameHqEn: { color: '#C00000', fontWeight: 700 },
  gsIndiaCost: { bgcolor: '#C6EFCE', fontWeight: 700 },
};

const LEDGER_COLS: ListSortKey[] = [
  'voucherNo',
  'voucherDate',
  'accountNameTally',
  'accountName',
  'accountNameHqEn',
  'amountInr',
  'costCategory',
  'clientName',
  'narration',
  'division',
  'amountKrw',
  'month',
  'gsIndiaCost',
];

const DEFAULT_LEDGER_WIDTHS: Record<ListSortKey, number> = {
  voucherNo: 180,
  voucherDate: 100,
  accountNameTally: 170,
  accountName: 160,
  accountNameHqEn: 200,
  amountInr: 110,
  costCategory: 120,
  clientName: 120,
  narration: 160,
  division: 72,
  amountKrw: 110,
  month: 84,
  gsIndiaCost: 84,
};

const ACCOUNT_COLS: AccountSortKey[] = ['accountCode', 'nameKo', 'nameEn', 'companyName', 'accountType'];

const DEFAULT_ACCOUNT_WIDTHS: Record<AccountSortKey, number> = {
  accountCode: 120,
  nameKo: 200,
  nameEn: 220,
  companyName: 200,
  accountType: 100,
};

const SUMMARY_COLS: SummarySortKey[] = ['label', 'count', 'amountInr', 'amountKrw', 'sharePct'];

const DEFAULT_SUMMARY_WIDTHS: Record<SummarySortKey, number> = {
  label: 280,
  count: 88,
  amountInr: 200,
  amountKrw: 200,
  sharePct: 88,
};

const LS_LEDGER_COLS = 'mvs_gs_enc_ledger_col_widths_v4';
const LS_ACCOUNT_COLS = 'mvs_gs_enc_account_col_widths_v1';
const LS_SUMMARY_COLS = 'mvs_gs_enc_summary_col_widths_v2';

const loadColWidths = <K extends string>(key: string, defaults: Record<K, number>): Record<K, number> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<Record<K, number>>;
    const next = { ...defaults };
    (Object.keys(defaults) as K[]).forEach((k) => {
      const n = Number(parsed[k]);
      if (Number.isFinite(n) && n >= 60) next[k] = n;
    });
    return next;
  } catch {
    return { ...defaults };
  }
};

const cellEllipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
} as const;

const stickyTableSx = {
  width: '100%',
  minWidth: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'separate',
  borderSpacing: 0,
  '& .MuiTableCell-root': {
    boxSizing: 'border-box',
    px: 1.25,
    py: 1,
  },
  '& .MuiTableCell-head': {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    bgcolor: '#F8FAFC',
    py: 1.25,
  },
} as const;

const colResizeHandleSx = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: 8,
  height: '100%',
  cursor: 'col-resize',
  zIndex: 2,
  userSelect: 'none',
  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.18)' },
} as const;

type ResizableHeadCellProps = {
  /** 리사이즈 시작 시 기준 너비(가중치). 실제 표시 너비는 colgroup 비율 */
  width: number;
  align?: 'left' | 'right' | 'center';
  onResizeStart: (clientX: number) => void;
  sx?: object;
  children: React.ReactNode;
};

const ResizableHeadCell: React.FC<ResizableHeadCellProps> = ({
  align = 'left',
  onResizeStart,
  sx,
  children,
}) => (
  <TableCell
    align={align}
    sx={{
      ...cellEllipsisSx,
      // sticky만 — width/minWidth 금지(본문 colgroup과 열 어긋남 원인)
      position: 'sticky',
      top: 0,
      zIndex: 3,
      bgcolor: '#F8FAFC',
      ...sx,
      '& .MuiTableSortLabel-root':
        align === 'right'
          ? { width: '100%', justifyContent: 'flex-end', flexDirection: 'row' }
          : undefined,
    }}
  >
    {children}
    <Box
      component="span"
      sx={colResizeHandleSx}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResizeStart(e.clientX);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  </TableCell>
);

/** px 가중치 → 페이지 너비에 맞춘 % 분배 (헤더·본문 동일) */
function TableColGroup<K extends string>({
  cols,
  widths,
}: {
  cols: readonly K[];
  widths: Record<K, number>;
}) {
  const total = cols.reduce((sum, k) => sum + (widths[k] || 0), 0) || 1;
  return (
    <colgroup>
      {cols.map((k) => (
        <col key={k} style={{ width: `${((widths[k] || 0) / total) * 100}%` }} />
      ))}
    </colgroup>
  );
}

const filterFieldSx = {
  ...(mvsSearchFieldSx as Record<string, unknown>),
  ...mvsFilterFieldHeightSx,
} as const;

const tabsSx = {
  minHeight: 48,
  px: { xs: 1, sm: 1.5 },
  bgcolor: '#FFFFFF',
  '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.8125rem',
    minHeight: 48,
    py: 1.5,
    letterSpacing: '-0.01em',
    color: 'text.secondary',
  },
  '& .MuiTab-root.Mui-selected': { color: 'primary.main', fontWeight: 700 },
} as const;

type LedgerEditCell = { rowId: string; column: ListSortKey };

const parseAmountInput = (raw: string): number => {
  const n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

function getLedgerCellRawValue(row: LedgerRow & { accountName: string; displayAmountKrw: number }, col: ListSortKey): string {
  switch (col) {
    case 'voucherDate': {
      const d = formatLedgerDate(row.voucherDate);
      return d === '-' ? '' : d;
    }
    case 'accountName':
      return row.accountName || '';
    case 'amountInr':
      return row.amountInr ? String(row.amountInr) : '';
    case 'amountKrw':
      return row.displayAmountKrw ? String(row.displayAmountKrw) : row.amountKrw ? String(row.amountKrw) : '';
    case 'month': {
      const m = formatLedgerMonth(row.month);
      return m === '-' ? '' : m;
    }
    default:
      return String(row[col] ?? '');
  }
}

function applyLedgerCellEdit(row: LedgerRow, col: ListSortKey, raw: string): LedgerRow {
  const v = raw.trim();
  switch (col) {
    case 'voucherNo':
      return { ...row, voucherNo: v };
    case 'voucherDate': {
      const month = /^\d{4}-\d{2}/.test(v) ? v.slice(0, 7) : row.month;
      return { ...row, voucherDate: v, month: month || row.month };
    }
    case 'accountNameTally':
      return { ...row, accountNameTally: v };
    case 'accountName':
      return {
        ...row,
        accountNameHqKo: v,
        matchedNameKo: v,
        matchSource: v ? 'file' : row.matchSource,
      };
    case 'accountNameHqEn':
      return {
        ...row,
        accountNameHqEn: v,
        matchedNameEn: v,
        matchSource: v ? 'file' : row.matchSource,
      };
    case 'amountInr':
      return { ...row, amountInr: parseAmountInput(v) };
    case 'amountKrw':
      return { ...row, amountKrw: parseAmountInput(v) };
    case 'costCategory':
      return { ...row, costCategory: v };
    case 'clientName':
      return { ...row, clientName: v };
    case 'narration':
      return { ...row, narration: v };
    case 'division':
      return { ...row, division: v };
    case 'month':
      return { ...row, month: v };
    case 'gsIndiaCost':
      return { ...row, gsIndiaCost: v };
    default:
      return row;
  }
}

type EditableLedgerCellProps = {
  rowId: string;
  column: ListSortKey;
  align?: 'left' | 'right' | 'center';
  editingCell: LedgerEditCell | null;
  editDraft: string;
  display: React.ReactNode;
  editTitle: string;
  onStartEdit: (rowId: string, column: ListSortKey, draft: string) => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  rawValue: string;
  sx?: object;
};

const EditableLedgerCell: React.FC<EditableLedgerCellProps> = ({
  rowId,
  column,
  align = 'left',
  editingCell,
  editDraft,
  display,
  editTitle,
  onStartEdit,
  onDraftChange,
  onCommit,
  onCancel,
  rawValue,
  sx,
}) => {
  const isEditing = editingCell?.rowId === rowId && editingCell?.column === column;

  if (isEditing) {
    return (
      <TableCell align={align} sx={{ p: '2px 4px', verticalAlign: 'middle', ...sx }}>
        <TextField
          autoFocus
          size="small"
          fullWidth
          multiline={column === 'narration'}
          minRows={column === 'narration' ? 2 : 1}
          value={editDraft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && column !== 'narration') {
              e.preventDefault();
              onCommit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          inputProps={{
            sx: {
              fontSize: '0.8125rem',
              py: 0.5,
              px: 0.75,
              textAlign: align === 'right' ? 'right' : align === 'center' ? 'center' : 'left',
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              bgcolor: '#fff',
            },
          }}
        />
      </TableCell>
    );
  }

  return (
    <TableCell
      align={align}
      title={editTitle}
      sx={{ ...cellEllipsisSx, ...sx, cursor: 'cell' }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit(rowId, column, rawValue);
      }}
    >
      {display}
    </TableCell>
  );
};

const GsEncCostAnalysis: React.FC = () => {
  const { t } = useTranslation();
  const gasInputRef = useRef<HTMLInputElement>(null);
  const ledgerInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState(0);
  const [accounts, setAccounts] = useState<GasAccount[]>(() => loadGasAccounts());
  const [ledger, setLedger] = useState<LedgerRow[]>(() => loadLedgerRows());
  const [basicInfo, setBasicInfo] = useState<GsEncBasicInfo>(() => loadBasicInfo());
  const [search, setSearch] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [matchFilter, setMatchFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [exporting, setExporting] = useState(false);
  const [listSortKey, setListSortKey] = useState<ListSortKey>('voucherDate');
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('asc');
  const [accountSortKey, setAccountSortKey] = useState<AccountSortKey>('accountCode');
  const [accountSortDir, setAccountSortDir] = useState<'asc' | 'desc'>('asc');
  const [summarySortKey, setSummarySortKey] = useState<SummarySortKey>('amountInr');
  const [summarySortDir, setSummarySortDir] = useState<'asc' | 'desc'>('desc');
  const [summaryKey, setSummaryKey] = useState<SummaryGroupKey>('accountNameTally');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ledgerColWidths, setLedgerColWidths] = useState<Record<ListSortKey, number>>(() =>
    loadColWidths(LS_LEDGER_COLS, DEFAULT_LEDGER_WIDTHS)
  );
  const [accountColWidths, setAccountColWidths] = useState<Record<AccountSortKey, number>>(() =>
    loadColWidths(LS_ACCOUNT_COLS, DEFAULT_ACCOUNT_WIDTHS)
  );
  const [summaryColWidths, setSummaryColWidths] = useState<Record<SummarySortKey, number>>(() =>
    loadColWidths(LS_SUMMARY_COLS, DEFAULT_SUMMARY_WIDTHS)
  );
  const [editingCell, setEditingCell] = useState<LedgerEditCell | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const cellEditTitle = t('gsEncCostAnalysis.cellEditHint');

  const handleStartEdit = (rowId: string, column: ListSortKey, draft: string) => {
    setEditingCell({ rowId, column });
    setEditDraft(draft);
  };

  const handleCommitEdit = () => {
    if (!editingCell) return;
    const { rowId, column } = editingCell;
    const next = ledger.map((row) =>
      row.id === rowId ? applyLedgerCellEdit(row, column, editDraft) : row
    );
    setLedger(next);
    saveLedgerRows(next);
    setEditingCell(null);
    setEditDraft('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditDraft('');
  };

  const startColResize = <K extends string>(
    key: K,
    startX: number,
    widths: Record<K, number>,
    setWidths: React.Dispatch<React.SetStateAction<Record<K, number>>>,
    storageKey: string
  ) => {
    const startW = widths[key];
    const onMove = (ev: MouseEvent) => {
      const nextW = Math.max(60, startW + (ev.clientX - startX));
      setWidths((prev) => {
        const next = { ...prev, [key]: nextW };
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const rematchAndSave = (nextAccounts: GasAccount[], nextRawLedger: LedgerRow[]) => {
    const rematched = matchLedgerRows(nextRawLedger, nextAccounts);
    setAccounts(nextAccounts);
    setLedger(rematched);
    saveGasAccounts(nextAccounts);
    saveLedgerRows(rematched);
  };

  const handleGasUpload = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseGasAccountsWorkbook(buffer);
      if (!parsed.length) {
        setError(t('gsEncCostAnalysis.errors.gasEmpty'));
        return;
      }
      rematchAndSave(parsed, ledger);
      setSuccess(t('gsEncCostAnalysis.success.gasLoaded', { count: parsed.length }));
      setTab(0);
    } catch (e: any) {
      setError(e?.message || t('gsEncCostAnalysis.errors.gasFailed'));
    } finally {
      setBusy(false);
      if (gasInputRef.current) gasInputRef.current.value = '';
    }
  };

  const handleLedgerUpload = async (file: File | null, mode: 'replace' | 'append') => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const buffer = await file.arrayBuffer();
      const { rows: parsed, detectedFxRate } = isPdfFile(file)
        ? await parseLedgerPdf(buffer)
        : await parseLedgerWorkbook(buffer, accounts);
      if (!parsed.length) {
        setError(t('gsEncCostAnalysis.errors.ledgerEmpty'));
        return;
      }
      const base = mode === 'append' ? ledger : [];
      const merged = matchLedgerRows([...base, ...parsed], accounts);
      setLedger(merged);
      saveLedgerRows(merged);
      if (detectedFxRate > 0 && (!basicInfo.fxRate || mode === 'replace')) {
        const nextBasic = { ...basicInfo, fxRate: detectedFxRate };
        setBasicInfo(nextBasic);
        saveBasicInfo(nextBasic);
      }
      const months = merged
        .map((r) => formatLedgerMonth(r.month))
        .filter((m) => m && m !== '-')
        .sort();
      if (months.length && mode === 'replace') {
        setPeriodFrom(months[0]);
        setPeriodTo(months[months.length - 1]);
      }
      setSuccess(
        t('gsEncCostAnalysis.success.ledgerLoaded', {
          count: parsed.length,
          total: merged.length,
        })
      );
      setTab(1);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg === 'PDF_IMAGE_ONLY') {
        setError(t('gsEncCostAnalysis.errors.pdfImageOnly'));
      } else if (msg === 'PDF_NO_TABLE') {
        setError(t('gsEncCostAnalysis.errors.pdfNoTable'));
      } else {
        setError(e?.message || t('gsEncCostAnalysis.errors.ledgerFailed'));
      }
    } finally {
      setBusy(false);
      if (ledgerInputRef.current) ledgerInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    clearGsEncCostLocalData();
    setAccounts([]);
    setLedger([]);
    setBasicInfo({ periodMonth: '', fxRate: 0, projectName: '' });
    setPeriodFrom('');
    setPeriodTo('');
    setItemFilter('');
    setSearch('');
    setSuccess(t('gsEncCostAnalysis.success.cleared'));
  };

  const handleClearAccounts = () => {
    rematchAndSave([], ledger);
    setSuccess(t('gsEncCostAnalysis.success.accountsCleared'));
    setTab(0);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { addSheetFromObjects, downloadExcelWorkbook } = await import('../../utils/excelExportStyle');
      const workbook = new ExcelJS.Workbook();
      const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      if (tab === 0) {
        const rows = sortedAccounts.map((a) => ({
          [t('gsEncCostAnalysis.cols.accountCode')]: a.accountCode,
          [t('gsEncCostAnalysis.cols.nameKo')]: a.nameKo,
          [t('gsEncCostAnalysis.cols.nameEn')]: displayEnglishLabel(a.nameEn),
          [t('gsEncCostAnalysis.cols.companyName')]: displayEnglishLabel(a.companyName),
          [t('gsEncCostAnalysis.cols.accountType')]: a.accountType,
        }));
        if (!rows.length) {
          setError(t('gsEncCostAnalysis.errors.exportEmpty'));
          return;
        }
        addSheetFromObjects(workbook, t('gsEncCostAnalysis.tabs.accounts').slice(0, 31), rows);
        await downloadExcelWorkbook(workbook, `GS_ENC_Accounts_${dateToken}.xlsx`);
      } else if (tab === 2) {
        const rows = summaryRows.map((r) => ({
          [t('gsEncCostAnalysis.cols.groupLabel')]: displayEnglishLabel(r.label),
          [t('gsEncCostAnalysis.cols.count')]: r.count,
          [t('gsEncCostAnalysis.cols.amountInr')]: r.amountInr,
          [t('gsEncCostAnalysis.cols.amountKrw')]: r.amountKrw,
          [t('gsEncCostAnalysis.cols.share')]: Number(r.sharePct.toFixed(2)),
        }));
        if (!rows.length) {
          setError(t('gsEncCostAnalysis.errors.exportEmpty'));
          return;
        }
        addSheetFromObjects(workbook, t('gsEncCostAnalysis.tabs.summary').slice(0, 31), rows);
        await downloadExcelWorkbook(workbook, `GS_ENC_Summary_${dateToken}.xlsx`);
      } else {
        const rows = sortedLedger.map((row) => ({
          [t('gsEncCostAnalysis.cols.voucherNo')]: row.voucherNo,
          [t('gsEncCostAnalysis.cols.voucherDate')]: formatLedgerDate(row.voucherDate),
          [t('gsEncCostAnalysis.cols.accountNameTally')]: displayEnglishLabel(row.accountNameTally),
          [t('gsEncCostAnalysis.cols.accountName')]: row.accountName,
          [t('gsEncCostAnalysis.cols.accountNameHqEn')]: displayEnglishLabel(row.accountNameHqEn),
          [t('gsEncCostAnalysis.cols.amountInr')]: row.amountInr,
          [t('gsEncCostAnalysis.cols.costCategory')]: displayEnglishLabel(row.costCategory),
          [t('gsEncCostAnalysis.cols.clientName')]: displayEnglishLabel(row.clientName),
          [t('gsEncCostAnalysis.cols.narration')]: displayEnglishLabel(row.narration),
          [t('gsEncCostAnalysis.cols.division')]: displayEnglishLabel(row.division),
          [t('gsEncCostAnalysis.cols.amountKrw')]: row.displayAmountKrw,
          [t('gsEncCostAnalysis.cols.month')]: formatLedgerMonth(row.month),
          [t('gsEncCostAnalysis.cols.gsIndia')]: displayEnglishLabel(row.gsIndiaCost),
        }));
        if (!rows.length) {
          setError(t('gsEncCostAnalysis.errors.exportEmpty'));
          return;
        }
        addSheetFromObjects(workbook, t('gsEncCostAnalysis.tabs.ledger').slice(0, 31), rows);
        await downloadExcelWorkbook(workbook, `GS_ENC_Cost_${dateToken}.xlsx`);
      }
      setSuccess(t('gsEncCostAnalysis.success.excelDownloaded'));
    } catch (e: any) {
      setError(e?.message || t('gsEncCostAnalysis.errors.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const updateBasicInfo = (patch: Partial<GsEncBasicInfo>) => {
    const next = { ...basicInfo, ...patch };
    setBasicInfo(next);
    saveBasicInfo(next);
  };

  const handleSort = (key: ListSortKey) => {
    if (listSortKey === key) {
      setListSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setListSortKey(key);
      setListSortDir(key === 'amountInr' || key === 'amountKrw' ? 'desc' : 'asc');
    }
    const mapped = SORT_TO_SUMMARY[key];
    if (mapped) setSummaryKey(mapped);
  };

  const handleAccountSort = (key: AccountSortKey) => {
    if (accountSortKey === key) {
      setAccountSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setAccountSortKey(key);
      setAccountSortDir('asc');
    }
  };

  const handleSummarySort = (key: SummarySortKey) => {
    if (summarySortKey === key) {
      setSummarySortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSummarySortKey(key);
      setSummarySortDir(key === 'label' ? 'asc' : 'desc');
    }
  };

  const filteredLedger = useMemo(() => {
    const q = search.trim().toLowerCase();
    const itemQ = itemFilter.trim().toLowerCase();
    return ledger.filter((row) => {
      if (matchFilter === 'matched' && row.matchSource === 'none') return false;
      if (matchFilter === 'unmatched' && row.matchSource !== 'none') return false;

      const dateKey = (() => {
        const d = formatLedgerDate(row.voucherDate);
        if (d && d !== '-') return d;
        const m = formatLedgerMonth(row.month);
        // 일자 없을 때만 월 기준으로 비교 (YYYY-MM → 해당 월 1일)
        if (m && m !== '-') return `${m}-01`;
        return '';
      })();
      if (periodFrom && dateKey && dateKey < periodFrom) return false;
      if (periodTo && dateKey && dateKey > periodTo) return false;

      if (itemQ) {
        const itemHay = [
          row.matchedNameKo,
          row.accountNameHqKo,
          row.accountNameTally,
          row.matchedNameEn,
          row.accountNameHqEn,
          row.accountCode,
          row.costCategory,
          row.division,
        ]
          .join(' ')
          .toLowerCase();
        if (!itemHay.includes(itemQ)) return false;
      }

      if (!q) return true;
      const hay = [
        row.voucherNo,
        row.voucherDate,
        row.accountCode,
        row.accountNameTally,
        row.matchedNameKo,
        row.matchedNameEn,
        row.accountNameHqEn,
        row.costCategory,
        row.clientName,
        row.narration,
        row.division,
        row.month,
        row.gsIndiaCost,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ledger, search, matchFilter, periodFrom, periodTo, itemFilter]);

  const itemOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of ledger) {
      const name = row.matchedNameKo || row.accountNameHqKo || row.accountNameTally;
      if (name) set.add(name);
      if (row.costCategory) set.add(row.costCategory);
      if (row.division) set.add(row.division);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [ledger]);

  type LedgerViewRow = LedgerRow & {
    accountName: string;
    accountNameHqEn: string;
    displayAmountKrw: number;
  };

  const ledgerViewRows = useMemo<LedgerViewRow[]>(
    () =>
      filteredLedger.map((row) => ({
        ...row,
        accountName: row.matchedNameKo || row.accountNameHqKo || '',
        accountNameHqEn: row.matchedNameEn || row.accountNameHqEn || '',
        displayAmountKrw: resolveAmountKrw(row.amountInr, row.amountKrw, basicInfo.fxRate),
      })),
    [filteredLedger, basicInfo.fxRate]
  );

  const sortedLedger = useMemo(() => {
    const rows = [...ledgerViewRows];
    const dir = listSortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const pick = (row: LedgerViewRow): string | number => {
        switch (listSortKey) {
          case 'accountName':
            return row.accountName;
          case 'accountNameHqEn':
            return row.accountNameHqEn;
          case 'amountKrw':
            return row.displayAmountKrw;
          default:
            return row[listSortKey] as string | number;
        }
      };
      const av = pick(a);
      const bv = pick(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * dir;
    });
    return rows;
  }, [ledgerViewRows, listSortKey, listSortDir]);

  const totals = useMemo(() => {
    let amountInr = 0;
    let amountKrw = 0;
    for (const row of ledgerViewRows) {
      amountInr += row.amountInr;
      amountKrw += row.displayAmountKrw;
    }
    return { amountInr, amountKrw, count: ledgerViewRows.length };
  }, [ledgerViewRows]);

  const summaryRows = useMemo(() => {
    const forSummary = ledgerViewRows.map((row) => ({
      ...row,
      amountKrw: row.displayAmountKrw,
      matchedNameKo: row.matchedNameKo || row.accountNameHqKo || row.accountNameTally,
    }));
    const rows = buildSummary(forSummary, summaryKey);
    const dir = summarySortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[summarySortKey];
      const bv = b[summarySortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * dir;
    });
  }, [ledgerViewRows, summaryKey, summarySortKey, summarySortDir]);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) =>
      [a.accountCode, a.nameEn, a.nameKo, a.nameLocal, a.companyName].join(' ').toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const sortedAccounts = useMemo(() => {
    const rows = [...filteredAccounts];
    const dir = accountSortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => String(a[accountSortKey] ?? '').localeCompare(String(b[accountSortKey] ?? ''), 'ko') * dir);
    return rows;
  }, [filteredAccounts, accountSortKey, accountSortDir]);

  const matchStats = useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    for (const row of ledger) {
      if (row.matchSource === 'none') unmatched += 1;
      else matched += 1;
    }
    return { matched, unmatched };
  }, [ledger]);

  return (
    <Box sx={mvsPageRootFullBleedSx}>
      <MvsPageHeader
        title={t('gsEncCostAnalysis.title')}
        description={
          <>
            {t('gsEncCostAnalysis.subtitle')}
            <br />
            {t('gsEncCostAnalysis.spotNotice')}
          </>
        }
        mb={3}
        actions={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disableElevation
              startIcon={<UploadIcon fontSize="small" />}
              disabled={busy}
              sx={mvsBodyPrimaryBtnSx}
              onClick={() => gasInputRef.current?.click()}
            >
              {t('gsEncCostAnalysis.actions.uploadGas')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon fontSize="small" />}
              disabled={busy}
              sx={mvsBodyOutlinedBtnSx}
              onClick={() => ledgerInputRef.current?.click()}
            >
              {t('gsEncCostAnalysis.actions.uploadLedger')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon fontSize="small" />}
              disabled={busy || exporting}
              sx={mvsBodyOutlinedBtnSx}
              onClick={() => void handleExportExcel()}
            >
              {t('gsEncCostAnalysis.actions.exportExcel')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon fontSize="small" />}
              disabled={busy || !accounts.length}
              sx={mvsBodyOutlinedBtnSx}
              onClick={handleClearAccounts}
            >
              {t('gsEncCostAnalysis.actions.clearAccounts')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon fontSize="small" />}
              disabled={busy || (!accounts.length && !ledger.length)}
              sx={mvsBodyOutlinedBtnSx}
              onClick={handleClear}
            >
              {t('gsEncCostAnalysis.actions.clearLocal')}
            </Button>
          </Box>
        }
      />

      <input
        ref={gasInputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => void handleGasUpload(e.target.files?.[0] || null)}
      />
      <input
        ref={ledgerInputRef}
        type="file"
        accept=".xlsx,.xls,.pdf,application/pdf"
        hidden
        onChange={(e) => void handleLedgerUpload(e.target.files?.[0] || null, 'replace')}
      />

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabsSx}>
          <Tab label={`${t('gsEncCostAnalysis.tabs.accounts')} (${accounts.length})`} />
          <Tab label={`${t('gsEncCostAnalysis.tabs.ledger')} (${ledger.length})`} />
          <Tab label={t('gsEncCostAnalysis.tabs.summary')} />
        </Tabs>
      </Card>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 0.25 }}>
            {t('gsEncCostAnalysis.basicInfo.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('gsEncCostAnalysis.basicInfo.hint')}
          </Typography>
        </Box>
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            pb: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
            ...filterFieldSx,
          }}
        >
          <TextField
            size="small"
            label={t('gsEncCostAnalysis.basicInfo.periodMonth')}
            placeholder="YYYY-MM"
            value={basicInfo.periodMonth}
            onChange={(e) => updateBasicInfo({ periodMonth: e.target.value.trim() })}
            {...mvsOutlinedLabelProps}
            sx={filterFieldSx}
          />
          <TextField
            size="small"
            type="number"
            label={t('gsEncCostAnalysis.basicInfo.fxRate')}
            value={basicInfo.fxRate || ''}
            onChange={(e) => updateBasicInfo({ fxRate: Number(e.target.value) || 0 })}
            {...mvsOutlinedLabelProps}
            inputProps={{ step: '0.01', min: 0 }}
            sx={filterFieldSx}
          />
          <TextField
            size="small"
            label={t('gsEncCostAnalysis.basicInfo.projectName')}
            value={basicInfo.projectName}
            onChange={(e) => updateBasicInfo({ projectName: e.target.value })}
            {...mvsOutlinedLabelProps}
            sx={filterFieldSx}
          />
        </Box>
      </Card>

      {(tab === 1 || tab === 2) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('gsEncCostAnalysis.summaryStrip.rows')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {totals.count.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('gsEncCostAnalysis.summaryStrip.inr')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {formatInr(totals.amountInr)}
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('gsEncCostAnalysis.summaryStrip.krw')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {formatInr(totals.amountKrw)}
              </Typography>
            </CardContent>
          </Card>
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('gsEncCostAnalysis.summaryStrip.group')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', fontSize: '1.15rem' }}>
                {t(SUMMARY_LABEL_KEY[summaryKey])} · {summaryRows.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            bgcolor: '#FFFFFF',
            ...filterFieldSx,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm:
                tab === 0
                  ? '1fr auto'
                  : 'minmax(160px, 1.2fr) minmax(120px, 0.7fr) minmax(120px, 0.7fr) minmax(160px, 1fr) minmax(120px, 0.7fr) auto auto',
            },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
          <TextField
            fullWidth
            size="small"
            label={t('gsEncCostAnalysis.searchPlaceholder')}
            placeholder={t('gsEncCostAnalysis.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            {...mvsOutlinedLabelProps}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={filterFieldSx}
          />
          {(tab === 1 || tab === 2) && (
            <>
              <TextField
                fullWidth
                size="small"
                type="date"
                label={t('gsEncCostAnalysis.filters.periodFrom')}
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                {...mvsOutlinedLabelProps}
                sx={filterFieldSx}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label={t('gsEncCostAnalysis.filters.periodTo')}
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                {...mvsOutlinedLabelProps}
                sx={filterFieldSx}
              />
              <Autocomplete
                freeSolo
                options={itemOptions}
                value={itemFilter}
                onInputChange={(_, value) => setItemFilter(value || '')}
                onChange={(_, value) => setItemFilter(typeof value === 'string' ? value : value || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label={t('gsEncCostAnalysis.filters.item')}
                    placeholder={t('gsEncCostAnalysis.filters.itemPlaceholder')}
                    {...mvsOutlinedLabelProps}
                    sx={filterFieldSx}
                  />
                )}
              />
            </>
          )}
          {tab === 1 && (
            <>
              <FormControl fullWidth size="small" sx={filterFieldSx}>
                <InputLabel shrink>{t('gsEncCostAnalysis.matchFilter')}</InputLabel>
                <Select
                  label={t('gsEncCostAnalysis.matchFilter')}
                  value={matchFilter}
                  onChange={(e) => setMatchFilter(e.target.value as typeof matchFilter)}
                  notched
                >
                  <MenuItem value="all">{t('gsEncCostAnalysis.matchAll')}</MenuItem>
                  <MenuItem value="matched">{t('gsEncCostAnalysis.matchMatched')}</MenuItem>
                  <MenuItem value="unmatched">{t('gsEncCostAnalysis.matchUnmatched')}</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                disabled={busy || !accounts.length}
                sx={mvsBodyOutlinedBtnSx}
                onClick={() => {
                  const rematched = matchLedgerRows(ledger, accounts);
                  setLedger(rematched);
                  saveLedgerRows(rematched);
                  setSuccess(t('gsEncCostAnalysis.success.rematched'));
                }}
              >
                {t('gsEncCostAnalysis.actions.rematch')}
              </Button>
              <Button
                variant="outlined"
                disabled={busy}
                sx={mvsBodyOutlinedBtnSx}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xlsx,.xls,.pdf,application/pdf';
                  input.onchange = () => void handleLedgerUpload(input.files?.[0] || null, 'append');
                  input.click();
                }}
              >
                {t('gsEncCostAnalysis.actions.appendLedger')}
              </Button>
            </>
          )}
          {tab === 2 && (
            <FormControl fullWidth size="small" sx={filterFieldSx}>
              <InputLabel shrink>{t('gsEncCostAnalysis.summaryGroup')}</InputLabel>
              <Select
                label={t('gsEncCostAnalysis.summaryGroup')}
                value={summaryKey}
                onChange={(e) => setSummaryKey(e.target.value as SummaryGroupKey)}
                notched
              >
                <MenuItem value="accountNameTally">{t('gsEncCostAnalysis.cols.accountNameTally')}</MenuItem>
                <MenuItem value="matchedNameKo">{t('gsEncCostAnalysis.cols.accountName')}</MenuItem>
                <MenuItem value="matchedNameEn">{t('gsEncCostAnalysis.cols.accountNameHqEn')}</MenuItem>
                <MenuItem value="accountCode">{t('gsEncCostAnalysis.cols.accountCode')}</MenuItem>
                <MenuItem value="costCategory">{t('gsEncCostAnalysis.cols.costCategory')}</MenuItem>
                <MenuItem value="division">{t('gsEncCostAnalysis.cols.division')}</MenuItem>
                <MenuItem value="month">{t('gsEncCostAnalysis.cols.month')}</MenuItem>
                <MenuItem value="clientName">{t('gsEncCostAnalysis.cols.clientName')}</MenuItem>
                <MenuItem value="gsIndiaCost">{t('gsEncCostAnalysis.cols.gsIndia')}</MenuItem>
              </Select>
            </FormControl>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', pb: 1 }}>
            {tab === 0
              ? t('gsEncCostAnalysis.stats.accounts', { count: filteredAccounts.length })
              : t('gsEncCostAnalysis.stats.ledger', {
                  count: filteredLedger.length,
                  matched: matchStats.matched,
                  unmatched: matchStats.unmatched,
                  inr: formatInr(totals.amountInr),
                })}
          </Typography>
        </Box>
      </Card>

      <Box sx={{ ...mvsBodyListZoneSx, width: '100%', maxWidth: '100%' }}>
        <Box sx={{ ...mvsBodyListTableSx, overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
          <TableContainer
            sx={{
              width: '100%',
              maxWidth: '100%',
              maxHeight: '70vh',
              overflowX: 'hidden',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {tab === 0 && (
              <Table
                stickyHeader
                size="small"
                sx={[mvsTableBodyRowSx, stickyTableSx] as any}
              >
                <TableColGroup cols={ACCOUNT_COLS} widths={accountColWidths} />
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    {(
                      [
                        ['accountCode', t('gsEncCostAnalysis.cols.accountCode')],
                        ['nameKo', t('gsEncCostAnalysis.cols.nameKo')],
                        ['nameEn', t('gsEncCostAnalysis.cols.nameEn')],
                        ['companyName', t('gsEncCostAnalysis.cols.companyName')],
                        ['accountType', t('gsEncCostAnalysis.cols.accountType')],
                      ] as Array<[AccountSortKey, string]>
                    ).map(([key, label]) => (
                      <ResizableHeadCell
                        key={key}
                        width={accountColWidths[key]}
                        onResizeStart={(clientX) =>
                          startColResize(key, clientX, accountColWidths, setAccountColWidths, LS_ACCOUNT_COLS)
                        }
                      >
                        <TableSortLabel
                          active={accountSortKey === key}
                          direction={accountSortKey === key ? accountSortDir : 'asc'}
                          onClick={() => handleAccountSort(key)}
                        >
                          {label}
                        </TableSortLabel>
                      </ResizableHeadCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>{t('gsEncCostAnalysis.empty.accounts')}</TableCell>
                    </TableRow>
                  ) : (
                    sortedAccounts.map((a) => (
                      <TableRow key={a.accountCode} hover>
                        <TableCell sx={cellEllipsisSx}>{a.accountCode}</TableCell>
                        <TableCell sx={cellEllipsisSx}>{a.nameKo || '-'}</TableCell>
                        <TableCell sx={cellEllipsisSx}>{displayEnglishLabel(a.nameEn)}</TableCell>
                        <TableCell sx={cellEllipsisSx}>{displayEnglishLabel(a.companyName)}</TableCell>
                        <TableCell sx={cellEllipsisSx}>{a.accountType || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {tab === 1 && (
              <Table
                stickyHeader
                size="small"
                sx={[mvsTableBodyRowSx, stickyTableSx] as any}
              >
                <TableColGroup cols={LEDGER_COLS} widths={ledgerColWidths} />
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    {(
                      [
                        ['voucherNo', t('gsEncCostAnalysis.cols.voucherNo')],
                        ['voucherDate', t('gsEncCostAnalysis.cols.voucherDate')],
                        ['accountNameTally', t('gsEncCostAnalysis.cols.accountNameTally')],
                        ['accountName', t('gsEncCostAnalysis.cols.accountName')],
                        ['accountNameHqEn', t('gsEncCostAnalysis.cols.accountNameHqEn')],
                        ['amountInr', t('gsEncCostAnalysis.cols.amountInr')],
                        ['costCategory', t('gsEncCostAnalysis.cols.costCategory')],
                        ['clientName', t('gsEncCostAnalysis.cols.clientName')],
                        ['narration', t('gsEncCostAnalysis.cols.narration')],
                        ['division', t('gsEncCostAnalysis.cols.division')],
                        ['amountKrw', t('gsEncCostAnalysis.cols.amountKrw')],
                        ['month', t('gsEncCostAnalysis.cols.month')],
                        ['gsIndiaCost', t('gsEncCostAnalysis.cols.gsIndia')],
                      ] as Array<[ListSortKey, string]>
                    ).map(([key, label]) => (
                      <ResizableHeadCell
                        key={key}
                        width={ledgerColWidths[key]}
                        align={
                          key === 'amountInr' || key === 'amountKrw'
                            ? 'right'
                            : key === 'division'
                              ? 'center'
                              : 'left'
                        }
                        onResizeStart={(clientX) =>
                          startColResize(key, clientX, ledgerColWidths, setLedgerColWidths, LS_LEDGER_COLS)
                        }
                        sx={LEDGER_HEADER_SX[key] || {}}
                      >
                        <TableSortLabel
                          active={listSortKey === key}
                          direction={listSortKey === key ? listSortDir : 'asc'}
                          onClick={() => handleSort(key)}
                          sx={
                            key === 'accountNameTally' || key === 'accountName' || key === 'accountNameHqEn'
                              ? { color: '#C00000 !important', '&.Mui-active': { color: '#C00000' } }
                              : undefined
                          }
                        >
                          {label}
                        </TableSortLabel>
                      </ResizableHeadCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13}>{t('gsEncCostAnalysis.empty.ledger')}</TableCell>
                    </TableRow>
                  ) : (
                    sortedLedger.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                        sx={row.matchSource === 'none' ? { bgcolor: 'rgba(185, 28, 28, 0.04)' } : undefined}
                      >
                        <EditableLedgerCell
                          rowId={row.id}
                          column="voucherNo"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={row.voucherNo || '-'}
                          rawValue={getLedgerCellRawValue(row, 'voucherNo')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="voucherDate"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={formatLedgerDate(row.voucherDate)}
                          rawValue={getLedgerCellRawValue(row, 'voucherDate')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="accountNameTally"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={displayEnglishLabel(row.accountNameTally)}
                          rawValue={getLedgerCellRawValue(row, 'accountNameTally')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="accountName"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={
                            row.accountName ? (
                              /[가-힣]/.test(row.accountName) ? row.accountName : displayEnglishLabel(row.accountName)
                            ) : (
                              <Typography component="span" color="error" sx={{ fontSize: 'inherit' }}>
                                {t('gsEncCostAnalysis.unmatched')}
                              </Typography>
                            )
                          }
                          rawValue={getLedgerCellRawValue(row, 'accountName')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="accountNameHqEn"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={displayEnglishLabel(row.accountNameHqEn)}
                          rawValue={getLedgerCellRawValue(row, 'accountNameHqEn')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="amountInr"
                          align="right"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={formatInr(row.amountInr)}
                          rawValue={getLedgerCellRawValue(row, 'amountInr')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                          sx={{ fontVariantNumeric: 'tabular-nums' }}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="costCategory"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={displayEnglishLabel(row.costCategory)}
                          rawValue={getLedgerCellRawValue(row, 'costCategory')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="clientName"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={displayEnglishLabel(row.clientName)}
                          rawValue={getLedgerCellRawValue(row, 'clientName')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="narration"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={displayEnglishLabel(row.narration)}
                          rawValue={getLedgerCellRawValue(row, 'narration')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="division"
                          align="center"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={displayEnglishLabel(row.division)}
                          rawValue={getLedgerCellRawValue(row, 'division')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="amountKrw"
                          align="right"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={formatInr(row.displayAmountKrw)}
                          rawValue={getLedgerCellRawValue(row, 'amountKrw')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                          sx={{ fontVariantNumeric: 'tabular-nums' }}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="month"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={formatLedgerMonth(row.month)}
                          rawValue={getLedgerCellRawValue(row, 'month')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                        <EditableLedgerCell
                          rowId={row.id}
                          column="gsIndiaCost"
                          editingCell={editingCell}
                          editDraft={editDraft}
                          editTitle={cellEditTitle}
                          display={displayEnglishLabel(row.gsIndiaCost)}
                          rawValue={getLedgerCellRawValue(row, 'gsIndiaCost')}
                          onStartEdit={handleStartEdit}
                          onDraftChange={setEditDraft}
                          onCommit={handleCommitEdit}
                          onCancel={handleCancelEdit}
                        />
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {tab === 2 && (
              <Table
                stickyHeader
                size="small"
                sx={[mvsTableBodyRowSx, stickyTableSx] as any}
              >
                <TableColGroup cols={SUMMARY_COLS} widths={summaryColWidths} />
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    {(
                      [
                        ['label', t('gsEncCostAnalysis.cols.groupLabel'), 'left'],
                        ['count', t('gsEncCostAnalysis.cols.count'), 'right'],
                        ['amountInr', t('gsEncCostAnalysis.cols.amountInr'), 'right'],
                        ['amountKrw', t('gsEncCostAnalysis.cols.amountKrw'), 'right'],
                        ['sharePct', t('gsEncCostAnalysis.cols.share'), 'right'],
                      ] as Array<[SummarySortKey, string, 'left' | 'right']>
                    ).map(([key, label, align]) => (
                      <ResizableHeadCell
                        key={key}
                        width={summaryColWidths[key]}
                        align={align}
                        onResizeStart={(clientX) =>
                          startColResize(key, clientX, summaryColWidths, setSummaryColWidths, LS_SUMMARY_COLS)
                        }
                      >
                        <TableSortLabel
                          active={summarySortKey === key}
                          direction={summarySortKey === key ? summarySortDir : 'asc'}
                          onClick={() => handleSummarySort(key)}
                        >
                          {label}
                        </TableSortLabel>
                      </ResizableHeadCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>{t('gsEncCostAnalysis.empty.summary')}</TableCell>
                    </TableRow>
                  ) : (
                    summaryRows.map((row) => (
                      <TableRow key={row.key} hover>
                        <TableCell sx={cellEllipsisSx}>{displayEnglishLabel(row.label)}</TableCell>
                        <TableCell align="right" sx={cellEllipsisSx}>
                          {row.count}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ ...cellEllipsisSx, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatInr(row.amountInr)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ ...cellEllipsisSx, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatInr(row.amountKrw)}
                        </TableCell>
                        <TableCell align="right" sx={cellEllipsisSx}>
                          {row.sharePct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Box>
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

export default GsEncCostAnalysis;
