import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Tooltip,
  Tabs,
  Tab,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  LocalShipping as LocalShippingIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  LocalShipping as DirectionsTruckIcon,
  Route as RouteIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { mvsSearchFieldSx } from '../../theme/mvsLayout';

const eWayBillFilterLabelSx = {
  color: 'text.secondary',
  fontWeight: 600,
  mb: 0.5,
  display: 'block',
  fontSize: '0.75rem',
  lineHeight: '18px',
  minHeight: 18,
};

const eWayBillFilterSelectSx = {
  borderRadius: '12px',
  bgcolor: '#FFFFFF',
  height: 40,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#C5CED9' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8C4D0' },
};

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
interface EWayBill {
  id: string;
  ewayBillNumber: string;
  eInvoiceId: string;
  eInvoiceNumber: string;
  transporter: {
    id: string;
    name: string;
    gstin: string;
    phone: string;
    email: string;
  };
  vehicle: {
    number: string;
    type: 'Regular' | 'Over Dimensional Cargo';
    capacity: number;
  };
  transportDetails: {
    fromAddress: string;
    toAddress: string;
    distance: number; // km
    transportDate: string;
    transportTime: string;
  };
  goods: Array<{
    id: string;
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    value: number;
  }>;
  totalValue: number;
  status: 'draft' | 'generated' | 'active' | 'expired' | 'cancelled';
  generatedAt: string;
  validUntil: string;
  qrCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface EInvoice {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    gstin: string;
    address: string;
  };
  totalAmount: number;
  status: string;
}

const EWayBillManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useStore();
  const [ewayBills, setEwayBills] = useState<EWayBill[]>([]);
  const [einvoices, setEinvoices] = useState<EInvoice[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedEwayBill, setSelectedEwayBill] = useState<EWayBill | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');

  // 폼 상태
  const [formData, setFormData] = useState({
    eInvoiceId: '',
    transporterId: '',
    vehicleNumber: '',
    vehicleType: 'Regular' as 'Regular' | 'Over Dimensional Cargo',
    vehicleCapacity: 0,
    fromAddress: '',
    toAddress: '',
    distance: 0,
    transportDate: new Date().toISOString().split('T')[0],
    transportTime: '09:00'
  });

  const loadCompanies = useCallback(async () => {
    try {
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error) {
      console.error('회사 목록 로드 오류:', error);
    }
  }, []);

  const loadEwayBillData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }

      const [ewayBillsResponse, einvoicesResponse] = await Promise.all([
        api.get('/eway-bills', { params }),
        api.get('/accounting/e-invoices?status=generated')
      ]);

      if (ewayBillsResponse.data.success) {
        setEwayBills(ewayBillsResponse.data.data || []);
      }
      if (einvoicesResponse.data.success) {
        setEinvoices(einvoicesResponse.data.data || []);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setError(t('eWayBillManagement.errors.loadData'));
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, user?.role, t]);

  // 데이터 로드
  useEffect(() => {
    loadEwayBillData();
    if (user?.role === 'root' || user?.role === 'audit') {
      loadCompanies();
    }
  }, [loadCompanies, loadEwayBillData, user?.role]);

  // 탭 변경
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // E-Way Bill 생성
  const handleCreate = async () => {
    try {
      const response = await api.post('/eway-bills', formData);
      if (response.data.success) {
        setEwayBills(prev => [response.data.data, ...prev]);
        setOpenDialog(false);
        setFormData({
          eInvoiceId: '',
          transporterId: '',
          vehicleNumber: '',
          vehicleType: 'Regular',
          vehicleCapacity: 0,
          fromAddress: '',
          toAddress: '',
          distance: 0,
          transportDate: new Date().toISOString().split('T')[0],
          transportTime: '09:00'
        });
      }
    } catch (error) {
      console.error('E-Way Bill 생성 오류:', error);
      setError(t('eWayBillManagement.errors.createEWayBill'));
    }
  };

  // E-Invoice에서 E-Way Bill 자동 생성
  const handleCreateFromEInvoice = async (eInvoiceId: string) => {
    try {
      const response = await api.post(`/accounting/e-invoices/${eInvoiceId}/create-eway-bill`);
      if (response.data.success) {
        setEwayBills(prev => [response.data.data, ...prev]);
        setError('');
      }
    } catch (error) {
      console.error('E-Invoice에서 E-Way Bill 생성 오류:', error);
      setError(t('eWayBillManagement.errors.createEWayBill'));
    }
  };

  // 상태 업데이트
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await api.put(`/eway-bills/${id}/status`, { status });
      if (response.data.success) {
        setEwayBills(prev => prev.map(ewayBill => 
          ewayBill.id === id ? { ...ewayBill, status: status as any } : ewayBill
        ));
      }
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
      setError(t('eWayBillManagement.errors.updateStatus'));
    }
  };

  // E-Way Bill 상세 보기
  const handleView = (ewayBill: EWayBill) => {
    setSelectedEwayBill(ewayBill);
    setOpenViewDialog(true);
  };

  // 상태 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'generated': return 'info';
      case 'active': return 'success';
      case 'expired': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // 상태 라벨 반환
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('eWayBillManagement.status.draft');
      case 'generated': return t('eWayBillManagement.status.generated');
      case 'active': return t('eWayBillManagement.status.active');
      case 'expired': return t('eWayBillManagement.status.expired');
      case 'cancelled': return t('eWayBillManagement.status.cancelled');
      default: return status;
    }
  };

  // 필터링된 데이터
  const filteredEwayBills = useMemo(() => (
    ewayBills.filter((ewayBill) => {
      const matchesStatus = filterStatus === 'all' || ewayBill.status === filterStatus;
      const matchesSearch = searchTerm === '' || 
        ewayBill.ewayBillNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.eInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.transporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.transporter.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ewayBill.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
  ), [ewayBills, filterStatus, searchTerm]);

  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LocalShippingIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
        <Typography component="h1" variant="pageTitle">
          {t('eWayBillManagement.title')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('eWayBillManagement.description')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label={t('eWayBillManagement.tabs.list')} />
              <Tab label={t('eWayBillManagement.tabs.fromInvoice')} />
              <Tab label={t('eWayBillManagement.tabs.transportStatus')} />
              <Tab label={t('eWayBillManagement.tabs.analytics')} />
            </Tabs>
          </Box>

          {/* E-Way Bill 목록 */}
          <TabPanel value={activeTab} index={0}>
            {/* 검색 및 필터 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: (user?.role === 'root' || user?.role === 'audit') ? '2fr 1fr 1fr 1fr' : '2fr 1fr 1fr',
                    },
                    gap: 2,
                    alignItems: 'flex-end',
                    ...mvsSearchFieldSx,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" sx={eWayBillFilterLabelSx}>
                      {t('eWayBillManagement.filters.search')}
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={t('eWayBillManagement.filters.searchPlaceholder')}
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
                  {(user?.role === 'root' || user?.role === 'audit') && (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="caption" sx={eWayBillFilterLabelSx}>
                        {t('eWayBillManagement.filters.company')}
                      </Typography>
                      <FormControl fullWidth size="small">
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
                          sx={eWayBillFilterSelectSx}
                        >
                          <MenuItem value="">{t('eWayBillManagement.filters.allCompanies')}</MenuItem>
                          {companies.map((company) => (
                            <MenuItem key={company.id} value={company.id}>
                              {company.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" sx={eWayBillFilterLabelSx}>
                      {t('eWayBillManagement.filters.status')}
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        displayEmpty
                        sx={eWayBillFilterSelectSx}
                      >
                        <MenuItem value="all">{t('eWayBillManagement.filters.allStatus')}</MenuItem>
                        <MenuItem value="draft">{t('eWayBillManagement.status.draft')}</MenuItem>
                        <MenuItem value="generated">{t('eWayBillManagement.status.generated')}</MenuItem>
                        <MenuItem value="active">{t('eWayBillManagement.status.active')}</MenuItem>
                        <MenuItem value="expired">{t('eWayBillManagement.status.expired')}</MenuItem>
                        <MenuItem value="cancelled">{t('eWayBillManagement.status.cancelled')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography
                      variant="caption"
                      sx={{ ...eWayBillFilterLabelSx, visibility: 'hidden', userSelect: 'none' }}
                      aria-hidden
                    >
                      {t('eWayBillManagement.actions.reset')}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<FilterListIcon />}
                      onClick={() => {
                        setSearchTerm('');
                        setFilterStatus('all');
                        setSelectedCompanyId('');
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
                      {t('eWayBillManagement.actions.reset')}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">{t('eWayBillManagement.list.title', { count: filteredEwayBills.length })}</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                {t('eWayBillManagement.actions.newEWayBill')}
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredEwayBills.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {ewayBills.length === 0 ? t('eWayBillManagement.empty.noEWayBills') : t('eWayBillManagement.empty.noSearchResults')}
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
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
                    <TableCell>{t('eWayBillManagement.columns.eWayBillNo')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.eInvoiceNo')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.transporter')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.vehicleNo')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.distance')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.status')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.createdDate')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.validUntil')}</TableCell>
                    <TableCell>{t('eWayBillManagement.columns.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEwayBills.map((ewayBill) => (
                    <TableRow key={ewayBill.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {ewayBill.ewayBillNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="primary">
                          {ewayBill.eInvoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {ewayBill.transporter.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            GSTIN: {ewayBill.transporter.gstin}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DirectionsTruckIcon fontSize="small" />
                          <Typography variant="body2">
                            {ewayBill.vehicle.number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <RouteIcon fontSize="small" />
                          <Typography variant="body2">
                            {ewayBill.transportDetails.distance} km
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(ewayBill.status)}
                          size="small"
                          color={getStatusColor(ewayBill.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(ewayBill.generatedAt).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'ko-KR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(ewayBill.validUntil).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'ko-KR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={t('eWayBillManagement.actions.view')}>
                            <IconButton size="small" onClick={() => handleView(ewayBill)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('eWayBillManagement.actions.qrCode')}>
                            <IconButton size="small">
                              <QrCodeIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('eWayBillManagement.actions.activate')}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(ewayBill.id, 'active')}
                              disabled={ewayBill.status !== 'generated'}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('common.cancel')}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(ewayBill.id, 'cancelled')}
                              disabled={ewayBill.status === 'expired' || ewayBill.status === 'cancelled'}
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
          </TabPanel>

          {/* E-Invoice에서 생성 */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              {t('eWayBillManagement.fromInvoice.description')}
            </Typography>
            <TableContainer component={Paper}>
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
                    <TableCell>{t('eWayBillManagement.fromInvoice.columns.eInvoiceNo')}</TableCell>
                    <TableCell>{t('eWayBillManagement.fromInvoice.columns.customer')}</TableCell>
                    <TableCell>{t('eWayBillManagement.fromInvoice.columns.amount')}</TableCell>
                    <TableCell>{t('eWayBillManagement.fromInvoice.columns.status')}</TableCell>
                    <TableCell>E-Way Bill</TableCell>
                    <TableCell>{t('eWayBillManagement.fromInvoice.columns.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {einvoices.map((einvoice) => (
                    <TableRow key={einvoice.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {einvoice.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {einvoice.customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            GSTIN: {einvoice.customer.gstin}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          Rs. {einvoice.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t('eWayBillManagement.status.generated')}
                          size="small"
                          color="success"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<LocalShippingIcon />}
                          onClick={() => handleCreateFromEInvoice(einvoice.id)}
                        >
                          {t('eWayBillManagement.actions.createEWayBill')}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* 운송 현황 */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              {t('eWayBillManagement.transport.title')}
            </Typography>
            {ewayBills.filter(eb => eb.status === 'active').length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('eWayBillManagement.comingSoon.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('eWayBillManagement.comingSoon.transport')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                {ewayBills.filter(eb => eb.status === 'active').map((ewayBill) => (
                <Card key={ewayBill.id} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        {ewayBill.ewayBillNumber}
                      </Typography>
                      <Chip label={t('eWayBillManagement.transport.inTransit')} color="success" size="small" />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <DirectionsTruckIcon color="action" />
                      <Typography variant="body2">
                        {ewayBill.vehicle.number} ({ewayBill.vehicle.type})
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <RouteIcon color="action" />
                      <Typography variant="body2">
                        {ewayBill.transportDetails.distance} km
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <TimerIcon color="action" />
                      <Typography variant="body2">
                        {ewayBill.transportDetails.transportDate} {ewayBill.transportDetails.transportTime}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {ewayBill.transporter.name}
                      </Typography>
                      <IconButton size="small">
                        <QrCodeIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
                ))}
              </Box>
            )}
          </TabPanel>

          {/* 통계 및 분석 */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              {t('eWayBillManagement.analytics.title')}
            </Typography>
            {ewayBills.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {t('eWayBillManagement.comingSoon.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('eWayBillManagement.comingSoon.analytics')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {ewayBills.length}
                    </Typography>
                    <Typography variant="body2">{t('eWayBillManagement.analytics.totalEWayBills')}</Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="success">
                      {ewayBills.filter(eb => eb.status === 'active').length}
                    </Typography>
                    <Typography variant="body2">{t('eWayBillManagement.analytics.activeEWayBills')}</Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="info">
                      {ewayBills.filter(eb => eb.status === 'generated').length}
                    </Typography>
                    <Typography variant="body2">{t('eWayBillManagement.analytics.generatedEWayBills')}</Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="warning">
                      {ewayBills.reduce((sum, eb) => sum + eb.transportDetails.distance, 0)} km
                    </Typography>
                    <Typography variant="body2">{t('eWayBillManagement.analytics.totalDistance')}</Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
          </TabPanel>
        </CardContent>
      </Card>

      {/* E-Way Bill 생성 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('eWayBillManagement.dialog.createTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>{t('eWayBillManagement.dialog.selectEInvoice')}</InputLabel>
              <Select
                value={formData.eInvoiceId}
                onChange={(e) => setFormData(prev => ({ ...prev, eInvoiceId: e.target.value }))}
              >
                {einvoices.map((einvoice) => (
                  <MenuItem key={einvoice.id} value={einvoice.id}>
                    {einvoice.invoiceNumber} - {einvoice.customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label={t('eWayBillManagement.dialog.vehicleNo')}
              value={formData.vehicleNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
            />
            
            <FormControl fullWidth>
              <InputLabel>{t('eWayBillManagement.dialog.vehicleType')}</InputLabel>
              <Select
                value={formData.vehicleType}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value as any }))}
              >
                <MenuItem value="Regular">{t('eWayBillManagement.dialog.vehicleTypeRegular')}</MenuItem>
                <MenuItem value="Over Dimensional Cargo">{t('eWayBillManagement.dialog.vehicleTypeOdc')}</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label={t('eWayBillManagement.dialog.vehicleCapacity')}
              type="number"
              value={formData.vehicleCapacity}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicleCapacity: Number(e.target.value) }))}
            />
            
            <TextField
              fullWidth
              label={t('eWayBillManagement.dialog.fromAddress')}
              multiline
              rows={2}
              value={formData.fromAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, fromAddress: e.target.value }))}
            />
            
            <TextField
              fullWidth
              label={t('eWayBillManagement.dialog.toAddress')}
              multiline
              rows={2}
              value={formData.toAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, toAddress: e.target.value }))}
            />
            
            <TextField
              fullWidth
              label={t('eWayBillManagement.dialog.distance')}
              type="number"
              value={formData.distance}
              onChange={(e) => setFormData(prev => ({ ...prev, distance: Number(e.target.value) }))}
            />
            
            <TextField
              fullWidth
              label={t('eWayBillManagement.dialog.transportDate')}
              type="date"
              value={formData.transportDate}
              onChange={(e) => setFormData(prev => ({ ...prev, transportDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              fullWidth
              label={t('eWayBillManagement.dialog.transportTime')}
              type="time"
              value={formData.transportTime}
              onChange={(e) => setFormData(prev => ({ ...prev, transportTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate}>
            {t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* E-Way Bill 상세 보기 다이얼로그 */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon color="primary" />
            {t('eWayBillManagement.detail.title')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedEwayBill && (
            <Box>
              {/* 헤더 정보 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6">{selectedEwayBill.ewayBillNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    E-Invoice: {selectedEwayBill.eInvoiceNumber}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={getStatusLabel(selectedEwayBill.status)}
                    color={getStatusColor(selectedEwayBill.status) as any}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t('eWayBillManagement.detail.createdDate')}: {new Date(selectedEwayBill.generatedAt).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'ko-KR')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 운송업체 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eWayBillManagement.detail.transporterInfo')}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.companyName')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.gstin}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.phone')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.phone}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.email')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.email}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 차량 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eWayBillManagement.detail.vehicleInfo')}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.vehicleNo')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.vehicle.number}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.vehicleType')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.vehicle.type}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.capacity')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.vehicle.capacity}{t('eWayBillManagement.units.ton')}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 운송 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eWayBillManagement.detail.transportInfo')}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.fromAddress')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.transportDetails.fromAddress}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.toAddress')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.transportDetails.toAddress}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.distance')}</Typography>
                    <Typography variant="body1">{selectedEwayBill.transportDetails.distance} {t('eWayBillManagement.units.km')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{t('eWayBillManagement.detail.transportDateTime')}</Typography>
                    <Typography variant="body1">
                      {selectedEwayBill.transportDetails.transportDate} {selectedEwayBill.transportDetails.transportTime}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* 상품 목록 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eWayBillManagement.detail.goodsList')}</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
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
                        <TableCell>{t('eWayBillManagement.detail.columns.description')}</TableCell>
                        <TableCell align="right">{t('eWayBillManagement.detail.columns.hsnCode')}</TableCell>
                        <TableCell align="right">{t('eWayBillManagement.detail.columns.quantity')}</TableCell>
                        <TableCell align="right">{t('eWayBillManagement.detail.columns.unit')}</TableCell>
                        <TableCell align="right">{t('eWayBillManagement.detail.columns.amount')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEwayBill.goods.map((good) => (
                        <TableRow key={good.id}>
                          <TableCell>{good.description}</TableCell>
                          <TableCell align="right">{good.hsnCode}</TableCell>
                          <TableCell align="right">{good.quantity}</TableCell>
                          <TableCell align="right">{good.unit}</TableCell>
                          <TableCell align="right">Rs. {good.value.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* QR 코드 */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom>{t('eWayBillManagement.detail.qrTitle')}</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  p: 2,
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  bgcolor: '#f5f5f5'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('eWayBillManagement.actions.qrCode')}: {selectedEwayBill.qrCode}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>{t('common.close')}</Button>
          <Button variant="outlined" startIcon={<PrintIcon />}>
            {t('common.print')}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />}>
            {t('common.download')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EWayBillManagement;
