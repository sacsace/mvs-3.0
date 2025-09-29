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
  Tab
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
  Receipt as ReceiptIcon,
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
  ArrowForward as ArrowForwardIcon
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
interface Quotation {
  id: string;
  quotationNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    taxRate: number;
    taxAmount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  issueDate: string;
  validUntil: string;
  notes: string;
  terms: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  proformaInvoiceId?: string; // 프로포마 인보이스 ID (생성된 경우)
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
}

const QuotationManagement: React.FC = () => {
  const { user } = useStore();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 폼 상태
  const [formData, setFormData] = useState({
    customerId: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: '',
    notes: '',
    terms: 'This quotation is valid for 30 days from the date of issue.'
  });

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [quotationsResponse, customersResponse] = await Promise.all([
          api.get('/quotations'),
          api.get('/customers')
        ]);

        if (quotationsResponse.data.success) {
          setQuotations(quotationsResponse.data.data);
        }
        if (customersResponse.data.success) {
          setCustomers(customersResponse.data.data);
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

  // 견적서 생성
  const handleCreate = async () => {
    try {
      const response = await api.post('/quotations', formData);
      if (response.data.success) {
        setQuotations(prev => [response.data.data, ...prev]);
        setOpenDialog(false);
        setFormData({
          customerId: '',
          issueDate: new Date().toISOString().split('T')[0],
          validUntil: '',
          notes: '',
          terms: 'This quotation is valid for 30 days from the date of issue.'
        });
      }
    } catch (error) {
      console.error('견적서 생성 오류:', error);
      setError('견적서를 생성하는데 실패했습니다.');
    }
  };

  // 견적서에서 프로포마 인보이스 생성
  const handleCreateProformaInvoice = async (quotationId: string) => {
    try {
      const response = await api.post(`/quotations/${quotationId}/create-proforma-invoice`);
      if (response.data.success) {
        // 견적서 상태 업데이트
        setQuotations(prev => prev.map(quotation => 
          quotation.id === quotationId 
            ? { ...quotation, proformaInvoiceId: response.data.data.id }
            : quotation
        ));
        setError('');
      }
    } catch (error) {
      console.error('프로포마 인보이스 생성 오류:', error);
      setError('프로포마 인보이스를 생성하는데 실패했습니다.');
    }
  };

  // 상태 업데이트
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const response = await api.put(`/quotations/${id}/status`, { status });
      if (response.data.success) {
        setQuotations(prev => prev.map(quotation => 
          quotation.id === id ? { ...quotation, status: status as any } : quotation
        ));
      }
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
      setError('상태를 업데이트하는데 실패했습니다.');
    }
  };

  // 견적서 상세 보기
  const handleView = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setOpenViewDialog(true);
  };

  // 상태 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'warning';
      default: return 'default';
    }
  };

  // 상태 라벨 반환
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '초안';
      case 'sent': return '발송됨';
      case 'accepted': return '승인됨';
      case 'rejected': return '거절됨';
      case 'expired': return '만료됨';
      default: return status;
    }
  };

  // 필터링된 데이터
  const filteredQuotations = quotations.filter(quotation => {
    const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      quotation.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DescriptionIcon color="primary" />
        견적서 관리
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        견적서를 생성하고 관리하며, 승인된 견적서에서 프로포마 인보이스를 생성하세요.
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
              <Tab label="견적서 목록" />
              <Tab label="승인된 견적서" />
              <Tab label="통계 및 분석" />
            </Tabs>
          </Box>

          {/* 견적서 목록 */}
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
                    <MenuItem value="sent">발송됨</MenuItem>
                    <MenuItem value="accepted">승인됨</MenuItem>
                    <MenuItem value="rejected">거절됨</MenuItem>
                    <MenuItem value="expired">만료됨</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                새 견적서
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>견적서 번호</TableCell>
                    <TableCell>고객</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>발행일</TableCell>
                    <TableCell>유효기간</TableCell>
                    <TableCell>프로포마 인보이스</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {quotation.quotationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {quotation.customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {quotation.customer.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          ₩{quotation.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(quotation.status)}
                          size="small"
                          color={getStatusColor(quotation.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(quotation.issueDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(quotation.validUntil).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {quotation.proformaInvoiceId ? (
                          <Chip
                            label="생성됨"
                            size="small"
                            color="success"
                            icon={<CheckCircleIcon />}
                          />
                        ) : quotation.status === 'accepted' ? (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ArrowForwardIcon />}
                            onClick={() => handleCreateProformaInvoice(quotation.id)}
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
                            <IconButton size="small" onClick={() => handleView(quotation)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="편집">
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="발송">
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(quotation.id, 'sent')}
                              disabled={quotation.status !== 'draft'}
                            >
                              <SendIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="승인">
                            <IconButton 
                              size="small" 
                              onClick={() => handleStatusUpdate(quotation.id, 'accepted')}
                              disabled={quotation.status !== 'sent'}
                            >
                              <CheckCircleIcon />
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

          {/* 승인된 견적서 */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              승인된 견적서에서 프로포마 인보이스 생성
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>견적서 번호</TableCell>
                    <TableCell>고객</TableCell>
                    <TableCell>금액</TableCell>
                    <TableCell>유효기간</TableCell>
                    <TableCell>프로포마 인보이스</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotations.filter(q => q.status === 'accepted').map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {quotation.quotationNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {quotation.customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {quotation.customer.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          ₩{quotation.totalAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(quotation.validUntil).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {quotation.proformaInvoiceId ? (
                          <Chip
                            label="생성됨"
                            size="small"
                            color="success"
                            icon={<CheckCircleIcon />}
                          />
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ArrowForwardIcon />}
                            onClick={() => handleCreateProformaInvoice(quotation.id)}
                          >
                            프로포마 인보이스 생성
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="보기">
                            <IconButton size="small" onClick={() => handleView(quotation)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="프로포마 인보이스 보기">
                            <IconButton 
                              size="small"
                              disabled={!quotation.proformaInvoiceId}
                            >
                              <ReceiptIcon />
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

          {/* 통계 및 분석 */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              견적서 통계
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    {quotations.length}
                  </Typography>
                  <Typography variant="body2">총 견적서</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success">
                    {quotations.filter(q => q.status === 'accepted').length}
                  </Typography>
                  <Typography variant="body2">승인된 견적서</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="info">
                    {quotations.filter(q => q.proformaInvoiceId).length}
                  </Typography>
                  <Typography variant="body2">프로포마 인보이스 생성</Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="warning">
                    ₩{quotations.reduce((sum, q) => sum + q.totalAmount, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">총 금액</Typography>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* 견적서 생성 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>새 견적서 생성</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>고객 선택</InputLabel>
              <Select
                value={formData.customerId}
                onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.company}
                  </MenuItem>
                ))}
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
              value={formData.validUntil}
              onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
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
              label="조건"
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

      {/* 견적서 상세 보기 다이얼로그 */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon color="primary" />
            견적서 상세
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedQuotation && (
            <Box>
              {/* 헤더 정보 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6">{selectedQuotation.quotationNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    발행일: {new Date(selectedQuotation.issueDate).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={getStatusLabel(selectedQuotation.status)}
                    color={getStatusColor(selectedQuotation.status) as any}
                  />
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    ₩{selectedQuotation.totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 고객 정보 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>고객 정보</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">고객명</Typography>
                    <Typography variant="body1">{selectedQuotation.customer.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">이메일</Typography>
                    <Typography variant="body1">{selectedQuotation.customer.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">전화번호</Typography>
                    <Typography variant="body1">{selectedQuotation.customer.phone}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">주소</Typography>
                    <Typography variant="body1">{selectedQuotation.customer.address}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 항목 목록 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>항목 목록</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>설명</TableCell>
                        <TableCell align="right">수량</TableCell>
                        <TableCell align="right">단가</TableCell>
                        <TableCell align="right">소계</TableCell>
                        <TableCell align="right">세금</TableCell>
                        <TableCell align="right">총액</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedQuotation.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">₩{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{item.total.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{item.taxAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">₩{(item.total + item.taxAmount).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* 요약 */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Box sx={{ minWidth: 300 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">소계:</Typography>
                    <Typography variant="body2">₩{selectedQuotation.subtotal.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">할인:</Typography>
                    <Typography variant="body2">-₩{selectedQuotation.discountAmount.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">세금:</Typography>
                    <Typography variant="body2">₩{selectedQuotation.taxAmount.toLocaleString()}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">총액:</Typography>
                    <Typography variant="h6">₩{selectedQuotation.totalAmount.toLocaleString()}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* 메모 및 조건 */}
              {(selectedQuotation.notes || selectedQuotation.terms) && (
                <Box>
                  {selectedQuotation.notes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>메모</Typography>
                      <Typography variant="body2">{selectedQuotation.notes}</Typography>
                    </Box>
                  )}
                  {selectedQuotation.terms && (
                    <Box>
                      <Typography variant="h6" gutterBottom>조건</Typography>
                      <Typography variant="body2">{selectedQuotation.terms}</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* 프로포마 인보이스 상태 */}
              {selectedQuotation.proformaInvoiceId && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="success.dark" gutterBottom>
                    프로포마 인보이스 생성됨
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    이 견적서에서 프로포마 인보이스가 생성되었습니다.
                  </Typography>
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
            발송
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuotationManagement;
