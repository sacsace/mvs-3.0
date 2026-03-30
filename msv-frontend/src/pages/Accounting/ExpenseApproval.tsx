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
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
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
import { accountingService, API_BASE_URL, userService, partnerService, companyService } from '../../services/api';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';

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

const ExpenseApproval: React.FC = () => {
  const { t, i18n } = useTranslation();
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
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
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
  const [companyLogo, setCompanyLogo] = useState<string>('');

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
      try {
        const response = await userService.getUsers();
        if (response?.success && Array.isArray(response.data)) {
          const options = response.data.map((item: any) => ({
            id: item.id,
            name: item.username || item.userid || `User ${item.id}`
          }));
          setApprovers(options);
        }
      } catch (loadError) {
        console.error('승인자 목록 로드 오류:', loadError);
      }
    };
    loadApprovers();
  }, []);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const response = await partnerService.getPartners();
        if (response?.success && Array.isArray(response.data)) {
          setPartners(response.data);
        }
      } catch (loadError) {
        console.error('파트너 목록 로드 오류:', loadError);
      }
    };
    loadPartners();
  }, []);

  useEffect(() => {
    const loadCompanyLogo = async () => {
      if (!user?.company_id) return;
      try {
        const response = await companyService.getCompany(user.company_id);
        if (response?.success && response.data?.company_logo) {
          setCompanyLogo(response.data.company_logo);
        }
      } catch (error) {
        console.error('회사 로고 로드 오류:', error);
      }
    };
    loadCompanyLogo();
  }, [user?.company_id]);

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
        setQrImageError('QR 코드를 생성하지 못했습니다.');
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
      setAutoSaveStatus(t('expenseApproval.success.draftCreated'));
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
          setAutoSaveStatus('자동 저장됨');
          lastSavedPayloadRef.current = payloadString;
        }
      } catch (autoSaveError) {
        console.error('자동 저장 오류:', autoSaveError);
        setAutoSaveStatus('자동 저장 실패');
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
    setAutoSaveStatus('');
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
        throw new Error(response?.message || '제출 실패');
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
        throw new Error(response?.message || '토큰 발급 실패');
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
        throw new Error(response?.message || '영수증 업로드 실패');
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
        throw new Error(response.message || '삭제 실패');
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
        throw new Error(response?.message || '결제 요청 실패');
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
        throw new Error(response?.message || '결제 완료 처리 실패');
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
        throw new Error(response?.message || '송금 재시도 실패');
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
        throw new Error(response?.message || '최종 승인 실패');
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
        throw new Error(response?.message || '반려 실패');
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
        p: 3,
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            {isEdit ? t('expenseApproval.form.editTitle') : t('expenseApproval.form.createTitle')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {autoSaveStatus && (
              <Typography variant="body2" color="text.secondary">
                {autoSaveStatus}
              </Typography>
            )}
            <Button variant="outlined" onClick={() => setViewMode('list')}>
              {t('expenseApproval.actions.backToList')}
            </Button>
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: 'divider', bgcolor: 'background.paper' }}>
            {saving && <LinearProgress sx={{ mb: 2 }} />}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight={700}>{t('expenseApproval.title')}</Typography>
                <Typography variant="body2" color="text.secondary">Payment Voucher</Typography>
                <Box sx={{ mt: 1 }}>
                  <img
                    src={companyLogo}
                    alt="Company logo"
                    style={{ height: 32, objectFit: 'contain' }}
                  />
                </Box>
              </Box>
              <Box sx={{ minWidth: 360 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ p: 1, borderRight: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">PREPARED</Typography>
                    <TextField
                      value={user?.username || ''}
                      size="small"
                      inputProps={{ readOnly: true }}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">APPROVED</Typography>
                    <Autocomplete
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
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.75, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>기본 정보</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                <Box>
                  <Typography variant="caption">제목</Typography>
                  <TextField
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">지출 목적</Typography>
                  <TextField
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    required
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </Box>
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption">{t('expenseApproval.filters.priority')}</Typography>
                    <FormControl fullWidth>
                      <Select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        size="small"
                      >
                        <MenuItem value="low">낮음</MenuItem>
                        <MenuItem value="medium">보통</MenuItem>
                        <MenuItem value="high">높음</MenuItem>
                        <MenuItem value="urgent">긴급</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Typography variant="caption">작성날자</Typography>
                    <TextField
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.75, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>대금을 받는 협력업체</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                <Box>
                  <Typography variant="caption">협력업체</Typography>
                  <Autocomplete
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
                  <Typography variant="caption">Payment Voucher Number</Typography>
                  <TextField
                    value={voucherData.voucherNo}
                    onChange={(e) => setVoucherData({ ...voucherData, voucherNo: e.target.value })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">GST 번호</Typography>
                  <TextField
                    value={voucherData.gstNumber}
                    onChange={(e) => setVoucherData({ ...voucherData, gstNumber: e.target.value })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">전표 일자</Typography>
                  <TextField
                    type="date"
                    value={voucherData.voucherDate}
                    onChange={(e) => setVoucherData({ ...voucherData, voucherDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">계좌 예금주</Typography>
                  <TextField
                    value={voucherData.acHolder}
                    onChange={(e) => setVoucherData({ ...voucherData, acHolder: e.target.value })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">은행명</Typography>
                  <TextField
                    value={voucherData.bank}
                    onChange={(e) => setVoucherData({ ...voucherData, bank: e.target.value })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">계좌 번호</Typography>
                  <TextField
                    value={voucherData.accountNumber}
                    onChange={(e) => setVoucherData({ ...voucherData, accountNumber: e.target.value })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">IFSC 코드</Typography>
                  <TextField
                    value={voucherData.ifsc}
                    onChange={(e) => setVoucherData({ ...voucherData, ifsc: e.target.value })}
                    fullWidth
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.75, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>항목</Typography>
              </Box>
              <TableContainer component={Paper} sx={{ mb: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>No.</TableCell>
                    <TableCell>Invoice Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
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
                          inputRef={setInputRef(item.id, 'invoiceDate')}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                          onKeyDown={handleLineItemKeyDown(item.id, 'description', index)}
                          size="small"
                          fullWidth
                          placeholder="Description"
                          inputRef={setInputRef(item.id, 'description')}
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
                          placeholder="Qty"
                          inputRef={setInputRef(item.id, 'qty')}
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
                          placeholder="Unit Price"
                          inputRef={setInputRef(item.id, 'unitPrice')}
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
                        항목을 추가해주세요.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </TableContainer>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddLineItem}>
                항목 추가
              </Button>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.75, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>세금/합계</Typography>
              </Box>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <Box>
                  <Typography variant="caption">Total Amount (A)</Typography>
                  <TextField
                    value={subtotalAmount.toFixed(2)}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">IGST (B) %</Typography>
                  <TextField
                    type="number"
                    value={voucherData.igstRate}
                    onChange={(e) => setVoucherData({ ...voucherData, igstRate: Number(e.target.value || 0) })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">IGST (B) Amount</Typography>
                  <TextField
                    value={igstAmount.toFixed(2)}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">CGST (C) %</Typography>
                  <TextField
                    type="number"
                    value={voucherData.cgstRate}
                    onChange={(e) => setVoucherData({ ...voucherData, cgstRate: Number(e.target.value || 0) })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">CGST (C) Amount</Typography>
                  <TextField
                    value={cgstAmount.toFixed(2)}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">SGST (D) %</Typography>
                  <TextField
                    type="number"
                    value={voucherData.sgstRate}
                    onChange={(e) => setVoucherData({ ...voucherData, sgstRate: Number(e.target.value || 0) })}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">SGST (D) Amount</Typography>
                  <TextField
                    value={sgstAmount.toFixed(2)}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={voucherData.tdsEnabled}
                      onChange={(e) => setVoucherData({ ...voucherData, tdsEnabled: e.target.checked })}
                    />
                  }
                  label="TDS 적용"
                />
                <Box>
                  <Typography variant="caption">TDS (E) %</Typography>
                  <TextField
                    type="number"
                    value={voucherData.tdsRate}
                    onChange={(e) => setVoucherData({ ...voucherData, tdsRate: Number(e.target.value || 0) })}
                    disabled={!voucherData.tdsEnabled}
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="caption">TOTAL (A+B+C+D)-E</Typography>
                  <TextField
                    value={totalAmount.toFixed(2)}
                    InputProps={{ readOnly: true }}
                    fullWidth
                  />
                </Box>
              </Box>
            </Box>

            <TextField
              label="Remarks if any"
              value={voucherData.remarks}
              onChange={(e) => setVoucherData({ ...voucherData, remarks: e.target.value })}
              fullWidth
              multiline
              minRows={3}
              sx={{ mt: 2 }}
            />

            <TextField
              label="비고"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 1.5 }}
            />

            {companyLogo && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <img
                  src={companyLogo}
                  alt="Company logo"
                  style={{ height: 40, objectFit: 'contain' }}
                />
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2, mb: 2 }}>
              <Box sx={{ bgcolor: 'grey.100', px: 1.5, py: 0.75, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>영수증 첨부</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Button variant="outlined" startIcon={<QrCodeIcon />} onClick={handleOpenQr} disabled={qrLoading}>
                  {qrLoading ? 'QR 생성 중...' : '휴대폰으로 영수증 올리기'}
                </Button>
                <Button variant="outlined" component="label" disabled={uploadingReceipts}>
                  {uploadingReceipts ? '업로드 중...' : '파일 첨부'}
                  <input
                    hidden
                    multiple
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleUploadReceipts(e.target.files)}
                  />
                </Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadExpenseData}>
                  새로고침
                </Button>
              </Box>
              {currentAttachments.length ? (
                <List>
                  {currentAttachments.map((file, index) => (
                    <ListItem key={`${file}-${index}`} divider>
                      <ListItemText
                        primary={file}
                        secondary={
                          <a href={`${apiBaseUrl}/uploads/${file}`} target="_blank" rel="noreferrer">
                            {`${apiBaseUrl}/uploads/${file}`}
                          </a>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  첨부된 영수증이 없습니다.
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
              <Button variant="outlined" onClick={() => setViewMode('list')}>
                취소
              </Button>
              <Button variant="contained" onClick={handleSaveExpense} disabled={saving || isInitializingDraft}>
                {saving ? '제출 중...' : (isEdit ? '제출' : '작성')}
              </Button>
            </Box>
        </Paper>

        <Dialog open={qrOpen} onClose={() => setQrOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('expenseApproval.dialog.uploadByPhoneTitle')}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              휴대폰에서 QR 코드를 스캔하고 영수증 사진을 업로드하세요.
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
                QR 코드 생성 중...
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
            <Button onClick={() => setQrOpen(false)}>닫기</Button>
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
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            {t('expenseApproval.detail.title')}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
          >
            {t('expenseApproval.actions.backToList')}
          </Button>
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
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice Date</TableCell>
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
                <Typography variant="h6" gutterBottom>첨부파일</Typography>
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
                <Typography variant="h6" gutterBottom>메모</Typography>
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
                <Typography variant="h6" gutterBottom>결제 처리 사유</Typography>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  {selectedExpense.paymentApprovedAt && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      승인: {new Date(selectedExpense.paymentApprovedAt).toLocaleString('ko-KR')} · {getUserNameById(selectedExpense.paymentApprovedBy)}
                    </Typography>
                  )}
                  {selectedExpense.paymentApprovedReason && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      승인 사유: {selectedExpense.paymentApprovedReason}
                    </Typography>
                  )}
                  {selectedExpense.paymentRejectedAt && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      반려: {new Date(selectedExpense.paymentRejectedAt).toLocaleString('ko-KR')} · {getUserNameById(selectedExpense.paymentRejectedBy)}
                    </Typography>
                  )}
                  {selectedExpense.paymentRejectedReason && (
                    <Typography variant="body2">
                      반려 사유: {selectedExpense.paymentRejectedReason}
                    </Typography>
                  )}
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>송금 은행</InputLabel>
                <Select
                  label="송금 은행"
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
                  결제 요청
                </Button>
              )}
              {isFinalApprover && isPaymentRequested && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => openReasonDialog('payment-reject', selectedExpense.id)}
                >
                  반려
                </Button>
              )}
              {isFinalApprover && isPaymentRequested && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => openReasonDialog('payment-approve', selectedExpense.id)}
                >
                  최종 승인
                </Button>
              )}
              {isPaymentOfficer && isPaymentApproved && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleCompletePayment(selectedExpense.id)}
                >
                  결제 실행
                </Button>
              )}
              {isPaymentOfficer && selectedExpense.bankTransferStatus === 'failed' && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => handleRetryTransfer(selectedExpense.id)}
                >
                  송금 재시도
                </Button>
              )}
              {(selectedExpense.bankTransferStatus || (selectedExpense.bankTransferLogs || []).length > 0) && (
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => navigate(`/accounting/expense/transfer-log/${selectedExpense.id}`)}
                >
                  송금 로그
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditExpense(selectedExpense)}
              >
                수정
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                인쇄
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                PDF 다운로드
              </Button>
              {selectedExpense.status === 'in_review' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleApproveExpense(selectedExpense.id)}
                  >
                    승인
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleRejectExpense(selectedExpense.id)}
                  >
                    반려
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
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          {t('expenseApproval.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateExpense}
          sx={{ borderRadius: 2 }}
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
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <Box>
              <InputLabel
                shrink
                sx={{
                  visibility: 'hidden',
                  position: 'static',
                  transform: 'none',
                  mb: 0.5,
                  fontSize: '0.875rem'
                }}
              >
                placeholder
              </InputLabel>
              <TextField
                fullWidth
                size="small"
                placeholder={t('expenseApproval.placeholders.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { height: '40px' } }}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel
                shrink
                sx={{
                  position: 'static',
                  transform: 'none',
                  mb: 0.5,
                  color: 'text.secondary',
                  fontSize: '0.8rem'
                }}
              >
                {t('expenseApproval.filters.status')}
              </InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                sx={{ height: '40px' }}
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
            <FormControl fullWidth>
              <InputLabel
                shrink
                sx={{
                  position: 'static',
                  transform: 'none',
                  mb: 0.5,
                  color: 'text.secondary',
                  fontSize: '0.8rem'
                }}
              >
                {t('expenseApproval.filters.priority')}
              </InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                displayEmpty
                sx={{ height: '40px' }}
              >
                <MenuItem value="">{t('expenseApproval.filters.all')}</MenuItem>
                <MenuItem value="low">{t('expenseApproval.priority.low')}</MenuItem>
                <MenuItem value="medium">{t('expenseApproval.priority.medium')}</MenuItem>
                <MenuItem value="high">{t('expenseApproval.priority.high')}</MenuItem>
                <MenuItem value="urgent">{t('expenseApproval.priority.urgent')}</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <InputLabel
                shrink
                sx={{
                  visibility: 'hidden',
                  position: 'static',
                  transform: 'none',
                  mb: 0.5,
                  fontSize: '0.875rem'
                }}
              >
                placeholder
              </InputLabel>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                sx={{ height: '40px' }}
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
            <TableHead>
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
                <TableRow key={expense.id} hover>
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
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={t('expenseApproval.actions.view')}>
                        <IconButton size="small" onClick={() => handleViewExpense(expense)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {listTab === 'transfer' && (
                        <Tooltip title={t('expenseApproval.actions.transferLog')}>
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/accounting/expense/transfer-log/${expense.id}`)}
                          >
                            <PendingIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => handleEditExpense(expense)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {expense.status === 'in_review' && (
                        <>
                          <Tooltip title={t('expenseApproval.actions.approve')}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleApproveExpense(expense.id)}
                              color="success"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('expenseApproval.actions.reject')}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleRejectExpense(expense.id)}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title={t('common.delete')}>
                        <IconButton size="small" onClick={() => handleDeleteExpense(expense.id)}>
                          <DeleteIcon />
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
