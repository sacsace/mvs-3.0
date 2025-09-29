import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, InputAdornment, Divider,
  Grid, LinearProgress, Tabs, Tab, Badge
} from '@mui/material';
import {
  Support as SupportIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Search as SearchIcon, Download as DownloadIcon, Phone as PhoneIcon, Email as EmailIcon,
  Business as BusinessIcon, Person as PersonIcon, AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon, Description as DescriptionIcon, Star as StarIcon,
  CheckCircle as CheckIcon, Schedule as ScheduleIcon, Warning as WarningIcon,
  Message as MessageIcon, Assignment as AssignmentIcon, PriorityHigh as PriorityIcon
} from '@mui/icons-material';

interface SupportTicket {
  id: number;
  ticketNumber: string;
  customerName: string;
  customerContact: string;
  customerPhone: string;
  customerEmail: string;
  assignedTo: string;
  department: string;
  category: 'technical' | 'billing' | 'general' | 'complaint' | 'feature_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed';
  subject: string;
  description: string;
  solution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  estimatedResolution?: string;
  tags: string[];
}

const CustomerSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 1,
      ticketNumber: 'TKT-2024-001',
      customerName: 'ABC 기업',
      customerContact: '김대표',
      customerPhone: '02-1234-5678',
      customerEmail: 'ceo@abc.com',
      assignedTo: '이지원',
      department: '고객지원팀',
      category: 'technical',
      priority: 'high',
      status: 'in_progress',
      subject: 'ERP 시스템 로그인 오류',
      description: '사용자가 ERP 시스템에 로그인할 수 없는 문제가 발생했습니다. 오류 메시지가 표시되지 않아 원인을 파악하기 어렵습니다.',
      solution: '데이터베이스 연결 문제로 확인됨. 서버 재시작 후 해결 예정.',
      createdAt: '2024-01-20',
      updatedAt: '2024-01-22',
      estimatedResolution: '2024-01-25',
      tags: ['긴급', '시스템오류']
    },
    {
      id: 2,
      ticketNumber: 'TKT-2024-002',
      customerName: 'XYZ 스타트업',
      customerContact: '박CTO',
      customerPhone: '02-9876-5432',
      customerEmail: 'cto@xyz.com',
      assignedTo: '최지원',
      department: '고객지원팀',
      category: 'billing',
      priority: 'medium',
      status: 'pending_customer',
      subject: '청구서 오류 문의',
      description: '이번 달 청구서에 잘못된 금액이 표시되어 있습니다. 확인 부탁드립니다.',
      solution: '청구서 재발행 완료. 고객 확인 대기 중.',
      createdAt: '2024-01-18',
      updatedAt: '2024-01-21',
      resolvedAt: '2024-01-21',
      tags: ['청구서', '오류']
    },
    {
      id: 3,
      ticketNumber: 'TKT-2024-003',
      customerName: 'DEF 제조업',
      customerContact: '이사장',
      customerPhone: '010-1111-2222',
      customerEmail: 'owner@def.com',
      assignedTo: '김지원',
      department: '고객지원팀',
      category: 'feature_request',
      priority: 'low',
      status: 'open',
      subject: '새로운 기능 요청',
      description: '재고 관리 기능에 자동 알림 기능을 추가해주세요.',
      createdAt: '2024-01-22',
      updatedAt: '2024-01-22',
      estimatedResolution: '2024-03-01',
      tags: ['기능요청', '재고관리']
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [formData, setFormData] = useState<Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'resolvedAt'>>({
    ticketNumber: '',
    customerName: '',
    customerContact: '',
    customerPhone: '',
    customerEmail: '',
    assignedTo: '',
    department: '',
    category: 'general',
    priority: 'medium',
    status: 'open',
    subject: '',
    description: '',
    solution: '',
    estimatedResolution: '',
    tags: []
  });

  const handleAdd = () => {
    setSelectedTicket(null);
    setFormData({
      ticketNumber: `TKT-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, '0')}`,
      customerName: '',
      customerContact: '',
      customerPhone: '',
      customerEmail: '',
      assignedTo: '',
      department: '',
      category: 'general',
      priority: 'medium',
      status: 'open',
      subject: '',
      description: '',
      solution: '',
      estimatedResolution: '',
      tags: []
    });
    setOpenDialog(true);
  };

  const handleEdit = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setFormData(ticket);
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedTicket) {
      setTickets(tickets.map(ticket =>
        ticket.id === selectedTicket.id 
          ? { ...ticket, ...formData, updatedAt: new Date().toISOString().split('T')[0] }
          : ticket
      ));
    } else {
      const newTicket: SupportTicket = {
        id: tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1,
        ...formData,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setTickets([...tickets, newTicket]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setTickets(tickets.filter(ticket => ticket.id !== id));
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      open: { label: '오픈', color: 'info' as const },
      in_progress: { label: '진행중', color: 'primary' as const },
      pending_customer: { label: '고객대기', color: 'warning' as const },
      resolved: { label: '해결', color: 'success' as const },
      closed: { label: '종료', color: 'default' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getPriorityChip = (priority: string) => {
    const priorityConfig = {
      low: { label: '낮음', color: 'info' as const },
      medium: { label: '보통', color: 'warning' as const },
      high: { label: '높음', color: 'error' as const },
      urgent: { label: '긴급', color: 'error' as const }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getCategoryChip = (category: string) => {
    const categoryConfig = {
      technical: { label: '기술', color: 'primary' as const },
      billing: { label: '청구', color: 'secondary' as const },
      general: { label: '일반', color: 'default' as const },
      complaint: { label: '불만', color: 'error' as const },
      feature_request: { label: '기능요청', color: 'info' as const }
    };
    const config = categoryConfig[category as keyof typeof categoryConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getCategoryLabel = (category: string) => {
    const categoryConfig = {
      technical: '기술',
      billing: '청구',
      general: '일반',
      complaint: '불만',
      feature_request: '기능요청'
    };
    return categoryConfig[category as keyof typeof categoryConfig] || category;
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(ticket => ticket.status === 'open').length;
  const inProgressTickets = tickets.filter(ticket => ticket.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(ticket => ticket.status === 'resolved').length;
  const urgentTickets = tickets.filter(ticket => ticket.priority === 'urgent').length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

  // 오래된 티켓 (7일 이상 미해결)
  const oldTickets = tickets.filter(ticket => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    const createdAt = new Date(ticket.createdAt);
    const today = new Date();
    const diffTime = today.getTime() - createdAt.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }).length;

  return (
    <Box sx={{ width: '100%', px: 2, py: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SupportIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          고객 지원 관리
        </Typography>
      </Box>

      {/* 지원 요약 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, 
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SupportIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">총 티켓</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {totalTickets}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MessageIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography variant="h6">오픈</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {openTickets}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ScheduleIcon sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">진행중</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {inProgressTickets}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">해결</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {resolvedTickets}개
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PriorityIcon sx={{ mr: 1, color: 'error.main' }} />
              <Typography variant="h6">긴급</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              {urgentTickets}개
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 경고 카드 */}
      {oldTickets > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'warning.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1, color: 'warning.dark' }} />
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {oldTickets}개의 티켓이 7일 이상 미해결 상태입니다.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 탭 */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<MessageIcon />} label="전체 티켓" iconPosition="start" />
          <Tab icon={<ScheduleIcon />} label="진행중" iconPosition="start" />
          <Tab icon={<CheckIcon />} label="해결됨" iconPosition="start" />
          <Tab icon={<PriorityIcon />} label="긴급" iconPosition="start" />
        </Tabs>
      </Card>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="티켓번호, 고객명, 제목, 담당자로 검색..."
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
              <InputLabel>카테고리</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">전체 카테고리</MenuItem>
                <MenuItem value="technical">기술</MenuItem>
                <MenuItem value="billing">청구</MenuItem>
                <MenuItem value="general">일반</MenuItem>
                <MenuItem value="complaint">불만</MenuItem>
                <MenuItem value="feature_request">기능요청</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">전체 우선순위</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="urgent">긴급</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="open">오픈</MenuItem>
                <MenuItem value="in_progress">진행중</MenuItem>
                <MenuItem value="pending_customer">고객대기</MenuItem>
                <MenuItem value="resolved">해결</MenuItem>
                <MenuItem value="closed">종료</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              내보내기
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
              티켓 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 티켓 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>티켓 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>고객 정보</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>담당자</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>카테고리</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>우선순위</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>생성일</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>예상 해결일</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {ticket.ticketNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {ticket.subject}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {ticket.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {ticket.customerName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {ticket.customerContact}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {ticket.customerPhone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {ticket.assignedTo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ticket.department}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getCategoryChip(ticket.category)}
                  </TableCell>
                  <TableCell>
                    {getPriorityChip(ticket.priority)}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(ticket.status)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {ticket.createdAt}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {ticket.estimatedResolution ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {ticket.estimatedResolution}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => handleEdit(ticket)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="primary">
                        <MessageIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(ticket.id)} color="error">
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

      {/* 티켓 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTicket ? '티켓 수정' : '새 티켓 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="티켓 번호"
                value={formData.ticketNumber}
                onChange={(e) => setFormData({...formData, ticketNumber: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="제목"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="고객명"
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="고객 담당자"
                value={formData.customerContact}
                onChange={(e) => setFormData({...formData, customerContact: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="고객 전화번호"
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="고객 이메일"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="담당자"
                value={formData.assignedTo}
                onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="부서"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                >
                  <MenuItem value="technical">기술</MenuItem>
                  <MenuItem value="billing">청구</MenuItem>
                  <MenuItem value="general">일반</MenuItem>
                  <MenuItem value="complaint">불만</MenuItem>
                  <MenuItem value="feature_request">기능요청</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                >
                  <MenuItem value="low">낮음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="urgent">긴급</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              >
                <MenuItem value="open">오픈</MenuItem>
                <MenuItem value="in_progress">진행중</MenuItem>
                <MenuItem value="pending_customer">고객대기</MenuItem>
                <MenuItem value="resolved">해결</MenuItem>
                <MenuItem value="closed">종료</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="예상 해결일"
              type="date"
              value={formData.estimatedResolution}
              onChange={(e) => setFormData({...formData, estimatedResolution: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="문제 설명"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
            <TextField
              fullWidth
              label="해결 방법"
              multiline
              rows={3}
              value={formData.solution}
              onChange={(e) => setFormData({...formData, solution: e.target.value})}
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

export default CustomerSupport;
