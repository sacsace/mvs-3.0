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
  InputAdornment
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
import { useStore } from '../../store';

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

const InventoryManagement: React.FC = () => {
  const { user } = useStore();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
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

  // 샘플 데이터
  const sampleData: InventoryItem[] = [
    {
      id: 1,
      name: '노트북 컴퓨터',
      sku: 'LAPTOP-001',
      category: '전자제품',
      currentStock: 25,
      minStock: 10,
      maxStock: 100,
      unitPrice: 1200000,
      totalValue: 30000000,
      status: 'in_stock',
      lastUpdated: '2024-01-15',
      supplier: '삼성전자',
      location: 'A-01-01'
    },
    {
      id: 2,
      name: '무선 마우스',
      sku: 'MOUSE-002',
      category: '전자제품',
      currentStock: 5,
      minStock: 20,
      maxStock: 200,
      unitPrice: 25000,
      totalValue: 125000,
      status: 'low_stock',
      lastUpdated: '2024-01-14',
      supplier: '로지텍',
      location: 'A-01-02'
    },
    {
      id: 3,
      name: '키보드',
      sku: 'KEYBOARD-003',
      category: '전자제품',
      currentStock: 0,
      minStock: 15,
      maxStock: 150,
      unitPrice: 80000,
      totalValue: 0,
      status: 'out_of_stock',
      lastUpdated: '2024-01-10',
      supplier: '체리',
      location: 'A-01-03'
    },
    {
      id: 4,
      name: '모니터',
      sku: 'MONITOR-004',
      category: '전자제품',
      currentStock: 12,
      minStock: 5,
      maxStock: 50,
      unitPrice: 300000,
      totalValue: 3600000,
      status: 'in_stock',
      lastUpdated: '2024-01-16',
      supplier: 'LG전자',
      location: 'A-02-01'
    },
    {
      id: 5,
      name: '책상',
      sku: 'DESK-005',
      category: '가구',
      currentStock: 8,
      minStock: 3,
      maxStock: 30,
      unitPrice: 150000,
      totalValue: 1200000,
      status: 'in_stock',
      lastUpdated: '2024-01-12',
      supplier: '이케아',
      location: 'B-01-01'
    }
  ];

  useEffect(() => {
    loadInventoryData();
  }, []);

  useEffect(() => {
    filterItems();
  }, [inventoryItems, searchTerm, categoryFilter, statusFilter]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      // 실제 API 호출 대신 샘플 데이터 사용
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInventoryItems(sampleData);
    } catch (error) {
      console.error('재고 데이터 로드 오류:', error);
      setError('재고 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = inventoryItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

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
        setInventoryItems(prev => prev.filter(item => item.id !== id));
        setSuccess('재고 항목이 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    try {
      if (selectedItem) {
        // 수정
        setInventoryItems(prev =>
          prev.map(item => item.id === selectedItem.id ? { ...item, ...itemData } : item)
        );
        setSuccess('재고 항목이 성공적으로 수정되었습니다.');
      } else {
        // 추가
        const newItem: InventoryItem = {
          id: Math.max(...inventoryItems.map(i => i.id)) + 1,
          ...itemData,
          totalValue: (itemData.currentStock || 0) * (itemData.unitPrice || 0),
          lastUpdated: new Date().toISOString().split('T')[0]
        } as InventoryItem;
        setInventoryItems(prev => [...prev, newItem]);
        setSuccess('재고 항목이 성공적으로 추가되었습니다.');
      }
      setOpenDialog(false);
    } catch (error) {
      console.error('저장 오류:', error);
      setError('저장 중 오류가 발생했습니다.');
    }
  };

  const categories = Array.from(new Set(inventoryItems.map(item => item.category)));
  const totalValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = inventoryItems.filter(item => item.status === 'low_stock').length;
  const outOfStockItems = inventoryItems.filter(item => item.status === 'out_of_stock').length;

  const paginatedItems = filteredItems.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryIcon />
          재고 관리
        </Typography>
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
                {inventoryItems.length}
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
                ₩{totalValue.toLocaleString()}
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
                {lowStockItems}
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
                {outOfStockItems}
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
                <TableCell>상태</TableCell>
                <TableCell>제품명</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell>현재 재고</TableCell>
                <TableCell>단가</TableCell>
                <TableCell>총 가치</TableCell>
                <TableCell>공급업체</TableCell>
                <TableCell>위치</TableCell>
                <TableCell>마지막 업데이트</TableCell>
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
                  <TableCell>₩{item.unitPrice.toLocaleString()}</TableCell>
                  <TableCell>₩{item.totalValue.toLocaleString()}</TableCell>
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
            count={Math.ceil(filteredItems.length / itemsPerPage)}
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
          <TextField
            fullWidth
            label="제품명"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="카테고리"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="공급업체"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="현재 재고"
            type="number"
            value={formData.currentStock}
            onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="최소 재고"
            type="number"
            value={formData.minStock}
            onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="최대 재고"
            type="number"
            value={formData.maxStock}
            onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="단가"
            type="number"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: parseInt(e.target.value) || 0 })}
            required
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            label="위치"
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