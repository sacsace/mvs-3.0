import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
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
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
  mvsTableBodyRowSx,
} from '../../theme/mvsLayout';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Description as QuotationIcon,
  Print as PrintIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Email as EmailIcon,
  CheckCircle as ApprovedIcon,
  Pending as PendingIcon,
  Cancel as RejectedIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import AuthMedia from '../../components/Common/AuthMedia';
import { useTranslation } from 'react-i18next';
import { companyService, partnerService, quotationService, userService } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { downloadQuotationPdf } from '../../utils/quotationPdf';
import { parseEmailRecipientsList } from '../../utils/emailRecipients';

interface QuotationItem {
  id: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  finalPrice: number;
}

interface Quotation {
  id: number;
  quotationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  issueDate: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'pending_approval' | 'approved' | 'rejected' | 'expired';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  notes: string;
  items: QuotationItem[];
  createdBy: string;
  createdByUserId?: number;
  lastModified: string;
  approverUserId?: number;
  approverName?: string;
  /** 승인자 반려 시 사유 */
  rejectionReason?: string;
}

function normalizeItems(raw: unknown): QuotationItem[] {
  let arr: any[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      arr = Array.isArray(p) ? p : [];
    } catch {
      arr = [];
    }
  }
  return arr.map((row, idx) => ({
    id: Number(row.id) || idx + 1,
    productName: String(row.productName ?? row.product_name ?? ''),
    description: String(row.description ?? ''),
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unitPrice ?? row.unit_price) || 0,
    totalPrice: Number(row.totalPrice ?? row.total_price) || 0,
    discount: Number(row.discount) || 0,
    finalPrice: Number(row.finalPrice ?? row.final_price ?? row.totalPrice ?? row.total_price) || 0
  }));
}

function mapQuotationFromApi(row: any): Quotation {
  const statusRaw = row.status as string;
  const status: Quotation['status'] =
    statusRaw === 'accepted'
      ? 'approved'
      : statusRaw === 'pending_approval'
        ? 'pending_approval'
        : (statusRaw as Quotation['status']);

  const createdRaw = row.created_at ?? row.createdAt;
  const updatedRaw = row.updated_at ?? row.updatedAt;
  const created = createdRaw ? String(createdRaw).split('T')[0] : '';
  const updated = updatedRaw ? String(updatedRaw).replace('T', ' ').substring(0, 19) : '';

  return {
    id: row.id,
    quotationNumber: row.quotation_number || '',
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    customerAddress: row.customer_address || '',
    issueDate: created,
    validUntil: row.valid_until ? String(row.valid_until).split('T')[0] : '',
    status,
    subtotal: Number(row.subtotal) || 0,
    taxRate: Number(row.tax_rate) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    discount: Number(row.discount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    notes: row.notes || '',
    items: normalizeItems(row.items),
    createdBy: row.creator?.username || row.creator?.email || String(row.created_by ?? ''),
    createdByUserId: row.created_by,
    lastModified: updated,
    approverUserId: row.approver_user_id,
    approverName: row.approver?.username || row.approver?.email || '',
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : ''
  };
}

/** 승인 버튼 — 앱 Primary(틸) + 흰 글자로 대비 확보 (contained success 시 글자색 깨짐 방지) */
const QUOTATION_APPROVE_BUTTON_SX = {
  color: '#ffffff',
  bgcolor: 'primary.main',
  '&:hover': {
    bgcolor: 'primary.dark',
    color: '#ffffff'
  },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.light',
    outlineOffset: 2
  }
} as const;

const quotationFilterFieldSx = {
  ...(mvsSearchFieldSx as Record<string, unknown>),
  ...mvsFilterFieldHeightSx,
} as const;

/** 오늘(로컬) 기준 N일 후 YYYY-MM-DD — 견적 만료일 기본값 등 */
function addDaysLocalIso(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface PartnerCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  status?: string;
  businessType?: string;
}

interface CompanyInfo {
  id?: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  business_number?: string;
  /** 시스템 설정 등에서 등록한 로고(data URL 또는 URL) */
  company_logo?: string;
}

const QuotationManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useStore();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [partners, setPartners] = useState<PartnerCustomer[]>([]);
  const [issuingCompany, setIssuingCompany] = useState<CompanyInfo | null>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [listTab, setListTab] = useState<'requested' | 'pending'>('requested');
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: number; username: string; email: string }>>([]);
  const [pdfSaving, setPdfSaving] = useState(false);
  /** 신규 작성 시 API가 DB(숨김 건 포함) 기준으로 채번한 번호 */
  const [suggestedQuotationNumber, setSuggestedQuotationNumber] = useState<string | null>(null);
  const quotationPrintRef = useRef<HTMLDivElement | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const loadQuotationData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await quotationService.getQuotations({});
      if (response?.success) {
        const list = Array.isArray(response.data) ? response.data : [];
        setQuotations(list.map(mapQuotationFromApi));
      } else {
        setQuotations([]);
      }
    } catch (error) {
      console.error('견적서 데이터 로드 오류:', error);
      setError(t('quotationManagement.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadCompanyUsers = useCallback(async () => {
    try {
      if (!user?.company_id) {
        setCompanyUsers([]);
        return;
      }
      const users = await useReferenceDataStore.getState().fetchUsers({ company_id: Number(user.company_id) });
      setCompanyUsers(
        users
          .filter((u: any) => u.status === 'active')
          .map((u: any) => ({
            id: u.id,
            username: u.username || u.userid || '',
            email: u.email || ''
          }))
      );
    } catch (e) {
      console.error('사용자 목록 로드 오류:', e);
    }
  }, [user?.company_id]);

  const loadPartners = useCallback(async () => {
    try {
      const data = await useReferenceDataStore.getState().fetchPartners();
      const mapped = data.map((p: any) => ({
          name: p.company_name || p.companyName || '',
          email: p.email || '',
          phone: p.phone || '',
          address: p.address || '',
          status: p.status,
          businessType: p.business_type || p.businessType
        }));
        setPartners(
          mapped.filter((p: PartnerCustomer) => p.name && p.name.toLowerCase() !== 'test industries')
        );
    } catch (error) {
      console.error('파트너 목록 로드 오류:', error);
    }
  }, []);

  const loadIssuingCompany = useCallback(async () => {
    try {
      if (!user?.company_id) {
        setIssuingCompany(null);
        return;
      }
      const response = await companyService.getCompany(Number(user.company_id));
      if (response?.success) {
        const data = response.data;
        setIssuingCompany({
          id: data.id,
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          business_number: data.business_number || '',
          company_logo: typeof data.company_logo === 'string' ? data.company_logo : ''
        });
      }
    } catch (error) {
      console.error('회사 정보 로드 오류:', error);
    }
  }, [user?.company_id]);

  const filterQuotations = useCallback(() => {
    let filtered = quotations;

    if (searchTerm) {
      filtered = filtered.filter(quotation =>
        quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quotation.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(quotation => quotation.status === statusFilter);
    }

    if (customerFilter) {
      filtered = filtered.filter(quotation =>
        quotation.customerName.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }

    setFilteredQuotations(filtered);
  }, [quotations, searchTerm, statusFilter, customerFilter]);

  useEffect(() => {
    loadQuotationData();
    loadPartners();
    loadIssuingCompany();
    loadCompanyUsers();
  }, [loadCompanyUsers, loadIssuingCompany, loadPartners, loadQuotationData]);

  useEffect(() => {
    filterQuotations();
  }, [filterQuotations]);

  useEffect(() => {
    setPage(1);
  }, [listTab, searchTerm, statusFilter, customerFilter]);

  useEffect(() => {
    if (!isCreating || selectedQuotation) {
      setSuggestedQuotationNumber(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await quotationService.suggestNextQuotationNumber();
        const num = (res as any)?.data?.quotation_number;
        if (!cancelled && num) setSuggestedQuotationNumber(String(num));
      } catch {
        if (!cancelled) setSuggestedQuotationNumber(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCreating, selectedQuotation]);

  const getNextQuotationNumber = () => {
    const year = new Date().getFullYear();
    let maxSeq = 0;
    quotations.forEach((quotation) => {
      const match = quotation.quotationNumber?.match(/QUO-(\d{4})-(\d+)/);
      if (match) {
        const seq = Number(match[2]);
        if (!Number.isNaN(seq)) {
          maxSeq = Math.max(maxSeq, seq);
        }
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `QUO-${year}-${nextSeq}`;
  };

  const chipCompactSx = {
    maxWidth: '100%',
    height: 'auto',
    minHeight: 24,
    '& .MuiChip-label': {
      whiteSpace: 'normal',
      textAlign: 'center',
      display: 'block',
      py: 0.25,
      px: 0.5,
      fontSize: { xs: '0.65rem', sm: '0.75rem' },
      lineHeight: 1.2
    }
  } as const;

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Chip label={t('quotationManagement.statusDraft')} color="default" size="small" sx={chipCompactSx} />
        );
      case 'sent':
        return <Chip label={t('quotationManagement.statusSent')} color="info" size="small" sx={chipCompactSx} />;
      case 'pending_approval':
        return (
          <Chip label={t('quotationManagement.statusPendingApproval')} color="warning" size="small" sx={chipCompactSx} />
        );
      case 'approved':
        return (
          <Chip label={t('quotationManagement.statusApproved')} color="success" size="small" sx={chipCompactSx} />
        );
      case 'rejected':
        return <Chip label={t('quotationManagement.statusRejected')} color="error" size="small" sx={chipCompactSx} />;
      case 'expired':
        return <Chip label={t('quotationManagement.statusExpired')} color="warning" size="small" sx={chipCompactSx} />;
      default:
        return <Chip label={t('quotationManagement.statusUnknown')} color="default" size="small" sx={chipCompactSx} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <PendingIcon color="action" />;
      case 'sent':
        return <EmailIcon color="info" />;
      case 'pending_approval':
        return <PendingIcon color="warning" />;
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      case 'expired':
        return <PendingIcon color="warning" />;
      default:
        return <QuotationIcon />;
    }
  };

  /** 승인(accepted)·발송(sent)만 PDF 저장·브라우저 인쇄·메일 — draft·승인대기·반려 등은 불가 */
  const canShareApprovedQuotation = (q: Quotation | null | undefined) =>
    !!q && (q.status === 'approved' || q.status === 'sent');

  const handleAddQuotation = () => {
    setSelectedQuotation(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  /** 목록 행 클릭 → 상세(보기). 수정 가능한 상태는 폼에서 편집 후 하단 저장 */
  const handleOpenQuotationDetail = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleDeleteQuotation = async (id: number) => {
    showConfirm(
      t('quotationManagement.confirmDelete'),
      async () => {
        try {
          const res = await quotationService.deleteQuotation(id);
          if ((res as any)?.success) {
            await loadQuotationData();
            setSuccess(t('quotationManagement.deleted'));
          } else {
            setError(t('quotationManagement.deleteFailed'));
          }
        } catch (error) {
          console.error('삭제 오류:', error);
          setError(t('quotationManagement.deleteFailed'));
        }
      },
      { confirmColor: 'error' }
    );
  };

  const handleSaveQuotation = async (
    quotationData: Partial<Quotation> & { quotationNumber?: string; approverUserId?: number }
  ) => {
    try {
      if (
        selectedQuotation &&
        ['approved', 'sent', 'rejected', 'expired'].includes(selectedQuotation.status)
      ) {
        setError(t('quotationManagement.editLocked'));
        return;
      }
      setLoading(true);
      const payload = {
        customer_name: quotationData.customerName,
        customer_email: quotationData.customerEmail,
        customer_phone: quotationData.customerPhone,
        customer_address: quotationData.customerAddress,
        items: quotationData.items,
        subtotal: quotationData.subtotal,
        tax_rate: quotationData.taxRate,
        tax_amount: quotationData.taxAmount,
        discount: quotationData.discount,
        total_amount: quotationData.totalAmount,
        currency: 'INR',
        valid_until: quotationData.validUntil,
        notes: quotationData.notes,
        approver_user_id: quotationData.approverUserId,
        status: 'pending_approval' as const
      };

      if (selectedQuotation) {
        const res = await quotationService.updateQuotation(selectedQuotation.id, {
          customer_name: payload.customer_name,
          customer_email: payload.customer_email,
          customer_phone: payload.customer_phone,
          customer_address: payload.customer_address,
          items: payload.items,
          subtotal: payload.subtotal,
          tax_rate: payload.tax_rate,
          tax_amount: payload.tax_amount,
          discount: payload.discount,
          total_amount: payload.total_amount,
          currency: payload.currency,
          valid_until: payload.valid_until,
          notes: payload.notes,
          approver_user_id: payload.approver_user_id,
          status: payload.status
        });
        if ((res as any)?.success) {
          setSuccess(t('quotationManagement.updated'));
        } else {
          setError(t('quotationManagement.saveFailed'));
          return;
        }
      } else {
        const year = new Date().getFullYear();
        const fresh = await quotationService.suggestNextQuotationNumber({ year });
        let qn =
          (fresh as any)?.data?.quotation_number ||
          quotationData.quotationNumber ||
          suggestedQuotationNumber ||
          getNextQuotationNumber();

        const createOnce = async (num: string) =>
          quotationService.createQuotation({
            ...payload,
            quotation_number: num
          });

        try {
          const res = await createOnce(qn);
          if ((res as any)?.success) {
            setSuccess(t('quotationManagement.created'));
          } else {
            setError((res as any)?.message || t('quotationManagement.saveFailed'));
            return;
          }
        } catch (firstErr: any) {
          const msg = firstErr?.response?.data?.message;
          const dup =
            String(msg || '').includes('이미 존재') ||
            firstErr?.response?.status === 400;
          if (!dup) {
            setError(msg || t('quotationManagement.saveFailed'));
            return;
          }
          const fresh2 = await quotationService.suggestNextQuotationNumber({ year });
          const qn2 = (fresh2 as any)?.data?.quotation_number;
          if (!qn2 || qn2 === qn) {
            setError(msg || t('quotationManagement.saveFailed'));
            return;
          }
          setSuggestedQuotationNumber(qn2);
          try {
            const res2 = await createOnce(qn2);
            if ((res2 as any)?.success) {
              setSuccess(t('quotationManagement.created'));
            } else {
              setError((res2 as any)?.message || t('quotationManagement.saveFailed'));
              return;
            }
          } catch (e2: any) {
            setError(e2?.response?.data?.message || t('quotationManagement.saveFailed'));
            return;
          }
        }
      }
      await loadQuotationData();
      setIsCreating(false);
      setIsEditing(false);
      setSelectedQuotation(null);
    } catch (error: any) {
      console.error('저장 오류:', error);
      setError(error?.response?.data?.message || t('quotationManagement.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuotation = async (id: number) => {
    try {
      const res = await quotationService.approveQuotation(id);
      if ((res as any)?.success) {
        setSuccess(t('quotationManagement.approveSuccess'));
        await loadQuotationData();
        if (selectedQuotation?.id === id) {
          handleCancelForm();
        }
      } else {
        setError(t('quotationManagement.saveFailed'));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('quotationManagement.saveFailed'));
    }
  };

  const openRejectDialog = (id: number) => {
    setRejectTargetId(id);
    setRejectReasonInput('');
    setRejectDialogOpen(true);
  };

  const closeRejectDialog = () => {
    setRejectDialogOpen(false);
    setRejectTargetId(null);
    setRejectReasonInput('');
  };

  const handleConfirmReject = async () => {
    const reason = rejectReasonInput.trim();
    if (!reason) {
      setError(t('quotationManagement.rejectionReasonRequired'));
      return;
    }
    if (rejectTargetId == null) return;
    const rejectedId = rejectTargetId;
    try {
      setRejectSubmitting(true);
      const res = await quotationService.rejectQuotation(rejectedId, { reason });
      if ((res as any)?.success) {
        setSuccess(t('quotationManagement.rejectSuccess'));
        closeRejectDialog();
        await loadQuotationData();
        if (selectedQuotation?.id === rejectedId) {
          handleCancelForm();
        }
      } else {
        setError(t('quotationManagement.saveFailed'));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('quotationManagement.saveFailed'));
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedQuotation(null);
  };

  const handlePrintQuotation = (quotation: Quotation) => {
    if (!canShareApprovedQuotation(quotation)) {
      setError(t('quotationManagement.exportAfterApproval'));
      return;
    }
    window.print();
    setSuccess(t('quotationManagement.printed'));
  };

  const handleSaveQuotationPdf = async (quotation: Quotation) => {
    if (!canShareApprovedQuotation(quotation)) {
      setError(t('quotationManagement.exportAfterApproval'));
      return;
    }
    const el = quotationPrintRef.current;
    if (!el) {
      setError(t('quotationManagement.pdfSaveFailed'));
      return;
    }
    try {
      setPdfSaving(true);
      const safe = String(quotation.quotationNumber || 'quotation').replace(/[\\/:*?"<>|]+/g, '_');
      await downloadQuotationPdf(el, `${safe}.pdf`);
      setSuccess(t('quotationManagement.pdfSaved'));
    } catch {
      setError(t('quotationManagement.pdfSaveFailed'));
    } finally {
      setPdfSaving(false);
    }
  };

  const handleEmailQuotation = async (quotation: Quotation) => {
    if (!canShareApprovedQuotation(quotation)) {
      setError(t('quotationManagement.emailAfterApproval'));
      return;
    }
    const el = quotationPrintRef.current;
    if (!el) {
      setError(t('quotationManagement.emailPdfNeedDetail'));
      return;
    }
    try {
      setPdfSaving(true);
      const { quotationPdfToBase64 } = await import('../../utils/quotationPdf');
      const pdfBase64 = await quotationPdfToBase64(el);
      const res = await quotationService.sendQuotation(quotation.id, { pdfBase64 });
      if ((res as any)?.success) {
        setSuccess(t('quotationManagement.emailed'));
        await loadQuotationData();
      } else {
        setError(t('quotationManagement.saveFailed'));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('quotationManagement.pdfSaveFailed'));
    } finally {
      setPdfSaving(false);
    }
  };

  const quotationFormReadOnly =
    !!selectedQuotation &&
    ['approved', 'sent', 'rejected', 'expired'].includes(selectedQuotation.status);

  /**
   * 통계 카드
   * - 승인됨: API `accepted` → UI `approved`, 발송 후 `sent`도 승인 플로우를 통과한 건으로 동일 취급
   * - 총액: 반려·만료는 집계에서 제외 (반려 금액이 합산되지 않도록)
   */
  const { totalAmountActive, approvedQuotations, myPendingApprovals } = useMemo(() => {
    const pending = quotations.filter(
      (q) => q.status === 'pending_approval' && Number(q.approverUserId) === Number(user?.id)
    ).length;
    const approvedOrSent = quotations.filter(
      (q) => q.status === 'approved' || q.status === 'sent'
    ).length;
    const sumExcludingRejectedExpired = quotations
      .filter((q) => q.status !== 'rejected' && q.status !== 'expired')
      .reduce((sum, q) => sum + q.totalAmount, 0);
    return {
      totalAmountActive: sumExcludingRejectedExpired,
      approvedQuotations: approvedOrSent,
      myPendingApprovals: pending
    };
  }, [quotations, user?.id]);

  const tabFilteredQuotations = useMemo(() => {
    const uid = Number(user?.id);
    if (listTab === 'pending') {
      return filteredQuotations.filter(
        (q) => q.status === 'pending_approval' && Number(q.approverUserId) === uid
      );
    }
    return filteredQuotations.filter((q) => Number(q.createdByUserId) === uid);
  }, [filteredQuotations, listTab, user?.id]);

  const paginatedQuotations = tabFilteredQuotations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  /** 상세 화면 하단: 승인 대기이면서 지정 승인자 또는 root/admin */
  const showDetailApproverToolbar = useMemo(() => {
    if (!selectedQuotation || selectedQuotation.status !== 'pending_approval') return false;
    const uid = Number(user?.id);
    const approverId = Number(selectedQuotation.approverUserId);
    const role = user?.role;
    return approverId === uid || role === 'root' || role === 'admin';
  }, [selectedQuotation, user?.id, user?.role]);

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('quotationManagement.title')}
        actions={
          isCreating || isEditing ? (
            <Button
              variant="outlined"
              onClick={handleCancelForm}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('common.back')}
            </Button>
          ) : (
            <Button
              variant="contained"
              disableElevation
              startIcon={<AddIcon fontSize="small" />}
              onClick={handleAddQuotation}
              sx={mvsBodyPrimaryBtnSx}
            >
              {t('quotationManagement.create')}
            </Button>
          )
        }
      />

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
              {t('quotationManagement.totalQuotations')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
              {quotations.length}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('quotationManagement.totalAmount')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
              Rs. {totalAmountActive.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('quotationManagement.approvedQuotations')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'success.main' }}>
              {approvedQuotations}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('quotationManagement.pendingQuotations')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'warning.main' }}>
              {myPendingApprovals}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {isCreating || isEditing ? (
        <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
          <CardContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              {selectedQuotation ? t('quotationManagement.detailTitle') : t('quotationManagement.create')}
            </Typography>
            <QuotationForm
              key={
                selectedQuotation
                  ? `q-${selectedQuotation.id}`
                  : suggestedQuotationNumber
                    ? `new-${suggestedQuotationNumber}`
                    : 'new'
              }
              quotation={selectedQuotation}
              readOnly={quotationFormReadOnly}
              formId={selectedQuotation ? 'quotation-detail-form' : undefined}
              hideFooterButtons={!!selectedQuotation}
              onSave={handleSaveQuotation}
              onCancel={handleCancelForm}
              companyUsers={companyUsers}
              customers={
                partners.length
                  ? partners.filter(p => !p.status || p.status === 'active')
                  : Array.from(
                      new Map(
                        quotations.map(quotation => [
                          quotation.customerName,
                          {
                            name: quotation.customerName,
                            email: quotation.customerEmail,
                            phone: quotation.customerPhone,
                            address: quotation.customerAddress,
                          },
                        ])
                      ).values()
                    )
              }
              issuingCompany={issuingCompany}
              nextQuotationNumber={suggestedQuotationNumber ?? getNextQuotationNumber()}
              printAreaRef={selectedQuotation ? quotationPrintRef : undefined}
              onValidationMessage={setError}
            />
            {selectedQuotation && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider'
                }}
              >
                <Button variant="outlined" onClick={handleCancelForm} sx={mvsBodyOutlinedBtnSx}>
                  {t('quotationManagement.backToList')}
                </Button>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
                  {showDetailApproverToolbar && (
                    <>
                      <Button
                        variant="contained"
                        disableElevation
                        onClick={() => void handleApproveQuotation(selectedQuotation.id)}
                        sx={{ ...mvsBodyPrimaryBtnSx, ...QUOTATION_APPROVE_BUTTON_SX }}
                      >
                        {t('quotationManagement.approve')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => openRejectDialog(selectedQuotation.id)}
                        sx={mvsBodyOutlinedBtnSx}
                      >
                        {t('quotationManagement.reject')}
                      </Button>
                    </>
                  )}
                  {canShareApprovedQuotation(selectedQuotation) && (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={pdfSaving ? <CircularProgress size={16} color="inherit" /> : <EmailIcon />}
                        disabled={pdfSaving}
                        onClick={() => void handleEmailQuotation(selectedQuotation)}
                        sx={mvsBodyOutlinedBtnSx}
                      >
                        {t('quotationManagement.sendEmail')}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={() => handlePrintQuotation(selectedQuotation)}
                        sx={mvsBodyOutlinedBtnSx}
                      >
                        {t('quotationManagement.print')}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={pdfSaving ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
                        disabled={pdfSaving}
                        onClick={() => void handleSaveQuotationPdf(selectedQuotation)}
                        sx={mvsBodyOutlinedBtnSx}
                      >
                        {t('quotationManagement.savePdf')}
                      </Button>
                    </>
                  )}
                  {!quotationFormReadOnly && (
                    <Button type="submit" form="quotation-detail-form" variant="contained" color="primary" disableElevation sx={mvsBodyPrimaryBtnSx}>
                      {t('quotationManagement.save')}
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
            <Tabs
              value={listTab}
              onChange={(_, v) => setListTab(v)}
              sx={{
                minHeight: 40,
                px: { xs: 1, sm: 1.5 },
                bgcolor: '#FFFFFF',
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  minHeight: 40,
                  py: 0.75,
                  letterSpacing: '-0.01em',
                  color: 'text.secondary',
                },
                '& .MuiTab-root.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 700,
                },
              }}
            >
              <Tab value="requested" label={t('quotationManagement.tabRequested')} />
              <Tab value="pending" label={t('quotationManagement.tabPendingApproval')} />
            </Tabs>
          </Card>

          {/* 필터 및 검색 */}
          <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: 2,
                bgcolor: '#FFFFFF',
                ...quotationFilterFieldSx,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr auto' },
                gap: 2,
                alignItems: 'flex-end',
              }}
            >
                <TextField
                  fullWidth
                  size="small"
                  label="검색"
                  placeholder={t('quotationManagement.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={quotationFilterFieldSx}
                />
                <TextField
                  fullWidth
                  size="small"
                  select
                  label={t('quotationManagement.status')}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{ displayEmpty: true }}
                  sx={quotationFilterFieldSx}
                >
                  <MenuItem value="">{t('menuPermissionManagement.all')}</MenuItem>
                  <MenuItem value="draft">{t('quotationManagement.statusDraft')}</MenuItem>
                  <MenuItem value="pending_approval">{t('quotationManagement.statusPendingApproval')}</MenuItem>
                  <MenuItem value="sent">{t('quotationManagement.statusSent')}</MenuItem>
                  <MenuItem value="approved">{t('quotationManagement.statusApproved')}</MenuItem>
                  <MenuItem value="rejected">{t('quotationManagement.statusRejected')}</MenuItem>
                  <MenuItem value="expired">{t('quotationManagement.statusExpired')}</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  size="small"
                  label={t('quotationManagement.customerName')}
                  placeholder={t('quotationManagement.customerSearchPlaceholder')}
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={quotationFilterFieldSx}
                />
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon sx={{ fontSize: 18 }} />}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setCustomerFilter('');
                  }}
                  sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap', width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 120 } }}
                >
                  {t('common.reset')}
                </Button>
              </Box>
          </Card>

          {/* 견적서 목록 테이블 */}
          <Box sx={mvsBodyListZoneSx}>
            <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
              <Table
                size="small"
                sx={{
                  tableLayout: 'fixed',
                  width: '100%',
                  borderCollapse: 'collapse',
                  bgcolor: 'transparent',
                  '& .MuiTableCell-root': {
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                  },
                }}
              >
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    <TableCell sx={{ width: '9%' }}>{t('quotationManagement.status')}</TableCell>
                    <TableCell sx={{ width: '10%' }}>{t('quotationManagement.quotationNumber')}</TableCell>
                    <TableCell sx={{ width: '26%' }}>{t('quotationManagement.customerName')}</TableCell>
                    <TableCell sx={{ width: '9%' }}>{t('quotationManagement.issueDate')}</TableCell>
                    <TableCell sx={{ width: '9%' }}>{t('quotationManagement.validUntil')}</TableCell>
                    <TableCell sx={{ width: '11%' }}>{t('quotationManagement.totalAmount')}</TableCell>
                    <TableCell sx={{ width: '10%' }}>{t('common.create')}</TableCell>
                    <TableCell align="center" sx={{ width: '16%', py: 0.5 }}>
                      {t('quotationManagement.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={mvsTableBodyRowSx}>
                  {paginatedQuotations.map((quotation) => (
                    <TableRow
                      key={quotation.id}
                      onClick={() => handleOpenQuotationDetail(quotation)}
                      sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' } }}
                    >
                      <TableCell sx={{ py: 0.75, px: { xs: 0.5, sm: 1 }, verticalAlign: 'middle', minWidth: 0 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.35,
                            flexWrap: 'wrap',
                            minWidth: 0,
                            '& svg': { fontSize: { xs: 18, sm: 20 } }
                          }}
                        >
                          {getStatusIcon(quotation.status)}
                          {getStatusChip(quotation.status)}
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: { xs: 0.5, sm: 1 },
                          verticalAlign: 'middle',
                          minWidth: 0,
                          overflow: 'hidden',
                          wordBreak: 'break-word'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}>
                          {quotation.quotationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: { xs: 0.5, sm: 1 },
                          verticalAlign: 'middle',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}
                      >
                        <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 400,
                              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                              lineHeight: 1.35,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              wordBreak: 'break-word'
                            }}
                          >
                            {quotation.customerName}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              mt: 0.25,
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}
                          >
                            {quotation.customerEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: { xs: 0.5, sm: 1 },
                          fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                          verticalAlign: 'middle',
                          minWidth: 0,
                          wordBreak: 'break-all'
                        }}
                      >
                        {quotation.issueDate}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: { xs: 0.5, sm: 1 },
                          fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                          verticalAlign: 'middle',
                          minWidth: 0,
                          wordBreak: 'break-all'
                        }}
                      >
                        {quotation.validUntil}
                      </TableCell>
                      <TableCell sx={{ py: 0.75, px: { xs: 0.5, sm: 1 }, verticalAlign: 'middle', minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                            wordBreak: 'break-word'
                          }}
                        >
                          Rs. {quotation.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.75,
                          px: { xs: 0.5, sm: 1 },
                          fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                          verticalAlign: 'middle',
                          minWidth: 0,
                          overflow: 'hidden',
                          wordBreak: 'break-word'
                        }}
                      >
                        {quotation.createdBy}
                      </TableCell>
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        align="center"
                        sx={{
                          py: 0.5,
                          px: { xs: 0.25, sm: 0.5 },
                          verticalAlign: 'middle',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'nowrap',
                            gap: 0.25,
                            justifyContent: 'center',
                            alignItems: 'center',
                            maxWidth: '100%'
                          }}
                        >
                          {listTab === 'pending' && quotation.status === 'pending_approval' && (
                            <>
                              <Tooltip title={t('quotationManagement.approve')}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => void handleApproveQuotation(quotation.id)}
                                  sx={{
                                    color: '#ffffff',
                                    bgcolor: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.dark', color: '#ffffff' }
                                  }}
                                >
                                  <ApprovedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('quotationManagement.reject')}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => openRejectDialog(quotation.id)}
                                >
                                  <RejectedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title={t('quotationManagement.delete')}>
                            <IconButton size="small" onClick={() => handleDeleteQuotation(quotation.id)}>
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

            <Box sx={mvsBodyPaginationSx}>
              <Pagination
                count={Math.max(1, Math.ceil(tabFilteredQuotations.length / itemsPerPage))}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </Box>
        </>
      )}

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

      <Dialog
        open={rejectDialogOpen}
        onClose={() => {
          if (!rejectSubmitting) closeRejectDialog();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('quotationManagement.rejectDialogTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('quotationManagement.rejectionReason')}
            placeholder={t('quotationManagement.rejectionReasonPlaceholder')}
            fullWidth
            multiline
            minRows={3}
            value={rejectReasonInput}
            onChange={(e) => setRejectReasonInput(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectDialog} disabled={rejectSubmitting} sx={mvsBodyOutlinedBtnSx}>
            {t('quotationManagement.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            disableElevation
            onClick={() => void handleConfirmReject()}
            disabled={rejectSubmitting || !rejectReasonInput.trim()}
            sx={mvsBodyPrimaryBtnSx}
          >
            {t('quotationManagement.reject')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 확인 다이얼로그 */}
      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        confirmColor={dialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

/** ITEMIZED 행 — QTY·UNIT PRICE·DESCRIPTION Outlined 입력 높이 통일 (MUI small ≈ 40px) */
const ITEM_ROW_QTY_UNIT_SX = {
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    maxHeight: 40,
    boxSizing: 'border-box'
  },
  '& .MuiOutlinedInput-input': {
    py: '8.5px',
    px: '14px',
    boxSizing: 'border-box'
  }
} as const;

const ITEM_ROW_DESCRIPTION_SX = {
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    boxSizing: 'border-box'
  },
  '& .MuiOutlinedInput-root.MuiInputBase-multiline': {
    minHeight: 40,
    padding: '8.5px 14px'
  },
  '& textarea.MuiOutlinedInput-input': {
    resize: 'both',
    minHeight: '23px',
    lineHeight: '23px',
    padding: 0,
    overflow: 'auto',
    boxSizing: 'border-box'
  }
} as const;

// 견적서 폼 컴포넌트
interface QuotationFormProps {
  quotation: Quotation | null;
  readOnly?: boolean;
  /** 목록에서 연 상세에서 하단 툴바로 저장 시 외부 submit 버튼과 연결 */
  formId?: string;
  /** true면 폼 하단 취소/저장 버튼 숨김(상세 툴바 사용) */
  hideFooterButtons?: boolean;
  /** PDF 저장 시 캡처할 영역(견적 본문) */
  printAreaRef?: React.RefObject<HTMLDivElement | null>;
  onSave: (data: Partial<Quotation> & { quotationNumber?: string; approverUserId?: number }) => void;
  onCancel: () => void;
  companyUsers: Array<{ id: number; username: string; email: string }>;
  customers: Array<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }>;
  issuingCompany: CompanyInfo | null;
  nextQuotationNumber: string;
  /** 폼 검증 메시지 — 상단 Snackbar(`error`)와 동일 스타일 */
  onValidationMessage?: (message: string) => void;
}

const QuotationForm: React.FC<QuotationFormProps> = ({ 
  quotation, 
  readOnly = false,
  formId,
  hideFooterButtons = false,
  printAreaRef,
  onSave, 
  onCancel,
  companyUsers,
  customers,
  issuingCompany,
  nextQuotationNumber,
  onValidationMessage
}) => {
  const { t } = useTranslation();
  const productNameRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    customerName: quotation?.customerName || '',
    customerEmail: quotation?.customerEmail || '',
    customerPhone: quotation?.customerPhone || '',
    customerAddress: quotation?.customerAddress || '',
    validUntil: quotation?.validUntil || addDaysLocalIso(15),
    notes: quotation?.notes || '',
    taxType: 'cgst_sgst',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
    discount: quotation?.discount || 0,
    approverUserId: quotation?.approverUserId != null ? quotation.approverUserId : ('' as const)
  });

  const [items, setItems] = useState<QuotationItem[]>(
    quotation?.items || [
      {
        id: 1,
        productName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        discount: 0,
        finalPrice: 0
      }
    ]
  );

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 가격 자동 계산
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice;
      
      const totalPrice = quantity * unitPrice;
      newItems[index].totalPrice = totalPrice;
      newItems[index].finalPrice = totalPrice;
      newItems[index].discount = 0;
    }
    
    setItems(newItems);
  };

  /** DESCRIPTION 단일 입력: 본문은 productName에 두고, 구버전 description은 표시만 병합 후 비움 */
  const handleItemDescriptionCombinedChange = (index: number, value: string) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], productName: value, description: '' };
      return newItems;
    });
  };

  const addItem = () => {
    const nextId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem: QuotationItem = {
      id: nextId,
      productName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      discount: 0,
      finalPrice: 0
    };
    setItems([...items, newItem]);
  };

  const addItemAndFocus = () => {
    setItems(prev => {
      const nextId = prev.length ? Math.max(...prev.map(i => i.id)) + 1 : 1;
      const newItem: QuotationItem = {
        id: nextId,
        productName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        discount: 0,
        finalPrice: 0
      };
      setPendingFocusIndex(prev.length);
      return [...prev, newItem];
    });
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    const target = productNameRefs.current[pendingFocusIndex];
    if (target) {
      target.focus();
    }
    setPendingFocusIndex(null);
  }, [items.length, pendingFocusIndex]);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
    const cgstRate = formData.taxType === 'cgst_sgst' ? formData.cgstRate : 0;
    const sgstRate = formData.taxType === 'cgst_sgst' ? formData.sgstRate : 0;
    const igstRate = formData.taxType === 'igst' ? formData.igstRate : 0;
    const taxAmount = (subtotal * (cgstRate + sgstRate + igstRate)) / 100;
    const totalAmount = subtotal + taxAmount - formData.discount;
    
    return { subtotal, taxAmount, totalAmount, cgstRate, sgstRate, igstRate };
  };

  const selectedCustomer = customers.find(customer => customer.name === formData.customerName);
  const quoteNumber = quotation?.quotationNumber || nextQuotationNumber;

  /** 승인·발송 완료 견적은 고객에게 제출하므로 승인자(내부) 필드 미표시 */
  const hideApproverForCustomerView =
    !!quotation && readOnly && ['approved', 'sent'].includes(quotation.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (formData.approverUserId === '') {
      onValidationMessage?.(t('quotationManagement.selectApprover'));
      return;
    }
    const effectiveEmail = (formData.customerEmail || selectedCustomer?.email || '').trim();
    if (effectiveEmail) {
      const pr = parseEmailRecipientsList(effectiveEmail);
      if (!pr.ok) {
        onValidationMessage?.(t('quotationManagement.invalidEmailInList', { part: pr.message }));
        return;
      }
    }
    const invalidLine = items.find((it) => {
      const qty = Number(it.quantity);
      const price = Number(it.unitPrice);
      return (
        !Number.isFinite(qty) ||
        qty < 1 ||
        !Number.isFinite(price) ||
        price <= 0
      );
    });
    if (invalidLine) {
      onValidationMessage?.(t('quotationManagement.itemQtyUnitRequired'));
      return;
    }
    const { subtotal, taxAmount, totalAmount, cgstRate, sgstRate, igstRate } = calculateTotals();
    const fallbackValidUntil = addDaysLocalIso(15);
    
    onSave({
      ...formData,
      customerName: formData.customerName || selectedCustomer?.name || '',
      customerEmail: formData.customerEmail || selectedCustomer?.email || '',
      customerPhone: formData.customerPhone || selectedCustomer?.phone || '',
      customerAddress: formData.customerAddress || selectedCustomer?.address || '',
      validUntil: formData.validUntil || fallbackValidUntil,
      notes: formData.notes || '견적 기본 사항 자동 입력',
      subtotal,
      taxAmount,
      taxRate: cgstRate + sgstRate + igstRate,
      totalAmount,
      items,
      issueDate: new Date().toISOString().split('T')[0],
      quotationNumber: quoteNumber,
      approverUserId: Number(formData.approverUserId)
    });
  };

  const { subtotal, totalAmount, cgstRate, sgstRate, igstRate } = calculateTotals();

  const handleCustomerSelect = (name: string) => {
    const selected = customers.find(customer => customer.name === name);
    if (!selected) {
      setFormData(prev => ({
        ...prev,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      customerName: selected.name,
      customerEmail: selected.email,
      customerPhone: selected.phone,
      customerAddress: selected.address,
    }));
  };

  return (
    <Box component="form" id={formId} onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Box
        ref={printAreaRef}
        className="quotation-print-area"
        sx={{ bgcolor: '#fff', borderRadius: 2 }}
      >
      <Box
        component="fieldset"
        disabled={readOnly}
        sx={{
          border: '1px solid #cfcfcf',
          borderRadius: 2,
          bgcolor: '#fff',
          p: { xs: 2, md: 3 },
          m: 0,
          minWidth: 0
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box sx={{ minWidth: 220 }}>
            {issuingCompany?.company_logo ? (
              <AuthMedia
                src={issuingCompany.company_logo}
                alt={issuingCompany.name || ''}
                sx={{
                  display: 'block',
                  maxHeight: 64,
                  maxWidth: 260,
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  mb: 1,
                }}
              />
            ) : null}
            <Typography variant="caption" color="text.secondary">Company Name</Typography>
            <Typography variant="subtitle2" sx={{ mt: 0.5, mb: 1 }}>
              {issuingCompany?.name || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {issuingCompany?.address || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Phone: {issuingCompany?.phone || '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              E-mail: {issuingCompany?.email || '-'}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ letterSpacing: 1, fontWeight: 700, fontSize: '22px' }}>QUOTATION</Typography>
            <Box sx={{ mt: 1, border: '1px solid #cfcfcf', borderRadius: 1, overflow: 'hidden', minWidth: 220 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', bgcolor: '#f5f5f5' }}>
                <Box sx={{ p: 1, borderRight: '1px solid #cfcfcf' }}><Typography variant="caption">QUOTE #</Typography></Box>
                <Box sx={{ p: 1 }}><Typography variant="caption">DATE</Typography></Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #cfcfcf' }}>
                <Box sx={{ p: 1, borderRight: '1px solid #cfcfcf' }}>
                  <Typography variant="body2">{quoteNumber}</Typography>
                </Box>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2">{new Date().toISOString().split('T')[0]}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #cfcfcf', bgcolor: '#f5f5f5' }}>
                <Box sx={{ p: 1, borderRight: '1px solid #cfcfcf' }}><Typography variant="caption">CUSTOMER</Typography></Box>
                <Box sx={{ p: 1 }}><Typography variant="caption">VALID UNTIL</Typography></Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #cfcfcf' }}>
                <Box sx={{ p: 1, borderRight: '1px solid #cfcfcf' }}>
                  <Typography variant="body2">{selectedCustomer?.name || '-'}</Typography>
                </Box>
                <Box sx={{ p: 1 }}>
                  <Typography variant="body2">{formData.validUntil || '-'}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ border: '1px solid #cfcfcf', borderRadius: 1, mb: 3 }}>
          <Box sx={{ bgcolor: '#f0f0f0', px: 2, py: 1 }}>
            <Typography variant="subtitle2">CUSTOMER INFO</Typography>
          </Box>
          <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Name *</Typography>
              <FormControl fullWidth size="small">
                <Select
                  displayEmpty
                  value={formData.customerName}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  renderValue={(selected) => selected || '고객 회사 선택'}
                >
                  <MenuItem value="">
                    <Typography color="text.secondary">고객 회사 선택</Typography>
                  </MenuItem>
                  {customers.map(customer => (
                    <MenuItem key={customer.name} value={customer.name}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Email *</Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                inputProps={{ multiple: true }}
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                required
                helperText={t('quotationManagement.customerEmailMultipleHint')}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Phone</Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Valid Until *</Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                required
              />
            </Box>
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <Typography variant="caption" color="text.secondary">Address</Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
              />
            </Box>
            {!hideApproverForCustomerView && (
              <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
                <Typography variant="caption" color="text.secondary">{t('quotationManagement.approver')} *</Typography>
                <FormControl fullWidth size="small" required>
                  <Select<number | ''>
                    displayEmpty
                    value={formData.approverUserId === '' ? '' : formData.approverUserId}
                    onChange={(e: SelectChangeEvent<number | ''>) => {
                      const raw = e.target.value as string | number | '';
                      setFormData({
                        ...formData,
                        approverUserId: raw === '' ? '' : Number(raw)
                      });
                    }}
                    renderValue={(selected: number | '' | undefined) => {
                      if (selected === '' || selected === undefined) {
                        return <Typography color="text.secondary">{t('quotationManagement.selectApprover')}</Typography>;
                      }
                      const u = companyUsers.find((x) => x.id === selected);
                      return u ? `${u.username} (${u.email})` : String(selected);
                    }}
                  >
                    <MenuItem value="">
                      <Typography color="text.secondary">{t('quotationManagement.selectApprover')}</Typography>
                    </MenuItem>
                    {companyUsers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </Box>

        {readOnly && quotation?.status === 'rejected' && !!quotation.rejectionReason?.trim() && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {t('quotationManagement.rejectionReason')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {quotation.rejectionReason}
            </Typography>
          </Alert>
        )}

        <Box sx={{ border: '1px solid #cfcfcf', borderRadius: 1, mb: 3 }}>
          <Box sx={{ bgcolor: '#f0f0f0', px: 2, py: 1 }}>
            <Typography variant="subtitle2">DESCRIPTION OF WORK</Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              sx={{ '& textarea': { resize: 'vertical' } }}
            />
          </Box>
        </Box>

        <Box sx={{ border: '1px solid #cfcfcf', borderRadius: 1, mb: 3 }}>
          <Box sx={{ bgcolor: '#f0f0f0', px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">ITEMIZED COSTS</Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addItem}>
              상품 추가
            </Button>
          </Box>
          <Box sx={{ overflow: 'auto', width: '100%' }}>
          <Table
            className="quotation-itemized-costs-table"
            size="small"
            sx={{
              tableLayout: 'fixed',
              width: '100%',
              minWidth: 560
            }}
          >
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
                <TableCell sx={{ width: '60%' }}>DESCRIPTION</TableCell>
                <TableCell align="right" sx={{ width: '13%' }}>
                  QTY
                </TableCell>
                <TableCell align="right" sx={{ width: '13%' }}>
                  UNIT PRICE
                </TableCell>
                <TableCell align="right" sx={{ width: '10%' }}>
                  AMOUNT
                </TableCell>
                <TableCell align="center" sx={{ width: '4%', minWidth: 44 }}>
                  -
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell
                    sx={{
                      verticalAlign: 'middle',
                      overflow: 'visible',
                      width: '60%',
                      minWidth: 0
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={1}
                      placeholder="품목 및 설명"
                      value={[item.productName, item.description].filter((s) => String(s).trim()).join('\n')}
                      onChange={(e) => handleItemDescriptionCombinedChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          addItemAndFocus();
                        }
                      }}
                      inputRef={(el) => {
                        productNameRefs.current[index] = el;
                      }}
                      required
                      sx={ITEM_ROW_DESCRIPTION_SX}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ width: '13%', verticalAlign: 'middle' }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItemAndFocus();
                        }
                      }}
                      inputProps={{ min: 0 }}
                      sx={ITEM_ROW_QTY_UNIT_SX}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ width: '13%', verticalAlign: 'middle' }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItemAndFocus();
                        }
                      }}
                      inputProps={{ min: 0 }}
                      sx={ITEM_ROW_QTY_UNIT_SX}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ width: '10%', verticalAlign: 'middle' }}>
                    <Typography variant="body2" sx={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      Rs. {item.finalPrice.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ width: '4%', minWidth: 44, verticalAlign: 'middle' }}>
                    {items.length > 1 && (
                      <IconButton onClick={() => removeItem(index)} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Box>
        </Box>

        <Box sx={{ border: '1px solid #cfcfcf', borderRadius: 1, p: 2, mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">TAX TYPE</Typography>
              <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                <Select
                  value={formData.taxType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    if (nextType === 'igst') {
                      setFormData(prev => ({
                        ...prev,
                        taxType: 'igst',
                        cgstRate: 0,
                        sgstRate: 0,
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        taxType: 'cgst_sgst',
                        igstRate: 0,
                        cgstRate: prev.cgstRate || 9,
                        sgstRate: prev.sgstRate || 9,
                      }));
                    }
                  }}
                >
                  <MenuItem value="cgst_sgst">CGST + SGST</MenuItem>
                  <MenuItem value="igst">IGST</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">CGST (%)</Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.cgstRate}
                disabled={formData.taxType === 'igst'}
                onChange={(e) => setFormData({
                  ...formData,
                  cgstRate: parseInt(e.target.value) || 0,
                  igstRate: 0
                })}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">SGST (%)</Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.sgstRate}
                disabled={formData.taxType === 'igst'}
                onChange={(e) => setFormData({
                  ...formData,
                  sgstRate: parseInt(e.target.value) || 0,
                  igstRate: 0
                })}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">IGST (%)</Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.igstRate}
                disabled={formData.taxType !== 'igst'}
                onChange={(e) => setFormData({
                  ...formData,
                  igstRate: parseInt(e.target.value) || 0,
                  cgstRate: 0,
                  sgstRate: 0
                })}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">DISCOUNT</Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Box sx={{ width: 260, border: '1px solid #cfcfcf', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #cfcfcf' }}>
              <Typography variant="body2">SUBTOTAL</Typography>
              <Typography variant="body2">Rs. {subtotal.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #cfcfcf' }}>
              <Typography variant="body2">CGST ({cgstRate}%)</Typography>
              <Typography variant="body2">Rs. {(subtotal * (cgstRate / 100)).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #cfcfcf' }}>
              <Typography variant="body2">SGST ({sgstRate}%)</Typography>
              <Typography variant="body2">Rs. {(subtotal * (sgstRate / 100)).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #cfcfcf' }}>
              <Typography variant="body2">IGST ({igstRate}%)</Typography>
              <Typography variant="body2">Rs. {(subtotal * (igstRate / 100)).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid #cfcfcf' }}>
              <Typography variant="body2">DISCOUNT</Typography>
              <Typography variant="body2">-Rs. {formData.discount.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Typography variant="subtitle2">TOTAL QUOTE</Typography>
              <Typography variant="subtitle2">Rs. {totalAmount.toLocaleString()}</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ border: '1px solid #cfcfcf', borderRadius: 1, mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', borderBottom: '1px solid #cfcfcf' }}>
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">Customer Acceptance</Typography>
            </Box>
            <Box sx={{ p: 1, borderLeft: '1px solid #cfcfcf' }}>
              <Typography variant="caption" color="text.secondary">Printed Name</Typography>
            </Box>
            <Box sx={{ p: 1, borderLeft: '1px solid #cfcfcf' }}>
              <Typography variant="caption" color="text.secondary">Date</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', height: 48 }}>
            <Box sx={{ borderRight: '1px solid #cfcfcf' }} />
            <Box sx={{ borderRight: '1px solid #cfcfcf' }} />
            <Box />
          </Box>
        </Box>

      </Box>
      </Box>
        {!hideFooterButtons && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button onClick={onCancel} variant="outlined">
              {readOnly ? t('common.close') : t('quotationManagement.cancel')}
            </Button>
            {!readOnly && (
              <Button type="submit" variant="contained">
                {t('common.save')}
              </Button>
            )}
          </Box>
        )}
    </Box>
  );
};

export default QuotationManagement;