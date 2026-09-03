import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Avatar,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Tabs,
  Tab,
  Autocomplete,
  Collapse,
  useTheme
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsKpiCardSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsBodyPaginationSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsTableScrollSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx } from '../../theme/mvsLayout';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  QrCode2 as QrCodeIcon,
  ArrowForward as ArrowForwardIcon,
  OpenInNew as OpenInNewIcon,
  InsertDriveFile as FileIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { accountingService, companyService, workAssigneeListService } from '../../services/api';
import { resolveHeaderCompanyInfo, useReferenceDataStore } from '../../store/referenceDataStore';
import { resolveRegisteredStateCodeFromCompanyLike } from '../HR/payroll/indianProfessionalTax';
import { getUploadUrl, downloadUploadFile, fetchUploadObjectUrl } from '../../utils/uploadUrl';
import AuthMedia from '../../components/Common/AuthMedia';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import {
  buildExpenseApprovalPdfFilename,
  downloadExpenseApprovalPdf,
  EXPENSE_DOCUMENT_EXPORT_CSS,
} from '../../utils/expenseApprovalPdf';

const expenseApprovalFilterFieldSx = {
  ...(mvsSearchFieldSx as Record<string, unknown>),
  ...mvsFilterFieldHeightSx } as const;

/** expense-receipts/1784..._IMG.jpg → IMG.jpg */
const getReceiptDisplayName = (filePath: string): string => {
  const base = String(filePath || '').split(/[/\\]/).pop() || String(filePath || '');
  return base.replace(/^\d+_/, '') || base;
};

const isImageReceipt = (filePath: string): boolean =>
  /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(String(filePath || ''));

const isPdfReceipt = (filePath: string): boolean =>
  /\.pdf$/i.test(String(filePath || ''));

const normalizeAttachmentPaths = (value: unknown): string[] => {
  if (!value) return [];
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const obj = item as { path?: string; url?: string; file?: string };
          return obj.path || obj.url || obj.file || '';
        }
        return '';
      })
      .filter(Boolean);
  }
  return [];
};

interface ExpenseItem {
  id: string;
  invoiceDate: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  date?: string;
  amount?: number;
}

interface PartnerOption {
  id: number;
  company_name: string;
  representative?: string;
  address?: string;
  phone?: string;
  email?: string;
  pan_number?: string;
  bank_name?: string;
  account_number?: string;
  bank_ifsc?: string;
  account_holder?: string;
  business_number?: string;
  gstNumbers?: string[];
}

interface ExpenseApprovalItem {
  id: number;
  expenseId: string;
  title: string;
  requesterId: number;
  requesterName: string;
  requesterDepartment: string;
  requesterPosition: string;
  totalAmount: number;
  currency: string;
  purpose: string;
  items: ExpenseItem[];
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'paid';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  currentApproverId?: number;
  currentApproverName?: string;
  approvalFlow: ApprovalStep[];
  submittedAt: string;
  dueDate: string;
  notes?: string;
  attachments: string[];
  itemMeta?: Record<string, any>;
  approvalId?: number;
  paymentRequestStatus?: string;
  paidAmount?: number;
  paymentRequestedAt?: string;
  paymentCompletedAt?: string;
  paymentApprovedReason?: string;
  paymentApprovedAt?: string;
  paymentApprovedBy?: number;
  paymentRejectedReason?: string;
  paymentRejectedAt?: string;
  paymentRejectedBy?: number;
  bankTransferProvider?: string;
  bankTransferStatus?: string;
  bankTransferReference?: string;
  bankTransferError?: string;
  bankTransferLogs?: Array<{
    timestamp?: string;
    action?: string;
    status?: string;
    provider?: string | null;
    amount?: number;
    proof?: string;
    proof_name?: string;
    payload?: any;
    response?: any;
    error?: string | null;
  }>;
  remittanceHistory?: Array<{ timestamp?: string; amount?: number }>;
  companyId?: number;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalStep {
  id: number;
  stepOrder: number;
  approverId: number;
  approverName: string;
  approverDepartment?: string;
  approverPosition?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  assignedAt?: string;
  comment?: string;
  action?: 'assigned' | 'reassigned' | 'approved' | 'rejected';
  changedById?: number;
  changedByName?: string;
  previousApproverId?: number;
  previousApproverName?: string;
  escalated?: boolean;
  escalatedToId?: number;
  escalatedToName?: string;
}

/** 전자결재 문서 작성과 동일한 문서 틀 스타일 */
const EXPENSE_LINE = '#E2E8F0';
const EXPENSE_MUTED_BG = '#F8FAFC';
const EXPENSE_HEADER_BG = '#EEF2F6';
const EXPENSE_TOTAL_BG = '#FEE2E2';
const EXPENSE_TOTAL_FG = '#B91C1C';
const EXPENSE_TOTAL_LINE = '#FECACA';
const EXPENSE_HEADER_FG = '#1E293B';
const EXPENSE_STAMP_LINE = '#94A3B8';
const EXPENSE_STAMP_HEADER_BG = '#F1F5F9';
const EXPENSE_STAMP_LABEL = '#0F172A';
const EXPENSE_REQUEST_BG = '#FFFFFF';
const EXPENSE_REQUEST_ACCENT = '#64748B';
const EXPENSE_VENDOR_BG = '#FFFFFF';
const EXPENSE_VENDOR_ACCENT = '#64748B';
const EXPENSE_VENDOR_LINE = '#E2E8F0';
const EXPENSE_VENDOR_HEADER = '#F1F5F9';
const EXPENSE_VENDOR_SUB = '#64748B';

const sectionTitleSx = {
  fontWeight: 700,
  fontSize: '0.8125rem',
  color: '#0F172A',
  mb: 0.5,
  letterSpacing: '-0.01em',
} as const;

const COMPACT_ROW_HEIGHT = 40;

const compactTableSx = {
  tableLayout: 'fixed',
  width: '100%',
  '& .MuiTableCell-root': {
    padding: '0 8px !important',
    height: COMPACT_ROW_HEIGHT,
    fontSize: '0.8125rem !important',
    lineHeight: '20px !important',
    borderBottom: `1px solid ${EXPENSE_LINE} !important`,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '& .MuiTableRow-root': {
    height: COMPACT_ROW_HEIGHT,
  },
} as const;

const wrapTwoLineSx = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  lineHeight: '20px',
  maxHeight: 40,
  fontSize: '0.8125rem',
} as const;

const wrapCellSx = {
  whiteSpace: 'normal !important',
  overflow: 'hidden',
  verticalAlign: 'middle',
  maxWidth: 0,
} as const;

const ClampText: React.FC<{ children: React.ReactNode; title?: string; sx?: object }> = ({
  children,
  title,
  sx,
}) => (
  <Box component="span" title={title} sx={{ ...wrapTwoLineSx, fontWeight: 'inherit', color: 'inherit', ...sx }}>
    {children}
  </Box>
);

const kvLabelCellSx = {
  bgcolor: EXPENSE_MUTED_BG,
  color: '#64748B',
  fontWeight: 600,
  width: 128,
  maxWidth: 128,
} as const;

const voucherMetaWrapSx = {
  border: `1px solid ${EXPENSE_LINE}`,
  width: 'fit-content',
  maxWidth: '100%',
  display: 'grid',
  // 라벨 88px·값 영역 기준 가로 약 20% 확대
  gridTemplateColumns: '106px minmax(17ch, auto)',
} as const;

const voucherMetaLabelSx = {
  px: 1,
  py: 0.75,
  bgcolor: EXPENSE_MUTED_BG,
  color: '#64748B',
  fontWeight: 600,
  fontSize: '0.75rem',
  borderRight: `1px solid ${EXPENSE_LINE}`,
  whiteSpace: 'nowrap',
} as const;

const voucherMetaValueSx = {
  px: 1,
  py: 0.75,
  fontWeight: 600,
  fontSize: '0.8125rem',
  color: '#0F172A',
  whiteSpace: 'nowrap',
} as const;

const ExpenseFlowStamp = ({
  label,
  name,
  muted,
  wide,
  children,
}: {
  label: string;
  name: string;
  muted?: boolean;
  wide?: boolean;
  children?: React.ReactNode;
}) => (
  <Box
    className="expense-flow-stamp"
    sx={{
      width: wide ? 222 : 140,
      flexShrink: 0,
      border: `1px solid ${EXPENSE_STAMP_LINE}`,
      bgcolor: '#FFFFFF',
      overflow: 'hidden',
      opacity: muted ? 0.65 : 1,
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'stretch',
    }}
  >
    <Box
      sx={{
        px: 0.5,
        py: 0.35,
        textAlign: 'center',
        bgcolor: EXPENSE_STAMP_HEADER_BG,
        borderBottom: `1px solid ${EXPENSE_STAMP_LINE}`,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem', color: EXPENSE_STAMP_LABEL }}>
        {label}
      </Typography>
    </Box>
    <Box
      sx={{
        minHeight: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 1,
      }}
    >
      {children || (
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: EXPENSE_STAMP_LABEL,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {name}
        </Typography>
      )}
    </Box>
  </Box>
);

const ExpenseListHeadCell = ({
  sortKey,
  activeKey,
  direction,
  onSort,
  children,
  sx,
}: {
  sortKey: ExpenseListSortKey;
  activeKey: ExpenseListSortKey | null;
  direction: 'asc' | 'desc';
  onSort: (key: ExpenseListSortKey) => void;
  children: React.ReactNode;
  sx?: object;
}) => (
  <TableCell sx={{ whiteSpace: 'nowrap', ...sx }}>
    <TableSortLabel
      active={activeKey === sortKey}
      direction={activeKey === sortKey ? direction : 'asc'}
      onClick={() => onSort(sortKey)}
      sx={{
        color: 'inherit',
        '&:hover': { color: 'inherit' },
        '&.Mui-active': { color: 'inherit' },
        '& .MuiTableSortLabel-icon': {
          color: 'inherit !important',
          fontSize: 14,
          opacity: activeKey === sortKey ? 1 : 0.35,
        },
      }}
    >
      {children}
    </TableSortLabel>
  </TableCell>
);

const ExpenseVoucherMetaTable = ({
  voucherNo,
  dateText,
  voucherLabel,
  dateLabel,
}: {
  voucherNo: React.ReactNode;
  dateText: string;
  voucherLabel: string;
  dateLabel: string;
}) => (
  <Box sx={voucherMetaWrapSx}>
    <Box sx={{ ...voucherMetaLabelSx, borderBottom: `1px solid ${EXPENSE_LINE}` }}>{voucherLabel}</Box>
    <Box sx={{ ...voucherMetaValueSx, borderBottom: `1px solid ${EXPENSE_LINE}` }}>{voucherNo}</Box>
    <Box sx={voucherMetaLabelSx}>{dateLabel}</Box>
    <Box sx={voucherMetaValueSx}>{dateText}</Box>
  </Box>
);

const ExpenseCompanyBlock = ({
  logo,
  logoAlt,
  name,
  address,
  gstNumber,
}: {
  logo?: string;
  logoAlt: string;
  name?: string;
  address?: string;
  gstNumber?: string;
}) => {
  if (!logo && !name && !address && !gstNumber) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0.35,
        minWidth: 0,
        textAlign: 'left',
      }}
    >
      {logo ? (
        <AuthMedia
          src={logo}
          alt={logoAlt}
          sx={{
            display: 'block',
            alignSelf: 'flex-start',
            maxHeight: 36,
            maxWidth: 160,
            width: 'auto',
            objectFit: 'contain',
            objectPosition: 'left center',
          }}
        />
      ) : null}
      {name ? (
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A', lineHeight: 1.3 }}>
          {name}
        </Typography>
      ) : null}
      {address ? (
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#64748B',
            lineHeight: 1.35,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {address}
        </Typography>
      ) : null}
      {gstNumber ? (
        <Typography sx={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.35 }}>
          GSTIN: {gstNumber}
        </Typography>
      ) : null}
    </Box>
  );
};

const sectionBlockSx = {
  border: `1px solid ${EXPENSE_LINE}`,
  bgcolor: '#FFFFFF',
  overflow: 'hidden',
} as const;

const sectionHeaderBarSx = {
  px: 1,
  py: 0,
  height: COMPACT_ROW_HEIGHT,
  borderBottom: `1px solid ${EXPENSE_LINE}`,
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
} as const;

const formatLocalYmd = (value?: Date | string | null) => {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const parsed = new Date(s);
    if (Number.isNaN(parsed.getTime())) return '';
    value = parsed;
  }
  const d = value as Date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const takeFileNameSnippet = (value: string, maxChars: number) => {
  const cleaned = String(value || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return Array.from(cleaned).slice(0, maxChars).join('');
};

const buildRemittanceProofFileName = (file: File, partnerName?: string, description?: string) => {
  const ymd = formatLocalYmd(new Date()).replace(/-/g, '');
  const partner = takeFileNameSnippet(partnerName || '', 24) || 'Partner';
  const desc = takeFileNameSnippet(description || '', 9) || 'item';
  const fromName = String(file.name || '').split('.').pop() || '';
  const fromType = (file.type.split('/')[1] || 'png').replace(/^jpeg$/i, 'jpg');
  const ext = ((fromName.length <= 4 ? fromName : fromType)
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 4)
    .toLowerCase() || 'png').replace(/^jpeg$/, 'jpg');
  return `${ymd}_RT (${partner}) (${desc}).${ext}`;
};

const getFileExtension = (fileName: string) => {
  const base = String(fileName || '').split(/[/\\]/).pop() || '';
  const idx = base.lastIndexOf('.');
  if (idx <= 0 || idx === base.length - 1) return '';
  return base.slice(idx + 1);
};

/** 확장자는 유지하고 표시 파일명만 변경 */
const renameFileKeepingExtension = (file: File, nextName: string): File => {
  const cleaned = String(nextName || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return file;
  const ext = getFileExtension(file.name);
  const withoutExt = cleaned.replace(/\.[^.]+$/, '').trim() || cleaned;
  const finalName = ext ? `${withoutExt}.${ext}` : withoutExt;
  if (finalName === file.name) return file;
  return new File([file], finalName, { type: file.type, lastModified: file.lastModified });
};

const getTodayLocalYmd = () => formatLocalYmd(new Date());

/** 소수점 이하 자동 차감(내림/절삭) — 정수 금액만 사용 */
const floorMoney = (value: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n >= 0 ? Math.floor(n) : Math.ceil(n);
};

const formatAmount = (value: number) =>
  floorMoney(value).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const GST_SPLIT_RATE = 9;

const PRIORITY_SORT_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_SORT_ORDER: Record<string, number> = {
  in_review: 0,
  submitted: 1,
  draft: 2,
  approved: 3,
  paid: 4,
  rejected: 5,
};

const paidStatusChipSx = {
  bgcolor: '#0E7490',
  color: '#FFFFFF',
  fontWeight: 600,
} as const;

type ExpenseListSortKey = 'createdAt' | 'title' | 'person' | 'amount' | 'status' | 'priority';

const looksLikeGstin = (value?: string | null) => {
  const gst = String(value || '').replace(/\s/g, '').toUpperCase();
  return /^\d{2}[A-Z0-9]{13}$/.test(gst);
};

const gstStateCode = (value?: string | null) => {
  const gst = String(value || '').replace(/\s/g, '').toUpperCase();
  if (!/^\d{2}/.test(gst)) return '';
  return gst.slice(0, 2);
};

const normalizeGstState = (value?: string | null) => {
  const fromGst = gstStateCode(value);
  if (fromGst) return fromGst;
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(0, 2) : '';
};

const resolveGstRatesFromGstin = (
  partnerGst: string,
  companyGst: string,
  companyStateFallback = ''
) => {
  const partnerState = gstStateCode(partnerGst);
  const companyState = gstStateCode(companyGst) || normalizeGstState(companyStateFallback);
  if (partnerState && companyState && partnerState !== companyState) {
    return { igstRate: GST_SPLIT_RATE * 2, cgstRate: 0, sgstRate: 0 };
  }
  return { igstRate: 0, cgstRate: GST_SPLIT_RATE, sgstRate: GST_SPLIT_RATE };
};

const isSameUserId = (a?: number | string | null, b?: number | string | null) => {
  if (a == null || b == null || a === '' || b === '') return false;
  const left = Number(a);
  const right = Number(b);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
};

const parseApprovalFlow = (value: any): ApprovalStep[] => {
  if (!value) return [];
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) return parsed.rows;
  return [];
};

const getExpenseFlowStampLabel = (step: ApprovalStep, translate: (key: string) => string) => {
  if (step.action === 'rejected' || step.status === 'rejected') {
    return translate('expenseApproval.flow.actions.rejected');
  }
  if (step.status === 'skipped') {
    return translate('expenseApproval.flow.actions.changed');
  }
  if (step.action === 'approved' || step.status === 'approved') {
    return translate('expenseApproval.voucher.approved');
  }
  if (step.status === 'pending') {
    return translate('expenseApproval.flow.status.pending');
  }
  return translate('expenseApproval.voucher.approved');
};

const displayExpenseCurrency = (_currency?: string) => 'INR';

const readMetaNumber = (meta: Record<string, any> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const raw = meta?.[key];
    if (raw !== undefined && raw !== null && raw !== '') {
      const num = Number(raw);
      if (Number.isFinite(num)) return num;
    }
  }
  return 0;
};

const calcExpenseTax = (
  items: Array<{ total?: number; amount?: number }> | undefined,
  meta: Record<string, any> | undefined,
  companyGstNumber = '',
  companyGstState = ''
) => {
  const subtotal = floorMoney(
    (items || []).reduce((sum, item) => sum + Number(item.total ?? item.amount ?? 0), 0)
  );
  let igstRate = readMetaNumber(meta, 'igstRate', 'igst_rate');
  let cgstRate = readMetaNumber(meta, 'cgstRate', 'cgst_rate');
  let sgstRate = readMetaNumber(meta, 'sgstRate', 'sgst_rate');
  const tdsEnabled = Boolean(meta?.tdsEnabled ?? meta?.tds_enabled);
  const tdsRate = tdsEnabled ? readMetaNumber(meta, 'tdsRate', 'tds_rate') : 0;
  const gstNumber = String(meta?.gstNumber || meta?.gst_number || '').trim();
  if (igstRate === 0 && cgstRate === 0 && sgstRate === 0 && looksLikeGstin(gstNumber)) {
    const resolved = resolveGstRatesFromGstin(gstNumber, companyGstNumber, companyGstState);
    igstRate = resolved.igstRate;
    cgstRate = resolved.cgstRate;
    sgstRate = resolved.sgstRate;
  }
  const igstAmount = floorMoney(subtotal * (igstRate / 100));
  const cgstAmount = floorMoney(subtotal * (cgstRate / 100));
  const sgstAmount = floorMoney(subtotal * (sgstRate / 100));
  const tdsAmount = floorMoney(subtotal * (tdsRate / 100));
  return {
    subtotal,
    igstRate,
    cgstRate,
    sgstRate,
    tdsEnabled,
    tdsRate,
    igstAmount,
    cgstAmount,
    sgstAmount,
    tdsAmount,
    grandTotal: floorMoney(subtotal + igstAmount + cgstAmount + sgstAmount - tdsAmount),
  };
};

