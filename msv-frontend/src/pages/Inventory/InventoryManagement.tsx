import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Inventory as InventoryIcon,
  AddBox as AddBoxIcon,
  Remove as RemoveIcon,
  Tune as TuneIcon,
  History as HistoryIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

interface InventoryItem {
  id: number;
  productCode: string;
  productName: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  location: string;
  status: 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
}

const InventoryManagement: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [dialogType, setDialogType] = useState<'add' | 'edit' | 'view'>('add');

  // 샘플 데이터
  useEffect(() => {
    const sampleData: InventoryItem[] = [
      {
        id: 1,
        productCode: 'PROD-001',
        productName: '노트북 컴퓨터',
        category: '전자제품',
        currentStock: 15,
        minStock: 5,
        maxStock: 50,
        unitCost: 800000,
        sellingPrice: 1200000,
        supplier: '삼성전자',
        location: 'A-1-01',
        status: 'active'
      },
      {
        id: 2,
        productCode: 'PROD-002',
        productName: '무선 마우스',
        category: '전자제품',
        currentStock: 2,
        minStock: 10,
        maxStock: 100,
        unitCost: 25000,
        sellingPrice: 45000,
        supplier: '로지텍',
        location: 'A-1-02',
        status: 'low_stock'
      },
      {
        id: 3,
        productCode: 'PROD-003',
        productName: '사무용 의자',
        category: '가구',
        currentStock: 0,
        minStock: 3,
        maxStock: 20,
        unitCost: 150000,
        sellingPrice: 250000,
        supplier: '이케아',
        location: 'B-2-01',
        status: 'out_of_stock'
      },
      {
        id: 4,
        productCode: 'PROD-004',
        productName: 'A4 용지',
        category: '문구',
        currentStock: 50,
        minStock: 20,
        maxStock: 200,
        unitCost: 5000,
        sellingPrice: 8000,
        supplier: '한국제지',
        location: 'C-1-01',
        status: 'active'
      }
    ];
    setInventoryItems(sampleData);
    setFilteredItems(sampleData);
  }, []);

  // 필터링 로직
  useEffect(() => {
    let filtered = inventoryItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  }, [inventoryItems, searchTerm, categoryFilter, statusFilter]);

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: '정상', color: 'success' as const },
      low_stock: { label: '재고 부족', color: 'warning' as const },
      out_of_stock: { label: '품절', color: 'error' as const },
      inactive: { label: '비활성', color: 'default' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return 'out_of_stock';
    if (current <= min) return 'low_stock';
    return 'active';
  };

  const handleOpenDialog = (type: 'add' | 'edit' | 'view', item?: InventoryItem) => {
    setDialogType(type);
    setSelectedItem(item || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedItem(null);
  };

  const categories = ['all', ...Array.from(new Set(inventoryItems.map(item => item.category)))];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            재고 관리
          </Typography>
          <Typography variant="body1" color="text.secondary">
            재고 현황 조회 및 입출고 관리
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
          sx={{ borderRadius: 2 }}
        >
          새 상품 등록
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InventoryIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  총 상품 수
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {inventoryItems.length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AddBoxIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  정상 재고
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {inventoryItems.filter(item => item.status === 'active').length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <RemoveIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  재고 부족
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {inventoryItems.filter(item => item.status === 'low_stock').length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  품절 상품
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {inventoryItems.filter(item => item.status === 'out_of_stock').length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '4fr 3fr 3fr 2fr' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="상품명, 코드, 공급업체 검색"
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
              <InputLabel>카테고리</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="카테고리"
              >
                <MenuItem value="all">전체</MenuItem>
                {categories.slice(1).map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="상태"
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="active">정상</MenuItem>
                <MenuItem value="low_stock">재고 부족</MenuItem>
                <MenuItem value="out_of_stock">품절</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              fullWidth
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 재고 목록 테이블 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            재고 목록 ({filteredItems.length}개)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>상품 코드</TableCell>
                  <TableCell>상품명</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell align="right">현재 재고</TableCell>
                  <TableCell align="right">최소 재고</TableCell>
                  <TableCell align="right">단가</TableCell>
                  <TableCell align="right">판매가</TableCell>
                  <TableCell>공급업체</TableCell>
                  <TableCell>위치</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell align="center">액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.productCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.productName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={item.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.currentStock}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {item.minStock}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {item.unitCost.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.sellingPrice.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.supplier}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.location}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(getStockStatus(item.currentStock, item.minStock))}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="상세보기">
                          <IconButton size="small" onClick={() => handleOpenDialog('view', item)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleOpenDialog('edit', item)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" color="error">
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
        </CardContent>
      </Card>

      {/* 플로팅 액션 버튼 */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Tooltip title="입고 처리">
          <Fab color="success" size="medium">
            <AddBoxIcon />
          </Fab>
        </Tooltip>
        <Tooltip title="출고 처리">
          <Fab color="warning" size="medium">
            <RemoveIcon />
          </Fab>
        </Tooltip>
        <Tooltip title="재고 조정">
          <Fab color="info" size="medium">
            <TuneIcon />
          </Fab>
        </Tooltip>
      </Box>

      {/* 상품 상세/편집 다이얼로그 */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'add' ? '새 상품 등록' : 
           dialogType === 'edit' ? '상품 정보 수정' : '상품 상세 정보'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {selectedItem ? `상품: ${selectedItem.productName}` : '새 상품을 등록하세요.'}
          </Typography>
          {/* 여기에 상품 정보 폼 추가 */}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>닫기</Button>
          {dialogType !== 'view' && (
            <Button variant="contained" onClick={handleCloseDialog}>
              {dialogType === 'add' ? '등록' : '수정'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryManagement;
