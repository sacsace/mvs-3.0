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
  Tooltip,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Avatar,
  List,
  ListItem,
  CircularProgress,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
  Rating,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
  Grid
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
  Schedule as ScheduleIcon,
  Add as AddCircleIcon,
  Remove as RemoveCircleIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { performanceService, api } from '../../services/api';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

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
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    user_id: '',
    review_period: '',
    overall_rating: 0,
    goals: [] as any[],
    competencies: [] as any[],
    strengths: [] as string[],
    improvements: [] as string[],
    manager_comment: '',
    employee_comment: ''
  });
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target: '', achievement: 0, status: 'not_started' as const });
  const [newCompetency, setNewCompetency] = useState({ name: '', rating: 0, comment: '' });
  const [newStrength, setNewStrength] = useState('');
  const [newImprovement, setNewImprovement] = useState('');
  const [saving, setSaving] = useState(false);

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
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', {
        params: {
          status: 'active'
        }
      });
      if (response.data.success) {
        setUsers(response.data.data || []);
      }
    } catch (error: any) {
      console.error('사용자 목록 조회 오류:', error);
    }
  };

  useEffect(() => {
    filterReviews();
  }, [reviews, searchTerm, statusFilter, departmentFilter]);

  const loadPerformanceData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await performanceService.getPerformances();
      if (response.success) {
        const performanceData: PerformanceReview[] = (response.data || []).map((p: any) => ({
          id: p.id,
          employeeId: p.user_id,
          employeeName: p.user?.username || '알 수 없음',
          department: p.user?.department || '-',
          position: p.user?.position || '-',
          reviewPeriod: p.review_period || '',
          overallRating: parseFloat(p.overall_rating || 0),
          goals: Array.isArray(p.goals) ? p.goals : [],
          competencies: Array.isArray(p.competencies) ? p.competencies : [],
          strengths: Array.isArray(p.strengths) ? p.strengths : [],
          improvements: Array.isArray(p.improvements) ? p.improvements : [],
          managerComment: p.manager_comment || '',
          employeeComment: p.employee_comment || '',
          status: p.status || 'draft',
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString(),
          reviewedBy: p.reviewer?.username || ''
        }));
        setReviews(performanceData);
      } else {
        setError(response.message || '성과 데이터를 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      console.error('성과 데이터 로드 오류:', error);
      setError(error.response?.data?.message || '성과 데이터를 불러오는데 실패했습니다.');
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

  const handleAdd = () => {
    setSelectedReview(null);
    setEditingReview(null);
    setFormData({
      user_id: '',
      review_period: '',
      overall_rating: 0,
      goals: [],
      competencies: [],
      strengths: [],
      improvements: [],
      manager_comment: '',
      employee_comment: ''
    });
    setNewGoal({ title: '', description: '', target: '', achievement: 0, status: 'not_started' });
    setNewCompetency({ name: '', rating: 0, comment: '' });
    setNewStrength('');
    setNewImprovement('');
    setViewMode('create');
  };

  const handleEditReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setEditingReview(review);
    setFormData({
      user_id: review.employeeId.toString(),
      review_period: review.reviewPeriod,
      overall_rating: review.overallRating,
      goals: review.goals,
      competencies: review.competencies,
      strengths: review.strengths,
      improvements: review.improvements,
      manager_comment: review.managerComment,
      employee_comment: review.employeeComment || ''
    });
    setViewMode('edit');
  };

  const handleSave = async () => {
    if (!formData.user_id || !formData.review_period || !formData.manager_comment) {
      setError('필수 필드를 입력해주세요.');
      return;
    }

    if (formData.goals.length === 0) {
      setError('최소 1개 이상의 목표를 추가해주세요.');
      return;
    }

    if (formData.competencies.length === 0) {
      setError('최소 1개 이상의 역량을 추가해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const performanceData = {
        user_id: parseInt(formData.user_id),
        review_period: formData.review_period,
        overall_rating: formData.overall_rating,
        goals: formData.goals,
        competencies: formData.competencies,
        strengths: formData.strengths,
        improvements: formData.improvements,
        manager_comment: formData.manager_comment,
        employee_comment: formData.employee_comment || null
      };

      let response;
      if (editingReview) {
        response = await performanceService.updatePerformance(editingReview.id, performanceData);
      } else {
        response = await performanceService.createPerformance(performanceData);
      }

      if (response.success) {
        setSuccess(editingReview ? '성과 평가가 수정되었습니다.' : '성과 평가가 생성되었습니다.');
        setViewMode('list');
        setEditingReview(null);
        setSelectedReview(null);
        loadPerformanceData();
      } else {
        setError(response.message || '성과 평가 저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('성과 평가 저장 오류:', error);
      setError(error.response?.data?.message || '성과 평가 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const addGoal = () => {
    if (!newGoal.title || !newGoal.description || !newGoal.target) {
      setError('목표의 제목, 설명, 목표값을 모두 입력해주세요.');
      return;
    }
    setFormData({
      ...formData,
      goals: [...formData.goals, { ...newGoal, id: Date.now() }]
    });
    setNewGoal({ title: '', description: '', target: '', achievement: 0, status: 'not_started' });
  };

  const removeGoal = (index: number) => {
    setFormData({
      ...formData,
      goals: formData.goals.filter((_, i) => i !== index)
    });
  };

  const addCompetency = () => {
    if (!newCompetency.name || !newCompetency.comment) {
      setError('역량의 이름과 코멘트를 모두 입력해주세요.');
      return;
    }
    setFormData({
      ...formData,
      competencies: [...formData.competencies, { ...newCompetency, id: Date.now() }]
    });
    setNewCompetency({ name: '', rating: 0, comment: '' });
  };

  const removeCompetency = (index: number) => {
    setFormData({
      ...formData,
      competencies: formData.competencies.filter((_, i) => i !== index)
    });
  };

  const addStrength = () => {
    if (!newStrength.trim()) {
      setError('강점을 입력해주세요.');
      return;
    }
    setFormData({
      ...formData,
      strengths: [...formData.strengths, newStrength.trim()]
    });
    setNewStrength('');
  };

  const removeStrength = (index: number) => {
    setFormData({
      ...formData,
      strengths: formData.strengths.filter((_, i) => i !== index)
    });
  };

  const addImprovement = () => {
    if (!newImprovement.trim()) {
      setError('개선사항을 입력해주세요.');
      return;
    }
    setFormData({
      ...formData,
      improvements: [...formData.improvements, newImprovement.trim()]
    });
    setNewImprovement('');
  };

  const removeImprovement = (index: number) => {
    setFormData({
      ...formData,
      improvements: formData.improvements.filter((_, i) => i !== index)
    });
  };

  const handleDeleteReview = async (id: number) => {
    showConfirm(
      '정말로 이 성과 평가를 삭제하시겠습니까?',
      async () => {
      try {
        const response = await performanceService.deletePerformance(id);
        if (response.success) {
          setSuccess('성과 평가가 성공적으로 삭제되었습니다.');
          loadPerformanceData();
        } else {
          setError(response.message || '성과 평가 삭제에 실패했습니다.');
        }
      } catch (error: any) {
        console.error('삭제 오류:', error);
        setError(error.response?.data?.message || '삭제 중 오류가 발생했습니다.');
      }
      },
      { confirmColor: 'error' }
    );
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{ 
            fontSize: '16px !important',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.5
          }}>
            성과 관리
          </Typography>
        </Box>
        {viewMode === 'list' && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
            onClick={handleAdd}
          sx={{ borderRadius: 2 }}
        >
          성과 평가 생성
        </Button>
        )}
      </Box>

      {/* 탭 네비게이션 */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <Card sx={{ mb: 3 }}>
          <Tabs 
            value={viewMode === 'create' ? 0 : 1} 
            onChange={(e, newValue) => {
              if (newValue === 0) {
                setViewMode('list');
              }
            }}
          >
            <Tab label="성과 평가 목록" onClick={() => setViewMode('list')} />
            <Tab label={viewMode === 'create' ? '성과 평가 생성' : '성과 평가 수정'} disabled />
          </Tabs>
        </Card>
      )}

      {/* 성과 평가 생성/수정 폼 */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 기본 정보 섹션 */}
          <Card sx={{ boxShadow: 2, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 4, 
                  fontWeight: 600, 
                  color: 'primary.main',
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main'
                }}
              >
                기본 정보
              </Typography>
              <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Autocomplete
                    options={users}
                    getOptionLabel={(option) => `${option.username}${option.department ? ` (${option.department})` : ''}`}
                    value={users.find(u => u.id.toString() === formData.user_id) || null}
                    onChange={(event, newValue) => {
                      setFormData({ ...formData, user_id: newValue?.id.toString() || '' });
                    }}
                    disabled={!!editingReview}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="직원 *"
                        required
                        placeholder="직원을 선택하세요"
                        size="small"
                        fullWidth
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                            bgcolor: 'background.paper',
                            height: '40px',
                            '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                            '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                          },
                          '& .MuiInputLabel-root': {
                            transform: 'translate(14px, 9px) scale(1)',
                            '&.MuiInputLabel-shrink': {
                              transform: 'translate(14px, -9px) scale(0.75)'
                            }
                          },
                          '& .MuiInputBase-input': {
                            py: '10px',
                            px: '14px'
                          }
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body1">{option.username}</Typography>
                          {option.department && (
                            <Typography variant="caption" color="text.secondary">
                              {option.department} {option.position ? `· ${option.position}` : ''}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="평가 기간 *"
                    value={formData.review_period}
                    onChange={(e) => setFormData({ ...formData, review_period: e.target.value })}
                    placeholder="예: 2024 Q1, 2024 상반기"
                    required
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        height: '40px',
                        '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                        '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                      },
                      '& .MuiInputLabel-root': {
                        transform: 'translate(14px, 9px) scale(1)',
                        '&.MuiInputLabel-shrink': {
                          transform: 'translate(14px, -9px) scale(0.75)'
                        }
                      },
                      '& .MuiInputBase-input': {
                        py: '10px',
                        px: '14px'
                      }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth size="small" sx={{ height: '40px' }}>
                    <InputLabel 
                      sx={{
                        transform: 'translate(14px, 9px) scale(1)',
                        '&.MuiInputLabel-shrink': {
                          transform: 'translate(14px, -9px) scale(0.75)'
                        }
                      }}
                    >
                      전체 평점
                    </InputLabel>
                    <Select
                      value={formData.overall_rating}
                      onChange={(e) => setFormData({ ...formData, overall_rating: e.target.value as number })}
                      label="전체 평점"
                      sx={{
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        height: '40px',
                        '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                        '& .MuiSelect-select': {
                          py: '10px',
                          px: '14px',
                          display: 'flex',
                          alignItems: 'center'
                        }
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5].map(rating => (
                        <MenuItem key={rating} value={rating}>{rating}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 목표 섹션 */}
          <Card sx={{ boxShadow: 2, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 600, 
                  color: 'primary.main',
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main'
                }}
              >
                목표
              </Typography>
              
              {/* 추가된 목표 목록 */}
              {formData.goals.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  {formData.goals.map((goal, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2, p: 2.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                            {goal.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {goal.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip label={`목표: ${goal.target}`} size="small" color="primary" variant="outlined" />
                            <Chip label={`달성: ${goal.achievement}%`} size="small" color="success" variant="outlined" />
                            <Chip 
                              label={
                                goal.status === 'not_started' ? '시작전' :
                                goal.status === 'in_progress' ? '진행중' :
                                goal.status === 'completed' ? '완료' : '초과달성'
                              } 
                              size="small" 
                              color={
                                goal.status === 'completed' || goal.status === 'exceeded' ? 'success' :
                                goal.status === 'in_progress' ? 'warning' : 'default'
                              }
                            />
                          </Box>
                        </Box>
                        <IconButton onClick={() => removeGoal(index)} color="error" size="small" sx={{ ml: 2 }}>
                          <RemoveCircleIcon />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}

              {/* 목표 추가 폼 */}
              <Card variant="outlined" sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="목표 제목 *"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="목표값 *"
                      value={newGoal.target}
                      onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                      placeholder="예: 95%, 100개"
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="달성률 (%)"
                      value={newGoal.achievement}
                      onChange={(e) => setNewGoal({ ...newGoal, achievement: parseFloat(e.target.value) || 0 })}
                      InputProps={{
                        inputProps: { min: 0, max: 100 }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="설명 *"
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                      multiline
                      rows={3}
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>상태</InputLabel>
                      <Select
                        value={newGoal.status}
                        onChange={(e) => setNewGoal({ ...newGoal, status: e.target.value as any })}
                        label="상태"
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } }
                        }}
                      >
                        <MenuItem value="not_started">시작전</MenuItem>
                        <MenuItem value="in_progress">진행중</MenuItem>
                        <MenuItem value="completed">완료</MenuItem>
                        <MenuItem value="exceeded">초과달성</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddCircleIcon />}
                      onClick={addGoal}
                      fullWidth
                      sx={{
                        borderRadius: 1.5,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 600
                      }}
                    >
                      목표 추가
                    </Button>
                  </Grid>
                </Grid>
              </Card>
            </CardContent>
          </Card>

          {/* 역량 평가 섹션 */}
          <Card sx={{ boxShadow: 2, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 600, 
                  color: 'primary.main',
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main'
                }}
              >
                역량 평가
              </Typography>
              
              {/* 추가된 역량 목록 */}
              {formData.competencies.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  {formData.competencies.map((competency, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2, p: 2.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {competency.name}
                            </Typography>
                            <Rating value={competency.rating} readOnly size="small" />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {competency.comment}
                          </Typography>
                        </Box>
                        <IconButton onClick={() => removeCompetency(index)} color="error" size="small" sx={{ ml: 2 }}>
                          <RemoveCircleIcon />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}

              {/* 역량 추가 폼 */}
              <Card variant="outlined" sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="역량 이름 *"
                      value={newCompetency.name}
                      onChange={(e) => setNewCompetency({ ...newCompetency, name: e.target.value })}
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>평점</InputLabel>
                      <Select
                        value={newCompetency.rating}
                        onChange={(e) => setNewCompetency({ ...newCompetency, rating: e.target.value as number })}
                        label="평점"
                        sx={{
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '& .MuiSelect-select': {
                            display: 'flex',
                            alignItems: 'center'
                          }
                        }}
                      >
                        {[0, 1, 2, 3, 4, 5].map(rating => (
                          <MenuItem key={rating} value={rating}>{rating}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="코멘트 *"
                      value={newCompetency.comment}
                      onChange={(e) => setNewCompetency({ ...newCompetency, comment: e.target.value })}
                      multiline
                      rows={3}
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddCircleIcon />}
                      onClick={addCompetency}
                      fullWidth
                      sx={{
                        borderRadius: 1.5,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 600
                      }}
                    >
                      역량 추가
                    </Button>
                  </Grid>
                </Grid>
              </Card>
            </CardContent>
          </Card>

          {/* 강점 및 개선사항 섹션 */}
          <Card sx={{ boxShadow: 2, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 600, 
                  color: 'primary.main',
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main'
                }}
              >
                강점 및 개선사항
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    강점
                  </Typography>
                  {formData.strengths.length > 0 && (
                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formData.strengths.map((strength, index) => (
                        <Chip
                          key={index}
                          label={strength}
                          onDelete={() => removeStrength(index)}
                          color="primary"
                          sx={{ borderRadius: 1.5 }}
                        />
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="강점 입력"
                      value={newStrength}
                      onChange={(e) => setNewStrength(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addStrength();
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddCircleIcon />}
                      onClick={addStrength}
                      size="small"
                      sx={{
                        borderRadius: 1.5,
                        px: 2.5,
                        py: 1.25,
                        textTransform: 'none',
                        fontWeight: 600,
                        minWidth: 'auto'
                      }}
                    >
                      추가
                    </Button>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    개선사항
                  </Typography>
                  {formData.improvements.length > 0 && (
                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formData.improvements.map((improvement, index) => (
                        <Chip
                          key={index}
                          label={improvement}
                          onDelete={() => removeImprovement(index)}
                          color="warning"
                          sx={{ borderRadius: 1.5 }}
                        />
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="개선사항 입력"
                      value={newImprovement}
                      onChange={(e) => setNewImprovement(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addImprovement();
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: 'background.paper',
                          '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                          '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddCircleIcon />}
                      onClick={addImprovement}
                      size="small"
                      sx={{
                        borderRadius: 1.5,
                        px: 2.5,
                        py: 1.25,
                        textTransform: 'none',
                        fontWeight: 600,
                        minWidth: 'auto'
                      }}
                    >
                      추가
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 코멘트 섹션 */}
          <Card sx={{ boxShadow: 2, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 600, 
                  color: 'primary.main',
                  pb: 2,
                  borderBottom: '2px solid',
                  borderColor: 'primary.main'
                }}
              >
                코멘트
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="관리자 코멘트 *"
                  value={formData.manager_comment}
                  onChange={(e) => setFormData({ ...formData, manager_comment: e.target.value })}
                  multiline
                  rows={4}
                  required
                  size="small"
                  placeholder="관리자 코멘트를 입력하세요"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      bgcolor: 'background.paper',
                      '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                      '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="직원 코멘트 (선택사항)"
                  value={formData.employee_comment}
                  onChange={(e) => setFormData({ ...formData, employee_comment: e.target.value })}
                  multiline
                  rows={4}
                  size="small"
                  placeholder="직원 코멘트를 입력하세요"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                      bgcolor: 'background.paper',
                      '&:hover': { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } },
                      '&.Mui-focused': { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* 버튼 */}
          <Card sx={{ boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setViewMode('list');
                    setEditingReview(null);
                    setSelectedReview(null);
                  }}
                  disabled={saving}
                  sx={{
                    borderRadius: 1.5,
                    px: 4,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  취소
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : null}
                  sx={{
                    borderRadius: 1.5,
                    px: 4,
                    py: 1.25,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  {saving ? '저장 중...' : (editingReview ? '수정' : '생성')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* 통계 카드 - 목록 모드일 때만 표시 */}
      {viewMode === 'list' && (
        <>
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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredReviews.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {reviews.length === 0 ? '성과 평가가 없습니다.' : '검색 결과가 없습니다.'}
            </Typography>
          </Box>
        ) : (
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
        )}

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
        </>
      )}

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

      {/* 확인 다이얼로그 */}
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

export default PerformanceManagement;