const pickGstNumberList = (raw: any): string[] => {
  const list = Array.isArray(raw?.gst_numbers)
    ? raw.gst_numbers
    : Array.isArray(raw?.data?.gst_numbers)
      ? raw.data.gst_numbers
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];
  return list
    .map((item: any) => String(typeof item === 'string' ? item : item?.gst_number || '').trim())
    .filter(Boolean);
};

const pickPartnerGstNumber = (partner: {
  gstNumbers?: string[];
  business_number?: string;
}) => {
  const fromList = (partner.gstNumbers || [])
    .map((item) => String(item || '').trim())
    .find(Boolean);
  if (fromList) return fromList;
  const biz = String(partner.business_number || '').trim();
  return looksLikeGstin(biz) ? biz : '';
};

const pickCompanyGstNumber = (company: any) => {
  if (!company) return '';
  const list = Array.isArray(company.gst_numbers)
    ? company.gst_numbers
    : Array.isArray(company.gstNumbers)
      ? company.gstNumbers
      : [];
  const fromList = list
    .map((item: any) => String(typeof item === 'string' ? item : item?.gst_number || '').trim())
    .find(Boolean);
  if (fromList) return fromList;
  const biz = String(company.business_number || '').trim();
  return looksLikeGstin(biz) ? biz : '';
};

const ExpenseApproval: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { user } = useStore();
  const navigate = useNavigate();
  const isRootUser = user?.role === 'root';
  const hasTransferAccess = Boolean(user?.is_payment_officer) || isRootUser;
  const [expenses, setExpenses] = useState<ExpenseApprovalItem[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseApprovalItem[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  /** '' | draftCreated | autoSaved | autoSaveFailed — render with t() for i18n */
  const [headerStatusBanner, setHeaderStatusBanner] = useState<'' | 'draftCreated' | 'autoSaved' | 'autoSaveFailed'>('');
  const [isInitializingDraft, setIsInitializingDraft] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseApprovalItem | null>(null);
  const expensePdfRef = useRef<HTMLDivElement | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list');
  const [listTab, setListTab] = useState<'received' | 'written' | 'transfer'>('written');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [companyFilterId, setCompanyFilterId] = useState<number | ''>('');
  const [companyOptions, setCompanyOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [listSortKey, setListSortKey] = useState<ExpenseListSortKey | null>(null);
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyGstNumber, setCompanyGstNumber] = useState('');
  const [companyGstState, setCompanyGstState] = useState('');
  const todayDate = useMemo(() => getTodayLocalYmd(), []);
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    currency: 'INR',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: getTodayLocalYmd(),
    notes: ''
  });
  const [lineItems, setLineItems] = useState<ExpenseItem[]>([]);
  const [currentAttachments, setCurrentAttachments] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<Array<{ id: number; name: string }>>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [partnerInputValue, setPartnerInputValue] = useState('');
  const [voucherData, setVoucherData] = useState({
    department: '',
    partnerId: '',
    voucherNo: '',
    gstNumber: '',
    voucherDate: getTodayLocalYmd(),
    partnerRepresentative: '',
    partnerAddress: '',
    partnerPhone: '',
    partnerEmail: '',
    partnerPan: '',
    acHolder: '',
    bank: '',
    accountNumber: '',
    ifsc: '',
    paymentDate: '',
    paymentStatus: '',
    amountInWords: '',
    remarks: '',
    checkedById: '',
    approvedById: '',
    igstRate: 0,
    cgstRate: 0,
    sgstRate: 0,
    tdsEnabled: false,
    tdsRate: 0
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrImageError, setQrImageError] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState<string>('');
  const [proofNameDraft, setProofNameDraft] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const lastSavedPayloadRef = useRef<string>('');
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingReceipts, setUploadingReceipts] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDialogType, setReasonDialogType] = useState<'payment-approve' | 'payment-reject' | 'expense-reject'>('payment-approve');
  const [reasonText, setReasonText] = useState('');
  const [reasonTargetId, setReasonTargetId] = useState<number | null>(null);
  const [approverSaving, setApproverSaving] = useState(false);
  const parseExpenseItems = (value: any) => {
    if (!value) return { rows: [], meta: {} };
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return { rows: [], meta: {} };
      }
    }
    if (Array.isArray(parsed)) {
      return { rows: parsed, meta: {} };
    }
    if (typeof parsed === 'object') {
      const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
      const meta = parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
      return { rows, meta };
    }
    return { rows: [], meta: {} };
  };

  const mapExpense = (expense: any): ExpenseApprovalItem => {
    const parsedItems = parseExpenseItems(expense.items);
    return {
    id: expense.id,
    expenseId: expense.expense_id || '',
    title: expense.title || '',
    requesterId: expense.requester_id,
    requesterName: expense.requester_name || '',
    requesterDepartment: expense.requester_department || '',
    requesterPosition: expense.requester_position || '',
    totalAmount: parseFloat(expense.total_amount || 0),
    currency: displayExpenseCurrency(expense.currency),
    purpose: expense.purpose || '',
    items: parsedItems.rows,
    status: expense.status || 'draft',
    priority: expense.priority || 'medium',
    currentApproverId: expense.current_approver_id,
    currentApproverName: expense.current_approver_name,
    approvalFlow: parseApprovalFlow(expense.approval_flow),
    submittedAt: expense.submitted_at || '',
    dueDate: expense.due_date || '',
    notes: expense.notes || '',
    attachments: normalizeAttachmentPaths(expense.attachments),
    itemMeta: parsedItems.meta,
    approvalId: expense.approval_id || undefined,
    paymentRequestStatus: expense.payment_request_status || undefined,
    paidAmount: Number(expense.paid_amount || 0),
    paymentRequestedAt: expense.payment_requested_at || '',
    paymentCompletedAt: expense.payment_completed_at || '',
    paymentApprovedReason: expense.payment_approved_reason || '',
    paymentApprovedAt: expense.payment_approved_at || '',
    paymentApprovedBy: expense.payment_approved_by || undefined,
    paymentRejectedReason: expense.payment_rejected_reason || '',
    paymentRejectedAt: expense.payment_rejected_at || '',
    paymentRejectedBy: expense.payment_rejected_by || undefined,
    bankTransferProvider: expense.bank_transfer_provider || undefined,
    bankTransferStatus: expense.bank_transfer_status || undefined,
    bankTransferReference: expense.bank_transfer_reference || undefined,
    bankTransferError: expense.bank_transfer_error || undefined,
    bankTransferLogs: Array.isArray(expense.bank_transfer_logs) ? expense.bank_transfer_logs : [],
    remittanceHistory: Array.isArray(expense.remittance_history) ? expense.remittance_history : [],
    companyId: Number(expense.company_id || 0) || undefined,
    companyName: String(expense.company_name || expense.companyName || '').trim() || undefined,
    createdAt: expense.created_at || expense.createdAt || parsedItems.meta?.voucherDate || '',
    updatedAt: expense.updated_at || expense.updatedAt || ''
    };
  };

  const subtotalAmount = useMemo(
    () => floorMoney(lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0)),
    [lineItems]
  );
  const igstAmount = useMemo(
    () => floorMoney(subtotalAmount * (Number(voucherData.igstRate || 0) / 100)),
    [subtotalAmount, voucherData.igstRate]
  );
  const cgstAmount = useMemo(
    () => floorMoney(subtotalAmount * (Number(voucherData.cgstRate || 0) / 100)),
    [subtotalAmount, voucherData.cgstRate]
  );
  const sgstAmount = useMemo(
    () => floorMoney(subtotalAmount * (Number(voucherData.sgstRate || 0) / 100)),
    [subtotalAmount, voucherData.sgstRate]
  );
  const tdsAmount = useMemo(
    () =>
      voucherData.tdsEnabled
        ? floorMoney(subtotalAmount * (Number(voucherData.tdsRate || 0) / 100))
        : 0,
    [subtotalAmount, voucherData.tdsEnabled, voucherData.tdsRate]
  );
  const totalAmount = useMemo(
    () => floorMoney(subtotalAmount + igstAmount + cgstAmount + sgstAmount - tdsAmount),
    [subtotalAmount, igstAmount, cgstAmount, sgstAmount, tdsAmount]
  );

  const loadExpenseData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, number> = {};
      if (isRootUser && companyFilterId) {
        params.company_id = Number(companyFilterId);
      }
      const response = await accountingService.getExpenseReports(params);
      if (response.success) {
        const list = Array.isArray(response.data) ? response.data : [];
        setExpenses(list.map((row: any) => mapExpense(row)));
      } else {
        setExpenses([]);
        setError(response.message || t('expenseApproval.errors.loadFailed'));
      }
    } catch {
      setError(t('expenseApproval.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  // mapExpense is a render-local mapper; listing it would refetch on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable mapping helper
  }, [t, isRootUser, companyFilterId]);

  const getTransferFilterKey = useCallback((expense: ExpenseApprovalItem) => {
    const total = floorMoney(Number(expense.totalAmount || 0));
    const paid = floorMoney(Number(expense.paidAmount || 0));
    const remaining = Math.max(0, total - paid);
    if (String(expense.bankTransferStatus || '').toLowerCase() === 'failed') {
      return 'transfer_failed';
    }
    if (
      remaining <= 0 ||
      String(expense.paymentRequestStatus || '').toLowerCase() === 'paid' ||
      expense.status === 'paid'
    ) {
      return 'transfer_completed';
    }
    if (paid > 0) return 'transfer_partial';
    return 'transfer_pending';
  }, []);

  /** 목록에서 '지급 완료'로 취급 (문서 status와 무관하게 전액 송금 포함) */
  const isExpensePaidForList = useCallback((expense: ExpenseApprovalItem) => {
    const total = floorMoney(Number(expense.totalAmount || 0));
    const paid = floorMoney(Number(expense.paidAmount || 0));
    const remaining = Math.max(0, total - paid);
    const paymentPaid = String(expense.paymentRequestStatus || '').toLowerCase() === 'paid';
    return (
      paymentPaid ||
      expense.status === 'paid' ||
      (paid > 0 && remaining <= 0 && ['approved', 'paid'].includes(expense.status))
    );
  }, []);

  const buildExpensePayload = useCallback(
    (statusOverride?: ExpenseApprovalItem['status']) => ({
      title: formData.title,
      purpose: formData.purpose,
      total_amount: floorMoney(totalAmount),
      currency: 'INR',
      current_approver_id: voucherData.approvedById ? Number(voucherData.approvedById) : null,
      priority: formData.priority,
      due_date: formData.dueDate || null,
      notes: formData.notes || '',
      items: {
        rows: lineItems.map((item) => ({
          ...item,
          unitPrice: floorMoney(Number(item.unitPrice || 0)),
          total: floorMoney(Number(item.total || 0)),
        })),
        meta: {
          ...voucherData,
          checkedById: voucherData.approvedById || ''
        }
      },
      status: statusOverride,
    }),
    [formData, lineItems, voucherData, totalAmount]
  );

  const ensureDraftExpense = useCallback(async () => {
    if (viewMode !== 'create' || draftId || isInitializingDraft) return;
    setIsInitializingDraft(true);
    try {
      const payload = buildExpensePayload('draft');
      lastSavedPayloadRef.current = JSON.stringify(payload);
      const response = await accountingService.createExpenseReport(payload);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.createDraftFailed'));
      }
      setDraftId(response.data?.id || null);
      setCurrentAttachments(normalizeAttachmentPaths(response.data?.attachments));
      const assignedNo =
        parseExpenseItems(response.data?.items).meta?.voucherNo ||
        response.data?.expense_id ||
        '';
      if (assignedNo) {
        setVoucherData((prev) => ({ ...prev, voucherNo: assignedNo }));
      }
      setHeaderStatusBanner('draftCreated');
    } catch {
      setError(t('expenseApproval.errors.createDraftFailed'));
    } finally {
      setIsInitializingDraft(false);
    }
  }, [viewMode, draftId, isInitializingDraft, buildExpensePayload, t]);

  const filterExpenses = useCallback(() => {
    let filtered = expenses;

    if (listTab === 'written' && user?.id) {
      filtered = filtered.filter(expense => expense.requesterId === user.id);
    }
    if (listTab === 'received' && user?.id) {
      filtered = filtered.filter(expense => {
        // 초안은 승인자가 지정돼 있어도 '승인 제출' 전까지 받은 목록에 노출하지 않음
        if (expense.status === 'draft') return false;
        if (expense.currentApproverId === user.id) return true;
        if (expense.itemMeta?.checkedById && Number(expense.itemMeta.checkedById) === user.id) return true;
        if (expense.itemMeta?.approvedById && Number(expense.itemMeta.approvedById) === user.id) return true;
        return expense.approvalFlow?.some(step => step.approverId === user.id);
      });
    }
    if (listTab === 'transfer') {
      if (!hasTransferAccess) {
        filtered = [];
      } else {
        // 승인·지급완료 건을 송금 목록 대상으로 두고, 상태 필터로 송금완료까지 검색
        // 기본(전체)에서는 지급/송금 완료 건 숨김 — transfer_completed 선택 시에만 표시
        filtered = filtered.filter((expense) => {
          if (expense.status !== 'approved' && expense.status !== 'paid') return false;
          const transferKey = getTransferFilterKey(expense);
          if (!statusFilter) return transferKey !== 'transfer_completed';
          return transferKey === statusFilter;
        });
      }
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (expense) =>
          expense.title.toLowerCase().includes(q) ||
          expense.expenseId.toLowerCase().includes(q) ||
          expense.requesterName.toLowerCase().includes(q) ||
          expense.purpose.toLowerCase().includes(q) ||
          String(expense.companyName || '')
            .toLowerCase()
            .includes(q)
      );
    }

    // 송금 탭은 transfer_* 상태 필터를 위에서 적용
    if (listTab !== 'transfer') {
      if (statusFilter === 'paid') {
        // 지급완료는 명시 선택 시에만 표시
        filtered = filtered.filter((expense) => isExpensePaidForList(expense));
      } else if (statusFilter) {
        filtered = filtered.filter(
          (expense) => !isExpensePaidForList(expense) && expense.status === statusFilter
        );
      } else {
        // 전체: 지급완료 제외
        filtered = filtered.filter((expense) => !isExpensePaidForList(expense));
      }
    }

    if (priorityFilter) {
      filtered = filtered.filter((expense) => expense.priority === priorityFilter);
    }

    setFilteredExpenses(filtered);
  }, [
    expenses,
    searchTerm,
    statusFilter,
    priorityFilter,
    listTab,
    user,
    hasTransferAccess,
    getTransferFilterKey,
    isExpensePaidForList,
  ]);

  const handleListSort = (key: ExpenseListSortKey) => {
    setPage(1);
    if (listSortKey === key) {
      setListSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setListSortKey(key);
    setListSortDir(key === 'createdAt' || key === 'amount' ? 'desc' : 'asc');
  };

  useEffect(() => {
    loadExpenseData();
  }, [loadExpenseData]);

  useEffect(() => {
    if (!isRootUser) {
      setCompanyOptions([]);
      setCompanyFilterId('');
      return;
    }
    let cancelled = false;
    const tenantId = Number(user?.tenant_id);
    (async () => {
      try {
        const res = await companyService.getCompanies();
        const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (cancelled) return;
        setCompanyOptions(
          rows
            .map((c: any) => ({
              id: Number(c.id),
              name: String(c.name || c.company_name || '').trim(),
              tenantId: Number(c.tenant_id || c.tenantId || 0),
            }))
            .filter(
              (c: { id: number; name: string; tenantId: number }) =>
                Number.isFinite(c.id) &&
                c.id > 0 &&
                c.name &&
                (!Number.isFinite(tenantId) || tenantId <= 0 || !c.tenantId || c.tenantId === tenantId)
            )
            .map(({ id, name }: { id: number; name: string }) => ({ id, name }))
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
        );
      } catch {
        if (!cancelled) setCompanyOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isRootUser, user?.tenant_id]);

  useEffect(() => {
    if (!user) {
      setCompanyLogo('');
      setCompanyName('');
      setCompanyAddress('');
      setCompanyGstNumber('');
      setCompanyGstState('');
      return;
    }
    resolveHeaderCompanyInfo(user).then((info) => {
      setCompanyLogo(info.logo || '');
      if (info.name) setCompanyName(info.name);
    });
    if (user.company_id) {
      const companyId = Number(user.company_id);
      Promise.all([
        useReferenceDataStore.getState().fetchCompanyById(companyId),
        companyService.getCompanyGstNumbers(companyId).catch(() => null),
      ])
        .then(([company, gstRes]) => {
          if (company?.name) setCompanyName(String(company.name));
          setCompanyAddress(String(company?.address || '').trim());
          const gstList = pickGstNumberList(gstRes);
          const gstNumber = gstList[0] || pickCompanyGstNumber(company);
          setCompanyGstNumber(gstNumber);
          setCompanyGstState(
            gstStateCode(gstNumber) ||
              resolveRegisteredStateCodeFromCompanyLike({
                ...(company || {}),
                gst_numbers: gstList.length ? gstList : company?.gst_numbers,
              }) ||
              ''
          );
        })
        .catch(() => {
          setCompanyGstNumber('');
          setCompanyGstState('');
        });
    }
  }, [user]);

  useEffect(() => {
    if (viewMode !== 'create' && viewMode !== 'edit') return;
    if (!voucherData.gstNumber) return;
    const nextRates = resolveGstRatesFromGstin(
      voucherData.gstNumber,
      companyGstNumber,
      companyGstState
    );
    if (
      Number(voucherData.igstRate || 0) === nextRates.igstRate &&
      Number(voucherData.cgstRate || 0) === nextRates.cgstRate &&
      Number(voucherData.sgstRate || 0) === nextRates.sgstRate
    ) {
      return;
    }
    setVoucherData((prev) => ({ ...prev, ...nextRates }));
  }, [
    viewMode,
    voucherData.gstNumber,
    voucherData.igstRate,
    voucherData.cgstRate,
    voucherData.sgstRate,
    companyGstNumber,
    companyGstState,
  ]);

  useEffect(() => {
    const loadApprovers = async () => {
      if (!user?.company_id) {
        setApprovers([]);
        return;
      }
      try {
        const users = await useReferenceDataStore.getState().fetchUsers({
          company_id: Number(user.company_id),
        });
        const options = users.map((item: any) => ({
          id: item.id,
          name: item.username || item.userid || `User ${item.id}`,
        }));
        setApprovers(options);
      } catch {
        setApprovers([]);
      }
    };
    loadApprovers();
  }, [user?.company_id]);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const [rows, scopeRes] = await Promise.all([
          useReferenceDataStore.getState().fetchPartners(),
          workAssigneeListService.getMyScope().catch(() => null),
        ]);
        const scope = scopeRes?.data;
        const allowedPartnerIds = new Set<number>(
          Array.isArray(scope?.partner_ids)
            ? scope.partner_ids.map((id: any) => Number(id)).filter((id: number) => id > 0)
            : []
        );
        const allowedNames = new Set<string>(
          Array.isArray(scope?.partner_names)
            ? scope.partner_names.map((n: any) => String(n || '').trim().toLowerCase()).filter(Boolean)
            : []
        );
        const enforce = Boolean(scope?.enforced);

        const normalized: PartnerOption[] = (Array.isArray(rows) ? rows : [])
          .map((p: any) => ({
            id: Number(p.id),
            company_name: String(p.company_name || p.companyName || p.name || '').trim(),
            representative: p.representative || '',
            address: p.address || '',
            phone: p.phone || '',
            email: p.email || '',
            pan_number: p.pan_number || p.panNumber || '',
            bank_name: p.bank_name || p.bankName || '',
            account_number: p.account_number || p.accountNumber || '',
            bank_ifsc: p.bank_ifsc || p.bankIfsc || p.ifsc || '',
            account_holder: p.account_holder || p.accountHolder || '',
            business_number: String(p.business_number || p.businessNumber || '').trim(),
            gstNumbers: Array.isArray(p.gstNumbers)
              ? p.gstNumbers
              : Array.isArray(p.gst_numbers)
                ? p.gst_numbers
                : [],
          }))
          .filter((p) => Number.isFinite(p.id) && p.company_name)
          .filter((p) => {
            if (!enforce) return true;
            if (allowedPartnerIds.has(p.id)) return true;
            return allowedNames.has(p.company_name.trim().toLowerCase());
          });
        setPartners(normalized);
      } catch {
        setPartners([]);
      }
    };
    loadPartners();
  }, []);

  const filterPartnerOptions = useCallback((options: PartnerOption[], state: { inputValue: string }) => {
    const q = state.inputValue.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    const matched = options.filter((p) => {
      const name = String(p.company_name || '').toLowerCase();
      const holder = String(p.account_holder || p.representative || '').toLowerCase();
      const gst = (p.gstNumbers || []).join(' ').toLowerCase();
      return name.includes(q) || holder.includes(q) || gst.includes(q);
    });
    matched.sort((a, b) => {
      const an = a.company_name.toLowerCase();
      const bn = b.company_name.toLowerCase();
      const aStarts = an.startsWith(q) ? 0 : 1;
      const bStarts = bn.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return an.localeCompare(bn);
    });
    return matched.slice(0, 50);
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [filterExpenses]);

  useEffect(() => {
    if (!hasTransferAccess && listTab === 'transfer') {
      setListTab('written');
    }
  }, [hasTransferAccess, listTab]);

  const qrUrl = useMemo(() => {
    if (!qrToken) return '';
    return `${window.location.origin}/expense-receipt-upload?token=${qrToken}`;
  }, [qrToken]);

  useEffect(() => {
    if (!qrUrl) {
      setQrImage('');
      return;
    }
    setQrImageError('');
    QRCode.toDataURL(qrUrl, { width: 220, margin: 1 })
      .then((url: string) => setQrImage(url))
      .catch(() => {
        setQrImageError(t('expenseApproval.errors.qrGenerateFailed'));
      });
  }, [qrUrl, t]);

  useEffect(() => {
    ensureDraftExpense();
  }, [ensureDraftExpense]);

  useEffect(() => {
    const activeExpenseId = viewMode === 'edit' ? selectedExpense?.id : draftId;
    if (!activeExpenseId) return;
    if (viewMode !== 'create' && viewMode !== 'edit') return;
    if (isInitializingDraft) return;

    const timer = setTimeout(async () => {
      try {
        const payload = buildExpensePayload('draft');
        const payloadString = JSON.stringify(payload);
        if (payloadString === lastSavedPayloadRef.current) {
          return;
        }
        setSaving(true);
        const response = await accountingService.updateExpenseReport(activeExpenseId, payload);
        if (response?.success) {
          setCurrentAttachments(normalizeAttachmentPaths(response.data?.attachments));
          const assignedNo = parseExpenseItems(response.data?.items).meta?.voucherNo || '';
          if (assignedNo) {
            setVoucherData((prev) => (prev.voucherNo === assignedNo ? prev : { ...prev, voucherNo: assignedNo }));
          }
          setHeaderStatusBanner('autoSaved');
          lastSavedPayloadRef.current = payloadString;
        }
      } catch {
        setHeaderStatusBanner('autoSaveFailed');
      } finally {
        setSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, lineItems, voucherData, draftId, selectedExpense?.id, viewMode, isInitializingDraft, buildExpensePayload]);

  const getExpenseRemainingAmount = useCallback((expense: ExpenseApprovalItem) => {
    const total = floorMoney(Number(expense.totalAmount || 0));
    const paid = floorMoney(Number(expense.paidAmount || 0));
    return Math.max(0, total - paid);
  }, []);

  const getExpenseRemittanceEntries = (expense: ExpenseApprovalItem) => {
    const fromHistory = (expense.remittanceHistory || [])
      .map((row) => ({
        timestamp: String(row.timestamp || ''),
        amount: Number(row.amount || 0),
      }))
      .filter((row) => Number.isFinite(row.amount) && row.amount > 0);
    const source =
      fromHistory.length > 0
        ? fromHistory
        : (expense.bankTransferLogs || [])
            .map((log) => {
              const amount = Number(log.amount ?? log.payload?.amount ?? 0);
              const status = String(log.status || '').toLowerCase();
              const ok = !status || ['success', 'completed', 'paid'].includes(status);
              return { timestamp: String(log.timestamp || ''), amount, ok };
            })
            .filter((row) => row.ok && Number.isFinite(row.amount) && row.amount > 0)
            .map(({ timestamp, amount }) => ({ timestamp, amount }));
    return [...source].sort(
      (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
  };

  /** 목록/상세 상태: 송금까지 끝나면 문서 status와 무관하게 지급 완료로 표시 */
  const resolveDisplayStatus = useCallback(
    (expense: ExpenseApprovalItem): ExpenseApprovalItem['status'] | string => {
      const remaining = getExpenseRemainingAmount(expense);
      const paymentPaid = String(expense.paymentRequestStatus || '').toLowerCase() === 'paid';
      const fullyRemitted =
        paymentPaid ||
        expense.status === 'paid' ||
        (Number(expense.paidAmount || 0) > 0 && remaining <= 0 && ['approved', 'paid'].includes(expense.status));
      if (fullyRemitted) return 'paid';
      return expense.status;
    },
    [getExpenseRemainingAmount]
  );

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label={t('expenseApproval.status.draft')} color="default" size="small" />;
      case 'submitted':
        return <Chip label={t('expenseApproval.status.submitted')} color="info" size="small" />;
      case 'in_review':
        return <Chip label={t('expenseApproval.status.inReview')} color="warning" size="small" />;
      case 'approved':
        return <Chip label={t('expenseApproval.status.approved')} color="success" size="small" />;
      case 'rejected':
        return <Chip label={t('expenseApproval.status.rejected')} color="error" size="small" />;
      case 'paid':
        return <Chip label={t('expenseApproval.status.paid')} size="small" sx={paidStatusChipSx} />;
      default:
        return <Chip label={t('expenseApproval.unknown')} color="default" size="small" />;
    }
  };

  /** 송금할 리스트용: 문서 초안 상태가 아니라 송금 진행 상태를 표시 */
  const getTransferStatusChip = (expense: ExpenseApprovalItem) => {
    const total = Number(expense.totalAmount || 0);
    const paid = Number(expense.paidAmount || 0);
    const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
    if (expense.bankTransferStatus === 'failed') {
      return <Chip label={t('expenseApproval.status.transferFailed')} color="error" size="small" />;
    }
    if (remaining <= 0 || expense.paymentRequestStatus === 'paid' || expense.status === 'paid') {
      return <Chip label={t('expenseApproval.status.paid')} size="small" sx={paidStatusChipSx} />;
    }
    if (paid > 0) {
      return <Chip label={t('expenseApproval.status.partialTransfer')} color="warning" size="small" />;
    }
    return <Chip label={t('expenseApproval.status.transferPending')} color="info" size="small" />;
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Chip label={t('expenseApproval.priority.low')} color="default" size="small" />;
      case 'medium':
        return <Chip label={t('expenseApproval.priority.medium')} color="info" size="small" />;
      case 'high':
        return <Chip label={t('expenseApproval.priority.high')} color="warning" size="small" />;
      case 'urgent':
        return <Chip label={t('expenseApproval.priority.urgent')} color="error" size="small" />;
      default:
        return <Chip label={t('expenseApproval.unknown')} color="default" size="small" />;
    }
  };

  const handleViewExpense = (expense: ExpenseApprovalItem) => {
    setSelectedExpense(expense);
    setViewMode('view');
  };

  const handleEditExpense = (expense: ExpenseApprovalItem) => {
    setSelectedExpense(expense);
    const meta = expense.itemMeta || {};
    const linkedPartner = partners.find((p) => String(p.id) === String(meta.partnerId || ''));
    const savedDueDate = formatLocalYmd(expense.dueDate);
    setFormData({
      title: expense.title || '',
      purpose: expense.purpose || '',
      currency: displayExpenseCurrency(expense.currency),
      priority: expense.priority || 'medium',
      dueDate: savedDueDate || todayDate,
      notes: expense.notes || ''
    });
    const savedItems = (expense.items || []).map((item) => {
      const qty = Number(item.qty || 1);
      const unitPrice = floorMoney(Number(item.unitPrice || item.amount || 0));
      return {
        id: item.id || `${Date.now()}-${Math.random()}`,
        invoiceDate: formatLocalYmd(item.invoiceDate || item.date) || todayDate,
        description: item.description || '',
        qty,
        unitPrice,
        total: floorMoney(Number(item.total || item.amount || qty * unitPrice)),
      };
    });
    setLineItems(savedItems.length > 0 ? savedItems : [createEmptyLineItem()]);
    setCurrentAttachments(expense.attachments || []);
    setVoucherData({
      department: meta.department || linkedPartner?.company_name || '',
      partnerId: meta.partnerId != null ? String(meta.partnerId) : '',
      voucherNo: meta.voucherNo || '',
      gstNumber: meta.gstNumber || pickPartnerGstNumber(linkedPartner || ({} as PartnerOption)) || '',
      voucherDate: formatLocalYmd(meta.voucherDate) || todayDate,
      partnerRepresentative: meta.partnerRepresentative || linkedPartner?.representative || '',
      partnerAddress: meta.partnerAddress || linkedPartner?.address || '',
      partnerPhone: meta.partnerPhone || linkedPartner?.phone || '',
      partnerEmail: meta.partnerEmail || linkedPartner?.email || '',
      partnerPan: meta.partnerPan || linkedPartner?.pan_number || '',
      acHolder: meta.acHolder || linkedPartner?.account_holder || '',
      bank: meta.bank || linkedPartner?.bank_name || '',
      accountNumber: meta.accountNumber || linkedPartner?.account_number || '',
      ifsc: meta.ifsc || linkedPartner?.bank_ifsc || '',
      paymentDate: formatLocalYmd(meta.paymentDate) || '',
      paymentStatus: meta.paymentStatus || '',
      amountInWords: meta.amountInWords || '',
      remarks: meta.remarks || '',
      checkedById: meta.checkedById != null ? String(meta.checkedById) : '',
      approvedById: meta.approvedById != null ? String(meta.approvedById) : '',
      igstRate: Number(meta.igstRate || meta.igst_rate || 0),
      cgstRate: Number(meta.cgstRate || meta.cgst_rate || 0),
      sgstRate: Number(meta.sgstRate || meta.sgst_rate || 0),
      tdsEnabled: Boolean(meta.tdsEnabled ?? meta.tds_enabled),
      tdsRate: Number(meta.tdsRate || meta.tds_rate || 0)
    });
    setPartnerInputValue(
      String(meta.department || '').trim() ||
        linkedPartner?.company_name ||
        ''
    );
    setDraftId(expense.id);
    setHeaderStatusBanner('');
    lastSavedPayloadRef.current = '';
    setViewMode('edit');
  };

  const handleCreateExpense = () => {
    setSelectedExpense(null);
    setFormData({
      title: '',
      purpose: '',
      currency: 'INR',
      priority: 'medium',
      dueDate: todayDate,
      notes: ''
    });
    setLineItems([createEmptyLineItem()]);
    setCurrentAttachments([]);
    setPartnerInputValue('');
    setVoucherData({
      department: '',
      partnerId: '',
      voucherNo: '',
      gstNumber: '',
      voucherDate: todayDate,
      partnerRepresentative: '',
      partnerAddress: '',
      partnerPhone: '',
      partnerEmail: '',
      partnerPan: '',
      acHolder: '',
      bank: '',
      accountNumber: '',
      ifsc: '',
      paymentDate: '',
      paymentStatus: '',
      amountInWords: '',
      remarks: '',
      checkedById: '',
      approvedById: '',
      igstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      tdsEnabled: false,
      tdsRate: 0
    });
    setDraftId(null);
    setHeaderStatusBanner('');
    setViewMode('create');
  };

  const handleSaveExpense = async () => {
    if (!formData.title.trim() || !formData.purpose.trim()) {
      setError(t('expenseApproval.errors.requiredTitlePurpose'));
      return;
    }
    if (!voucherData.approvedById) {
      setError(t('expenseApproval.errors.approverRequired'));
      return;
    }
    if (!currentAttachments.length && !String(voucherData.remarks || '').trim()) {
      setError(t('expenseApproval.errors.receiptOrRemarksRequired'));
      return;
    }
    if (isSameUserId(voucherData.approvedById, user?.id)) {
      setError(t('expenseApproval.errors.cannotSelectSelf'));
      return;
    }
    const activeExpenseId = viewMode === 'edit' ? selectedExpense?.id : draftId;
    if (!activeExpenseId) {
      setError(t('expenseApproval.errors.draftNotReadyRetry'));
      return;
    }
    setSaving(true);
    try {
      const payload = buildExpensePayload('submitted');
      const response = await accountingService.updateExpenseReport(activeExpenseId, payload);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.submitResponseFailed'));
      }
      setSuccess(t('expenseApproval.success.submitted'));
      await loadExpenseData();
      setViewMode('list');
      setSelectedExpense(null);
      setDraftId(null);
    } catch (saveError) {
      setError(t('expenseApproval.errors.submitFailed'));
    } finally {
      setSaving(false);
    }
  };

  const createEmptyLineItem = (): ExpenseItem => ({
    id: `${Date.now()}-${Math.random()}`,
    invoiceDate: todayDate,
    description: '',
    qty: 1,
    unitPrice: 0,
    total: 0
  });

  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextItem = { ...item, [field]: value };
        if (field === 'unitPrice') {
          nextItem.unitPrice = floorMoney(Number(value || 0));
        }
        const qty = Number(nextItem.qty || 0);
        const unitPrice = Number(nextItem.unitPrice || 0);
        nextItem.total = floorMoney(qty * unitPrice);
        return nextItem;
      })
    );
  };

  const setInputRef = (id: string, field: string) => (el: HTMLInputElement | null) => {
    inputRefs.current[`${id}-${field}`] = el;
  };

  const focusField = (id: string, field: string) => {
    const el = inputRefs.current[`${id}-${field}`];
    if (el) el.focus();
  };

  const handleLineItemKeyDown = (id: string, field: string, rowIndex: number) => (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (field === 'invoiceDate') {
      focusField(id, 'description');
      return;
    }
    if (field === 'description') {
      focusField(id, 'qty');
      return;
    }
    if (field === 'qty') {
      focusField(id, 'unitPrice');
      return;
    }
    if (field === 'unitPrice') {
      const newItem = createEmptyLineItem();
      setLineItems((prev) => {
        const next = [...prev, newItem];
        return next;
      });
      setTimeout(() => {
        focusField(newItem.id, 'description');
      }, 0);
    }
  };

  const handleOpenQr = async () => {
    const activeExpenseId = viewMode === 'edit' ? selectedExpense?.id : draftId;
    if (!activeExpenseId) {
      setError(t('expenseApproval.errors.draftNotReady'));
      return;
    }
    setQrLoading(true);
    try {
      const response = await accountingService.getReceiptUploadToken(activeExpenseId);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.qrTokenFailed'));
      }
      setQrToken(response.token);
      setQrOpen(true);
    } catch (qrError) {
      setError(t('expenseApproval.errors.qrTokenFailed'));
    } finally {
      setQrLoading(false);
    }
  };

  /** QR 업로드 중 첨부 목록을 주기적으로 갱신해 화면에 바로 반영 */
  useEffect(() => {
    if (!qrOpen) return;
    const activeExpenseId = viewMode === 'edit' ? selectedExpense?.id : draftId;
    if (!activeExpenseId) return;

    let cancelled = false;
    let lastCount = -1;

    const refreshAttachments = async () => {
      try {
        const response = await accountingService.getExpenseReport(activeExpenseId);
        if (cancelled || !response?.success) return;
        const next = normalizeAttachmentPaths(response.data?.attachments);
        if (lastCount >= 0 && next.length > lastCount) {
          setSuccess(t('expenseApproval.success.receiptAttached'));
        }
        lastCount = next.length;
        setCurrentAttachments(next);
        if (viewMode === 'edit') {
          setSelectedExpense((prev) =>
            prev && prev.id === activeExpenseId ? { ...prev, attachments: next } : prev
          );
        }
      } catch (pollError) {
      }
    };

    refreshAttachments();
    const timer = window.setInterval(refreshAttachments, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [qrOpen, viewMode, selectedExpense?.id, draftId, t]);

  const openAttachment = (file: string) => {
    setPreviewLoadError(false);
    setPreviewAttachment(file);
  };

  const closeAttachmentPreview = () => {
    setPreviewAttachment(null);
    setPreviewBlobUrl('');
    setPreviewLoading(false);
    setPreviewLoadError(false);
  };

  useEffect(() => {
    if (!previewAttachment || isImageReceipt(previewAttachment)) {
      setPreviewBlobUrl('');
      setPreviewLoading(false);
      setPreviewLoadError(false);
      return;
    }

    if (!isPdfReceipt(previewAttachment)) {
      setPreviewBlobUrl('');
      setPreviewLoading(false);
      setPreviewLoadError(false);
      return;
    }

    let cancelled = false;
    let objectUrl = '';
    setPreviewLoading(true);
    setPreviewLoadError(false);
    setPreviewBlobUrl('');

    void (async () => {
      try {
        const url = await fetchUploadObjectUrl(previewAttachment, {
          forceMime: 'application/pdf',
        });
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewBlobUrl(url);
      } catch {
        if (!cancelled) {
          setPreviewLoadError(true);
          setPreviewBlobUrl('');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewAttachment]);

  const renderAttachmentList = (files: string[]) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 110px))',
        gap: 1,
        justifyContent: 'flex-start',
      }}
    >
      {files.map((file, index) => {
        const displayName = getReceiptDisplayName(file);
        const image = isImageReceipt(file);
        return (
          <Box
            key={`${file}-${index}`}
            component="button"
            type="button"
            onClick={() => openAttachment(file)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              width: '100%',
              maxWidth: 110,
              borderRadius: '8px',
              transition: 'border-color 0.15s ease',
              '&:hover': {
                '& .receipt-thumb': {
                  borderColor: 'primary.main' } },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: 2 } }}
          >
            <Box
              className="receipt-thumb"
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: '#CBD5E1',
                bgcolor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center' }}
            >
              {image ? (
                <AuthMedia
                  src={file}
                  alt={displayName}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block' }}
                />
              ) : (
                <FileIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              )}
            </Box>
            <Typography
              variant="caption"
              title={displayName}
              sx={{
                px: 0.25,
                fontWeight: 600,
                fontSize: '0.7rem',
                color: 'text.primary',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.35 }}
            >
              {displayName}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );

  const handleUploadReceipts = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const activeExpenseId = viewMode === 'edit' ? selectedExpense?.id : draftId;
    if (!activeExpenseId) {
      setError(t('expenseApproval.errors.draftNotReady'));
      return;
    }
    try {
      setUploadingReceipts(true);
      const response = await accountingService.uploadExpenseReceiptById(activeExpenseId, Array.from(files));
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.receiptUploadFailed'));
      }
      setCurrentAttachments(normalizeAttachmentPaths(response.data?.attachments));
      setSuccess(t('expenseApproval.success.receiptAttached'));
    } catch (uploadError) {
      setError(t('expenseApproval.errors.receiptUploadFailed'));
    } finally {
      setUploadingReceipts(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteExpense = async () => {
    if (!deleteTargetId) return;
    try {
      const response = await accountingService.deleteExpenseReport(deleteTargetId);
      if (!response.success) {
        throw new Error(response.message || t('expenseApproval.errors.deleteFailed'));
      }
      await loadExpenseData();
      setSuccess(t('expenseApproval.success.deleted'));
    } catch {
      setError(t('expenseApproval.errors.deleteFailed'));
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleApproveExpense = (id: number) => {
    accountingService.updateExpenseReportStatus(id, 'approved')
      .then(() => loadExpenseData())
      .then(() => {
        setSelectedExpense(null);
        setListTab('received');
        setViewMode('list');
        setSuccess(t('expenseApproval.success.approved'));
      })
      .catch(() => {
        setError(t('expenseApproval.errors.approveFailed'));
      });
  };

  const handleRejectExpense = (id: number, reason: string) => {
    accountingService.updateExpenseReportStatus(id, 'rejected', { reason })
      .then(() => loadExpenseData())
      .then(() => {
        setSelectedExpense((prev) => {
          if (!prev || prev.id !== id) return prev;
          return {
            ...prev,
            status: 'rejected',
            itemMeta: {
              ...(prev.itemMeta || {}),
              rejectedReason: reason,
              rejectedById: user?.id,
              rejectedAt: new Date().toISOString(),
            },
          };
        });
        setSuccess(t('expenseApproval.success.rejected'));
      })
      .catch(() => {
        setError(t('expenseApproval.errors.rejectFailed'));
      });
  };

  const handleResubmitExpense = (id: number) => {
    accountingService.updateExpenseReportStatus(id, 'submitted')
      .then(() => loadExpenseData())
      .then(() => accountingService.getExpenseReport(id))
      .then((response) => {
        if (response?.success && response.data) {
          setSelectedExpense(mapExpense(response.data));
        } else {
          setSelectedExpense((prev) => (prev && prev.id === id ? { ...prev, status: 'submitted' } : prev));
        }
        setSuccess(t('expenseApproval.success.resubmitted'));
      })
      .catch((resubmitError: any) => {
        setError(
          resubmitError?.response?.data?.message || t('expenseApproval.errors.resubmitFailed')
        );
      });
  };

  const isDesignatedApprover = (expense: ExpenseApprovalItem) => {
    if (!user?.id) return false;
    return (
      isSameUserId(expense.itemMeta?.approvedById, user.id) ||
      isSameUserId(expense.currentApproverId, user.id)
    );
  };

  const canUserApproveExpense = (expense: ExpenseApprovalItem) => {
    if (!isDesignatedApprover(expense)) return false;
    return ['submitted', 'in_review'].includes(expense.status);
  };

  const canChangeExpenseApprover = (expense: ExpenseApprovalItem) => {
    if (!user?.id) return false;
    if (['approved', 'rejected', 'paid'].includes(expense.status)) return false;
    return isDesignatedApprover(expense);
  };

  const canEditExpense = (expense: ExpenseApprovalItem) => {
    if (!user?.id) return false;
    if (listTab === 'received' || listTab === 'transfer') return false;
    if (!isSameUserId(expense.requesterId, user.id)) return false;
    return ['draft', 'rejected'].includes(expense.status);
  };

  const canResubmitExpense = (expense: ExpenseApprovalItem) => {
    if (!user?.id) return false;
    if (listTab === 'received' || listTab === 'transfer') return false;
    if (!isSameUserId(expense.requesterId, user.id)) return false;
    return expense.status === 'rejected';
  };

  const canDeleteExpense = (expense: ExpenseApprovalItem) => {
    if (!user?.id) return false;
    if (listTab === 'transfer') return false;
    if (!isSameUserId(expense.requesterId, user.id)) return false;
    // 목록에 '지급 완료'로 보이는 건(문서 status와 무관) 삭제 불가
    if (resolveDisplayStatus(expense) === 'paid') return false;
    if (['submitted', 'in_review', 'approved', 'paid'].includes(expense.status)) return false;
    return true;
  };

  const getExpenseGrandTotal = useCallback(
    (expense: ExpenseApprovalItem) =>
      calcExpenseTax(expense.items, expense.itemMeta, companyGstNumber, companyGstState).grandTotal,
    [companyGstNumber, companyGstState]
  );

  const openReasonDialog = (type: 'payment-approve' | 'payment-reject' | 'expense-reject', id: number) => {
    setReasonDialogType(type);
    setReasonTargetId(id);
    setReasonText('');
    setReasonDialogOpen(true);
  };

  const closeReasonDialog = () => {
    setReasonDialogOpen(false);
    setReasonTargetId(null);
    setReasonText('');
  };

  const handleRequestPayment = async (id: number) => {
    try {
      const response = await accountingService.requestExpensePayment(id);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.paymentRequestFailed'));
      }
      await loadExpenseData();
      setSuccess(t('expenseApproval.success.paymentRequested'));
    } catch {
      setError(t('expenseApproval.errors.paymentRequestFailed'));
    }
  };

  const setRemittanceProofFile = useCallback((file: File | null) => {
    if (!file) {
      setPaymentProofFile(null);
      setProofNameDraft('');
      return;
    }
    const meta = selectedExpense?.itemMeta || {};
    const linkedPartner = partners.find((p) => String(p.id) === String(meta.partnerId || ''));
    const named = new File(
      [file],
      buildRemittanceProofFileName(
        file,
        meta.department || linkedPartner?.company_name || '',
        selectedExpense?.title || selectedExpense?.purpose || selectedExpense?.items?.[0]?.description || ''
      ),
      { type: file.type, lastModified: file.lastModified }
    );
    setPaymentProofFile(named);
    setProofNameDraft(named.name);
  }, [partners, selectedExpense]);

  const applyProofFileName = useCallback((nextName: string) => {
    setPaymentProofFile((prev) => {
      if (!prev) return prev;
      const renamed = renameFileKeepingExtension(prev, nextName);
      setProofNameDraft(renamed.name);
      return renamed;
    });
  }, []);

  useEffect(() => {
    if (!paymentProofFile || !paymentProofFile.type.startsWith('image/')) {
      setPaymentProofPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(paymentProofFile);
    setPaymentProofPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [paymentProofFile]);

  useEffect(() => {
    if (!paymentDialogOpen) return;
    const onPaste: EventListener = (event) => {
      const items = (event as ClipboardEvent).clipboardData?.items;
      if (!items?.length) return;
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (!item.type.startsWith('image/')) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        event.preventDefault();
        const ext = (item.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const file = new File([blob], `paste.${ext}`, { type: item.type });
        setRemittanceProofFile(file);
        break;
      }
    };
    window.addEventListener('paste', onPaste as EventListener);
    return () => window.removeEventListener('paste', onPaste as EventListener);
  }, [paymentDialogOpen, setRemittanceProofFile]);

  const openPaymentDialog = (_mode: 'complete' | 'retry' = 'complete') => {
    if (!selectedExpense) return;
    const remaining = getExpenseRemainingAmount(selectedExpense);
    setPaymentAmountInput(remaining > 0 ? String(remaining) : String(selectedExpense.totalAmount || ''));
    setRemittanceProofFile(null);
    setProofNameDraft('');
    setPaymentDialogOpen(true);
  };

  const handleCompletePayment = async (id: number, amount?: number, proof?: File | null) => {
    try {
      setPaymentSubmitting(true);
      if (!proof) {
        setError(t('expenseApproval.errors.remittanceProofRequired'));
        return;
      }
      const response = await accountingService.completeExpensePayment(id, amount, proof);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.paymentCompleteFailed'));
      }
      await loadExpenseData();
      setPaymentDialogOpen(false);
      setRemittanceProofFile(null);
      const remaining = Number(response?.remaining_amount);
      if (Number.isFinite(remaining) && remaining > 0) {
        setSuccess(t('expenseApproval.success.partialPaymentCompleted', { remaining }));
        if (response?.data) {
          setSelectedExpense(mapExpense(response.data));
        } else {
          setSelectedExpense((prev) => {
            if (!prev || prev.id !== id) return prev;
            return {
              ...prev,
              paidAmount: Number(response?.paid_amount ?? prev.paidAmount),
              paymentRequestStatus: 'approved',
            };
          });
        }
      } else {
        setSuccess(t('expenseApproval.success.paymentCompleted'));
        setSelectedExpense(null);
        setListTab('transfer');
        setViewMode('list');
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          t('expenseApproval.errors.paymentCompleteFailed')
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const submitPaymentDialog = async () => {
    if (!selectedExpense) return;
    const remaining = getExpenseRemainingAmount(selectedExpense);
    const amount = Number(paymentAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('expenseApproval.errors.invalidPaymentAmount'));
      return;
    }
    if (remaining > 0 && amount > remaining + 0.001) {
      setError(t('expenseApproval.errors.paymentExceedsRemaining', { remaining }));
      return;
    }
    if (!paymentProofFile) {
      setError(t('expenseApproval.errors.remittanceProofRequired'));
      return;
    }
    const proofToSend = renameFileKeepingExtension(paymentProofFile, proofNameDraft);
    if (proofToSend.name !== paymentProofFile.name) {
      setPaymentProofFile(proofToSend);
      setProofNameDraft(proofToSend.name);
    }
    await handleCompletePayment(selectedExpense.id, amount, proofToSend);
  };

  const handleApprovePayment = async (id: number, reason?: string) => {
    try {
      const response = await accountingService.approveExpensePayment(id, reason);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.finalApproveFailed'));
      }
      await loadExpenseData();
      setSuccess(t('expenseApproval.success.finalApproved'));
    } catch {
      setError(t('expenseApproval.errors.finalApproveFailed'));
    }
  };

  const handleRejectPayment = async (id: number, reason?: string) => {
    try {
      const response = await accountingService.rejectExpensePayment(id, reason);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.paymentRejectResponseFailed'));
      }
      await loadExpenseData();
      setSuccess(t('expenseApproval.success.paymentRejected'));
    } catch {
      setError(t('expenseApproval.errors.rejectFailed'));
    }
  };

  const handleReasonSubmit = async () => {
    if (!reasonTargetId) return;
    if ((reasonDialogType === 'payment-reject' || reasonDialogType === 'expense-reject') && !reasonText.trim()) {
      setError(t('expenseApproval.errors.rejectReasonRequired'));
      return;
    }
    const reason = reasonText.trim();
    if (reasonDialogType === 'payment-approve') {
      await handleApprovePayment(reasonTargetId, reason || undefined);
    } else if (reasonDialogType === 'payment-reject') {
      await handleRejectPayment(reasonTargetId, reason || undefined);
    } else {
      handleRejectExpense(reasonTargetId, reason);
    }
    closeReasonDialog();
  };

  const getUserNameById = (id?: number) => {
    if (!id) return '-';
    return approvers.find((item) => item.id === id)?.name || `User ${id}`;
  };

  const getExpenseApproverName = useCallback(
    (expense: ExpenseApprovalItem) => {
      const approvedById = expense.itemMeta?.approvedById ? Number(expense.itemMeta.approvedById) : null;
      if (approvedById != null) {
        const named = getUserNameById(approvedById);
        if (named !== '-') return named;
      }
      if (expense.currentApproverName) return expense.currentApproverName;
      if (expense.currentApproverId) return getUserNameById(expense.currentApproverId);
      return '-';
    },
    // getUserNameById는 approvers에만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvers]
  );

  const displayedExpenses = useMemo(() => {
    const rows = [...filteredExpenses];
    const dir = listSortDir === 'asc' ? 1 : -1;
    const compareText = (left: string, right: string) =>
      left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    rows.sort((a, b) => {
      if (!listSortKey) {
        if (listTab === 'received') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        const byStatus =
          (STATUS_SORT_ORDER[resolveDisplayStatus(a)] ?? 99) -
          (STATUS_SORT_ORDER[resolveDisplayStatus(b)] ?? 99);
        if (byStatus !== 0) return byStatus;
        const byPriority =
          (PRIORITY_SORT_ORDER[a.priority] ?? 9) - (PRIORITY_SORT_ORDER[b.priority] ?? 9);
        if (byPriority !== 0) return byPriority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      switch (listSortKey) {
        case 'createdAt':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        case 'title':
          return compareText(a.title || '', b.title || '');
        case 'person':
          return compareText(
            listTab === 'written' ? getExpenseApproverName(a) : a.requesterName || '',
            listTab === 'written' ? getExpenseApproverName(b) : b.requesterName || ''
          );
        case 'amount':
          return (getExpenseGrandTotal(a) - getExpenseGrandTotal(b)) * dir;
        case 'status':
          return (
            ((STATUS_SORT_ORDER[resolveDisplayStatus(a)] ?? 99) -
              (STATUS_SORT_ORDER[resolveDisplayStatus(b)] ?? 99)) * dir
          );
        case 'priority':
          return ((PRIORITY_SORT_ORDER[a.priority] ?? 9) - (PRIORITY_SORT_ORDER[b.priority] ?? 9)) * dir;
        default:
          return 0;
      }
    });
    return rows;
  }, [filteredExpenses, listSortKey, listSortDir, listTab, getExpenseApproverName, getExpenseGrandTotal, resolveDisplayStatus]);

  const selectableApprovers = useMemo(() => {
    const requesterId = viewMode === 'create' ? user?.id : selectedExpense?.requesterId ?? user?.id;
    return approvers.filter((item) => {
      if (isSameUserId(item.id, user?.id)) return false;
      if (requesterId != null && isSameUserId(item.id, requesterId)) return false;
      return true;
    });
  }, [approvers, user?.id, viewMode, selectedExpense?.requesterId]);

  const handleChangeApprover = async (next: { id: number; name: string } | null) => {
    if (!selectedExpense || !next?.id || !canChangeExpenseApprover(selectedExpense)) return;
    if (isSameUserId(next.id, user?.id)) {
      setError(t('expenseApproval.errors.cannotSelectSelf'));
      return;
    }
    if (isSameUserId(next.id, selectedExpense.requesterId)) {
      setError(t('expenseApproval.errors.cannotSelectRequester'));
      return;
    }
    const currentId = selectedExpense.itemMeta?.approvedById ?? selectedExpense.currentApproverId;
    if (isSameUserId(next.id, currentId)) return;

    setApproverSaving(true);
    try {
      const response = await accountingService.changeExpenseApprover(selectedExpense.id, next.id);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.changeApproverFailed'));
      }
      const mapped = mapExpense(response.data);
      setSelectedExpense(mapped);
      setExpenses((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
      setSuccess(t('expenseApproval.success.approverChanged'));
    } catch (changeError: any) {
      setError(
        changeError?.response?.data?.message ||
          changeError?.message ||
          t('expenseApproval.errors.changeApproverFailed')
      );
    } finally {
      setApproverSaving(false);
    }
  };

  const handleDownloadExpensePdf = async () => {
    const root = expensePdfRef.current;
    if (!root || !selectedExpense) {
      setError(t('expenseApproval.errors.pdfTargetMissing'));
      return;
    }
    setPdfDownloading(true);
    try {
      const meta = selectedExpense.itemMeta || {};
      const filename = buildExpenseApprovalPdfFilename({
        companyName:
          companyName ||
          selectedExpense.companyName ||
          selectedExpense.itemMeta?.department ||
          '',
        detail: selectedExpense.title || meta.voucherNo || selectedExpense.expenseId,
        voucherNo: meta.voucherNo || selectedExpense.expenseId,
        title: selectedExpense.title,
      });
      await downloadExpenseApprovalPdf(root, filename);
      setSuccess(t('expenseApproval.success.pdfDownloaded'));
    } catch (pdfError: any) {
      setError(pdfError?.message || t('expenseApproval.errors.pdfDownloadFailed'));
    } finally {
      setPdfDownloading(false);
    }
  };

  const handlePrintExpense = () => {
    if (!expensePdfRef.current || !selectedExpense) {
      setError(t('expenseApproval.errors.pdfTargetMissing'));
      return;
    }
    window.print();
    setSuccess(t('expenseApproval.success.printed'));
  };

  const dateLocale = useMemo(() => (i18n.language?.startsWith('ko') ? 'ko-KR' : 'en-US'), [i18n.language]);
  const formLangAttr = i18n.language?.startsWith('ko') ? 'ko' : 'en';

  const formatRemittanceDateTime = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString(dateLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const softFieldSx = useMemo(
    () => ({
      ...mvsSearchFieldSx,
      ...mvsFilterFieldHeightSx,
      '& .MuiOutlinedInput-root': {
        borderRadius: '4px',
        bgcolor: '#FFFFFF',
        '& fieldset': { borderColor: '#CBD5E1' },
        '&:hover fieldset': { borderColor: '#94A3B8' },
      },
    }),
    []
  );

  const lineItemFieldSx = {
    ...softFieldSx,
    '& .MuiOutlinedInput-root': {
      height: 30,
      borderRadius: '4px',
      bgcolor: '#FFFFFF',
      '& fieldset': { borderColor: '#CBD5E1' },
      '&:hover fieldset': { borderColor: '#94A3B8' },
      '& .MuiOutlinedInput-input': { py: 0.25, fontSize: '0.8125rem' },
    },
  } as const;

  const lineItemCellSx = {
    py: 0.35,
    px: 0.75,
    borderBottom: `1px solid ${EXPENSE_LINE}`,
  } as const;

  const sectionShellSx = {
    mb: 0,
  } as const;

  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + getExpenseGrandTotal(expense), 0);
  const approvedAmount = expenses
    .filter(expense => expense.status === 'approved' || expense.status === 'paid')
    .reduce((sum, expense) => sum + getExpenseGrandTotal(expense), 0);
  const pendingAmount = expenses
    .filter(expense => expense.status === 'submitted' || expense.status === 'in_review')
    .reduce((sum, expense) => sum + getExpenseGrandTotal(expense), 0);
  const urgentCount = expenses.filter(expense => expense.priority === 'urgent').length;

  const paginatedExpenses = displayedExpenses.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
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
    gap: 1.5 } as const;

  const attachmentPreviewDialog = (
    <Dialog
      open={Boolean(previewAttachment)}
      onClose={closeAttachmentPreview}
      maxWidth="lg"
      fullWidth
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        {previewAttachment ? getReceiptDisplayName(previewAttachment) : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: '#F1F5F9', minHeight: { xs: 320, sm: 480 } }}>
        {previewAttachment && isImageReceipt(previewAttachment) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <AuthMedia
              src={previewAttachment}
              alt={getReceiptDisplayName(previewAttachment)}
              sx={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
            />
          </Box>
        ) : previewLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 360 }}>
            <CircularProgress size={32} />
          </Box>
        ) : previewAttachment && isPdfReceipt(previewAttachment) && previewBlobUrl ? (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: '60vh', sm: '75vh' },
              bgcolor: '#fff',
            }}
          >
            <Box
              component="iframe"
              title={getReceiptDisplayName(previewAttachment)}
              src={`${previewBlobUrl}#toolbar=1&navpanes=0`}
              sx={{
                display: 'block',
                width: '100%',
                height: '100%',
                border: 0,
                bgcolor: '#fff',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              minHeight: 280,
              px: 2,
              textAlign: 'center',
            }}
          >
            <FileIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {previewLoadError
                ? t('expenseApproval.errors.attachmentPreviewFailed', {
                    defaultValue: '미리보기를 불러오지 못했습니다. 다운로드하거나 새 탭에서 열어 주세요.',
                  })
                : t('expenseApproval.detail.attachmentPreviewUnavailable', {
                    defaultValue: '이 파일 형식은 미리보기를 지원하지 않습니다. 다운로드하거나 새 탭에서 열어 주세요.',
                  })}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        {previewAttachment ? (
          <>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={() => {
                void downloadUploadFile(previewAttachment, getReceiptDisplayName(previewAttachment));
              }}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('common.download')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon fontSize="small" />}
              onClick={() => {
                const url = previewBlobUrl || getUploadUrl(previewAttachment);
                if (url) window.open(url, '_blank', 'noopener,noreferrer');
              }}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('common.openInNew')}
            </Button>
          </>
        ) : null}
        <Button onClick={closeAttachmentPreview} sx={mvsBodyOutlinedBtnSx}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const statusSnackbars = (
    <>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </>
  );

  if (viewMode === 'create' || viewMode === 'edit') {
    const isEdit = viewMode === 'edit';
    return (
      <Box sx={{ ...mvsPageRootSx }}>
        <MvsPageHeader
          title={isEdit ? t('expenseApproval.form.editTitle') : t('expenseApproval.form.createTitle')}
          mb={2}
          actions={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {headerStatusBanner === 'draftCreated' && (
                <Typography variant="body2" color="text.secondary">
                  {t('expenseApproval.success.draftCreated')}
                </Typography>
              )}
              {headerStatusBanner === 'autoSaved' && (
                <Typography variant="body2" color="text.secondary">
                  {t('expenseApproval.voucher.autoSaveSaved')}
                </Typography>
              )}
              {headerStatusBanner === 'autoSaveFailed' && (
                <Typography variant="body2" color="error">
                  {t('expenseApproval.voucher.autoSaveFailed')}
                </Typography>
              )}
              <Button variant="outlined" onClick={() => setViewMode('list')} sx={mvsBodyOutlinedBtnSx}>
                {t('expenseApproval.actions.backToList')}
              </Button>
            </Box>
          }
        />

        <Card elevation={0} component="section" lang={formLangAttr} sx={{ ...mvsBodyCardSx, mb: 3, maxWidth: '100%' }}>
            {saving && <LinearProgress sx={{ borderRadius: 0 }} />}

            <Box sx={{ borderBottom: `1px solid ${EXPENSE_LINE}`, bgcolor: '#FFFFFF' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                  gap: { xs: 1, md: 1.5 },
                  alignItems: 'stretch',
                  px: { xs: 1.5, sm: 2 },
                  pt: 2,
                  pb: 1.25,
                }}
              >
                <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        color: '#0F172A',
                        mb: companyLogo || companyName ? 0.5 : 0,
                      }}
                    >
                      {isEdit ? t('expenseApproval.form.editTitle') : t('expenseApproval.form.createTitle')}
                    </Typography>
                    <ExpenseCompanyBlock
                      logo={companyLogo}
                      logoAlt={t('expenseApproval.voucher.companyLogoAlt')}
                      name={companyName}
                      address={companyAddress}
                      gstNumber={companyGstNumber}
                    />
                  </Box>
                  <ExpenseVoucherMetaTable
                    voucherLabel={t('expenseApproval.voucher.labelVoucherNumber')}
                    dateLabel={t('expenseApproval.voucher.labelDateCreated')}
                    voucherNo={voucherData.voucherNo || t('expenseApproval.voucher.autoGenerated')}
                    dateText={
                      formData.dueDate
                        ? new Date(`${formData.dueDate}T00:00:00`).toLocaleDateString(dateLocale)
                        : new Date().toLocaleDateString(dateLocale)
                    }
                  />
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 1,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ width: 147, border: `1px solid ${EXPENSE_STAMP_LINE}`, bgcolor: '#FFFFFF', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        px: 0.5,
                        py: 0.35,
                        textAlign: 'center',
                        bgcolor: EXPENSE_STAMP_HEADER_BG,
                        borderBottom: `1px solid ${EXPENSE_STAMP_LINE}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem', color: EXPENSE_STAMP_LABEL }}>
                        {t('expenseApproval.voucher.prepared')}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        minHeight: 68,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                        py: 0.5,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', textAlign: 'center', color: EXPENSE_STAMP_LABEL }}>
                        {user?.username || '-'}
                      </Typography>
                    </Box>
                  </Box>

                  <ArrowForwardIcon sx={{ color: '#94A3B8', fontSize: 20, flexShrink: 0 }} />

                  <Box sx={{ width: 222, border: `1px solid ${EXPENSE_STAMP_LINE}`, bgcolor: '#FFFFFF', overflow: 'hidden' }}>
                    <Box
                      sx={{
                        px: 0.5,
                        py: 0.35,
                        textAlign: 'center',
                        bgcolor: EXPENSE_STAMP_HEADER_BG,
                        borderBottom: `1px solid ${EXPENSE_STAMP_LINE}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem', color: EXPENSE_STAMP_LABEL }}>
                        {t('expenseApproval.voucher.approved')}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        minHeight: 68,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                        py: 0.5,
                      }}
                    >
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={selectableApprovers}
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                        value={
                          selectableApprovers.find((item) => String(item.id) === String(voucherData.approvedById))
                          || approvers.find((item) => String(item.id) === String(voucherData.approvedById))
                          || null
                        }
                        onChange={(_, value) => {
                          if (value && isSameUserId(value.id, user?.id)) {
                            setError(t('expenseApproval.errors.cannotSelectSelf'));
                            return;
                          }
                          setVoucherData({ ...voucherData, approvedById: value ? String(value.id) : '' });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={t('expenseApproval.placeholders.searchSimple')}
                            variant="standard"
                            size="small"
                            InputProps={{
                              ...params.InputProps,
                              disableUnderline: true,
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                justifyContent: 'center',
                              },
                              '& .MuiInputBase-input': { textAlign: 'center', py: 0.25 },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>

            <CardContent sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25, bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {/* 지출 신청 */}
            <Box
              sx={{
                ...sectionBlockSx,
                borderLeft: `3px solid ${EXPENSE_REQUEST_ACCENT}`,
                bgcolor: EXPENSE_REQUEST_BG,
              }}
            >
              <Box sx={{ ...sectionHeaderBarSx, bgcolor: EXPENSE_MUTED_BG }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: EXPENSE_REQUEST_ACCENT }}>
                  {t('expenseApproval.voucher.sectionRequest')}
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small" sx={compactTableSx}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.columns.requester')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{user?.username || '-'}</TableCell>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.departmentRole')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {[user?.department, user?.position]
                          .filter((v) => v && String(v).trim() && String(v).trim() !== '-')
                          .join(' / ') || '-'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                  <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                    <TextField
                      label={t('expenseApproval.voucher.labelTitle')}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      fullWidth
                      size="small"
                      sx={softFieldSx}
                    />
                  </Box>
                  <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                    <TextField
                      label={t('expenseApproval.voucher.labelPurpose')}
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      required
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      sx={softFieldSx}
                    />
                  </Box>
                  <FormControl fullWidth size="small" sx={softFieldSx}>
                    <InputLabel>{t('expenseApproval.filters.priority')}</InputLabel>
                    <Select
                      label={t('expenseApproval.filters.priority')}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                    >
                      <MenuItem value="low">{t('expenseApproval.priority.low')}</MenuItem>
                      <MenuItem value="medium">{t('expenseApproval.priority.medium')}</MenuItem>
                      <MenuItem value="high">{t('expenseApproval.priority.high')}</MenuItem>
                      <MenuItem value="urgent">{t('expenseApproval.priority.urgent')}</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label={t('expenseApproval.voucher.labelDateCreated')}
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    size="small"
                    inputProps={{ lang: formLangAttr }}
                    sx={softFieldSx}
                  />
                </Box>
              </Box>
            </Box>

            {/* 대금을 받는 협력업체 */}
            <Box
              sx={{
                ...sectionBlockSx,
                border: `1px solid ${EXPENSE_VENDOR_LINE}`,
                borderLeft: `3px solid ${EXPENSE_VENDOR_ACCENT}`,
                bgcolor: EXPENSE_VENDOR_BG,
              }}
            >
              <Box sx={{ ...sectionHeaderBarSx, bgcolor: EXPENSE_VENDOR_HEADER, borderBottomColor: EXPENSE_VENDOR_LINE }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: EXPENSE_VENDOR_ACCENT }}>
                  {t('expenseApproval.voucher.sectionVendor')}
                </Typography>
              </Box>
              <Box sx={{ p: 1.25 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, display: 'block', mb: 0.75, color: EXPENSE_VENDOR_SUB }}
              >
                {t('expenseApproval.voucher.vendorGroupDoc')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1, mb: 1.25 }}>
                <Autocomplete
                  sx={softFieldSx}
                  fullWidth
                  options={partners}
                  filterOptions={filterPartnerOptions}
                  getOptionLabel={(option) => option.company_name || ''}
                  isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                  autoHighlight
                  clearOnBlur={false}
                  selectOnFocus
                  handleHomeEndKeys
                  noOptionsText={t('partners.empty.noResults')}
                  value={partners.find((item) => String(item.id) === String(voucherData.partnerId)) || null}
                  inputValue={partnerInputValue}
                  onInputChange={(_, newInput) => setPartnerInputValue(newInput)}
                  onChange={(_, value) => {
                    if (!value) {
                      setPartnerInputValue('');
                      setVoucherData({
                        ...voucherData,
                        partnerId: '',
                        department: '',
                        gstNumber: '',
                        partnerRepresentative: '',
                        partnerAddress: '',
                        partnerPhone: '',
                        partnerEmail: '',
                        partnerPan: '',
                        bank: '',
                        accountNumber: '',
                        ifsc: '',
                        acHolder: '',
                        igstRate: 0,
                        cgstRate: 0,
                        sgstRate: 0,
                      });
                      return;
                    }
                    setPartnerInputValue(value.company_name || '');
                    const gstNumber = pickPartnerGstNumber(value);
                    setVoucherData({
                      ...voucherData,
                      partnerId: String(value.id),
                      department: value.company_name || '',
                      gstNumber,
                      partnerRepresentative: value.representative || '',
                      partnerAddress: value.address || '',
                      partnerPhone: value.phone || '',
                      partnerEmail: value.email || '',
                      partnerPan: value.pan_number || '',
                      bank: value.bank_name || '',
                      accountNumber: value.account_number || '',
                      ifsc: value.bank_ifsc || '',
                      acHolder: value.account_holder || value.representative || value.company_name || '',
                      ...resolveGstRatesFromGstin(gstNumber, companyGstNumber, companyGstState),
                    });
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <Box sx={{ minWidth: 0, py: 0.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {option.company_name}
                        </Typography>
                        {(option.account_holder || option.bank_name || option.address) && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {[option.account_holder, option.bank_name, option.address].filter(Boolean).join(' · ')}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('expenseApproval.voucher.labelPartner')}
                      placeholder={t('expenseApproval.placeholders.searchCompany')}
                      size="small"
                    />
                  )}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelVoucherNumber')}
                  value={voucherData.voucherNo}
                  placeholder={t('expenseApproval.voucher.autoGenerated')}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true }}
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelGstNumber')}
                  value={voucherData.gstNumber}
                  onChange={(e) => {
                    const gstNumber = e.target.value;
                    setVoucherData({
                      ...voucherData,
                      gstNumber,
                      ...resolveGstRatesFromGstin(gstNumber, companyGstNumber, companyGstState),
                    });
                  }}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelVoucherDate')}
                  type="date"
                  value={voucherData.voucherDate}
                  onChange={(e) => setVoucherData({ ...voucherData, voucherDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                  inputProps={{ lang: formLangAttr }}
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelRepresentative')}
                  value={voucherData.partnerRepresentative}
                  onChange={(e) => setVoucherData({ ...voucherData, partnerRepresentative: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelPanNumber')}
                  value={voucherData.partnerPan}
                  onChange={(e) => setVoucherData({ ...voucherData, partnerPan: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelPartnerPhone')}
                  value={voucherData.partnerPhone}
                  onChange={(e) => setVoucherData({ ...voucherData, partnerPhone: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelPartnerEmail')}
                  value={voucherData.partnerEmail}
                  onChange={(e) => setVoucherData({ ...voucherData, partnerEmail: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, display: 'block', mb: 0.75, color: EXPENSE_VENDOR_SUB }}
              >
                {t('expenseApproval.voucher.vendorGroupPayout')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                <TextField
                  label={t('expenseApproval.voucher.labelAccountHolder')}
                  value={voucherData.acHolder}
                  onChange={(e) => setVoucherData({ ...voucherData, acHolder: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelBankName')}
                  value={voucherData.bank}
                  onChange={(e) => setVoucherData({ ...voucherData, bank: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelAccountNumber')}
                  value={voucherData.accountNumber}
                  onChange={(e) => setVoucherData({ ...voucherData, accountNumber: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelIfsc')}
                  value={voucherData.ifsc}
                  onChange={(e) => setVoucherData({ ...voucherData, ifsc: e.target.value })}
                  fullWidth
                  size="small"
                  sx={softFieldSx}
                />
                <TextField
                  label={t('expenseApproval.voucher.labelPartnerAddress')}
                  value={voucherData.partnerAddress}
                  onChange={(e) => setVoucherData({ ...voucherData, partnerAddress: e.target.value })}
                  fullWidth
                  size="small"
                  sx={{ ...softFieldSx, gridColumn: { md: '1 / -1' } }}
                />
              </Box>
              </Box>
            </Box>

            <Box sx={sectionShellSx}>
              <Typography variant="subtitle2" sx={sectionTitleSx}>
                {t('expenseApproval.voucher.sectionItems')}
              </Typography>
              <TableContainer
                sx={{
                  mb: 1,
                  borderRadius: '4px',
                  border: `1px solid ${EXPENSE_LINE}`,
                  overflow: 'hidden',
                }}
              >
              <Table size="small">
                <TableHead
                  sx={{
                    bgcolor: EXPENSE_HEADER_BG,
                    '& .MuiTableCell-head': {
                      bgcolor: EXPENSE_HEADER_BG,
                      color: EXPENSE_HEADER_FG,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      letterSpacing: '0.02em',
                      textTransform: 'none',
                      borderBottom: `1px solid ${EXPENSE_LINE}`,
                      borderTop: '2px solid #94A3B8',
                      py: 0.55,
                      px: 0.75,
                    } }}
                >
                  <TableRow>
                    <TableCell sx={{ width: 40 }}>{t('expenseApproval.voucher.tableNo')}</TableCell>
                    <TableCell sx={{ width: 140 }}>{t('expenseApproval.voucher.tableInvoiceDate')}</TableCell>
                    <TableCell>{t('expenseApproval.voucher.tableDescription')}</TableCell>
                    <TableCell align="right" sx={{ width: 72 }}>{t('expenseApproval.voucher.tableQty')}</TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>{t('expenseApproval.voucher.tableUnitPrice')}</TableCell>
                    <TableCell align="right" sx={{ width: 110 }}>{t('expenseApproval.voucher.tableTotal')}</TableCell>
                    <TableCell sx={{ width: 40 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell sx={lineItemCellSx}>{index + 1}</TableCell>
                      <TableCell sx={{ ...lineItemCellSx, width: 140 }}>
                        <TextField
                          type="date"
                          value={item.invoiceDate}
                          onChange={(e) => handleUpdateLineItem(item.id, 'invoiceDate', e.target.value)}
                          onKeyDown={handleLineItemKeyDown(item.id, 'invoiceDate', index)}
                          size="small"
                          fullWidth
                          inputProps={{ lang: formLangAttr }}
                          inputRef={setInputRef(item.id, 'invoiceDate')}
                          sx={lineItemFieldSx}
                        />
                      </TableCell>
                      <TableCell sx={lineItemCellSx}>
                        <TextField
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                          onKeyDown={handleLineItemKeyDown(item.id, 'description', index)}
                          size="small"
                          fullWidth
                          placeholder={t('expenseApproval.voucher.placeholderDescription')}
                          inputRef={setInputRef(item.id, 'description')}
                          sx={lineItemFieldSx}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ ...lineItemCellSx, width: 72, maxWidth: 72 }}>
                        <TextField
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdateLineItem(item.id, 'qty', Number(e.target.value || 0))}
                          onKeyDown={handleLineItemKeyDown(item.id, 'qty', index)}
                          size="small"
                          inputProps={{ min: 0 }}
                          inputRef={setInputRef(item.id, 'qty')}
                          sx={{
                            ...lineItemFieldSx,
                            width: 64,
                            maxWidth: 64,
                            '& input': { textAlign: 'right', px: 0.75 },
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ ...lineItemCellSx, width: 120 }}>
                        <TextField
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', Number(e.target.value || 0))}
                          onKeyDown={handleLineItemKeyDown(item.id, 'unitPrice', index)}
                          size="small"
                          inputProps={{ min: 0, step: 1 }}
                          fullWidth
                          placeholder={t('expenseApproval.voucher.placeholderUnitPrice')}
                          inputRef={setInputRef(item.id, 'unitPrice')}
                          sx={lineItemFieldSx}
                        />
                      </TableCell>
                      <TableCell align="right" sx={lineItemCellSx}>{formatAmount(item.total)}</TableCell>
                      <TableCell align="right" sx={lineItemCellSx}>
                        <IconButton size="small" onClick={() => handleRemoveLineItem(item.id)} sx={{ p: 0.25 }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lineItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        {t('expenseApproval.voucher.lineItemsEmpty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </TableContainer>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddLineItem}
                sx={{ mt: 1, textTransform: 'none', borderRadius: '8px' }}
              >
                {t('expenseApproval.voucher.addItem')}
              </Button>
            </Box>

            <Box
              sx={{
                mb: 1,
                width: { xs: '100%', sm: '25%' },
                ml: { xs: 0, sm: 'auto' },
                borderRadius: '4px',
                p: { xs: 1, sm: 1.25 },
                bgcolor: 'background.paper',
                border: `1px solid ${EXPENSE_LINE}`,
              }}
            >
              <Typography variant="subtitle2" sx={sectionTitleSx}>
                {t('expenseApproval.voucher.sectionTax')}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 1,
                  py: 0.5,
                  px: 1,
                  mb: 0.75,
                  borderRadius: '4px',
                  bgcolor: EXPENSE_HEADER_BG }}
              >
                <Typography variant="body2" sx={{ color: EXPENSE_HEADER_FG, fontWeight: 600, fontSize: '0.8125rem' }}>
                  {t('expenseApproval.voucher.taxSubtotal')}
                </Typography>
                <Typography variant="body2" sx={{ color: EXPENSE_HEADER_FG, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {formatAmount(subtotalAmount)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: 'minmax(88px,auto) 88px 1fr',
                  gap: 1,
                  alignItems: 'center',
                  py: 0.25,
                  borderBottom: `1px solid ${EXPENSE_LINE}`,
                  mb: 0.25 }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.06em' }}>
                  {t('expenseApproval.voucher.taxColItem')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.06em', textAlign: 'center' }}>
                  {t('expenseApproval.voucher.taxColRate')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.06em', textAlign: 'right' }}>
                  {t('expenseApproval.voucher.taxColAmount')}
                </Typography>
              </Box>

              {([
                { key: 'igst', label: 'IGST (B)', rate: voucherData.igstRate, setRate: (v: number) => setVoucherData({ ...voucherData, igstRate: v }), amount: igstAmount },
                { key: 'cgst', label: 'CGST (C)', rate: voucherData.cgstRate, setRate: (v: number) => setVoucherData({ ...voucherData, cgstRate: v }), amount: cgstAmount },
                { key: 'sgst', label: 'SGST (D)', rate: voucherData.sgstRate, setRate: (v: number) => setVoucherData({ ...voucherData, sgstRate: v }), amount: sgstAmount },
              ] as const).map((row) => (
                <Box
                  key={row.key}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(88px,auto) 88px 1fr' },
                    gap: { xs: 0.75, sm: 1 },
                    alignItems: 'center',
                    py: 0.35,
                    borderBottom: `1px solid ${EXPENSE_LINE}`,
                    '&:last-of-type': { borderBottom: 'none', pb: 0 } }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                    {row.label}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={row.rate}
                    onChange={(e) => row.setRate(Number(e.target.value || 0))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      maxWidth: { xs: 120, sm: 'none' },
                      gridColumn: { xs: '1', sm: 'auto' },
                      '& .MuiOutlinedInput-root': {
                        height: 32,
                        borderRadius: '4px',
                        bgcolor: '#FFFFFF',
                        '& fieldset': { borderColor: '#CBD5E1' },
                        '& .MuiOutlinedInput-input': { py: 0.4, fontSize: '0.8125rem' },
                      } }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      textAlign: { xs: 'right', sm: 'right' },
                      fontVariantNumeric: 'tabular-nums',
                      color: 'text.secondary',
                      fontWeight: 500,
                      fontSize: '0.8125rem' }}
                  >
                    {formatAmount(row.amount)}
                  </Typography>
                </Box>
              ))}

              <Box sx={{ mt: 0.75, pt: 0.5, borderTop: `1px solid ${EXPENSE_LINE}` }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={voucherData.tdsEnabled}
                      onChange={(e) => setVoucherData({ ...voucherData, tdsEnabled: e.target.checked })}
                      size="small"
                      sx={{ py: 0 }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>{t('expenseApproval.voucher.tdsApply')}</Typography>}
                  sx={{ ml: -0.5, mb: 0, minHeight: 28 }}
                />
                <Collapse in={voucherData.tdsEnabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 0.5 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(88px,auto) 88px 1fr' },
                        gap: 1,
                        alignItems: 'center' }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                        TDS (E)
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={voucherData.tdsRate}
                        onChange={(e) => setVoucherData({ ...voucherData, tdsRate: Number(e.target.value || 0) })}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          maxWidth: { xs: 120, sm: 'none' },
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                            '& fieldset': { borderColor: (theme) => alpha(theme.palette.text.primary, 0.08) } } }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'text.secondary',
                          fontWeight: 500 }}
                      >
                        −{formatAmount(tdsAmount)}
                      </Typography>
                    </Box>
                  </Box>
                </Collapse>
              </Box>

              <Box
                sx={{
                  mt: 0.75,
                  pt: 0.6,
                  px: 1,
                  pb: 0.6,
                  borderRadius: '4px',
                  bgcolor: EXPENSE_TOTAL_BG,
                  border: `1px solid ${EXPENSE_TOTAL_LINE}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 0.5 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: EXPENSE_TOTAL_FG }}>
                  {t('expenseApproval.voucher.grandTotal')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: EXPENSE_TOTAL_FG }}>
                  {formatAmount(totalAmount)}
                </Typography>
              </Box>
            </Box>

            <TextField
              label={
                currentAttachments.length
                  ? t('expenseApproval.voucher.remarksIfAny')
                  : t('expenseApproval.voucher.remarksRequired')
              }
              value={voucherData.remarks}
              onChange={(e) => setVoucherData({ ...voucherData, remarks: e.target.value })}
              fullWidth
              multiline
              minRows={3}
              required={!currentAttachments.length}
              helperText={
                currentAttachments.length
                  ? undefined
                  : t('expenseApproval.voucher.remarksRequiredHint')
              }
              sx={{ mt: 2, ...softFieldSx }}
            />

            <Divider sx={{ my: 1.5, borderColor: alpha(theme.palette.text.primary, 0.08) }} />

            <Box sx={sectionShellSx}>
              <Typography variant="subtitle2" sx={sectionTitleSx}>
                {t('expenseApproval.voucher.sectionReceipts')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Button variant="outlined" startIcon={<QrCodeIcon />} onClick={handleOpenQr} disabled={qrLoading} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                  {qrLoading ? t('expenseApproval.voucher.receiptQrLoading') : t('expenseApproval.voucher.receiptQr')}
                </Button>
                <Button variant="outlined" component="label" disabled={uploadingReceipts} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                  {uploadingReceipts ? t('expenseApproval.voucher.receiptUploading') : t('expenseApproval.voucher.receiptUpload')}
                  <input
                    hidden
                    multiple
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleUploadReceipts(e.target.files)}
                  />
                </Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadExpenseData} sx={{ textTransform: 'none', borderRadius: '8px' }}>
                  {t('expenseApproval.voucher.refresh')}
                </Button>
              </Box>
              {currentAttachments.length ? (
                renderAttachmentList(currentAttachments)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('expenseApproval.voucher.receiptNone')}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
              <Button variant="outlined" onClick={() => setViewMode('list')} sx={mvsBodyOutlinedBtnSx}>
                {t('common.cancel')}
              </Button>
              <Button variant="contained" disableElevation onClick={handleSaveExpense} disabled={saving || isInitializingDraft} sx={mvsBodyPrimaryBtnSx}>
                {saving ? t('expenseApproval.voucher.submitSaving') : (isEdit ? t('expenseApproval.voucher.submit') : t('expenseApproval.voucher.create'))}
              </Button>
            </Box>
            </Box>
            </CardContent>
        </Card>

        <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('expenseApproval.dialog.uploadByPhoneTitle')}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('expenseApproval.voucher.qrDialogHint')}
            </Typography>
            {qrImage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <img
                  src={qrImage}
                  alt="receipt-upload-qr"
                />
              </Box>
            )}
            {!qrImage && !qrImageError && (
              <Typography variant="body2" color="text.secondary">
                {t('expenseApproval.voucher.qrGenerating')}
              </Typography>
            )}
            {qrImageError && (
              <Typography variant="body2" color="error">
                {qrImageError}
              </Typography>
            )}
            {qrUrl && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, wordBreak: 'break-all' }}>
                {qrUrl}
              </Typography>
            )}
            {currentAttachments.length > 0 && (
              <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  {t('expenseApproval.detail.attachments')} ({currentAttachments.length})
                </Typography>
                {renderAttachmentList(currentAttachments)}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrOpen(false)} sx={mvsBodyOutlinedBtnSx}>{t('common.close')}</Button>
          </DialogActions>
        </Dialog>
        {attachmentPreviewDialog}
        {statusSnackbars}
      </Box>
    );
  }

  if (viewMode === 'view' && selectedExpense) {
    const meta = selectedExpense.itemMeta || {};
    const approvedById = meta.approvedById ? Number(meta.approvedById) : null;
    const approvedByName =
      (approvedById != null && getUserNameById(approvedById) !== '-')
        ? getUserNameById(approvedById)
        : selectedExpense.currentApproverName || '-';
    const linkedPartner = partners.find((p) => String(p.id) === String(meta.partnerId || ''));
    const partnerName =
      meta.department ||
      linkedPartner?.company_name ||
      '-';
    const partnerDetail = {
      gstNumber: meta.gstNumber || pickPartnerGstNumber(linkedPartner || ({} as PartnerOption)) || '-',
      partnerRepresentative: meta.partnerRepresentative || linkedPartner?.representative || '-',
      partnerPan: meta.partnerPan || linkedPartner?.pan_number || '-',
      partnerPhone: meta.partnerPhone || linkedPartner?.phone || '-',
      partnerEmail: meta.partnerEmail || linkedPartner?.email || '-',
      partnerAddress: meta.partnerAddress || linkedPartner?.address || '-',
      acHolder: meta.acHolder || linkedPartner?.account_holder || '-',
      bank: meta.bank || linkedPartner?.bank_name || '-',
      accountNumber: meta.accountNumber || linkedPartner?.account_number || '-',
      ifsc: meta.ifsc || linkedPartner?.bank_ifsc || '-',
    };
    const voucherNo = meta.voucherNo || selectedExpense.expenseId || '-';
    const voucherDate = meta.voucherDate || selectedExpense.dueDate || selectedExpense.createdAt || '';
    const isRequester = isSameUserId(user?.id, selectedExpense.requesterId);
    const isFinalApprover = isDesignatedApprover(selectedExpense);
    const isPaymentOfficer = hasTransferAccess;
    const isPaymentRequested = selectedExpense.paymentRequestStatus === 'requested';
    const isPaymentApproved = selectedExpense.paymentRequestStatus === 'approved';
    const isPaymentPaid = selectedExpense.paymentRequestStatus === 'paid';
    const canApproveThis = listTab !== 'transfer' && canUserApproveExpense(selectedExpense);
    const canEditThis = canEditExpense(selectedExpense);
    const canResubmitThis = canResubmitExpense(selectedExpense);
    const canChangeApproverThis = listTab !== 'transfer' && canChangeExpenseApprover(selectedExpense);
    const isExpenseApproved = selectedExpense.status === 'approved' || selectedExpense.status === 'paid';
    const taxSummary = calcExpenseTax(
      selectedExpense.items,
      meta,
      companyGstNumber,
      companyGstState
    );
    const remittanceEntries = getExpenseRemittanceEntries(selectedExpense);
    const approvalFlowNodes = (() => {
      const steps = [...(selectedExpense.approvalFlow || [])].sort(
        (a, b) => (a.stepOrder || 0) - (b.stepOrder || 0)
      );
      const nodes: Array<{ key: string; label: string; name: string; muted?: boolean; editable?: boolean }> = [
        {
          key: 'prepared',
          label: t('expenseApproval.voucher.prepared'),
          name: selectedExpense.requesterName || '-',
        },
      ];
      if (steps.length === 0) {
        nodes.push({
          key: 'approve',
          label: t('expenseApproval.voucher.approved'),
          name: approvedByName,
          editable: true,
        });
      } else {
        const lastIndex = steps.length - 1;
        steps.forEach((step, index) => {
          nodes.push({
            key: String(step.id || `${step.approverId}-${step.stepOrder}-${index}`),
            label: getExpenseFlowStampLabel(step, (key) => t(key)),
            name: step.approverName || getUserNameById(step.approverId),
            muted: step.status === 'skipped',
            editable:
              isSameUserId(step.approverId, approvedById) ||
              (approvedById == null && index === lastIndex),
          });
        });
      }
      return nodes;
    })();

    return (
      <Box sx={{ ...mvsPageRootSx }}>
        <Box className="expense-no-print">
        <MvsPageHeader
          title={t('expenseApproval.detail.title')}
          actions={
            <>
            <Button
              variant="outlined"
              onClick={() => setViewMode('list')}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('expenseApproval.actions.backToList')}
            </Button>
            {canApproveThis && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  disableElevation
                  startIcon={<CheckCircleIcon fontSize="small" />}
                  onClick={() => handleApproveExpense(selectedExpense.id)}
                  sx={mvsBodyPrimaryBtnSx}
                >
                  {t('expenseApproval.actions.accept')}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  disableElevation
                  startIcon={<CancelIcon fontSize="small" />}
                  onClick={() => openReasonDialog('expense-reject', selectedExpense.id)}
                >
                  {t('expenseApproval.actions.reject')}
                </Button>
              </>
            )}
            {canEditThis && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => handleEditExpense(selectedExpense)}
              sx={mvsBodyPrimaryBtnSx}
            >
              {t('expenseApproval.actions.editDetail')}
            </Button>
            )}
            {canResubmitThis && (
            <Button
              variant="contained"
              disableElevation
              startIcon={<SendIcon fontSize="small" />}
              onClick={() => handleResubmitExpense(selectedExpense.id)}
              sx={mvsBodyPrimaryBtnSx}
            >
              {t('expenseApproval.actions.resubmit')}
            </Button>
            )}
            </>
          }
        />
        </Box>

        <Card
          elevation={0}
          ref={expensePdfRef}
          className="expense-pdf-root"
          sx={{ ...mvsBodyCardSx, mb: 3 }}
        >
          <Box sx={{ borderBottom: `1px solid ${EXPENSE_LINE}`, bgcolor: '#FFFFFF' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                gap: { xs: 1, md: 1.5 },
                alignItems: 'stretch',
                px: { xs: 1.5, sm: 2 },
                pt: 2,
                pb: 1.25,
              }}
            >
              <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <ExpenseCompanyBlock
                  logo={companyLogo}
                  logoAlt={t('expenseApproval.voucher.companyLogoAlt')}
                  name={companyName}
                  address={companyAddress}
                  gstNumber={companyGstNumber}
                />
                <ExpenseVoucherMetaTable
                  voucherLabel={t('expenseApproval.voucher.labelVoucherNumber')}
                  dateLabel={t('expenseApproval.voucher.labelDateCreated')}
                  voucherNo={voucherNo}
                  dateText={
                    voucherDate
                      ? new Date(String(voucherDate).slice(0, 10) + 'T00:00:00').toLocaleDateString(dateLocale)
                      : '-'
                  }
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 1,
                  width: { xs: '100%', md: 'auto' },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: 'primary.main',
                    fontVariantNumeric: 'tabular-nums',
                    textAlign: 'right',
                  }}
                >
                  {displayExpenseCurrency(selectedExpense.currency)} {formatAmount(taxSummary.grandTotal)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: -0.5, textAlign: 'right' }}>
                  {t('expenseApproval.detail.amountInclTax')}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, approvalFlowNodes.length))}, 168px)`,
                    columnGap: 1,
                    rowGap: 1,
                    width: 'max-content',
                    maxWidth: '100%',
                    ml: 'auto',
                  }}
                >
                  {approvalFlowNodes.map((node, index) => {
                    const isLast = index === approvalFlowNodes.length - 1;
                    const isRowEnd = (index + 1) % 4 === 0;
                    const showArrow = !isLast && !isRowEnd;
                    return (
                      <Box
                        key={node.key}
                        className="expense-flow-stamp-wrap"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          width: 168,
                          height: 72,
                        }}
                      >
                        <ExpenseFlowStamp
                          label={node.label}
                          name={node.name}
                          muted={node.muted}
                          wide={false}
                        >
                          {canChangeApproverThis && node.editable ? (
                            <Autocomplete
                              fullWidth
                              size="small"
                              disabled={approverSaving}
                              options={selectableApprovers}
                              getOptionLabel={(option) => option.name}
                              isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                              value={
                                selectableApprovers.find((item) => isSameUserId(item.id, approvedById))
                                || approvers.find((item) => isSameUserId(item.id, approvedById))
                                || null
                              }
                              onChange={(_, value) => {
                                handleChangeApprover(value);
                              }}
                              sx={{
                                width: '100%',
                                '& .MuiAutocomplete-endAdornment': {
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  right: 0,
                                },
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder={t('expenseApproval.placeholders.searchSimple')}
                                  variant="standard"
                                  size="small"
                                  InputProps={{
                                    ...params.InputProps,
                                    disableUnderline: true,
                                  }}
                                  sx={{
                                    '& .MuiInputBase-root': {
                                      fontSize: '0.8125rem',
                                      fontWeight: 600,
                                      justifyContent: 'center',
                                      minHeight: 32,
                                      height: 32,
                                      alignItems: 'center',
                                    },
                                    '& .MuiInputBase-input': {
                                      textAlign: 'center',
                                      py: 0,
                                      height: 32,
                                      boxSizing: 'border-box',
                                    },
                                  }}
                                />
                              )}
                            />
                          ) : undefined}
                        </ExpenseFlowStamp>
                        <Box
                          sx={{
                            width: 20,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {showArrow ? (
                            <ArrowForwardIcon sx={{ color: '#94A3B8', fontSize: 20 }} />
                          ) : null}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Box>

          <CardContent sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box
              sx={{
                border: `1px solid ${EXPENSE_LINE}`,
                display: 'grid',
                gridTemplateColumns: '88px 1fr',
                minHeight: 52,
                bgcolor: '#FFFFFF',
              }}
            >
              <Box
                sx={{
                  ...voucherMetaLabelSx,
                  display: 'flex',
                  alignItems: 'center',
                  py: 1.25,
                }}
              >
                {t('expenseApproval.voucher.labelTitle')}
              </Box>
              <Box
                sx={{
                  px: 1.25,
                  py: 1.25,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', lineHeight: 1.4 }}>
                  {selectedExpense.title || t('expenseApproval.detail.title')}
                </Typography>
                {getStatusChip(resolveDisplayStatus(selectedExpense))}
                {getPriorityChip(selectedExpense.priority)}
              </Box>
            </Box>

            {/* 지출 신청 */}
            <Box
              sx={{
                ...sectionBlockSx,
                borderLeft: `3px solid ${EXPENSE_REQUEST_ACCENT}`,
                bgcolor: EXPENSE_REQUEST_BG,
              }}
            >
              <Box sx={{ ...sectionHeaderBarSx, bgcolor: EXPENSE_MUTED_BG }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: EXPENSE_REQUEST_ACCENT }}>
                  {t('expenseApproval.voucher.sectionRequest')}
                </Typography>
              </Box>
              <TableContainer sx={{ bgcolor: '#FFFFFF', overflowX: 'hidden' }}>
                <Table size="small" sx={compactTableSx}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.columns.requester')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>{selectedExpense.requesterName || '-'}</ClampText>
                      </TableCell>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.departmentRole')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>
                          {[selectedExpense.requesterDepartment, selectedExpense.requesterPosition]
                            .filter((v) => v && String(v).trim() && String(v).trim() !== '-')
                            .join(' / ') || '-'}
                        </ClampText>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ ...kvLabelCellSx, borderBottom: 'none' }}>
                        {t('expenseApproval.detail.purpose')}
                      </TableCell>
                      <TableCell colSpan={3} sx={{ borderBottom: 'none', fontWeight: 600, ...wrapCellSx }}>
                        <ClampText title={String(selectedExpense.purpose || '')}>
                          {selectedExpense.purpose || '-'}
                        </ClampText>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 대금을 받는 협력업체 */}
            <Box
              sx={{
                ...sectionBlockSx,
                border: `1px solid ${EXPENSE_VENDOR_LINE}`,
                borderLeft: `3px solid ${EXPENSE_VENDOR_ACCENT}`,
                bgcolor: EXPENSE_VENDOR_BG,
              }}
            >
              <Box sx={{ ...sectionHeaderBarSx, bgcolor: EXPENSE_VENDOR_HEADER, borderBottomColor: EXPENSE_VENDOR_LINE }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: EXPENSE_VENDOR_ACCENT }}>
                  {t('expenseApproval.voucher.sectionVendor')}
                </Typography>
              </Box>
              <TableContainer sx={{ bgcolor: '#FFFFFF', overflowX: 'hidden' }}>
                <Table size="small" sx={compactTableSx}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelPartner')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText title={partnerName}>{partnerName}</ClampText>
                      </TableCell>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelGstNumber')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText title={String(partnerDetail.gstNumber || '')}>{partnerDetail.gstNumber}</ClampText>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelRepresentative')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>{partnerDetail.partnerRepresentative}</ClampText>
                      </TableCell>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelPanNumber')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>{partnerDetail.partnerPan}</ClampText>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelPartnerPhone')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>{partnerDetail.partnerPhone}</ClampText>
                      </TableCell>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelPartnerEmail')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText title={String(partnerDetail.partnerEmail || '')}>
                          {partnerDetail.partnerEmail}
                        </ClampText>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelAccountHolder')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText title={String(partnerDetail.acHolder || '')}>{partnerDetail.acHolder}</ClampText>
                      </TableCell>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelBankName')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>{partnerDetail.bank}</ClampText>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelAccountNumber')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>{partnerDetail.accountNumber}</ClampText>
                      </TableCell>
                      <TableCell sx={kvLabelCellSx}>{t('expenseApproval.voucher.labelIfsc')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, ...wrapCellSx }}>
                        <ClampText>{partnerDetail.ifsc}</ClampText>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ ...kvLabelCellSx, borderBottom: 'none' }}>
                        {t('expenseApproval.voucher.labelPartnerAddress')}
                      </TableCell>
                      <TableCell colSpan={3} sx={{ fontWeight: 600, borderBottom: 'none', ...wrapCellSx }}>
                        <ClampText title={String(partnerDetail.partnerAddress || '')}>
                          {partnerDetail.partnerAddress}
                        </ClampText>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 지출 항목 */}
            <Box>
              <Typography variant="subtitle2" sx={sectionTitleSx}>{t('expenseApproval.detail.items')}</Typography>
              <TableContainer sx={{ border: `1px solid ${EXPENSE_LINE}`, overflowX: 'hidden' }}>
                <Table size="small" sx={compactTableSx}>
                  <TableHead
                    sx={{
                      bgcolor: EXPENSE_HEADER_BG,
                      '& .MuiTableCell-head': {
                        bgcolor: EXPENSE_HEADER_BG,
                        color: EXPENSE_HEADER_FG,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        letterSpacing: '0.02em',
                        borderTop: '2px solid #94A3B8',
                        borderBottom: `1px solid ${EXPENSE_LINE}`,
                      },
                    }}
                  >
                    <TableRow>
                      <TableCell sx={{ width: '18%' }}>{t('expenseApproval.detail.columns.invoiceDate')}</TableCell>
                      <TableCell sx={{ width: '42%' }}>{t('expenseApproval.detail.columns.description')}</TableCell>
                      <TableCell align="right" sx={{ width: '10%' }}>{t('expenseApproval.detail.columns.qty')}</TableCell>
                      <TableCell align="right" sx={{ width: '15%' }}>{t('expenseApproval.detail.columns.unitPrice')}</TableCell>
                      <TableCell align="right" sx={{ width: '15%' }}>{t('expenseApproval.detail.columns.amount')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedExpense.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                          {t('expenseApproval.voucher.lineItemsEmpty')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedExpense.items.map((item) => (
                        <TableRow key={item.id || item.description}>
                          <TableCell>{item.invoiceDate || '-'}</TableCell>
                          <TableCell sx={wrapCellSx}>
                            <ClampText title={String(item.description || '')}>{item.description || '-'}</ClampText>
                          </TableCell>
                          <TableCell align="right">{item.qty ?? '-'}</TableCell>
                          <TableCell align="right">{formatAmount(item.unitPrice ?? item.amount ?? 0)}</TableCell>
                          <TableCell align="right">{formatAmount(item.total ?? item.amount ?? 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box sx={{ width: 'fit-content', maxWidth: '100%', ml: { xs: 0, sm: 'auto' } }}>
              <Typography variant="subtitle2" sx={sectionTitleSx}>{t('expenseApproval.voucher.sectionTax')}</Typography>
              <TableContainer sx={{ border: `1px solid ${EXPENSE_LINE}` }}>
                <Table
                  size="small"
                  sx={{
                    ...compactTableSx,
                    tableLayout: 'auto',
                    width: 'max-content',
                    minWidth: '100%',
                    '& .MuiTableCell-root': {
                      ...compactTableSx['& .MuiTableCell-root'],
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      textOverflow: 'clip',
                    },
                  }}
                >
                  <TableBody>
                    <TableRow sx={{ bgcolor: EXPENSE_HEADER_BG }}>
                      <TableCell sx={{ color: EXPENSE_HEADER_FG, fontWeight: 600 }}>
                        {t('expenseApproval.voucher.taxSubtotal')}
                      </TableCell>
                      <TableCell sx={{ width: 48 }} />
                      <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: EXPENSE_HEADER_FG }}>
                        {formatAmount(taxSummary.subtotal)}
                      </TableCell>
                    </TableRow>
                    {([
                      { label: 'IGST (B)', rate: taxSummary.igstRate, amount: taxSummary.igstAmount },
                      { label: 'CGST (C)', rate: taxSummary.cgstRate, amount: taxSummary.cgstAmount },
                      { label: 'SGST (D)', rate: taxSummary.sgstRate, amount: taxSummary.sgstAmount },
                    ] as const).map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>{row.rate}%</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatAmount(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {taxSummary.tdsEnabled ? (
                      <TableRow>
                        <TableCell>TDS (E)</TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>{taxSummary.tdsRate}%</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          −{formatAmount(taxSummary.tdsAmount)}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow sx={{ bgcolor: EXPENSE_TOTAL_BG }}>
                      <TableCell sx={{ fontWeight: 700, borderBottom: 'none', color: EXPENSE_TOTAL_FG }}>
                        {t('expenseApproval.voucher.grandTotal')}
                      </TableCell>
                      <TableCell sx={{ borderBottom: 'none' }} />
                      <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderBottom: 'none', color: EXPENSE_TOTAL_FG }}>
                        {displayExpenseCurrency(selectedExpense.currency)} {formatAmount(taxSummary.grandTotal)}
                      </TableCell>
                    </TableRow>
                    {(Number(selectedExpense.paidAmount || 0) > 0 ||
                      isPaymentApproved ||
                      remittanceEntries.length > 0) && (
                      <>
                        {remittanceEntries.length > 0
                          ? remittanceEntries.map((row, index) => (
                              <TableRow key={`${row.timestamp || 'remit'}-${index}`}>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  {t('expenseApproval.detail.paidAmount')} {formatRemittanceDateTime(row.timestamp)}
                                </TableCell>
                                <TableCell />
                                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {displayExpenseCurrency(selectedExpense.currency)} {formatAmount(row.amount)}
                                </TableCell>
                              </TableRow>
                            ))
                          : (
                            <TableRow>
                              <TableCell>{t('expenseApproval.detail.paidAmount')}</TableCell>
                              <TableCell />
                              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {displayExpenseCurrency(selectedExpense.currency)}{' '}
                                {formatAmount(Number(selectedExpense.paidAmount || 0))}
                              </TableCell>
                            </TableRow>
                          )}
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {t('expenseApproval.detail.remainingAmount')}
                          </TableCell>
                          <TableCell />
                          <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'warning.main' }}>
                            {displayExpenseCurrency(selectedExpense.currency)}{' '}
                            {formatAmount(getExpenseRemainingAmount(selectedExpense))}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 첨부파일 */}
            {selectedExpense.attachments.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={sectionTitleSx}>{t('expenseApproval.detail.attachments')}</Typography>
                {renderAttachmentList(selectedExpense.attachments)}
              </Box>
            )}

            {/* 송금 확인증 */}
            {(() => {
              const proofPaths = (selectedExpense.bankTransferLogs || [])
                .map((log) => log.proof || log.payload?.proof)
                .filter((p): p is string => Boolean(p));
              if (proofPaths.length === 0) return null;
              return (
                <Box>
                  <Typography variant="subtitle2" sx={sectionTitleSx}>
                    {t('expenseApproval.detail.remittanceProofs')}
                  </Typography>
                  {renderAttachmentList(proofPaths)}
                </Box>
              );
            })()}

            {/* 메모 */}
            {(selectedExpense.notes || meta.remarks) && (
              <Box>
                <Typography variant="subtitle2" sx={sectionTitleSx}>{t('expenseApproval.detail.notes')}</Typography>
                <Box sx={{ p: 1, border: `1px solid ${EXPENSE_LINE}`, bgcolor: EXPENSE_MUTED_BG }}>
                  <Typography variant="body2">
                    {selectedExpense.notes || meta.remarks}
                  </Typography>
                </Box>
              </Box>
            )}

            {(meta.rejectedReason || meta.rejectedComment) && (
              <Box>
                <Typography variant="subtitle2" sx={sectionTitleSx}>{t('expenseApproval.detail.rejectedComment')}</Typography>
                <Box sx={{ p: 1, border: `1px solid ${EXPENSE_LINE}`, bgcolor: EXPENSE_MUTED_BG }}>
                  <Typography variant="body2">
                    {meta.rejectedReason || meta.rejectedComment}
                  </Typography>
                </Box>
              </Box>
            )}

            {(selectedExpense.paymentApprovedReason ||
              selectedExpense.paymentRejectedReason ||
              selectedExpense.paymentApprovedAt ||
              selectedExpense.paymentRejectedAt) && (
              <Box>
                <Typography variant="subtitle2" sx={sectionTitleSx}>{t('expenseApproval.detail.paymentProcessing')}</Typography>
                <Box sx={{ p: 1, border: `1px solid ${EXPENSE_LINE}`, bgcolor: EXPENSE_MUTED_BG }}>
                  {selectedExpense.paymentApprovedAt && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {t('expenseApproval.detail.paymentApprovedLine', {
                        datetime: new Date(selectedExpense.paymentApprovedAt).toLocaleString(dateLocale),
                        user: getUserNameById(selectedExpense.paymentApprovedBy) })}
                    </Typography>
                  )}
                  {selectedExpense.paymentApprovedReason && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {t('expenseApproval.detail.paymentApprovedReason', { reason: selectedExpense.paymentApprovedReason })}
                    </Typography>
                  )}
                  {selectedExpense.paymentRejectedAt && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {t('expenseApproval.detail.paymentRejectedLine', {
                        datetime: new Date(selectedExpense.paymentRejectedAt).toLocaleString(dateLocale),
                        user: getUserNameById(selectedExpense.paymentRejectedBy) })}
                    </Typography>
                  )}
                  {selectedExpense.paymentRejectedReason && (
                    <Typography variant="body2">
                      {t('expenseApproval.detail.paymentRejectedReason', { reason: selectedExpense.paymentRejectedReason })}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

          </CardContent>
        </Card>

            <Box
              className="expense-no-print expense-pdf-hide"
              sx={{ mt: 2, mb: 1, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}
            >
              {isRequester && isExpenseApproved && !isPaymentRequested && !isPaymentApproved && !isPaymentPaid && (
                <Button
                  variant="outlined"
                  startIcon={<SendIcon />}
                  onClick={() => handleRequestPayment(selectedExpense.id)}
                >
                  {t('expenseApproval.detailActions.requestPayment')}
                </Button>
              )}
              {isFinalApprover && isExpenseApproved && isPaymentRequested && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => openReasonDialog('payment-reject', selectedExpense.id)}
                >
                  {t('expenseApproval.actions.reject')}
                </Button>
              )}
              {isFinalApprover && isExpenseApproved && isPaymentRequested && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => openReasonDialog('payment-approve', selectedExpense.id)}
                >
                  {t('expenseApproval.detailActions.finalApprove')}
                </Button>
              )}
              {isPaymentOfficer &&
                isExpenseApproved &&
                !isPaymentPaid &&
                getExpenseRemainingAmount(selectedExpense) > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => openPaymentDialog('complete')}
                >
                  {t('expenseApproval.detailActions.executePayment')}
                </Button>
              )}
              {isPaymentOfficer && (selectedExpense.bankTransferStatus || (selectedExpense.bankTransferLogs || []).length > 0) && (
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => navigate(`/accounting/expense/transfer-log/${selectedExpense.id}`)}
                >
                  {t('expenseApproval.actions.transferLog')}
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrintExpense}
              >
                {t('expenseApproval.detailActions.print')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => void handleDownloadExpensePdf()}
                disabled={pdfDownloading}
              >
                {pdfDownloading
                  ? t('expenseApproval.detailActions.pdfDownloading')
                  : t('expenseApproval.detailActions.pdfDownload')}
              </Button>
              {canApproveThis && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleApproveExpense(selectedExpense.id)}
                  >
                    {t('expenseApproval.actions.accept')}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => openReasonDialog('expense-reject', selectedExpense.id)}
                  >
                    {t('expenseApproval.actions.reject')}
                  </Button>
                </>
              )}
            </Box>

            <Dialog open={reasonDialogOpen} onClose={closeReasonDialog} maxWidth="sm" fullWidth>
              <DialogTitle>
                {reasonDialogType === 'payment-approve' ? t('expenseApproval.dialog.finalApproveReasonTitle') : t('expenseApproval.dialog.rejectReasonTitle')}
              </DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder={reasonDialogType === 'payment-approve' ? t('expenseApproval.dialog.finalApproveReasonPlaceholder') : t('expenseApproval.dialog.rejectReasonPlaceholder')}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                />
              </DialogContent>
              <DialogActions>
                <Button variant="outlined" onClick={closeReasonDialog} sx={mvsBodyOutlinedBtnSx}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  color={reasonDialogType === 'payment-approve' ? 'success' : 'error'}
                  onClick={handleReasonSubmit}
                  sx={mvsBodyPrimaryBtnSx}
                >
                  {reasonDialogType === 'payment-approve' ? t('expenseApproval.actions.approve') : t('expenseApproval.actions.reject')}
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={paymentDialogOpen}
              onClose={() => !paymentSubmitting && setPaymentDialogOpen(false)}
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle>
                {t('expenseApproval.dialog.executePaymentTitle')}
              </DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('expenseApproval.dialog.paymentAmountHint', {
                    total: formatAmount(Number(selectedExpense.totalAmount || 0)),
                    paid: formatAmount(Number(selectedExpense.paidAmount || 0)),
                    remaining: formatAmount(getExpenseRemainingAmount(selectedExpense)),
                    currency: displayExpenseCurrency(selectedExpense.currency),
                  })}
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  type="number"
                  label={t('expenseApproval.dialog.paymentAmount')}
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  inputProps={{ min: 0, step: '0.01' }}
                  disabled={paymentSubmitting}
                />
                <Box
                  tabIndex={0}
                  sx={{
                    mt: 1.5,
                    p: 1.25,
                    border: `1px dashed ${EXPENSE_LINE}`,
                    bgcolor: EXPENSE_MUTED_BG,
                    outline: 'none',
                    '&:focus-within': { borderColor: 'primary.main' },
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items?.length) return;
                    for (let i = 0; i < items.length; i += 1) {
                      const item = items[i];
                      if (!item.type.startsWith('image/')) continue;
                      const blob = item.getAsFile();
                      if (!blob) continue;
                      e.preventDefault();
                      const ext = (item.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
                      const file = new File([blob], `paste.${ext}`, { type: item.type });
                      setRemittanceProofFile(file);
                      break;
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                    {t('expenseApproval.dialog.remittanceProof')} *
                  </Typography>
                  {!paymentProofFile ? (
                    <Button variant="outlined" component="label" disabled={paymentSubmitting} sx={{ mb: 0.5 }}>
                      {t('expenseApproval.dialog.remittanceProofUpload')}
                      <input
                        hidden
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setRemittanceProofFile(e.target.files?.[0] || null)}
                      />
                    </Button>
                  ) : (
                    <Box sx={{ mb: 0.5 }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={proofNameDraft}
                        disabled={paymentSubmitting}
                        onChange={(e) => setProofNameDraft(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => applyProofFileName(proofNameDraft)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setProofNameDraft(paymentProofFile.name);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        helperText={t('expenseApproval.dialog.remittanceProofRenameTitle', {
                          defaultValue: '클릭하여 파일명 변경',
                        })}
                        FormHelperTextProps={{ sx: { mx: 0 } }}
                        inputProps={{
                          'aria-label': t('expenseApproval.dialog.remittanceProofRenameTitle', {
                            defaultValue: '클릭하여 파일명 변경',
                          }),
                        }}
                        sx={{
                          mb: 0.5,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#fff',
                            '& fieldset': { borderColor: EXPENSE_LINE },
                          },
                          '& .MuiOutlinedInput-input': {
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            py: 1,
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          disabled={paymentSubmitting}
                          onClick={() => setRemittanceProofFile(null)}
                        >
                          {t('common.delete')}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          component="label"
                          disabled={paymentSubmitting}
                        >
                          {t('expenseApproval.dialog.remittanceProofChange', {
                            defaultValue: '파일 변경',
                          })}
                          <input
                            hidden
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setRemittanceProofFile(e.target.files?.[0] || null)}
                          />
                        </Button>
                      </Box>
                    </Box>
                  )}
                  {paymentProofPreviewUrl && (
                    <Box
                      component="img"
                      src={paymentProofPreviewUrl}
                      alt="remittance-proof"
                      sx={{
                        mt: 1,
                        maxWidth: '100%',
                        maxHeight: 160,
                        objectFit: 'contain',
                        border: `1px solid ${EXPENSE_LINE}`,
                        display: 'block',
                      }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                    {t('expenseApproval.dialog.remittanceProofHint')}
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button
                  variant="outlined"
                  onClick={() => setPaymentDialogOpen(false)}
                  disabled={paymentSubmitting}
                  sx={mvsBodyOutlinedBtnSx}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  disableElevation
                  onClick={() => void submitPaymentDialog()}
                  disabled={paymentSubmitting || !paymentProofFile}
                  sx={mvsBodyPrimaryBtnSx}
                >
                  {paymentSubmitting
                    ? t('common.processing')
                    : t('expenseApproval.detailActions.executePayment')}
                </Button>
              </DialogActions>
            </Dialog>
        <style>
          {`
            @page {
              size: A4;
              margin: 20mm 10mm 12mm 20mm;
            }
            @media print {
              html, body, #root {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background: #fff;
              }
              header, nav, aside,
              .MuiDrawer-root,
              .MuiAppBar-root,
              .MuiToolbar-root,
              .MuiBottomNavigation-root,
              .MuiSnackbar-root,
              .MuiDialog-root,
              .expense-no-print,
              .expense-pdf-hide {
                display: none !important;
              }
              .expense-pdf-root {
                position: fixed !important;
                inset: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                width: 100% !important;
                background: #fff !important;
                z-index: 9999 !important;
                overflow: visible !important;
              }
              ${EXPENSE_DOCUMENT_EXPORT_CSS}
            }
          `}
        </style>
        {attachmentPreviewDialog}
        {statusSnackbars}
      </Box>
    );
  }

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('expenseApproval.title')}
        mb={2}
        actions={
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon fontSize="small" />}
            onClick={handleCreateExpense}
            sx={mvsBodyPrimaryBtnSx}
          >
            {t('expenseApproval.actions.requestExpense')}
          </Button>
        }
      />

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Tabs
          value={listTab}
          onChange={(_, value) => {
            setListTab(value);
            setStatusFilter('');
            setPage(1);
            if (value !== 'transfer') {
              setCompanyFilterId('');
            }
            if (value === 'received') {
              setListSortKey('createdAt');
              setListSortDir('desc');
            }
          }}
          sx={{
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
              color: 'text.secondary' },
            '& .MuiTab-root.Mui-selected': { color: 'primary.main', fontWeight: 700 } }}
        >
          <Tab label={t('expenseApproval.tabs.written')} value="written" />
          <Tab label={t('expenseApproval.tabs.received')} value="received" />
          {hasTransferAccess && <Tab label={t('expenseApproval.tabs.transfer')} value="transfer" />}
        </Tabs>
      </Card>

      {/* 통계 카드 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2.5,
        mb: 3
      }}>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('expenseApproval.summary.totalExpense')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
              {formatAmount(totalExpenseAmount)}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('expenseApproval.summary.approvedAmount')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'success.main' }}>
              {formatAmount(approvedAmount)}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('expenseApproval.summary.pendingAmount')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'warning.main' }}>
              {formatAmount(pendingAmount)}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('expenseApproval.summary.urgentRequests')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'error.main' }}>
              {urgentCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            bgcolor: '#FFFFFF',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm:
                isRootUser && listTab === 'transfer'
                  ? 'minmax(160px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1.2fr) auto'
                  : 'minmax(180px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) auto',
            },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
            <TextField
              fullWidth
              size="small"
              label={t('expenseApproval.placeholders.searchSimple')}
              placeholder={
                isRootUser && listTab === 'transfer'
                  ? t('expenseApproval.placeholders.searchWithCompany')
                  : t('expenseApproval.placeholders.search')
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={expenseApprovalFilterFieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ) }}
            />
            <TextField
              fullWidth
              size="small"
              select
              label={t('expenseApproval.filters.status')}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                MenuProps: {
                  disableScrollLock: true,
                  PaperProps: { sx: { maxHeight: 320 } },
                },
                renderValue: (selected) => {
                  if (selected === '' || selected == null) return t('expenseApproval.filters.all');
                  if (listTab === 'transfer') {
                    const transferLabels: Record<string, string> = {
                      transfer_pending: t('expenseApproval.status.transferPending'),
                      transfer_partial: t('expenseApproval.status.partialTransfer'),
                      transfer_completed: t('expenseApproval.status.transferCompleted'),
                      transfer_failed: t('expenseApproval.status.transferFailed'),
                    };
                    return transferLabels[String(selected)] ?? String(selected);
                  }
                  const statusLabels: Record<string, string> = {
                    draft: t('expenseApproval.status.draft'),
                    submitted: t('expenseApproval.status.submitted'),
                    in_review: t('expenseApproval.status.inReview'),
                    approved: t('expenseApproval.status.approved'),
                    rejected: t('expenseApproval.status.rejected'),
                    paid: t('expenseApproval.status.paid') };
                  return statusLabels[String(selected)] ?? String(selected);
                } }}
              sx={expenseApprovalFilterFieldSx}
            >
              <MenuItem value="">{t('expenseApproval.filters.all')}</MenuItem>
              {listTab === 'transfer'
                ? [
                    <MenuItem key="transfer_pending" value="transfer_pending">
                      {t('expenseApproval.status.transferPending')}
                    </MenuItem>,
                    <MenuItem key="transfer_partial" value="transfer_partial">
                      {t('expenseApproval.status.partialTransfer')}
                    </MenuItem>,
                    <MenuItem key="transfer_completed" value="transfer_completed">
                      {t('expenseApproval.status.transferCompleted')}
                    </MenuItem>,
                    <MenuItem key="transfer_failed" value="transfer_failed">
                      {t('expenseApproval.status.transferFailed')}
                    </MenuItem>,
                  ]
                : [
                    <MenuItem key="draft" value="draft">
                      {t('expenseApproval.status.draft')}
                    </MenuItem>,
                    <MenuItem key="submitted" value="submitted">
                      {t('expenseApproval.status.submitted')}
                    </MenuItem>,
                    <MenuItem key="in_review" value="in_review">
                      {t('expenseApproval.status.inReview')}
                    </MenuItem>,
                    <MenuItem key="approved" value="approved">
                      {t('expenseApproval.status.approved')}
                    </MenuItem>,
                    <MenuItem key="rejected" value="rejected">
                      {t('expenseApproval.status.rejected')}
                    </MenuItem>,
                    <MenuItem key="paid" value="paid">
                      {t('expenseApproval.status.paid')}
                    </MenuItem>,
                  ]}
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('expenseApproval.filters.priority')}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (selected === '' || selected == null) return t('expenseApproval.filters.all');
                  const priorityLabels: Record<string, string> = {
                    low: t('expenseApproval.priority.low'),
                    medium: t('expenseApproval.priority.medium'),
                    high: t('expenseApproval.priority.high'),
                    urgent: t('expenseApproval.priority.urgent') };
                  return priorityLabels[String(selected)] ?? String(selected);
                } }}
              sx={expenseApprovalFilterFieldSx}
            >
              <MenuItem value="">{t('expenseApproval.filters.all')}</MenuItem>
              <MenuItem value="low">{t('expenseApproval.priority.low')}</MenuItem>
              <MenuItem value="medium">{t('expenseApproval.priority.medium')}</MenuItem>
              <MenuItem value="high">{t('expenseApproval.priority.high')}</MenuItem>
              <MenuItem value="urgent">{t('expenseApproval.priority.urgent')}</MenuItem>
            </TextField>
            {isRootUser && listTab === 'transfer' && (
              <TextField
                fullWidth
                size="small"
                select
                label={t('expenseApproval.filters.company')}
                value={companyFilterId === '' ? '' : String(companyFilterId)}
                onChange={(e) => {
                  const v = e.target.value;
                  setCompanyFilterId(v === '' ? '' : Number(v));
                  setPage(1);
                }}
                InputLabelProps={{ shrink: true }}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (selected === '' || selected == null) {
                      return t('expenseApproval.filters.allCompanies');
                    }
                    const found = companyOptions.find((c) => String(c.id) === String(selected));
                    return found?.name || String(selected);
                  },
                }}
                sx={expenseApprovalFilterFieldSx}
              >
                <MenuItem value="">{t('expenseApproval.filters.allCompanies')}</MenuItem>
                {companyOptions.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Button
              variant="outlined"
              startIcon={<FilterIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setPriorityFilter('');
                setCompanyFilterId('');
                setPage(1);
              }}
              sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
            >
                {t('expenseApproval.actions.reset')}
              </Button>
        </Box>
      </Card>

      {/* 지출결의서 목록 테이블 */}
      <Box sx={mvsBodyListZoneSx}>
        {paginatedExpenses.length === 0 ? (
          <Box sx={listStateBoxSx}>
            <Typography variant="body2" color="text.secondary">
              {listTab === 'transfer'
                ? t('expenseApproval.empty.noTransferItems')
                : t('expenseApproval.empty.noResults')}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
            <Table
              size="small"
              sx={{
                borderCollapse: 'collapse',
                bgcolor: 'transparent',
                tableLayout: 'fixed',
                width: '100%',
                minWidth: { xs: 760, md: 0 },
                '& .MuiTableCell-root': {
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                },
              }}
            >
              <TableHead sx={mvsTableHeadHighlightSx}>
              <TableRow>
                <TableCell sx={{ width: 52, minWidth: 52, maxWidth: 52, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {t('expenseApproval.columns.no')}
                </TableCell>
                <ExpenseListHeadCell
                  sortKey="createdAt"
                  activeKey={listSortKey}
                  direction={listSortDir}
                  onSort={handleListSort}
                  sx={{ width: 112, minWidth: 112, maxWidth: 112 }}
                >
                  {t('expenseApproval.columns.createdAt')}
                </ExpenseListHeadCell>
                <ExpenseListHeadCell
                  sortKey="title"
                  activeKey={listSortKey}
                  direction={listSortDir}
                  onSort={handleListSort}
                  sx={{ width: 'auto' }}
                >
                  {t('expenseApproval.columns.expenseInfo')}
                </ExpenseListHeadCell>
                <ExpenseListHeadCell
                  sortKey="person"
                  activeKey={listSortKey}
                  direction={listSortDir}
                  onSort={handleListSort}
                  sx={{ width: 148, minWidth: 148, maxWidth: 148 }}
                >
                  {listTab === 'written'
                    ? t('expenseApproval.columns.approver')
                    : t('expenseApproval.columns.requester')}
                </ExpenseListHeadCell>
                <ExpenseListHeadCell
                  sortKey="amount"
                  activeKey={listSortKey}
                  direction={listSortDir}
                  onSort={handleListSort}
                  sx={{ width: 136, minWidth: 136, maxWidth: 136 }}
                >
                  {t('expenseApproval.columns.amount')}
                </ExpenseListHeadCell>
                <ExpenseListHeadCell
                  sortKey="status"
                  activeKey={listSortKey}
                  direction={listSortDir}
                  onSort={handleListSort}
                  sx={{ width: 148, minWidth: 148, maxWidth: 148 }}
                >
                  {t('expenseApproval.columns.status')}
                </ExpenseListHeadCell>
                <ExpenseListHeadCell
                  sortKey="priority"
                  activeKey={listSortKey}
                  direction={listSortDir}
                  onSort={handleListSort}
                  sx={{ width: 108, minWidth: 108, maxWidth: 108 }}
                >
                  {t('expenseApproval.columns.priority')}
                </ExpenseListHeadCell>
                <TableCell
                  sx={{
                    width: 112,
                    minWidth: 112,
                    maxWidth: 112,
                    whiteSpace: 'nowrap',
                    pl: 1.5,
                    pr: 3,
                    textAlign: 'center',
                  }}
                >
                  {t('expenseApproval.columns.actions')}
                </TableCell>
              </TableRow>
              </TableHead>
              <TableBody sx={mvsTableBodyRowSx}>
                {paginatedExpenses.map((expense, index) => (
                  <TableRow
                    key={expense.id}
                    onClick={() => handleViewExpense(expense)}
                    sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' } }}
                  >
                  <TableCell sx={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', width: 52, minWidth: 52, maxWidth: 52 }}>
                    {(page - 1) * itemsPerPage + index + 1}
                  </TableCell>
                  <TableCell sx={{ width: 112, minWidth: 112, maxWidth: 112 }}>
                    {formatLocalYmd(expense.createdAt)
                      ? new Date(`${formatLocalYmd(expense.createdAt)}T00:00:00`).toLocaleDateString(dateLocale)
                      : '-'}
                  </TableCell>
                  <TableCell sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                      {expense.title}
                    </Typography>
                    {isRootUser && listTab === 'transfer' && expense.companyName ? (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {expense.companyName}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ width: 148, minWidth: 148, maxWidth: 148 }}>
                    {listTab === 'written' ? (
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {getExpenseApproverName(expense)}
                      </Typography>
                    ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <Avatar sx={{ mr: 1, width: 28, height: 28, flexShrink: 0 }}>
                        <PersonIcon fontSize="small" />
                      </Avatar>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {expense.requesterName}
                      </Typography>
                    </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ width: 136, minWidth: 136, maxWidth: 136 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {displayExpenseCurrency(expense.currency)} {formatAmount(getExpenseGrandTotal(expense))}
                    </Typography>
                    {listTab === 'transfer' && Number(expense.paidAmount || 0) > 0 && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {t('expenseApproval.list.remainingShort', {
                          amount: formatAmount(getExpenseRemainingAmount(expense)),
                          currency: displayExpenseCurrency(expense.currency),
                        })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ width: 148, minWidth: 148, maxWidth: 148 }}>
                    {listTab === 'transfer'
                      ? getTransferStatusChip(expense)
                      : getStatusChip(resolveDisplayStatus(expense))}
                  </TableCell>
                  <TableCell sx={{ width: 108, minWidth: 108, maxWidth: 108 }}>{getPriorityChip(expense.priority)}</TableCell>
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    sx={{ width: 112, minWidth: 112, maxWidth: 112, pl: 1.5, pr: 3, textAlign: 'center' }}
                  >
                    <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center', flexWrap: 'nowrap' }}>
                      {listTab === 'transfer' && (
                        <Tooltip title={t('expenseApproval.actions.transferLog')}>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/accounting/expense/transfer-log/${expense.id}`)}
                            sx={{ color: 'text.secondary', borderRadius: '10px', '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <PendingIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {listTab === 'received' && canUserApproveExpense(expense) && (
                        <>
                          <Tooltip title={t('expenseApproval.actions.accept')}>
                            <IconButton
                              size="small"
                              onClick={() => handleApproveExpense(expense.id)}
                              color="success"
                              sx={{ borderRadius: '10px' }}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('expenseApproval.actions.reject')}>
                            <IconButton
                              size="small"
                              onClick={() => openReasonDialog('expense-reject', expense.id)}
                              color="error"
                              sx={{ borderRadius: '10px' }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {listTab !== 'transfer' && canDeleteExpense(expense) && (
                      <Tooltip title={t('common.delete')}>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteExpense(expense.id)}
                          sx={{
                            color: 'text.secondary',
                            borderRadius: '10px',
                            '&:hover': { color: 'error.main', bgcolor: (theme) => `${theme.palette.error.main}14` } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )}

        <Box sx={mvsBodyPaginationSx}>
          <Pagination
            count={Math.ceil(filteredExpenses.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Box>

      {/* 스낵바 */}
      {statusSnackbars}
      {attachmentPreviewDialog}

      <Dialog open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('expenseApproval.dialog.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('expenseApproval.dialog.deleteMessage')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)} sx={mvsBodyOutlinedBtnSx}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" disableElevation onClick={confirmDeleteExpense} sx={mvsBodyPrimaryBtnSx}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseApproval;
