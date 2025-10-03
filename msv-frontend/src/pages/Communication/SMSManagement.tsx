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
  Sms as SmsIcon,
  Send as SendIcon,
  Edit as DraftIcon,
  Inbox as InboxIcon,
  Outbox as OutboxIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Phone as PhoneIcon,
  Message as MessageIcon,
  ScheduleSend as ScheduleSendIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface SMS {
  id: number;
  recipient: string;
  recipientPhone: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  type: 'individual' | 'group' | 'broadcast';
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  createdBy: string;
  cost: number;
  characterCount: number;
}

const SMSManagement: React.FC = () => {
  const { user } = useStore();
  const [smsList, setSmsList] = useState<SMS[]>([]);
  const [filteredSms, setFilteredSms] = useState<SMS[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSms, setSelectedSms] = useState<SMS | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleSMS: SMS[] = [
    {
      id: 1,
      recipient: '김고객',
      recipientPhone: '010-1234-5678',
      content: '안녕하세요. 주문하신 상품이 배송되었습니다. 감사합니다.',
      status: 'delivered',
      priority: 'normal',
      type: 'individual',
      sentAt: '2024-01-15 14:30:00',
      deliveredAt: '2024-01-15 14:30:15',
      createdAt: '2024-01-15 14:25:00',
      createdBy: '배송팀',
      cost: 20,
      characterCount: 45
    },
    {
      id: 2,
      recipient: '전체 직원',
      recipientPhone: '그룹 발송',
      content: '내일 회의가 오후 3시로 변경되었습니다. 참석 부탁드립니다.',
      status: 'sent',
      priority: 'high',
      type: 'group',
      sentAt: '2024-01-14 16:20:00',
      createdAt: '2024-01-14 16:15:00',
      createdBy: '관리자',
      cost: 200,
      characterCount: 38
    },
    {
      id: 3,
      recipient: '이손님',
      recipientPhone: '010-2345-6789',
      content: '결제가 완료되었습니다. 영수증을 확인해 주세요.',
      status: 'scheduled',
      priority: 'normal',
      type: 'individual',
      scheduledAt: '2024-01-16 09:00:00',
      createdAt: '2024-01-13 10:30:00',
      createdBy: '결제팀',
      cost: 20,
      characterCount: 28
    },
    {
      id: 4,
      recipient: '박VIP',
      recipientPhone: '010-3456-7890',
      content: 'VIP 고객님께 특별 할인 혜택을 제공합니다.',
      status: 'failed',
      priority: 'urgent',
      type: 'individual',
      createdAt: '2024-01-12 15:45:00',
      createdBy: '마케팅팀',
      cost: 0,
      characterCount: 25
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSMS();
  }, [smsList, searchTerm, statusFilter, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSmsList(sampleSMS);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterSMS = () => {
    let filtered = smsList;

    if (searchTerm) {
      filtered = filtered.filter(sms =>
        sms.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sms.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sms.recipientPhone.includes(searchTerm)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(sms => sms.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(sms => sms.type === typeFilter);
    }

    setFilteredSms(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="임시저장" color="default" size="small" />;
      case 'scheduled':
        return <Chip label="예약됨" color="info" size="small" />;
      case 'sent':
        return <Chip label="발송됨" color="warning" size="small" />;
      case 'delivered':
        return <Chip label="전달됨" color="success" size="small" />;
      case 'failed':
        return <Chip label="실패" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getPriorityChip = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Chip label="낮음" color="default" size="small" />;
      case 'normal':
        return <Chip label="보통" color="info" size="small" />;
      case 'high':
        return <Chip label="높음" color="warning" size="small" />;
      case 'urgent':
        return <Chip label="긴급" color="error" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getTypeChip = (type: string) => {
    switch (type) {
      case 'individual':
        return <Chip label="개별" color="primary" size="small" />;
      case 'group':
        return <Chip label="그룹" color="secondary" size="small" />;
      case 'broadcast':
        return <Chip label="방송" color="info" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const handleViewSMS = (sms: SMS) => {
    setSelectedSms(sms);
    setViewMode('view');
  };

  const handleDeleteSMS = async (id: number) => {
    if (window.confirm('정말로 이 SMS를 삭제하시겠습니까?')) {
      try {
        setSmsList(prev => prev.filter(sms => sms.id !== id));
        setSuccess('SMS가 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleResendSMS = (id: number) => {
    setSmsList(prev =>
      prev.map(sms =>
        sms.id === id 
          ? { 
              ...sms, 
              status: 'sent' as const,
              sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : sms
      )
    );
    setSuccess('SMS가 재발송되었습니다.');
  };

  const totalSMS = smsList.length;
  const sentSMS = smsList.filter(sms => sms.status === 'sent' || sms.status === 'delivered').length;
  const scheduledSMS = smsList.filter(sms => sms.status === 'scheduled').length;
  const failedSMS = smsList.filter(sms => sms.status === 'failed').length;
  const totalCost = smsList.reduce((sum, sms) => sum + sms.cost, 0);

  const paginatedSMS = filteredSms.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'view' && selectedSms) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmsIcon />
            SMS 상세
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
                SMS 상세 정보
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {getStatusChip(selectedSms.status)}
                {getPriorityChip(selectedSms.priority)}
                {getTypeChip(selectedSms.type)}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>수신자 정보</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedSms.recipient}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedSms.recipientPhone}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>발송 정보</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    작성자: {selectedSms.createdBy}
                  </Typography>
                  <Typography variant="body2">
                    작성일: {selectedSms.createdAt}
                  </Typography>
                  {selectedSms.sentAt && (
                    <Typography variant="body2">
                      발송일: {selectedSms.sentAt}
                    </Typography>
                  )}
                  {selectedSms.deliveredAt && (
                    <Typography variant="body2">
                      전달일: {selectedSms.deliveredAt}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6" gutterBottom>SMS 내용</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {selectedSms.content}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>비용 정보</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    문자 수: {selectedSms.characterCount}자
                  </Typography>
                  <Typography variant="body2">
                    비용: ₹{selectedSms.cost}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
              {selectedSms.status === 'failed' && (
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => handleResendSMS(selectedSms.id)}
                >
                  재발송
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
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
          <SmsIcon />
          SMS 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          SMS 작성
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
              총 SMS
            </Typography>
            <Typography variant="h4" color="primary.main">
              {totalSMS}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              발송 완료
            </Typography>
            <Typography variant="h4" color="success.main">
              {sentSMS}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              예약 발송
            </Typography>
            <Typography variant="h4" color="warning.main">
              {scheduledSMS}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 비용
            </Typography>
            <Typography variant="h4" color="info.main">
              ₹{totalCost}
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
              placeholder="수신자, 내용, 전화번호 검색"
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
                <MenuItem value="draft">임시저장</MenuItem>
                <MenuItem value="scheduled">예약됨</MenuItem>
                <MenuItem value="sent">발송됨</MenuItem>
                <MenuItem value="delivered">전달됨</MenuItem>
                <MenuItem value="failed">실패</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="individual">개별</MenuItem>
                <MenuItem value="group">그룹</MenuItem>
                <MenuItem value="broadcast">방송</MenuItem>
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
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* SMS 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>수신자</TableCell>
                <TableCell>전화번호</TableCell>
                <TableCell>내용</TableCell>
                <TableCell>유형</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>우선순위</TableCell>
                <TableCell>발송일</TableCell>
                <TableCell>비용</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedSMS.map((sms) => (
                <TableRow key={sms.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {sms.recipient}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {sms.recipientPhone}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200
                      }}
                    >
                      {sms.content}
                    </Typography>
                  </TableCell>
                  <TableCell>{getTypeChip(sms.type)}</TableCell>
                  <TableCell>{getStatusChip(sms.status)}</TableCell>
                  <TableCell>{getPriorityChip(sms.priority)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {sms.sentAt || sms.scheduledAt || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      ₹{sms.cost}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewSMS(sms)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {sms.status === 'failed' && (
                        <Tooltip title="재발송">
                          <IconButton 
                            size="small" 
                            onClick={() => handleResendSMS(sms.id)}
                            color="success"
                          >
                            <SendIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="삭제">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteSMS(sms.id)}
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

        {/* 페이지네이션 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination
            count={Math.ceil(filteredSms.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* SMS 작성 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          SMS 작성
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              SMS 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              SMS 작성 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">작성</Button>
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

export default SMSManagement;