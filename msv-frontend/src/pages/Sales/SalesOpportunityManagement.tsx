import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Grid,
  Avatar,
  Tooltip,
  Alert,
  Snackbar,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { api } from '../../services/api';

interface SalesOpportunity {
  id: number;
  customer_id: number;
  customer_name?: string;
  title: string;
  description?: string;
  value: number;
  probability: number;
  stage: string;
  expected_close_date: string;
  assigned_to?: number;
  assigned_user_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: number;
  name: string;
  business_number?: string;
  ceo_name?: string;
  phone?: string;
  email?: string;
  industry?: string;
}

const SalesOpportunityManagement: React.FC = () => {
  const [opportunities, setOpportunities] = useState<SalesOpportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 폼 데이터
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    description: '',
    value: '',
    probability: 50,
    stage: 'prospecting',
    expected_close_date: '',
    assigned_to: '',
    status: 'active'
  });

  useEffect(() => {
    loadOpportunities();
    loadCustomers();
  }, []);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sales-opportunities');
      setOpportunities(response.data.data || []);
    } catch (error) {
      console.error('영업 기회 로드 오류:', error);
      showSnackbar('영업 기회 목록을 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('고객 목록 로드 오류:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStageFilter = (event: any) => {
    setStageFilter(event.target.value);
  };

  const handleStatusFilter = (event: any) => {
    setStatusFilter(event.target.value);
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || opportunity.stage === stageFilter;
    const matchesStatus = statusFilter === 'all' || opportunity.status === statusFilter;
    
    return matchesSearch && matchesStage && matchesStatus;
  });

  const handleCreateOpportunity = () => {
    setFormData({
      customer_id: '',
      title: '',
      description: '',
      value: '',
      probability: 50,
      stage: 'prospecting',
      expected_close_date: '',
      assigned_to: '',
      status: 'active'
    });
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEditOpportunity = (opportunity: SalesOpportunity) => {
    setFormData({
      customer_id: opportunity.customer_id.toString(),
      title: opportunity.title,
      description: opportunity.description || '',
      value: opportunity.value.toString(),
      probability: opportunity.probability,
      stage: opportunity.stage,
      expected_close_date: opportunity.expected_close_date,
      assigned_to: opportunity.assigned_to?.toString() || '',
      status: opportunity.status
    });
    setSelectedOpportunity(opportunity);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleViewOpportunity = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleSaveOpportunity = async () => {
    try {
      const data = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        value: parseFloat(formData.value),
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null
      };

      if (dialogMode === 'create') {
        await api.post('/sales-opportunities', data);
        showSnackbar('영업 기회가 성공적으로 등록되었습니다.', 'success');
      } else if (dialogMode === 'edit' && selectedOpportunity) {
        await api.put(`/sales-opportunities/${selectedOpportunity.id}`, data);
        showSnackbar('영업 기회가 성공적으로 수정되었습니다.', 'success');
      }
      
      setDialogOpen(false);
      loadOpportunities();
    } catch (error) {
      console.error('영업 기회 저장 오류:', error);
      showSnackbar('영업 기회 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteOpportunity = async (opportunity: SalesOpportunity) => {
    if (window.confirm(`'${opportunity.title}' 영업 기회를 삭제하시겠습니까?`)) {
      try {
        await api.delete(`/sales-opportunities/${opportunity.id}`);
        showSnackbar('영업 기회가 성공적으로 삭제되었습니다.', 'success');
        loadOpportunities();
      } catch (error) {
        console.error('영업 기회 삭제 오류:', error);
        showSnackbar('영업 기회 삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'prospecting': return 'default';
      case 'qualification': return 'info';
      case 'proposal': return 'warning';
      case 'negotiation': return 'primary';
      case 'closed_won': return 'success';
      case 'closed_lost': return 'error';
      default: return 'default';
    }
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'prospecting': return '영업 기회 발굴';
      case 'qualification': return '자격 검증';
      case 'proposal': return '제안서 제출';
      case 'negotiation': return '협상';
      case 'closed_won': return '성공';
      case 'closed_lost': return '실패';
      default: return stage;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'on_hold': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '진행중';
      case 'inactive': return '비활성';
      case 'on_hold': return '보류';
      default: return status;
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'success';
    if (probability >= 60) return 'info';
    if (probability >= 40) return 'warning';
    return 'error';
  };

  const getTotalValue = () => {
    return opportunities
      .filter(opp => opp.status === 'active')
      .reduce((sum, opp) => sum + opp.value, 0);
  };

  const getWonValue = () => {
    return opportunities
      .filter(opp => opp.stage === 'closed_won')
      .reduce((sum, opp) => sum + opp.value, 0);
  };

  const getActiveOpportunities = () => {
    return opportunities.filter(opp => opp.status === 'active').length;
  };

  const getWonOpportunities = () => {
    return opportunities.filter(opp => opp.stage === 'closed_won').length;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrendingUpIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            영업 기회 관리
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadOpportunities}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateOpportunity}
          >
            영업 기회 등록
          </Button>
        </Box>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    총 영업 기회
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {opportunities.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <TrendingUpIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    진행중 기회
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getActiveOpportunities()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <InfoIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    성공한 기회
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getWonOpportunities()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    총 영업 가치
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getTotalValue().toLocaleString()}원
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="제목, 고객명, 설명으로 검색..."
                value={searchTerm}
                onChange={handleSearch}
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
                <InputLabel>영업 단계</InputLabel>
                <Select
                  value={stageFilter}
                  onChange={handleStageFilter}
                  label="영업 단계"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="prospecting">영업 기회 발굴</MenuItem>
                  <MenuItem value="qualification">자격 검증</MenuItem>
                  <MenuItem value="proposal">제안서 제출</MenuItem>
                  <MenuItem value="negotiation">협상</MenuItem>
                  <MenuItem value="closed_won">성공</MenuItem>
                  <MenuItem value="closed_lost">실패</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilter}
                  label="상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="active">진행중</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                  <MenuItem value="on_hold">보류</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  size="small"
                >
                  내보내기
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  size="small"
                >
                  인쇄
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 영업 기회 목록 테이블 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>제목</TableCell>
                  <TableCell>고객</TableCell>
                  <TableCell>영업 가치</TableCell>
                  <TableCell>성공 확률</TableCell>
                  <TableCell>영업 단계</TableCell>
                  <TableCell>예상 마감일</TableCell>
                  <TableCell>담당자</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>등록일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOpportunities.map((opportunity) => (
                  <TableRow key={opportunity.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {opportunity.title}
                        </Typography>
                        {opportunity.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {opportunity.description.length > 50 
                              ? `${opportunity.description.substring(0, 50)}...` 
                              : opportunity.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {opportunity.customer_name?.charAt(0) || 'C'}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {opportunity.customer_name || '고객 정보 없음'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {opportunity.value.toLocaleString()}원
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={opportunity.probability}
                          sx={{ 
                            width: 60, 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getProbabilityColor(opportunity.probability) === 'success' ? 'success.main' :
                                              getProbabilityColor(opportunity.probability) === 'info' ? 'info.main' :
                                              getProbabilityColor(opportunity.probability) === 'warning' ? 'warning.main' : 'error.main'
                            }
                          }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {opportunity.probability}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStageText(opportunity.stage)}
                        color={getStageColor(opportunity.stage) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="caption">
                          {new Date(opportunity.expected_close_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {opportunity.assigned_user_name || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(opportunity.status)}
                        color={getStatusColor(opportunity.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(opportunity.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="보기">
                          <IconButton
                            size="small"
                            onClick={() => handleViewOpportunity(opportunity)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수정">
                          <IconButton
                            size="small"
                            onClick={() => handleEditOpportunity(opportunity)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteOpportunity(opportunity)}
                            color="error"
                          >
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

      {/* 영업 기회 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' && '새 영업 기회 등록'}
          {dialogMode === 'edit' && '영업 기회 수정'}
          {dialogMode === 'view' && '영업 기회 보기'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>고객</InputLabel>
                <Select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  label="고객"
                  disabled={dialogMode === 'view'}
                >
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="영업 가치 (원)"
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="성공 확률 (%)"
                type="number"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                disabled={dialogMode === 'view'}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>영업 단계</InputLabel>
                <Select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  label="영업 단계"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="prospecting">영업 기회 발굴</MenuItem>
                  <MenuItem value="qualification">자격 검증</MenuItem>
                  <MenuItem value="proposal">제안서 제출</MenuItem>
                  <MenuItem value="negotiation">협상</MenuItem>
                  <MenuItem value="closed_won">성공</MenuItem>
                  <MenuItem value="closed_lost">실패</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="예상 마감일"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>담당자</InputLabel>
                <Select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  label="담당자"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="">담당자 없음</MenuItem>
                  {/* 실제 사용자 목록으로 교체 필요 */}
                  <MenuItem value="1">관리자</MenuItem>
                  <MenuItem value="2">영업팀장</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="상태"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="active">진행중</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                  <MenuItem value="on_hold">보류</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="설명"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {dialogMode === 'view' ? '닫기' : '취소'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveOpportunity} variant="contained">
              {dialogMode === 'create' ? '등록' : '수정'}
            </Button>
          )}
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

export default SalesOpportunityManagement;
