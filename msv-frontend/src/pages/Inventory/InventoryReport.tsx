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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  Divider,
  LinearProgress,
  Grid
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
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
  Bar,
  Legend
} from 'recharts';
import { inventoryService } from '../../services/api';
import { useStore } from '../../store';

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  averageTurnover: number;
}

interface ProductReport {
  id: number;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  turnoverRate: number;
  status: string;
  lastMovement: string;
}

const InventoryReport: React.FC = () => {
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    averageTurnover: 0
  });
  const [products, setProducts] = useState<ProductReport[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const chartColors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#00bcd4', '#f44336'];

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, selectedCategory]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const response = await inventoryService.getInventoryReport();
      
      if (response.success && response.data) {
        const { stats: reportStats, categoryDistribution: catDist, monthlyTransactions, lowStockProducts: lowStock } = response.data;
        
        // 통계 설정
        setStats(reportStats);
        setCategoryDistribution((catDist || []).map((item: any, index: number) => ({
          ...item,
          color: item.color || chartColors[index % chartColors.length]
        })));
        setMonthlyData(monthlyTransactions || []);
        setLowStockProducts(lowStock || []);

        // 제품 목록 로드
        const productsResponse = await inventoryService.getProducts({ limit: 1000 });
        if (productsResponse.success && productsResponse.data) {
          let productsList = productsResponse.data.map((product: any) => ({
            id: product.id,
            name: product.name,
            category: product.category || '기타',
            currentStock: parseFloat(product.stock_quantity || 0),
            minStock: parseFloat(product.min_stock_level || 0),
            maxStock: parseFloat(product.max_stock_level || 100),
            unitPrice: parseFloat(product.unit_price || 0),
            totalValue: parseFloat(product.stock_quantity || 0) * parseFloat(product.unit_price || 0),
            turnoverRate: parseFloat(product.turnover_rate || 0),
            status: parseFloat(product.stock_quantity || 0) <= parseFloat(product.min_stock_level || 0) ? 'low' : 'normal',
            lastMovement: product.updated_at || new Date().toISOString()
          }));

          // 카테고리 필터링
          if (selectedCategory) {
            productsList = productsList.filter((product: ProductReport) => product.category === selectedCategory);
          }
          setProducts(productsList);
        }
      }
    } catch (error) {
      console.error('재고 보고서 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'low': return 'warning';
      case 'out': return 'error';
      default: return 'default';
    }
  };

  const turnoverData = products.reduce((acc: any[], product) => {
    const existing = acc.find(item => item.category === product.category);
    if (existing) {
      existing.totalTurnover += product.turnoverRate || 0;
      existing.count += 1;
    } else {
      acc.push({ category: product.category, totalTurnover: product.turnoverRate || 0, count: 1 });
    }
    return acc;
  }, []).map(item => ({
    category: item.category,
    turnover: item.count ? Number((item.totalTurnover / item.count).toFixed(2)) : 0
  }));

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal': return '정상';
      case 'low': return '부족';
      case 'out': return '품절';
      default: return status;
    }
  };

  const getStockLevel = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (current <= min) return { level: 'low', percentage };
    if (current >= max * 0.8) return { level: 'high', percentage };
    return { level: 'normal', percentage };
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <InventoryIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{
            fontSize: '16px !important',
            fontWeight: 600,
            color: 'red',
            lineHeight: 1.5
          }}>
            재고 보고서
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          재고 현황, 회전율, 비용 분석 등 재고 관련 통계를 확인하는 페이지입니다.
        </Typography>
      </Box>

      {/* 필터 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2}>
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
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={selectedCategory}
                  label="카테고리"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="전자제품">전자제품</MenuItem>
                  <MenuItem value="사무용품">사무용품</MenuItem>
                  <MenuItem value="소모품">소모품</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadReportData}
                disabled={loading}
              >
                새로고침
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
                  총 제품 수
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {stats.totalProducts}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <CheckCircleIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                  활성 제품
                </Typography>
              </Box>
              <InventoryIcon sx={{ fontSize: '2rem', color: 'primary.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="subtitle2">
                  총 재고 가치
                </Typography>
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {formatCurrency(stats.totalValue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <TrendingUpIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                  +8.2% 전월 대비
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: '2rem', color: 'success.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="subtitle2">
                  재고 부족
                </Typography>
                <Typography variant="h4" fontWeight={600} color="warning.main">
                  {stats.lowStockItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <WarningIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                  주의 필요
                </Typography>
              </Box>
              <WarningIcon sx={{ fontSize: '2rem', color: 'warning.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="subtitle2">
                  평균 회전율
                </Typography>
                <Typography variant="h4" fontWeight={600} color="info.main">
                  {stats.averageTurnover}x
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  연간 기준
                </Typography>
              </Box>
              <TrendingDownIcon sx={{ fontSize: '2rem', color: 'info.main', opacity: 0.7 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 차트 섹션 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 월별 재고 추이 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                월별 재고 추이
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line 
                    type="monotone" 
                    dataKey="stock" 
                    stroke="#4caf50" 
                    strokeWidth={3}
                    name="재고량"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="movements" 
                    stroke="#2196f3" 
                    strokeWidth={3}
                    name="입출고"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 카테고리별 재고 분포 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                카테고리별 재고 분포
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryDistribution.length > 0 ? categoryDistribution : [{ name: '데이터 없음', value: 0 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {categoryDistribution.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: item.color || chartColors[index % chartColors.length],
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
        </Grid>

        {/* 회전율 분석 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                카테고리별 회전율 분석
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={turnoverData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: number) => value + '회'} />
                  <Bar dataKey="turnover" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 상세 재고 현황 테이블 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            상세 재고 현황
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>제품명</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>현재 재고</TableCell>
                  <TableCell>재고 수준</TableCell>
                  <TableCell>단가</TableCell>
                  <TableCell>총 가치</TableCell>
                  <TableCell>회전율</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>최근 이동</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const stockLevel = getStockLevel(product.currentStock, product.minStock, product.maxStock);
                  return (
                    <TableRow key={product.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {product.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {product.currentStock}개
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ minWidth: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={stockLevel.percentage}
                            color={stockLevel.level === 'low' ? 'error' : stockLevel.level === 'high' ? 'warning' : 'success'}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {product.minStock}~{product.maxStock}개
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatCurrency(product.unitPrice)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {formatCurrency(product.totalValue)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.turnoverRate}회/년
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(product.status)}
                          color={getStatusColor(product.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(product.lastMovement).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InventoryReport;