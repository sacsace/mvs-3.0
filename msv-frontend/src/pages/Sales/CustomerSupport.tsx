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
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  SupportAgent as SupportAgentIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  PriorityHigh as PriorityHighIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Reply as ReplyIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { api } from '../../services/api';

interface SupportTicket {
  id: number;
  customer_id: number;
  customer_name?: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to?: number;
  assigned_user_name?: string;
  created_at: string;
  updated_at: string;
  last_response_at?: string;
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

interface SupportResponse {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name: string;
  response: string;
  created_at: string;
}

const CustomerSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [responses, setResponses] = useState<SupportResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 폼 데이터
  const [formData, setFormData] = useState({
    customer_id: '',
    ticket_number: '',
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'open',
    assigned_to: ''
  });

  const [responseData, setResponseData] = useState({
    response: ''
  });

  useEffect(() => {
    loadTickets();
    loadCustomers();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/support-tickets');
      setTickets(response.data.data || []);
    } catch (error) {
      console.error('지원 티켓 로드 오류:', error);
      showSnackbar('지원 티켓 목록을 불러오는 중 오류가 발생했습니다.', 'error');
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

  const loadResponses = async (ticketId: number) => {
    try {
      const response = await api.get(`/support-tickets/${ticketId}/responses`);
      setResponses(response.data.data || []);
    } catch (error) {
      console.error('지원 응답 로드 오류:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilter = (event: any) => {
    setStatusFilter(event.target.value);
  };

  const handlePriorityFilter = (event: any) => {
    setPriorityFilter(event.target.value);
  };

  const handleCategoryFilter = (event: any) => {
    setCategoryFilter(event.target.value);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const handleCreateTicket = () => {
    setFormData({
      customer_id: '',
      ticket_number: '',
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      status: 'open',
      assigned_to: ''
    });
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEditTicket = (ticket: SupportTicket) => {
    setFormData({
      customer_id: ticket.customer_id.toString(),
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assigned_to: ticket.assigned_to?.toString() || ''
    });
    setSelectedTicket(ticket);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDialogMode('view');
    setDialogOpen(true);
    loadResponses(ticket.id);
  };

  const handleSaveTicket = async () => {
    try {
      const data = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null
      };

      if (dialogMode === 'create') {
        await api.post('/support-tickets', data);
        showSnackbar('지원 티켓이 성공적으로 등록되었습니다.', 'success');
      } else if (dialogMode === 'edit' && selectedTicket) {
        await api.put(`/support-tickets/${selectedTicket.id}`, data);
        showSnackbar('지원 티켓이 성공적으로 수정되었습니다.', 'success');
      }
      
      setDialogOpen(false);
      loadTickets();
    } catch (error) {
      console.error('지원 티켓 저장 오류:', error);
      showSnackbar('지원 티켓 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteTicket = async (ticket: SupportTicket) => {
    if (window.confirm(`'${ticket.title}' 지원 티켓을 삭제하시겠습니까?`)) {
      try {
        await api.delete(`/support-tickets/${ticket.id}`);
        showSnackbar('지원 티켓이 성공적으로 삭제되었습니다.', 'success');
        loadTickets();
      } catch (error) {
        console.error('지원 티켓 삭제 오류:', error);
        showSnackbar('지원 티켓 삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const handleAddResponse = () => {
    setResponseData({ response: '' });
    setResponseDialogOpen(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedTicket) return;
    
    try {
      await api.post(`/support-tickets/${selectedTicket.id}/responses`, responseData);
      showSnackbar('응답이 성공적으로 등록되었습니다.', 'success');
      setResponseDialogOpen(false);
      loadResponses(selectedTicket.id);
      loadTickets(); // 티켓 목록도 업데이트
    } catch (error) {
      console.error('응답 저장 오류:', error);
      showSnackbar('응답 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '열림';
      case 'in_progress': return '진행중';
      case 'resolved': return '해결됨';
      case 'closed': return '닫힘';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'urgent': return 'error';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
      case 'urgent': return '긴급';
      default: return priority;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'general': return '일반 문의';
      case 'technical': return '기술 지원';
      case 'billing': return '결제 문의';
      case 'feature_request': return '기능 요청';
      case 'bug_report': return '버그 신고';
      case 'complaint': return '불만 사항';
      default: return category;
    }
  };

  const getOpenTickets = () => {
    return tickets.filter(ticket => ticket.status === 'open').length;
  };

  const getInProgressTickets = () => {
    return tickets.filter(ticket => ticket.status === 'in_progress').length;
  };

  const getResolvedTickets = () => {
    return tickets.filter(ticket => ticket.status === 'resolved').length;
  };

  const getUrgentTickets = () => {
    return tickets.filter(ticket => ticket.priority === 'urgent').length;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SupportAgentIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            고객 지원
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTickets}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateTicket}
          >
            지원 티켓 등록
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
                    총 티켓 수
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {tickets.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SupportAgentIcon />
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
                    열린 티켓
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getOpenTickets()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <WarningIcon />
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
                    진행중 티켓
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getInProgressTickets()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <ScheduleIcon />
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
                    긴급 티켓
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getUrgentTickets()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <PriorityHighIcon />
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
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                placeholder="제목, 티켓번호, 고객명으로 검색..."
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
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilter}
                  label="상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="open">열림</MenuItem>
                  <MenuItem value="in_progress">진행중</MenuItem>
                  <MenuItem value="resolved">해결됨</MenuItem>
                  <MenuItem value="closed">닫힘</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={handlePriorityFilter}
                  label="우선순위"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="urgent">긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={handleCategoryFilter}
                  label="카테고리"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="general">일반 문의</MenuItem>
                  <MenuItem value="technical">기술 지원</MenuItem>
                  <MenuItem value="billing">결제 문의</MenuItem>
                  <MenuItem value="feature_request">기능 요청</MenuItem>
                  <MenuItem value="bug_report">버그 신고</MenuItem>
                  <MenuItem value="complaint">불만 사항</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
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

      {/* 지원 티켓 목록 테이블 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>티켓번호</TableCell>
                  <TableCell>제목</TableCell>
                  <TableCell>고객</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>우선순위</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>담당자</TableCell>
                  <TableCell>등록일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AssignmentIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {ticket.ticket_number}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {ticket.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {ticket.description.length > 50 
                            ? `${ticket.description.substring(0, 50)}...` 
                            : ticket.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {ticket.customer_name?.charAt(0) || 'C'}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {ticket.customer_name || '고객 정보 없음'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getCategoryText(ticket.category)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getPriorityText(ticket.priority)}
                        color={getPriorityColor(ticket.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(ticket.status)}
                        color={getStatusColor(ticket.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {ticket.assigned_user_name || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="보기">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTicket(ticket)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="수정">
                          <IconButton
                            size="small"
                            onClick={() => handleEditTicket(ticket)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTicket(ticket)}
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

      {/* 지원 티켓 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' && '새 지원 티켓 등록'}
          {dialogMode === 'edit' && '지원 티켓 수정'}
          {dialogMode === 'view' && '지원 티켓 보기'}
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
                label="티켓번호"
                value={formData.ticket_number}
                onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="제목"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="카테고리"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="general">일반 문의</MenuItem>
                  <MenuItem value="technical">기술 지원</MenuItem>
                  <MenuItem value="billing">결제 문의</MenuItem>
                  <MenuItem value="feature_request">기능 요청</MenuItem>
                  <MenuItem value="bug_report">버그 신고</MenuItem>
                  <MenuItem value="complaint">불만 사항</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="우선순위"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="urgent">긴급</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="상태"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="open">열림</MenuItem>
                  <MenuItem value="in_progress">진행중</MenuItem>
                  <MenuItem value="resolved">해결됨</MenuItem>
                  <MenuItem value="closed">닫힘</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="설명"
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
          </Grid>

          {/* 응답 목록 (보기 모드에서만) */}
          {dialogMode === 'view' && selectedTicket && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">응답 목록</Typography>
                <Button
                  variant="contained"
                  startIcon={<ReplyIcon />}
                  onClick={handleAddResponse}
                >
                  응답 추가
                </Button>
              </Box>
              <List>
                {responses.map((response) => (
                  <ListItem key={response.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={response.user_name}
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {response.response}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(response.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {dialogMode === 'view' ? '닫기' : '취소'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveTicket} variant="contained">
              {dialogMode === 'create' ? '등록' : '수정'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 응답 추가 다이얼로그 */}
      <Dialog open={responseDialogOpen} onClose={() => setResponseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>응답 추가</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="응답 내용"
            multiline
            rows={4}
            value={responseData.response}
            onChange={(e) => setResponseData({ response: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialogOpen(false)}>취소</Button>
          <Button onClick={handleSaveResponse} variant="contained">등록</Button>
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

export default CustomerSupport;