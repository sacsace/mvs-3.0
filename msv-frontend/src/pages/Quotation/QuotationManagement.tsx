import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Description as QuotationIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  CheckCircle as ApprovedIcon,
  Pending as PendingIcon,
  Cancel as RejectedIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { companyService, partnerService, quotationService } from '../../services/api';

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
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  notes: string;
  items: QuotationItem[];
  createdBy: string;
  lastModified: string;
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
}

const QuotationManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useStore();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<Quotation[]>([]);
  const [partners, setPartners] = useState<PartnerCustomer[]>([]);
  const [issuingCompany, setIssuingCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(false);
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

  const loadQuotationData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await quotationService.getQuotations({});
      if (response?.success) {
        const list = Array.isArray(response.data) ? response.data : [];
        setQuotations(list);
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

  const loadPartners = useCallback(async () => {
    try {
      const response = await partnerService.getPartners();
      if (response?.success) {
        const data = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
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
      }
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
          business_number: data.business_number || ''
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
  }, [loadIssuingCompany, loadPartners, loadQuotationData]);

  useEffect(() => {
    filterQuotations();
  }, [filterQuotations]);

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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label={t('quotationManagement.statusDraft')} color="default" size="small" />;
      case 'sent':
        return <Chip label={t('quotationManagement.statusSent')} color="info" size="small" />;
      case 'approved':
        return <Chip label={t('quotationManagement.statusApproved')} color="success" size="small" />;
      case 'rejected':
        return <Chip label={t('quotationManagement.statusRejected')} color="error" size="small" />;
      case 'expired':
        return <Chip label={t('quotationManagement.statusExpired')} color="warning" size="small" />;
      default:
        return <Chip label={t('quotationManagement.statusUnknown')} color="default" size="small" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <PendingIcon color="action" />;
      case 'sent':
        return <EmailIcon color="info" />;
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

  const handleAddQuotation = () => {
    setSelectedQuotation(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleDeleteQuotation = async (id: number) => {
    showConfirm(
      t('quotationManagement.confirmDelete'),
      async () => {
        try {
          setQuotations(prev => prev.filter(quotation => quotation.id !== id));
          setSuccess(t('quotationManagement.deleted'));
        } catch (error) {
          console.error('삭제 오류:', error);
          setError(t('quotationManagement.deleteFailed'));
        }
      },
      { confirmColor: 'error' }
    );
  };

  const handleSaveQuotation = async (quotationData: Partial<Quotation>) => {
    try {
      if (selectedQuotation) {
        // 수정
        setQuotations(prev =>
          prev.map(quotation => quotation.id === selectedQuotation.id ? { 
            ...quotation, 
            ...quotationData,
            quotationNumber: quotation.quotationNumber
          } : quotation)
        );
        setSuccess(t('quotationManagement.updated'));
      } else {
        // 추가
        const nextQuotationNumber = getNextQuotationNumber();
        const newQuotation: Quotation = {
          id: Math.max(...quotations.map(q => q.id)) + 1,
          quotationNumber: nextQuotationNumber,
          ...quotationData,
          lastModified: new Date().toISOString().replace('T', ' ').substring(0, 19)
        } as Quotation;
        setQuotations(prev => [...prev, newQuotation]);
        setSuccess(t('quotationManagement.created'));
      }
      setIsCreating(false);
      setIsEditing(false);
      setSelectedQuotation(null);
    } catch (error) {
      console.error('저장 오류:', error);
      setError(t('quotationManagement.saveFailed'));
    }
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedQuotation(null);
  };

  const handlePrintQuotation = (quotation: Quotation) => {
    // 실제 구현에서는 PDF 생성 로직
    console.log('견적서 인쇄:', quotation);
    setSuccess(t('quotationManagement.printed'));
  };

  const handleEmailQuotation = (quotation: Quotation) => {
    // 실제 구현에서는 이메일 발송 로직
    console.log('견적서 이메일 발송:', quotation);
    setSuccess(t('quotationManagement.emailed'));
  };

  const totalAmount = quotations.reduce((sum, quotation) => sum + quotation.totalAmount, 0);
  const approvedQuotations = quotations.filter(quotation => quotation.status === 'approved').length;
  const pendingQuotations = quotations.filter(quotation => quotation.status === 'sent').length;
  const draftQuotations = quotations.filter(quotation => quotation.status === 'draft').length;

  const paginatedQuotations = filteredQuotations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QuotationIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{ 
            fontSize: '16px !important',
            fontWeight: 600,
            color: 'red',
            lineHeight: 1.5
          }}>
            {t('quotationManagement.title')}
          </Typography>
        </Box>
        {isCreating || isEditing ? (
          <Button variant="outlined" onClick={handleCancelForm} sx={{ borderRadius: 2 }}>
            {t('common.back')}
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddQuotation}
            sx={{ borderRadius: 2 }}
          >
            {t('quotationManagement.create')}
          </Button>
        )}
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('quotationManagement.totalQuotations')}
            </Typography>
            <Typography variant="h4">
              {quotations.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('quotationManagement.totalAmount')}
            </Typography>
            <Typography variant="h4">
              Rs. {totalAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('quotationManagement.approvedQuotations')}
            </Typography>
            <Typography variant="h4" color="success.main">
              {approvedQuotations}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('quotationManagement.pendingQuotations')}
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingQuotations}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {isCreating || isEditing ? (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              {selectedQuotation ? t('quotationManagement.editTitle') : t('quotationManagement.create')}
            </Typography>
            <QuotationForm
              quotation={selectedQuotation}
              onSave={handleSaveQuotation}
              onCancel={handleCancelForm}
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
              nextQuotationNumber={getNextQuotationNumber()}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 필터 및 검색 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' },
                gap: 2, 
                alignItems: 'center' 
              }}>
                <TextField
                  fullWidth
                  placeholder={t('quotationManagement.searchPlaceholder')}
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
                <FormControl fullWidth>
                  <InputLabel>{t('quotationManagement.status')}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">{t('menuPermissionManagement.all')}</MenuItem>
                    <MenuItem value="draft">{t('quotationManagement.statusDraft')}</MenuItem>
                    <MenuItem value="sent">{t('quotationManagement.statusSent')}</MenuItem>
                    <MenuItem value="approved">{t('quotationManagement.statusApproved')}</MenuItem>
                    <MenuItem value="rejected">{t('quotationManagement.statusRejected')}</MenuItem>
                    <MenuItem value="expired">{t('quotationManagement.statusExpired')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  placeholder={t('quotationManagement.customerSearchPlaceholder')}
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setCustomerFilter('');
                  }}
                >
                  {t('common.reset')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 견적서 목록 테이블 */}
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('quotationManagement.status')}</TableCell>
                    <TableCell>{t('quotationManagement.quotationNumber')}</TableCell>
                    <TableCell>{t('quotationManagement.customerName')}</TableCell>
                    <TableCell>{t('quotationManagement.issueDate')}</TableCell>
                    <TableCell>{t('quotationManagement.validUntil')}</TableCell>
                    <TableCell>{t('quotationManagement.totalAmount')}</TableCell>
                    <TableCell>{t('common.create')}</TableCell>
                    <TableCell>{t('quotationManagement.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedQuotations.map((quotation) => (
                    <TableRow key={quotation.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(quotation.status)}
                          {getStatusChip(quotation.status)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {quotation.quotationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {quotation.customerName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {quotation.customerEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{quotation.issueDate}</TableCell>
                      <TableCell>{quotation.validUntil}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Rs. {quotation.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>{quotation.createdBy}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={t('quotationManagement.view')}>
                            <IconButton size="small" onClick={() => handleEditQuotation(quotation)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('quotationManagement.edit')}>
                            <IconButton size="small" onClick={() => handleEditQuotation(quotation)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('quotationManagement.print')}>
                            <IconButton size="small" onClick={() => handlePrintQuotation(quotation)}>
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('quotationManagement.email')}>
                            <IconButton size="small" onClick={() => handleEmailQuotation(quotation)}>
                              <EmailIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('quotationManagement.delete')}>
                            <IconButton size="small" onClick={() => handleDeleteQuotation(quotation.id)}>
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
                count={Math.ceil(filteredQuotations.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </Card>
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

// 견적서 폼 컴포넌트
interface QuotationFormProps {
  quotation: Quotation | null;
  onSave: (data: Partial<Quotation>) => void;
  onCancel: () => void;
  customers: Array<{
    name: string;
    email: string;
    phone: string;
    address: string;
  }>;
  issuingCompany: CompanyInfo | null;
  nextQuotationNumber: string;
}

const QuotationForm: React.FC<QuotationFormProps> = ({ 
  quotation, 
  onSave, 
  onCancel,
  customers,
  issuingCompany,
  nextQuotationNumber
}) => {
  const productNameRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    customerName: quotation?.customerName || '',
    customerEmail: quotation?.customerEmail || '',
    customerPhone: quotation?.customerPhone || '',
    customerAddress: quotation?.customerAddress || '',
    validUntil: quotation?.validUntil || '',
    notes: quotation?.notes || '',
    taxType: 'cgst_sgst',
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 0,
    discount: quotation?.discount || 0
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { subtotal, taxAmount, totalAmount, cgstRate, sgstRate, igstRate } = calculateTotals();
    const fallbackValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    
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
      status: 'draft',
      createdBy: '현재 사용자'
    });
  };

  const handleEmailSend = () => {
    // TODO: 실제 PDF 생성 + 이메일 전송 API 연동 필요
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    alert('견적서가 PDF로 이메일 전송됩니다. (API 연동 필요)');
  };

  const { subtotal, totalAmount, cgstRate, sgstRate, igstRate } = calculateTotals();
  const selectedCustomer = customers.find(customer => customer.name === formData.customerName);
  const quoteNumber = quotation?.quotationNumber || nextQuotationNumber;

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
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Box sx={{ border: '1px solid #cfcfcf', borderRadius: 2, bgcolor: '#fff', p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box sx={{ minWidth: 220 }}>
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
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                required
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
          </Box>
        </Box>

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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>DESCRIPTION</TableCell>
                <TableCell align="right">QTY</TableCell>
                <TableCell align="right">UNIT PRICE</TableCell>
                <TableCell align="right">AMOUNT</TableCell>
                <TableCell align="center">-</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="상품명"
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItemAndFocus();
                        }
                      }}
                      inputRef={(el) => { productNameRefs.current[index] = el; }}
                        required
                      />
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="설명"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItemAndFocus();
                        }
                      }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <TextField
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
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
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
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">Rs. {item.finalPrice.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="center">
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onCancel} variant="outlined">
            취소
          </Button>
        <Button variant="outlined" onClick={handleEmailSend}>
          이메일 전송
        </Button>
          <Button type="submit" variant="contained">
            {quotation ? '수정' : '저장'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default QuotationManagement;