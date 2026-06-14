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
  Grid,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import { useTheme } from '@mui/material/styles';
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
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Notifications as NotificationsIcon,
  Approval as ApprovalIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api, accountingService } from '../../services/api';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { mvsSearchFieldSx } from '../../theme/mvsLayout';
import * as XLSX from 'xlsx';


const budgetFilterSelectSx = {
  borderRadius: '12px',
  bgcolor: '#FFFFFF',
  height: 40,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#C5CED9' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8C4D0' },
};

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
  companyId?: number;
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
  status: 'draft' | 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  items: BudgetItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// TabPanel 컴포넌트
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const BudgetManagement: React.FC = () => {
  const theme = useTheme();
  const { user } = useStore();
  const canSelectCompany = user?.role === 'root' || user?.role === 'audit';
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');

  // 예산 생성/수정 폼 데이터
  const [formData, setFormData] = useState({
    name: '',
    type: 'annual' as 'annual' | 'quarterly' | 'monthly' | 'project',
    startDate: '',
    endDate: '',
    notes: '',
    items: [] as Array<{
      category: string;
      subCategory: string;
      plannedAmount: number;
      description: string;
    }>,
  });

  // 예산 카테고리 옵션
  const budgetCategories = [
    { value: '인건비', subCategories: ['급여', '상여금', '퇴직금', '복리후생', '교육훈련비'] },
    { value: '운영비', subCategories: ['임대료', '공과금', '통신비', '보험료', '세금'] },
    { value: '마케팅', subCategories: ['광고비', '홍보비', '이벤트비', 'PR비'] },
    { value: '개발비', subCategories: ['소프트웨어', '하드웨어', '외주개발', '라이선스'] },
    { value: '기타', subCategories: ['교통비', '접대비', '기타비용'] },
  ];

  const parseJsonArray = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    loadBudgetData();
    if (canSelectCompany) {
      loadCompanies();
    }
  }, []);

  useEffect(() => {
    if (canSelectCompany) {
      loadBudgetData();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    filterBudgets();
  }, [budgets, searchTerm, statusFilter, typeFilter]);

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (canSelectCompany && selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }
      const response = await accountingService.getBudgets(params);
      if (response.success) {
        const list = Array.isArray(response.data) ? response.data : [];
        setBudgets(list.map((budget: any) => ({
          id: budget.id,
          companyId: budget.company_id ? Number(budget.company_id) : undefined,
          budgetId: budget.budget_id || '',
          name: budget.name || '',
          type: budget.type || 'annual',
          period: budget.period || '',
          startDate: budget.start_date || '',
          endDate: budget.end_date || '',
          totalPlanned: parseFloat(budget.total_planned || 0),
          totalActual: parseFloat(budget.total_actual || 0),
          totalVariance: parseFloat(budget.total_variance || 0),
          variancePercentage: budget.variance_percentage || 0,
          status: budget.status || 'draft',
          items: parseJsonArray(budget.items),
          createdBy: budget.created_by || '',
          createdAt: budget.created_at || '',
          updatedAt: budget.updated_at || '',
          notes: budget.notes || '',
          approvedBy: budget.approved_by,
          approvedAt: budget.approved_at
        })));
      } else {
        setBudgets([]);
        setError(response.message || '예산 데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('예산 데이터 로드 오류:', error);
      setError('예산 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error) {
      console.error('회사 목록 로드 오류:', error);
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(budget => budget.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(budget => budget.type === typeFilter);
    }

    setFilteredBudgets(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="초안" color="default" size="small" />;
      case 'pending':
        return <Chip label="승인 대기" color="warning" size="small" />;
      case 'approved':
        return <Chip label="승인됨" color="info" size="small" />;
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

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'error.main';
    if (variance < 0) return 'success.main';
    return 'text.secondary';
  };

  const getUsagePercentage = (planned: number, actual: number) => {
    if (planned === 0) return 0;
    return Math.min((actual / planned) * 100, 100);
  };

  const handleViewBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setOpenViewDialog(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      name: budget.name,
      type: budget.type,
      startDate: budget.startDate,
      endDate: budget.endDate,
      notes: budget.notes || '',
      items: budget.items.map(item => ({
        category: item.category,
        subCategory: item.subCategory,
        plannedAmount: item.plannedAmount,
        description: item.description,
      })),
    });
    setOpenDialog(true);
  };

  const handleDeleteBudget = async (id: number) => {
    showConfirm(
      '정말로 이 예산을 삭제하시겠습니까?',
      async () => {
        try {
          const response = await accountingService.deleteBudget(id);
          if (!response.success) {
            throw new Error(response.message || '삭제 실패');
          }
          await loadBudgetData();
          setSuccess('예산이 성공적으로 삭제되었습니다.');
        } catch (error) {
          console.error('삭제 오류:', error);
          setError('삭제 중 오류가 발생했습니다.');
        }
      },
      { confirmColor: 'error' }
    );
  };

  const handleCreateBudget = () => {
    setSelectedBudget(null);
    setFormData({
      name: '',
      type: 'annual',
      startDate: '',
      endDate: '',
      notes: '',
      items: [],
    });
    setOpenDialog(true);
  };

  const handleSaveBudget = async () => {
    try {
      if (!formData.name || !formData.startDate || !formData.endDate) {
        setError('필수 항목을 입력해주세요.');
        return;
      }
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError('종료일은 시작일보다 빠를 수 없습니다.');
        return;
      }
      if (formData.items.length === 0) {
        setError('최소 1개 이상의 예산 항목을 추가해주세요.');
        return;
      }
      if (formData.items.some((item) => !item.category || !item.subCategory || item.plannedAmount <= 0)) {
        setError('예산 항목의 카테고리/세부항목/계획금액을 올바르게 입력해주세요.');
        return;
      }

      const totalPlanned = formData.items.reduce((sum, item) => sum + item.plannedAmount, 0);
      const newBudget: Budget = {
        id: selectedBudget?.id || Date.now(),
        budgetId: selectedBudget?.budgetId || `BUD-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
        name: formData.name,
        type: formData.type,
        period: formData.startDate.split('-')[0],
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalPlanned: totalPlanned,
        totalActual: 0,
        totalVariance: -totalPlanned,
        variancePercentage: 0,
        status: selectedBudget?.status || 'draft',
        items: formData.items.map((item, index) => ({
          id: index + 1,
          category: item.category,
          subCategory: item.subCategory,
          plannedAmount: item.plannedAmount,
          actualAmount: 0,
          variance: -item.plannedAmount,
          variancePercentage: 0,
          status: 'on_track' as const,
          description: item.description,
          period: formData.startDate.split('-')[0],
        })),
        createdBy: user?.username || 'Unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: formData.notes,
      };

      if (selectedBudget) {
        const response = await accountingService.updateBudget(selectedBudget.id, {
          budget_id: newBudget.budgetId,
          name: newBudget.name,
          type: newBudget.type,
          period: newBudget.period,
          start_date: newBudget.startDate,
          end_date: newBudget.endDate,
          total_planned: newBudget.totalPlanned,
          total_actual: newBudget.totalActual,
          total_variance: newBudget.totalVariance,
          variance_percentage: newBudget.variancePercentage,
          status: newBudget.status,
          items: newBudget.items,
          notes: newBudget.notes
        });
        if (!response.success) {
          throw new Error(response.message || '수정 실패');
        }
        setSuccess('예산이 수정되었습니다.');
      } else {
        const response = await accountingService.createBudget({
          budget_id: newBudget.budgetId,
          name: newBudget.name,
          type: newBudget.type,
          period: newBudget.period,
          start_date: newBudget.startDate,
          end_date: newBudget.endDate,
          total_planned: newBudget.totalPlanned,
          total_actual: newBudget.totalActual,
          total_variance: newBudget.totalVariance,
          variance_percentage: newBudget.variancePercentage,
          status: newBudget.status,
          items: newBudget.items,
          created_by: newBudget.createdBy,
          notes: newBudget.notes,
          ...(canSelectCompany && selectedCompanyId ? { company_id: selectedCompanyId } : {})
        });
        if (!response.success) {
          throw new Error(response.message || '생성 실패');
        }
        setSuccess('예산이 생성되었습니다.');
      }

      await loadBudgetData();
      setOpenDialog(false);
      setSelectedBudget(null);
    } catch (error) {
      console.error('예산 저장 오류:', error);
      setError('예산 저장 중 오류가 발생했습니다.');
    }
  };

  const handleAddBudgetItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        category: '',
        subCategory: '',
        plannedAmount: 0,
        description: '',
      }],
    }));
  };

  const handleRemoveBudgetItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateBudgetItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleApproveBudget = async (id: number) => {
    showConfirm(
      '이 예산을 승인하시겠습니까?',
      async () => {
        try {
          const response = await accountingService.updateBudget(id, {
            status: 'approved',
            approved_by: user?.username,
            approved_at: new Date().toISOString()
          });
          if (!response.success) {
            throw new Error(response.message || '승인 실패');
          }
          await loadBudgetData();
          setSuccess('예산이 승인되었습니다.');
        } catch (error) {
          console.error('승인 오류:', error);
          setError('승인 중 오류가 발생했습니다.');
        }
      },
      { confirmColor: 'primary' }
    );
  };

  const handleActivateBudget = async (id: number) => {
    showConfirm(
      '이 예산을 활성화하시겠습니까?',
      async () => {
        try {
          const response = await accountingService.updateBudget(id, { status: 'active' });
          if (!response.success) {
            throw new Error(response.message || '활성화 실패');
          }
          await loadBudgetData();
          setSuccess('예산이 활성화되었습니다.');
        } catch (error) {
          console.error('활성화 오류:', error);
          setError('활성화 중 오류가 발생했습니다.');
        }
      },
      { confirmColor: 'primary' }
    );
  };

  const handleExportBudgets = () => {
    const companyNameById = new Map<number, string>(
      companies.map((company: any) => [Number(company.id), String(company.name || '')])
    );
    const rows = filteredBudgets.map((budget) => ({
      예산번호: budget.budgetId,
      예산명: budget.name,
      회사: budget.companyId ? companyNameById.get(Number(budget.companyId)) || `회사 ${budget.companyId}` : '-',
      유형: getTypeLabel(budget.type),
      상태: budget.status,
      시작일: budget.startDate,
      종료일: budget.endDate,
      계획금액: budget.totalPlanned,
      실제금액: budget.totalActual,
      차이: budget.totalVariance,
      사용률: `${getUsagePercentage(budget.totalPlanned, budget.totalActual).toFixed(1)}%`,
      메모: budget.notes || ''
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 예산번호: '-', 예산명: '-', 회사: '-', 유형: '-', 상태: '-', 시작일: '-', 종료일: '-', 계획금액: 0, 실제금액: 0, 차이: 0, 사용률: '0%', 메모: '-' }]),
      '예산목록'
    );
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(workbook, `예산관리_${today}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalPlanned = budgets.reduce((sum, budget) => sum + budget.totalPlanned, 0);
  const totalActual = budgets.reduce((sum, budget) => sum + budget.totalActual, 0);
  const totalVariance = totalActual - totalPlanned;
  const activeBudgets = budgets.filter(budget => budget.status === 'active').length;
  const pendingBudgets = budgets.filter(budget => budget.status === 'pending').length;
  const overBudgetCount = budgets.filter(budget => budget.totalVariance > 0).length;

  const paginatedBudgets = filteredBudgets.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // 상세 보기 모드
  if (viewMode === 'view' && selectedBudget) {
    return (
      <Box sx={{ ...mvsPageRootSx }}>
        <MvsPageHeader
          title="예산 상세"
          description={selectedBudget.budgetId}
          actions={
            <Button variant="outlined" onClick={() => setViewMode('list')}>
              목록으로
            </Button>
          }
        />

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {selectedBudget.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  기간: {selectedBudget.startDate} ~ {selectedBudget.endDate}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedBudget.status)}
                  <Chip label={getTypeLabel(selectedBudget.type)} color="primary" size="small" />
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" color="primary.main">
                  Rs. {selectedBudget.totalPlanned.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  계획 금액
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 예산 사용률 */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  예산 사용률
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {getUsagePercentage(selectedBudget.totalPlanned, selectedBudget.totalActual).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getUsagePercentage(selectedBudget.totalPlanned, selectedBudget.totalActual)}
                color={selectedBudget.totalVariance > 0 ? 'error' : 'success'}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>

            {/* 요약 정보 */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      계획 금액
                    </Typography>
                    <Typography variant="h6">
                      Rs. {selectedBudget.totalPlanned.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      실제 금액
                    </Typography>
                    <Typography variant="h6">
                      Rs. {selectedBudget.totalActual.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      차이
                    </Typography>
                    <Typography variant="h6" color={getVarianceColor(selectedBudget.totalVariance)}>
                      Rs. {Math.abs(selectedBudget.totalVariance).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 예산 항목 목록 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              예산 항목 상세
            </Typography>
            <TableContainer>
              <Table>
                <TableHead
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiTableCell-head': {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      py: 1.25
                    }
                  }}
                >
                  <TableRow>
                    <TableCell>카테고리</TableCell>
                    <TableCell>세부 항목</TableCell>
                    <TableCell>계획 금액</TableCell>
                    <TableCell>실제 금액</TableCell>
                    <TableCell>차이</TableCell>
                    <TableCell>사용률</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedBudget.items.map((item) => {
                    const usagePercent = getUsagePercentage(item.plannedAmount, item.actualAmount);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {item.subCategory}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>Rs. {item.plannedAmount.toLocaleString()}</TableCell>
                        <TableCell>Rs. {item.actualAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color={getVarianceColor(item.variance)}>
                            Rs. {Math.abs(item.variance).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={usagePercent}
                              color={item.variance > 0 ? 'error' : 'success'}
                              sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 40 }}>
                              {usagePercent.toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              item.status === 'over_budget' ? '초과' :
                              item.status === 'under_budget' ? '절감' : '정상'
                            }
                            color={
                              item.status === 'over_budget' ? 'error' :
                              item.status === 'under_budget' ? 'success' : 'default'
                            }
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

        {selectedBudget.notes && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                메모
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedBudget.notes}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title="예산 관리"
        description="예산을 계획하고, 승인하며, 실시간으로 모니터링하세요."
        actions={
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon fontSize="small" />}
            onClick={handleCreateBudget}
            sx={{ textTransform: 'none', borderRadius: '12px', px: 2 }}
          >
            예산 생성
          </Button>
        }
      />

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

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2.5, 
        mb: 3 
      }}>
        <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider', boxShadow: theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)' }}>
          <CardContent sx={{ py: 2.25, px: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              총 계획 금액
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Rs. {totalPlanned.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider', boxShadow: theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)' }}>
          <CardContent sx={{ py: 2.25, px: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              총 실제 금액
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em' }}>
              Rs. {totalActual.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider', boxShadow: theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)' }}>
          <CardContent sx={{ py: 2.25, px: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              총 차이
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em' }} color={getVarianceColor(totalVariance)}>
              Rs. {Math.abs(totalVariance).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider', boxShadow: theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)' }}>
          <CardContent sx={{ py: 2.25, px: 2.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              활성 예산
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em' }} color="success.main">
              {activeBudgets}
            </Typography>
            {pendingBudgets > 0 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                승인 대기: {pendingBudgets}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* 경고 카드 */}
      {overBudgetCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          {overBudgetCount}개의 예산이 초과 지출 상태입니다. 즉시 검토가 필요합니다.
        </Alert>
      )}

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm:
                canSelectCompany
                  ? 'minmax(160px, 2fr) minmax(130px, 1fr) minmax(110px, 1fr) minmax(110px, 1fr) auto'
                  : 'minmax(160px, 2fr) minmax(110px, 1fr) minmax(110px, 1fr) auto',
            },
            gap: 2, 
            alignItems: 'flex-end',
            ...mvsSearchFieldSx,
          }}>
            <TextField
              fullWidth
              size="small"
              label="검색"
              placeholder="예산명, 예산번호, 기간 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  '& .MuiOutlinedInput-input': { py: 0 },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            {canSelectCompany && (
              <TextField
                fullWidth
                size="small"
                select
                label="회사"
                value={selectedCompanyId}
                onChange={(e) => {
                  const value = String(e.target.value);
                  if (value === '') {
                    setSelectedCompanyId('');
                  } else {
                    const num = Number(value);
                    setSelectedCompanyId(isNaN(num) ? '' : num);
                  }
                }}
                InputLabelProps={{ shrink: true }}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (selected === '' || selected == null) return '전체 회사';
                    const company = companies.find((c) => c.id === selected);
                    return company?.name ?? '전체 회사';
                  },
                }}
                sx={budgetFilterSelectSx}
              >
                <MenuItem value="">전체 회사</MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              fullWidth
              size="small"
              select
              label="상태"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              sx={budgetFilterSelectSx}
            >
              <MenuItem value="all">전체 상태</MenuItem>
              <MenuItem value="draft">초안</MenuItem>
              <MenuItem value="pending">승인 대기</MenuItem>
              <MenuItem value="approved">승인됨</MenuItem>
              <MenuItem value="active">활성</MenuItem>
              <MenuItem value="completed">완료</MenuItem>
              <MenuItem value="cancelled">취소됨</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label="유형"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              sx={budgetFilterSelectSx}
            >
              <MenuItem value="all">전체 유형</MenuItem>
              <MenuItem value="annual">연간</MenuItem>
              <MenuItem value="quarterly">분기</MenuItem>
              <MenuItem value="monthly">월간</MenuItem>
              <MenuItem value="project">프로젝트</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setSelectedCompanyId('');
              }}
              sx={{
                height: 40,
                whiteSpace: 'nowrap',
                minWidth: 'fit-content',
                px: 2,
                borderRadius: '12px',
                textTransform: 'none',
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 예산 목록 테이블 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">예산 목록 ({filteredBudgets.length}건)</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportBudgets}
              >
                내보내기
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
              >
                인쇄
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredBudgets.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                {budgets.length === 0 ? '예산이 없습니다.' : '검색 결과가 없습니다.'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiTableCell-head': {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      py: 1.25
                    },
                    '& .MuiTableCell-head:last-of-type': {
                      textAlign: 'center'
                    }
                  }}
                >
                  <TableRow>
                    <TableCell>예산 정보</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>기간</TableCell>
                    <TableCell>계획 금액</TableCell>
                    <TableCell>실제 금액</TableCell>
                    <TableCell>차이</TableCell>
                    <TableCell>사용률</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedBudgets.map((budget) => {
                    const usagePercent = getUsagePercentage(budget.totalPlanned, budget.totalActual);
                    return (
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
                        <TableCell>
                          <Typography variant="body2">
                            {budget.startDate} ~ {budget.endDate}
                          </Typography>
                        </TableCell>
                        <TableCell>Rs. {budget.totalPlanned.toLocaleString()}</TableCell>
                        <TableCell>Rs. {budget.totalActual.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color={getVarianceColor(budget.totalVariance)}>
                            Rs. {Math.abs(budget.totalVariance).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={usagePercent}
                              color={budget.totalVariance > 0 ? 'error' : 'success'}
                              sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                            />
                            <Typography variant="caption" sx={{ minWidth: 35 }}>
                              {usagePercent.toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{getStatusChip(budget.status)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="상세보기">
                              <IconButton size="small" onClick={() => handleViewBudget(budget)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {budget.status === 'draft' && (
                              <Tooltip title="수정">
                                <IconButton size="small" onClick={() => handleEditBudget(budget)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {budget.status === 'pending' && (user?.role === 'admin' || user?.role === 'root') && (
                              <Tooltip title="승인">
                                <IconButton size="small" onClick={() => handleApproveBudget(budget.id)} color="success">
                                  <ApprovalIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {budget.status === 'approved' && (user?.role === 'admin' || user?.role === 'root') && (
                              <Tooltip title="활성화">
                                <IconButton size="small" onClick={() => handleActivateBudget(budget.id)} color="primary">
                                  <CheckCircleIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {budget.status === 'draft' && (
                              <Tooltip title="삭제">
                                <IconButton size="small" onClick={() => handleDeleteBudget(budget.id)} color="error">
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* 페이지네이션 */}
          {filteredBudgets.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={Math.ceil(filteredBudgets.length / itemsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 예산 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedBudget ? '예산 수정' : '새 예산 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="예산명"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>유형</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    label="유형"
                  >
                    <MenuItem value="annual">연간</MenuItem>
                    <MenuItem value="quarterly">분기</MenuItem>
                    <MenuItem value="monthly">월간</MenuItem>
                    <MenuItem value="project">프로젝트</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="시작일"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="종료일"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="메모"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">예산 항목</Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddBudgetItem}
              >
                항목 추가
              </Button>
            </Box>

            {formData.items.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, border: '2px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  예산 항목이 없습니다. "항목 추가" 버튼을 클릭하여 추가하세요.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {formData.items.map((item, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          항목 {index + 1}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveBudgetItem(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>카테고리</InputLabel>
                            <Select
                              value={item.category}
                              onChange={(e) => {
                                handleUpdateBudgetItem(index, 'category', e.target.value);
                                handleUpdateBudgetItem(index, 'subCategory', '');
                              }}
                              label="카테고리"
                            >
                              {budgetCategories.map(cat => (
                                <MenuItem key={cat.value} value={cat.value}>{cat.value}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <FormControl fullWidth disabled={!item.category}>
                            <InputLabel>세부 항목</InputLabel>
                            <Select
                              value={item.subCategory}
                              onChange={(e) => handleUpdateBudgetItem(index, 'subCategory', e.target.value)}
                              label="세부 항목"
                            >
                              {budgetCategories
                                .find(cat => cat.value === item.category)
                                ?.subCategories.map(sub => (
                                  <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="계획 금액 (INR)"
                            type="number"
                            value={item.plannedAmount || ''}
                            onChange={(e) => handleUpdateBudgetItem(index, 'plannedAmount', parseFloat(e.target.value) || 0)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <TextField
                            fullWidth
                            label="설명"
                            value={item.description}
                            onChange={(e) => handleUpdateBudgetItem(index, 'description', e.target.value)}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {formData.items.length > 0 && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  총 계획 금액
                </Typography>
                <Typography variant="h5" color="primary.main">
                  Rs. {formData.items.reduce((sum, item) => sum + item.plannedAmount, 0).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setSelectedBudget(null);
          }}>
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveBudget}
            startIcon={<SaveIcon />}
            disabled={!formData.name || !formData.startDate || !formData.endDate || formData.items.length === 0}
          >
            {selectedBudget ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 예산 상세 보기 다이얼로그 */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon color="primary" />
            예산 상세 정보
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBudget && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {selectedBudget.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    예산 번호: {selectedBudget.budgetId}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {getStatusChip(selectedBudget.status)}
                    <Chip label={getTypeLabel(selectedBudget.type)} color="primary" size="small" />
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h4" color="primary.main">
                    Rs. {selectedBudget.totalPlanned.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    계획 금액
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 예산 사용률 */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    예산 사용률
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {getUsagePercentage(selectedBudget.totalPlanned, selectedBudget.totalActual).toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={getUsagePercentage(selectedBudget.totalPlanned, selectedBudget.totalActual)}
                  color={selectedBudget.totalVariance > 0 ? 'error' : 'success'}
                  sx={{ height: 10, borderRadius: 1 }}
                />
              </Box>

              {/* 요약 정보 */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        계획 금액
                      </Typography>
                      <Typography variant="h6">
                        Rs. {selectedBudget.totalPlanned.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        실제 금액
                      </Typography>
                      <Typography variant="h6">
                        Rs. {selectedBudget.totalActual.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        차이
                      </Typography>
                      <Typography variant="h6" color={getVarianceColor(selectedBudget.totalVariance)}>
                        Rs. {Math.abs(selectedBudget.totalVariance).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        기간
                      </Typography>
                      <Typography variant="body2">
                        {selectedBudget.startDate} ~ {selectedBudget.endDate}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* 예산 항목 목록 */}
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                예산 항목 상세
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead
                    sx={{
                      bgcolor: 'background.paper',
                      '& .MuiTableCell-head': {
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                        borderBottom: '2px solid',
                        borderColor: 'primary.main',
                        py: 1.25
                      }
                    }}
                  >
                    <TableRow>
                      <TableCell>카테고리</TableCell>
                      <TableCell>세부 항목</TableCell>
                      <TableCell>설명</TableCell>
                      <TableCell align="right">계획 금액</TableCell>
                      <TableCell align="right">실제 금액</TableCell>
                      <TableCell align="right">차이</TableCell>
                      <TableCell>사용률</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedBudget.items.map((item) => {
                      const usagePercent = getUsagePercentage(item.plannedAmount, item.actualAmount);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.subCategory}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">Rs. {item.plannedAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">Rs. {item.actualAmount.toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color={getVarianceColor(item.variance)}>
                              Rs. {Math.abs(item.variance).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={usagePercent}
                                color={item.variance > 0 ? 'error' : 'success'}
                                sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                              />
                              <Typography variant="caption" sx={{ minWidth: 35 }}>
                                {usagePercent.toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                item.status === 'over_budget' ? '초과' :
                                item.status === 'under_budget' ? '절감' : '정상'
                              }
                              color={
                                item.status === 'over_budget' ? 'error' :
                                item.status === 'under_budget' ? 'success' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedBudget.notes && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    메모
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedBudget.notes}
                  </Typography>
                </Box>
              )}

              {selectedBudget.approvedBy && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    승인자: {selectedBudget.approvedBy} | 승인일: {selectedBudget.approvedAt ? new Date(selectedBudget.approvedAt).toLocaleDateString() : '-'}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>닫기</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            인쇄
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportBudgets}>
            다운로드
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
