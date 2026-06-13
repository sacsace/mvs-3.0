import React, { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
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
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { partnerService } from '../../services/api';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';

const PARTNER_MENU_ROUTES = ['/basic-info/partners', '/basic-info'] as const;

interface Partner {
  id: number;
  companyName: string;
  businessNumber: string;
  panNumber?: string;
  gstNumbers: string[];
  representative: string;
  businessType: 'partner' | 'customer' | 'other';
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
}

const PartnerManagement: React.FC = () => {
  const { t } = useTranslation();
  const menuFlags = useMenuRoutePermissionFlags(PARTNER_MENU_ROUTES);
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
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

  // 파트너 목록 불러오기
  const loadPartners = useCallback(async () => {
    if (menuFlags.menusLoading || !menuFlags.canRead) {
      setPartners([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
            const response = await partnerService.getPartners();
            
      if (response && response.success) {
        const partnersData = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
                
        // API 응답을 프론트엔드 형식으로 변환
        const formattedPartners: Partner[] = partnersData.map((p: any) => ({
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
          notes: p.notes || ''
        }));
        
                        setPartners(formattedPartners);
      } else {
        console.error('❌ [파트너 관리] API 응답 실패:', response);
        setPartners([]);
      }
    } catch (error: any) {
      console.error('❌ [파트너 관리] 파트너 목록 로드 오류:', error);
      console.error('❌ [파트너 관리] 에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setPartners([]);
    } finally {
      setLoading(false);
          }
  }, [menuFlags.menusLoading, menuFlags.canRead]);

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
    // GST 번호 검증: 최소 1개 이상, 빈 값 제거
    const validGstNumbers = formData.gstNumbers.filter(gst => gst.trim() !== '');
    if (validGstNumbers.length === 0) {
      setNotify({ message: t('partnerManagement.gstMinOneRequired'), severity: 'warning' });
      return;
    }
    
    const formDataWithValidGst = {
      ...formData,
      gstNumbers: validGstNumbers
    };

    try {
      if (selectedPartner) {
        // 수정
        await partnerService.updatePartner(selectedPartner.id, formDataWithValidGst);
      } else {
        // 생성
        await partnerService.createPartner(formDataWithValidGst);
      }
      setOpenDialog(false);
      // 목록 다시 불러오기
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

  const handleDelete = async (id: number) => {
    showConfirm(
      t('partnerManagement.confirmDelete'),
      async () => {
        try {
          await partnerService.deletePartner(id);
          // 목록 다시 불러오기
          loadPartners();
        } catch (error: any) {
          setNotify({
            message: error.response?.data?.message || t('partnerManagement.deleteError'),
            severity: 'error'
          });
        }
      },
      { confirmColor: 'error' }
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
      other: t('partnerManagement.typeOther')
    };
    return typeConfig[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colorConfig = {
      partner: 'primary',
      customer: 'success',
      other: 'default'
    };
    return colorConfig[type as keyof typeof colorConfig] || 'default';
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { labelKey: 'partnerManagement.active' as const, color: 'success' as const },
      inactive: { labelKey: 'partnerManagement.inactive' as const, color: 'default' as const },
      suspended: { labelKey: 'partnerManagement.suspended' as const, color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;
    return <Chip label={t(config.labelKey)} color={config.color} size="small" />;
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = searchTerm === '' || 
                          partner.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (partner.representative && partner.representative.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (partner.industry && partner.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (partner.address && partner.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          partner.businessNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    const matchesType = typeFilter === 'all' || partner.businessType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <Box sx={{ 
      p: 0,
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Box>
          <Typography component="h1" variant="pageTitle" sx={{ mb: 1 }}>
            {t('partnerManagement.pageTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {t('partnerManagement.description')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                disabled={menuFlags.menusLoading || !menuFlags.canRead}
                onClick={handleDownloadSample}
                sx={{ borderRadius: 2 }}
              >
                {t('partnerManagement.excelSampleDownload')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                disabled={menuFlags.menusLoading || !menuFlags.canRead}
                onClick={handleExportExcel}
                sx={{ borderRadius: 2 }}
              >
                {t('partnerManagement.excelExport')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canMutate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                disabled={menuFlags.menusLoading || !menuFlags.canMutate}
                onClick={() => setImportDialogOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                {t('partnerManagement.excelImport')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                onClick={handleAdd}
                sx={{ borderRadius: 2 }}
              >
                {t('partnerManagement.addPartner')}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {!menuFlags.menusLoading && !menuFlags.canRead && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('common.menuNoView')}
        </Alert>
      )}

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'flex-end', 
            flexWrap: 'wrap',
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <TextField
              placeholder={t('partnerManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={menuFlags.menusLoading || !menuFlags.canRead}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                minWidth: { xs: '100%', sm: 300 },
                flex: { xs: '1 1 100%', sm: '1 1 auto' }
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                {t('partnerManagement.status')}
              </Typography>
              <FormControl sx={{ minWidth: { xs: '100%', sm: 120 }, width: { xs: '100%', sm: 'auto' } }} disabled={menuFlags.menusLoading || !menuFlags.canRead}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                  sx={{ height: '40px' }}
                >
                  <MenuItem value="all">{t('partnerManagement.allStatus')}</MenuItem>
                  <MenuItem value="active">{t('partnerManagement.active')}</MenuItem>
                  <MenuItem value="inactive">{t('partnerManagement.inactive')}</MenuItem>
                  <MenuItem value="suspended">{t('partnerManagement.suspended')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                {t('partnerManagement.companyType')}
              </Typography>
              <FormControl sx={{ minWidth: { xs: '100%', sm: 120 }, width: { xs: '100%', sm: 'auto' } }} disabled={menuFlags.menusLoading || !menuFlags.canRead}>
                <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    displayEmpty
                    sx={{ height: '40px' }}
                  >
                    <MenuItem value="all">{t('partnerManagement.allTypes')}</MenuItem>
                    <MenuItem value="partner">{t('partnerManagement.typePartner')}</MenuItem>
                    <MenuItem value="customer">{t('partnerManagement.typeCustomer')}</MenuItem>
                    <MenuItem value="customer_partner">{t('partnerManagement.typeCustomerPartner')}</MenuItem>
                    <MenuItem value="other">{t('partnerManagement.typeOther')}</MenuItem>
                  </Select>
              </FormControl>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 파트너 목록 테이블 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <TableContainer
            sx={{
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              overflow: 'hidden'
            }}
          >
            <Table sx={{ borderCollapse: 'collapse' }}>
              <TableHead>
                <TableRow
                  sx={{
                    '& .MuiTableCell-head': {
                      backgroundColor: '#F5F6F8',
                      color: '#64748B',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      py: 1.25,
                      borderBottom: '1px solid #E2E8F0',
                      borderRight: 'none',
                      borderLeft: 'none',
                      borderTop: 'none'
                    }
                  }}
                >
                  <TableCell>{t('partnerManagement.companyInfo')}</TableCell>
                  <TableCell>{t('partnerManagement.representative')}</TableCell>
                  <TableCell>{t('partnerManagement.companyType')}</TableCell>
                  <TableCell>{t('partnerManagement.industry')}</TableCell>
                  <TableCell>{t('partnerManagement.contact')}</TableCell>
                  <TableCell>{t('partnerManagement.contractPeriod')}</TableCell>
                  <TableCell>{t('partnerManagement.status')}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{t('partnerManagement.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPartners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <HandshakeIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
                        <Typography variant="body1" color="text.secondary">
                          {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                            ? t('partnerManagement.noPartnersMatch')
                            : t('partnerManagement.noPartners')}
                        </Typography>
                        {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                          <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menuFlags.menusLoading || menuFlags.canCreate}>
                            <span style={{ display: 'inline-flex' }}>
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            disabled={menuFlags.menusLoading || !menuFlags.canCreate}
                            onClick={() => {
                              setDialogMode('add');
                              setSelectedPartner(null);
                              setFormData({
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
                              setOpenDialog(true);
                            }}
                            sx={{ mt: 1 }}
                          >
                            {t('partnerManagement.firstPartnerAdd')}
                          </Button>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners.map((partner) => (
                  <TableRow 
                    key={partner.id} 
                    hover
                    onClick={() => {
                      if (!menuFlags.menusLoading && menuFlags.canRead) handleView(partner);
                    }}
                    sx={{ 
                      cursor: menuFlags.menusLoading || !menuFlags.canRead ? 'default' : 'pointer',
                      '&:hover': {
                        backgroundColor: menuFlags.menusLoading || !menuFlags.canRead ? undefined : '#f5f5f5'
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {partner.companyName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {partner.companyName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('partnerManagement.businessNumberLabel')}: {partner.businessNumber}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        {partner.representative}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(partner.businessType)}
                        color={getTypeColor(partner.businessType) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {partner.industry}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">{partner.email || '-'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {partner.contractStartDate} ~ {partner.contractEndDate}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(partner.status)}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={menuFlags.menusLoading || !menuFlags.canDelete ? t('common.menuNoDelete') : t('partnerManagement.delete')}>
                          <span style={{ display: 'inline-flex' }}>
                            <IconButton
                              size="small"
                              disabled={menuFlags.menusLoading || !menuFlags.canDelete}
                              onClick={() => handleDelete(partner.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

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
                    required
                    error={gstNumber.trim() === '' && formData.gstNumbers.filter(g => g.trim() !== '').length === 0}
                    helperText={gstNumber.trim() === '' && formData.gstNumbers.filter(g => g.trim() !== '').length === 0 ? t('partnerManagement.placeholderGstRequired') : ''}
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
              <Tooltip title={t('common.menuNoEdit')} disableHoverListener={menuFlags.menusLoading || menuFlags.canEdit}>
                <span style={{ display: 'inline-flex' }}>
                  <Button 
                    onClick={() => {
                      setDialogMode('edit');
                    }} 
                    variant="contained"
                    startIcon={<EditIcon />}
                    disabled={menuFlags.menusLoading || !menuFlags.canEdit}
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
