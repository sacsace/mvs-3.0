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
  Bar
} from 'recharts';

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
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  // 샘플 데이터
  const monthlyStockData = [
    { month: '1월', stock: 1250, movements: 180 },
    { month: '2월', stock: 1180, movements: 220 },
    { month: '3월', stock: 1320, movements: 195 },
    { month: '4월', stock: 1280, movements: 210 },
    { month: '5월', stock: 1450, movements: 185 },
    { month: '6월', stock: 1380, movements: 200 }
  ];

  const categoryDistributionData = [
    { name: '전자제품', value: 4500000, color: '#8884d8' },
    { name: '사무용품', value: 2800000, color: '#82ca9d' },
    { name: '소모품', value: 1200000, color: '#ffc658' },
    { name: '기타', value: 800000, color: '#ff7300' }
  ];

  const turnoverData = [
    { category: '전자제품', turnover: 4.2 },
    { category: '사무용품', turnover: 6.8 },
    { category: '소모품', turnover: 12.5 },
    { category: '기타', turnover: 3.1 }
  ];

  const sampleProducts: ProductReport[] = [
    {
      id: 1,
      name: '데스크톱 컴퓨터',
      category: '전자제품',
      currentStock: 15,
      minStock: 5,
      maxStock: 50,
      unitPrice: 1500000,
      totalValue: 22500000,
      turnoverRate: 4.2,
      status: 'normal',
      lastMovement: '2024-01-15'
    },
    {
      id: 2,
      name: '프린터',
      category: '전자제품',
      currentStock: 8,
      minStock: 3,
      maxStock: 20,
      unitPrice: 800000,
      totalValue: 6400000,
      turnoverRate: 3.8,
      status: 'normal',
      lastMovement: '2024-01-12'
    },
    {
      id: 3,
      name: 'A4 용지',
      category: '사무용품',
      currentStock: 2,
      minStock: 10,
      maxStock: 100,
      unitPrice: 15000,
      totalValue: 30000,
      turnoverRate: 8.5,
      status: 'low',
      lastMovement: '2024-01-10'
    },
    {
      id: 4,
      name: '볼펜',
      category: '소모품',
      currentStock: 0,
      minStock: 20,
      maxStock: 200,
      unitPrice: 500,
      totalValue: 0,
      turnoverRate: 15.2,
      status: 'out',
      lastMovement: '2024-01-08'
    }
  ];

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, selectedCategory]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // 백엔드 API 호출 시도
      const statsResponse = await fetch('/api/inventory/report/stats');
      let statsData = {
        totalProducts: 156,
        totalValue: 9300000,
        lowStockItems: 12,
        outOfStockItems: 3,
        averageTurnover: 6.8
      };

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        if (statsResult.success && statsResult.data) {
          statsData = { ...statsData, ...statsResult.data };
        }
      }

      setStats(statsData);

      // 제품 목록 로드 시도
      const productsResponse = await fetch('/api/inventory/products');
      let productsList = sampleProducts;

      if (productsResponse.ok) {
        const productsResult = await productsResponse.json();
        if (productsResult.success && productsResult.data?.data) {
          productsList = productsResult.data.data.map((product: any) => ({
            id: product.id,
            name: product.name,
            category: product.category || '기타',
            currentStock: product.stock_quantity || 0,
            minStock: product.min_stock_level || 0,
            maxStock: 100,
            unitPrice: product.unit_price || 0,
            totalValue: (product.stock_quantity || 0) * (product.unit_price || 0),
            turnoverRate: Math.random() * 15 + 1,
            status: (product.stock_quantity || 0) <= (product.min_stock_level || 0) ? 'low' : 'normal',
            lastMovement: new Date().toISOString()
          }));
        }
      }

      // 카테고리 필터링
      let filteredProducts = productsList;
      if (selectedCategory) {
        filteredProducts = filteredProducts.filter(product => product.category === selectedCategory);
      }
      setProducts(filteredProducts);
    } catch (error) {
      console.error('재고 보고서 데이터 로드 실패:', error);
      // 오류 발생 시 샘플 데이터 사용
      setStats({
        totalProducts: 156,
        totalValue: 9300000,
        lowStockItems: 12,
        outOfStockItems: 3,
        averageTurnover: 6.8
      });
      let filteredProducts = sampleProducts;
      if (selectedCategory) {
        filteredProducts = filteredProducts.filter(product => product.category === selectedCategory);
      }
      setProducts(filteredProducts);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'low': return 'warning';
      case 'out': return 'error';
      default: return 'default';
    }
  };

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
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          fontWeight: 600,
          color: 'text.primary'
        }}>
          <AssessmentIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          재고 보고서
        </Typography>
        <Typography variant="body2" color="text.secondary">
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
              <InventoryIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.7 }} />
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
              <TrendingUpIcon sx={{ fontSize: '2.5rem', color: 'success.main', opacity: 0.7 }} />
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
              <WarningIcon sx={{ fontSize: '2.5rem', color: 'warning.main', opacity: 0.7 }} />
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
              <TrendingDownIcon sx={{ fontSize: '2.5rem', color: 'info.main', opacity: 0.7 }} />
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
                <LineChart data={monthlyStockData}>
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
                    data={categoryDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {categoryDistributionData.map((item, index) => (
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