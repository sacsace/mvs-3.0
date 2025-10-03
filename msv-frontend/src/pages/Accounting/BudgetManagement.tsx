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
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AccountBalance as AccountBalanceIcon,
  Person as PersonIcon,
  Print as PrintIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface BudgetItem {
  id: number;
  category: string;
  subCategory: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  status: 'on_track' | 'over_budget' | 'under_budget';
  description: string;
  period: string;
}

interface Budget {
  id: number;
  budgetId: string;
  name: string;
  type: 'annual' | 'quarterly' | 'monthly' | 'project';
  period: string;
  startDate: string;
  endDate: string;
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  variancePercentage: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  items: BudgetItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

const BudgetManagement: React.FC = () => {
  const { user } = useStore();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleData: Budget[] = [
    {
      id: 1,
      budgetId: 'BUD-2024-001',
      name: '2024년 연간 예산',
      type: 'annual',
      period: '2024',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      totalPlanned: 500000000,
      totalActual: 320000000,
      totalVariance: -180000000,
      variancePercentage: -36,
      status: 'active',
      items: [
        {
          id: 1,
          category: '인건비',
          subCategory: '급여',
          plannedAmount: 200000000,
          actualAmount: 180000000,
          variance: -20000000,
          variancePercentage: -10,
          status: 'under_budget',
          description: '직원 급여',
          period: '2024'
        }
      ],
      createdBy: '김개발',
      createdAt: '2024-01-01 09:00:00',
      updatedAt: '2024-01-15 14:30:00',
      notes: '2024년 연간 예산 계획'
    }
  ];

  useEffect(() => {
    loadBudgetData();
  }, []);

  useEffect(() => {
    filterBudgets();
  }, [budgets, searchTerm, statusFilter, typeFilter]);

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBudgets(sampleData);
    } catch (error) {
      console.error('예산 데이터 로드 오류:', error);
      setError('예산 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterBudgets = () => {
    let filtered = budgets;

    if (searchTerm) {
      filtered = filtered.filter(budget =>
        budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.budgetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.period.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(budget => budget.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(budget => budget.type === typeFilter);
    }

    setFilteredBudgets(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="초안" color="default" size="small" />;
      case 'active':
        return <Chip label="활성" color="success" size="small" />;
      case 'completed':
        return <Chip label="완료" color="info" size="small" />;
      case 'cancelled':
        return <Chip label="취소됨" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'annual':
        return '연간';
      case 'quarterly':
        return '분기';
      case 'monthly':
        return '월간';
      case 'project':
        return '프로젝트';
      default:
        return '알 수 없음';
    }
  };

  const handleViewBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setViewMode('view');
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setOpenDialog(true);
  };

  const handleDeleteBudget = async (id: number) => {
    if (window.confirm('정말로 이 예산을 삭제하시겠습니까?')) {
      try {
        setBudgets(prev => prev.filter(budget => budget.id !== id));
        setSuccess('예산이 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const totalPlanned = budgets.reduce((sum, budget) => sum + budget.totalPlanned, 0);
  const totalActual = budgets.reduce((sum, budget) => sum + budget.totalActual, 0);
  const totalVariance = totalActual - totalPlanned;
  const activeBudgets = budgets.filter(budget => budget.status === 'active').length;

  const paginatedBudgets = filteredBudgets.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'view' && selectedBudget) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon />
            예산 상세
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setViewMode('list')}
          >
            목록으로
          </Button>
        </Box>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedBudget.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  예산 번호: {selectedBudget.budgetId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedBudget.status)}
                  <Chip label={getTypeLabel(selectedBudget.type)} color="primary" size="small" />
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" color="primary.main">
                  ₩{selectedBudget.totalPlanned.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  계획 금액
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceIcon />
          예산 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          예산 생성
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 계획 금액
            </Typography>
            <Typography variant="h4">
              ₩{totalPlanned.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 실제 금액
            </Typography>
            <Typography variant="h4">
              ₩{totalActual.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 차이
            </Typography>
            <Typography variant="h4" color={totalVariance >= 0 ? 'error.main' : 'success.main'}>
              ₩{Math.abs(totalVariance).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              활성 예산
            </Typography>
            <Typography variant="h4" color="success.main">
              {activeBudgets}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              placeholder="예산명, 예산번호, 기간 검색"
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
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="draft">초안</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="completed">완료</MenuItem>
                <MenuItem value="cancelled">취소됨</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="annual">연간</MenuItem>
                <MenuItem value="quarterly">분기</MenuItem>
                <MenuItem value="monthly">월간</MenuItem>
                <MenuItem value="project">프로젝트</MenuItem>
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 예산 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>예산 정보</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>기간</TableCell>
                <TableCell>계획 금액</TableCell>
                <TableCell>실제 금액</TableCell>
                <TableCell>차이</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedBudgets.map((budget) => (
                <TableRow key={budget.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {budget.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {budget.budgetId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={getTypeLabel(budget.type)} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{budget.period}</TableCell>
                  <TableCell>₩{budget.totalPlanned.toLocaleString()}</TableCell>
                  <TableCell>₩{budget.totalActual.toLocaleString()}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color={budget.totalVariance >= 0 ? 'error.main' : 'success.main'}
                    >
                      ₩{Math.abs(budget.totalVariance).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(budget.status)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewBudget(budget)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditBudget(budget)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteBudget(budget.id)}>
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
            count={Math.ceil(filteredBudgets.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 예산 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedBudget ? '예산 수정' : '예산 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              예산 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              예산 생성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedBudget ? '수정' : '생성'}
          </Button>
        </DialogActions>
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

export default BudgetManagement;