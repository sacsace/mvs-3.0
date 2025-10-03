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
  Stack,
  Avatar
} from '@mui/material';
import {
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  status: string;
  customerType: string;
  totalOrders: number;
  totalValue: number;
  lastOrderDate: string;
  rating: number;
  notes: string;
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    status: 'active',
    customerType: 'individual',
    notes: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    customerType: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 데이터
  const sampleCustomers: Customer[] = [
    {
      id: 1,
      name: '김철수',
      email: 'kim@example.com',
      phone: '010-1234-5678',
      company: 'ABC 회사',
      address: '서울시 강남구',
      status: 'active',
      customerType: 'individual',
      totalOrders: 15,
      totalValue: 2500000,
      lastOrderDate: '2024-01-15',
      rating: 4.5,
      notes: '우수 고객'
    },
    {
      id: 2,
      name: '이영희',
      email: 'lee@example.com',
      phone: '010-9876-5432',
      company: 'XYZ 기업',
      address: '부산시 해운대구',
      status: 'active',
      customerType: 'enterprise',
      totalOrders: 8,
      totalValue: 1800000,
      lastOrderDate: '2024-01-10',
      rating: 4.2,
      notes: '기업 고객'
    }
  ];

  useEffect(() => {
    loadCustomers();
  }, [page, filters]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // 백엔드 API 호출 시도
      const response = await fetch('/api/customers');
      let customersList = sampleCustomers;

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.data) {
          customersList = result.data.data.map((customer: any) => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company_name || '',
            address: customer.address || '',
            status: customer.status || 'active',
            customerType: customer.customer_type || 'individual',
            totalOrders: customer.total_orders || 0,
            totalValue: customer.total_value || 0,
            lastOrderDate: customer.last_order_date || '',
            rating: customer.rating || 0,
            notes: customer.notes || ''
          }));
        }
      }

      // 클라이언트 사이드 필터링
      let filteredCustomers = customersList;
      
      if (filters.status) {
        filteredCustomers = filteredCustomers.filter(customer => customer.status === filters.status);
      }
      
      if (filters.customerType) {
        filteredCustomers = filteredCustomers.filter(customer => customer.customerType === filters.customerType);
      }
      
      if (filters.search) {
        filteredCustomers = filteredCustomers.filter(customer => 
          customer.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          customer.email.toLowerCase().includes(filters.search.toLowerCase()) ||
          customer.company.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setCustomers(filteredCustomers);
      setTotalPages(Math.ceil(filteredCustomers.length / 10));
    } catch (error) {
      console.error('고객 목록 로드 실패:', error);
      setCustomers(sampleCustomers);
      setTotalPages(Math.ceil(sampleCustomers.length / 10));
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      status: 'active',
      customerType: 'individual',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      status: customer.status,
      customerType: customer.customerType,
      notes: customer.notes
    });
    setOpenDialog(true);
  };

  const handleSaveCustomer = () => {
    // 실제 API 호출 로직
    showSnackbar('고객 정보가 저장되었습니다.', 'success');
    setOpenDialog(false);
    loadCustomers();
  };

  const handleDeleteCustomer = (id: number) => {
    if (window.confirm('이 고객을 삭제하시겠습니까?')) {
      showSnackbar('고객이 삭제되었습니다.', 'success');
      loadCustomers();
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    // 고객 상세 보기 로직
    console.log('View customer:', customer);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'suspended': return '정지';
      default: return status;
    }
  };

  const getCustomerTypeText = (type: string) => {
    switch (type) {
      case 'individual': return '개인';
      case 'enterprise': return '기업';
      case 'startup': return '스타트업';
      default: return type;
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
          <PeopleIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          고객 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          고객 정보를 관리하고 조회하는 페이지입니다.
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(4, 1fr)'
        },
        gap: 3,
        mb: 3
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {customers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  총 고객 수
                </Typography>
              </Box>
              <PeopleIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {customers.filter(c => c.status === 'active').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  활성 고객
                </Typography>
              </Box>
              <BusinessIcon sx={{ fontSize: '2rem', color: 'success.main' }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  총 주문 수
                </Typography>
              </Box>
              <EmailIcon sx={{ fontSize: '2rem', color: 'info.main' }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {customers.reduce((sum, c) => sum + c.totalValue, 0).toLocaleString()}원
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  총 매출
                </Typography>
              </Box>
              <PhoneIcon sx={{ fontSize: '2rem', color: 'warning.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="고객명, 이메일, 회사명으로 검색..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={filters.status}
                label="상태"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="suspended">정지</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>고객 유형</InputLabel>
              <Select
                value={filters.customerType}
                label="고객 유형"
                onChange={(e) => setFilters({ ...filters, customerType: e.target.value })}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="individual">개인</MenuItem>
                <MenuItem value="enterprise">기업</MenuItem>
                <MenuItem value="startup">스타트업</MenuItem>
              </Select>
            </FormControl>
            
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setFilters({ status: '', customerType: '', search: '' })}
              >
                필터 초기화
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateCustomer}
              >
                새 고객 등록
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* 고객 목록 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>고객 정보</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>연락처</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>회사</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>주문 수</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>총 매출</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 40, height: 40 }}>
                          {customer.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {customer.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getCustomerTypeText(customer.customerType)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: '1rem' }} />
                          {customer.email}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: '1rem' }} />
                          {customer.phone}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {customer.company}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <LocationIcon sx={{ fontSize: '0.75rem', mr: 0.5 }} />
                        {customer.address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {customer.totalOrders}건
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {customer.totalValue.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(customer.status)}
                        color={getStatusColor(customer.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="보기">
                          <IconButton size="small" onClick={() => handleViewCustomer(customer)} color="primary">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleEditCustomer(customer)} color="primary">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDeleteCustomer(customer.id)} color="error">
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

      {/* 고객 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCustomer ? '고객 정보 수정' : '새 고객 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="고객명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              label="이메일"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              label="전화번호"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              label="회사명"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
            
            <TextField
              fullWidth
              label="주소"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  label="상태"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                  <MenuItem value="suspended">정지</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>고객 유형</InputLabel>
                <Select
                  value={formData.customerType}
                  label="고객 유형"
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                >
                  <MenuItem value="individual">개인</MenuItem>
                  <MenuItem value="enterprise">기업</MenuItem>
                  <MenuItem value="startup">스타트업</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <TextField
              fullWidth
              label="메모"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSaveCustomer}>
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

export default CustomerManagement;