import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Paper,
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
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
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  QrCode2 as QrCodeIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { accountingService, API_BASE_URL, partnerService } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { getUploadUrl } from '../../utils/uploadUrl';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { mvsSearchFieldSx } from '../../theme/mvsLayout';

const expenseFilterLabelSx = {
  color: 'text.secondary',
  fontWeight: 600,
  mb: 0.5,
  display: 'block',
  fontSize: '0.75rem',
  lineHeight: '18px',
  minHeight: 18,
};

const expenseFilterSelectSx = {
  borderRadius: '12px',
  bgcolor: '#FFFFFF',
  height: 40,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#C5CED9' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8C4D0' },
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
  bank_name?: string;
  account_number?: string;
  bank_ifsc?: string;
  account_holder?: string;
  gstNumbers?: string[];
}

interface ExpenseApproval {
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
    timestamp: string;
    action: string;
    status: string;
    provider?: string | null;
    payload?: any;
    response?: any;
    error?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ApprovalStep {
  id: number;
  stepOrder: number;
  approverId: number;
  approverName: string;
  approverDepartment: string;
  approverPosition: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comment?: string;
}

const sectionTitleSx = {
  display: 'block',
  letterSpacing: '0.1em',
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: '0.68rem',
  mb: 2,
} as const;

const ExpenseApproval: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { user } = useStore();
  const navigate = useNavigate();
  const hasTransferAccess = Boolean(
    user?.role === 'root' || user?.role === 'admin' || user?.is_payment_officer
  );
  const [expenses, setExpenses] = useState<ExpenseApproval[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  /** '' | draftCreated | autoSaved | autoSaveFailed — render with t() for i18n */
  const [headerStatusBanner, setHeaderStatusBanner] = useState<'' | 'draftCreated' | 'autoSaved' | 'autoSaveFailed'>('');
  const [isInitializingDraft, setIsInitializingDraft] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseApproval | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'create' | 'edit'>('list');
  const [listTab, setListTab] = useState<'received' | 'written' | 'transfer'>('written');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    title: '',
    purpose: '',
    currency: 'INR',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
    notes: ''
  });
  const [lineItems, setLineItems] = useState<ExpenseItem[]>([]);
  const [currentAttachments, setCurrentAttachments] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<Array<{ id: number; name: string }>>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [voucherData, setVoucherData] = useState({
    department: '',
    partnerId: '',
    voucherNo: '',
    gstNumber: '',
    voucherDate: new Date().toISOString().split('T')[0],
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
  const [bankProvider, setBankProvider] = useState<'icici' | 'kotak'>('icici');
  const lastSavedPayloadRef = useRef<string>('');
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingReceipts, setUploadingReceipts] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonDialogType, setReasonDialogType] = useState<'payment-approve' | 'payment-reject'>('payment-approve');
  const [reasonText, setReasonText] = useState('');
  const [reasonTargetId, setReasonTargetId] = useState<number | null>(null);
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

  const mapExpense = (expense: any): ExpenseApproval => {
    const parsedItems = parseExpenseItems(expense.items);
    return {
    id: expense.id,
    expenseId: expense.expense_id || '',
    title: expense.title || '',
    requesterId: expense.requester_id,
    requesterName: expense.requester_name || '',
    requesterDepartment: expense.requester_department || '-',
    requesterPosition: expense.requester_position || '-',
    totalAmount: parseFloat(expense.total_amount || 0),
    currency: expense.currency || 'INR',
    purpose: expense.purpose || '',
    items: parsedItems.rows,
    status: expense.status || 'draft',
    priority: expense.priority || 'medium',
    currentApproverId: expense.current_approver_id,
    currentApproverName: expense.current_approver_name,
    approvalFlow: parseExpenseItems(expense.approval_flow).rows,
    submittedAt: expense.submitted_at || '',
    dueDate: expense.due_date || '',
    notes: expense.notes || '',
    attachments: parseExpenseItems(expense.attachments).rows,
    itemMeta: parsedItems.meta,
    approvalId: expense.approval_id || undefined,
    paymentRequestStatus: expense.payment_request_status || undefined,
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
    createdAt: expense.created_at || '',
    updatedAt: expense.updated_at || ''
    };
  };

  useEffect(() => {
    loadExpenseData();
  }, []);

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
      } catch (loadError) {
        console.error('승인자 목록 로드 오류:', loadError);
        setApprovers([]);
      }
    };
    loadApprovers();
  }, [user?.company_id]);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const partners = await useReferenceDataStore.getState().fetchPartners();
        setPartners(partners);
      } catch (loadError) {
        console.error('파트너 목록 로드 오류:', loadError);
      }
    };
    loadPartners();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, statusFilter, priorityFilter, listTab, user]);

  useEffect(() => {
    if (!hasTransferAccess && listTab === 'transfer') {
      setListTab('written');
    }
  }, [hasTransferAccess, listTab]);

  const subtotalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [lineItems]
  );
  const igstAmount = useMemo(
    () => subtotalAmount * (Number(voucherData.igstRate || 0) / 100),
    [subtotalAmount, voucherData.igstRate]
  );
  const cgstAmount = useMemo(
    () => subtotalAmount * (Number(voucherData.cgstRate || 0) / 100),
    [subtotalAmount, voucherData.cgstRate]
  );
  const sgstAmount = useMemo(
    () => subtotalAmount * (Number(voucherData.sgstRate || 0) / 100),
    [subtotalAmount, voucherData.sgstRate]
  );
  const tdsAmount = useMemo(
    () =>
      voucherData.tdsEnabled
        ? subtotalAmount * (Number(voucherData.tdsRate || 0) / 100)
        : 0,
    [subtotalAmount, voucherData.tdsEnabled, voucherData.tdsRate]
  );
  const totalAmount = useMemo(
    () => subtotalAmount + igstAmount + cgstAmount + sgstAmount - tdsAmount,
    [subtotalAmount, igstAmount, cgstAmount, sgstAmount, tdsAmount]
  );

  const apiBaseUrl = useMemo(() => API_BASE_URL.replace(/\/api$/, ''), []);
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
      .catch((error: unknown) => {
        console.error('QR 생성 오류:', error);
        setQrImageError(t('expenseApproval.errors.qrGenerateFailed'));
      });
  }, [qrUrl]);

  const loadExpenseData = async () => {
    setLoading(true);
    try {
      const response = await accountingService.getExpenseReports();
      if (response.success) {
        const list = Array.isArray(response.data) ? response.data : [];
        setExpenses(list.map(mapExpense));
      } else {
        setExpenses([]);
        setError(response.message || t('expenseApproval.errors.loadFailed'));
      }
    } catch (error) {
      console.error('지출 데이터 로드 오류:', error);
      setError(t('expenseApproval.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const buildItemsPayload = () => ({
    rows: lineItems,
    meta: {
      ...voucherData,
      checkedById: voucherData.approvedById || ''
    }
  });

  const buildExpensePayload = (statusOverride?: ExpenseApproval['status']) => ({
    title: formData.title,
    purpose: formData.purpose,
    total_amount: Number(totalAmount.toFixed(2)),
    currency: formData.currency || 'INR',
    priority: formData.priority,
    due_date: formData.dueDate || null,
    notes: formData.notes || '',
    items: buildItemsPayload(),
    status: statusOverride
  });

  const ensureDraftExpense = async () => {
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
      setCurrentAttachments(parseExpenseItems(response.data?.attachments).rows);
      setHeaderStatusBanner('draftCreated');
    } catch (createError) {
      console.error('지출결의서 초안 생성 오류:', createError);
      setError(t('expenseApproval.errors.createDraftFailed'));
    } finally {
      setIsInitializingDraft(false);
    }
  };

  useEffect(() => {
    ensureDraftExpense();
  }, [viewMode, draftId, isInitializingDraft]);

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
          setCurrentAttachments(parseExpenseItems(response.data?.attachments).rows);
          setHeaderStatusBanner('autoSaved');
          lastSavedPayloadRef.current = payloadString;
        }
      } catch (autoSaveError) {
        console.error('자동 저장 오류:', autoSaveError);
        setHeaderStatusBanner('autoSaveFailed');
      } finally {
        setSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, lineItems, voucherData, draftId, selectedExpense?.id, viewMode, isInitializingDraft, totalAmount]);

  const filterExpenses = () => {
    let filtered = expenses;

    if (listTab === 'written' && user?.id) {
      filtered = filtered.filter(expense => expense.requesterId === user.id);
    }
    if (listTab === 'received' && user?.id) {
      filtered = filtered.filter(expense => {
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
        filtered = filtered.filter(expense =>
          expense.paymentRequestStatus === 'approved' ||
          expense.bankTransferStatus === 'failed'
        );
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.expenseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(expense => expense.priority === priorityFilter);
    }

    setFilteredExpenses(filtered);
  };

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
        return <Chip label={t('expenseApproval.status.paid')} color="success" size="small" />;
      default:
        return <Chip label={t('expenseApproval.unknown')} color="default" size="small" />;
    }
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

  const handleViewExpense = (expense: ExpenseApproval) => {
    setSelectedExpense(expense);
    setViewMode('view');
  };

  const handleEditExpense = (expense: ExpenseApproval) => {
    setSelectedExpense(expense);
    setFormData({
      title: expense.title,
      purpose: expense.purpose,
      currency: expense.currency || 'INR',
      priority: expense.priority,
      dueDate: expense.dueDate || '',
      notes: expense.notes || ''
    });
    setLineItems(
      (expense.items || []).map((item) => ({
        id: item.id || `${Date.now()}-${Math.random()}`,
        invoiceDate: item.invoiceDate || item.date || '',
        description: item.description || '',
        qty: Number(item.qty || 1),
        unitPrice: Number(item.unitPrice || item.amount || 0),
        total: Number(item.total || item.amount || 0)
      }))
    );
    setCurrentAttachments(expense.attachments || []);
    setVoucherData((prev) => ({
      ...prev,
      ...(expense.itemMeta || {})
    }));
    setDraftId(expense.id);
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
    setVoucherData({
      department: '',
      partnerId: '',
      voucherNo: generateVoucherNumber(),
      gstNumber: '',
      voucherDate: todayDate,
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
      console.error('지출결의서 제출 오류:', saveError);
      setError(t('expenseApproval.errors.submitFailed'));
    } finally {
      setSaving(false);
    }
  };

  const createEmptyLineItem = (): ExpenseItem => ({
    id: `${Date.now()}-${Math.random()}`,
    invoiceDate: '',
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
        const qty = Number(nextItem.qty || 0);
        const unitPrice = Number(nextItem.unitPrice || 0);
        nextItem.total = Number((qty * unitPrice).toFixed(2));
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
      console.error('QR 토큰 발급 오류:', qrError);
      setError(t('expenseApproval.errors.qrTokenFailed'));
    } finally {
      setQrLoading(false);
    }
  };

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
      setCurrentAttachments(parseExpenseItems(response.data?.attachments).rows);
      setSuccess(t('expenseApproval.success.receiptAttached'));
    } catch (uploadError) {
      console.error('영수증 업로드 오류:', uploadError);
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
    } catch (error) {
      console.error('삭제 오류:', error);
      setError(t('expenseApproval.errors.deleteFailed'));
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleApproveExpense = (id: number) => {
    accountingService.updateExpenseReportStatus(id, 'approved')
      .then(() => loadExpenseData())
      .then(() => setSuccess(t('expenseApproval.success.approved')))
      .catch((error) => {
        console.error('승인 오류:', error);
        setError(t('expenseApproval.errors.approveFailed'));
      });
  };

  const handleRejectExpense = (id: number) => {
    accountingService.updateExpenseReportStatus(id, 'rejected')
      .then(() => loadExpenseData())
      .then(() => setSuccess(t('expenseApproval.success.rejected')))
      .catch((error) => {
        console.error('반려 오류:', error);
        setError(t('expenseApproval.errors.rejectFailed'));
      });
  };

  const openReasonDialog = (type: 'payment-approve' | 'payment-reject', id: number) => {
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
    } catch (error) {
      console.error('결제 요청 오류:', error);
      setError(t('expenseApproval.errors.paymentRequestFailed'));
    }
  };

  const handleCompletePayment = async (id: number) => {
    try {
      const response = await accountingService.completeExpensePayment(id, bankProvider);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.paymentCompleteFailed'));
      }
      await loadExpenseData();
      setSuccess(t('expenseApproval.success.paymentCompleted'));
    } catch (error) {
      console.error('결제 완료 처리 오류:', error);
      setError(t('expenseApproval.errors.paymentCompleteFailed'));
    }
  };

  const handleRetryTransfer = async (id: number) => {
    try {
      const response = await accountingService.retryExpenseTransfer(id, bankProvider);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.transferRetryFailed'));
      }
      await loadExpenseData();
      setSuccess(t('expenseApproval.success.transferRetried'));
    } catch (error) {
      console.error('송금 재시도 오류:', error);
      setError(t('expenseApproval.errors.transferRetryFailed'));
    }
  };

  const handleApprovePayment = async (id: number, reason?: string) => {
    try {
      const response = await accountingService.approveExpensePayment(id, reason);
      if (!response?.success) {
        throw new Error(response?.message || t('expenseApproval.errors.finalApproveFailed'));
      }
      await loadExpenseData();
      setSuccess(t('expenseApproval.success.finalApproved'));
    } catch (error) {
      console.error('최종 승인 오류:', error);
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
    } catch (error) {
      console.error('반려 오류:', error);
      setError(t('expenseApproval.errors.rejectFailed'));
    }
  };

  const handleReasonSubmit = async () => {
    if (!reasonTargetId) return;
    if (reasonDialogType === 'payment-reject' && !reasonText.trim()) {
      setError(t('expenseApproval.errors.rejectReasonRequired'));
      return;
    }
    const reason = reasonText.trim();
    if (reasonDialogType === 'payment-approve') {
      await handleApprovePayment(reasonTargetId, reason || undefined);
    } else {
      await handleRejectPayment(reasonTargetId, reason || undefined);
    }
    closeReasonDialog();
  };

  const getUserNameById = (id?: number) => {
    if (!id) return '-';
    return approvers.find((item) => item.id === id)?.name || `User ${id}`;
  };

  const dateLocale = useMemo(() => (i18n.language?.startsWith('ko') ? 'ko-KR' : 'en-US'), [i18n.language]);
  const formLangAttr = i18n.language?.startsWith('ko') ? 'ko' : 'en';

  const expenseFormPaperSx = useMemo(
    () => ({
      p: { xs: 2.5, sm: 3.5 },
      borderRadius: '20px',
      border: '1px solid',
      borderColor: alpha(theme.palette.text.primary, 0.06),
      boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
      bgcolor: theme.palette.background.paper,
    }),
    [theme]
  );

  const sectionShellSx = useMemo(
    () => ({
      mb: 2.5,
      p: { xs: 2, sm: 2.5 },
      borderRadius: '16px',
      border: '1px solid',
      borderColor: alpha(theme.palette.text.primary, 0.06),
      bgcolor: alpha(theme.palette.text.primary, 0.02),
    }),
    [theme]
  );

  const softFieldSx = useMemo(
    () => ({
      '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        bgcolor: alpha(theme.palette.text.primary, 0.03),
        '& fieldset': { borderColor: alpha(theme.palette.text.primary, 0.08) },
      },
    }),
    [theme]
  );

  const prepCellSx = useMemo(
    () => ({
      p: 1.5,
      borderRadius: '14px',
      bgcolor: alpha(theme.palette.text.primary, 0.035),
      border: '1px solid',
      borderColor: alpha(theme.palette.text.primary, 0.08),
    }),
    [theme]
  );

  const generateVoucherNumber = () => {
    const year = new Date().getFullYear();
    const suffix = String(Date.now()).slice(-6);
    return `PV-${year}-${suffix}`;
  };

  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
  const approvedAmount = expenses
    .filter(expense => expense.status === 'approved' || expense.status === 'paid')
    .reduce((sum, expense) => sum + expense.totalAmount, 0);
  const pendingAmount = expenses
    .filter(expense => expense.status === 'submitted' || expense.status === 'in_review')
    .reduce((sum, expense) => sum + expense.totalAmount, 0);
  const urgentCount = expenses.filter(expense => expense.priority === 'urgent').length;

  const paginatedExpenses = filteredExpenses.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'create' || viewMode === 'edit') {
    const isEdit = viewMode === 'edit';
    return (
      <Box sx={{
        p: 0,
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="pageTitle" component="h1" sx={{ fontWeight: 600, letterSpacing: '-0.022em' }}>
            {isEdit ? t('expenseApproval.form.editTitle') : t('expenseApproval.form.createTitle')}
          </Typography>
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
            <Button variant="outlined" onClick={() => setViewMode('list')}>
              {t('expenseApproval.actions.backToList')}
            </Button>
          </Box>
        </Box>

        <Paper variant="outlined" component="section" lang={formLangAttr} sx={expenseFormPaperSx}>
            {saving && <LinearProgress sx={{ mb: 2, borderRadius: '4px' }} />}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3, mb: 4 }}>
              <Box sx={{ minWidth: 0, flex: '1 1 220px' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>{t('expenseApproval.title')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('expenseApproval.voucher.subtitle')}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.5,
                  width: { xs: '100%', sm: 'auto' },
                  minWidth: { sm: 320 },
                  maxWidth: { sm: 420 },
                }}
              >
                <Box sx={prepCellSx}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                    {t('expenseApproval.voucher.prepared')}
                  </Typography>
                  <TextField
                    value={user?.username || ''}
                    size="small"
                    inputProps={{ readOnly: true }}
                    fullWidth
                    sx={{ mt: 0.75, ...softFieldSx }}
                  />
                </Box>
                <Box sx={prepCellSx}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                    {t('expenseApproval.voucher.approved')}
                  </Typography>
                  <Autocomplete
                    sx={{ mt: 0.75, ...softFieldSx }}
                    options={approvers}
                    getOptionLabel={(option) => option.name}
                    value={approvers.find((item) => String(item.id) === String(voucherData.approvedById)) || null}
                    onChange={(_, value) =>
                      setVoucherData({ ...voucherData, approvedById: value ? String(value.id) : '' })
                    }
                    renderInput={(params) => (
                      <TextField {...params} placeholder={t('expenseApproval.placeholders.searchSimple')} size="small" />
                    )}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={sectionShellSx}>
              <Typography variant="overline" sx={sectionTitleSx}>
                {t('expenseApproval.voucher.sectionBasic')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelTitle')}</Typography>
                  <TextField
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    fullWidth
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelPurpose')}</Typography>
                  <TextField
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    required
                    fullWidth
                    multiline
                    minRows={2}
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
                <Box sx={{ display: 'grid', gap: 2, gridColumn: { md: '1 / -1' }, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.filters.priority')}</Typography>
                    <FormControl fullWidth sx={{ mt: 0.5 }}>
                      <Select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        size="small"
                        sx={{
                          borderRadius: '12px',
                          bgcolor: alpha(theme.palette.text.primary, 0.03),
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(theme.palette.text.primary, 0.08) },
                        }}
                      >
                        <MenuItem value="low">{t('expenseApproval.priority.low')}</MenuItem>
                        <MenuItem value="medium">{t('expenseApproval.priority.medium')}</MenuItem>
                        <MenuItem value="high">{t('expenseApproval.priority.high')}</MenuItem>
                        <MenuItem value="urgent">{t('expenseApproval.priority.urgent')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelDateCreated')}</Typography>
                    <TextField
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      inputProps={{ lang: formLangAttr }}
                      sx={{ mt: 0.5, ...softFieldSx }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={sectionShellSx}>
              <Typography variant="overline" sx={sectionTitleSx}>
                {t('expenseApproval.voucher.sectionVendor')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                {t('expenseApproval.voucher.vendorGroupDoc')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelPartner')}</Typography>
                  <Autocomplete
                    sx={{ mt: 0.5, ...softFieldSx }}
                    options={partners}
                    getOptionLabel={(option) => option.company_name}
                    value={partners.find((item) => String(item.id) === String(voucherData.partnerId)) || null}
                    onChange={(_, value) => {
                      if (!value) {
                        setVoucherData({
                          ...voucherData,
                          partnerId: '',
                          department: '',
                          gstNumber: '',
                          bank: '',
                          accountNumber: '',
                          ifsc: '',
                          acHolder: ''
                        });
                        return;
                      }
                      const gstNumber = value.gstNumbers && value.gstNumbers.length > 0 ? value.gstNumbers[0] : '';
                      setVoucherData({
                        ...voucherData,
                        partnerId: String(value.id),
                        department: value.company_name || '',
                        gstNumber,
                        bank: value.bank_name || '',
                        accountNumber: value.account_number || '',
                        ifsc: value.bank_ifsc || '',
                        acHolder: value.account_holder || value.representative || value.company_name || ''
                      });
                    }}
                    renderInput={(params) => (
                      <TextField {...params} placeholder={t('expenseApproval.placeholders.searchCompany')} />
                    )}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelVoucherNumber')}</Typography>
                  <TextField
                    value={voucherData.voucherNo}
                    onChange={(e) => setVoucherData({ ...voucherData, voucherNo: e.target.value })}
                    fullWidth
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelGstNumber')}</Typography>
                  <TextField
                    value={voucherData.gstNumber}
                    onChange={(e) => setVoucherData({ ...voucherData, gstNumber: e.target.value })}
                    fullWidth
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelVoucherDate')}</Typography>
                  <TextField
                    type="date"
                    value={voucherData.voucherDate}
                    onChange={(e) => setVoucherData({ ...voucherData, voucherDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    inputProps={{ lang: formLangAttr }}
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
              </Box>
              <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.08), my: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                {t('expenseApproval.voucher.vendorGroupPayout')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelAccountHolder')}</Typography>
                  <TextField
                    value={voucherData.acHolder}
                    onChange={(e) => setVoucherData({ ...voucherData, acHolder: e.target.value })}
                    fullWidth
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelBankName')}</Typography>
                  <TextField
                    value={voucherData.bank}
                    onChange={(e) => setVoucherData({ ...voucherData, bank: e.target.value })}
                    fullWidth
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelAccountNumber')}</Typography>
                  <TextField
                    value={voucherData.accountNumber}
                    onChange={(e) => setVoucherData({ ...voucherData, accountNumber: e.target.value })}
                    fullWidth
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.labelIfsc')}</Typography>
                  <TextField
                    value={voucherData.ifsc}
                    onChange={(e) => setVoucherData({ ...voucherData, ifsc: e.target.value })}
                    fullWidth
                    sx={{ mt: 0.5, ...softFieldSx }}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={sectionShellSx}>
              <Typography variant="overline" sx={sectionTitleSx}>
                {t('expenseApproval.voucher.sectionItems')}
              </Typography>
              <TableContainer
                sx={{
                  mb: 1.5,
                  borderRadius: '14px',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.text.primary, 0.08),
                  overflow: 'hidden',
                }}
              >
              <Table size="small">
                <TableHead
                  sx={{
                    bgcolor: alpha(theme.palette.text.primary, 0.03),
                    '& .MuiTableCell-head': {
                      color: 'text.secondary',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em',
                      textTransform: 'none',
                      borderBottom: '1px solid',
                      borderColor: alpha(theme.palette.text.primary, 0.08),
                      py: 1.25,
                    },
                  }}
                >
                  <TableRow>
                    <TableCell>{t('expenseApproval.voucher.tableNo')}</TableCell>
                    <TableCell>{t('expenseApproval.voucher.tableInvoiceDate')}</TableCell>
                    <TableCell>{t('expenseApproval.voucher.tableDescription')}</TableCell>
                    <TableCell align="right">{t('expenseApproval.voucher.tableQty')}</TableCell>
                    <TableCell align="right">{t('expenseApproval.voucher.tableUnitPrice')}</TableCell>
                    <TableCell align="right">{t('expenseApproval.voucher.tableTotal')}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          type="date"
                          value={item.invoiceDate}
                          onChange={(e) => handleUpdateLineItem(item.id, 'invoiceDate', e.target.value)}
                          onKeyDown={handleLineItemKeyDown(item.id, 'invoiceDate', index)}
                          size="small"
                          fullWidth
                          inputProps={{ lang: formLangAttr }}
                          inputRef={setInputRef(item.id, 'invoiceDate')}
                          sx={softFieldSx}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                          onKeyDown={handleLineItemKeyDown(item.id, 'description', index)}
                          size="small"
                          fullWidth
                          placeholder={t('expenseApproval.voucher.placeholderDescription')}
                          inputRef={setInputRef(item.id, 'description')}
                          sx={softFieldSx}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdateLineItem(item.id, 'qty', Number(e.target.value || 0))}
                          onKeyDown={handleLineItemKeyDown(item.id, 'qty', index)}
                          size="small"
                          inputProps={{ min: 0 }}
                          fullWidth
                          placeholder={t('expenseApproval.voucher.placeholderQty')}
                          inputRef={setInputRef(item.id, 'qty')}
                          sx={softFieldSx}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', Number(e.target.value || 0))}
                          onKeyDown={handleLineItemKeyDown(item.id, 'unitPrice', index)}
                          size="small"
                          inputProps={{ min: 0 }}
                          fullWidth
                          placeholder={t('expenseApproval.voucher.placeholderUnitPrice')}
                          inputRef={setInputRef(item.id, 'unitPrice')}
                          sx={softFieldSx}
                        />
                      </TableCell>
                      <TableCell align="right">{item.total.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleRemoveLineItem(item.id)}>
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
                sx={{ mt: 1, textTransform: 'none', borderRadius: '12px' }}
              >
                {t('expenseApproval.voucher.addItem')}
              </Button>
            </Box>

            <Box
              sx={{
                mb: 2,
                borderRadius: '16px',
                p: { xs: 2, sm: 2.5 },
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.text.primary, 0.06),
                boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                  color: 'text.secondary',
                  fontSize: '0.68rem',
                  mb: 2,
                }}
              >
                {t('expenseApproval.voucher.sectionTax')}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 2,
                  py: 1.25,
                  px: 1.5,
                  mb: 1.5,
                  borderRadius: '12px',
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.04),
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {t('expenseApproval.voucher.taxSubtotal')}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {subtotalAmount.toFixed(2)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: 'minmax(88px,auto) 108px 1fr',
                  gap: 1.5,
                  alignItems: 'center',
                  py: 0.5,
                  borderBottom: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.text.primary, 0.06),
                  mb: 1,
                }}
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
                    gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(88px,auto) 108px 1fr' },
                    gap: { xs: 1.5, sm: 1.5 },
                    alignItems: 'center',
                    py: 1.25,
                    borderBottom: '1px solid',
                    borderColor: (theme) => alpha(theme.palette.text.primary, 0.06),
                    '&:last-of-type': { borderBottom: 'none', pb: 0 },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                    {row.label}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={row.rate}
                    onChange={(e) => row.setRate(Number(e.target.value || 0))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{
                      width: { xs: '100%', sm: 'auto' },
                      maxWidth: { xs: 120, sm: 'none' },
                      gridColumn: { xs: '1', sm: 'auto' },
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                        '& fieldset': { borderColor: (theme) => alpha(theme.palette.text.primary, 0.08) },
                      },
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      textAlign: { xs: 'right', sm: 'right' },
                      fontVariantNumeric: 'tabular-nums',
                      color: 'text.secondary',
                      fontWeight: 500,
                    }}
                  >
                    {row.amount.toFixed(2)}
                  </Typography>
                </Box>
              ))}

              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: (theme) => alpha(theme.palette.text.primary, 0.08) }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={voucherData.tdsEnabled}
                      onChange={(e) => setVoucherData({ ...voucherData, tdsEnabled: e.target.checked })}
                      size="small"
                      sx={{ borderRadius: '8px' }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{t('expenseApproval.voucher.tdsApply')}</Typography>}
                  sx={{ ml: -0.5, mb: 0.5 }}
                />
                <Collapse in={voucherData.tdsEnabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 1 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(88px,auto) 108px 1fr' },
                        gap: 1.5,
                        alignItems: 'center',
                      }}
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
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          maxWidth: { xs: 120, sm: 'none' },
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '10px',
                            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.03),
                            '& fieldset': { borderColor: (theme) => alpha(theme.palette.text.primary, 0.08) },
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'text.secondary',
                          fontWeight: 500,
                        }}
                      >
                        −{tdsAmount.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </Collapse>
              </Box>

              <Box
                sx={{
                  mt: 2.5,
                  pt: 2,
                  px: 2,
                  pb: 2,
                  borderRadius: '14px',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                  border: '1px solid',
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {t('expenseApproval.voucher.grandTotal')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {totalAmount.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <TextField
              label={t('expenseApproval.voucher.remarksIfAny')}
              value={voucherData.remarks}
              onChange={(e) => setVoucherData({ ...voucherData, remarks: e.target.value })}
              fullWidth
              multiline
              minRows={3}
              sx={{ mt: 2, ...softFieldSx }}
            />

            <TextField
              label={t('expenseApproval.voucher.remarksInternal')}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 1.5, ...softFieldSx }}
            />

            <Divider sx={{ my: 3, borderColor: alpha(theme.palette.text.primary, 0.08) }} />

            <Box sx={sectionShellSx}>
              <Typography variant="overline" sx={sectionTitleSx}>
                {t('expenseApproval.voucher.sectionReceipts')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Button variant="outlined" startIcon={<QrCodeIcon />} onClick={handleOpenQr} disabled={qrLoading} sx={{ textTransform: 'none', borderRadius: '12px' }}>
                  {qrLoading ? t('expenseApproval.voucher.receiptQrLoading') : t('expenseApproval.voucher.receiptQr')}
                </Button>
                <Button variant="outlined" component="label" disabled={uploadingReceipts} sx={{ textTransform: 'none', borderRadius: '12px' }}>
                  {uploadingReceipts ? t('expenseApproval.voucher.receiptUploading') : t('expenseApproval.voucher.receiptUpload')}
                  <input
                    hidden
                    multiple
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleUploadReceipts(e.target.files)}
                  />
                </Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadExpenseData} sx={{ textTransform: 'none', borderRadius: '12px' }}>
                  {t('expenseApproval.voucher.refresh')}
                </Button>
              </Box>
              {currentAttachments.length ? (
                <List>
                  {currentAttachments.map((file, index) => (
                    <ListItem key={`${file}-${index}`} divider>
                      <ListItemText
                        primary={file}
                        secondary={
                          <a href={getUploadUrl(file)} target="_blank" rel="noreferrer">
                            {getUploadUrl(file)}
                          </a>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('expenseApproval.voucher.receiptNone')}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
              <Button variant="outlined" onClick={() => setViewMode('list')}>
                {t('common.cancel')}
              </Button>
              <Button variant="contained" onClick={handleSaveExpense} disabled={saving || isInitializingDraft}>
                {saving ? t('expenseApproval.voucher.submitSaving') : (isEdit ? t('expenseApproval.voucher.submit') : t('expenseApproval.voucher.create'))}
              </Button>
            </Box>
        </Paper>

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
              <Typography variant="caption" color="text.secondary">
                {qrUrl}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrOpen(false)}>{t('common.close')}</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  if (viewMode === 'view' && selectedExpense) {
    const approvedById = selectedExpense.itemMeta?.approvedById
      ? Number(selectedExpense.itemMeta.approvedById)
      : null;
    const isRequester = user?.id === selectedExpense.requesterId;
    const isFinalApprover =
      user?.role === 'admin' ||
      user?.role === 'root' ||
      (approvedById !== null && user?.id === approvedById);
    const isPaymentOfficer = hasTransferAccess;
    const isPaymentRequested = selectedExpense.paymentRequestStatus === 'requested';
    const isPaymentApproved = selectedExpense.paymentRequestStatus === 'approved';
    const isPaymentPaid = selectedExpense.paymentRequestStatus === 'paid';

    return (
      <Box sx={{ 
        p: 0,
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
          <Typography variant="pageTitle" component="h1" sx={{ fontWeight: 600, letterSpacing: '-0.022em' }}>
            {t('expenseApproval.detail.title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => setViewMode('list')}
              sx={{ textTransform: 'none', borderRadius: '12px' }}
            >
              {t('expenseApproval.actions.backToList')}
            </Button>
            <Button
              variant="contained"
              disableElevation
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => handleEditExpense(selectedExpense)}
              sx={{ textTransform: 'none', borderRadius: '12px', px: 2 }}
            >
              {t('expenseApproval.actions.editDetail')}
            </Button>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedExpense.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  {t('expenseApproval.detail.expenseNo')}: {selectedExpense.expenseId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedExpense.status)}
                  {getPriorityChip(selectedExpense.priority)}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" color="primary.main">
                  {selectedExpense.currency} {selectedExpense.totalAmount.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedExpense.currency}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 신청자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('expenseApproval.detail.requesterInfo')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedExpense.requesterName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedExpense.requesterPosition} • {selectedExpense.requesterDepartment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 지출 목적 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('expenseApproval.detail.purpose')}</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  {selectedExpense.purpose}
                </Typography>
              </Card>
            </Box>

            {/* 지출 항목 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('expenseApproval.detail.items')}</Typography>
              <TableContainer>
                <Table>
                  <TableHead
                    sx={{
                      bgcolor: 'background.paper',
                      '& .MuiTableCell-head': {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                        borderBottom: '2px solid',
                        borderColor: 'primary.main',
                        py: 1.25
                      }
                    }}
                  >
                    <TableRow>
                      <TableCell>{t('expenseApproval.detail.columns.invoiceDate')}</TableCell>
                      <TableCell>{t('expenseApproval.detail.columns.description')}</TableCell>
                      <TableCell align="right">{t('expenseApproval.detail.columns.qty')}</TableCell>
                      <TableCell align="right">{t('expenseApproval.detail.columns.unitPrice')}</TableCell>
                      <TableCell align="right">{t('expenseApproval.detail.columns.amount')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedExpense.items.map((item) => (
                      <TableRow key={item.id || item.description}>
                        <TableCell>{item.invoiceDate || '-'}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.qty}</TableCell>
                        <TableCell align="right">{(item.unitPrice ?? item.amount ?? 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(item.total ?? item.amount ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 승인 흐름 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>{t('expenseApproval.detail.approvalFlow')}</Typography>
              <Stepper orientation="vertical">
                {selectedExpense.approvalFlow.map((step, index) => (
                  <Step key={step.id} active={step.status === 'pending'} completed={step.status === 'approved'}>
                    <StepLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {step.approverName} ({step.approverPosition})
                        </Typography>
                        {step.status === 'approved' && <CheckCircleIcon color="success" />}
                        {step.status === 'rejected' && <CancelIcon color="error" />}
                        {step.status === 'pending' && <PendingIcon color="warning" />}
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.approverDepartment}
                      </Typography>
                      {step.comment && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          "{step.comment}"
                        </Typography>
                      )}
                      {step.approvedAt && (
                        <Typography variant="caption" color="text.secondary">
                          {step.approvedAt}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* 첨부파일 */}
            {selectedExpense.attachments.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{t('expenseApproval.detail.attachments')}</Typography>
                <List>
                  {selectedExpense.attachments.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={file} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* 메모 */}
            {selectedExpense.notes && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{t('expenseApproval.detail.notes')}</Typography>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedExpense.notes}
                  </Typography>
                </Card>
              </Box>
            )}

            {(selectedExpense.paymentApprovedReason ||
              selectedExpense.paymentRejectedReason ||
              selectedExpense.paymentApprovedAt ||
              selectedExpense.paymentRejectedAt) && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>{t('expenseApproval.detail.paymentProcessing')}</Typography>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  {selectedExpense.paymentApprovedAt && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {t('expenseApproval.detail.paymentApprovedLine', {
                        datetime: new Date(selectedExpense.paymentApprovedAt).toLocaleString(dateLocale),
                        user: getUserNameById(selectedExpense.paymentApprovedBy),
                      })}
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
                        user: getUserNameById(selectedExpense.paymentRejectedBy),
                      })}
                    </Typography>
                  )}
                  {selectedExpense.paymentRejectedReason && (
                    <Typography variant="body2">
                      {t('expenseApproval.detail.paymentRejectedReason', { reason: selectedExpense.paymentRejectedReason })}
                    </Typography>
                  )}
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>{t('expenseApproval.detailActions.transferBank')}</InputLabel>
                <Select
                  label={t('expenseApproval.detailActions.transferBank')}
                  value={bankProvider}
                  onChange={(e) => setBankProvider(e.target.value as 'icici' | 'kotak')}
                >
                  <MenuItem value="icici">ICICI</MenuItem>
                  <MenuItem value="kotak">KOTAK</MenuItem>
                </Select>
              </FormControl>
              {isRequester && !isPaymentRequested && !isPaymentApproved && !isPaymentPaid && (
                <Button
                  variant="outlined"
                  startIcon={<SendIcon />}
                  onClick={() => handleRequestPayment(selectedExpense.id)}
                >
                  {t('expenseApproval.detailActions.requestPayment')}
                </Button>
              )}
              {isFinalApprover && isPaymentRequested && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => openReasonDialog('payment-reject', selectedExpense.id)}
                >
                  {t('expenseApproval.actions.reject')}
                </Button>
              )}
              {isFinalApprover && isPaymentRequested && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => openReasonDialog('payment-approve', selectedExpense.id)}
                >
                  {t('expenseApproval.detailActions.finalApprove')}
                </Button>
              )}
              {isPaymentOfficer && isPaymentApproved && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleCompletePayment(selectedExpense.id)}
                >
                  {t('expenseApproval.detailActions.executePayment')}
                </Button>
              )}
              {isPaymentOfficer && selectedExpense.bankTransferStatus === 'failed' && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => handleRetryTransfer(selectedExpense.id)}
                >
                  {t('expenseApproval.detailActions.retryTransfer')}
                </Button>
              )}
              {(selectedExpense.bankTransferStatus || (selectedExpense.bankTransferLogs || []).length > 0) && (
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
              >
                {t('expenseApproval.detailActions.print')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                {t('expenseApproval.detailActions.pdfDownload')}
              </Button>
              {selectedExpense.status === 'in_review' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleApproveExpense(selectedExpense.id)}
                  >
                    {t('expenseApproval.actions.approve')}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleRejectExpense(selectedExpense.id)}
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
                <Button variant="outlined" onClick={closeReasonDialog}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="contained"
                  color={reasonDialogType === 'payment-approve' ? 'success' : 'error'}
                  onClick={handleReasonSubmit}
                >
                  {reasonDialogType === 'payment-approve' ? t('expenseApproval.actions.approve') : t('expenseApproval.actions.reject')}
                </Button>
              </DialogActions>
            </Dialog>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 0,
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="pageTitle" component="h1" sx={{ fontWeight: 600, letterSpacing: '-0.022em' }}>
          {t('expenseApproval.title')}
        </Typography>
        <Button
          variant="contained"
          disableElevation
          startIcon={<AddIcon fontSize="small" />}
          onClick={handleCreateExpense}
          sx={{ borderRadius: '12px', textTransform: 'none' }}
        >
          {t('expenseApproval.actions.requestExpense')}
        </Button>
      </Box>

      <Tabs
        value={listTab}
        onChange={(_, value) => setListTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab label={t('expenseApproval.tabs.written')} value="written" />
        <Tab label={t('expenseApproval.tabs.received')} value="received" />
        {hasTransferAccess && <Tab label={t('expenseApproval.tabs.transfer')} value="transfer" />}
      </Tabs>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('expenseApproval.summary.totalExpense')}
            </Typography>
            <Typography variant="h4">
              {totalExpenseAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('expenseApproval.summary.approvedAmount')}
            </Typography>
            <Typography variant="h4" color="success.main">
              {approvedAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('expenseApproval.summary.pendingAmount')}
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('expenseApproval.summary.urgentRequests')}
            </Typography>
            <Typography variant="h4" color="error.main">
              {urgentCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'minmax(180px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) auto',
              },
              gap: 2,
              alignItems: 'flex-end',
              ...mvsSearchFieldSx,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={expenseFilterLabelSx}>
                {t('expenseApproval.placeholders.searchSimple')}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={t('expenseApproval.placeholders.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 40,
                    '& .MuiOutlinedInput-input': { py: 0 },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={expenseFilterLabelSx}>
                {t('expenseApproval.filters.status')}
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                  sx={expenseFilterSelectSx}
                >
                  <MenuItem value="">{t('expenseApproval.filters.all')}</MenuItem>
                  <MenuItem value="draft">{t('expenseApproval.status.draft')}</MenuItem>
                  <MenuItem value="submitted">{t('expenseApproval.status.submitted')}</MenuItem>
                  <MenuItem value="in_review">{t('expenseApproval.status.inReview')}</MenuItem>
                  <MenuItem value="approved">{t('expenseApproval.status.approved')}</MenuItem>
                  <MenuItem value="rejected">{t('expenseApproval.status.rejected')}</MenuItem>
                  <MenuItem value="paid">{t('expenseApproval.status.paid')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={expenseFilterLabelSx}>
                {t('expenseApproval.filters.priority')}
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  displayEmpty
                  sx={expenseFilterSelectSx}
                >
                  <MenuItem value="">{t('expenseApproval.filters.all')}</MenuItem>
                  <MenuItem value="low">{t('expenseApproval.priority.low')}</MenuItem>
                  <MenuItem value="medium">{t('expenseApproval.priority.medium')}</MenuItem>
                  <MenuItem value="high">{t('expenseApproval.priority.high')}</MenuItem>
                  <MenuItem value="urgent">{t('expenseApproval.priority.urgent')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="caption"
                sx={{ ...expenseFilterLabelSx, visibility: 'hidden', userSelect: 'none' }}
                aria-hidden
              >
                {t('expenseApproval.actions.reset')}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                sx={{
                  height: 40,
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content',
                  px: 2,
                  borderRadius: '12px',
                  textTransform: 'none',
                }}
              >
                {t('expenseApproval.actions.reset')}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 지출결의서 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead
              sx={{
                bgcolor: 'background.paper',
                '& .MuiTableCell-head': {
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  letterSpacing: 'normal',
                  borderBottom: '2px solid',
                  borderColor: 'primary.main',
                  py: 1.25
                },
                '& .MuiTableCell-head:last-of-type': {
                  textAlign: 'center'
                }
              }}
            >
              <TableRow>
                <TableCell>{t('expenseApproval.columns.expenseInfo')}</TableCell>
                <TableCell>{t('expenseApproval.columns.requester')}</TableCell>
                <TableCell>{t('expenseApproval.columns.amount')}</TableCell>
                <TableCell>{t('expenseApproval.columns.status')}</TableCell>
                <TableCell>{t('expenseApproval.columns.priority')}</TableCell>
                <TableCell>{t('expenseApproval.columns.submittedAt')}</TableCell>
                <TableCell>{t('expenseApproval.columns.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedExpenses.map((expense) => (
                <TableRow
                  key={expense.id}
                  hover
                  onClick={() => handleViewExpense(expense)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {expense.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {expense.expenseId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {expense.requesterName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {expense.requesterDepartment}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {expense.currency} {expense.totalAmount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(expense.status)}</TableCell>
                  <TableCell>{getPriorityChip(expense.priority)}</TableCell>
                  <TableCell>{expense.submittedAt}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
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
                      {expense.status === 'in_review' && (
                        <>
                          <Tooltip title={t('expenseApproval.actions.approve')}>
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
                              onClick={() => handleRejectExpense(expense.id)}
                              color="error"
                              sx={{ borderRadius: '10px' }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title={t('common.delete')}>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteExpense(expense.id)}
                          sx={{
                            color: 'text.secondary',
                            borderRadius: '10px',
                            '&:hover': { color: 'error.main', bgcolor: (theme) => `${theme.palette.error.main}14` },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 페이지네이션 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination
            count={Math.ceil(filteredExpenses.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 스낵바 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Dialog open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('expenseApproval.dialog.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('expenseApproval.dialog.deleteMessage')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteExpense}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseApproval;
