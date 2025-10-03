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
  Rating,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Assessment as AssessmentIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface PerformanceReview {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  reviewPeriod: string;
  overallRating: number;
  goals: {
    id: number;
    title: string;
    description: string;
    target: string;
    achievement: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'exceeded';
  }[];
  competencies: {
    id: number;
    name: string;
    rating: number;
    comment: string;
  }[];
  strengths: string[];
  improvements: string[];
  managerComment: string;
  employeeComment: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'finalized';
  createdAt: string;
  updatedAt: string;
  reviewedBy: string;
}

const PerformanceManagement: React.FC = () => {
  const { user } = useStore();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleData: PerformanceReview[] = [
    {
      id: 1,
      employeeId: 1001,
      employeeName: '김개발',
      department: '개발팀',
      position: '개발팀장',
      reviewPeriod: '2024 Q1',
      overallRating: 4.5,
      goals: [
        {
          id: 1,
          title: '프로젝트 완료율 향상',
          description: '담당 프로젝트의 완료율을 95% 이상 달성',
          target: '95%',
          achievement: 98,
          status: 'exceeded'
        },
        {
          id: 2,
          title: '팀 리더십 강화',
          description: '팀원들의 만족도 조사에서 4.0 이상 달성',
          target: '4.0',
          achievement: 4.2,
          status: 'exceeded'
        }
      ],
      competencies: [
        {
          id: 1,
          name: '기술적 역량',
          rating: 5,
          comment: '최신 기술 트렌드를 잘 파악하고 적용함'
        },
        {
          id: 2,
          name: '리더십',
          rating: 4,
          comment: '팀을 잘 이끌고 있으나 더 개선의 여지가 있음'
        },
        {
          id: 3,
          name: '의사소통',
          rating: 4,
          comment: '명확하고 효과적인 커뮤니케이션을 함'
        }
      ],
      strengths: ['기술적 전문성', '문제 해결 능력', '팀워크'],
      improvements: ['시간 관리', '문서화 습관'],
      managerComment: '전반적으로 우수한 성과를 보여주고 있습니다. 특히 기술적 역량이 뛰어나며 팀을 잘 이끌고 있습니다.',
      employeeComment: '이번 분기에는 프로젝트 관리와 팀 리더십에 집중했습니다. 다음 분기에는 문서화와 시간 관리에 더 신경쓰겠습니다.',
      status: 'finalized',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20',
      reviewedBy: '이매니저'
    },
    {
      id: 2,
      employeeId: 1002,
      employeeName: '이프론트',
      department: '개발팀',
      position: '프론트엔드 개발자',
      reviewPeriod: '2024 Q1',
      overallRating: 4.0,
      goals: [
        {
          id: 1,
          title: 'UI/UX 개선',
          description: '사용자 인터페이스 개선 프로젝트 완료',
          target: '100%',
          achievement: 100,
          status: 'completed'
        }
      ],
      competencies: [
        {
          id: 1,
          name: '기술적 역량',
          rating: 4,
          comment: 'React와 TypeScript를 잘 활용함'
        },
        {
          id: 2,
          name: '창의성',
          rating: 5,
          comment: '사용자 경험을 고려한 창의적인 솔루션 제시'
        }
      ],
      strengths: ['UI/UX 디자인', '사용자 중심 사고', '기술 학습'],
      improvements: ['백엔드 이해도', '프로젝트 관리'],
      managerComment: 'UI/UX 개선에 대한 열정이 뛰어나며 사용자 중심의 사고를 잘 하고 있습니다.',
      employeeComment: '사용자 경험을 개선하는 것에 집중했습니다. 앞으로는 백엔드 지식도 쌓아가겠습니다.',
      status: 'reviewed',
      createdAt: '2024-01-16',
      updatedAt: '2024-01-19',
      reviewedBy: '김개발'
    }
  ];

  useEffect(() => {
    loadPerformanceData();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, searchTerm, statusFilter, departmentFilter]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReviews(sampleData);
    } catch (error) {
      console.error('성과 데이터 로드 오류:', error);
      setError('성과 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = reviews;

    if (searchTerm) {
      filtered = filtered.filter(review =>
        review.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(review => review.status === statusFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(review => review.department === departmentFilter);
    }

    setFilteredReviews(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="초안" color="default" size="small" />;
      case 'submitted':
        return <Chip label="제출됨" color="info" size="small" />;
      case 'reviewed':
        return <Chip label="검토됨" color="warning" size="small" />;
      case 'approved':
        return <Chip label="승인됨" color="primary" size="small" />;
      case 'finalized':
        return <Chip label="완료" color="success" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getGoalStatusChip = (status: string) => {
    switch (status) {
      case 'not_started':
        return <Chip label="시작전" color="default" size="small" />;
      case 'in_progress':
        return <Chip label="진행중" color="info" size="small" />;
      case 'completed':
        return <Chip label="완료" color="success" size="small" />;
      case 'exceeded':
        return <Chip label="초과달성" color="primary" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const handleViewReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setViewMode('view');
  };

  const handleEditReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setOpenDialog(true);
  };

  const handleDeleteReview = async (id: number) => {
    if (window.confirm('정말로 이 성과 평가를 삭제하시겠습니까?')) {
      try {
        setReviews(prev => prev.filter(review => review.id !== id));
        setSuccess('성과 평가가 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const averageRating = reviews.reduce((sum, review) => sum + review.overallRating, 0) / reviews.length;
  const completedReviews = reviews.filter(review => review.status === 'finalized').length;
  const pendingReviews = reviews.filter(review => review.status === 'submitted').length;
  const totalGoals = reviews.reduce((sum, review) => sum + review.goals.length, 0);
  const completedGoals = reviews.reduce((sum, review) => 
    sum + review.goals.filter(goal => goal.status === 'completed' || goal.status === 'exceeded').length, 0
  );

  const paginatedReviews = filteredReviews.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const departments = Array.from(new Set(reviews.map(review => review.department)));

  if (viewMode === 'view' && selectedReview) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            성과 평가 상세
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
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h5" fontWeight="bold">
                  {selectedReview.employeeName}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {selectedReview.position} • {selectedReview.department}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  평가 기간: {selectedReview.reviewPeriod}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" color="primary.main">
                  {selectedReview.overallRating}
                </Typography>
                <Rating value={selectedReview.overallRating} readOnly precision={0.1} />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 목표 달성 현황 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>목표 달성 현황</Typography>
              {selectedReview.goals.map((goal) => (
                <Card key={goal.id} sx={{ mb: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {goal.title}
                    </Typography>
                    {getGoalStatusChip(goal.status)}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {goal.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">
                      목표: {goal.target} | 달성: {goal.achievement}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={goal.achievement} 
                      sx={{ width: 200, ml: 2 }}
                    />
                  </Box>
                </Card>
              ))}
            </Box>

            {/* 역량 평가 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>역량 평가</Typography>
              {selectedReview.competencies.map((competency) => (
                <Box key={competency.id} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {competency.name}
                    </Typography>
                    <Rating value={competency.rating} readOnly />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {competency.comment}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* 강점 및 개선사항 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
              <Box>
                <Typography variant="h6" gutterBottom>강점</Typography>
                <List>
                  {selectedReview.strengths.map((strength, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                          <CheckCircleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={strength} />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom>개선사항</Typography>
                <List>
                  {selectedReview.improvements.map((improvement, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
                          <TrendingUpIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={improvement} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>

            {/* 코멘트 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>관리자 코멘트</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  {selectedReview.managerComment}
                </Typography>
              </Card>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>직원 코멘트</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  {selectedReview.employeeComment}
                </Typography>
              </Card>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditReview(selectedReview)}
              >
                수정
              </Button>
              <Button
                variant="contained"
                startIcon={<AssessmentIcon />}
              >
                인쇄
              </Button>
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
          <AssessmentIcon />
          성과 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          성과 평가 생성
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
              평균 평가 점수
            </Typography>
            <Typography variant="h4">
              {averageRating.toFixed(1)}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              완료된 평가
            </Typography>
            <Typography variant="h4">
              {completedReviews}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              대기중인 평가
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingReviews}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              목표 달성률
            </Typography>
            <Typography variant="h4">
              {totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%
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
              placeholder="직원명, 부서, 직책 검색"
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
                <MenuItem value="reviewed">검토됨</MenuItem>
                <MenuItem value="approved">승인됨</MenuItem>
                <MenuItem value="finalized">완료</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>부서</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDepartmentFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 성과 평가 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>직원 정보</TableCell>
                <TableCell>평가 기간</TableCell>
                <TableCell>평가 점수</TableCell>
                <TableCell>목표 수</TableCell>
                <TableCell>달성률</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedReviews.map((review) => (
                <TableRow key={review.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {review.employeeName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {review.position} • {review.department}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{review.reviewPeriod}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" color="primary.main">
                        {review.overallRating}
                      </Typography>
                      <Rating value={review.overallRating} readOnly size="small" />
                    </Box>
                  </TableCell>
                  <TableCell>{review.goals.length}</TableCell>
                  <TableCell>
                    {review.goals.length > 0 
                      ? Math.round((review.goals.filter(goal => goal.status === 'completed' || goal.status === 'exceeded').length / review.goals.length) * 100)
                      : 0}%
                  </TableCell>
                  <TableCell>{getStatusChip(review.status)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewReview(review)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditReview(review)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteReview(review.id)}>
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
            count={Math.ceil(filteredReviews.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 성과 평가 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedReview ? '성과 평가 수정' : '성과 평가 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              성과 평가 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              성과 평가 생성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedReview ? '수정' : '생성'}
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

export default PerformanceManagement;
