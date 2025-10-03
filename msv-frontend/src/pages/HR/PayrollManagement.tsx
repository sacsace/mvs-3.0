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
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachMoney as MoneyIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Calculate as CalculateIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { APP_CONSTANTS, UTILS } from '../../constants';
import { SAMPLE_PAYROLLS } from '../../constants/sampleData';

interface PayrollItem {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  basicSalary: number;
  overtimePay: number;
  bonus: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  tax: number;
  netSalary: number;
  payPeriod: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paymentDate?: string;
  createdAt: string;
  createdBy: string;
}

const PayrollManagement: React.FC = () => {
  const { user } = useStore();
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([]);
  const [filteredPayrolls, setFilteredPayrolls] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(APP_CONSTANTS.DEFAULT_PAGE_SIZE);

  // 사용자 권한 확인
  const isAdmin = user?.role === 'admin' || user?.role === 'root';
  const isHR = user?.role === 'hr';
  const canManagePayroll = isAdmin || isHR;

  // 샘플 데이터
  const sampleData: PayrollItem[] = SAMPLE_PAYROLLS;

  useEffect(() => {
    loadPayrollData();
  }, []);

  useEffect(() => {
    filterPayrolls();
  }, [payrolls, searchTerm, statusFilter, departmentFilter]);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      await UTILS.delay();
      
      // 권한에 따라 다른 데이터 로드
      if (canManagePayroll) {
        // 관리자/HR: 전체 급여 데이터
        setPayrolls(sampleData);
      } else {
        // 일반 사용자: 자신의 급여만 (사용자 ID가 1001인 경우)
        const userPayrolls = sampleData.filter(payroll => payroll.employeeId === 1001);
        setPayrolls(userPayrolls);
      }
    } catch (error) {
      console.error('급여 데이터 로드 오류:', error);
      setError('급여 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterPayrolls = () => {
    let filtered = payrolls;

    if (searchTerm) {
      filtered = filtered.filter(payroll =>
        payroll.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payroll.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payroll.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(payroll => payroll.status === statusFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(payroll => payroll.department === departmentFilter);
    }

    setFilteredPayrolls(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip label="대기중" color="warning" size="small" />;
      case 'approved':
        return <Chip label="승인됨" color="info" size="small" />;
      case 'paid':
        return <Chip label="지급완료" color="success" size="small" />;
      case 'cancelled':
        return <Chip label="취소됨" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const handleViewPayroll = (payroll: PayrollItem) => {
    setSelectedPayroll(payroll);
    setViewMode('view');
  };

  const handleEditPayroll = (payroll: PayrollItem) => {
    setSelectedPayroll(payroll);
    setOpenDialog(true);
  };

  const handleDeletePayroll = async (id: number) => {
    if (window.confirm('정말로 이 급여 항목을 삭제하시겠습니까?')) {
      try {
        setPayrolls(prev => prev.filter(payroll => payroll.id !== id));
        setSuccess('급여 항목이 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleApprovePayroll = (id: number) => {
    setPayrolls(prev =>
      prev.map(payroll =>
        payroll.id === id ? { ...payroll, status: 'approved' as const } : payroll
      )
    );
    setSuccess('급여가 승인되었습니다.');
  };

  const handlePayPayroll = (id: number) => {
    setPayrolls(prev =>
      prev.map(payroll =>
        payroll.id === id 
          ? { ...payroll, status: 'paid' as const, paymentDate: new Date().toISOString().split('T')[0] } 
          : payroll
      )
    );
    setSuccess('급여가 지급되었습니다.');
  };

  const totalGrossSalary = payrolls.reduce((sum, payroll) => sum + payroll.grossSalary, 0);
  const totalNetSalary = payrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0);
  const totalTax = payrolls.reduce((sum, payroll) => sum + payroll.tax, 0);
  const pendingCount = payrolls.filter(payroll => payroll.status === 'pending').length;

  const paginatedPayrolls = filteredPayrolls.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const departments = Array.from(new Set(payrolls.map(payroll => payroll.department)));

  if (viewMode === 'view' && selectedPayroll) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            급여 상세 정보
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
          >
            목록으로
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {selectedPayroll.employeeName}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedPayroll.position} • {selectedPayroll.department}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom>급여 정보</Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="급여 기간" 
                      secondary={selectedPayroll.payPeriod}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="기본급" 
                      secondary={`₩${selectedPayroll.basicSalary.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="초과근무수당" 
                      secondary={`₩${selectedPayroll.overtimePay.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="보너스" 
                      secondary={`₩${selectedPayroll.bonus.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="제수당" 
                      secondary={`₩${selectedPayroll.allowances.toLocaleString()}`}
                    />
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>공제 정보</Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="공제액" 
                      secondary={`₩${selectedPayroll.deductions.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="세금" 
                      secondary={`₩${selectedPayroll.tax.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="총 급여" 
                      secondary={`₩${selectedPayroll.grossSalary.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="실수령액" 
                      secondary={`₩${selectedPayroll.netSalary.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="상태" 
                      secondary={getStatusChip(selectedPayroll.status)}
                    />
                  </ListItem>
                </List>
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditPayroll(selectedPayroll)}
              >
                수정
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                인쇄
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
              >
                PDF 다운로드
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon />
          급여 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          급여 생성
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 급여액
            </Typography>
            <Typography variant="h4">
              ₩{totalGrossSalary.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              실수령액
            </Typography>
            <Typography variant="h4">
              ₩{totalNetSalary.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 세금
            </Typography>
            <Typography variant="h4">
              ₩{totalTax.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              대기중인 급여
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

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
              placeholder="직원명, 부서, 직책 검색"
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
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="pending">대기중</MenuItem>
                <MenuItem value="approved">승인됨</MenuItem>
                <MenuItem value="paid">지급완료</MenuItem>
                <MenuItem value="cancelled">취소됨</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>부서</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDepartmentFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 급여 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>직원 정보</TableCell>
                <TableCell>급여 기간</TableCell>
                <TableCell>기본급</TableCell>
                <TableCell>총 급여</TableCell>
                <TableCell>실수령액</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>지급일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPayrolls.map((payroll) => (
                <TableRow key={payroll.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {payroll.employeeName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {payroll.position} • {payroll.department}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{payroll.payPeriod}</TableCell>
                  <TableCell>₩{payroll.basicSalary.toLocaleString()}</TableCell>
                  <TableCell>₩{payroll.grossSalary.toLocaleString()}</TableCell>
                  <TableCell>₩{payroll.netSalary.toLocaleString()}</TableCell>
                  <TableCell>{getStatusChip(payroll.status)}</TableCell>
                  <TableCell>{payroll.paymentDate || '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewPayroll(payroll)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditPayroll(payroll)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {payroll.status === 'pending' && (
                        <Tooltip title="승인">
                          <IconButton 
                            size="small" 
                            onClick={() => handleApprovePayroll(payroll.id)}
                            color="info"
                          >
                            <CalculateIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {payroll.status === 'approved' && (
                        <Tooltip title="지급">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePayPayroll(payroll.id)}
                            color="success"
                          >
                            <MoneyIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeletePayroll(payroll.id)}>
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
            count={Math.ceil(filteredPayrolls.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 급여 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPayroll ? '급여 수정' : '급여 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              급여 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              급여 생성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedPayroll ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
};

export default PayrollManagement;