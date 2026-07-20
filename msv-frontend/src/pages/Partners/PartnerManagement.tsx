import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  useMediaQuery,
  Checkbox,
  Pagination,
  TableSortLabel,
} from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import {
  Handshake as HandshakeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  RemoveCircleOutline as RemoveIcon,
  FileDownload as FileDownloadIcon,
  RestartAlt as ResetIcon,
  MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { api, partnerService } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsKpiCardSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsOutlinedLabelProps,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx,
  mvsTableScrollSx,
  mvsBodyPaginationSx,
} from '../../theme/mvsLayout';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';
import { normalizePartnerCompanyName } from '../../utils/partnerCompanyName';

const PARTNER_MENU_ROUTES = ['/basic-info/partners', '/basic-info', '/customers/info', '/customers'] as const;
/** Avoid ID collisions when merging customers into the partners list UI */
const CUSTOMER_LIST_ID_OFFSET = 2_000_000_000;
const PARTNERS_PER_PAGE = 10;

type ListViewMode = 'page' | 'all';
type PartnerSortKey =
  | 'company'
  | 'representative'
  | 'type'
  | 'industry'
  | 'contact'
  | 'contract'
  | 'status';
type SortDirection = 'asc' | 'desc';

const listViewModeBarSx = {
  mb: 1.25,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 0.75,
} as const;

const listViewModeBtnSx = {
  height: 32,
  minWidth: 0,
  px: 1.5,
  textTransform: 'none' as const,
  fontWeight: 600,
  fontSize: '0.75rem',
  borderRadius: '10px',
  boxShadow: 'none',
  whiteSpace: 'nowrap' as const,
};

const PARTNER_FILTER_OUTLINED = mvsOutlinedLabelProps;
const partnerFilterFieldSx = { ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx } as const;

const PART_COL_DEFAULTS: Record<string, number> = {
  select: 48,
  company: 240,
  representative: 120,
  type: 120,
  industry: 120,
  contact: 160,
  contract: 150,
  status: 100,
  actions: 72,
};

const PART_COL_TOTAL = Object.values(PART_COL_DEFAULTS).reduce((s, n) => s + n, 0);

const PART_COL_ALIGN: Record<string, 'left' | 'right' | 'center'> = {
  select: 'center',
  company: 'left',
  representative: 'left',
  type: 'left',
  industry: 'left',
  contact: 'left',
  contract: 'left',
  status: 'left',
  actions: 'center',
};

const PART_COL_MIN_WIDTH: Record<string, number> = {
  select: 48,
  company: 120,
  representative: 88,
  type: 88,
  industry: 72,
  contact: 100,
  contract: 120,
  status: 72,
  actions: 56,
};

function partColWidthPct(key: string): string {
  const w = PART_COL_DEFAULTS[key] ?? 80;
  return `${(w / PART_COL_TOTAL) * 100}%`;
}

function partColTableAlign(key: string): 'left' | 'right' | 'center' {
  return PART_COL_ALIGN[key] ?? 'left';
}

const partnerTableBodyRowSx: SxProps<Theme> = (theme) => {
  const base = typeof mvsTableBodyRowSx === 'function' ? mvsTableBodyRowSx(theme) : mvsTableBodyRowSx;
  const rowBg = theme.palette.mode === 'light' ? '#FFFFFF' : theme.palette.background.paper;
  const hoverBg = theme.palette.mode === 'light' ? '#EFF6FF' : theme.palette.action.hover;
  const cellPaddingX = { xs: 1, sm: 1.25 };
  return {
    ...(base as object),
    '& .MuiTableCell-body': {
      py: 0.75,
      px: cellPaddingX,
      fontSize: { xs: '0.75rem', sm: '0.8125rem' },
      lineHeight: 1.35,
    },
    '& .MuiTableCell-body.MuiTableCell-paddingCheckbox': {
      width: 48,
      minWidth: 48,
      maxWidth: 48,
      px: cellPaddingX,
      py: 0.75,
    },
    '& .MuiTableRow-root:nth-of-type(odd)': { bgcolor: rowBg },
    '& .MuiTableRow-root:nth-of-type(even)': { bgcolor: rowBg },
    '& .MuiTableRow-root:hover': { bgcolor: hoverBg },
  };
};

const partnerListTextSx = {
  fontSize: 'inherit',
  lineHeight: 1.35,
} as const;

const partnerCheckboxColSx = {
  width: 48,
  minWidth: 48,
  maxWidth: 48,
  px: { xs: 1, sm: 1.25 },
  py: 0.75,
  boxSizing: 'border-box' as const,
} as const;

const partnerChipSx = { fontWeight: 500, borderRadius: '8px', fontSize: '0.75rem' } as const;

interface Partner {
  id: number;
  companyName: string;
  businessNumber: string;
  panNumber?: string;
  gstNumbers: string[];
  representative: string;
  businessType: 'partner' | 'customer' | 'customer_partner' | 'other' | 'room_guest';
  industry: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
  contractStartDate: string;
  contractEndDate: string;
  status: 'active' | 'inactive' | 'suspended';
  notes: string;
  avatar?: string;
  /** partner = partners table; customer/room_guest = customers API */
  recordSource?: 'partner' | 'customer' | 'room_guest';
  sourceId?: number;
}

