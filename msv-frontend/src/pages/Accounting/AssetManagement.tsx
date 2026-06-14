import React, { useEffect, useMemo, useState } from 'react';
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
  TextField,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Grid,
  Chip,
  CircularProgress,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  mvsFilterToolbarSx,
  mvsSearchFieldSx,
  mvsInnerCardSx,
  mvsMainSurfaceSx,
  mvsTableHeadHighlightSx,
  mvsTableZoneSx,
} from '../../theme/mvsLayout';
import { accountingService } from '../../services/api';
import { UTILS } from '../../constants';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

type AssetStatus = 'active' | 'maintenance' | 'disposed' | 'lost' | 'transferred';

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
  status: AssetStatus;
  maintenance_date?: string;
  next_maintenance?: string;
  warranty_expiry?: string;
  description?: string;
  vendor?: string;
  serial_number?: string;
  assigned_to?: string;
  department?: string;
  useful_life?: number;
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production';
}

const assetCategories = [
  { value: 'IT Equipment', subCategories: ['Computer', 'Server', 'Network', 'Printer', 'Monitor', 'Other IT'] },
  { value: 'Office Supplies', subCategories: ['Printer', 'Copier', 'Fax', 'Phone', 'Chair', 'Desk', 'Other Office'] },
  { value: 'Furniture', subCategories: ['Desk', 'Chair', 'Cabinet', 'Meeting Table', 'Sofa', 'Other Furniture'] },
  { value: 'Vehicle', subCategories: ['Passenger', 'Cargo', 'Other Vehicle'] },
  { value: 'Machinery', subCategories: ['Production', 'Manufacturing', 'Other Machinery'] },
  { value: 'Other', subCategories: ['Other Asset'] },
];

const emptyForm = {
  asset_code: '',
  name: '',
  category: '',
  subcategory: '',
  purchase_date: new Date().toISOString().split('T')[0],
  purchase_price: 0,
  depreciation_rate: 10,
  location: '',
  status: 'active' as AssetStatus,
  maintenance_date: '',
  next_maintenance: '',
  warranty_expiry: '',
  description: '',
  vendor: '',
  serial_number: '',
  assigned_to: '',
  department: '',
  useful_life: 5,
  depreciation_method: 'straight_line' as 'straight_line' | 'declining_balance' | 'units_of_production',
};

const formatCurrency = (value: number) => UTILS.formatCurrency(value);

