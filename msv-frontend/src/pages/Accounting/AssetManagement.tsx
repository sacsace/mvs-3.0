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
  Grid,
  Divider,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

interface Asset {
  id: number;
  asset_code: string;
  name: string;
  category: string;
  subcategory: string;
  purchase_date: string;
  purchase_price: number;
  current_value: number;
  depreciation_rate: number;
  accumulated_depreciation: number;
  location: string;
  status: string;
  maintenance_date?: string;
  next_maintenance?: string;
  warranty_expiry?: string;
  description: string;
}

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    asset_code: '',
    name: '',
    category: '',
    subcategory: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_price: 0,
    depreciation_rate: 10,
    location: '',
    status: 'active',
    maintenance_date: '',
    next_maintenance: '',
    warranty_expiry: '',
    description: ''
  });
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    location: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 데이터
  const sampleAssets: Asset[] = [
    {
      id: 1,
      asset_code: 'AST-001',
      name: '데스크톱 컴퓨터',
      category: 'IT 장비',
      subcategory: '컴퓨터',
      purchase_date: '2023-01-15',
      purchase_price: 1500000,
      current_value: 1200000,
      depreciation_rate: 20,
      accumulated_depreciation: 300000,
      location: '본사 3층 개발팀',
      status: 'active',
      maintenance_date: '2024-01-15',
      next_maintenance: '2025-01-15',
      warranty_expiry: '2026-01-15',
      description: '개발용 데스크톱 컴퓨터'
    },
    {
      id: 2,
      asset_code: 'AST-002',
      name: '프린터',
      category: '사무용품',
      subcategory: '프린터',
      purchase_date: '2023-03-20',
      purchase_price: 800000,
      current_value: 600000,
      depreciation_rate: 25,
      accumulated_depreciation: 200000,
      location: '본사 2층 사무실',
      status: 'active',
      maintenance_date: '2024-03-20',
      next_maintenance: '2025-03-20',
      warranty_expiry: '2025-03-20',
      description: '레이저 프린터'
    },
    {
      id: 3,
      asset_code: 'AST-003',
      name: '회의용 테이블',
      category: '가구',
      subcategory: '테이블',
      purchase_date: '2022-12-10',
      purchase_price: 500000,
      current_value: 350000,
      depreciation_rate: 15,
      accumulated_depreciation: 150000,
      location: '본사 4층 회의실',
      status: 'active',
      description: '8인용 회의 테이블'
    }
  ];

  useEffect(() => {
    loadAssets();
  }, [page, filters]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredAssets = sampleAssets;
      
      if (filters.category) {
        filteredAssets = filteredAssets.filter(asset => asset.category === filters.category);
      }
      
      if (filters.status) {
        filteredAssets = filteredAssets.filter(asset => asset.status === filters.status);
      }
      
      if (filters.location) {
        filteredAssets = filteredAssets.filter(asset => asset.location.includes(filters.location));
      }
      
      if (filters.search) {
        filteredAssets = filteredAssets.filter(asset => 
          asset.asset_code.toLowerCase().includes(filters.search.toLowerCase()) ||
          asset.name.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setAssets(filteredAssets);
      setTotalPages(Math.ceil(filteredAssets.length / 10));
    } catch (error) {
      showSnackbar('자산 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateAsset = () => {
    setSelectedAsset(null);
    setFormData({
      asset_code: '',
      name: '',
      category: '',
      subcategory: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 0,
      depreciation_rate: 10,
      location: '',
      status: 'active',
      maintenance_date: '',
      next_maintenance: '',
      warranty_expiry: '',
      description: ''
    });
    setOpenDialog(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      asset_code: asset.asset_code,
      name: asset.name,
      category: asset.category,
      subcategory: asset.subcategory,
      purchase_date: asset.purchase_date,
      purchase_price: asset.purchase_price,
      depreciation_rate: asset.depreciation_rate,
      location: asset.location,
      status: asset.status,
      maintenance_date: asset.maintenance_date || '',
      next_maintenance: asset.next_maintenance || '',
      warranty_expiry: asset.warranty_expiry || '',
      description: asset.description
    });
    setOpenDialog(true);
  };

  const handleSaveAsset = () => {
    showSnackbar('자산이 저장되었습니다.', 'success');
    setOpenDialog(false);
    loadAssets();
  };

  const handleDeleteAsset = (id: number) => {
    if (window.confirm('이 자산을 삭제하시겠습니까?')) {
      showSnackbar('자산이 삭제되었습니다.', 'success');
      loadAssets();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'disposed': return 'error';
      case 'lost': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '사용중';
      case 'maintenance': return '유지보수';
      case 'disposed': return '폐기';
      case 'lost': return '분실';
      default: return status;
    }
  };

  const calculateDepreciationProgress = (asset: Asset) => {
    return (asset.accumulated_depreciation / asset.purchase_price) * 100;
  };

  const getTotalAssetValue = () => {
    return assets.reduce((sum, asset) => sum + asset.current_value, 0);
  };

  const getTotalPurchaseValue = () => {
    return assets.reduce((sum, asset) => sum + asset.purchase_price, 0);
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
          <BusinessIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          자산 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          회사의 모든 유형 및 무형 자산을 효율적으로 관리하는 페이지입니다.
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    총 자산 수
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {assets.length}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    총 구매가
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {getTotalPurchaseValue().toLocaleString()}원
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: '2.5rem', color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    현재 가치
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {getTotalAssetValue().toLocaleString()}원
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: '2.5rem', color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    감가상각률
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {assets.length > 0 ? Math.round(assets.reduce((sum, asset) => sum + asset.depreciation_rate, 0) / assets.length) : 0}%
                  </Typography>
                </Box>
                <TrendingDownIcon sx={{ fontSize: '2.5rem', color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="자산 코드 또는 이름 검색"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={filters.category}
                  label="카테고리"
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="IT 장비">IT 장비</MenuItem>
                  <MenuItem value="사무용품">사무용품</MenuItem>
                  <MenuItem value="가구">가구</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>상태</InputLabel>
                <Select
                  value={filters.status}
                  label="상태"
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="active">사용중</MenuItem>
                  <MenuItem value="maintenance">유지보수</MenuItem>
                  <MenuItem value="disposed">폐기</MenuItem>
                  <MenuItem value="lost">분실</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="위치 검색"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFilters({ category: '', status: '', location: '', search: '' })}
                >
                  초기화
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateAsset}
                >
                  자산 등록
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 자산 목록 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>자산 코드</TableCell>
                  <TableCell>자산명</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>구매일</TableCell>
                  <TableCell>구매가</TableCell>
                  <TableCell>현재가치</TableCell>
                  <TableCell>감가상각</TableCell>
                  <TableCell>위치</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {asset.asset_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {asset.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {asset.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {asset.category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {asset.subcategory}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(asset.purchase_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {asset.purchase_price.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {asset.current_value.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ minWidth: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={calculateDepreciationProgress(asset)}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {asset.accumulated_depreciation.toLocaleString()}원
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {asset.location}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(asset.status)}
                        color={getStatusColor(asset.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="보기">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleEditAsset(asset)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="인쇄">
                          <IconButton size="small">
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDeleteAsset(asset.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* 자산 등록/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedAsset ? '자산 수정' : '새 자산 등록'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="자산 코드"
                value={formData.asset_code}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="자산명"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  label="카테고리"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="IT 장비">IT 장비</MenuItem>
                  <MenuItem value="사무용품">사무용품</MenuItem>
                  <MenuItem value="가구">가구</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="세부 분류"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="구매일"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="구매가"
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">원</InputAdornment>
                }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="감가상각률"
                type="number"
                value={formData.depreciation_rate}
                onChange={(e) => setFormData({ ...formData, depreciation_rate: Number(e.target.value) })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="위치"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="설명"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSaveAsset}>
            저장
          </Button>
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AssetManagement;