const PartnerManagement: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isCompactToolbar = useMediaQuery(theme.breakpoints.down('md'));
  const menuFlags = useMenuRoutePermissionFlags(PARTNER_MENU_ROUTES);
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [listViewMode, setListViewMode] = useState<ListViewMode>('page');
  const [sortKey, setSortKey] = useState<PartnerSortKey>('company');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'add'>('view');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [notify, setNotify] = useState<{
    message: string;
    severity: 'error' | 'success' | 'info' | 'warning';
  } | null>(null);
  const [toolbarMenuAnchor, setToolbarMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);

  const formatPartners = useCallback((partnersData: any[]): Partner[] => {
    return partnersData.map((p: any) => ({
      id: p.id,
      companyName: p.company_name,
      businessNumber: p.business_number,
      panNumber: p.pan_number || '',
      gstNumbers: p.gstNumbers || (Array.isArray(p.gst_numbers) ? p.gst_numbers : []),
      representative: p.representative || '',
      businessType: p.business_type,
      industry: p.industry || '',
      address: p.address || '',
      phone: p.phone || '',
      email: p.email,
      website: p.website || '',
      bankName: p.bank_name || '',
      accountNumber: p.account_number || '',
      ifsc: p.bank_ifsc || '',
      accountHolder: p.account_holder || '',
      contractStartDate: p.contract_start_date ? p.contract_start_date.split('T')[0] : '',
      contractEndDate: p.contract_end_date ? p.contract_end_date.split('T')[0] : '',
      status: p.status,
      notes: p.notes || '',
      recordSource: 'partner' as const,
      sourceId: p.id,
    }));
  }, []);

  const formatCustomersAsPartners = useCallback((customersData: any[], existingPartners: Partner[]): Partner[] => {
    const partnerNameKeys = new Set(
      existingPartners.map((p) => normalizePartnerCompanyName(p.companyName).toLowerCase()).filter(Boolean)
    );
    const partnerBizKeys = new Set(
      existingPartners
        .map((p) => String(p.businessNumber || '').trim().toLowerCase())
        .filter((v) => v && !v.startsWith('tally-') && v !== '-')
    );

    return customersData
      .map((c: any): Partner | null => {
        const sourceType = c.source_type === 'room_guest' ? 'room_guest' : 'customer';
        const name = String(c.name || '').trim();
        const biz = String(c.business_number || '').trim();
        const nameKey = normalizePartnerCompanyName(name).toLowerCase();

        // Skip legacy customers already represented in partners (keep hotel guests)
        if (sourceType === 'customer') {
          if (nameKey && partnerNameKeys.has(nameKey)) return null;
          if (biz && partnerBizKeys.has(biz.toLowerCase())) return null;
        }

        const listId = sourceType === 'room_guest' ? Number(c.id) : CUSTOMER_LIST_ID_OFFSET + Number(c.id);
        return {
          id: listId,
          companyName: normalizePartnerCompanyName(name) || name,
          businessNumber: biz || '-',
          panNumber: '',
          gstNumbers: [],
          representative: c.ceo_name || '',
          businessType: sourceType === 'room_guest' ? 'room_guest' : 'customer',
          industry: c.industry || '',
          address: c.address || '',
          phone: c.phone || '',
          email: c.email || '',
          website: c.website || '',
          bankName: '',
          accountNumber: '',
          ifsc: '',
          accountHolder: '',
          contractStartDate: '',
          contractEndDate: '',
          status: c.status === 'inactive' ? 'inactive' : 'active',
          notes:
            sourceType === 'room_guest'
              ? `[Hotel Guest] booking=${c.source_booking_id || c.id}`
              : '[Customer Info]',
          recordSource: sourceType,
          sourceId: Number(c.id),
        };
      })
      .filter((row): row is Partner => row != null);
  }, []);

  const removePartnersFromList = useCallback((ids: number[]) => {
    const idSet = new Set(ids);
    setPartners((prev) => prev.filter((partner) => !idSet.has(partner.id)));
    setSelectedPartnerIds((prev) => prev.filter((id) => !idSet.has(id)));
  }, []);

  // 파트너 + 고객정보(레거시/숙박손님) 통합 목록
  const loadPartners = useCallback(async () => {
    if (menuFlags.menusLoading || !menuFlags.canRead) {
      setPartners([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [partnerResponse, customerResponse] = await Promise.all([
        partnerService.getPartners(),
        api.get('/customers').catch(() => ({ data: [] })),
      ]);
      const partnersData = Array.isArray(partnerResponse?.data)
        ? partnerResponse.data
        : Array.isArray(partnerResponse)
          ? partnerResponse
          : [];
      const customersRaw = Array.isArray((customerResponse as any)?.data?.data)
        ? (customerResponse as any).data.data
        : Array.isArray((customerResponse as any)?.data)
          ? (customerResponse as any).data
          : Array.isArray(customerResponse)
            ? customerResponse
            : [];

      useReferenceDataStore.setState({
        partners: { data: partnersData, fetchedAt: Date.now(), promise: null },
      });

      const partnerRows = formatPartners(partnersData);
      const customerRows = formatCustomersAsPartners(customersRaw, partnerRows);
      setPartners([...partnerRows, ...customerRows]);
    } catch (error: any) {
      console.error('❌ [파트너 관리] 파트너 목록 로드 오류:', error);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [menuFlags.menusLoading, menuFlags.canRead, formatPartners, formatCustomersAsPartners]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);
  const [formData, setFormData] = useState<Omit<Partner, 'id'>>({
    companyName: '',
    businessNumber: '',
    gstNumbers: [''],
    representative: '',
    businessType: 'partner',
    industry: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    accountHolder: '',
    contractStartDate: '',
    contractEndDate: '',
    status: 'active',
    notes: ''
  });

  const handleAdd = () => {
    setSelectedPartner(null);
    setDialogMode('add');
    setFormData({
      companyName: '',
      businessNumber: '',
      panNumber: '',
      gstNumbers: [''],
      representative: '',
      businessType: 'partner',
      industry: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      accountHolder: '',
      contractStartDate: '',
      contractEndDate: '',
      status: 'active',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleView = (partner: Partner) => {
    setSelectedPartner(partner);
    setDialogMode('view');
    setFormData({
      companyName: partner.companyName,
      businessNumber: partner.businessNumber,
      panNumber: partner.panNumber || '',
      gstNumbers: partner.gstNumbers && partner.gstNumbers.length > 0 ? partner.gstNumbers : [''],
      representative: partner.representative,
      businessType: partner.businessType,
      industry: partner.industry,
      address: partner.address,
      phone: partner.phone,
      email: partner.email,
      website: partner.website,
      bankName: partner.bankName,
      accountNumber: partner.accountNumber,
      ifsc: partner.ifsc,
      accountHolder: partner.accountHolder,
      contractStartDate: partner.contractStartDate,
      contractEndDate: partner.contractEndDate,
      status: partner.status,
      notes: partner.notes
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (selectedPartner?.recordSource === 'room_guest') {
      setNotify({ message: t('partnerManagement.roomGuestReadOnly'), severity: 'info' });
      return;
    }

    // GST 번호 검증: 최소 1개 이상, 빈 값 제거 (파트너 마스터만)
    const validGstNumbers = formData.gstNumbers.filter(gst => gst.trim() !== '');
    const isLegacyCustomer = selectedPartner?.recordSource === 'customer';

    if (!isLegacyCustomer && validGstNumbers.length === 0) {
      setNotify({ message: t('partnerManagement.gstMinOneRequired'), severity: 'warning' });
      return;
    }
    
    const formDataWithValidGst = {
      ...formData,
      companyName: normalizePartnerCompanyName(formData.companyName),
      gstNumbers: validGstNumbers.length > 0 ? validGstNumbers : [''],
    };

    // Reflect normalized name in the form immediately
    setFormData((prev) => ({ ...prev, companyName: formDataWithValidGst.companyName }));

    try {
      if (isLegacyCustomer && selectedPartner?.sourceId) {
        const payload = {
          name: formDataWithValidGst.companyName,
          business_number: formDataWithValidGst.businessNumber,
          ceo_name: formDataWithValidGst.representative,
          phone: formDataWithValidGst.phone,
          email: formDataWithValidGst.email,
          address: formDataWithValidGst.address,
          website: formDataWithValidGst.website,
          industry: formDataWithValidGst.industry,
          status: formDataWithValidGst.status === 'suspended' ? 'inactive' : formDataWithValidGst.status,
        };
        await api.put(`/customers/${selectedPartner.sourceId}`, payload);
      } else if (selectedPartner && (selectedPartner.recordSource || 'partner') === 'partner') {
        await partnerService.updatePartner(selectedPartner.id, formDataWithValidGst);
      } else {
        await partnerService.createPartner(formDataWithValidGst);
      }
      setOpenDialog(false);
      loadPartners();
    } catch (error: any) {
      console.error('파트너 저장 오류:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || t('partnerManagement.saveError');
      setNotify({ message: errorMessage, severity: 'error' });
    }
  };

  const handleGstNumberChange = (index: number, value: string) => {
    const newGstNumbers = [...formData.gstNumbers];
    newGstNumbers[index] = value;
    setFormData({ ...formData, gstNumbers: newGstNumbers });
  };

  const handleAddGstNumber = () => {
    if (formData.gstNumbers.length >= 10) {
      setNotify({ message: t('partnerManagement.gstMaxTen'), severity: 'warning' });
      return;
    }
    setFormData({ ...formData, gstNumbers: [...formData.gstNumbers, ''] });
  };

  const handleRemoveGstNumber = (index: number) => {
    if (formData.gstNumbers.length <= 1) {
      setNotify({ message: t('partnerManagement.gstMinOneNeeded'), severity: 'warning' });
      return;
    }
    const newGstNumbers = formData.gstNumbers.filter((_, i) => i !== index);
    setFormData({ ...formData, gstNumbers: newGstNumbers });
  };

  const handleDelete = (id: number) => {
    const row = partners.find((p) => p.id === id);
    if (row?.recordSource === 'room_guest') {
      setNotify({ message: t('partnerManagement.roomGuestReadOnly'), severity: 'info' });
      return;
    }
    showConfirm(
      t('partnerManagement.confirmDelete'),
      () => {
        void (async () => {
          try {
            if (row?.recordSource === 'customer' && row.sourceId) {
              await api.delete(`/customers/${row.sourceId}`);
            } else {
              await partnerService.deletePartner(id);
            }
            removePartnersFromList([id]);
            setNotify({
              message: t('partnerManagement.deleteSelectedSuccess', { count: 1 }),
              severity: 'success',
            });
            await loadPartners();
          } catch (error: any) {
            setNotify({
              message: error.response?.data?.message || t('partnerManagement.deleteError'),
              severity: 'error',
            });
          }
        })();
      },
      { confirmColor: 'error' }
    );
  };

  const handleDeleteSelected = () => {
    if (!menuFlags.canDelete) return;
    if (selectedPartnerIds.length === 0) return;

    const idsToDelete = selectedPartnerIds.filter((id) => {
      const row = partners.find((p) => p.id === id);
      return row?.recordSource !== 'room_guest';
    });
    if (idsToDelete.length === 0) {
      setNotify({ message: t('partnerManagement.roomGuestReadOnly'), severity: 'info' });
      return;
    }

    showConfirm(
      t('partnerManagement.deleteSelectedConfirm', { count: idsToDelete.length }),
      () => {
        void (async () => {
          try {
            await Promise.all(
              idsToDelete.map((id) => {
                const row = partners.find((p) => p.id === id);
                if (row?.recordSource === 'customer' && row.sourceId) {
                  return api.delete(`/customers/${row.sourceId}`);
                }
                return partnerService.deletePartner(id);
              })
            );
            removePartnersFromList(idsToDelete);
            setNotify({
              message: t('partnerManagement.deleteSelectedSuccess', { count: idsToDelete.length }),
              severity: 'success',
            });
            await loadPartners();
          } catch (error: any) {
            setNotify({
              message: error.response?.data?.message || t('partnerManagement.deleteError'),
              severity: 'error',
            });
          }
        })();
      },
      {
        title: t('common.confirm'),
        confirmColor: 'error',
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
      }
    );
  };

  // Excel 샘플 다운로드
  const handleDownloadSample = async () => {
    try {
      await partnerService.downloadExcelSample();
    } catch (error: any) {
      setNotify({ message: t('partnerManagement.excelSampleDownloadError'), severity: 'error' });
      console.error('Excel sample download error:', error);
    }
  };

  // Excel 파일 내보내기
  const handleExportExcel = async () => {
    try {
      await partnerService.exportExcel();
    } catch (error: any) {
      setNotify({ message: t('partnerManagement.excelExportError'), severity: 'error' });
      console.error('Excel export error:', error);
    }
  };

  // Excel 파일 선택
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Excel 파일 가져오기
  const handleImportExcel = async () => {
    if (!importFile) {
      setNotify({ message: t('partnerManagement.selectExcelFilePlease'), severity: 'warning' });
      return;
    }

    setImportLoading(true);
    setImportResult(null);

    try {
      const result = await partnerService.importExcel(importFile);
      setImportResult(result);
      
      if (result.success && result.data) {
        const { success, failed, total } = result.data;
        const msg = t('partnerManagement.importSuccessMessage', { total, success: success.length })
          + (failed.length > 0 ? '\n' + t('partnerManagement.importFailedPart', { count: failed.length }) : '');
        setNotify({ message: msg, severity: failed.length > 0 ? 'warning' : 'success' });
        
        // 성공한 경우 목록 새로고침
        if (success.length > 0) {
          loadPartners();
        }
        
        // 다이얼로그 닫기
        setImportDialogOpen(false);
        setImportFile(null);
      }
    } catch (error: any) {
      console.error('Excel import error:', error);
      setNotify({
        message: error.response?.data?.message || t('partnerManagement.importError'),
        severity: 'error'
      });
    } finally {
      setImportLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeConfig: Record<string, string> = {
      partner: t('partnerManagement.typePartner'),
      customer: t('partnerManagement.typeCustomer'),
      customer_partner: t('partnerManagement.typeCustomerPartner'),
      other: t('partnerManagement.typeOther'),
      room_guest: t('partnerManagement.typeRoomGuest'),
    };
    return typeConfig[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorConfig: Record<string, string> = {
      partner: 'primary',
      customer: 'success',
      customer_partner: 'info',
      other: 'default',
      room_guest: 'warning',
    };
    return colorConfig[type] || 'default';
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { labelKey: 'partnerManagement.active' as const, color: 'success' as const },
      inactive: { labelKey: 'partnerManagement.inactive' as const, color: 'default' as const },
      suspended: { labelKey: 'partnerManagement.suspended' as const, color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    return <Chip label={t(config.labelKey)} color={config.color} size="small" sx={partnerChipSx} />;
  };

  const getSortValue = (partner: Partner, key: PartnerSortKey): string => {
    switch (key) {
      case 'company':
        return String(partner.companyName || '').toLowerCase();
      case 'representative':
        return String(partner.representative || '').toLowerCase();
      case 'type':
        return String(partner.businessType || '').toLowerCase();
      case 'industry':
        return String(partner.industry || '').toLowerCase();
      case 'contact':
        return String(partner.email || partner.phone || '').toLowerCase();
      case 'contract':
        return String(partner.contractEndDate || '');
      case 'status':
        return String(partner.status || '').toLowerCase();
      default:
        return '';
    }
  };

  const filteredPartners = useMemo(() => {
    const filtered = partners.filter((partner) => {
      const matchesSearch =
        searchTerm === '' ||
        partner.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (partner.representative &&
          partner.representative.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (partner.industry && partner.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (partner.address && partner.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        partner.businessNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        typeFilter === 'all' ||
        partner.businessType === typeFilter ||
        (typeFilter === 'customer' &&
          (partner.recordSource === 'customer' || partner.businessType === 'customer'));
      return matchesSearch && matchesType;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return String(a.companyName || '').localeCompare(String(b.companyName || ''), undefined, {
        sensitivity: 'base',
      });
    });
    return sorted;
  }, [partners, searchTerm, typeFilter, sortKey, sortDirection]);

  const handleSort = (key: PartnerSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const partnerStats = useMemo(() => {
    const isPartnerType = (p: Partner) =>
      p.businessType === 'partner' || p.businessType === 'customer_partner';
    const isCustomerType = (p: Partner) =>
      p.businessType === 'customer' ||
      p.businessType === 'customer_partner' ||
      p.recordSource === 'customer';
    const isRoomGuest = (p: Partner) =>
      p.businessType === 'room_guest' || p.recordSource === 'room_guest';

    return {
      total: partners.length,
      active: partners.filter((p) => p.status === 'active').length,
      partners: partners.filter((p) => !isRoomGuest(p) && isPartnerType(p)).length,
      customers: partners.filter((p) => !isRoomGuest(p) && isCustomerType(p)).length,
    };
  }, [partners]);

  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PARTNERS_PER_PAGE));

  const paginatedPartners = useMemo(() => {
    if (listViewMode === 'all') return filteredPartners;
    return filteredPartners.slice((page - 1) * PARTNERS_PER_PAGE, page * PARTNERS_PER_PAGE);
  }, [filteredPartners, page, listViewMode]);

  const visiblePartnerIds = useMemo(
    () => paginatedPartners.map((partner) => partner.id),
    [paginatedPartners]
  );

  const allVisibleSelected =
    visiblePartnerIds.length > 0 && visiblePartnerIds.every((id) => selectedPartnerIds.includes(id));
  const someVisibleSelected = visiblePartnerIds.some((id) => selectedPartnerIds.includes(id));

  useEffect(() => {
    setPage(1);
    setSelectedPartnerIds([]);
  }, [searchTerm, typeFilter, listViewMode]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!menuFlags.canDelete) return;
    if (event.target.checked) {
      setSelectedPartnerIds(visiblePartnerIds);
    } else {
      setSelectedPartnerIds([]);
    }
  };

  const handleToggleSelectPartner = (id: number) => {
    if (!menuFlags.canDelete) return;
    setSelectedPartnerIds((prev) =>
      prev.includes(id) ? prev.filter((partnerId) => partnerId !== id) : [...prev, id]
    );
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() || typeFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
  };

  const closeToolbarMenu = () => setToolbarMenuAnchor(null);

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

  const thLabelEllipsisSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    flex: '1 1 auto',
  } as const;

  const partnerColBaseSx = (key: string) => ({
    width: partColWidthPct(key),
    minWidth: PART_COL_MIN_WIDTH[key] ?? 0,
    maxWidth: partColWidthPct(key),
    textAlign: partColTableAlign(key),
    verticalAlign: 'middle' as const,
    boxSizing: 'border-box' as const,
    px: { xs: 1, sm: 1.25 },
    py: 0.75,
    overflow: 'hidden',
  });

  const thSx = (key: string) => {
    const align = partColTableAlign(key);
    return {
      ...partnerColBaseSx(key),
      '& .MuiTableSortLabel-root': {
        color: 'inherit',
        display: 'inline-flex',
        width: '100%',
        maxWidth: '100%',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        overflow: 'hidden',
        ...(align === 'right' ? { flexDirection: 'row-reverse' as const } : {}),
      },
      '& .MuiTableSortLabel-icon': {
        flexShrink: 0,
      },
    };
  };

  const tdSx = (key: string) => ({
    ...partnerColBaseSx(key),
    textOverflow:
      key === 'company' ||
      key === 'representative' ||
      key === 'industry' ||
      key === 'contact' ||
      key === 'contract'
        ? ('ellipsis' as const)
        : undefined,
  });

  const renderHeadCell = (key: string, label: string, sortable?: PartnerSortKey) => (
    <TableCell key={key} align={partColTableAlign(key)} sx={thSx(key)}>
      {sortable ? (
        <TableSortLabel
          active={sortKey === sortable}
          direction={sortKey === sortable ? sortDirection : 'asc'}
          onClick={() => handleSort(sortable)}
          sx={{
            '& .MuiTableSortLabel-icon': { color: 'inherit !important' },
          }}
        >
          <Box
            component="span"
            sx={{
              ...thLabelEllipsisSx,
              display: 'block',
              width: '100%',
            }}
            title={label}
          >
            {label}
          </Box>
        </TableSortLabel>
      ) : (
        <Box
          component="span"
          sx={{
            ...thLabelEllipsisSx,
            display: key === 'actions' ? 'flex' : 'block',
            justifyContent: key === 'actions' ? 'center' : undefined,
            width: '100%',
          }}
          title={label}
        >
          {label}
        </Box>
      )}
    </TableCell>
  );

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('partnerManagement.pageTitle')}
        description={t('partnerManagement.description')}
      />

      {!menuFlags.menusLoading && !menuFlags.canRead && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('common.menuNoView')}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        {[
          { key: 'total', label: t('partnerManagement.stats.total'), value: partnerStats.total },
          { key: 'active', label: t('partnerManagement.stats.active'), value: partnerStats.active },
          { key: 'partners', label: t('partnerManagement.stats.partners'), value: partnerStats.partners },
          { key: 'customers', label: t('partnerManagement.stats.customers'), value: partnerStats.customers },
        ].map((item) => (
          <Card key={item.key} elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {item.label}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card elevation={0} sx={mvsBodyCardSx}>
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
                <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MoreHorizIcon fontSize="small" />}
                      disabled={menuFlags.menusLoading}
                      onClick={(e) => setToolbarMenuAnchor(e.currentTarget)}
                      sx={mvsBodyOutlinedBtnSx}
                    >
                      {t('partnerManagement.moreTools')}
                    </Button>
                  </span>
                </Tooltip>
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
                        borderRadius: '12px',
                        border: '1px solid #C5CED9',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
                      },
                    },
                  }}
                >
                  <MenuItem
                    disabled={menuFlags.menusLoading || !menuFlags.canRead}
                    onClick={() => {
                      closeToolbarMenu();
                      handleDownloadSample();
                    }}
                  >
                    <ListItemIcon>
                      <DownloadIcon fontSize="small" />
                    </ListItemIcon>
                    {t('partnerManagement.excelSampleDownload')}
                  </MenuItem>
                  <MenuItem
                    disabled={menuFlags.menusLoading || !menuFlags.canRead}
                    onClick={() => {
                      closeToolbarMenu();
                      handleExportExcel();
                    }}
                  >
                    <ListItemIcon>
                      <FileDownloadIcon fontSize="small" />
                    </ListItemIcon>
                    {t('partnerManagement.excelExport')}
                  </MenuItem>
                  <MenuItem
                    disabled={menuFlags.menusLoading || !menuFlags.canMutate}
                    onClick={() => {
                      closeToolbarMenu();
                      setImportDialogOpen(true);
                    }}
                  >
                    <ListItemIcon>
                      <UploadIcon fontSize="small" />
                    </ListItemIcon>
                    {t('partnerManagement.excelImport')}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon fontSize="small" />}
                      disabled={menuFlags.menusLoading || !menuFlags.canRead}
                      onClick={handleDownloadSample}
                      sx={mvsBodyOutlinedBtnSx}
                    >
                      {t('partnerManagement.excelSampleDownload')}
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FileDownloadIcon fontSize="small" />}
                      disabled={menuFlags.menusLoading || !menuFlags.canRead}
                      onClick={handleExportExcel}
                      sx={mvsBodyOutlinedBtnSx}
                    >
                      {t('partnerManagement.excelExport')}
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canMutate}>
                  <span style={{ display: 'inline-flex' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<UploadIcon fontSize="small" />}
                      disabled={menuFlags.menusLoading || !menuFlags.canMutate}
                      onClick={() => setImportDialogOpen(true)}
                      sx={mvsBodyOutlinedBtnSx}
                    >
                      {t('partnerManagement.excelImport')}
                    </Button>
                  </span>
                </Tooltip>
              </>
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
            {selectedPartnerIds.length > 0 ? (
              <Tooltip title={t('common.menuNoDelete')} disableHoverListener={menuFlags.menusLoading || menuFlags.canDelete}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="contained"
                    color="error"
                    disableElevation
                    size="small"
                    startIcon={<DeleteIcon fontSize="small" />}
                    disabled={menuFlags.menusLoading || !menuFlags.canDelete}
                    onClick={handleDeleteSelected}
                    sx={{
                      textTransform: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      minHeight: 36,
                      px: 2,
                      boxShadow: 'none',
                    }}
                  >
                    {t('partnerManagement.deleteSelected')} ({selectedPartnerIds.length})
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
              <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                <Button
                  variant="contained"
                  disableElevation
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                  disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                  onClick={handleAdd}
                  sx={mvsBodyPrimaryBtnSx}
                >
                  {t('partnerManagement.addPartner')}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            bgcolor: '#FFFFFF',
            ...(mvsSearchFieldSx as Record<string, unknown>),
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'minmax(0, 1fr) minmax(0, 1fr) auto',
              lg: 'minmax(0, 2fr) minmax(0, 1fr) auto',
            },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
          <TextField
            fullWidth
            size="small"
            label={t('common.search')}
            {...PARTNER_FILTER_OUTLINED}
            placeholder={t('partnerManagement.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={menuFlags.menusLoading || !menuFlags.canRead}
            sx={partnerFilterFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1.125rem', color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            size="small"
            select
            label={t('partnerManagement.companyType')}
            {...PARTNER_FILTER_OUTLINED}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            disabled={menuFlags.menusLoading || !menuFlags.canRead}
            SelectProps={{ displayEmpty: true }}
            sx={partnerFilterFieldSx}
          >
            <MenuItem value="all">{t('partnerManagement.allTypes')}</MenuItem>
            <MenuItem value="partner">{t('partnerManagement.typePartner')}</MenuItem>
            <MenuItem value="customer">{t('partnerManagement.typeCustomer')}</MenuItem>
            <MenuItem value="customer_partner">{t('partnerManagement.typeCustomerPartner')}</MenuItem>
            <MenuItem value="room_guest">{t('partnerManagement.typeRoomGuest')}</MenuItem>
            <MenuItem value="other">{t('partnerManagement.typeOther')}</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ResetIcon fontSize="small" />}
            onClick={handleResetFilters}
            disabled={menuFlags.menusLoading || !menuFlags.canRead}
            sx={{
              ...mvsBodyOutlinedBtnSx,
              height: 40,
              whiteSpace: 'nowrap',
            }}
          >
            {t('partnerManagement.reset')}
          </Button>
        </Box>
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        {loading ? (
          <Box sx={listStateBoxSx}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              {t('partnerManagement.empty.loading')}
            </Typography>
          </Box>
        ) : filteredPartners.length === 0 ? (
          <Box sx={listStateBoxSx}>
            <HandshakeIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
              {hasActiveFilters
                ? t('partnerManagement.empty.noResults')
                : t('partnerManagement.empty.noItems')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              {hasActiveFilters
                ? t('partnerManagement.empty.noResultsHint')
                : t('partnerManagement.empty.noItemsHint')}
            </Typography>
            {hasActiveFilters ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ResetIcon fontSize="small" />}
                onClick={handleResetFilters}
                sx={mvsBodyOutlinedBtnSx}
              >
                {t('partnerManagement.reset')}
              </Button>
            ) : (
              <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="contained"
                    disableElevation
                    size="small"
                    startIcon={<AddIcon fontSize="small" />}
                    disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                    onClick={handleAdd}
                    sx={mvsBodyPrimaryBtnSx}
                  >
                    {t('partnerManagement.addPartner')}
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
        ) : (
          <>
            <Box sx={listViewModeBarSx}>
              <Button
                size="small"
                disableElevation
                variant={listViewMode === 'all' ? 'contained' : 'outlined'}
                onClick={() => setListViewMode('all')}
                sx={{
                  ...listViewModeBtnSx,
                  ...(listViewMode === 'all'
                    ? { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }
                    : { borderColor: '#C5CED9', color: 'text.secondary', bgcolor: '#FFFFFF' }),
                }}
              >
                {t('partnerManagement.listView.viewAll')}
              </Button>
              <Button
                size="small"
                disableElevation
                variant={listViewMode === 'page' ? 'contained' : 'outlined'}
                onClick={() => setListViewMode('page')}
                sx={{
                  ...listViewModeBtnSx,
                  ...(listViewMode === 'page'
                    ? { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }
                    : { borderColor: '#C5CED9', color: 'text.secondary', bgcolor: '#FFFFFF' }),
                }}
              >
                {t('partnerManagement.listView.viewPages')}
              </Button>
            </Box>
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
              <TableHead
                sx={(theme) => {
                  const headBase =
                    typeof mvsTableHeadHighlightSx === 'function'
                      ? mvsTableHeadHighlightSx(theme)
                      : mvsTableHeadHighlightSx;
                  return {
                    ...(headBase as object),
                    '& .MuiTableCell-head': {
                      py: 0.75,
                      px: { xs: 1, sm: 1.25 },
                    },
                    '& .MuiTableCell-head.MuiTableCell-paddingCheckbox': {
                      ...partnerCheckboxColSx,
                      overflow: 'visible',
                    },
                  };
                }}
              >
                <TableRow>
                  <TableCell padding="checkbox" align="center" sx={{ ...thSx('select'), ...partnerCheckboxColSx }}>
                    <Checkbox
                      size="small"
                      disabled={menuFlags.menusLoading || !menuFlags.canDelete || paginatedPartners.length === 0}
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      checked={allVisibleSelected}
                      onChange={handleSelectAll}
                      inputProps={{ 'aria-label': t('partnerManagement.selectAll') }}
                    />
                  </TableCell>
                  {renderHeadCell('company', t('partnerManagement.companyInfo'), 'company')}
                  {renderHeadCell('representative', t('partnerManagement.representative'), 'representative')}
                  {renderHeadCell('type', t('partnerManagement.companyType'), 'type')}
                  {renderHeadCell('industry', t('partnerManagement.industry'), 'industry')}
                  {renderHeadCell('contact', t('partnerManagement.contact'), 'contact')}
                  {renderHeadCell('contract', t('partnerManagement.contractExpiryDate'), 'contract')}
                  {renderHeadCell('status', t('partnerManagement.status'), 'status')}
                  {renderHeadCell('actions', t('partnerManagement.actions'))}
                </TableRow>
              </TableHead>
              <TableBody sx={partnerTableBodyRowSx}>
                {paginatedPartners.map((partner) => (
                  <TableRow
                    key={partner.id}
                    onClick={() => {
                      if (!menuFlags.menusLoading && menuFlags.canRead) handleView(partner);
                    }}
                    sx={{
                      cursor: menuFlags.menusLoading || !menuFlags.canRead ? 'default' : 'pointer',
                      '&:hover .partner-delete-btn:not(.Mui-disabled)': {
                        color: 'error.main',
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    <TableCell
                      padding="checkbox"
                      align="center"
                      sx={{ ...tdSx('select'), ...partnerCheckboxColSx }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        disabled={menuFlags.menusLoading || !menuFlags.canDelete}
                        checked={selectedPartnerIds.includes(partner.id)}
                        onChange={() => handleToggleSelectPartner(partner.id)}
                        inputProps={{ 'aria-label': t('partnerManagement.selectItem', { name: partner.companyName }) }}
                      />
                    </TableCell>
                    <TableCell align={partColTableAlign('company')} sx={tdSx('company')}>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                        <Avatar
                          sx={{
                            mr: 1.25,
                            width: 32,
                            height: 32,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            flexShrink: 0,
                            bgcolor:
                              theme.palette.mode === 'light'
                                ? 'rgba(15, 23, 42, 0.08)'
                                : alpha(theme.palette.common.white, 0.12),
                            color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.75)' : theme.palette.grey[200],
                          }}
                        >
                          {partner.companyName.charAt(0)}
                        </Avatar>
                        <Typography
                          component="span"
                          fontWeight={600}
                          noWrap
                          title={partner.companyName}
                          sx={{
                            ...partnerListTextSx,
                            minWidth: 0,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'block',
                          }}
                        >
                          {partner.companyName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align={partColTableAlign('representative')} sx={tdSx('representative')}>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                        <PersonIcon sx={{ mr: 0.5, fontSize: '0.875rem', color: 'text.secondary', flexShrink: 0 }} />
                        <Typography component="span" noWrap title={partner.representative} sx={{ ...partnerListTextSx, display: 'block' }}>
                          {partner.representative}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align={partColTableAlign('type')} sx={tdSx('type')}>
                      <Chip
                        label={getTypeLabel(partner.businessType)}
                        color={getTypeColor(partner.businessType) as any}
                        size="small"
                        sx={partnerChipSx}
                      />
                    </TableCell>
                    <TableCell align={partColTableAlign('industry')} sx={tdSx('industry')}>
                      <Typography component="span" color="text.secondary" noWrap title={partner.industry} sx={{ ...partnerListTextSx, display: 'block' }}>
                        {partner.industry}
                      </Typography>
                    </TableCell>
                    <TableCell align={partColTableAlign('contact')} sx={tdSx('contact')}>
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                        <EmailIcon sx={{ mr: 0.5, fontSize: '0.875rem', color: 'text.secondary', flexShrink: 0 }} />
                        <Typography component="span" noWrap title={partner.email || '-'} sx={{ ...partnerListTextSx, display: 'block' }}>
                          {partner.email || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align={partColTableAlign('contract')} sx={tdSx('contract')}>
                      <Typography
                        component="span"
                        color="text.secondary"
                        noWrap
                        title={partner.contractEndDate || '-'}
                        sx={{ ...partnerListTextSx, fontVariantNumeric: 'tabular-nums', display: 'block' }}
                      >
                        {partner.contractEndDate || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align={partColTableAlign('status')} sx={tdSx('status')}>
                      {getStatusChip(partner.status)}
                    </TableCell>
                    <TableCell align={partColTableAlign('actions')} sx={tdSx('actions')} onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip
                          title={
                            partner.recordSource === 'room_guest'
                              ? t('partnerManagement.roomGuestReadOnly')
                              : menuFlags.menusLoading || !menuFlags.canDelete
                                ? t('common.menuNoDelete')
                                : t('partnerManagement.delete')
                          }
                        >
                          <span style={{ display: 'inline-flex' }}>
                            <IconButton
                              className="partner-delete-btn"
                              size="small"
                              disabled={
                                menuFlags.menusLoading ||
                                !menuFlags.canDelete ||
                                partner.recordSource === 'room_guest'
                              }
                              onClick={() => handleDelete(partner.id)}
                              aria-label={t('partnerManagement.delete')}
                              sx={{
                                color: alpha(theme.palette.text.secondary, theme.palette.mode === 'light' ? 0.72 : 1),
                                borderRadius: '10px',
                                transition: 'color 0.15s ease, background-color 0.15s ease',
                                '&:hover': {
                                  color: 'error.main',
                                  bgcolor: alpha(theme.palette.error.main, 0.12),
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {listViewMode === 'page' && totalPages > 1 && (
          <Box sx={mvsBodyPaginationSx}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: '10px',
                  fontWeight: 500,
                },
              }}
            />
          </Box>
          )}
          </>
        )}
      </Box>

      {/* 파트너 추가/수정/보기 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'view' ? t('partnerManagement.viewPartner') : dialogMode === 'edit' ? t('partnerManagement.editPartner') : t('partnerManagement.addNewPartner')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.companyName')} <span style={{ color: '#d32f2f' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  onBlur={() => {
                    if (dialogMode === 'view') return;
                    const normalized = normalizePartnerCompanyName(formData.companyName);
                    if (normalized !== formData.companyName) {
                      setFormData((prev) => ({ ...prev, companyName: normalized }));
                    }
                  }}
                  placeholder={t('partnerManagement.placeholderCompanyName')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.businessNumber')} <span style={{ color: '#d32f2f' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({...formData, businessNumber: e.target.value})}
                  placeholder={t('partnerManagement.placeholderBusinessNumber')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.panNumber')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.panNumber || ''}
                  onChange={(e) => setFormData({...formData, panNumber: e.target.value})}
                  placeholder={t('partnerManagement.placeholderPan')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.gstNumber')} <span style={{ color: '#d32f2f' }}>*</span>
                  <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    {t('partnerManagement.gstNumberMinMax')}
                  </Typography>
                </Typography>
                {dialogMode !== 'view' && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddGstNumber}
                    disabled={formData.gstNumbers.length >= 10}
                    sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1.5 }}
                  >
                    {t('partnerManagement.add')}
                  </Button>
                )}
              </Box>
              {formData.gstNumbers.map((gstNumber, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    value={gstNumber}
                    onChange={(e) => handleGstNumberChange(index, e.target.value)}
                    placeholder={t('partnerManagement.placeholderGst', { index: index + 1 })}
                    required={dialogMode !== 'view'}
                    error={
                      dialogMode !== 'view' &&
                      gstNumber.trim() === '' &&
                      formData.gstNumbers.filter((g) => g.trim() !== '').length === 0
                    }
                    helperText={
                      dialogMode !== 'view' &&
                      gstNumber.trim() === '' &&
                      formData.gstNumbers.filter((g) => g.trim() !== '').length === 0
                        ? t('partnerManagement.placeholderGstRequired')
                        : ''
                    }
                    disabled={dialogMode === 'view'}
                  />
                  {dialogMode !== 'view' && (
                    <IconButton
                      onClick={() => handleRemoveGstNumber(index)}
                      disabled={formData.gstNumbers.length <= 1}
                      color="error"
                      sx={{ mt: 0.5 }}
                    >
                      <RemoveIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.representativeName')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.representative}
                  onChange={(e) => setFormData({...formData, representative: e.target.value})}
                  placeholder={t('partnerManagement.placeholderRepresentative')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.companyType')}
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={formData.businessType}
                    onChange={(e) => setFormData({...formData, businessType: e.target.value as any})}
                    displayEmpty
                    disabled={dialogMode === 'view'}
                  >
                    <MenuItem value="partner">{t('partnerManagement.typePartner')}</MenuItem>
                    <MenuItem value="customer">{t('partnerManagement.typeCustomer')}</MenuItem>
                    <MenuItem value="customer_partner">{t('partnerManagement.typeCustomerPartner')}</MenuItem>
                    <MenuItem value="other">{t('partnerManagement.typeOther')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.industry')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.industry}
                  onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  placeholder={t('partnerManagement.placeholderIndustry')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.website')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder={t('partnerManagement.placeholderWebsite')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                {t('partnerManagement.address')}
              </Typography>
              <TextField
                fullWidth
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder={t('partnerManagement.placeholderAddress')}
                disabled={dialogMode === 'view'}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.phone')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder={t('partnerManagement.placeholderPhone')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.email')} <span style={{ color: '#d32f2f' }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder={t('partnerManagement.placeholderEmail')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.bankName')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  placeholder={t('partnerManagement.placeholderBankName')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.accountNumber')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                  placeholder={t('partnerManagement.placeholderAccountNumber')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.ifsc')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.ifsc}
                  onChange={(e) => setFormData({...formData, ifsc: e.target.value})}
                  placeholder={t('partnerManagement.placeholderIfsc')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.accountHolder')}
                </Typography>
                <TextField
                  fullWidth
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({...formData, accountHolder: e.target.value})}
                  placeholder={t('partnerManagement.placeholderAccountHolder')}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.contractStartDate')}
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.contractStartDate}
                  onChange={(e) => setFormData({...formData, contractStartDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  disabled={dialogMode === 'view'}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {t('partnerManagement.contractEndDate')}
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.contractEndDate}
                  onChange={(e) => setFormData({...formData, contractEndDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  disabled={dialogMode === 'view'}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                {t('partnerManagement.status')}
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  displayEmpty
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="active">{t('partnerManagement.active')}</MenuItem>
                  <MenuItem value="inactive">{t('partnerManagement.inactive')}</MenuItem>
                  <MenuItem value="suspended">{t('partnerManagement.suspended')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                {t('partnerManagement.notes')}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder={t('partnerManagement.placeholderNotes')}
                disabled={dialogMode === 'view'}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          {dialogMode === 'view' ? (
            <>
              <Button onClick={() => setOpenDialog(false)}>{t('partnerManagement.close')}</Button>
              <Tooltip
                title={
                  selectedPartner?.recordSource === 'room_guest'
                    ? t('partnerManagement.roomGuestReadOnly')
                    : t('common.menuNoEdit')
                }
                disableHoverListener={
                  selectedPartner?.recordSource === 'room_guest'
                    ? false
                    : menuFlags.menusLoading || menuFlags.canEdit
                }
              >
                <span style={{ display: 'inline-flex' }}>
                  <Button 
                    onClick={() => {
                      setDialogMode('edit');
                    }} 
                    variant="contained"
                    startIcon={<EditIcon />}
                    disabled={
                      menuFlags.menusLoading ||
                      !menuFlags.canEdit ||
                      selectedPartner?.recordSource === 'room_guest'
                    }
                  >
                    {t('partnerManagement.edit')}
                  </Button>
                </span>
              </Tooltip>
            </>
          ) : (
            <>
              <Button onClick={() => setOpenDialog(false)}>{t('partnerManagement.cancel')}</Button>
              <Tooltip
                title={
                  dialogMode === 'add'
                    ? t('common.menuNoCreate')
                    : t('common.menuNoEdit')
                }
                disableHoverListener={
                  menuFlags.menusLoading ||
                  (dialogMode === 'add' ? menuFlags.canCreate : menuFlags.canEdit)
                }
              >
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={
                      menuFlags.menusLoading ||
                      (dialogMode === 'add' ? !menuFlags.canCreate : !menuFlags.canEdit)
                    }
                  >
                    {t('partnerManagement.save')}
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Excel 가져오기 다이얼로그 */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => {
          setImportDialogOpen(false);
          setImportFile(null);
          setImportResult(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('partnerManagement.importDialogTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('partnerManagement.importDialogDesc')}
            </Typography>
            
            <input
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              id="excel-file-input"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="excel-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {importFile ? importFile.name : t('partnerManagement.selectExcelFile')}
              </Button>
            </label>

            {importResult && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('partnerManagement.importResult')}
                </Typography>
                <Typography variant="body2">
                  {t('partnerManagement.importResultSummary', { total: importResult.data?.total || 0, success: importResult.data?.success?.length || 0 })}
                  {importResult.data?.failed?.length > 0 && (
                    <>, {t('partnerManagement.importFailedCount', { count: importResult.data.failed.length })}</>
                  )}
                </Typography>
                
                {importResult.data?.failed && importResult.data.failed.length > 0 && (
                  <Box sx={{ mt: 2, maxHeight: 200, overflow: 'auto' }}>
                    <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>
                      {t('partnerManagement.importFailedItems')}
                    </Typography>
                    {importResult.data.failed.map((item: any, index: number) => (
                      <Typography key={index} variant="caption" display="block" sx={{ mt: 0.5 }}>
                        {t('partnerManagement.row')} {item.row}: {item.error}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setImportDialogOpen(false);
              setImportFile(null);
              setImportResult(null);
            }}
          >
            {t('partnerManagement.cancel')}
          </Button>
          <Button 
            onClick={handleImportExcel} 
            variant="contained" 
            disabled={menuFlags.menusLoading || !menuFlags.canMutate || !importFile || importLoading}
          >
            {importLoading ? t('partnerManagement.importLoading') : t('partnerManagement.importButton')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notify !== null}
        autoHideDuration={8000}
        onClose={() => setNotify(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotify(null)}
          severity={notify?.severity ?? 'error'}
          variant="filled"
          sx={{ width: '100%', maxWidth: 560, whiteSpace: 'pre-line' }}
        >
          {notify?.message}
        </Alert>
      </Snackbar>

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

export default PartnerManagement;
