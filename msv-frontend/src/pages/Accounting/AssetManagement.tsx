import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Divider,
  LinearProgress
} from '@mui/material';
import {
  Inventory as AssetIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Download as DownloadIcon, Print as PrintIcon, QrCode as QrCodeIcon,
  Business as BusinessIcon, Person as PersonIcon, AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon, Description as DescriptionIcon, Category as CategoryIcon,
  LocationOn as LocationIcon, Build as BuildIcon, CheckCircle as CheckIcon
} from '@mui/icons-material';

interface Asset {
  id: number;
  assetCode: string;
  assetName: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciationRate: number;
  location: string;
  assignedTo: string;
  department: string;
  status: 'active' | 'maintenance' | 'disposed' | 'lost';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  description: string;
}

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: 1,
      assetCode: 'AST-001',
      assetName: '데스크톱 컴퓨터',
      category: 'IT장비',
      brand: 'Dell',
      model: 'OptiPlex 7090',
      serialNumber: 'DL123456789',
      purchaseDate: '2023-01-15',
      purchasePrice: 1500000,
      currentValue: 1200000,
      depreciationRate: 20,
      location: '본사 3층 개발팀',
      assignedTo: '김개발',
      department: '개발팀',
      status: 'active',
      lastMaintenanceDate: '2023-12-01',
      nextMaintenanceDate: '2024-06-01',
      description: '개발용 데스크톱 컴퓨터'
    },
    {
      id: 2,
      assetCode: 'AST-002',
      assetName: '프린터',
      category: '사무용품',
      brand: 'HP',
      model: 'LaserJet Pro',
      serialNumber: 'HP987654321',
      purchaseDate: '2023-03-20',
      purchasePrice: 300000,
      currentValue: 240000,
      depreciationRate: 20,
      location: '본사 2층 사무실',
      assignedTo: '이사무',
      department: '인사팀',
      status: 'maintenance',
      lastMaintenanceDate: '2024-01-10',
      nextMaintenanceDate: '2024-07-10',
      description: '사무용 레이저 프린터'
    },
    {
      id: 3,
      assetCode: 'AST-003',
      assetName: '회의용 테이블',
      category: '가구',
      brand: 'IKEA',
      model: 'BEKANT',
      serialNumber: 'IK456789123',
      purchaseDate: '2022-11-10',
      purchasePrice: 200000,
      currentValue: 120000,
      depreciationRate: 20,
      location: '본사 4층 회의실',
      assignedTo: '-',
      department: '전체',
      status: 'active',
      description: '대형 회의용 테이블'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<Omit<Asset, 'id'>>({
    assetCode: '',
    assetName: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchasePrice: 0,
    currentValue: 0,
    depreciationRate: 20,
    location: '',
    assignedTo: '',
    department: '',
    status: 'active',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    description: ''
  });

  const handleAdd = () => {
    setSelectedAsset(null);
    setFormData({
      assetCode: `AST-${String(assets.length + 1).padStart(3, '0')}`,
      assetName: '',
      category: '',
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      purchasePrice: 0,
      currentValue: 0,
      depreciationRate: 20,
      location: '',
      assignedTo: '',
      department: '',
      status: 'active',
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      description: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData(asset);
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedAsset) {
      setAssets(assets.map(asset =>
        asset.id === selectedAsset.id ? { ...asset, ...formData } : asset
      ));
    } else {
      const newAsset: Asset = {
        id: assets.length > 0 ? Math.max(...assets.map(a => a.id)) + 1 : 1,
        ...formData
      };
      setAssets([...assets, newAsset]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setAssets(assets.filter(asset => asset.id !== id));
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: '사용중', color: 'success' as const },
      maintenance: { label: '점검중', color: 'warning' as const },
      disposed: { label: '폐기', color: 'default' as const },
      lost: { label: '분실', color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getCategoryColor = (category: string) => {
    const colorConfig = {
      'IT장비': 'primary',
      '사무용품': 'secondary',
      '가구': 'success',
      '기타': 'default'
    };
    return colorConfig[category as keyof typeof colorConfig] || 'default';
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalAssets = assets.length;
  const activeAssets = assets.filter(asset => asset.status === 'active').length;
  const totalValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const maintenanceDue = assets.filter(asset => 
    asset.nextMaintenanceDate && new Date(asset.nextMaintenanceDate) <= new Date()
  ).length;

  return (
    <Box sx={{ width: '100%', px: 2, py: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AssetIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          자산 관리
        </Typography>
      </Box>

      {/* 자산 요약 카드 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssetIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">총 자산</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {totalAssets}개
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">사용중</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {activeAssets}개
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">총 가치</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {totalValue.toLocaleString()}원
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">점검 예정</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {maintenanceDue}개
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="자산코드, 자산명, 브랜드, 모델, 시리얼번호, 담당자로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">전체 카테고리</MenuItem>
                <MenuItem value="IT장비">IT장비</MenuItem>
                <MenuItem value="사무용품">사무용품</MenuItem>
                <MenuItem value="가구">가구</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="active">사용중</MenuItem>
                <MenuItem value="maintenance">점검중</MenuItem>
                <MenuItem value="disposed">폐기</MenuItem>
                <MenuItem value="lost">분실</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" startIcon={<QrCodeIcon />} sx={{ mr: 1 }}>
              QR코드 생성
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              내보내기
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              자산 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 자산 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>자산 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>카테고리</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>구매 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>현재 가치</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>위치/담당자</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>점검일</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {asset.assetCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {asset.assetName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {asset.brand} {asset.model}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={asset.category}
                      color={getCategoryColor(asset.category) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {asset.purchaseDate}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {asset.purchasePrice.toLocaleString()}원
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        S/N: {asset.serialNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {asset.currentValue.toLocaleString()}원
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        감가상각률: {asset.depreciationRate}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <LocationIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {asset.location}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {asset.assignedTo} ({asset.department})
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {asset.lastMaintenanceDate && (
                        <Typography variant="body2" color="text.secondary">
                          마지막: {asset.lastMaintenanceDate}
                        </Typography>
                      )}
                      {asset.nextMaintenanceDate && (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'medium',
                            color: new Date(asset.nextMaintenanceDate) <= new Date() ? 'error.main' : 'text.primary'
                          }}
                        >
                          다음: {asset.nextMaintenanceDate}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(asset.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(asset)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <QrCodeIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(asset.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 자산 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedAsset ? '자산 수정' : '새 자산 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="자산 코드"
                value={formData.assetCode}
                onChange={(e) => setFormData({...formData, assetCode: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="자산명"
                value={formData.assetName}
                onChange={(e) => setFormData({...formData, assetName: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <MenuItem value="IT장비">IT장비</MenuItem>
                  <MenuItem value="사무용품">사무용품</MenuItem>
                  <MenuItem value="가구">가구</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="브랜드"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="모델"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="시리얼 번호"
                value={formData.serialNumber}
                onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="구매일"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="구매 가격 (원)"
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => {
                  const price = parseInt(e.target.value) || 0;
                  setFormData({...formData, purchasePrice: price, currentValue: price});
                }}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="현재 가치 (원)"
                type="number"
                value={formData.currentValue}
                onChange={(e) => setFormData({...formData, currentValue: parseInt(e.target.value) || 0})}
                required
              />
              <TextField
                fullWidth
                label="감가상각률 (%)"
                type="number"
                value={formData.depreciationRate}
                onChange={(e) => setFormData({...formData, depreciationRate: parseInt(e.target.value) || 0})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="위치"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="담당자"
                value={formData.assignedTo}
                onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="부서"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
              />
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                >
                  <MenuItem value="active">사용중</MenuItem>
                  <MenuItem value="maintenance">점검중</MenuItem>
                  <MenuItem value="disposed">폐기</MenuItem>
                  <MenuItem value="lost">분실</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="마지막 점검일"
                type="date"
                value={formData.lastMaintenanceDate}
                onChange={(e) => setFormData({...formData, lastMaintenanceDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label="다음 점검일"
                type="date"
                value={formData.nextMaintenanceDate}
                onChange={(e) => setFormData({...formData, nextMaintenanceDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetManagement;
