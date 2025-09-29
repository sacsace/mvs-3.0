import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  IconButton,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const InventoryStatus: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState([
    {
      id: 1,
      productCode: 'PROD-001',
      productName: '노트북 컴퓨터',
      category: '전자제품',
      currentStock: 15,
      minStock: 10,
      maxStock: 100,
      unitPrice: 1200000,
      totalValue: 18000000,
      status: 'normal',
      lastUpdated: '2024-01-15'
    },
    {
      id: 2,
      productCode: 'PROD-002',
      productName: '무선 마우스',
      category: '전자제품',
      currentStock: 5,
      minStock: 20,
      maxStock: 200,
      unitPrice: 25000,
      totalValue: 125000,
      status: 'low',
      lastUpdated: '2024-01-14'
    },
    {
      id: 3,
      productCode: 'PROD-003',
      productName: '키보드',
      category: '전자제품',
      currentStock: 0,
      minStock: 15,
      maxStock: 150,
      unitPrice: 80000,
      totalValue: 0,
      status: 'out',
      lastUpdated: '2024-01-13'
    },
    {
      id: 4,
      productCode: 'PROD-004',
      productName: '모니터',
      category: '전자제품',
      currentStock: 25,
      minStock: 5,
      maxStock: 50,
      unitPrice: 300000,
      totalValue: 7500000,
      status: 'normal',
      lastUpdated: '2024-01-15'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const getStatusInfo = (item: any) => {
    if (item.currentStock === 0) {
      return {
        label: '재고없음',
        color: 'error' as const,
        icon: <ErrorIcon />
      };
    } else if (item.currentStock <= item.minStock) {
      return {
        label: '재고부족',
        color: 'warning' as const,
        icon: <WarningIcon />
      };
    } else if (item.currentStock >= item.maxStock * 0.9) {
      return {
        label: '재고과다',
        color: 'info' as const,
        icon: <WarningIcon />
      };
    } else {
      return {
        label: '정상',
        color: 'success' as const,
        icon: <CheckCircleIcon />
      };
    }
  };

  const getStockLevel = (item: any) => {
    const percentage = (item.currentStock / item.maxStock) * 100;
    return Math.min(percentage, 100);
  };

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'low') return matchesSearch && item.currentStock <= item.minStock && item.currentStock > 0;
    if (filterStatus === 'out') return matchesSearch && item.currentStock === 0;
    if (filterStatus === 'normal') return matchesSearch && item.currentStock > item.minStock;
    
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getTotalValue = () => {
    return inventoryItems.reduce((sum, item) => sum + item.totalValue, 0);
  };

  const getLowStockCount = () => {
    return inventoryItems.filter(item => item.currentStock <= item.minStock && item.currentStock > 0).length;
  };

  const getOutOfStockCount = () => {
    return inventoryItems.filter(item => item.currentStock === 0).length;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <InventoryIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          재고 현황 확인
        </Typography>
      </Box>

      {/* 요약 카드 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="primary">
              총 재고 가치
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {formatCurrency(getTotalValue())}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="warning.main">
              재고 부족
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {getLowStockCount()}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="error.main">
              재고 없음
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {getOutOfStockCount()}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary">
              총 상품 수
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {inventoryItems.length}개
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 알림 */}
      {(getLowStockCount() > 0 || getOutOfStockCount() > 0) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          재고 부족 상품 {getLowStockCount()}개, 재고 없음 상품 {getOutOfStockCount()}개가 있습니다.
        </Alert>
      )}

      <Box>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">재고 현황</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="상품명 또는 코드 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Box>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>상품코드</TableCell>
                      <TableCell>상품명</TableCell>
                      <TableCell>카테고리</TableCell>
                      <TableCell>현재재고</TableCell>
                      <TableCell>최소재고</TableCell>
                      <TableCell>최대재고</TableCell>
                      <TableCell>재고율</TableCell>
                      <TableCell>단가</TableCell>
                      <TableCell>총가치</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const statusInfo = getStatusInfo(item);
                      const stockLevel = getStockLevel(item);
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {item.productCode}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: item.currentStock <= item.minStock ? 'error.main' : 'text.primary'
                              }}
                            >
                              {item.currentStock}개
                            </Typography>
                          </TableCell>
                          <TableCell>{item.minStock}개</TableCell>
                          <TableCell>{item.maxStock}개</TableCell>
                          <TableCell>
                            <Box sx={{ width: '100px' }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={stockLevel} 
                                color={item.currentStock <= item.minStock ? 'error' : 'primary'}
                                sx={{ mb: 0.5 }}
                              />
                              <Typography variant="caption">
                                {stockLevel.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(item.totalValue)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={statusInfo.icon}
                              label={statusInfo.label}
                              color={statusInfo.color}
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
        </Box>
      </Box>
    </Box>
  );
};

export default InventoryStatus;
