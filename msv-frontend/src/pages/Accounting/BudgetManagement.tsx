import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Divider,
  LinearProgress, Grid
} from '@mui/material';
import {
  AccountBalance as BudgetIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Download as DownloadIcon, TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon, Business as BusinessIcon, Category as CategoryIcon,
  AttachMoney as MoneyIcon, CalendarToday as CalendarIcon, PieChart as PieChartIcon
} from '@mui/icons-material';

interface Budget {
  id: number;
  department: string;
  category: string;
  budgetYear: number;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationRate: number;
  status: 'on_track' | 'over_budget' | 'under_budget' | 'exceeded';
  lastUpdated: string;
  description: string;
}

const BudgetManagement: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([
    {
      id: 1,
      department: '개발팀',
      category: '인건비',
      budgetYear: 2024,
      budgetAmount: 500000000,
      spentAmount: 320000000,
      remainingAmount: 180000000,
      utilizationRate: 64,
      status: 'on_track',
      lastUpdated: '2024-01-15',
      description: '개발팀 인건비 예산'
    },
    {
      id: 2,
      department: '마케팅팀',
      category: '광고비',
      budgetYear: 2024,
      budgetAmount: 200000000,
      spentAmount: 180000000,
      remainingAmount: 20000000,
      utilizationRate: 90,
      status: 'over_budget',
      lastUpdated: '2024-01-20',
      description: '마케팅 광고비 예산'
    },
    {
      id: 3,
      department: '영업팀',
      category: '출장비',
      budgetYear: 2024,
      budgetAmount: 100000000,
      spentAmount: 45000000,
      remainingAmount: 55000000,
      utilizationRate: 45,
      status: 'under_budget',
      lastUpdated: '2024-01-18',
      description: '영업팀 출장비 예산'
    },
    {
      id: 4,
      department: '인사팀',
      category: '교육비',
      budgetYear: 2024,
      budgetAmount: 50000000,
      spentAmount: 52000000,
      remainingAmount: -2000000,
      utilizationRate: 104,
      status: 'exceeded',
      lastUpdated: '2024-01-22',
      description: '인사팀 교육비 예산'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState<Omit<Budget, 'id' | 'remainingAmount' | 'utilizationRate' | 'status'>>({
    department: '',
    category: '',
    budgetYear: new Date().getFullYear(),
    budgetAmount: 0,
    spentAmount: 0,
    lastUpdated: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleAdd = () => {
    setSelectedBudget(null);
    setFormData({
      department: '',
      category: '',
      budgetYear: new Date().getFullYear(),
      budgetAmount: 0,
      spentAmount: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      description: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      department: budget.department,
      category: budget.category,
      budgetYear: budget.budgetYear,
      budgetAmount: budget.budgetAmount,
      spentAmount: budget.spentAmount,
      lastUpdated: budget.lastUpdated,
      description: budget.description
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    const remainingAmount = formData.budgetAmount - formData.spentAmount;
    const utilizationRate = Math.round((formData.spentAmount / formData.budgetAmount) * 100);
    let status: Budget['status'] = 'on_track';
    
    if (utilizationRate > 100) {
      status = 'exceeded';
    } else if (utilizationRate > 80) {
      status = 'over_budget';
    } else if (utilizationRate < 50) {
      status = 'under_budget';
    }

    if (selectedBudget) {
      setBudgets(budgets.map(budget =>
        budget.id === selectedBudget.id 
          ? { 
              ...budget, 
              ...formData, 
              remainingAmount, 
              utilizationRate, 
              status 
            } 
          : budget
      ));
    } else {
      const newBudget: Budget = {
        id: budgets.length > 0 ? Math.max(...budgets.map(b => b.id)) + 1 : 1,
        ...formData,
        remainingAmount,
        utilizationRate,
        status
      };
      setBudgets([...budgets, newBudget]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setBudgets(budgets.filter(budget => budget.id !== id));
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      on_track: { label: '정상', color: 'success' as const },
      over_budget: { label: '초과위험', color: 'warning' as const },
      under_budget: { label: '미사용', color: 'info' as const },
      exceeded: { label: '초과', color: 'error' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <TrendingUpIcon sx={{ color: 'success.main' }} />;
      case 'over_budget': return <TrendingUpIcon sx={{ color: 'warning.main' }} />;
      case 'under_budget': return <TrendingDownIcon sx={{ color: 'info.main' }} />;
      case 'exceeded': return <TrendingUpIcon sx={{ color: 'error.main' }} />;
      default: return null;
    }
  };

  const filteredBudgets = budgets.filter(budget => {
    const matchesSearch = budget.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          budget.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          budget.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || budget.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || budget.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.budgetAmount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentAmount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallUtilization = Math.round((totalSpent / totalBudget) * 100);

  return (
    <Box sx={{ width: '100%', px: 2, py: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BudgetIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          예산 관리
        </Typography>
      </Box>

      {/* 예산 요약 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, 
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">총 예산</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {totalBudget.toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">사용 금액</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {totalSpent.toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingDownIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">잔여 금액</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: totalRemaining >= 0 ? 'info.main' : 'error.main' }}>
              {totalRemaining.toLocaleString()}원
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PieChartIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">사용률</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {overallUtilization}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={overallUtilization} 
              sx={{ mt: 1 }}
              color={overallUtilization > 100 ? 'error' : overallUtilization > 80 ? 'warning' : 'primary'}
            />
          </CardContent>
        </Card>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="부서, 카테고리, 설명으로 검색..."
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
              <InputLabel>부서</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="all">전체 부서</MenuItem>
                <MenuItem value="개발팀">개발팀</MenuItem>
                <MenuItem value="마케팅팀">마케팅팀</MenuItem>
                <MenuItem value="영업팀">영업팀</MenuItem>
                <MenuItem value="인사팀">인사팀</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="on_track">정상</MenuItem>
                <MenuItem value="over_budget">초과위험</MenuItem>
                <MenuItem value="under_budget">미사용</MenuItem>
                <MenuItem value="exceeded">초과</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              내보내기
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              예산 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 예산 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>부서</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>카테고리</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>예산 금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>사용 금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>잔여 금액</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>사용률</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBudgets.map((budget) => (
                <TableRow key={budget.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {budget.department}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CategoryIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {budget.category}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {budget.budgetAmount.toLocaleString()}원
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {budget.spentAmount.toLocaleString()}원
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'medium',
                        color: budget.remainingAmount >= 0 ? 'text.primary' : 'error.main'
                      }}
                    >
                      {budget.remainingAmount.toLocaleString()}원
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: 40 }}>
                        {budget.utilizationRate}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(budget.utilizationRate, 100)} 
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        color={budget.utilizationRate > 100 ? 'error' : budget.utilizationRate > 80 ? 'warning' : 'primary'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(budget.status)}
                      {getStatusChip(budget.status)}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(budget)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(budget.id)} color="error">
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

      {/* 예산 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedBudget ? '예산 수정' : '새 예산 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>부서</InputLabel>
                <Select
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                >
                  <MenuItem value="개발팀">개발팀</MenuItem>
                  <MenuItem value="마케팅팀">마케팅팀</MenuItem>
                  <MenuItem value="영업팀">영업팀</MenuItem>
                  <MenuItem value="인사팀">인사팀</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <MenuItem value="인건비">인건비</MenuItem>
                  <MenuItem value="광고비">광고비</MenuItem>
                  <MenuItem value="출장비">출장비</MenuItem>
                  <MenuItem value="교육비">교육비</MenuItem>
                  <MenuItem value="사무용품">사무용품</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="예산 연도"
                type="number"
                value={formData.budgetYear}
                onChange={(e) => setFormData({...formData, budgetYear: parseInt(e.target.value) || new Date().getFullYear()})}
                required
              />
              <TextField
                fullWidth
                label="예산 금액 (원)"
                type="number"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({...formData, budgetAmount: parseInt(e.target.value) || 0})}
                required
              />
            </Box>
            <TextField
              fullWidth
              label="사용 금액 (원)"
              type="number"
              value={formData.spentAmount}
              onChange={(e) => setFormData({...formData, spentAmount: parseInt(e.target.value) || 0})}
              required
            />
            <TextField
              fullWidth
              label="마지막 업데이트"
              type="date"
              value={formData.lastUpdated}
              onChange={(e) => setFormData({...formData, lastUpdated: e.target.value})}
              InputLabelProps={{ shrink: true }}
              required
            />
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

export default BudgetManagement;
