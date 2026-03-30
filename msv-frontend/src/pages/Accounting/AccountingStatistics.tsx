import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Stack,
  Chip,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  AccountBalance as AccountBalanceIcon,
  ShowChart as ShowChartIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useStore } from '../../store';
import { accountingService } from '../../services/api';

interface AccountingStats {
  totalRevenue: number;
  combinedRevenue?: number;
  roomBookingRevenue?: number;
  collectedRevenue?: number;
  outstandingRevenue?: number;
  totalExpenses: number;
  netProfit: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  profitMargin: number;
  revenueGrowth: number;
  expenseGrowth: number;
  averageInvoiceAmount: number;
}

interface TrendRow {
  month?: string;
  quarter?: string;
  day?: string;
  revenue: number;
  expenses: number;
  profit: number;
  budget: number;
}

interface CategoryRow {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface InvoiceStatusRow {
  status: string;
  count: number;
  amount: number;
  color: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3, px: 2 }}>{children}</Box>}
    </div>
  );
}

const AccountingStatistics: React.FC = () => {
  const { user } = useStore();
  const canSelectCompany = user?.role === 'root' || user?.role === 'audit';
  const [stats, setStats] = useState<AccountingStats>({
    totalRevenue: 0,
    combinedRevenue: 0,
    roomBookingRevenue: 0,
    collectedRevenue: 0,
    outstandingRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    profitMargin: 0,
    revenueGrowth: 0,
    expenseGrowth: 0,
    averageInvoiceAmount: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>(user?.company_id ?? '');
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<TrendRow[]>([]);
  const [categoryExpenseData, setCategoryExpenseData] = useState<CategoryRow[]>([]);
  const [categoryRevenueData, setCategoryRevenueData] = useState<CategoryRow[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<InvoiceStatusRow[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<TrendRow[]>([]);
  const [dailyData, setDailyData] = useState<TrendRow[]>([]);

  useEffect(() => {
    if (canSelectCompany) {
      loadCompanies();
    }
  }, [canSelectCompany]);

  useEffect(() => {
    if (selectedCompanyId === '' && user?.company_id) {
      setSelectedCompanyId(user.company_id);
    }
  }, [user?.company_id, selectedCompanyId]);

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod, selectedYear, selectedMonth, selectedCompanyId, user?.company_id, user?.role]);

  const loadCompanies = async () => {
    try {
      const { api } = await import('../../services/api');
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error) {
      console.error('회사 목록 로드 오류:', error);
    }
  };

  const loadStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        period: selectedPeriod,
        year: selectedYear,
        month: selectedMonth,
      };
      
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }

      const response = await accountingService.getAccountingStats(params);
      
      if (response.success) {
        const data = response.data || {};
        setStats({
          totalRevenue: data.totalRevenue || 0,
          combinedRevenue: data.combinedRevenue || 0,
          roomBookingRevenue: data.roomBookingRevenue || 0,
          collectedRevenue: data.collectedRevenue || 0,
          outstandingRevenue: data.outstandingRevenue || 0,
          totalExpenses: data.totalExpenses || 0,
          netProfit: data.netProfit || 0,
          totalInvoices: data.totalInvoices || 0,
          paidInvoices: data.paidInvoices || 0,
          pendingInvoices: data.pendingInvoices || 0,
          overdueInvoices: data.overdueInvoices || 0,
          profitMargin: data.profitMargin || 0,
          revenueGrowth: data.revenueGrowth || 0,
          expenseGrowth: data.expenseGrowth || 0,
          averageInvoiceAmount: data.averageInvoiceAmount || 0,
        });
        setMonthlyRevenueData(Array.isArray(data.monthlyRevenueData) ? data.monthlyRevenueData : []);
        setCategoryExpenseData(Array.isArray(data.categoryExpenseData) ? data.categoryExpenseData : []);
        setCategoryRevenueData(Array.isArray(data.categoryRevenueData) ? data.categoryRevenueData : []);
        setInvoiceStatusData(Array.isArray(data.invoiceStatusData) ? data.invoiceStatusData : []);
        setQuarterlyData(Array.isArray(data.quarterlyData) ? data.quarterlyData : []);
        setDailyData(Array.isArray(data.dailyData) ? data.dailyData : []);
      } else {
        setStats({
          totalRevenue: 0,
          combinedRevenue: 0,
          roomBookingRevenue: 0,
          collectedRevenue: 0,
          outstandingRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          pendingInvoices: 0,
          overdueInvoices: 0,
          profitMargin: 0,
          revenueGrowth: 0,
          expenseGrowth: 0,
          averageInvoiceAmount: 0,
        });
        setMonthlyRevenueData([]);
        setCategoryExpenseData([]);
        setCategoryRevenueData([]);
        setInvoiceStatusData([]);
        setQuarterlyData([]);
        setDailyData([]);
      }
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
      setError('통계 데이터를 불러오는데 실패했습니다.');
      setStats({
        totalRevenue: 0,
        combinedRevenue: 0,
        roomBookingRevenue: 0,
        collectedRevenue: 0,
        outstandingRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        profitMargin: 0,
        revenueGrowth: 0,
        expenseGrowth: 0,
        averageInvoiceAmount: 0,
      });
      setMonthlyRevenueData([]);
      setCategoryExpenseData([]);
      setCategoryRevenueData([]);
      setInvoiceStatusData([]);
      setQuarterlyData([]);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const formatAxisAmount = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return `${Math.round(value)}`;
  };

  const getProfitMargin = () => {
    if (stats.totalRevenue === 0) return 0;
    return ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1);
  };

  const getChartData = () => {
    switch (selectedPeriod) {
      case 'day':
        return dailyData;
      case 'week':
        return monthlyRevenueData.slice(0, 4);
      case 'month':
        return monthlyRevenueData;
      case 'quarter':
        return quarterlyData;
      case 'year':
        return quarterlyData;
      default:
        return monthlyRevenueData;
    }
  };

  const handleDownloadReport = () => {
    const periodLabelMap: Record<string, string> = {
      day: '일간',
      week: '주간',
      month: '월간',
      quarter: '분기',
      year: '연간'
    };

    const companyLabel =
      selectedCompanyId === ''
        ? '전체 회사'
        : companies.find((company) => company.id === selectedCompanyId)?.name ||
          (selectedCompanyId ? `회사 ${selectedCompanyId}` : '') ||
          user?.username ||
          '선택 회사';

    const summaryRows = [
      { 항목: '생성일시', 값: new Date().toLocaleString('ko-KR') },
      { 항목: '기간 구분', 값: periodLabelMap[selectedPeriod] || selectedPeriod },
      { 항목: '조회 연도', 값: `${selectedYear}` },
      { 항목: '조회 월', 값: `${selectedMonth}` },
      { 항목: '조회 회사', 값: companyLabel },
      { 항목: '총 매출(인보이스)', 값: stats.totalRevenue || 0 },
      { 항목: '수금액', 값: stats.collectedRevenue || 0 },
      { 항목: '미수금', 값: stats.outstandingRevenue || 0 },
      { 항목: '객실예약 매출', 값: stats.roomBookingRevenue || 0 },
      { 항목: '통합 매출(참고)', 값: stats.combinedRevenue || stats.totalRevenue || 0 },
      { 항목: '총 지출', 값: stats.totalExpenses || 0 },
      { 항목: '순이익', 값: stats.netProfit || 0 },
      { 항목: '총 인보이스', 값: stats.totalInvoices || 0 },
      { 항목: '결제완료 인보이스', 값: stats.paidInvoices || 0 },
      { 항목: '대기 인보이스', 값: stats.pendingInvoices || 0 },
      { 항목: '연체 인보이스', 값: stats.overdueInvoices || 0 },
      { 항목: '평균 인보이스 금액', 값: stats.averageInvoiceAmount || 0 }
    ];

    const trendRows = getChartData().map((row) => ({
      기간: row.day || row.quarter || row.month || '-',
      수익: row.revenue || 0,
      비용: row.expenses || 0,
      순이익: row.profit || 0,
      예산: row.budget || 0
    }));

    const invoiceRows = invoiceStatusData.map((row) => ({
      상태: row.status,
      건수: row.count,
      금액: row.amount
    }));

    const revenueCategoryRows = categoryRevenueData.map((row) => ({
      카테고리: row.name,
      금액: row.value,
      비중: `${row.percentage}%`
    }));

    const expenseCategoryRows = categoryExpenseData.map((row) => ({
      카테고리: row.name,
      금액: row.value,
      비중: `${row.percentage}%`
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), '요약');
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(trendRows.length > 0 ? trendRows : [{ 기간: '-', 수익: 0, 비용: 0, 순이익: 0, 예산: 0 }]),
      '추이'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(invoiceRows.length > 0 ? invoiceRows : [{ 상태: '-', 건수: 0, 금액: 0 }]),
      '인보이스현황'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        revenueCategoryRows.length > 0 ? revenueCategoryRows : [{ 카테고리: '-', 금액: 0, 비중: '0%' }]
      ),
      '수익카테고리'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        expenseCategoryRows.length > 0 ? expenseCategoryRows : [{ 카테고리: '-', 금액: 0, 비중: '0%' }]
      ),
      '비용카테고리'
    );

    const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(workbook, `회계통계_보고서_${dateToken}.xlsx`);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AssessmentIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
            <Typography component="h1" sx={{
              fontSize: '16px !important',
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.5
            }}>
              회계 통계
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            수익, 비용, 수익성 등 회계 관련 통계를 종합적으로 분석하세요.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadStatistics}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadReport}
          >
            보고서 다운로드
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 필터 섹션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="flex-end">
            {canSelectCompany && (
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                    회사
                  </Typography>
                  <Select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      const value = String(e.target.value);
                      if (value === '') {
                        setSelectedCompanyId('');
                      } else {
                        const num = Number(value);
                        setSelectedCompanyId(isNaN(num) ? '' : num);
                      }
                    }}
                    sx={{ height: '40px' }}
                  >
                    <MenuItem value="">전체 회사</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                  기간
                </Typography>
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  displayEmpty
                  sx={{ height: '40px' }}
                >
                  <MenuItem value="day">일간</MenuItem>
                  <MenuItem value="week">주간</MenuItem>
                  <MenuItem value="month">월간</MenuItem>
                  <MenuItem value="quarter">분기</MenuItem>
                  <MenuItem value="year">연간</MenuItem>
                </Select>
              </FormControl>
              </Grid>
            {selectedPeriod === 'year' && (
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                    연도
                  </Typography>
                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value as number)}
                    sx={{ height: '40px' }}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <MenuItem key={year} value={year}>{year}년</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {selectedPeriod === 'month' && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <FormControl fullWidth>
                    <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                      연도
                    </Typography>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value as number)}
                      sx={{ height: '40px' }}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <MenuItem key={year} value={year}>{year}년</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                  <FormControl fullWidth>
                    <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                      월
                    </Typography>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value as number)}
                      sx={{ height: '40px' }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <MenuItem key={month} value={month}>{month}월</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* 주요 지표 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
          <Card sx={{ width: '100%', height: '100%' }}>
            <CardContent sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    총 매출 (인보이스 기준)
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(stats.totalRevenue)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', mt: 0.5, fontSize: '0.72rem', lineHeight: 1.3 }}
                  >
                    <TrendingUpIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                    수금액 {formatCurrency(stats.collectedRevenue || 0)} | 미수금 {formatCurrency(stats.outstandingRevenue || 0)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.25, fontSize: '0.72rem', lineHeight: 1.3 }}
                  >
                    참고: 객실예약 {formatCurrency(stats.roomBookingRevenue || 0)} 포함 통합매출은 {formatCurrency(stats.combinedRevenue || stats.totalRevenue)}
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
          <Card sx={{ width: '100%', height: '100%' }}>
            <CardContent sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    총 지출
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {formatCurrency(stats.totalExpenses)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <TrendingDownIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                    {stats.expenseGrowth > 0 ? '+' : ''}{stats.expenseGrowth}% 전월 대비
                  </Typography>
                </Box>
                <TrendingDownIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
          <Card sx={{ width: '100%', height: '100%' }}>
            <CardContent sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    순이익
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="info.main">
                    {formatCurrency(stats.netProfit)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    수익률: {getProfitMargin()}%
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
          <Card sx={{ width: '100%', height: '100%' }}>
            <CardContent sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    총 인보이스
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {stats.totalInvoices}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    평균: {formatCurrency(stats.averageInvoiceAmount)}
                  </Typography>
                </Box>
                <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* 탭 섹션 */}
          <Card sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab icon={<ShowChartIcon />} iconPosition="start" label="수익/비용 추이" />
                <Tab icon={<PieChartIcon />} iconPosition="start" label="카테고리별 분석" />
                <Tab icon={<BarChartIcon />} iconPosition="start" label="인보이스 현황" />
                <Tab icon={<AccountBalanceIcon />} iconPosition="start" label="예산 대비 실적" />
              </Tabs>
            </Box>

            {/* 수익/비용 추이 */}
            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        수익/비용 추이
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={selectedPeriod === 'day' ? 'day' : selectedPeriod === 'quarter' ? 'quarter' : 'month'} />
                          <YAxis tickFormatter={formatAxisAmount} />
                          <RechartsTooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            fill="#4caf50" 
                            fillOpacity={0.3}
                            stroke="#4caf50"
                            strokeWidth={2}
                            name="수익"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="expenses" 
                            fill="#f44336" 
                            fillOpacity={0.3}
                            stroke="#f44336"
                            strokeWidth={2}
                            name="비용"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="profit" 
                            stroke="#2196f3" 
                            strokeWidth={3}
                            name="순이익"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* 카테고리별 분석 */}
            <TabPanel value={activeTab} index={1}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                  <Card variant="outlined" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        카테고리별 비용 분포
                      </Typography>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={categoryExpenseData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percentage }) => `${name} ${percentage}%`}
                          >
                            {categoryExpenseData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <Box sx={{ mt: 2 }}>
                        {categoryExpenseData.map((item, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                backgroundColor: item.color,
                                borderRadius: '50%',
                                mr: 1
                              }}
                            />
                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ mr: 2 }}>
                              {item.percentage}%
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formatCurrency(item.value)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                  <Card variant="outlined" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        카테고리별 수익 분포
                      </Typography>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={categoryRevenueData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percentage }) => `${name} ${percentage}%`}
                          >
                            {categoryRevenueData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <Box sx={{ mt: 2 }}>
                        {categoryRevenueData.map((item, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                backgroundColor: item.color,
                                borderRadius: '50%',
                                mr: 1
                              }}
                            />
                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ mr: 2 }}>
                              {item.percentage}%
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formatCurrency(item.value)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* 인보이스 현황 */}
            <TabPanel value={activeTab} index={2}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex' }}>
                  <Card variant="outlined" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        인보이스 상태별 현황
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={invoiceStatusData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <RechartsTooltip 
                            formatter={(value: number, name: string) => [
                              name === 'count' ? value + '개' : formatCurrency(value),
                              name === 'count' ? '건수' : '금액'
                            ]}
                          />
                          <Legend />
                          <Bar dataKey="count" fill="#8884d8" name="건수" />
                          <Bar dataKey="amount" fill="#82ca9d" name="금액" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
                  <Card variant="outlined" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        인보이스 상태 요약
                      </Typography>
                      <Stack spacing={2}>
                        {invoiceStatusData.map((item, index) => (
                          <Box key={index}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: item.color,
                                    borderRadius: '50%',
                                    mr: 1
                                  }}
                                />
                                <Typography variant="body2" fontWeight={500}>{item.status}</Typography>
                              </Box>
                              <Typography variant="body2" fontWeight={500}>
                                {item.count}건
                              </Typography>
                            </Box>
                            <Typography variant="h6" color={item.color}>
                              {formatCurrency(item.amount)}
                            </Typography>
                            {index < invoiceStatusData.length - 1 && <Divider sx={{ mt: 2 }} />}
                          </Box>
                        ))}
                        <Divider />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="body1" fontWeight={600}>총계</Typography>
                          <Typography variant="h6" fontWeight={600}>
                            {formatCurrency(invoiceStatusData.reduce((sum, item) => sum + item.amount, 0))}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* 예산 대비 실적 */}
            <TabPanel value={activeTab} index={3}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                        예산 대비 실적 분석
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={monthlyRevenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={formatAxisAmount} />
                          <RechartsTooltip 
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Legend />
                          <Bar dataKey="budget" fill="#9e9e9e" name="예산" />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#4caf50" 
                            strokeWidth={3}
                            name="실제 수익"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        월별 예산 대비 실적 상세
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>월</TableCell>
                              <TableCell align="right">예산</TableCell>
                              <TableCell align="right">실제 수익</TableCell>
                              <TableCell align="right">차이</TableCell>
                              <TableCell align="right">달성률</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {monthlyRevenueData.map((row, index) => {
                              const difference = row.revenue - row.budget;
                              const achievementRate = ((row.revenue / row.budget) * 100).toFixed(1);
                              return (
                                <TableRow key={index}>
                                  <TableCell>{row.month}</TableCell>
                                  <TableCell align="right">{formatCurrency(row.budget)}</TableCell>
                                  <TableCell align="right">{formatCurrency(row.revenue)}</TableCell>
                                  <TableCell align="right">
                                    <Typography 
                                      variant="body2" 
                                      color={difference >= 0 ? 'success.main' : 'error.main'}
                                    >
                                      {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={`${achievementRate}%`}
                                      color={parseFloat(achievementRate) >= 100 ? 'success' : 'warning'}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </Card>
        </>
      )}
    </Box>
  );
};

export default AccountingStatistics;
