import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
  InputAdornment,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Announcement as AnnouncementIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as PriorityIcon,
  Public as PublicIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Edit as DraftIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarTodayIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  Timeline as TimelineIcon,
  AttachFile as AttachFileIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface Notice {
  id: number;
  title: string;
  content: string;
  category: 'general' | 'urgent' | 'maintenance' | 'policy' | 'event';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'archived';
  isPublic: boolean;
  targetAudience: 'all' | 'employees' | 'managers' | 'specific';
  author: string;
  authorId: number;
  createdAt: string;
  publishedAt?: string;
  expiresAt?: string;
  attachments?: string[];
  readCount: number;
  views: number;
}

const NoticeManagement: React.FC = () => {
  const { user } = useStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleNotices: Notice[] = [
    {
      id: 1,
      title: '시스템 정기 점검 안내',
      content: '2024년 2월 15일 오전 2시부터 오전 6시까지 시스템 정기 점검이 진행됩니다. 이 시간 동안 서비스 이용이 제한될 수 있으니 양해 부탁드립니다.',
      category: 'maintenance',
      priority: 'high',
      status: 'published',
      isPublic: true,
      targetAudience: 'all',
      author: '시스템 관리자',
      authorId: 1,
      createdAt: '2024-01-15 09:00:00',
      publishedAt: '2024-01-15 09:00:00',
      expiresAt: '2024-02-16 00:00:00',
      attachments: ['점검일정표.pdf'],
      readCount: 45,
      views: 67
    },
    {
      id: 2,
      title: '신규 직원 환영 인사',
      content: '이번 달에 새롭게 합류한 직원들을 환영합니다. 함께 성장하는 팀이 되도록 노력하겠습니다.',
      category: 'general',
      priority: 'medium',
      status: 'published',
      isPublic: true,
      targetAudience: 'employees',
      author: '인사팀',
      authorId: 2,
      createdAt: '2024-01-10 14:30:00',
      publishedAt: '2024-01-10 14:30:00',
      readCount: 23,
      views: 34
    },
    {
      id: 3,
      title: '보안 정책 업데이트',
      content: '회사 보안 정책이 업데이트되었습니다. 모든 직원은 새로운 정책을 숙지하고 준수해 주시기 바랍니다.',
      category: 'policy',
      priority: 'urgent',
      status: 'published',
      isPublic: false,
      targetAudience: 'employees',
      author: '보안팀',
      authorId: 3,
      createdAt: '2024-01-08 11:00:00',
      publishedAt: '2024-01-08 11:00:00',
      attachments: ['보안정책_v2.0.pdf'],
      readCount: 78,
      views: 89
    },
    {
      id: 4,
      title: '연말 행사 안내',
      content: '2024년 연말 행사가 12월 20일 오후 6시에 회사 대강당에서 개최됩니다. 많은 참석 부탁드립니다.',
      category: 'event',
      priority: 'medium',
      status: 'draft',
      isPublic: true,
      targetAudience: 'all',
      author: '행사팀',
      authorId: 4,
      createdAt: '2024-01-05 16:20:00',
      readCount: 0,
      views: 0
    },
    {
      id: 5,
      title: '긴급 서버 장애 복구 완료',
      content: '오늘 오전 발생한 서버 장애가 완전히 복구되었습니다. 서비스 이용에 불편을 드려 죄송합니다.',
      category: 'urgent',
      priority: 'urgent',
      status: 'published',
      isPublic: true,
      targetAudience: 'all',
      author: '기술팀',
      authorId: 5,
      createdAt: '2024-01-03 10:15:00',
      publishedAt: '2024-01-03 10:15:00',
      readCount: 156,
      views: 203
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterNotices();
  }, [notices, searchTerm, categoryFilter, priorityFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNotices(sampleNotices);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterNotices = () => {
    let filtered = notices;

    if (searchTerm) {
      filtered = filtered.filter(notice =>
        notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(notice => notice.category === categoryFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(notice => notice.priority === priorityFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(notice => notice.status === statusFilter);
    }

    setFilteredNotices(filtered);
  };

  const getCategoryChip = (category: string) => {
    switch (category) {
      case 'general':
        return <Chip label="일반" color="default" size="small" />;
      case 'urgent':
        return <Chip label="긴급" color="error" size="small" />;
      case 'maintenance':
        return <Chip label="점검" color="warning" size="small" />;
      case 'policy':
        return <Chip label="정책" color="info" size="small" />;
      case 'event':
        return <Chip label="행사" color="success" size="small" />;
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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="임시저장" color="default" size="small" />;
      case 'published':
        return <Chip label="게시됨" color="success" size="small" />;
      case 'archived':
        return <Chip label="보관됨" color="info" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getTargetAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all':
        return '전체';
      case 'employees':
        return '직원';
      case 'managers':
        return '관리자';
      case 'specific':
        return '특정 대상';
      default:
        return '알 수 없음';
    }
  };

  const handleViewNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    setViewMode('view');
  };

  const handleEditNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    setOpenDialog(true);
  };

  const handleDeleteNotice = async (id: number) => {
    if (window.confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      try {
        setNotices(prev => prev.filter(notice => notice.id !== id));
        setSuccess('공지사항이 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handlePublishNotice = (id: number) => {
    setNotices(prev =>
      prev.map(notice =>
        notice.id === id 
          ? { 
              ...notice, 
              status: 'published' as const,
              publishedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : notice
      )
    );
    setSuccess('공지사항이 게시되었습니다.');
  };

  const handleArchiveNotice = (id: number) => {
    setNotices(prev =>
      prev.map(notice =>
        notice.id === id 
          ? { ...notice, status: 'archived' as const } 
          : notice
      )
    );
    setSuccess('공지사항이 보관되었습니다.');
  };

  const totalNotices = notices.length;
  const publishedNotices = notices.filter(notice => notice.status === 'published').length;
  const draftNotices = notices.filter(notice => notice.status === 'draft').length;
  const urgentNotices = notices.filter(notice => notice.priority === 'urgent').length;

  const paginatedNotices = filteredNotices.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'view' && selectedNotice) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AnnouncementIcon />
            공지사항 상세
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
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {selectedNotice.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {getCategoryChip(selectedNotice.category)}
                {getPriorityChip(selectedNotice.priority)}
                {getStatusChip(selectedNotice.status)}
                {selectedNotice.isPublic ? (
                  <Chip label="공개" color="success" size="small" />
                ) : (
                  <Chip label="비공개" color="default" size="small" />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                대상: {getTargetAudienceLabel(selectedNotice.targetAudience)} • 
                작성자: {selectedNotice.author} • 
                작성일: {selectedNotice.createdAt}
                {selectedNotice.publishedAt && ` • 게시일: ${selectedNotice.publishedAt}`}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {selectedNotice.content}
              </Typography>
            </Box>

            {selectedNotice.attachments && selectedNotice.attachments.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>첨부파일</Typography>
                <List>
                  {selectedNotice.attachments.map((attachment, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <AttachFileIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={attachment}
                        secondary="다운로드"
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  조회수: {selectedNotice.views}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  읽음: {selectedNotice.readCount}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditNotice(selectedNotice)}
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
          <AnnouncementIcon />
          공지사항 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          공지사항 작성
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
              총 공지사항
            </Typography>
            <Typography variant="h4" color="primary.main">
              {totalNotices}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              게시된 공지사항
            </Typography>
            <Typography variant="h4" color="success.main">
              {publishedNotices}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              임시저장
            </Typography>
            <Typography variant="h4" color="warning.main">
              {draftNotices}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              긴급 공지사항
            </Typography>
            <Typography variant="h4" color="error.main">
              {urgentNotices}
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
              placeholder="제목, 내용, 작성자 검색"
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
              <InputLabel>카테고리</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="general">일반</MenuItem>
                <MenuItem value="urgent">긴급</MenuItem>
                <MenuItem value="maintenance">점검</MenuItem>
                <MenuItem value="policy">정책</MenuItem>
                <MenuItem value="event">행사</MenuItem>
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
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="draft">임시저장</MenuItem>
                <MenuItem value="published">게시됨</MenuItem>
                <MenuItem value="archived">보관됨</MenuItem>
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('');
                setPriorityFilter('');
                setStatusFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 공지사항 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>제목</TableCell>
                <TableCell>카테고리</TableCell>
                <TableCell>우선순위</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작성자</TableCell>
                <TableCell>작성일</TableCell>
                <TableCell>조회수</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedNotices.map((notice) => (
                <TableRow key={notice.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {notice.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 300
                      }}>
                        {notice.content}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{getCategoryChip(notice.category)}</TableCell>
                  <TableCell>{getPriorityChip(notice.priority)}</TableCell>
                  <TableCell>{getStatusChip(notice.status)}</TableCell>
                  <TableCell>{notice.author}</TableCell>
                  <TableCell>{notice.createdAt}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {notice.views}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewNotice(notice)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditNotice(notice)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {notice.status === 'draft' && (
                        <Tooltip title="게시">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePublishNotice(notice.id)}
                            color="success"
                          >
                            <SendIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {notice.status === 'published' && (
                        <Tooltip title="보관">
                          <IconButton 
                            size="small" 
                            onClick={() => handleArchiveNotice(notice.id)}
                            color="info"
                          >
                            <VisibilityOffIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteNotice(notice.id)}>
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
            count={Math.ceil(filteredNotices.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 공지사항 작성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedNotice ? '공지사항 수정' : '공지사항 작성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              공지사항 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              공지사항 작성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedNotice ? '수정' : '작성'}
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

export default NoticeManagement;
