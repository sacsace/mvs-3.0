import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  TableSortLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { inventoryService } from '../../services/api';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
  supplier: string;
  location: string;
}

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const InventoryManagement: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [orderBy, setOrderBy] = useState<keyof InventoryItem | ''>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadInventoryData();
  }, [page, searchTerm, categoryFilter]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [productsResponse, reportResponse] = await Promise.all([
        inventoryService.getProducts({
          page,
          limit: itemsPerPage,
          search: searchTerm,
          category: categoryFilter
        }),
        inventoryService.getInventoryReport()
      ]);
      
      if (productsResponse.success && productsResponse.data) {
        // 백엔드 데이터를 프론트엔드 형식으로 변환
        const transformedData = productsResponse.data.map((product: any) => {
          // 재고 상태 계산
          const currentStock = product.stock_quantity || product.current_stock || 0;
          const minStock = product.min_stock_level || product.min_stock || 0;
          const maxStock = product.max_stock_level || product.max_stock || 0;
          
          let status = 'in_stock';
          if (currentStock === 0) {
            status = 'out_of_stock';
          } else if (minStock && currentStock <= minStock) {
            status = 'low_stock';
          }
          
          return {
            id: product.id,
            name: product.name,
            sku: product.product_code || product.sku || '',
            category: product.category || '',
            currentStock: currentStock,
            minStock: minStock,
            maxStock: maxStock,
            unitPrice: parseFloat(product.unit_price || 0),
            totalValue: currentStock * parseFloat(product.unit_price || 0),
            status: status,
            lastUpdated: product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            supplier: product.supplier || '',
            location: product.location || ''
          };
        });
        setInventoryItems(transformedData);
        
        // 페이지네이션 정보 업데이트
        if (productsResponse.pagination) {
          setTotalPages(productsResponse.pagination.totalPages || 1);
          setTotalItems(productsResponse.pagination.total || 0);
        }
      } else {
        setInventoryItems([]);
        setTotalPages(1);
        setTotalItems(0);
      }

      if (reportResponse?.success && reportResponse?.data?.stats) {
        setInventoryStats({
          totalProducts: Number(reportResponse.data.stats.totalProducts || 0),
          totalValue: Number(reportResponse.data.stats.totalValue || 0),
          lowStockItems: Number(reportResponse.data.stats.lowStockItems || 0),
          outOfStockItems: Number(reportResponse.data.stats.outOfStockItems || 0)
        });
      } else {
        setInventoryStats({
          totalProducts: 0,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0
        });
      }

      const categoryNames = (reportResponse?.data?.categoryDistribution || [])
        .map((category: any) => String(category?.name || '').trim())
        .filter((name: string) => name.length > 0);
      setCategories(Array.from(new Set(categoryNames)));
    } catch (error: any) {
      console.error('재고 데이터 로드 오류:', error);
      setError(error.response?.data?.message || '재고 데이터를 불러오는데 실패했습니다.');
      setInventoryItems([]);
      setTotalPages(1);
      setTotalItems(0);
      setInventoryStats({
        totalProducts: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterItems();
  }, [inventoryItems, statusFilter]);

  const filterItems = () => {
    // 검색과 카테고리는 API에서 처리되므로, 상태 필터만 클라이언트에서 처리
    let filtered = inventoryItems;

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Chip label="재고 있음" color="success" size="small" />;
      case 'low_stock':
        return <Chip label="재고 부족" color="warning" size="small" />;
      case 'out_of_stock':
        return <Chip label="품절" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <TrendingUpIcon color="success" />;
      case 'low_stock':
        return <WarningIcon color="warning" />;
      case 'out_of_stock':
        return <TrendingDownIcon color="error" />;
      default:
        return <InventoryIcon />;
    }
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setOpenDialog(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setOpenDialog(true);
  };

  const handleDeleteItem = async (id: number) => {
    if (window.confirm('정말로 이 항목을 삭제하시겠습니까?')) {
      try {
        await inventoryService.deleteProduct(id);
        setSuccess('재고 항목이 성공적으로 삭제되었습니다.');
        loadInventoryData();
      } catch (error: any) {
        console.error('삭제 오류:', error);
        setError(error.response?.data?.message || '삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    try {
      const productData = {
        name: itemData.name,
        product_code: itemData.sku,
        category: itemData.category,
        stock_quantity: itemData.currentStock,
        min_stock_level: itemData.minStock,
        max_stock_level: itemData.maxStock,
        unit_price: itemData.unitPrice,
        supplier: itemData.supplier,
        location: itemData.location
      };

      if (selectedItem) {
        // 수정
        const response = await inventoryService.updateProduct(selectedItem.id, productData);
        if (response.success) {
          setSuccess('재고 항목이 성공적으로 수정되었습니다.');
          setOpenDialog(false);
          loadInventoryData();
        }
      } else {
        // 추가
        const response = await inventoryService.createProduct(productData);
        if (response.success) {
          setSuccess('재고 항목이 성공적으로 추가되었습니다.');
          setOpenDialog(false);
          loadInventoryData();
        }
      }
    } catch (error: any) {
      console.error('저장 오류:', error);
      setError(error.response?.data?.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 정렬 처리
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!orderBy) return 0;
    
    let aValue: any = a[orderBy as keyof InventoryItem];
    let bValue: any = b[orderBy as keyof InventoryItem];
    
    // 숫자 타입 처리
    if (orderBy === 'currentStock' || orderBy === 'unitPrice' || orderBy === 'totalValue' || orderBy === 'minStock' || orderBy === 'maxStock') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    
    // 문자열 타입 처리
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue || '').toLowerCase();
    }
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  // 상태 필터가 적용된 항목 사용 (API에서 이미 페이지네이션 처리됨)
  const paginatedItems = sortedItems;

  const handleSort = (property: keyof InventoryItem | '') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <InventoryIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{
            fontSize: '16px !important',
            fontWeight: 600,
            color: 'red',
            lineHeight: 1.5
          }}>
            기본 재고 등록
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          sx={{ borderRadius: 2 }}
        >
          재고 추가
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                총 재고 항목
              </Typography>
              <Typography variant="h4">
                {inventoryStats.totalProducts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                총 재고 가치
              </Typography>
              <Typography variant="h4">
                Rs. {inventoryStats.totalValue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                재고 부족
              </Typography>
              <Typography variant="h4" color="warning.main">
                {inventoryStats.lowStockItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                품절
              </Typography>
              <Typography variant="h4" color="error.main">
                {inventoryStats.outOfStockItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                placeholder="제품명, SKU, 카테고리 검색"
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
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="in_stock">재고 있음</MenuItem>
                  <MenuItem value="low_stock">재고 부족</MenuItem>
                  <MenuItem value="out_of_stock">품절</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setStatusFilter('');
                }}
              >
                초기화
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 재고 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    상태
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    제품명
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'sku'}
                    direction={orderBy === 'sku' ? order : 'asc'}
                    onClick={() => handleSort('sku')}
                  >
                    SKU
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'category'}
                    direction={orderBy === 'category' ? order : 'asc'}
                    onClick={() => handleSort('category')}
                  >
                    카테고리
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'currentStock'}
                    direction={orderBy === 'currentStock' ? order : 'asc'}
                    onClick={() => handleSort('currentStock')}
                  >
                    현재 재고
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'unitPrice'}
                    direction={orderBy === 'unitPrice' ? order : 'asc'}
                    onClick={() => handleSort('unitPrice')}
                  >
                    단가
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'totalValue'}
                    direction={orderBy === 'totalValue' ? order : 'asc'}
                    onClick={() => handleSort('totalValue')}
                  >
                    총 가치
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'supplier'}
                    direction={orderBy === 'supplier' ? order : 'asc'}
                    onClick={() => handleSort('supplier')}
                  >
                    공급업체
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'location'}
                    direction={orderBy === 'location' ? order : 'asc'}
                    onClick={() => handleSort('location')}
                  >
                    위치
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'lastUpdated'}
                    direction={orderBy === 'lastUpdated' ? order : 'asc'}
                    onClick={() => handleSort('lastUpdated')}
                  >
                    마지막 업데이트
                  </TableSortLabel>
                </TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(item.status)}
                      {getStatusChip(item.status)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {item.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.sku}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={item.currentStock <= item.minStock ? 'error.main' : 'text.primary'}
                      fontWeight={item.currentStock <= item.minStock ? 'bold' : 'normal'}
                    >
                      {item.currentStock} / {item.maxStock}
                    </Typography>
                  </TableCell>
                  <TableCell>Rs. {item.unitPrice.toLocaleString()}</TableCell>
                  <TableCell>Rs. {item.totalValue.toLocaleString()}</TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>{item.lastUpdated}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleEditItem(item)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditItem(item)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
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
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 재고 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedItem ? '재고 수정' : '재고 추가'}
        </DialogTitle>
        <DialogContent>
          <InventoryForm
            item={selectedItem}
            onSave={handleSaveItem}
            onCancel={() => setOpenDialog(false)}
          />
        </DialogContent>
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

