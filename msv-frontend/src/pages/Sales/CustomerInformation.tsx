import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Divider,
  Grid, Tabs, Tab
} from '@mui/material';
import {
  People as CustomerIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Download as DownloadIcon, Phone as PhoneIcon, Email as EmailIcon,
  Business as BusinessIcon, Person as PersonIcon, LocationOn as LocationIcon,
  CalendarToday as CalendarIcon, AttachMoney as MoneyIcon, Star as StarIcon,
  TrendingUp as TrendingUpIcon, History as HistoryIcon
} from '@mui/icons-material';

interface Customer {
  id: number;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  position: string;
  phone: string;
  email: string;
  address: string;
  industry: string;
  customerType: 'enterprise' | 'small_business' | 'individual';
  customerGrade: 'A' | 'B' | 'C' | 'D';
  registrationDate: string;
  lastContactDate: string;
  totalSales: number;
  status: 'active' | 'inactive' | 'potential' | 'lost';
  notes: string;
  tags: string[];
}

const CustomerInformation: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 1,
      customerCode: 'CUST-001',
      companyName: 'ABC 기업',
      contactPerson: '김대표',
      position: '대표이사',
      phone: '02-1234-5678',
      email: 'ceo@abc.com',
      address: '서울특별시 강남구 테헤란로 123',
      industry: 'IT/소프트웨어',
      customerType: 'enterprise',
      customerGrade: 'A',
      registrationDate: '2023-01-15',
      lastContactDate: '2024-01-20',
      totalSales: 50000000,
      status: 'active',
      notes: '주요 고객사, 정기적인 계약 유지',
      tags: ['VIP', '정기계약']
    },
    {
      id: 2,
      customerCode: 'CUST-002',
      companyName: 'XYZ 스타트업',
      contactPerson: '박CTO',
      position: 'CTO',
      phone: '02-9876-5432',
      email: 'cto@xyz.com',
      address: '서울특별시 서초구 강남대로 456',
      industry: '핀테크',
      customerType: 'small_business',
      customerGrade: 'B',
      registrationDate: '2023-06-10',
      lastContactDate: '2024-01-18',
      totalSales: 15000000,
      status: 'active',
      notes: '성장 가능성이 높은 스타트업',
      tags: ['성장기업', '신규고객']
    },
    {
      id: 3,
      customerCode: 'CUST-003',
      companyName: 'DEF 개인사업자',
      contactPerson: '이사장',
      position: '사장',
      phone: '010-1111-2222',
      email: 'owner@def.com',
      address: '경기도 성남시 분당구 판교역로 789',
      industry: '제조업',
      customerType: 'individual',
      customerGrade: 'C',
      registrationDate: '2023-09-05',
      lastContactDate: '2023-12-15',
      totalSales: 5000000,
      status: 'inactive',
      notes: '최근 연락이 없는 고객',
      tags: ['개인사업자']
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>({
    customerCode: '',
    companyName: '',
    contactPerson: '',
    position: '',
    phone: '',
    email: '',
    address: '',
    industry: '',
    customerType: 'enterprise',
    customerGrade: 'C',
    registrationDate: '',
    lastContactDate: '',
    totalSales: 0,
    status: 'potential',
    notes: '',
    tags: []
  });

  const handleAdd = () => {
    setSelectedCustomer(null);
    setFormData({
      customerCode: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      companyName: '',
      contactPerson: '',
      position: '',
      phone: '',
      email: '',
      address: '',
      industry: '',
      customerType: 'enterprise',
      customerGrade: 'C',
      registrationDate: new Date().toISOString().split('T')[0],
      lastContactDate: '',
      totalSales: 0,
      status: 'potential',
      notes: '',
      tags: []
    });
    setOpenDialog(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(customer);
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedCustomer) {
      setCustomers(customers.map(customer =>
        customer.id === selectedCustomer.id ? { ...customer, ...formData } : customer
      ));
    } else {
      const newCustomer: Customer = {
        id: customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1,
        ...formData
      };
      setCustomers([...customers, newCustomer]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setCustomers(customers.filter(customer => customer.id !== id));
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: '활성', color: 'success' as const },
      inactive: { label: '비활성', color: 'default' as const },
      potential: { label: '잠재고객', color: 'info' as const },
      lost: { label: '이탈', color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getGradeChip = (grade: string) => {
    const gradeConfig = {
      A: { label: 'A등급', color: 'error' as const },
      B: { label: 'B등급', color: 'warning' as const },
      C: { label: 'C등급', color: 'info' as const },
      D: { label: 'D등급', color: 'default' as const }
    };
    const config = gradeConfig[grade as keyof typeof gradeConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = {
      enterprise: '대기업',
      small_business: '중소기업',
      individual: '개인사업자'
    };
    return typeConfig[type as keyof typeof typeConfig] || type;
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || customer.customerType === typeFilter;
    const matchesGrade = gradeFilter === 'all' || customer.customerGrade === gradeFilter;
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesType && matchesGrade && matchesStatus;
  });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(customer => customer.status === 'active').length;
  const totalSales = customers.reduce((sum, customer) => sum + customer.totalSales, 0);
  const avgSales = totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0;

  return (
    <Box sx={{ width: '100%', px: 2, py: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CustomerIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          고객 정보 관리
        </Typography>
      </Box>

      {/* 고객 요약 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CustomerIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">총 고객</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {totalCustomers}명
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">활성 고객</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {activeCustomers}명
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">총 매출</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {totalSales.toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StarIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">평균 매출</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {avgSales.toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="고객코드, 회사명, 담당자, 연락처로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <InputLabel>고객 유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">전체 유형</MenuItem>
                <MenuItem value="enterprise">대기업</MenuItem>
                <MenuItem value="small_business">중소기업</MenuItem>
                <MenuItem value="individual">개인사업자</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>고객 등급</InputLabel>
              <Select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <MenuItem value="all">전체 등급</MenuItem>
                <MenuItem value="A">A등급</MenuItem>
                <MenuItem value="B">B등급</MenuItem>
                <MenuItem value="C">C등급</MenuItem>
                <MenuItem value="D">D등급</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="potential">잠재고객</MenuItem>
                <MenuItem value="lost">이탈</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              내보내기
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              고객 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 고객 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>고객 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>담당자</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>업종/유형</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>연락처</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>등급</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>총 매출</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {customer.customerCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {customer.companyName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        {customer.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {customer.contactPerson}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {customer.position}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {customer.industry}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getTypeLabel(customer.customerType)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <PhoneIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {customer.phone}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {customer.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getGradeChip(customer.customerGrade)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {customer.totalSales.toLocaleString()}원
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(customer.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(customer)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <HistoryIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(customer.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 고객 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCustomer ? '고객 정보 수정' : '새 고객 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="고객 코드"
                value={formData.customerCode}
                onChange={(e) => setFormData({...formData, customerCode: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="회사명"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="담당자명"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="직책"
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="전화번호"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="이메일"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </Box>
            <TextField
              fullWidth
              label="주소"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="업종"
                value={formData.industry}
                onChange={(e) => setFormData({...formData, industry: e.target.value})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>고객 유형</InputLabel>
                <Select
                  value={formData.customerType}
                  onChange={(e) => setFormData({...formData, customerType: e.target.value as any})}
                >
                  <MenuItem value="enterprise">대기업</MenuItem>
                  <MenuItem value="small_business">중소기업</MenuItem>
                  <MenuItem value="individual">개인사업자</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>고객 등급</InputLabel>
                <Select
                  value={formData.customerGrade}
                  onChange={(e) => setFormData({...formData, customerGrade: e.target.value as any})}
                >
                  <MenuItem value="A">A등급</MenuItem>
                  <MenuItem value="B">B등급</MenuItem>
                  <MenuItem value="C">C등급</MenuItem>
                  <MenuItem value="D">D등급</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                >
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                  <MenuItem value="potential">잠재고객</MenuItem>
                  <MenuItem value="lost">이탈</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="등록일"
                type="date"
                value={formData.registrationDate}
                onChange={(e) => setFormData({...formData, registrationDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="마지막 연락일"
                type="date"
                value={formData.lastContactDate}
                onChange={(e) => setFormData({...formData, lastContactDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              fullWidth
              label="총 매출 (원)"
              type="number"
              value={formData.totalSales}
              onChange={(e) => setFormData({...formData, totalSales: parseInt(e.target.value) || 0})}
            />
            <TextField
              fullWidth
              label="비고"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerInformation;
