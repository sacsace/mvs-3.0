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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  Divider,
  Grid,
  Tooltip,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Calculate as CalculateIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface PayrollData {
  id: number;
  employee_id: number;
  employee_name: string;
  department: string;
  position: string;
  date_of_birth: string;
  joining_date: string;
  increase_salary_date: string;
  basic_salary: number;
  total_days_of_month: number;
  unpaid_leave: number;
  days_worked: number;
  overtime_hours: number;
  sum_total: number;
  pf_employee_contribution: number;
  pf_employer_contribution: number;
  esic_employee_contribution: number;
  esic_employer_contribution: number;
  tds: number;
  professional_tax: number;
  advance_payment_amount: number;
  amount_to_be_deducted: number;
  balance_of_salary_advance: number;
  previous_month_adjustment: number;
  net_salary_payable: number;
  month_total_cost: number;
  payment_method: string;
  payment_date: string;
  status: 'draft' | 'calculated' | 'approved' | 'paid';
}

interface Company {
  id: number;
  name: string;
  code: string;
  employeeCount: number;
}

const PayrollManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });

  const [companies] = useState<Company[]>([
    { id: 1, name: 'ABC회사', code: 'ABC', employeeCount: 15 },
    { id: 2, name: 'XYZ회사', code: 'XYZ', employeeCount: 8 },
    { id: 3, name: 'DEF회사', code: 'DEF', employeeCount: 12 }
  ]);

  const [payrollData, setPayrollData] = useState<PayrollData[]>([
    {
      id: 1,
      employee_id: 1001,
      employee_name: '김철수',
      department: '개발팀',
      position: '대리',
      date_of_birth: '1990-05-15',
      joining_date: '2020-03-01',
      increase_salary_date: '2023-03-01',
      basic_salary: 3500000,
      total_days_of_month: 30,
      unpaid_leave: 0,
      days_worked: 30,
      overtime_hours: 8,
      sum_total: 3800000,
      pf_employee_contribution: 350000,
      pf_employer_contribution: 350000,
      esic_employee_contribution: 175000,
      esic_employer_contribution: 175000,
      tds: 150000,
      professional_tax: 2000,
      advance_payment_amount: 0,
      amount_to_be_deducted: 527000,
      balance_of_salary_advance: 0,
      previous_month_adjustment: 0,
      net_salary_payable: 3273000,
      month_total_cost: 3623000,
      payment_method: '계좌이체',
      payment_date: '2024-01-31',
      status: 'paid'
    },
    {
      id: 2,
      employee_id: 1002,
      employee_name: '이영희',
      department: '마케팅팀',
      position: '팀장',
      date_of_birth: '1985-08-22',
      joining_date: '2018-06-15',
      increase_salary_date: '2023-06-15',
      basic_salary: 4500000,
      total_days_of_month: 30,
      unpaid_leave: 2,
      days_worked: 28,
      overtime_hours: 12,
      sum_total: 4800000,
      pf_employee_contribution: 450000,
      pf_employer_contribution: 450000,
      esic_employee_contribution: 225000,
      esic_employer_contribution: 225000,
      tds: 200000,
      professional_tax: 2000,
      advance_payment_amount: 0,
      amount_to_be_deducted: 677000,
      balance_of_salary_advance: 0,
      previous_month_adjustment: 0,
      net_salary_payable: 4123000,
      month_total_cost: 4573000,
      payment_method: '계좌이체',
      payment_date: '2024-01-31',
      status: 'paid'
    },
    {
      id: 3,
      employee_id: 1003,
      employee_name: '박민수',
      department: '영업팀',
      position: '과장',
      date_of_birth: '1988-12-10',
      joining_date: '2019-09-01',
      increase_salary_date: '2023-09-01',
      basic_salary: 4000000,
      total_days_of_month: 30,
      unpaid_leave: 1,
      days_worked: 29,
      overtime_hours: 6,
      sum_total: 4200000,
      pf_employee_contribution: 400000,
      pf_employer_contribution: 400000,
      esic_employee_contribution: 200000,
      esic_employer_contribution: 200000,
      tds: 180000,
      professional_tax: 2000,
      advance_payment_amount: 0,
      amount_to_be_deducted: 582000,
      balance_of_salary_advance: 0,
      previous_month_adjustment: 0,
      net_salary_payable: 3618000,
      month_total_cost: 4018000,
      payment_method: '계좌이체',
      payment_date: '2024-01-31',
      status: 'paid'
    }
  ]);

  const getStatusChip = (status: string) => {
    const statusConfig = {
      draft: { label: '초안', color: 'default' as const },
      calculated: { label: '계산완료', color: 'info' as const },
      approved: { label: '승인', color: 'warning' as const },
      paid: { label: '지급완료', color: 'success' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const handleCalculatePayroll = async () => {
    setIsCalculating(true);
    // 실제 계산 로직 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPayrollData(prev => 
      prev.map(item => ({ ...item, status: 'calculated' as const }))
    );
    setIsCalculating(false);
    setSnackbar({ open: true, message: '급여 계산이 완료되었습니다.', severity: 'success' });
  };

  const handleApprovePayroll = () => {
    setPayrollData(prev => 
      prev.map(item => ({ ...item, status: 'approved' as const }))
    );
    setSnackbar({ open: true, message: '급여 승인이 완료되었습니다.', severity: 'success' });
  };

  const handlePayPayroll = () => {
    setPayrollData(prev => 
      prev.map(item => ({ ...item, status: 'paid' as const }))
    );
    setSnackbar({ open: true, message: '급여 지급이 완료되었습니다.', severity: 'success' });
  };

  const handleExportExcel = () => {
    setSnackbar({ open: true, message: '엑셀 파일이 다운로드되었습니다.', severity: 'success' });
  };

  const handleImportExcel = () => {
    setOpenImportDialog(true);
  };

  const filteredPayrollData = payrollData.filter(item => {
    const matchesSearch = item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.position.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssessmentIcon sx={{ mr: 1 }} />
                  급여 명세서 ({filteredPayrollData.length}명)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<CalculateIcon />}
                    onClick={handleCalculatePayroll}
                    disabled={isCalculating}
                  >
                    급여 계산
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CheckIcon />}
                    onClick={handleApprovePayroll}
                  >
                    승인
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<MoneyIcon />}
                    onClick={handlePayPayroll}
                  >
                    지급
                  </Button>
                </Box>
              </Box>
              
              {isCalculating && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                    급여 계산 중...
                  </Typography>
                </Box>
              )}

              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>직원</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>부서/직급</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>기본급</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>총급여</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>공제액</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>실수령액</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>회사부담금</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>지급방법</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }}>상태</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', minWidth: 100, textAlign: 'center' }}>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPayrollData.map((payroll) => (
                      <TableRow key={payroll.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                              {payroll.employee_name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {payroll.employee_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {payroll.employee_id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {payroll.department}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payroll.position}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(payroll.basic_salary)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                            {formatCurrency(payroll.sum_total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'error.main' }}>
                            {formatCurrency(payroll.amount_to_be_deducted)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            {formatCurrency(payroll.net_salary_payable)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(payroll.month_total_cost - payroll.sum_total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={payroll.payment_method} color="info" size="small" />
                        </TableCell>
                        <TableCell>
                          {getStatusChip(payroll.status)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="상세보기">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="수정">
                              <IconButton size="small">
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="인쇄">
                              <IconButton size="small">
                                <PrintIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
            gap: 3 
          }}>
            {companies.map((company) => {
              const companyPayrolls = payrollData; // 실제로는 회사별 필터링
              const totalSalary = companyPayrolls.reduce((sum, payroll) => sum + payroll.sum_total, 0);
              const totalDeduction = companyPayrolls.reduce((sum, payroll) => sum + payroll.amount_to_be_deducted, 0);
              const totalNetSalary = companyPayrolls.reduce((sum, payroll) => sum + payroll.net_salary_payable, 0);
              const totalCompanyCost = companyPayrolls.reduce((sum, payroll) => sum + payroll.month_total_cost, 0);
              
              return (
                <Card key={company.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {company.name}
                      </Typography>
                      <Chip 
                        label={`${company.employeeCount}명`} 
                        color="info" 
                        size="small" 
                        sx={{ ml: 2 }}
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">총 급여</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {formatCurrency(totalSalary)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">총 공제</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                        {formatCurrency(totalDeduction)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">실수령액</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(totalNetSalary)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">회사부담금</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(totalCompanyCost - totalSalary)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<DownloadIcon />}>
                        엑셀
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<EmailIcon />}>
                        이메일
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      px: 2,
      py: 3
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <MoneyIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          급여 관리
        </Typography>
      </Box>

      {/* 탭 메뉴 */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<AssessmentIcon />} 
            label="급여 명세서" 
            iconPosition="start"
          />
          <Tab 
            icon={<BusinessIcon />} 
            label="회사별 현황" 
            iconPosition="start"
          />
        </Tabs>
      </Card>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="직원명, 부서, 직급으로 검색..."
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
              <InputLabel>월</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <MenuItem value="2024-01">2024년 1월</MenuItem>
                <MenuItem value="2024-02">2024년 2월</MenuItem>
                <MenuItem value="2024-03">2024년 3월</MenuItem>
                <MenuItem value="2024-04">2024년 4월</MenuItem>
                <MenuItem value="2024-05">2024년 5월</MenuItem>
                <MenuItem value="2024-06">2024년 6월</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>회사</InputLabel>
              <Select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <MenuItem value="all">전체 회사</MenuItem>
                {companies.map(company => (
                  <MenuItem key={company.id} value={company.name}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleImportExcel}
              sx={{ mr: 1 }}
            >
              엑셀 가져오기
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              sx={{ mr: 1 }}
            >
              엑셀 내보내기
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
            >
              급여 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 탭 콘텐츠 */}
      {getTabContent()}

      {/* 엑셀 가져오기 다이얼로그 */}
      <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>엑셀 파일 가져오기</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              엑셀 파일을 선택하여 급여 데이터를 가져오세요. 파일 형식은 .xlsx 또는 .xls를 지원합니다.
            </Alert>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{ mb: 2 }}
            >
              파일 선택
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              지원되는 컬럼: 직원ID, 직원명, 부서, 직급, 기본급, 근무일수, 초과근무시간 등
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)}>취소</Button>
          <Button onClick={() => setOpenImportDialog(false)} variant="contained">가져오기</Button>
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PayrollManagement;
