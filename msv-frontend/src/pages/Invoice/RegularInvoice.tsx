import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Grid,
  Divider,
  Stack
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

interface InvoiceItem {
  id?: number;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  tax_amount: number;
  sub_total: number;
  status: string;
  payment_status: string;
  currency: string;
  items: InvoiceItem[];
}

const RegularInvoice: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'KRW',
    notes: '',
    items: [] as InvoiceItem[]
  });
  const [filters, setFilters] = useState({
    status: '',
    payment_status: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 데이터
  const sampleInvoices: Invoice[] = [
    {
      id: 1,
      invoice_number: 'INV-2024-001',
      invoice_date: '2024-01-15',
      due_date: '2024-02-14',
      customer_name: 'ABC 회사',
      customer_email: 'contact@abc.com',
      total_amount: 1500000,
      tax_amount: 150000,
      sub_total: 1350000,
      status: 'sent',
      payment_status: 'pending',
      currency: 'KRW',
      items: [
        {
          id: 1,
          item_name: '웹사이트 개발',
          description: '반응형 웹사이트 구축',
          quantity: 1,
          unit_price: 1000000,
          total_price: 1000000,
          tax_rate: 10,
          tax_amount: 100000
        },
        {
          id: 2,
          item_name: '도메인 등록',
          description: '1년 도메인 등록',
          quantity: 1,
          unit_price: 350000,
          total_price: 350000,
          tax_rate: 10,
          tax_amount: 35000
        }
      ]
    },
    {
      id: 2,
      invoice_number: 'INV-2024-002',
      invoice_date: '2024-01-20',
      due_date: '2024-02-19',
      customer_name: 'XYZ 기업',
      customer_email: 'info@xyz.com',
      total_amount: 2750000,
      tax_amount: 275000,
      sub_total: 2475000,
      status: 'paid',
      payment_status: 'paid',
      currency: 'KRW',
      items: [
        {
          id: 3,
          item_name: '모바일 앱 개발',
          description: 'iOS/Android 앱 개발',
          quantity: 1,
          unit_price: 2500000,
          total_price: 2500000,
          tax_rate: 10,
          tax_amount: 250000
        }
      ]
    }
  ];

  useEffect(() => {
    loadInvoices();
  }, [page, filters]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // 실제 API 호출 대신 샘플 데이터 사용
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredInvoices = sampleInvoices;
      
      if (filters.status) {
        filteredInvoices = filteredInvoices.filter(inv => inv.status === filters.status);
      }
      
      if (filters.payment_status) {
        filteredInvoices = filteredInvoices.filter(inv => inv.payment_status === filters.payment_status);
      }
      
      if (filters.search) {
        filteredInvoices = filteredInvoices.filter(inv => 
          inv.invoice_number.toLowerCase().includes(filters.search.toLowerCase()) ||
          inv.customer_name.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setInvoices(filteredInvoices);
      setTotalPages(Math.ceil(filteredInvoices.length / 10));
    } catch (error) {
      showSnackbar('인보이스 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'KRW',
      notes: '',
      items: []
    });
    setOpenDialog(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      customer_phone: '',
      customer_address: '',
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      currency: invoice.currency,
      notes: '',
      items: invoice.items
    });
    setOpenDialog(true);
  };

  const handleSaveInvoice = () => {
    // 실제 API 호출 로직
    showSnackbar('인보이스가 저장되었습니다.', 'success');
    setOpenDialog(false);
    loadInvoices();
  };

  const handleDeleteInvoice = (id: number) => {
    if (window.confirm('이 인보이스를 삭제하시겠습니까?')) {
      showSnackbar('인보이스가 삭제되었습니다.', 'success');
      loadInvoices();
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    // 인보이스 상세 보기 로직
    console.log('View invoice:', invoice);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'paid': return 'success';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'paid': return 'success';
      case 'partial': return 'info';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '초안';
      case 'sent': return '발송';
      case 'paid': return '지급완료';
      case 'overdue': return '연체';
      default: return status;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기';
      case 'paid': return '지급완료';
      case 'partial': return '부분지급';
      case 'overdue': return '연체';
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          fontWeight: 600,
          color: 'text.primary'
        }}>
          <ReceiptIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          일반 인보이스
        </Typography>
        <Typography variant="body2" color="text.secondary">
          일반 인보이스를 생성하고 관리하는 페이지입니다.
        </Typography>
      </Box>

      {/* 필터 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="인보이스 번호 또는 고객명 검색"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>상태</InputLabel>
                <Select
                  value={filters.status}
                  label="상태"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="draft">초안</MenuItem>
                  <MenuItem value="sent">발송</MenuItem>
                  <MenuItem value="paid">지급완료</MenuItem>
                  <MenuItem value="overdue">연체</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>결제상태</InputLabel>
                <Select
                  value={filters.payment_status}
                  label="결제상태"
                  onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="pending">대기</MenuItem>
                  <MenuItem value="paid">지급완료</MenuItem>
                  <MenuItem value="partial">부분지급</MenuItem>
                  <MenuItem value="overdue">연체</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFilters({ status: '', payment_status: '', search: '' })}
                >
                  필터 초기화
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateInvoice}
                >
                  새 인보이스
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 인보이스 목록 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>인보이스 번호</TableCell>
                  <TableCell>고객명</TableCell>
                  <TableCell>발행일</TableCell>
                  <TableCell>만료일</TableCell>
                  <TableCell>금액</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>결제상태</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {invoice.invoice_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {invoice.customer_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {invoice.customer_email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {invoice.total_amount.toLocaleString()} {invoice.currency}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(invoice.status)}
                        color={getStatusColor(invoice.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPaymentStatusText(invoice.payment_status)}
                        color={getPaymentStatusColor(invoice.payment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="보기">
                          <IconButton size="small" onClick={() => handleViewInvoice(invoice)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleEditInvoice(invoice)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="인쇄">
                          <IconButton size="small">
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDeleteInvoice(invoice.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* 인보이스 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedInvoice ? '인보이스 수정' : '새 인보이스 생성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="고객명"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="고객 이메일"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="발행일"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="만료일"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                인보이스 아이템
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  const newItem: InvoiceItem = {
                    item_name: '',
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    total_price: 0,
                    tax_rate: 10,
                    tax_amount: 0
                  };
                  setFormData({
                    ...formData,
                    items: [...formData.items, newItem]
                  });
                }}
              >
                아이템 추가
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSaveInvoice}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegularInvoice;