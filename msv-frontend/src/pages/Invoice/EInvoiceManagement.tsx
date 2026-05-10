import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  ReceiptLong as ReceiptLongIcon,
  Add as AddIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  LocalShipping as LocalShippingIcon,
  Security as SecurityIcon,
  Verified as VerifiedIcon,
  Gavel as GavelIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useStore } from '../../store';
import { api, userService, accountingService } from '../../services/api';
import { AxiosResponse } from 'axios';
import { useTranslation } from 'react-i18next';

// TabPanel 컴포넌트 정의
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// 타입 정의
interface EInvoice {
  id: string;
  invoiceNumber: string;
  irn: string; // Invoice Registration Number
  qrCode: string;
  seller: {
    id: string;
    name: string;
    gstin: string;
    address: string;
    phone: string;
    email: string;
  };
  buyer: {
    id: string;
    name: string;
    gstin: string;
    address: string;
    phone: string;
    email: string;
  };
  items: Array<{
    id: string;
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    cessRate: number;
    cessAmount: number;
  }>;
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  totalAmount: number;
  transactionType: 'B2B' | 'B2C' | 'Export' | 'SEZ';
  /** NIC Invoice Registration Portal 처리 상태 */
  irpStatus: 'draft' | 'submitted' | 'irn_generated' | 'failed';
  gstAckNo: string;
  gstAckDate: string;
  irpLastError: string;
  status: 'draft' | 'generated' | 'uploaded' | 'cancelled';
  issueDate: string;
  dueDate: string;
  notes: string;
  terms: string;
  proformaInvoiceId?: string;
  ewayBillId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvalStatus?: string | null;
  approverUserId?: number;
  approverName?: string;
  createdByUserId?: number;
}

interface ProformaInvoice {
  id: string;
  invoiceNumber: string;
  customer?: {
    name: string;
    gstin?: string;
    address?: string;
  };
  customer_name?: string;
  totalAmount: number;
  status: string;
}

const EInvoiceManagement: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useStore();
  const [einvoices, setEinvoices] = useState<EInvoice[]>([]);
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedEInvoice, setSelectedEInvoice] = useState<EInvoice | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [irnLoadingId, setIrnLoadingId] = useState<string | null>(null);
  const [listSubTab, setListSubTab] = useState<'requested' | 'pending'>('requested');
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: number; username: string; email: string }>>([]);
  const [proformaApproverId, setProformaApproverId] = useState<number | ''>('');

  const normalizeParty = (party: any, fallbackName: string) => ({
    id: String(party?.id ?? ''),
    name: String(party?.name ?? party?.customer_name ?? party?.customerName ?? fallbackName),
    gstin: String(party?.gstin ?? party?.business_number ?? ''),
    address: String(party?.address ?? ''),
    phone: String(party?.phone ?? ''),
    email: String(party?.email ?? '')
  });

  const normalizeInvoiceItems = (items: any[] = []) =>
    items.map((item, index) => ({
      id: String(item?.id ?? `item-${index}`),
      description: String(item?.description ?? item?.item_name ?? t('eInvoiceManagement.defaults.item')),
      hsnCode: String(item?.hsnCode ?? item?.hsn_sac ?? ''),
      quantity: Number(item?.quantity ?? 1),
      unit: String(item?.unit ?? ''),
      unitPrice: Number(item?.unit_price ?? item?.unitPrice ?? 0),
      total: Number(item?.total_price ?? item?.total ?? 0),
      cgstRate: Number(item?.cgstRate ?? 0),
      cgstAmount: Number(item?.cgstAmount ?? 0),
      sgstRate: Number(item?.sgstRate ?? 0),
      sgstAmount: Number(item?.sgstAmount ?? 0),
      igstRate: Number(item?.igstRate ?? 0),
      igstAmount: Number(item?.igstAmount ?? 0),
      cessRate: Number(item?.cessRate ?? 0),
      cessAmount: Number(item?.cessAmount ?? 0)
    }));

  const normalizeEInvoice = (raw: any): EInvoice => {
    const customer = raw?.customer ?? null;
    const buyer = normalizeParty(customer, t('eInvoiceManagement.defaults.unspecified'));
    const seller = normalizeParty(
      companies.find((company) => company.id === raw?.company_id),
      t('eInvoiceManagement.defaults.company')
    );
    const gstIrn = String(raw?.gst_irn ?? '');
    const irpStatus = (raw?.irp_status ?? 'draft') as EInvoice['irpStatus'];
    return {
      id: String(raw?.id ?? ''),
      invoiceNumber: String(raw?.invoice_number ?? raw?.invoiceNumber ?? ''),
      irn: gstIrn,
      qrCode: String(raw?.signed_qr_code ?? raw?.qr_code ?? ''),
      seller,
      buyer,
      items: normalizeInvoiceItems(raw?.items ?? []),
      subtotal: Number(raw?.subtotal ?? 0),
      cgstTotal: Number(raw?.cgst_total ?? 0),
      sgstTotal: Number(raw?.sgst_total ?? 0),
      igstTotal: Number(raw?.igst_total ?? 0),
      cessTotal: Number(raw?.cess_total ?? 0),
      totalAmount: Number(raw?.total_amount ?? 0),
      transactionType: (raw?.transaction_type ?? 'B2B') as EInvoice['transactionType'],
      irpStatus,
      gstAckNo: String(raw?.gst_ack_no ?? ''),
      gstAckDate: String(raw?.gst_ack_date ?? ''),
      irpLastError: String(raw?.irp_last_error ?? ''),
      status: (raw?.status ?? 'draft') as EInvoice['status'],
      issueDate: String(raw?.invoice_date ?? raw?.issueDate ?? raw?.created_at ?? ''),
      dueDate: String(raw?.due_date ?? raw?.dueDate ?? ''),
      notes: String(raw?.notes ?? ''),
      terms: String(raw?.terms ?? ''),
      proformaInvoiceId: raw?.proforma_invoice_id ? String(raw?.proforma_invoice_id) : undefined,
      ewayBillId: raw?.eway_bill_id ? String(raw?.eway_bill_id) : undefined,
      createdBy:
        raw?.creator?.username || raw?.creator?.email || String(raw?.created_by ?? ''),
      createdAt: String(raw?.created_at ?? ''),
      updatedAt: String(raw?.updated_at ?? ''),
      approvalStatus: raw?.approval_status ?? null,
      approverUserId: raw?.approver_user_id != null ? Number(raw.approver_user_id) : undefined,
      approverName: raw?.approver?.username || raw?.approver?.email || '',
      createdByUserId: raw?.created_by != null ? Number(raw.created_by) : undefined
    };
  };

  const normalizeProformaInvoice = (raw: any): ProformaInvoice => {
    const customer = raw?.customer ?? null;
    const customerName = customer?.name ?? raw?.customer_name ?? t('eInvoiceManagement.defaults.unspecified');
    return {
      id: String(raw?.id ?? ''),
      invoiceNumber: String(raw?.invoice_number ?? raw?.invoiceNumber ?? ''),
      customer: {
        name: String(customerName),
        gstin: String(customer?.gstin ?? ''),
        address: String(customer?.address ?? '')
      },
      customer_name: raw?.customer_name,
      totalAmount: Number(raw?.total_amount ?? raw?.totalAmount ?? 0),
      status: String(raw?.status ?? 'draft')
    };
  };

  // 폼 상태
  const [formData, setFormData] = useState({
    proformaInvoiceId: '',
    customerId: '',
    invoiceNumber: '',
    transactionType: 'B2B' as 'B2B' | 'B2C' | 'Export' | 'SEZ',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    subtotal: 0,
    taxAmount: 0,
    notes: '',
    terms: 'Payment due within 30 days of invoice date.',
    approverUserId: '' as number | ''
  });

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
          params.company_id = selectedCompanyId;
        }
        
        const [einvoicesResponse, proformaInvoicesResponse, customersResponse] = await Promise.all([
          api.get('/accounting/e-invoices', { params }),
          api.get('/accounting/proforma-invoices?status=accepted'),
          api.get('/customers')
        ]);

        if (einvoicesResponse.data.success) {
          const normalized = (einvoicesResponse.data.data || []).map((item: any) => normalizeEInvoice(item));
          setEinvoices(normalized);
        }
        if (proformaInvoicesResponse.data.success) {
          const normalized = (proformaInvoicesResponse.data.data || []).map((item: any) => normalizeProformaInvoice(item));
          setProformaInvoices(normalized);
        }
        if (customersResponse.data.success) {
          setCustomers(customersResponse.data.data || []);
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error);
        setError(t('eInvoiceManagement.errors.loadData'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    if (user?.role === 'root' || user?.role === 'audit') {
      loadCompanies();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- normalize*, t, user.role는 초기 로드 시점 기준
  }, [selectedCompanyId]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!user?.company_id) {
        setCompanyUsers([]);
        return;
      }
      try {
        const res = await userService.getUsers({ company_id: Number(user.company_id) });
        if (res?.success && Array.isArray(res.data)) {
          setCompanyUsers(
            res.data
              .filter((u: any) => u.status === 'active')
              .map((u: any) => ({ id: u.id, username: u.username || u.userid || '', email: u.email || '' }))
          );
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadUsers();
  }, [user?.company_id]);

  const loadCompanies = async () => {
    try {
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error) {
      console.error('회사 목록 로드 오류:', error);
    }
  };

  // 탭 변경
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const isEInvoiceExportAllowed = (e: EInvoice) =>
    !e.approvalStatus || e.approvalStatus === 'approved';

  // E-Invoice 생성
  const handleCreate = async () => {
    try {
      if (formData.approverUserId === '') {
        setError(t('eInvoiceManagement.errors.selectApprover'));
        return;
      }
      let response: AxiosResponse<any>;
      if (formData.proformaInvoiceId) {
        response = await api.post(
          `/accounting/proforma-invoices/${formData.proformaInvoiceId}/create-e-invoice`,
          {
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            notes: formData.notes,
            terms: formData.terms,
            transactionType: formData.transactionType,
            approver_user_id: Number(formData.approverUserId)
          }
        );
      } else {
        if (!formData.customerId) {
          setError(t('eInvoiceManagement.errors.selectProformaOrCustomer'));
          return;
        }
        const subtotal = Number(formData.subtotal || 0);
        const taxAmount = Number(formData.taxAmount || 0);
        const totalAmount = subtotal + taxAmount;
        response = await api.post('/accounting/e-invoices', {
          customer_id: Number(formData.customerId),
          invoice_number: formData.invoiceNumber?.trim() || undefined,
          invoice_date: formData.issueDate,
          due_date: formData.dueDate || formData.issueDate,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: formData.notes,
          status: 'draft',
          transaction_type: formData.transactionType,
          items: [],
          approver_user_id: Number(formData.approverUserId)
        });
      }
      if (response.data.success) {
        setEinvoices(prev => [normalizeEInvoice(response.data.data), ...prev]);
        setIsCreating(false);
        setFormData({
          proformaInvoiceId: '',
          customerId: '',
          invoiceNumber: '',
          transactionType: 'B2B',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          subtotal: 0,
          taxAmount: 0,
          notes: '',
          terms: 'Payment due within 30 days of invoice date.',
          approverUserId: ''
        });
        // 데이터 새로고침
        const params: any = {};
        if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
          params.company_id = selectedCompanyId;
        }
        const einvoicesResponse = await api.get('/accounting/e-invoices', { params });
        if (einvoicesResponse.data.success) {
          const normalized = (einvoicesResponse.data.data || []).map((item: any) => normalizeEInvoice(item));
          setEinvoices(normalized);
        }
      }
    } catch (error) {
      console.error('E-Invoice 생성 오류:', error);
      setError(t('eInvoiceManagement.errors.createEInvoice'));
    }
  };

  // 작성 취소
  const handleCancelCreate = () => {
    setIsCreating(false);
    setFormData({
      proformaInvoiceId: '',
      customerId: '',
      invoiceNumber: '',
      transactionType: 'B2B',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      subtotal: 0,
      taxAmount: 0,
      notes: '',
      terms: 'Payment due within 30 days of invoice date.',
      approverUserId: ''
    });
  };

  // 프로포마 인보이스에서 E-Invoice 생성
  const handleCreateFromProforma = async (proformaInvoiceId: string) => {
    try {
      if (proformaApproverId === '') {
        setError(t('eInvoiceManagement.errors.selectApprover'));
        return;
      }
      const response = await api.post(`/accounting/proforma-invoices/${proformaInvoiceId}/create-e-invoice`, {
        approver_user_id: Number(proformaApproverId)
      });
      if (response.data.success) {
        setEinvoices(prev => [normalizeEInvoice(response.data.data), ...prev]);
        setError('');
      }
    } catch (error) {
      console.error('프로포마 인보이스에서 E-Invoice 생성 오류:', error);
      setError(t('eInvoiceManagement.errors.createEInvoice'));
    }
  };

  // 상태 업데이트
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await api.put(`/accounting/e-invoices/${id}/status`, { status });
      if (response.data.success) {
        setEinvoices(prev => prev.map(einvoice => 
          einvoice.id === id ? { ...einvoice, status: status as any } : einvoice
        ));
      }
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
      setError(t('eInvoiceManagement.errors.updateStatus'));
    }
  };

  /** NIC IRP에 JSON 제출 → IRN / Signed QR (GST_IRP_MODE=live 시 GSP 연동) */
  const handleGenerateIrn = async (id: string) => {
    setIrnLoadingId(id);
    setError('');
    try {
      const response = await api.post(`/accounting/e-invoices/${id}/generate-irn`);
      if (response.data.success) {
        const normalized = normalizeEInvoice(response.data.data);
        setEinvoices((prev) => prev.map((e) => (e.id === id ? normalized : e)));
        setSelectedEInvoice((sel) => (sel?.id === id ? normalized : sel));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('eInvoiceManagement.errors.generateIrn');
      setError(msg);
    } finally {
      setIrnLoadingId(null);
    }
  };

  // E-Way Bill 생성
  const handleCreateEWayBill = async (eInvoiceId: string) => {
    try {
      const response = await api.post(`/accounting/e-invoices/${eInvoiceId}/create-eway-bill`);
      if (response.data.success) {
        setEinvoices(prev => prev.map(einvoice => 
          einvoice.id === eInvoiceId 
            ? { ...einvoice, ewayBillId: response.data.data.id }
            : einvoice
        ));
        setError('');
      }
    } catch (error) {
      console.error('E-Way Bill 생성 오류:', error);
      setError(t('eInvoiceManagement.errors.createEWayBill'));
    }
  };

  // E-Invoice 상세 보기
  const handleView = (einvoice: EInvoice) => {
    setSelectedEInvoice(einvoice);
    setOpenViewDialog(true);
  };

  // 상태 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'generated': return 'info';
      case 'uploaded': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // 상태 라벨 반환
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('eInvoiceManagement.status.draft');
      case 'generated': return t('eInvoiceManagement.status.generated');
      case 'uploaded': return t('eInvoiceManagement.status.uploaded');
      case 'cancelled': return t('eInvoiceManagement.status.cancelled');
      default: return status;
    }
  };

  const getIrpStatusLabel = (s: EInvoice['irpStatus']) => {
    switch (s) {
      case 'draft': return t('eInvoiceManagement.irpStatus.draft');
      case 'submitted': return t('eInvoiceManagement.irpStatus.submitted');
      case 'irn_generated': return t('eInvoiceManagement.irpStatus.irn_generated');
      case 'failed': return t('eInvoiceManagement.irpStatus.failed');
      default: return s;
    }
  };

  const getIrpStatusColor = (s: EInvoice['irpStatus']) => {
    switch (s) {
      case 'irn_generated': return 'success';
      case 'failed': return 'error';
      case 'submitted': return 'warning';
      default: return 'default';
    }
  };

  // 거래 유형 색상 반환
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'B2B': return 'primary';
      case 'B2C': return 'secondary';
      case 'Export': return 'success';
      case 'SEZ': return 'warning';
      default: return 'default';
    }
  };

  const filteredEInvoices = useMemo(() => {
    const uid = Number(user?.id);
    return einvoices.filter((einvoice) => {
      const matchesStatus = filterStatus === 'all' || einvoice.status === filterStatus;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        String(einvoice.invoiceNumber || '')
          .toLowerCase()
          .includes(search) ||
        String(einvoice.buyer?.name || '')
          .toLowerCase()
          .includes(search) ||
        String(einvoice.buyer?.gstin || '')
          .toLowerCase()
          .includes(search) ||
        String(einvoice.seller?.name || '')
          .toLowerCase()
          .includes(search) ||
        String(einvoice.seller?.gstin || '')
          .toLowerCase()
          .includes(search) ||
        String(einvoice.irn || '')
          .toLowerCase()
          .includes(search) ||
        String(einvoice.transactionType || '')
          .toLowerCase()
          .includes(search);
      const base = matchesStatus && matchesSearch;
      if (!base) return false;
      if (listSubTab === 'pending') {
        return (
          einvoice.approvalStatus === 'pending_approval' &&
          Number(einvoice.approverUserId) === uid
        );
      }
      return Number(einvoice.createdByUserId) === uid;
    });
  }, [einvoices, filterStatus, searchTerm, listSubTab, user?.id]);

  const handleApproveInvoice = async (id: string) => {
    try {
      const res = await accountingService.approveInvoice(Number(id));
      if (res?.success) {
        setError('');
        const params: any = {};
        if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
          params.company_id = selectedCompanyId;
        }
        const r = await api.get('/accounting/e-invoices', { params });
        if (r.data.success) {
          setEinvoices((r.data.data || []).map((item: any) => normalizeEInvoice(item)));
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('eInvoiceManagement.errors.updateStatus'));
    }
  };

  const handleRejectInvoice = async (id: string) => {
    try {
      const res = await accountingService.rejectInvoice(Number(id));
      if (res?.success) {
        setError('');
        const params: any = {};
        if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
          params.company_id = selectedCompanyId;
        }
        const r = await api.get('/accounting/e-invoices', { params });
        if (r.data.success) {
          setEinvoices((r.data.data || []).map((item: any) => normalizeEInvoice(item)));
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('eInvoiceManagement.errors.updateStatus'));
    }
  };

  return (
    <Box sx={{ p: 0 }}>
      <Typography
        component="h1"
        variant="pageTitle"
        sx={{
          fontWeight: 600,
          fontSize: { xs: '1.125rem', sm: '1.3125rem' },
          letterSpacing: '-0.022em',
          lineHeight: 1.28,
          color: 'text.primary',
          mb: 0.75,
        }}
      >
        {t('eInvoiceManagement.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.5, maxWidth: 720 }}>
        {t('eInvoiceManagement.description')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label={t('eInvoiceManagement.tabs.list')} />
              <Tab label={t('eInvoiceManagement.tabs.fromProforma')} />
              <Tab label={t('eInvoiceManagement.tabs.gstCompliance')} />
              <Tab label={t('eInvoiceManagement.tabs.analytics')} />
            </Tabs>
          </Box>

          {/* E-Invoice 목록 */}
          <TabPanel value={activeTab} index={0}>
            {isCreating ? (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">{t('eInvoiceManagement.create.title')}</Typography>
                    <Button
                      variant="outlined"
                      onClick={handleCancelCreate}
                    >
                      {t('common.cancel')}
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.selectProforma')}
                      </Typography>
                      <Select
                        value={formData.proformaInvoiceId}
                        onChange={(e) => setFormData(prev => ({ ...prev, proformaInvoiceId: e.target.value }))}
                        displayEmpty
                        renderValue={(value) => {
                          if (!value) return t('eInvoiceManagement.create.selectProforma');
                          const selected = proformaInvoices.find((item) => item.id === value);
                          const customerName = selected?.customer?.name || selected?.customer_name || t('eInvoiceManagement.defaults.unspecified');
                          return selected ? `${selected.invoiceNumber} - ${customerName}` : String(value);
                        }}
                      >
                        <MenuItem value="">{t('eInvoiceManagement.create.none')}</MenuItem>
                        {proformaInvoices.map((proformaInvoice) => (
                          <MenuItem key={proformaInvoice.id} value={proformaInvoice.id}>
                            {proformaInvoice.invoiceNumber} - {(proformaInvoice.customer?.name || proformaInvoice.customer_name || t('eInvoiceManagement.defaults.unspecified'))}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.selectCustomer')}
                      </Typography>
                      <Select
                        value={formData.customerId}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                        displayEmpty
                        renderValue={(value) => {
                          if (!value) return t('eInvoiceManagement.create.selectCustomer');
                          const selected = customers.find((item) => String(item.id) === String(value));
                          return selected ? selected.name : String(value);
                        }}
                      >
                        <MenuItem value="">{t('eInvoiceManagement.create.none')}</MenuItem>
                        {customers.map((customer) => (
                          <MenuItem key={customer.id} value={String(customer.id)}>
                            {customer.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.invoiceNumberOptional')}
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder={t('eInvoiceManagement.create.invoiceNumberPlaceholder')}
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      />
                    </Box>
                    
                    <FormControl fullWidth>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.transactionType')}
                      </Typography>
                      <Select
                        value={formData.transactionType}
                        onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value as any }))}
                        displayEmpty
                      >
                        <MenuItem value="B2B">{t('eInvoiceManagement.transactionType.b2b')}</MenuItem>
                        <MenuItem value="B2C">{t('eInvoiceManagement.transactionType.b2c')}</MenuItem>
                        <MenuItem value="Export">{t('eInvoiceManagement.transactionType.export')}</MenuItem>
                        <MenuItem value="SEZ">{t('eInvoiceManagement.transactionType.sez')}</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.issueDate')}
                      </Typography>
                      <TextField
                        fullWidth
                        type="date"
                        value={formData.issueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.dueDate')}
                      </Typography>
                      <TextField
                        fullWidth
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.subtotal')}
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        value={formData.subtotal}
                        onChange={(e) => setFormData(prev => ({ ...prev, subtotal: Number(e.target.value || 0) }))}
                      />
                    </Box>

                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.taxAmount')}
                      </Typography>
                      <TextField
                        fullWidth
                        type="number"
                        value={formData.taxAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, taxAmount: Number(e.target.value || 0) }))}
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.notes')}
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.create.terms')}
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        value={formData.terms}
                        onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                      />
                    </Box>

                    <FormControl fullWidth>
                      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                        {t('eInvoiceManagement.approval.approver')} *
                      </Typography>
                      <Select<number | ''>
                        displayEmpty
                        value={formData.approverUserId === '' ? '' : formData.approverUserId}
                        onChange={(e: SelectChangeEvent<number | ''>) => {
                          const raw = e.target.value as string | number | '';
                          setFormData((prev) => ({
                            ...prev,
                            approverUserId: raw === '' ? '' : Number(raw)
                          }));
                        }}
                        renderValue={(selected: number | '' | undefined) => {
                          if (selected === '' || selected === undefined) {
                            return (
                              <Typography color="text.secondary">
                                {t('eInvoiceManagement.approval.selectApprover')}
                              </Typography>
                            );
                          }
                          const u = companyUsers.find((x) => x.id === selected);
                          return u ? `${u.username} (${u.email})` : String(selected);
                        }}
                      >
                        <MenuItem value="">
                          <Typography color="text.secondary">{t('eInvoiceManagement.approval.selectApprover')}</Typography>
                        </MenuItem>
                        {companyUsers.map((u) => (
                          <MenuItem key={u.id} value={u.id}>
                            {u.username} ({u.email})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                      <Button variant="outlined" onClick={handleCancelCreate}>
                        {t('common.cancel')}
                      </Button>
                      <Button variant="contained" onClick={handleCreate}>
                        {t('common.create')}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 검색 및 필터 */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', sm: (user?.role === 'root' || user?.role === 'audit') ? '2fr 1fr 1fr 1fr' : '2fr 1fr 1fr' },
                      gap: 2, 
                      alignItems: 'flex-end' 
                    }}>
                      <TextField
                        fullWidth
                        placeholder={t('eInvoiceManagement.filters.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      {(user?.role === 'root' || user?.role === 'audit') && (
                        <FormControl fullWidth>
                          <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                            {t('eInvoiceManagement.filters.company')}
                          </Typography>
                          <Select
                            value={selectedCompanyId}
                            onChange={(e) => {
                              const value = String(e.target.value);
                              if (value === '') {
                                setSelectedCompanyId('');
                              } else {
                                const num = Number(value);
                                setSelectedCompanyId(isNaN(num) ? '' : num);
                              }
                            }}
                            displayEmpty
                            sx={{ height: '40px' }}
                          >
                            <MenuItem value="">{t('eInvoiceManagement.filters.allCompanies')}</MenuItem>
                            {companies.map((company) => (
                              <MenuItem key={company.id} value={company.id}>
                                {company.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      <FormControl fullWidth>
                        <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                          {t('eInvoiceManagement.filters.status')}
                        </Typography>
                        <Select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          displayEmpty
                          sx={{ height: '40px' }}
                        >
                          <MenuItem value="all">{t('eInvoiceManagement.filters.allStatus')}</MenuItem>
                          <MenuItem value="draft">{t('eInvoiceManagement.status.draft')}</MenuItem>
                          <MenuItem value="generated">{t('eInvoiceManagement.status.generated')}</MenuItem>
                          <MenuItem value="uploaded">{t('eInvoiceManagement.status.uploaded')}</MenuItem>
                          <MenuItem value="cancelled">{t('eInvoiceManagement.status.cancelled')}</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        startIcon={<FilterListIcon />}
                        onClick={() => {
                          setSearchTerm('');
                          setFilterStatus('all');
                          setSelectedCompanyId('');
                        }}
                        sx={{ height: '40px' }}
                      >
                        {t('eInvoiceManagement.actions.reset')}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>

                <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={listSubTab}
                    onChange={(_, v) => setListSubTab(v)}
                    sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none' } }}
                  >
                    <Tab value="requested" label={t('eInvoiceManagement.approval.tabRequested')} />
                    <Tab value="pending" label={t('eInvoiceManagement.approval.tabPending')} />
                  </Tabs>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">{t('eInvoiceManagement.list.title', { count: filteredEInvoices.length })}</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreating(true)}
                  >
                    {t('eInvoiceManagement.actions.newEInvoice')}
                  </Button>
                </Box>

                {filteredEInvoices.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {einvoices.length === 0 ? t('eInvoiceManagement.empty.noInvoices') : t('eInvoiceManagement.empty.noSearchResults')}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('eInvoiceManagement.columns.invoiceNumber')}</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.irn')}</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.irp')}</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.buyer')}</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.transactionType')}</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.amount')}</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.status')}</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.issueDate')}</TableCell>
                          <TableCell>E-Way Bill</TableCell>
                          <TableCell>{t('eInvoiceManagement.columns.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredEInvoices.map((einvoice) => (
                        <TableRow key={einvoice.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {einvoice.invoiceNumber}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            {einvoice.irn ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <VerifiedIcon fontSize="small" color="success" />
                                <Typography variant="body2" color="primary" sx={{ wordBreak: 'break-all' }}>
                                  {einvoice.irn.length > 20 ? `${einvoice.irn.slice(0, 16)}…` : einvoice.irn}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('eInvoiceManagement.irp.pendingIrn')}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={getIrpStatusLabel(einvoice.irpStatus)}
                              color={getIrpStatusColor(einvoice.irpStatus) as any}
                            />
                            {einvoice.irpLastError ? (
                              <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                                {einvoice.irpLastError.slice(0, 80)}
                                {einvoice.irpLastError.length > 80 ? '…' : ''}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {einvoice.buyer.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                GSTIN: {einvoice.buyer.gstin}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={einvoice.transactionType}
                              size="small"
                              color={getTransactionTypeColor(einvoice.transactionType) as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              Rs. {einvoice.totalAmount.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                              <Chip
                                label={getStatusLabel(einvoice.status)}
                                size="small"
                                color={getStatusColor(einvoice.status) as any}
                              />
                              {einvoice.approvalStatus === 'pending_approval' && (
                                <Chip size="small" label={t('eInvoiceManagement.approval.pendingChip')} color="warning" />
                              )}
                              {einvoice.approvalStatus === 'approved' && (
                                <Chip size="small" label={t('eInvoiceManagement.approval.approvedChip')} color="success" />
                              )}
                              {einvoice.approvalStatus === 'rejected' && (
                                <Chip size="small" label={t('eInvoiceManagement.approval.rejectedChip')} color="error" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(einvoice.issueDate).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {einvoice.ewayBillId ? (
                              <Chip
                                label={t('eInvoiceManagement.eway.generated')}
                                size="small"
                                color="success"
                                icon={<LocalShippingIcon />}
                              />
                            ) : einvoice.irpStatus === 'irn_generated' ? (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<LocalShippingIcon />}
                                onClick={() => handleCreateEWayBill(einvoice.id)}
                              >
                                {t('common.create')}
                              </Button>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('eInvoiceManagement.eway.pending')}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {einvoice.irpStatus !== 'irn_generated' && (
                                <Tooltip
                                  title={
                                    !isEInvoiceExportAllowed(einvoice)
                                      ? t('eInvoiceManagement.approval.needApprovalForIrn')
                                      : t('eInvoiceManagement.actions.generateIrn')
                                  }
                                >
                                  <span>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="secondary"
                                      disabled={
                                        irnLoadingId === einvoice.id ||
                                        einvoice.irpStatus === 'submitted' ||
                                        !isEInvoiceExportAllowed(einvoice)
                                      }
                                      onClick={() => handleGenerateIrn(einvoice.id)}
                                    >
                                      {irnLoadingId === einvoice.id ? '…' : 'IRN'}
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                              {listSubTab === 'pending' && einvoice.approvalStatus === 'pending_approval' && (
                                <>
                                  <Tooltip title={t('eInvoiceManagement.approval.approve')}>
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => void handleApproveInvoice(einvoice.id)}
                                    >
                                      <ThumbUpIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={t('eInvoiceManagement.approval.reject')}>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => void handleRejectInvoice(einvoice.id)}
                                    >
                                      <ThumbDownIcon />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              <Tooltip title={t('eInvoiceManagement.actions.view')}>
                                <IconButton size="small" onClick={() => handleView(einvoice)}>
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('eInvoiceManagement.actions.qrCode')}>
                                <IconButton size="small" disabled={!einvoice.qrCode}>
                                  <QrCodeIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('eInvoiceManagement.actions.upload')}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleStatusUpdate(einvoice.id, 'uploaded')}
                                  disabled={einvoice.irpStatus !== 'irn_generated'}
                                >
                                  <SendIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('common.cancel')}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleStatusUpdate(einvoice.id, 'cancelled')}
                                  disabled={einvoice.status === 'cancelled'}
                                >
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                )}
              </>
            )}
          </TabPanel>

          {/* 프로포마에서 생성 */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              {t('eInvoiceManagement.proforma.description')}
            </Typography>
            <Box sx={{ mb: 2, maxWidth: 480 }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
                {t('eInvoiceManagement.approval.approver')} *
              </Typography>
              <FormControl fullWidth size="small">
                <Select<number | ''>
                  displayEmpty
                  value={proformaApproverId === '' ? '' : proformaApproverId}
                  onChange={(e: SelectChangeEvent<number | ''>) => {
                    const raw = e.target.value as string | number | '';
                    setProformaApproverId(raw === '' ? '' : Number(raw));
                  }}
                  renderValue={(selected: number | '' | undefined) => {
                    if (selected === '' || selected === undefined) {
                      return (
                        <Typography color="text.secondary">
                          {t('eInvoiceManagement.approval.selectApprover')}
                        </Typography>
                      );
                    }
                    const u = companyUsers.find((x) => x.id === selected);
                    return u ? `${u.username} (${u.email})` : String(selected);
                  }}
                >
                  <MenuItem value="">
                    <Typography color="text.secondary">{t('eInvoiceManagement.approval.selectApprover')}</Typography>
                  </MenuItem>
                  {companyUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.username} ({u.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('eInvoiceManagement.proforma.columns.proformaInvoiceNumber')}</TableCell>
                    <TableCell>{t('eInvoiceManagement.proforma.columns.customer')}</TableCell>
                    <TableCell>{t('eInvoiceManagement.proforma.columns.amount')}</TableCell>
                    <TableCell>{t('eInvoiceManagement.proforma.columns.status')}</TableCell>
                    <TableCell>{t('eInvoiceManagement.proforma.columns.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proformaInvoices.map((proformaInvoice) => (
                    <TableRow key={proformaInvoice.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {proformaInvoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {proformaInvoice.customer?.name || proformaInvoice.customer_name || t('eInvoiceManagement.defaults.unspecified')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            GSTIN: {proformaInvoice.customer?.gstin || '-'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          Rs. {proformaInvoice.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t('eInvoiceManagement.proforma.approved')}
                          size="small"
                          color="success"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ReceiptLongIcon />}
                          onClick={() => handleCreateFromProforma(proformaInvoice.id)}
                        >
                          {t('eInvoiceManagement.actions.createEInvoice')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* GST 규정 준수 */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              {t('eInvoiceManagement.gst.title')}
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              {t('eInvoiceManagement.gst.irpWorkflow')}
            </Alert>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon color="primary" />
                    {t('eInvoiceManagement.gst.checklist.title')}
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.checklist.gstinValidationPrimary')}
                        secondary={t('eInvoiceManagement.gst.checklist.gstinValidationSecondary')}
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.checklist.hsnSacPrimary')}
                        secondary={t('eInvoiceManagement.gst.checklist.hsnSacSecondary')}
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.checklist.irnPrimary')}
                        secondary={t('eInvoiceManagement.gst.checklist.irnSecondary')}
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.checklist.qrPrimary')}
                        secondary={t('eInvoiceManagement.gst.checklist.qrSecondary')}
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.checklist.taxCalculationPrimary')}
                        secondary={t('eInvoiceManagement.gst.checklist.taxCalculationSecondary')}
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GavelIcon color="primary" />
                    {t('eInvoiceManagement.gst.regulations.title')}
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.regulations.b2bPrimary')}
                        secondary={t('eInvoiceManagement.gst.regulations.b2bSecondary')}
                      />
                      <Chip label="B2B" size="small" color="primary" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.regulations.b2cPrimary')}
                        secondary={t('eInvoiceManagement.gst.regulations.b2cSecondary')}
                      />
                      <Chip label="B2C" size="small" color="secondary" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.regulations.exportPrimary')}
                        secondary={t('eInvoiceManagement.gst.regulations.exportSecondary')}
                      />
                      <Chip label="Export" size="small" color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('eInvoiceManagement.gst.regulations.sezPrimary')}
                        secondary={t('eInvoiceManagement.gst.regulations.sezSecondary')}
                      />
                      <Chip label="SEZ" size="small" color="warning" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          {/* 통계 및 분석 */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              {t('eInvoiceManagement.analytics.title')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {einvoices.length}
                  </Typography>
                  <Typography variant="body2">{t('eInvoiceManagement.analytics.totalEInvoices')}</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success">
                    {einvoices.filter(ei => ei.status === 'uploaded').length}
                  </Typography>
                  <Typography variant="body2">{t('eInvoiceManagement.analytics.uploadedEInvoices')}</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="info">
                    {einvoices.filter(ei => ei.ewayBillId).length}
                  </Typography>
                  <Typography variant="body2">{t('eInvoiceManagement.analytics.eWayGenerated')}</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="warning">
                    Rs. {einvoices.reduce((sum, ei) => sum + ei.totalAmount, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">{t('eInvoiceManagement.analytics.totalAmount')}</Typography>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>


      {/* E-Invoice 상세 보기 다이얼로그 */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongIcon color="primary" />
            {t('eInvoiceManagement.detail.title')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEInvoice && (
            <Box>
              {/* 헤더 정보 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6">{selectedEInvoice.invoiceNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    IRN: {selectedEInvoice.irn || '—'}
                  </Typography>
                  {selectedEInvoice.gstAckNo ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Ack No.: {selectedEInvoice.gstAckNo} · {selectedEInvoice.gstAckDate}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={getStatusLabel(selectedEInvoice.status)}
                    color={getStatusColor(selectedEInvoice.status) as any}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t('eInvoiceManagement.detail.issueDate')}: {new Date(selectedEInvoice.issueDate).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'ko-KR')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 판매자 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eInvoiceManagement.detail.sellerInfo')}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eInvoiceManagement.detail.companyName')}</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.gstin}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eInvoiceManagement.detail.address')}</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.address}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eInvoiceManagement.detail.contact')}</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.phone}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 구매자 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eInvoiceManagement.detail.buyerInfo')}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eInvoiceManagement.detail.companyName')}</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.gstin}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eInvoiceManagement.detail.address')}</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.address}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eInvoiceManagement.detail.contact')}</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.phone}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 상품 목록 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eInvoiceManagement.detail.itemList')}</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('eInvoiceManagement.detail.columns.description')}</TableCell>
                        <TableCell align="right">{t('eInvoiceManagement.detail.columns.hsnCode')}</TableCell>
                        <TableCell align="right">{t('eInvoiceManagement.detail.columns.quantity')}</TableCell>
                        <TableCell align="right">{t('eInvoiceManagement.detail.columns.unitPrice')}</TableCell>
                        <TableCell align="right">{t('eInvoiceManagement.detail.columns.subtotal')}</TableCell>
                        <TableCell align="right">CGST</TableCell>
                        <TableCell align="right">SGST</TableCell>
                        <TableCell align="right">IGST</TableCell>
                        <TableCell align="right">Cess</TableCell>
                        <TableCell align="right">{t('eInvoiceManagement.detail.columns.total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEInvoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.hsnCode}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">Rs. {item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell align="right">Rs. {item.total.toLocaleString()}</TableCell>
                          <TableCell align="right">Rs. {item.cgstAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">Rs. {item.sgstAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">Rs. {item.igstAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">Rs. {item.cessAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">Rs. {(item.total + item.cgstAmount + item.sgstAmount + item.igstAmount + item.cessAmount).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* 요약 */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Box sx={{ minWidth: 400 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{t('eInvoiceManagement.detail.summary.subtotal')}:</Typography>
                    <Typography variant="body2">Rs. {selectedEInvoice.subtotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">CGST:</Typography>
                    <Typography variant="body2">Rs. {selectedEInvoice.cgstTotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">SGST:</Typography>
                    <Typography variant="body2">Rs. {selectedEInvoice.sgstTotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">IGST:</Typography>
                    <Typography variant="body2">Rs. {selectedEInvoice.igstTotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Cess:</Typography>
                    <Typography variant="body2">Rs. {selectedEInvoice.cessTotal.toLocaleString()}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">{t('eInvoiceManagement.detail.summary.total')}:</Typography>
                    <Typography variant="h6">Rs. {selectedEInvoice.totalAmount.toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* QR 코드 */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eInvoiceManagement.detail.qrTitle')}</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  p: 2,
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  bgcolor: '#f5f5f5'
                }}>
                  {selectedEInvoice.qrCode ? (
                    <Box sx={{ maxWidth: 360, mx: 'auto' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, wordBreak: 'break-all' }}>
                        SignedQRCode (Base64, NIC)
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                        {selectedEInvoice.qrCode.slice(0, 200)}
                        {selectedEInvoice.qrCode.length > 200 ? '…' : ''}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('eInvoiceManagement.irp.pendingIrn')}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* 메모 및 조건 */}
              {(selectedEInvoice.notes || selectedEInvoice.terms) && (
                <Box>
                  {selectedEInvoice.notes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>{t('eInvoiceManagement.create.notes')}</Typography>
                      <Typography variant="body2">{selectedEInvoice.notes}</Typography>
                    </Box>
                  )}
                  {selectedEInvoice.terms && (
                    <Box>
                      <Typography variant="h6" gutterBottom>{t('eInvoiceManagement.create.terms')}</Typography>
                      <Typography variant="body2">{selectedEInvoice.terms}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>{t('common.close')}</Button>
          <Tooltip
            title={
              selectedEInvoice && !isEInvoiceExportAllowed(selectedEInvoice)
                ? t('eInvoiceManagement.approval.needApprovalForPrint')
                : ''
            }
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                disabled={!selectedEInvoice || !isEInvoiceExportAllowed(selectedEInvoice)}
                onClick={() => {
                  if (selectedEInvoice && isEInvoiceExportAllowed(selectedEInvoice)) window.print();
                }}
              >
                {t('common.print')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip
            title={
              selectedEInvoice && !isEInvoiceExportAllowed(selectedEInvoice)
                ? t('eInvoiceManagement.approval.needApprovalForPrint')
                : ''
            }
          >
            <span>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={!selectedEInvoice || !isEInvoiceExportAllowed(selectedEInvoice)}
                onClick={() => {
                  if (selectedEInvoice && isEInvoiceExportAllowed(selectedEInvoice)) window.print();
                }}
              >
                {t('common.download')}
              </Button>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<SendIcon />}>
            {t('eInvoiceManagement.actions.upload')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EInvoiceManagement;