const calculateDepreciationValues = (
  purchasePrice: number,
  depreciationRate: number,
  purchaseDate: string
) => {
  const basePrice = Number(purchasePrice || 0);
  const rate = Number(depreciationRate || 0);
  if (basePrice <= 0 || rate <= 0 || !purchaseDate) {
    return { currentValue: basePrice, accumulatedDepreciation: 0 };
  }

  const start = new Date(`${purchaseDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return { currentValue: basePrice, accumulatedDepreciation: 0 };
  }

  const now = new Date();
  const years = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const accumulated = Math.min(basePrice, basePrice * (rate / 100) * years);
  const current = Math.max(0, basePrice - accumulated);

  return {
    currentValue: Number(current.toFixed(2)),
    accumulatedDepreciation: Number(accumulated.toFixed(2))
  };
};

const AssetManagement: React.FC = () => {
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ search: '', category: 'all', status: 'all' });
  const [page, setPage] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const itemsPerPage = 10;

  const filteredAssets = useMemo(() => {
    let list = [...assets];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(asset =>
        asset.asset_code.toLowerCase().includes(q) ||
        asset.name.toLowerCase().includes(q) ||
        asset.serial_number?.toLowerCase().includes(q) ||
        asset.location.toLowerCase().includes(q)
      );
    }

    if (filters.category !== 'all') {
      list = list.filter(asset => asset.category === filters.category);
    }

    if (filters.status !== 'all') {
      list = list.filter(asset => asset.status === filters.status);
    }

    return list;
  }, [assets, filters]);

  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredAssets.slice(start, start + itemsPerPage);
  }, [filteredAssets, page]);

  const summary = useMemo(() => {
    const totalCount = filteredAssets.length;
    const activeCount = filteredAssets.filter((asset) => asset.status === 'active').length;
    const totalPurchase = filteredAssets.reduce((sum, asset) => sum + Number(asset.purchase_price || 0), 0);
    const totalCurrent = filteredAssets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    return { totalCount, activeCount, totalPurchase, totalCurrent };
  }, [filteredAssets]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const response = await accountingService.getAssets();
      if (response.success) {
        const list = Array.isArray(response.data) ? response.data : [];
        setAssets(list.map((asset: any) => ({
          id: asset.id,
          asset_code: asset.asset_code || '',
          name: asset.name || '',
          category: asset.category || '',
          subcategory: asset.subcategory || '',
          purchase_date: asset.purchase_date || '',
          purchase_price: Number(asset.purchase_price) || 0,
          current_value: Number(asset.current_value) || 0,
          depreciation_rate: Number(asset.depreciation_rate) || 0,
          accumulated_depreciation: Number(asset.accumulated_depreciation) || 0,
          location: asset.location || '',
          status: (asset.status || 'active') as AssetStatus,
          maintenance_date: asset.maintenance_date || '',
          next_maintenance: asset.next_maintenance || '',
          warranty_expiry: asset.warranty_expiry || '',
          description: asset.description || '',
          vendor: asset.vendor || '',
          serial_number: asset.serial_number || '',
          assigned_to: asset.assigned_to || '',
          department: asset.department || '',
          useful_life: Number(asset.useful_life) || 5,
          depreciation_method: (asset.depreciation_method || 'straight_line') as 'straight_line' | 'declining_balance' | 'units_of_production',
        })));
      } else {
        setAssets([]);
        setError(response.message || 'Failed to load assets.');
      }
    } catch (err) {
      console.error('asset load error:', err);
      setError('Failed to load assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleCreate = () => {
    setSelectedAsset(null);
    setFormData({ ...emptyForm });
    setOpenDialog(true);
  };

  const handleEdit = (asset: Asset) => {
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
      description: asset.description || '',
      vendor: asset.vendor || '',
      serial_number: asset.serial_number || '',
      assigned_to: asset.assigned_to || '',
      department: asset.department || '',
      useful_life: Number(asset.useful_life) || 5,
      depreciation_method: (asset.depreciation_method || 'straight_line') as 'straight_line' | 'declining_balance' | 'units_of_production',
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category || !formData.purchase_date) {
      setError('필수 항목(자산명, 분류, 취득일)을 입력해주세요.');
      return;
    }

    const resolvedAssetCode =
      formData.asset_code.trim() || `AST-${Date.now().toString().slice(-6)}`;
    const depreciation = calculateDepreciationValues(
      Number(formData.purchase_price) || 0,
      Number(formData.depreciation_rate) || 0,
      formData.purchase_date
    );

    const payload = {
      ...formData,
      asset_code: resolvedAssetCode,
      purchase_price: Number(formData.purchase_price) || 0,
      depreciation_rate: Number(formData.depreciation_rate) || 0,
      useful_life: Number(formData.useful_life) || 0,
      current_value: depreciation.currentValue,
      accumulated_depreciation: depreciation.accumulatedDepreciation,
    };

    try {
      if (selectedAsset) {
        const response = await accountingService.updateAsset(selectedAsset.id, payload);
        if (!response.success) {
          throw new Error(response.message || 'Update failed');
        }
        setSuccess('자산 정보를 수정했습니다.');
      } else {
        const response = await accountingService.createAsset(payload);
        if (!response.success) {
          throw new Error(response.message || 'Create failed');
        }
        setSuccess('자산을 등록했습니다.');
      }
      setOpenDialog(false);
      setSelectedAsset(null);
      await loadAssets();
    } catch (err) {
      console.error('asset save error:', err);
      setError('자산 저장에 실패했습니다.');
    }
  };

  const handleDelete = (id: number) => {
    showConfirm(
      '이 자산을 삭제하시겠습니까?',
      () => {
        void (async () => {
          try {
            const response = await accountingService.deleteAsset(id);
            if (!response.success) {
              throw new Error(response.message || 'Delete failed');
            }
            setSuccess('자산을 삭제했습니다.');
            await loadAssets();
          } catch (err) {
            console.error('asset delete error:', err);
            setError('자산 삭제에 실패했습니다.');
          }
        })();
      },
      { title: '삭제 확인', confirmColor: 'error', confirmText: '삭제', cancelText: '취소' }
    );
  };

  const getStatusLabel = (status: AssetStatus) => {
    switch (status) {
      case 'active':
        return '사용중';
      case 'maintenance':
        return '점검중';
      case 'disposed':
        return '폐기';
      case 'lost':
        return '분실';
      case 'transferred':
        return '이관';
      default:
        return status;
    }
  };

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'disposed':
        return 'error';
      case 'lost':
        return 'default';
      case 'transferred':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" variant="pageTitle" sx={{ fontWeight: 600, letterSpacing: '-0.022em', fontSize: { xs: '1.125rem', sm: '1.3125rem' }, mb: 0.75 }}>
            자산 관리
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, maxWidth: 560 }}>
            자산 등록, 감가상각, 상태 관리를 한 번에 처리합니다.
          </Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<AddIcon fontSize="small" />} onClick={handleCreate} sx={{ textTransform: 'none', borderRadius: '12px', px: 2 }}>
          자산 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card elevation={0} sx={{ mb: 3, ...mvsMainSurfaceSx, p: 0 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Grid container spacing={2} sx={{ mb: 0 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ ...mvsInnerCardSx, p: 0 }}>
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>자산 수</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 600 }}>{summary.totalCount}건</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ ...mvsInnerCardSx, p: 0 }}>
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>사용중 자산</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 600 }} color="success.main">{summary.activeCount}건</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ ...mvsInnerCardSx, p: 0 }}>
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>총 취득가</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 600 }}>{formatCurrency(summary.totalPurchase)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card elevation={0} sx={{ ...mvsInnerCardSx, p: 0 }}>
                <CardContent sx={{ py: 2, px: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>총 현재가</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 600 }} color="text.primary">{formatCurrency(summary.totalCurrent)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5, borderColor: '#C5CED9' }} />

          <Box sx={{ ...mvsFilterToolbarSx, ...mvsSearchFieldSx, mb: 0 }}>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="코드/자산명/시리얼/위치 검색"
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <Select
                  value={filters.category}
                  onChange={e => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value="all">전체 분류</MenuItem>
                  {assetCategories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>{cat.value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <Select
                  value={filters.status}
                  onChange={e => setFilters({ ...filters, status: e.target.value as AssetStatus | 'all' })}
                >
                  <MenuItem value="all">전체 상태</MenuItem>
                  <MenuItem value="active">사용중</MenuItem>
                  <MenuItem value="maintenance">점검중</MenuItem>
                  <MenuItem value="disposed">폐기</MenuItem>
                  <MenuItem value="lost">분실</MenuItem>
                  <MenuItem value="transferred">이관</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={0} sx={mvsTableZoneSx}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredAssets.length === 0 ? (
            <Box
              sx={{
                py: 5,
                px: 2,
                textAlign: 'center',
                borderRadius: '14px',
                border: '1px dashed #C5CED9',
                bgcolor: '#F8FAFC',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                자산 데이터가 없습니다.
              </Typography>
            </Box>
          ) : (
            <TableContainer
              sx={{
                borderRadius: '14px',
                border: '1px solid #C5CED9',
                overflow: 'hidden',
              }}
            >
              <Table>
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    <TableCell>코드</TableCell>
                    <TableCell>자산명</TableCell>
                    <TableCell>분류</TableCell>
                    <TableCell>취득일</TableCell>
                    <TableCell>취득가</TableCell>
                    <TableCell>현재가</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell align="center">관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAssets.map(asset => (
                    <TableRow key={asset.id} hover sx={{ '& .MuiTableCell-root': { borderColor: '#D8E0EA' } }}>
                      <TableCell>{asset.asset_code}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>{asset.purchase_date}</TableCell>
                      <TableCell>{formatCurrency(asset.purchase_price)}</TableCell>
                      <TableCell>{formatCurrency(asset.current_value)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={getStatusLabel(asset.status)} color={getStatusColor(asset.status) as any} />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="수정">
                            <IconButton size="small" onClick={() => handleEdit(asset)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton size="small" onClick={() => handleDelete(asset.id)} color="error">
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
          )}

          {filteredAssets.length > itemsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={Math.ceil(filteredAssets.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedAsset ? '자산 수정' : '자산 등록'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>코드</Typography>
                <TextField
                  fullWidth
                  value={formData.asset_code}
                  onChange={e => setFormData({ ...formData, asset_code: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>자산명 *</Typography>
                <TextField
                  fullWidth
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>분류 *</Typography>
                <FormControl fullWidth>
                  <Select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                  >
                    <MenuItem value="">선택</MenuItem>
                    {assetCategories.map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>{cat.value}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>하위 분류</Typography>
                <FormControl fullWidth>
                  <Select
                    value={formData.subcategory}
                    onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                    disabled={!formData.category}
                  >
                    <MenuItem value="">선택</MenuItem>
                    {assetCategories.find(cat => cat.value === formData.category)?.subCategories.map(sub => (
                      <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>취득일 *</Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={formData.purchase_date}
                  onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>취득가</Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.purchase_price}
                  onChange={e => setFormData({ ...formData, purchase_price: Number(e.target.value) || 0 })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>위치</Typography>
                <TextField
                  fullWidth
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>상태</Typography>
                <FormControl fullWidth>
                  <Select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as AssetStatus })}
                  >
                    <MenuItem value="active">사용중</MenuItem>
                    <MenuItem value="maintenance">점검중</MenuItem>
                    <MenuItem value="disposed">폐기</MenuItem>
                    <MenuItem value="lost">분실</MenuItem>
                    <MenuItem value="transferred">이관</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>담당자</Typography>
                <TextField
                  fullWidth
                  value={formData.assigned_to}
                  onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>부서</Typography>
                <TextField
                  fullWidth
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>내용연수(년)</Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.useful_life}
                  onChange={e => setFormData({ ...formData, useful_life: Number(e.target.value) || 0 })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>감가상각 방식</Typography>
                <FormControl fullWidth>
                  <Select
                    value={formData.depreciation_method}
                    onChange={e => setFormData({ ...formData, depreciation_method: e.target.value as 'straight_line' | 'declining_balance' | 'units_of_production' })}
                  >
                    <MenuItem value="straight_line">정액법</MenuItem>
                    <MenuItem value="declining_balance">정률법</MenuItem>
                    <MenuItem value="units_of_production">생산량비례법</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>설명</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSave}>저장</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">{success}</Alert>
      </Snackbar>

      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        confirmColor={dialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default AssetManagement;
