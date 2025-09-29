import React, { useState } from 'react';
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
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState([
    {
      id: 1,
      name: 'ABC 전자',
      contactPerson: '김고객',
      email: 'contact@abc.com',
      phone: '02-1234-5678',
      address: '서울시 강남구 테헤란로 123',
      customerType: 'enterprise',
      status: 'active',
      registrationDate: '2024-01-15',
      lastOrderDate: '2024-01-20',
      totalOrders: 15,
      totalAmount: 50000000
    },
    {
      id: 2,
      name: 'XYZ 스토어',
      contactPerson: '이고객',
      email: 'info@xyz.com',
      phone: '02-2345-6789',
      address: '서울시 서초구 서초대로 456',
      customerType: 'retail',
      status: 'active',
      registrationDate: '2024-01-16',
      lastOrderDate: '2024-01-18',
      totalOrders: 8,
      totalAmount: 25000000
    },
    {
      id: 3,
      name: 'DEF 컴퓨터',
      contactPerson: '박고객',
      email: 'sales@def.com',
      phone: '02-3456-7890',
      address: '서울시 마포구 홍대입구역 789',
      customerType: 'enterprise',
      status: 'inactive',
      registrationDate: '2024-01-14',
      lastOrderDate: '2024-01-10',
      totalOrders: 3,
      totalAmount: 12000000
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const handleAdd = () => {
    setSelectedCustomer(null);
    setOpenDialog(true);
  };

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setOpenDialog(true);
  };

  const handleDelete = (id: number) => {
    setCustomers(customers.filter(item => item.id !== id));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'enterprise': return 'primary';
      case 'retail': return 'secondary';
      case 'individual': return 'success';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'enterprise': return '기업';
      case 'retail': return '소매';
      case 'individual': return '개인';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'pending': return '대기';
      default: return status;
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || customer.customerType === typeFilter;
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <Box sx={{ 
      width: '100%',
      px: 2,
      py: 3
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PeopleIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          고객 목록
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        {/* 통계 카드 */}
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              총 고객 수
            </Typography>
            <Typography variant="h4" color="primary.main">
              {customers.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              활성 고객
            </Typography>
            <Typography variant="h4" color="success.main">
              {customers.filter(item => item.status === 'active').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              기업 고객
            </Typography>
            <Typography variant="h4" color="info.main">
              {customers.filter(item => item.customerType === 'enterprise').length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              총 거래 금액
            </Typography>
            <Typography variant="h4" color="warning.main">
              {customers.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4fr 2fr 2fr 4fr' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="고객명, 담당자, 이메일로 검색"
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
              <InputLabel>고객 유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="enterprise">기업</MenuItem>
                <MenuItem value="retail">소매</MenuItem>
                <MenuItem value="individual">개인</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="pending">대기</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
              >
                필터
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                내보내기
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
              >
                고객 등록
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 고객 목록 */}
      <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                고객 목록 ({filteredCustomers.length}건)
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>고객 정보</TableCell>
                      <TableCell>연락처</TableCell>
                      <TableCell>주소</TableCell>
                      <TableCell>고객 유형</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>등록일</TableCell>
                      <TableCell>최근 주문</TableCell>
                      <TableCell>총 주문</TableCell>
                      <TableCell>총 금액</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {customer.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {customer.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {customer.contactPerson}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <EmailIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                              <Typography variant="caption">{customer.email}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PhoneIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                              <Typography variant="caption">{customer.phone}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                            <Typography variant="caption" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {customer.address}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getTypeLabel(customer.customerType)}
                            color={getTypeColor(customer.customerType) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(customer.status)}
                            color={getStatusColor(customer.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{customer.registrationDate}</TableCell>
                        <TableCell>{customer.lastOrderDate}</TableCell>
                        <TableCell align="right">{customer.totalOrders}건</TableCell>
                        <TableCell align="right">{customer.totalAmount.toLocaleString()}원</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(customer)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(customer.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
      </Box>

      {/* 고객 상세 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCustomer ? '고객 상세 정보' : '새 고객 등록'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            고객 상세 정보를 표시하거나 새 고객을 등록하는 폼이 여기에 표시됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>닫기</Button>
          {selectedCustomer && (
            <Button variant="contained">수정</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerList;
