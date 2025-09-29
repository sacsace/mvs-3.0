import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Grid,
  Avatar,
} from '@mui/material';
import {
  ReceiptLong as ReceiptLongIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  AttachMoney as AttachMoneyIcon,
  Description as DescriptionIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  QrCode as QrCodeIcon,
  LocalShipping as LocalShippingIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
  Verified as VerifiedIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../services/api';

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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
}

interface ProformaInvoice {
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

const EInvoiceManagement: React.FC = () => {
  const { user } = useStore();
  const [einvoices, setEinvoices] = useState<EInvoice[]>([]);
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedEInvoice, setSelectedEInvoice] = useState<EInvoice | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 폼 상태
  const [formData, setFormData] = useState({
    proformaInvoiceId: '',
    transactionType: 'B2B' as 'B2B' | 'B2C' | 'Export' | 'SEZ',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    terms: 'Payment due within 30 days of invoice date.'
  });

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [einvoicesResponse, proformaInvoicesResponse] = await Promise.all([
          api.get('/e-invoices'),
          api.get('/proforma-invoices?status=accepted')
        ]);

        if (einvoicesResponse.data.success) {
          setEinvoices(einvoicesResponse.data.data);
        }
        if (proformaInvoicesResponse.data.success) {
          setProformaInvoices(proformaInvoicesResponse.data.data);
        }
      } catch (error) {
        console.error('데이터 로드 오류:', error);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 탭 변경
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // E-Invoice 생성
  const handleCreate = async () => {
    try {
      const response = await api.post('/e-invoices', formData);
      if (response.data.success) {
        setEinvoices(prev => [response.data.data, ...prev]);
        setOpenDialog(false);
        setFormData({
          proformaInvoiceId: '',
          transactionType: 'B2B',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          notes: '',
          terms: 'Payment due within 30 days of invoice date.'
        });
      }
    } catch (error) {
      console.error('E-Invoice 생성 오류:', error);
      setError('E-Invoice를 생성하는데 실패했습니다.');
    }
  };

  // 프로포마 인보이스에서 E-Invoice 생성
  const handleCreateFromProforma = async (proformaInvoiceId: string) => {
    try {
      const response = await api.post(`/proforma-invoices/${proformaInvoiceId}/create-e-invoice`);
      if (response.data.success) {
        setEinvoices(prev => [response.data.data, ...prev]);
        setError('');
      }
    } catch (error) {
      console.error('프로포마 인보이스에서 E-Invoice 생성 오류:', error);
      setError('E-Invoice를 생성하는데 실패했습니다.');
    }
  };

  // 상태 업데이트
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await api.put(`/e-invoices/${id}/status`, { status });
      if (response.data.success) {
        setEinvoices(prev => prev.map(einvoice => 
          einvoice.id === id ? { ...einvoice, status: status as any } : einvoice
        ));
      }
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
      setError('상태를 업데이트하는데 실패했습니다.');
    }
  };

  // E-Way Bill 생성
  const handleCreateEWayBill = async (eInvoiceId: string) => {
    try {
      const response = await api.post(`/e-invoices/${eInvoiceId}/create-eway-bill`);
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
      setError('E-Way Bill을 생성하는데 실패했습니다.');
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
      case 'draft': return '초안';
      case 'generated': return 'IRN 생성됨';
      case 'uploaded': return '업로드됨';
      case 'cancelled': return '취소됨';
      default: return status;
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

  // 필터링된 데이터
  const filteredEInvoices = einvoices.filter(einvoice => {
    const matchesStatus = filterStatus === 'all' || einvoice.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      einvoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      einvoice.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      einvoice.irn.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReceiptLongIcon color="primary" />
        E-Invoice 관리 (GST 규정 준수)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        인도 GST 규정을 준수하는 전자 인보이스를 생성하고 관리하세요.
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
              <Tab label="E-Invoice 목록" />
              <Tab label="프로포마에서 생성" />
              <Tab label="GST 규정 준수" />
              <Tab label="통계 및 분석" />
            </Tabs>
          </Box>

          {/* E-Invoice 목록 */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="draft">초안</MenuItem>
                    <MenuItem value="generated">IRN 생성됨</MenuItem>
                    <MenuItem value="uploaded">업로드됨</MenuItem>
                    <MenuItem value="cancelled">취소됨</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                새 E-Invoice
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>인보이스 번호</TableCell>
                    <TableCell>IRN</TableCell>
                    <TableCell>구매자</TableCell>
                    <TableCell>거래 유형</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>발행일</TableCell>
                    <TableCell>E-Way Bill</TableCell>
                    <TableCell>작업</TableCell>
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
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <VerifiedIcon fontSize="small" color="success" />
                          <Typography variant="body2" color="primary">
                            {einvoice.irn}
                          </Typography>
                        </Box>
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
                          ₩{einvoice.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(einvoice.status)}
                          size="small"
                          color={getStatusColor(einvoice.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(einvoice.issueDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {einvoice.ewayBillId ? (
                          <Chip
                            label="생성됨"
                            size="small"
                            color="success"
                            icon={<LocalShippingIcon />}
                          />
                        ) : einvoice.status === 'generated' ? (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<LocalShippingIcon />}
                            onClick={() => handleCreateEWayBill(einvoice.id)}
                          >
                            생성
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            대기 중
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="보기">
                            <IconButton size="small" onClick={() => handleView(einvoice)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="QR 코드">
                            <IconButton size="small">
                              <QrCodeIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="업로드">
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(einvoice.id, 'uploaded')}
                              disabled={einvoice.status !== 'generated'}
                            >
                              <SendIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="취소">
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
          </TabPanel>

          {/* 프로포마에서 생성 */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              승인된 프로포마 인보이스에서 E-Invoice 생성
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>프로포마 인보이스 번호</TableCell>
                    <TableCell>고객</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>작업</TableCell>
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
                            {proformaInvoice.customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            GSTIN: {proformaInvoice.customer.gstin}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          ₩{proformaInvoice.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="승인됨"
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
                          E-Invoice 생성
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
              GST 규정 준수 현황
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon color="primary" />
                    GST 규정 준수 체크리스트
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="GSTIN 유효성 검증"
                        secondary="판매자 및 구매자 GSTIN 검증 완료"
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="HSN/SAC 코드 적용"
                        secondary="모든 상품에 올바른 HSN/SAC 코드 적용"
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="IRN 생성"
                        secondary="GST 포털에서 IRN 자동 생성"
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="QR 코드 생성"
                        secondary="GST 포털 요구사항에 따른 QR 코드 생성"
                      />
                      <CheckCircleIcon color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="세금 계산"
                        secondary="CGST, SGST, IGST, Cess 정확한 계산"
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
                    거래 유형별 규정
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="B2B 거래"
                        secondary="사업자 간 거래 (GSTIN 필수)"
                      />
                      <Chip label="B2B" size="small" color="primary" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="B2C 거래"
                        secondary="사업자-소비자 거래"
                      />
                      <Chip label="B2C" size="small" color="secondary" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="수출 거래"
                        secondary="Export 거래 처리"
                      />
                      <Chip label="Export" size="small" color="success" />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="SEZ 거래"
                        secondary="Special Economic Zone 거래"
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
              E-Invoice 통계
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {einvoices.length}
                  </Typography>
                  <Typography variant="body2">총 E-Invoice</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success">
                    {einvoices.filter(ei => ei.status === 'uploaded').length}
                  </Typography>
                  <Typography variant="body2">업로드된 E-Invoice</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="info">
                    {einvoices.filter(ei => ei.ewayBillId).length}
                  </Typography>
                  <Typography variant="body2">E-Way Bill 생성</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="warning">
                    ₩{einvoices.reduce((sum, ei) => sum + ei.totalAmount, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">총 금액</Typography>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* E-Invoice 생성 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 E-Invoice 생성</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>프로포마 인보이스 선택</InputLabel>
              <Select
                value={formData.proformaInvoiceId}
                onChange={(e) => setFormData(prev => ({ ...prev, proformaInvoiceId: e.target.value }))}
              >
                {proformaInvoices.map((proformaInvoice) => (
                  <MenuItem key={proformaInvoice.id} value={proformaInvoice.id}>
                    {proformaInvoice.invoiceNumber} - {proformaInvoice.customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>거래 유형</InputLabel>
              <Select
                value={formData.transactionType}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionType: e.target.value as any }))}
              >
                <MenuItem value="B2B">B2B (사업자 간 거래)</MenuItem>
                <MenuItem value="B2C">B2C (사업자-소비자 거래)</MenuItem>
                <MenuItem value="Export">Export (수출 거래)</MenuItem>
                <MenuItem value="SEZ">SEZ (특별경제구역 거래)</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="발행일"
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              fullWidth
              label="유효기간"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              fullWidth
              label="메모"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            
            <TextField
              fullWidth
              label="결제 조건"
              multiline
              rows={2}
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleCreate}>
            생성
          </Button>
        </DialogActions>
      </Dialog>

      {/* E-Invoice 상세 보기 다이얼로그 */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongIcon color="primary" />
            E-Invoice 상세 (GST 규정 준수)
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
                    IRN: {selectedEInvoice.irn}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={getStatusLabel(selectedEInvoice.status)}
                    color={getStatusColor(selectedEInvoice.status) as any}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    발행일: {new Date(selectedEInvoice.issueDate).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 판매자 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>판매자 정보</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">회사명</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.gstin}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">주소</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.address}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">연락처</Typography>
                    <Typography variant="body1">{selectedEInvoice.seller.phone}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 구매자 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>구매자 정보</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">회사명</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.gstin}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">주소</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.address}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">연락처</Typography>
                    <Typography variant="body1">{selectedEInvoice.buyer.phone}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 상품 목록 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>상품 목록</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>설명</TableCell>
                        <TableCell align="right">HSN 코드</TableCell>
                        <TableCell align="right">수량</TableCell>
                        <TableCell align="right">단가</TableCell>
                        <TableCell align="right">소계</TableCell>
                        <TableCell align="right">CGST</TableCell>
                        <TableCell align="right">SGST</TableCell>
                        <TableCell align="right">IGST</TableCell>
                        <TableCell align="right">Cess</TableCell>
                        <TableCell align="right">총액</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEInvoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.hsnCode}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">₩{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{item.total.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{item.cgstAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{item.sgstAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{item.igstAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{item.cessAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{(item.total + item.cgstAmount + item.sgstAmount + item.igstAmount + item.cessAmount).toLocaleString()}</TableCell>
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
                    <Typography variant="body2">소계:</Typography>
                    <Typography variant="body2">₩{selectedEInvoice.subtotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">CGST:</Typography>
                    <Typography variant="body2">₩{selectedEInvoice.cgstTotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">SGST:</Typography>
                    <Typography variant="body2">₩{selectedEInvoice.sgstTotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">IGST:</Typography>
                    <Typography variant="body2">₩{selectedEInvoice.igstTotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Cess:</Typography>
                    <Typography variant="body2">₩{selectedEInvoice.cessTotal.toLocaleString()}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">총액:</Typography>
                    <Typography variant="h6">₩{selectedEInvoice.totalAmount.toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* QR 코드 */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom>E-Invoice QR 코드</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  p: 2,
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  bgcolor: '#f5f5f5'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    QR 코드: {selectedEInvoice.qrCode}
                  </Typography>
                </Box>
              </Box>

              {/* 메모 및 조건 */}
              {(selectedEInvoice.notes || selectedEInvoice.terms) && (
                <Box>
                  {selectedEInvoice.notes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>메모</Typography>
                      <Typography variant="body2">{selectedEInvoice.notes}</Typography>
                    </Box>
                  )}
                  {selectedEInvoice.terms && (
                    <Box>
                      <Typography variant="h6" gutterBottom>결제 조건</Typography>
                      <Typography variant="body2">{selectedEInvoice.terms}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>닫기</Button>
          <Button variant="outlined" startIcon={<PrintIcon />}>
            인쇄
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />}>
            다운로드
          </Button>
          <Button variant="contained" startIcon={<SendIcon />}>
            업로드
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EInvoiceManagement;