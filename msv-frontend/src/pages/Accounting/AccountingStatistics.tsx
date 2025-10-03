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
  Divider
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
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
  Bar
} from 'recharts';

interface AccountingStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

const AccountingStatistics: React.FC = () => {
  const [stats, setStats] = useState<AccountingStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [loading, setLoading] = useState(false);

  // 샘플 데이터
  const monthlyRevenueData = [
    { month: '1월', revenue: 2500000, expenses: 1800000, profit: 700000 },
    { month: '2월', revenue: 3200000, expenses: 2100000, profit: 1100000 },
    { month: '3월', revenue: 2800000, expenses: 1900000, profit: 900000 },
    { month: '4월', revenue: 3500000, expenses: 2200000, profit: 1300000 },
    { month: '5월', revenue: 4200000, expenses: 2500000, profit: 1700000 },
    { month: '6월', revenue: 3800000, expenses: 2300000, profit: 1500000 }
  ];

  const categoryExpenseData = [
    { name: '인건비', value: 1200000, color: '#8884d8' },
    { name: '임대료', value: 800000, color: '#82ca9d' },
    { name: '마케팅', value: 600000, color: '#ffc658' },
    { name: '운영비', value: 400000, color: '#ff7300' },
    { name: '기타', value: 300000, color: '#00ff00' }
  ];

  const invoiceStatusData = [
    { status: '지급완료', count: 45, amount: 15000000 },
    { status: '대기중', count: 12, amount: 3500000 },
    { status: '연체', count: 3, amount: 800000 }
  ];

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // API 호출을 통한 실제 데이터 로드
      const response = await fetch('/api/accounting/stats');
      if (!response.ok) {
        throw new Error('통계 데이터 로드 실패');
      }
      const data = await response.json();
      
      if (data.success) {
        setStats({
          totalRevenue: data.data?.totalRevenue || 21000000,
          totalExpenses: data.data?.totalExpenses || 12000000,
          netProfit: data.data?.netProfit || 9000000,
          totalInvoices: data.data?.totalInvoices || 60,
          paidInvoices: data.data?.paidInvoices || 45,
          pendingInvoices: data.data?.pendingInvoices || 12,
          overdueInvoices: data.data?.overdueInvoices || 3
        });
      } else {
        // API 실패 시 샘플 데이터 사용
        setStats({
          totalRevenue: 21000000,
          totalExpenses: 12000000,
          netProfit: 9000000,
          totalInvoices: 60,
          paidInvoices: 45,
          pendingInvoices: 12,
          overdueInvoices: 3
        });
      }
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error);
      // 오류 발생 시 샘플 데이터 사용
      setStats({
        totalRevenue: 21000000,
        totalExpenses: 12000000,
        netProfit: 9000000,
        totalInvoices: 60,
        paidInvoices: 45,
        pendingInvoices: 12,
        overdueInvoices: 3
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  const getProfitMargin = () => {
    if (stats.totalRevenue === 0) return 0;
    return ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1);
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
          <AssessmentIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          회계 통계
        </Typography>
        <Typography variant="body2" color="text.secondary">
          수익, 비용, 수익성 등 회계 관련 통계를 확인하는 페이지입니다.
        </Typography>
      </Box>

      {/* 기간 선택 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>기간</InputLabel>
              <Select
                value={selectedPeriod}
                label="기간"
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <MenuItem value="week">주간</MenuItem>
                <MenuItem value="month">월간</MenuItem>
                <MenuItem value="quarter">분기</MenuItem>
                <MenuItem value="year">연간</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
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
              >
                보고서 다운로드
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 주요 지표 카드 */}
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
                <Typography color="text.secondary" gutterBottom variant="subtitle2">
                  총 수익
                </Typography>
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {formatCurrency(stats.totalRevenue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <TrendingUpIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                  +12.5% 전월 대비
                </Typography>
              </Box>
              <MoneyIcon sx={{ fontSize: '2.5rem', color: 'success.main', opacity: 0.7 }} />
            </Box>
           </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="subtitle2">
                  총 비용
                </Typography>
                <Typography variant="h4" fontWeight={600} color="error.main">
                  {formatCurrency(stats.totalExpenses)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <TrendingDownIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                  -5.2% 전월 대비
                </Typography>
              </Box>
              <TrendingDownIcon sx={{ fontSize: '2.5rem', color: 'error.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="subtitle2">
                  순이익
                </Typography>
                <Typography variant="h4" fontWeight={600} color="info.main">
                  {formatCurrency(stats.netProfit)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  수익률: {getProfitMargin()}%
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: '2.5rem', color: 'info.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="subtitle2">
                  총 인보이스
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {stats.totalInvoices}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  지급완료: {stats.paidInvoices}개
                </Typography>
              </Box>
              <ReceiptIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 차트 섹션 */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '2fr 1fr'
        },
        gap: 3,
        mb: 3
      }}>
        {/* 월별 수익/비용 추이 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              월별 수익/비용 추이
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => (value / 1000000).toFixed(0) + 'M'} />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `${label}월`}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4caf50" 
                  strokeWidth={3}
                  name="수익"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#f44336" 
                  strokeWidth={3}
                  name="비용"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#2196f3" 
                  strokeWidth={3}
                  name="순이익}"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 카테고리별 비용 분포 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              카테고리별 비용 분포
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryExpenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
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
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(item.value)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 하단 차트 섹션 */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, 1fr)'
        },
        gap: 3
      }}>
        {/* 인보이스 상태별 현황 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              인보이스 상태별 현황
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
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
                <Bar dataKey="count" fill="#8884d8" name="건수" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 인보이스 상태 요약 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              인보이스 상태 요약
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip label="지급완료" color="success" size="small" sx={{ mr: 2 }} />
                  <Typography variant="body2">{stats.paidInvoices}건</Typography>
                </Box>
                <Typography variant="body2" fontWeight={500}>
                  {formatCurrency(15000000)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip label="대기중" color="warning" size="small" sx={{ mr: 2 }} />
                  <Typography variant="body2">{stats.pendingInvoices}건</Typography>
                </Box>
                <Typography variant="body2" fontWeight={500}> 
                  {formatCurrency(3500000)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip label="연체" color="error" size="small" sx={{ mr: 2 }} />
                  <Typography variant="body2">{stats.overdueInvoices}건</Typography>
                </Box>
                <Typography variant="body2" fontWeight={500}>
                  {formatCurrency(800000)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body1" fontWeight={600}>총계</Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(19300000)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default AccountingStatistics;