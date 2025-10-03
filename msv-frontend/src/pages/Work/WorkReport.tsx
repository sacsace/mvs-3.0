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
  Grid,
  Tabs,
  Tab,
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
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface WorkReport {
  id: number;
  reportId: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'project' | 'incident' | 'other';
  category: string;
  authorId: number;
  authorName: string;
  authorDepartment: string;
  authorPosition: string;
  content: string;
  summary: string;
  achievements: string[];
  challenges: string[];
  nextSteps: string[];
  attachments: string[];
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportDate: string;
  dueDate?: string;
  reviewerId?: number;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPublic: boolean;
}

const WorkReport: React.FC = () => {
  const { user } = useStore();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleData: WorkReport[] = [
    {
      id: 1,
      reportId: 'WR-2024-001',
      title: 'MVS 3.0 프로젝트 주간 보고서',
      type: 'weekly',
      category: '프로젝트 진행',
      authorId: 1001,
      authorName: '김개발',
      authorDepartment: '개발팀',
      authorPosition: '개발팀장',
      content: '이번 주 MVS 3.0 프로젝트의 주요 진행사항과 성과를 보고드립니다.\n\n1. 백엔드 API 개발 완료\n- 사용자 인증 시스템 구현\n- 메뉴 관리 API 개발\n- 권한 관리 시스템 구축\n\n2. 프론트엔드 UI 개발\n- 대시보드 화면 구현\n- 재고 관리 페이지 개발\n- 견적서 관리 시스템 구축\n\n3. 데이터베이스 설계\n- 사용자 테이블 구조 설계\n- 메뉴 권한 테이블 설계\n- 인덱스 최적화 적용',
      summary: 'MVS 3.0 프로젝트의 핵심 기능들이 성공적으로 구현되었으며, 예정된 일정보다 2일 앞서 진행되고 있습니다.',
      achievements: [
        '백엔드 API 80% 완성',
        '프론트엔드 UI 70% 완성',
        '데이터베이스 설계 완료',
        '테스트 환경 구축 완료'
      ],
      challenges: [
        '복잡한 권한 관리 로직 구현',
        '대용량 데이터 처리 최적화',
        '사용자 인터페이스 일관성 유지'
      ],
      nextSteps: [
        '남은 API 엔드포인트 개발',
        '프론트엔드 컴포넌트 완성',
        '통합 테스트 진행',
        '배포 환경 준비'
      ],
      attachments: ['프로젝트_진행상황.pdf', 'API_문서.pdf', 'UI_목업.png'],
      status: 'approved',
      priority: 'high',
      reportDate: '2024-01-22',
      dueDate: '2024-01-25',
      reviewerId: 2001,
      reviewerName: '이부장',
      reviewComment: '훌륭한 진행상황입니다. 다음 주까지 남은 작업들을 완료해주세요.',
      reviewedAt: '2024-01-23 10:30:00',
      createdAt: '2024-01-22 17:00:00',
      updatedAt: '2024-01-23 10:30:00',
      tags: ['MVS3.0', '프로젝트', '개발', '주간보고서'],
      isPublic: false
    },
    {
      id: 2,
      reportId: 'WR-2024-002',
      title: '재고 관리 시스템 개선 제안',
      type: 'project',
      category: '시스템 개선',
      authorId: 1002,
      authorName: '이프론트',
      authorDepartment: '개발팀',
      authorPosition: '프론트엔드 개발자',
      content: '현재 재고 관리 시스템의 사용성을 개선하기 위한 제안사항을 정리했습니다.\n\n현재 문제점:\n1. 재고 수량 입력이 번거로움\n2. 검색 기능이 제한적\n3. 실시간 업데이트가 되지 않음\n\n개선 방안:\n1. 바코드 스캔 기능 추가\n2. 고급 검색 필터 구현\n3. WebSocket을 이용한 실시간 업데이트\n4. 모바일 반응형 UI 개선',
      summary: '재고 관리 시스템의 사용성을 크게 개선할 수 있는 구체적인 방안을 제시했습니다.',
      achievements: [
        '사용자 피드백 수집 완료',
        '개선 방안 도출',
        '기술적 구현 방안 검토'
      ],
      challenges: [
        '기존 시스템과의 호환성',
        '사용자 교육 필요',
        '개발 리소스 확보'
      ],
      nextSteps: [
        '개선 방안 검토 및 승인',
        '개발 일정 수립',
        '프로토타입 개발',
        '사용자 테스트 진행'
      ],
      attachments: ['개선제안서.pdf', 'UI_목업.png', '기술문서.pdf'],
      status: 'submitted',
      priority: 'medium',
      reportDate: '2024-01-23',
      dueDate: '2024-01-26',
      createdAt: '2024-01-23 14:30:00',
      updatedAt: '2024-01-23 14:30:00',
      tags: ['재고관리', '시스템개선', 'UI/UX', '제안서'],
      isPublic: true
    },
    {
      id: 3,
      reportId: 'WR-2024-003',
      title: '시스템 장애 보고서',
      type: 'incident',
      category: '시스템 장애',
      authorId: 1003,
      authorName: '박백엔드',
      authorDepartment: '개발팀',
      authorPosition: '백엔드 개발자',
      content: '2024년 1월 24일 오전 9시경 발생한 시스템 장애에 대한 보고서입니다.\n\n장애 상황:\n- 발생 시간: 2024-01-24 09:15\n- 복구 시간: 2024-01-24 10:45\n- 장애 지속 시간: 1시간 30분\n- 영향 범위: 전체 사용자\n\n원인 분석:\n데이터베이스 연결 풀이 고갈되어 새로운 연결을 생성할 수 없었습니다.\n\n대응 과정:\n1. 장애 감지 및 알림 발송\n2. 데이터베이스 연결 상태 확인\n3. 연결 풀 재시작\n4. 서비스 정상화 확인\n\n재발 방지 대책:\n1. 연결 풀 모니터링 강화\n2. 자동 복구 시스템 구축\n3. 장애 대응 매뉴얼 보완',
      summary: '데이터베이스 연결 풀 고갈로 인한 1시간 30분간의 서비스 중단이 발생했으나, 신속한 대응으로 복구되었습니다.',
      achievements: [
        '장애 원인 정확히 파악',
        '신속한 복구 작업 완료',
        '재발 방지 대책 수립'
      ],
      challenges: [
        '장애 발생 시점의 정확한 원인 파악',
        '서비스 중단 최소화',
        '사용자 불편 최소화'
      ],
      nextSteps: [
        '모니터링 시스템 강화',
        '자동 복구 시스템 개발',
        '장애 대응 매뉴얼 업데이트',
        '정기 점검 일정 수립'
      ],
      attachments: ['장애보고서.pdf', '로그분석.pdf', '복구과정.pdf'],
      status: 'reviewed',
      priority: 'urgent',
      reportDate: '2024-01-24',
      dueDate: '2024-01-25',
      reviewerId: 2001,
      reviewerName: '이부장',
      reviewComment: '신속한 대응이었습니다. 재발 방지 대책을 즉시 실행해주세요.',
      reviewedAt: '2024-01-24 16:00:00',
      createdAt: '2024-01-24 11:00:00',
      updatedAt: '2024-01-24 16:00:00',
      tags: ['장애', '데이터베이스', '긴급', '복구'],
      isPublic: false
    }
  ];

  useEffect(() => {
    loadReportData();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, statusFilter, typeFilter, priorityFilter]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReports(sampleData);
    } catch (error) {
      console.error('보고서 데이터 로드 오류:', error);
      setError('보고서 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.reportId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(report => report.type === typeFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(report => report.priority === priorityFilter);
    }

    setFilteredReports(filtered);
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
        return <Chip label="승인됨" color="success" size="small" />;
      case 'rejected':
        return <Chip label="반려됨" color="error" size="small" />;
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return '일일 보고서';
      case 'weekly':
        return '주간 보고서';
      case 'monthly':
        return '월간 보고서';
      case 'project':
        return '프로젝트 보고서';
      case 'incident':
        return '장애 보고서';
      case 'other':
        return '기타';
      default:
        return '알 수 없음';
    }
  };

  const handleViewReport = (report: WorkReport) => {
    setSelectedReport(report);
    setViewMode('view');
  };

  const handleEditReport = (report: WorkReport) => {
    setSelectedReport(report);
    setOpenDialog(true);
  };

  const handleDeleteReport = async (id: number) => {
    if (window.confirm('정말로 이 보고서를 삭제하시겠습니까?')) {
      try {
        setReports(prev => prev.filter(report => report.id !== id));
        setSuccess('보고서가 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleApproveReport = (id: number) => {
    setReports(prev =>
      prev.map(report =>
        report.id === id 
          ? { 
              ...report, 
              status: 'approved' as const,
              reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : report
      )
    );
    setSuccess('보고서가 승인되었습니다.');
  };

  const handleRejectReport = (id: number) => {
    setReports(prev =>
      prev.map(report =>
        report.id === id 
          ? { 
              ...report, 
              status: 'rejected' as const,
              reviewedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : report
      )
    );
    setSuccess('보고서가 반려되었습니다.');
  };

  const pendingCount = reports.filter(report => report.status === 'submitted' || report.status === 'reviewed').length;
  const approvedCount = reports.filter(report => report.status === 'approved').length;
  const rejectedCount = reports.filter(report => report.status === 'rejected').length;
  const urgentCount = reports.filter(report => report.priority === 'urgent').length;

  const paginatedReports = filteredReports.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'view' && selectedReport) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon />
            업무 보고서 상세
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
                  {selectedReport.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  보고서 번호: {selectedReport.reportId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {getStatusChip(selectedReport.status)}
                  {getPriorityChip(selectedReport.priority)}
                  <Chip label={getTypeLabel(selectedReport.type)} color="primary" size="small" />
                  {selectedReport.isPublic && <Chip label="공개" color="info" size="small" />}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">
                  작성일: {selectedReport.reportDate}
                </Typography>
                {selectedReport.dueDate && (
                  <Typography variant="body2" color="text.secondary">
                    마감일: {selectedReport.dueDate}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 작성자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>작성자 정보</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedReport.authorName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedReport.authorPosition} • {selectedReport.authorDepartment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 요약 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>요약</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1">
                  {selectedReport.summary}
                </Typography>
              </Card>
            </Box>

            {/* 주요 성과 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>주요 성과</Typography>
              <List>
                {selectedReport.achievements.map((achievement, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                        <CheckCircleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={achievement} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* 도전과제 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>도전과제</Typography>
              <List>
                {selectedReport.challenges.map((challenge, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
                        <PendingIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={challenge} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* 다음 단계 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>다음 단계</Typography>
              <List>
                {selectedReport.nextSteps.map((step, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.main', width: 32, height: 32 }}>
                        <ScheduleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* 상세 내용 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>상세 내용</Typography>
              <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {selectedReport.content}
                </Typography>
              </Card>
            </Box>

            {/* 첨부파일 */}
            {selectedReport.attachments.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>첨부파일</Typography>
                <List>
                  {selectedReport.attachments.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AttachFileIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={file} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* 태그 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>태그</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedReport.tags.map((tag, index) => (
                  <Chip key={index} label={tag} variant="outlined" />
                ))}
              </Box>
            </Box>

            {/* 검토 정보 */}
            {selectedReport.reviewerName && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>검토 정보</Typography>
                <Card sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1" gutterBottom>
                    <strong>검토자:</strong> {selectedReport.reviewerName}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>검토일:</strong> {selectedReport.reviewedAt}
                  </Typography>
                  {selectedReport.reviewComment && (
                    <Typography variant="body1">
                      <strong>검토 의견:</strong> {selectedReport.reviewComment}
                    </Typography>
                  )}
                </Card>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditReport(selectedReport)}
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
              {selectedReport.status === 'submitted' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleApproveReport(selectedReport.id)}
                  >
                    승인
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleRejectReport(selectedReport.id)}
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
          <AssignmentIcon />
          업무 보고서
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          보고서 작성
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
              대기중인 보고서
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              승인된 보고서
            </Typography>
            <Typography variant="h4" color="success.main">
              {approvedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              반려된 보고서
            </Typography>
            <Typography variant="h4" color="error.main">
              {rejectedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              긴급 보고서
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
              placeholder="제목, 보고서번호, 작성자, 내용 검색"
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
                <MenuItem value="rejected">반려됨</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="daily">일일 보고서</MenuItem>
                <MenuItem value="weekly">주간 보고서</MenuItem>
                <MenuItem value="monthly">월간 보고서</MenuItem>
                <MenuItem value="project">프로젝트 보고서</MenuItem>
                <MenuItem value="incident">장애 보고서</MenuItem>
                <MenuItem value="other">기타</MenuItem>
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
                setTypeFilter('');
                setPriorityFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 보고서 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>보고서 정보</TableCell>
                <TableCell>작성자</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>우선순위</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작성일</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedReports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {report.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.reportId}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        {report.tags.slice(0, 2).map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                        {report.tags.length > 2 && (
                          <Chip label={`+${report.tags.length - 2}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {report.authorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {report.authorDepartment}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={getTypeLabel(report.type)} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{getPriorityChip(report.priority)}</TableCell>
                  <TableCell>{getStatusChip(report.status)}</TableCell>
                  <TableCell>{report.reportDate}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewReport(report)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditReport(report)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {report.status === 'submitted' && (
                        <>
                          <Tooltip title="승인">
                            <IconButton 
                              size="small" 
                              onClick={() => handleApproveReport(report.id)}
                              color="success"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="반려">
                            <IconButton 
                              size="small" 
                              onClick={() => handleRejectReport(report.id)}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteReport(report.id)}>
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
            count={Math.ceil(filteredReports.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 보고서 작성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedReport ? '보고서 수정' : '보고서 작성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              보고서 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              보고서 작성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedReport ? '수정' : '작성'}
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

export default WorkReport;
