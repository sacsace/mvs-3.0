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
  Grid,
  Divider,
  Stack,
  Avatar,
  Badge
} from '@mui/material';
import {
  Announcement as AnnouncementIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  PriorityHigh as PriorityHighIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';

interface Notice {
  id: number;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  status: 'published' | 'draft' | 'archived';
  publishDate: string;
  expiryDate?: string;
  views: number;
  attachments?: string[];
  isRead?: boolean;
}

const NoticeBoard: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    category: 'general',
    expiryDate: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 데이터
  const sampleNotices: Notice[] = [
    {
      id: 1,
      title: '2024년 1분기 회사 전체 회의 안내',
      content: '안녕하세요. 2024년 1분기 회사 전체 회의를 다음과 같이 진행하고자 합니다.\n\n일시: 2024년 1월 25일 (목) 오후 2시\n장소: 본사 대회의실\n참석자: 전 직원\n\n회의 안건:\n1. 2023년 사업 성과 보고\n2. 2024년 사업 계획 발표\n3. 조직 개편 안내\n4. 기타 안건\n\n회의 준비를 위해 미리 참석 여부를 알려주시기 바랍니다.',
      author: '김대표',
      priority: 'high',
      category: 'meeting',
      status: 'published',
      publishDate: '2024-01-15',
      expiryDate: '2024-01-25',
      views: 45,
      attachments: ['회의안건.pdf'],
      isRead: false
    },
    {
      id: 2,
      title: '사무실 이전 안내',
      content: '사무실 이전 관련 안내드립니다.\n\n새 주소: 서울시 강남구 테헤란로 123, ABC빌딩 10층\n이전일: 2024년 2월 1일 (목)\n\n이전 관련 문의사항은 총무팀으로 연락주시기 바랍니다.',
      author: '이총무',
      priority: 'medium',
      category: 'announcement',
      status: 'published',
      publishDate: '2024-01-10',
      expiryDate: '2024-02-01',
      views: 32,
      isRead: true
    },
    {
      id: 3,
      title: '연말연시 휴무 안내',
      content: '연말연시 휴무 일정을 안내드립니다.\n\n휴무기간: 2023년 12월 29일 ~ 2024년 1월 2일\n정상업무: 2024년 1월 3일 (수)부터\n\n즐거운 연말연시 보내시기 바랍니다.',
      author: '박인사',
      priority: 'medium',
      category: 'holiday',
      status: 'published',
      publishDate: '2023-12-20',
      views: 28,
      isRead: true
    },
    {
      id: 4,
      title: '보안 정책 업데이트',
      content: '회사 보안 정책이 업데이트되었습니다.\n\n주요 변경사항:\n1. 비밀번호 정책 강화\n2. 2단계 인증 의무화\n3. 외부 이메일 첨부파일 제한\n\n자세한 내용은 첨부 파일을 참고해주세요.',
      author: '정보안',
      priority: 'high',
      category: 'security',
      status: 'published',
      publishDate: '2024-01-12',
      views: 38,
      attachments: ['보안정책_업데이트.pdf'],
      isRead: false
    }
  ];

  useEffect(() => {
    loadNotices();
  }, [page, filters]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredNotices = sampleNotices;
      
      if (filters.status) {
        filteredNotices = filteredNotices.filter(notice => notice.status === filters.status);
      }
      
      if (filters.priority) {
        filteredNotices = filteredNotices.filter(notice => notice.priority === filters.priority);
      }
      
      if (filters.category) {
        filteredNotices = filteredNotices.filter(notice => notice.category === filters.category);
      }
      
      if (filters.search) {
        filteredNotices = filteredNotices.filter(notice => 
          notice.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          notice.content.toLowerCase().includes(filters.search.toLowerCase()) ||
          notice.author.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setNotices(filteredNotices);
      setTotalPages(Math.ceil(filteredNotices.length / 10));
    } catch (error) {
      showSnackbar('공지사항 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateNotice = () => {
    setSelectedNotice(null);
    setFormData({
      title: '',
      content: '',
      priority: 'medium',
      category: 'general',
      expiryDate: ''
    });
    setOpenDialog(true);
  };

  const handleEditNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      priority: notice.priority,
      category: notice.category,
      expiryDate: notice.expiryDate || ''
    });
    setOpenDialog(true);
  };

  const handleSaveNotice = () => {
    showSnackbar('공지사항이 저장되었습니다.', 'success');
    setOpenDialog(false);
    loadNotices();
  };

  const handleDeleteNotice = (id: number) => {
    if (window.confirm('이 공지사항을 삭제하시겠습니까?')) {
      showSnackbar('공지사항이 삭제되었습니다.', 'success');
      loadNotices();
    }
  };

  const handleViewNotice = (notice: Notice) => {
    // 조회수 증가 및 읽음 처리
    const updatedNotices = notices.map(n => 
      n.id === notice.id ? { ...n, views: n.views + 1, isRead: true } : n
    );
    setNotices(updatedNotices);
    console.log('View notice:', notice);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '긴급';
      case 'medium': return '일반';
      case 'low': return '낮음';
      default: return priority;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'meeting': return '회의';
      case 'announcement': return '공지';
      case 'holiday': return '휴무';
      case 'security': return '보안';
      case 'general': return '일반';
      default: return category;
    }
  };

  const getUnreadCount = () => notices.filter(n => !n.isRead).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          fontWeight: 600,
          color: 'text.primary'
        }}>
          <AnnouncementIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          공지사항
          {getUnreadCount() > 0 && (
            <Badge badgeContent={getUnreadCount()} color="error">
              <Box />
            </Badge>
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          중요한 공지사항과 업무 관련 정보를 확인하는 페이지입니다.
        </Typography>
      </Box>

      {/* 필터 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="제목, 내용, 작성자 검색"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={filters.priority}
                  label="우선순위"
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="high">긴급</MenuItem>
                  <MenuItem value="medium">일반</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={filters.category}
                  label="카테고리"
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="meeting">회의</MenuItem>
                  <MenuItem value="announcement">공지</MenuItem>
                  <MenuItem value="holiday">휴무</MenuItem>
                  <MenuItem value="security">보안</MenuItem>
                  <MenuItem value="general">일반</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFilters({ status: '', priority: '', category: '', search: '' })}
                >
                  필터 초기화
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNotice}
                >
                  새 공지사항
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 공지사항 목록 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>제목</TableCell>
                  <TableCell>작성자</TableCell>
                  <TableCell>우선순위</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>발행일</TableCell>
                  <TableCell>만료일</TableCell>
                  <TableCell>조회수</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notices.map((notice) => (
                  <TableRow key={notice.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {!notice.isRead && (
                          <PriorityHighIcon sx={{ fontSize: '1rem', color: 'error.main', mr: 1 }} />
                        )}
                        <Box>
                          <Typography variant="body2" fontWeight={notice.isRead ? 400 : 600}>
                            {notice.title}
                          </Typography>
                          {notice.attachments && notice.attachments.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <AttachFileIcon sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                              <Typography variant="caption" color="text.secondary">
                                첨부파일 {notice.attachments.length}개
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 1, width: 24, height: 24, fontSize: '0.8rem' }}>
                          {notice.author.charAt(0)}
                        </Avatar>
                        <Typography variant="body2">
                          {notice.author}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPriorityText(notice.priority)}
                        color={getPriorityColor(notice.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getCategoryText(notice.category)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(notice.publishDate).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {notice.views}회
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
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
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDeleteNotice(notice.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* 공지사항 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedNotice ? '공지사항 수정' : '새 공지사항 작성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  label="우선순위"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="high">긴급</MenuItem>
                  <MenuItem value="medium">일반</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  label="카테고리"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="meeting">회의</MenuItem>
                  <MenuItem value="announcement">공지</MenuItem>
                  <MenuItem value="holiday">휴무</MenuItem>
                  <MenuItem value="security">보안</MenuItem>
                  <MenuItem value="general">일반</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="만료일"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="내용"
                multiline
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSaveNotice}>
            저장
          </Button>
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

export default NoticeBoard;