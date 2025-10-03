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
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface ExpenseItem {
  id: number;
  category: string;
  description: string;
  amount: number;
  receiptUrl?: string;
  date: string;
  vendor?: string;
}

interface ExpenseApproval {
  id: number;
  expenseId: string;
  title: string;
  requesterId: number;
  requesterName: string;
  requesterDepartment: string;
  requesterPosition: string;
  totalAmount: number;
  currency: string;
  purpose: string;
  items: ExpenseItem[];
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'paid';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  currentApproverId?: number;
  currentApproverName?: string;
  approvalFlow: ApprovalStep[];
  submittedAt: string;
  dueDate: string;
  notes?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

interface ApprovalStep {
  id: number;
  stepOrder: number;
  approverId: number;
  approverName: string;
  approverDepartment: string;
  approverPosition: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  approvedAt?: string;
  comment?: string;
}

const ExpenseApproval: React.FC = () => {
  const { user } = useStore();
  const [expenses, setExpenses] = useState<ExpenseApproval[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseApproval | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleData: ExpenseApproval[] = [
    {
      id: 1,
      expenseId: 'EXP-2024-001',
      title: '개발팀 장비 구매',
      requesterId: 1001,
      requesterName: '김개발',
      requesterDepartment: '개발팀',
      requesterPosition: '개발팀장',
      totalAmount: 2500000,
      currency: 'KRW',
      purpose: '개발팀 업무 효율성 향상을 위한 장비 구매',
      items: [
        {
          id: 1,
          category: 'IT 장비',
          description: '고성능 개발용 노트북',
          amount: 2000000,
          receiptUrl: '/receipts/laptop.pdf',
          date: '2024-01-20',
          vendor: '삼성전자'
        },
        {
          id: 2,
          category: 'IT 장비',
          description: '모니터 2대',
          amount: 500000,
          receiptUrl: '/receipts/monitor.pdf',
          date: '2024-01-20',
          vendor: 'LG전자'
        }
      ],
      status: 'approved',
      priority: 'high',
      currentApproverId: 2001,
      currentApproverName: '이부장',
      approvalFlow: [
        {
          id: 1,
          stepOrder: 1,
          approverId: 2001,
          approverName: '이부장',
          approverDepartment: 'IT부',
          approverPosition: '부장',
          status: 'approved',
          approvedAt: '2024-01-22 10:30:00',
          comment: '필요성 인정, 승인합니다.'
        }
      ],
      submittedAt: '2024-01-21 14:00:00',
      dueDate: '2024-01-25',
      notes: '긴급 구매 필요',
      attachments: ['견적서.pdf', '제품사양서.pdf'],
      createdAt: '2024-01-21 14:00:00',
      updatedAt: '2024-01-22 10:30:00'
    },
    {
      id: 2,
      expenseId: 'EXP-2024-002',
      title: '출장비 신청',
      requesterId: 1002,
      requesterName: '이프론트',
      requesterDepartment: '개발팀',
      requesterPosition: '프론트엔드 개발자',
      totalAmount: 800000,
      currency: 'KRW',
      purpose: '고객사 방문 및 기술 상담',
      items: [
        {
          id: 3,
          category: '교통비',
          description: 'KTX 왕복 티켓',
          amount: 120000,
          receiptUrl: '/receipts/ktx.pdf',
          date: '2024-01-23',
          vendor: 'KORAIL'
        },
        {
          id: 4,
          category: '숙박비',
          description: '호텔 2박',
          amount: 300000,
          receiptUrl: '/receipts/hotel.pdf',
          date: '2024-01-23',
          vendor: '롯데호텔'
        },
        {
          id: 5,
          category: '식비',
          description: '출장 중 식사비',
          amount: 150000,
          receiptUrl: '/receipts/meals.pdf',
          date: '2024-01-23',
          vendor: '다양'
        },
        {
          id: 6,
          category: '기타',
          description: '택시비 및 소액 지출',
          amount: 230000,
          receiptUrl: '/receipts/misc.pdf',
          date: '2024-01-23',
          vendor: '다양'
        }
      ],
      status: 'in_review',
      priority: 'medium',
      currentApproverId: 1001,
      currentApproverName: '김개발',
      approvalFlow: [
        {
          id: 2,
          stepOrder: 1,
          approverId: 1001,
          approverName: '김개발',
          approverDepartment: '개발팀',
          approverPosition: '개발팀장',
          status: 'pending'
        }
      ],
      submittedAt: '2024-01-24 09:00:00',
      dueDate: '2024-01-28',
      attachments: ['출장계획서.pdf', '고객사_초대장.pdf'],
      createdAt: '2024-01-24 09:00:00',
      updatedAt: '2024-01-24 09:00:00'
    },
    {
      id: 3,
      expenseId: 'EXP-2024-003',
      title: '교육비 신청',
      requesterId: 1003,
      requesterName: '박백엔드',
      requesterDepartment: '개발팀',
      requesterPosition: '백엔드 개발자',
      totalAmount: 500000,
      currency: 'KRW',
      purpose: 'AWS 클라우드 아키텍처 교육 과정 수강',
      items: [
        {
          id: 7,
          category: '교육비',
          description: 'AWS Solutions Architect 교육',
          amount: 500000,
          receiptUrl: '/receipts/aws_course.pdf',
          date: '2024-01-25',
          vendor: 'AWS Korea'
        }
      ],
      status: 'submitted',
      priority: 'medium',
      currentApproverId: 1001,
      currentApproverName: '김개발',
      approvalFlow: [
        {
          id: 3,
          stepOrder: 1,
          approverId: 1001,
          approverName: '김개발',
          approverDepartment: '개발팀',
          approverPosition: '개발팀장',
          status: 'pending'
        }
      ],
      submittedAt: '2024-01-25 11:30:00',
      dueDate: '2024-01-30',
      attachments: ['교육과정안내.pdf', '수강신청서.pdf'],
      createdAt: '2024-01-25 11:30:00',
      updatedAt: '2024-01-25 11:30:00'
    }
  ];

  useEffect(() => {
    loadExpenseData();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  const loadExpenseData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setExpenses(sampleData);
    } catch (error) {
      console.error('지출 데이터 로드 오류:', error);
      setError('지출 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.expenseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.purpose.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }

    if (categoryFilter) {
      filtered = filtered.filter(expense => 
        expense.items.some(item => item.category === categoryFilter)
      );
    }

    if (priorityFilter) {
      filtered = filtered.filter(expense => expense.priority === priorityFilter);
    }

    setFilteredExpenses(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="초안" color="default" size="small" />;
      case 'submitted':
        return <Chip label="제출됨" color="info" size="small" />;
      case 'in_review':
        return <Chip label="검토중" color="warning" size="small" />;
      case 'approved':
        return <Chip label="승인됨" color="success" size="small" />;
      case 'rejected':
        return <Chip label="반려됨" color="error" size="small" />;
      case 'paid':
        return <Chip label="지급완료" color="success" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Chip label="낮음" color="default" size="small" />;
      case 'medium':
        return <Chip label="보통" color="info" size="small" />;
      case 'high':
        return <Chip label="높음" color="warning" size="small" />;
      case 'urgent':
        return <Chip label="긴급" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const handleViewExpense = (expense: ExpenseApproval) => {
    setSelectedExpense(expense);
    setViewMode('view');
  };

  const handleEditExpense = (expense: ExpenseApproval) => {
    setSelectedExpense(expense);
    setOpenDialog(true);
  };

  const handleDeleteExpense = async (id: number) => {
    if (window.confirm('정말로 이 지출결의서를 삭제하시겠습니까?')) {
      try {
        setExpenses(prev => prev.filter(expense => expense.id !== id));
        setSuccess('지출결의서가 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleApproveExpense = (id: number) => {
    setExpenses(prev =>
      prev.map(expense =>
        expense.id === id 
          ? { 
              ...expense, 
              status: 'approved' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : expense
      )
    );
    setSuccess('지출결의서가 승인되었습니다.');
  };

  const handleRejectExpense = (id: number) => {
    setExpenses(prev =>
      prev.map(expense =>
        expense.id === id 
          ? { 
              ...expense, 
              status: 'rejected' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : expense
      )
    );
    setSuccess('지출결의서가 반려되었습니다.');
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
  const approvedAmount = expenses
    .filter(expense => expense.status === 'approved' || expense.status === 'paid')
    .reduce((sum, expense) => sum + expense.totalAmount, 0);
  const pendingAmount = expenses
    .filter(expense => expense.status === 'submitted' || expense.status === 'in_review')
    .reduce((sum, expense) => sum + expense.totalAmount, 0);
  const urgentCount = expenses.filter(expense => expense.priority === 'urgent').length;

  const paginatedExpenses = filteredExpenses.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const categories = Array.from(new Set(expenses.flatMap(expense => expense.items.map(item => item.category))));

  if (viewMode === 'view' && selectedExpense) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            지출결의서 상세
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
                  {selectedExpense.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  지출번호: {selectedExpense.expenseId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedExpense.status)}
                  {getPriorityChip(selectedExpense.priority)}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" color="primary.main">
                  ₩{selectedExpense.totalAmount.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedExpense.currency}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 신청자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>신청자 정보</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedExpense.requesterName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedExpense.requesterPosition} • {selectedExpense.requesterDepartment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 지출 목적 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>지출 목적</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  {selectedExpense.purpose}
                </Typography>
              </Card>
            </Box>

            {/* 지출 항목 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>지출 항목</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>카테고리</TableCell>
                      <TableCell>설명</TableCell>
                      <TableCell>금액</TableCell>
                      <TableCell>날짜</TableCell>
                      <TableCell>업체</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedExpense.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Chip label={item.category} color="primary" size="small" />
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>₩{item.amount.toLocaleString()}</TableCell>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.vendor || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* 승인 흐름 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>승인 흐름</Typography>
              <Stepper orientation="vertical">
                {selectedExpense.approvalFlow.map((step, index) => (
                  <Step key={step.id} active={step.status === 'pending'} completed={step.status === 'approved'}>
                    <StepLabel>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {step.approverName} ({step.approverPosition})
                        </Typography>
                        {step.status === 'approved' && <CheckCircleIcon color="success" />}
                        {step.status === 'rejected' && <CancelIcon color="error" />}
                        {step.status === 'pending' && <PendingIcon color="warning" />}
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.approverDepartment}
                      </Typography>
                      {step.comment && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          "{step.comment}"
                        </Typography>
                      )}
                      {step.approvedAt && (
                        <Typography variant="caption" color="text.secondary">
                          {step.approvedAt}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* 첨부파일 */}
            {selectedExpense.attachments.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>첨부파일</Typography>
                <List>
                  {selectedExpense.attachments.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <ReceiptIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={file} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* 메모 */}
            {selectedExpense.notes && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>메모</Typography>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedExpense.notes}
                  </Typography>
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditExpense(selectedExpense)}
              >
                수정
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
              >
                인쇄
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                PDF 다운로드
              </Button>
              {selectedExpense.status === 'in_review' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleApproveExpense(selectedExpense.id)}
                  >
                    승인
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleRejectExpense(selectedExpense.id)}
                  >
                    반려
                  </Button>
                </>
              )}
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
          <ReceiptIcon />
          지출결의서
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          지출 신청
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
              총 지출 금액
            </Typography>
            <Typography variant="h4">
              ₩{totalAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              승인된 금액
            </Typography>
            <Typography variant="h4" color="success.main">
              ₩{approvedAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              대기중인 금액
            </Typography>
            <Typography variant="h4" color="warning.main">
              ₩{pendingAmount.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              긴급 신청
            </Typography>
            <Typography variant="h4" color="error.main">
              {urgentCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              placeholder="제목, 지출번호, 신청자 검색"
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
                <MenuItem value="submitted">제출됨</MenuItem>
                <MenuItem value="in_review">검토중</MenuItem>
                <MenuItem value="approved">승인됨</MenuItem>
                <MenuItem value="rejected">반려됨</MenuItem>
                <MenuItem value="paid">지급완료</MenuItem>
              </Select>
            </FormControl>
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
            <FormControl fullWidth>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="urgent">긴급</MenuItem>
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setCategoryFilter('');
                setPriorityFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 지출결의서 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>지출 정보</TableCell>
                <TableCell>신청자</TableCell>
                <TableCell>금액</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>우선순위</TableCell>
                <TableCell>제출일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedExpenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {expense.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {expense.expenseId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {expense.requesterName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {expense.requesterDepartment}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      ₩{expense.totalAmount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(expense.status)}</TableCell>
                  <TableCell>{getPriorityChip(expense.priority)}</TableCell>
                  <TableCell>{expense.submittedAt}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewExpense(expense)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditExpense(expense)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {expense.status === 'in_review' && (
                        <>
                          <Tooltip title="승인">
                            <IconButton 
                              size="small" 
                              onClick={() => handleApproveExpense(expense.id)}
                              color="success"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="반려">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRejectExpense(expense.id)}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteExpense(expense.id)}>
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
            count={Math.ceil(filteredExpenses.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 지출 신청 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedExpense ? '지출결의서 수정' : '지출 신청'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              지출 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              지출 신청 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedExpense ? '수정' : '신청'}
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

export default ExpenseApproval;
