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
import { useTranslation } from 'react-i18next';
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
import { APP_CONSTANTS } from '../../constants';
import { useStore } from '../../store';
import { payrollService } from '../../services/api';
import { api } from '../../services/api';

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
  const { t } = useTranslation();
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

  useEffect(() => {
    loadPayrollData();
  }, []);

  useEffect(() => {
    filterPayrolls();
  }, [payrolls, searchTerm, statusFilter, departmentFilter]);

  const loadPayrollData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await payrollService.getPayrolls({ page: 1, limit: 1000 });
      if (response.success) {
        // API 응답을 프론트엔드 형식으로 변환
        const payrollData: PayrollItem[] = (response.data || []).map((p: any) => ({
          id: p.id,
          employeeId: p.employee_id,
          employeeName: p.employee?.username || t('payrollManagement.unknown'),
          department: p.employee?.department || '-',
          position: p.employee?.position || '-',
          basicSalary: parseFloat(p.basic_salary || 0),
          overtimePay: parseFloat(p.overtime_pay || 0),
          bonus: parseFloat(p.bonus || 0),
          allowances: parseFloat(p.allowances || 0),
          deductions: parseFloat(p.deductions || 0),
          grossSalary: parseFloat(p.gross_salary || 0),
          tax: parseFloat(p.tax_amount || 0),
          netSalary: parseFloat(p.net_salary || 0),
          payPeriod: p.payroll_period || '',
          status: p.status || 'pending',
          paymentDate: p.payment_date || undefined,
          createdAt: p.created_at || new Date().toISOString(),
          createdBy: t('payrollManagement.system')
        }));
        setPayrolls(payrollData);
      } else {
        setError(response.message || t('payrollManagement.errors.loadFailed'));
      }
    } catch (error: any) {
      console.error('급여 데이터 로드 오류:', error);
      setError(error.response?.data?.message || t('payrollManagement.errors.loadFailed'));
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
        return <Chip label={t('payrollManagement.status.pending')} color="warning" size="small" />;
      case 'approved':
        return <Chip label={t('payrollManagement.status.approved')} color="info" size="small" />;
      case 'paid':
        return <Chip label={t('payrollManagement.status.paid')} color="success" size="small" />;
      case 'cancelled':
        return <Chip label={t('payrollManagement.status.cancelled')} color="error" size="small" />;
      default:
        return <Chip label={t('payrollManagement.unknown')} color="default" size="small" />;
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
    if (window.confirm(t('payrollManagement.confirmDelete'))) {
      try {
        const response = await payrollService.deletePayroll(id);
        if (response.success) {
          setSuccess(t('payrollManagement.success.deleted'));
          loadPayrollData();
        } else {
          setError(response.message || t('payrollManagement.errors.deleteFailed'));
        }
      } catch (error: any) {
        console.error('삭제 오류:', error);
        setError(error.response?.data?.message || t('payrollManagement.errors.deleteError'));
      }
    }
  };

  const handleApprovePayroll = async (id: number) => {
    try {
      const response = await payrollService.approvePayroll(id);
      if (response.success) {
        setSuccess(t('payrollManagement.success.approved'));
        loadPayrollData();
      } else {
        setError(response.message || t('payrollManagement.errors.approveFailed'));
      }
    } catch (error: any) {
      console.error('급여 승인 오류:', error);
      setError(error.response?.data?.message || t('payrollManagement.errors.approveError'));
    }
  };

  const handlePayPayroll = async (id: number) => {
    try {
      const response = await payrollService.payPayroll(id);
      if (response.success) {
        setSuccess(t('payrollManagement.success.paid'));
        loadPayrollData();
      } else {
        setError(response.message || t('payrollManagement.errors.payFailed'));
      }
    } catch (error: any) {
      console.error('급여 지급 오류:', error);
      setError(error.response?.data?.message || t('payrollManagement.errors.payError'));
    }
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
            {t('payrollManagement.detailTitle')}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
          >
            {t('payrollManagement.backToList')}
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
                <Typography variant="h6" gutterBottom>{t('payrollManagement.payInfo')}</Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.columns.payPeriod')}
                      secondary={selectedPayroll.payPeriod}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.columns.basicSalary')}
                      secondary={`Rs. ${selectedPayroll.basicSalary.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.overtimePay')}
                      secondary={`Rs. ${selectedPayroll.overtimePay.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.bonus')}
                      secondary={`Rs. ${selectedPayroll.bonus.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.allowances')}
                      secondary={`Rs. ${selectedPayroll.allowances.toLocaleString()}`}
                    />
                  </ListItem>
                </List>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>{t('payrollManagement.deductionInfo')}</Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.deductions')}
                      secondary={`Rs. ${selectedPayroll.deductions.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.columns.tax')}
                      secondary={`Rs. ${selectedPayroll.tax.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.columns.totalSalary')}
                      secondary={`Rs. ${selectedPayroll.grossSalary.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.columns.netSalary')}
                      secondary={`Rs. ${selectedPayroll.netSalary.toLocaleString()}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary={t('payrollManagement.columns.status')}
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
                {t('payrollManagement.actions.edit')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                {t('payrollManagement.actions.print')}
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
              >
                {t('payrollManagement.actions.downloadPdf')}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{ 
            fontSize: '16px !important',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.5
          }}>
            {t('payrollManagement.title')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          {t('payrollManagement.actions.createPayroll')}
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
              {t('payrollManagement.summary.totalSalary')}
            </Typography>
            <Typography variant="h4">
              Rs. {totalGrossSalary.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('payrollManagement.summary.netSalary')}
            </Typography>
            <Typography variant="h4">
              Rs. {totalNetSalary.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('payrollManagement.summary.totalTax')}
            </Typography>
            <Typography variant="h4">
              Rs. {totalTax.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              {t('payrollManagement.summary.pendingPayroll')}
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
            alignItems: 'flex-end' 
          }}>
            <TextField
              fullWidth
              placeholder={t('payrollManagement.searchPlaceholder')}
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
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {t('payrollManagement.columns.status')}
              </Typography>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                sx={{ height: '40px' }}
              >
                <MenuItem value="">{t('payrollManagement.all')}</MenuItem>
                <MenuItem value="pending">{t('payrollManagement.status.pending')}</MenuItem>
                <MenuItem value="approved">{t('payrollManagement.status.approved')}</MenuItem>
                <MenuItem value="paid">{t('payrollManagement.status.paid')}</MenuItem>
                <MenuItem value="cancelled">{t('payrollManagement.status.cancelled')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                {t('payrollManagement.department')}
              </Typography>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                displayEmpty
                sx={{ height: '40px' }}
              >
                <MenuItem value="">{t('payrollManagement.all')}</MenuItem>
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
              {t('payrollManagement.actions.reset')}
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
                <TableCell>{t('payrollManagement.columns.employeeInfo')}</TableCell>
                <TableCell>{t('payrollManagement.columns.payPeriod')}</TableCell>
                <TableCell>{t('payrollManagement.columns.basicSalary')}</TableCell>
                <TableCell>{t('payrollManagement.columns.totalSalary')}</TableCell>
                <TableCell>{t('payrollManagement.columns.netSalary')}</TableCell>
                <TableCell>{t('payrollManagement.columns.status')}</TableCell>
                <TableCell>{t('payrollManagement.columns.paymentDate')}</TableCell>
                <TableCell>{t('payrollManagement.columns.actions')}</TableCell>
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
                  <TableCell>Rs. {payroll.basicSalary.toLocaleString()}</TableCell>
                  <TableCell>Rs. {payroll.grossSalary.toLocaleString()}</TableCell>
                  <TableCell>Rs. {payroll.netSalary.toLocaleString()}</TableCell>
                  <TableCell>{getStatusChip(payroll.status)}</TableCell>
                  <TableCell>{payroll.paymentDate || '-'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={t('payrollManagement.actions.view')}>
                        <IconButton size="small" onClick={() => handleViewPayroll(payroll)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('payrollManagement.actions.edit')}>
                        <IconButton size="small" onClick={() => handleEditPayroll(payroll)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {payroll.status === 'pending' && (
                        <Tooltip title={t('payrollManagement.actions.approve')}>
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
                        <Tooltip title={t('payrollManagement.actions.pay')}>
                          <IconButton 
                            size="small" 
                            onClick={() => handlePayPayroll(payroll.id)}
                            color="success"
                          >
                            <MoneyIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={t('payrollManagement.actions.delete')}>
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
          {selectedPayroll ? t('payrollManagement.dialog.editTitle') : t('payrollManagement.dialog.createTitle')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('payrollManagement.dialog.enterInfo')}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('payrollManagement.dialog.underDevelopment')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{t('common.cancel')}</Button>
          <Button variant="contained">
            {selectedPayroll ? t('payrollManagement.actions.edit') : t('payrollManagement.actions.create')}
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