// 재고 폼 컴포넌트
interface InventoryFormProps {
  item: InventoryItem | null;
  onSave: (data: Partial<InventoryItem>) => void;
  onCancel: () => void;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category || '',
    currentStock: item?.currentStock || 0,
    minStock: item?.minStock || 0,
    maxStock: item?.maxStock || 0,
    unitPrice: item?.unitPrice || 0,
    supplier: item?.supplier || '',
    location: item?.location || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            제품명 *
          </Typography>
          <TextField
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            SKU *
          </Typography>
          <TextField
            fullWidth
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            카테고리 *
          </Typography>
          <TextField
            fullWidth
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            공급업체 *
          </Typography>
          <TextField
            fullWidth
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            현재 재고 *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.currentStock}
            onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            최소 재고 *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.minStock}
            onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            최대 재고 *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.maxStock}
            onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            단가 *
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2" sx={{ mb: 0.3, color: 'text.secondary', fontSize: '0.875rem' }}>
            위치 *
          </Typography>
          <TextField
            fullWidth
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />
        </Grid>
      </Grid>
      <DialogActions sx={{ mt: 3 }}>
        <Button onClick={onCancel}>취소</Button>
        <Button type="submit" variant="contained">
          {item ? '수정' : '추가'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default InventoryManagement;