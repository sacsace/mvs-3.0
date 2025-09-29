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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  LocalShipping as LocalShippingIcon,
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
  LocalShipping as DirectionsTruckIcon,
  Route as RouteIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon
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
  const { user } = useStore();
  const [ewayBills, setEwayBills] = useState<EWayBill[]>([]);
  const [einvoices, setEinvoices] = useState<EInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedEwayBill, setSelectedEwayBill] = useState<EWayBill | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ewayBillsResponse, einvoicesResponse] = await Promise.all([
          api.get('/eway-bills'),
          api.get('/e-invoices?status=generated')
        ]);

        if (ewayBillsResponse.data.success) {
          setEwayBills(ewayBillsResponse.data.data);
        }
        if (einvoicesResponse.data.success) {
          setEinvoices(einvoicesResponse.data.data);
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
      setError('E-Way Bill을 생성하는데 실패했습니다.');
    }
  };

  // E-Invoice에서 E-Way Bill 자동 생성
  const handleCreateFromEInvoice = async (eInvoiceId: string) => {
    try {
      const response = await api.post(`/e-invoices/${eInvoiceId}/create-eway-bill`);
      if (response.data.success) {
        setEwayBills(prev => [response.data.data, ...prev]);
        setError('');
      }
    } catch (error) {
      console.error('E-Invoice에서 E-Way Bill 생성 오류:', error);
      setError('E-Way Bill을 생성하는데 실패했습니다.');
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
      setError('상태를 업데이트하는데 실패했습니다.');
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
      case 'draft': return '초안';
      case 'generated': return '생성됨';
      case 'active': return '활성';
      case 'expired': return '만료됨';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  // 필터링된 데이터
  const filteredEwayBills = ewayBills.filter(ewayBill => {
    const matchesStatus = filterStatus === 'all' || ewayBill.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      ewayBill.ewayBillNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ewayBill.transporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ewayBill.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocalShippingIcon color="primary" />
        E-Way Bill 관리
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        E-Invoice와 연동하여 자동으로 생성되는 전자 운송장을 관리하세요.
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
              <Tab label="E-Way Bill 목록" />
              <Tab label="E-Invoice에서 생성" />
              <Tab label="운송 현황" />
              <Tab label="통계 및 분석" />
            </Tabs>
          </Box>

          {/* E-Way Bill 목록 */}
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
                    <MenuItem value="generated">생성됨</MenuItem>
                    <MenuItem value="active">활성</MenuItem>
                    <MenuItem value="expired">만료됨</MenuItem>
                    <MenuItem value="cancelled">취소됨</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                새 E-Way Bill
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>E-Way Bill 번호</TableCell>
                    <TableCell>E-Invoice 번호</TableCell>
                    <TableCell>운송업체</TableCell>
                    <TableCell>차량번호</TableCell>
                    <TableCell>거리</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>생성일</TableCell>
                    <TableCell>유효기간</TableCell>
                    <TableCell>작업</TableCell>
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
                          {new Date(ewayBill.generatedAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(ewayBill.validUntil).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="보기">
                            <IconButton size="small" onClick={() => handleView(ewayBill)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="QR 코드">
                            <IconButton size="small">
                              <QrCodeIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="활성화">
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(ewayBill.id, 'active')}
                              disabled={ewayBill.status !== 'generated'}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="취소">
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
          </TabPanel>

          {/* E-Invoice에서 생성 */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              E-Invoice에서 E-Way Bill 자동 생성
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>E-Invoice 번호</TableCell>
                    <TableCell>고객</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>E-Way Bill</TableCell>
                    <TableCell>작업</TableCell>
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
                          ₩{einvoice.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="생성됨"
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
                          E-Way Bill 생성
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
              실시간 운송 현황
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
              {ewayBills.filter(eb => eb.status === 'active').map((ewayBill) => (
                <Card key={ewayBill.id} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        {ewayBill.ewayBillNumber}
                      </Typography>
                      <Chip label="운송 중" color="success" size="small" />
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
          </TabPanel>

          {/* 통계 및 분석 */}
          <TabPanel value={activeTab} index={3}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              E-Way Bill 통계
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {ewayBills.length}
                  </Typography>
                  <Typography variant="body2">총 E-Way Bill</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success">
                    {ewayBills.filter(eb => eb.status === 'active').length}
                  </Typography>
                  <Typography variant="body2">활성 E-Way Bill</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="info">
                    {ewayBills.filter(eb => eb.status === 'generated').length}
                  </Typography>
                  <Typography variant="body2">생성된 E-Way Bill</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="warning">
                    {ewayBills.reduce((sum, eb) => sum + eb.transportDetails.distance, 0)} km
                  </Typography>
                  <Typography variant="body2">총 운송 거리</Typography>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* E-Way Bill 생성 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 E-Way Bill 생성</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>E-Invoice 선택</InputLabel>
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
              label="차량번호"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
            />
            
            <FormControl fullWidth>
              <InputLabel>차량 유형</InputLabel>
              <Select
                value={formData.vehicleType}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value as any }))}
              >
                <MenuItem value="Regular">일반</MenuItem>
                <MenuItem value="Over Dimensional Cargo">초대형 화물</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="차량 용량 (톤)"
              type="number"
              value={formData.vehicleCapacity}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicleCapacity: Number(e.target.value) }))}
            />
            
            <TextField
              fullWidth
              label="출발지 주소"
              multiline
              rows={2}
              value={formData.fromAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, fromAddress: e.target.value }))}
            />
            
            <TextField
              fullWidth
              label="도착지 주소"
              multiline
              rows={2}
              value={formData.toAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, toAddress: e.target.value }))}
            />
            
            <TextField
              fullWidth
              label="운송 거리 (km)"
              type="number"
              value={formData.distance}
              onChange={(e) => setFormData(prev => ({ ...prev, distance: Number(e.target.value) }))}
            />
            
            <TextField
              fullWidth
              label="운송일"
              type="date"
              value={formData.transportDate}
              onChange={(e) => setFormData(prev => ({ ...prev, transportDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              fullWidth
              label="운송 시간"
              type="time"
              value={formData.transportTime}
              onChange={(e) => setFormData(prev => ({ ...prev, transportTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
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

      {/* E-Way Bill 상세 보기 다이얼로그 */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalShippingIcon color="primary" />
            E-Way Bill 상세
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
                    생성일: {new Date(selectedEwayBill.generatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 운송업체 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>운송업체 정보</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">업체명</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">GSTIN</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.gstin}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">전화번호</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.phone}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">이메일</Typography>
                    <Typography variant="body1">{selectedEwayBill.transporter.email}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 차량 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>차량 정보</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">차량번호</Typography>
                    <Typography variant="body1">{selectedEwayBill.vehicle.number}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">차량 유형</Typography>
                    <Typography variant="body1">{selectedEwayBill.vehicle.type}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">용량</Typography>
                    <Typography variant="body1">{selectedEwayBill.vehicle.capacity}톤</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 운송 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>운송 정보</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">출발지</Typography>
                    <Typography variant="body1">{selectedEwayBill.transportDetails.fromAddress}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">도착지</Typography>
                    <Typography variant="body1">{selectedEwayBill.transportDetails.toAddress}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">거리</Typography>
                    <Typography variant="body1">{selectedEwayBill.transportDetails.distance} km</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">운송일시</Typography>
                    <Typography variant="body1">
                      {selectedEwayBill.transportDetails.transportDate} {selectedEwayBill.transportDetails.transportTime}
                    </Typography>
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
                        <TableCell align="right">단위</TableCell>
                        <TableCell align="right">금액</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEwayBill.goods.map((good) => (
                        <TableRow key={good.id}>
                          <TableCell>{good.description}</TableCell>
                          <TableCell align="right">{good.hsnCode}</TableCell>
                          <TableCell align="right">{good.quantity}</TableCell>
                          <TableCell align="right">{good.unit}</TableCell>
                          <TableCell align="right">₩{good.value.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* QR 코드 */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" gutterBottom>E-Way Bill QR 코드</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  p: 2,
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  bgcolor: '#f5f5f5'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    QR 코드: {selectedEwayBill.qrCode}
                  </Typography>
                </Box>
              </Box>
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
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EWayBillManagement;
