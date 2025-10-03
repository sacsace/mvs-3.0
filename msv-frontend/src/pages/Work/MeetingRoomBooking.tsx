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
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MeetingRoom as MeetingRoomIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface MeetingRoom {
  id: number;
  name: string;
  location: string;
  capacity: number;
  facilities: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  description: string;
  imageUrl?: string;
}

interface Booking {
  id: number;
  bookingId: string;
  roomId: number;
  roomName: string;
  roomLocation: string;
  title: string;
  description: string;
  organizerId: number;
  organizerName: string;
  organizerDepartment: string;
  attendees: string[];
  startTime: string;
  endTime: string;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  recurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

const MeetingRoomBooking: React.FC = () => {
  const { user } = useStore();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleRooms: MeetingRoom[] = [
    {
      id: 1,
      name: '대회의실',
      location: '3층 301호',
      capacity: 20,
      facilities: ['프로젝터', '화이트보드', '음향시설', '커피머신'],
      status: 'available',
      description: '대규모 회의 및 프레젠테이션용 회의실',
      imageUrl: '/images/meeting-room-1.jpg'
    },
    {
      id: 2,
      name: '중회의실',
      location: '3층 302호',
      capacity: 10,
      facilities: ['프로젝터', '화이트보드', 'TV'],
      status: 'occupied',
      description: '중간 규모 팀 회의용 회의실',
      imageUrl: '/images/meeting-room-2.jpg'
    },
    {
      id: 3,
      name: '소회의실 A',
      location: '3층 303호',
      capacity: 6,
      facilities: ['화이트보드', 'TV'],
      status: 'available',
      description: '소규모 미팅용 회의실',
      imageUrl: '/images/meeting-room-3.jpg'
    },
    {
      id: 4,
      name: '소회의실 B',
      location: '3층 304호',
      capacity: 6,
      facilities: ['화이트보드', 'TV'],
      status: 'maintenance',
      description: '소규모 미팅용 회의실 (점검중)',
      imageUrl: '/images/meeting-room-4.jpg'
    }
  ];

  const sampleBookings: Booking[] = [
    {
      id: 1,
      bookingId: 'MR-2024-001',
      roomId: 1,
      roomName: '대회의실',
      roomLocation: '3층 301호',
      title: '월간 팀 미팅',
      description: '개발팀 월간 정기 미팅',
      organizerId: 1001,
      organizerName: '김개발',
      organizerDepartment: '개발팀',
      attendees: ['김개발', '이프론트', '박백엔드', '최마케팅'],
      startTime: '09:00',
      endTime: '10:00',
      date: '2024-01-25',
      status: 'confirmed',
      recurring: true,
      recurringPattern: 'monthly',
      recurringEndDate: '2024-12-31',
      createdAt: '2024-01-20 14:00:00',
      updatedAt: '2024-01-20 14:00:00',
      notes: '프로젝터 준비 필요'
    },
    {
      id: 2,
      bookingId: 'MR-2024-002',
      roomId: 2,
      roomName: '중회의실',
      roomLocation: '3층 302호',
      title: '프로젝트 리뷰',
      description: 'MVS 3.0 프로젝트 진행 상황 리뷰',
      organizerId: 1002,
      organizerName: '이프론트',
      organizerDepartment: '개발팀',
      attendees: ['이프론트', '박백엔드', '김개발'],
      startTime: '14:00',
      endTime: '16:00',
      date: '2024-01-25',
      status: 'confirmed',
      recurring: false,
      createdAt: '2024-01-22 10:30:00',
      updatedAt: '2024-01-22 10:30:00'
    },
    {
      id: 3,
      bookingId: 'MR-2024-003',
      roomId: 3,
      roomName: '소회의실 A',
      roomLocation: '3층 303호',
      title: '고객 상담',
      description: '고객사와의 기술 상담 미팅',
      organizerId: 2001,
      organizerName: '최마케팅',
      organizerDepartment: '마케팅팀',
      attendees: ['최마케팅', '김개발'],
      startTime: '11:00',
      endTime: '12:00',
      date: '2024-01-26',
      status: 'pending',
      recurring: false,
      createdAt: '2024-01-23 15:20:00',
      updatedAt: '2024-01-23 15:20:00'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, roomFilter, dateFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRooms(sampleRooms);
      setBookings(sampleBookings);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.organizerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (roomFilter) {
      filtered = filtered.filter(booking => booking.roomId === parseInt(roomFilter));
    }

    if (dateFilter) {
      filtered = filtered.filter(booking => booking.date === dateFilter);
    }

    setFilteredBookings(filtered);
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Chip label="확정" color="success" size="small" />;
      case 'pending':
        return <Chip label="대기중" color="warning" size="small" />;
      case 'cancelled':
        return <Chip label="취소됨" color="error" size="small" />;
      case 'completed':
        return <Chip label="완료" color="info" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getRoomStatusChip = (status: string) => {
    switch (status) {
      case 'available':
        return <Chip label="사용가능" color="success" size="small" />;
      case 'occupied':
        return <Chip label="사용중" color="error" size="small" />;
      case 'maintenance':
        return <Chip label="점검중" color="warning" size="small" />;
      case 'reserved':
        return <Chip label="예약됨" color="info" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setViewMode('view');
  };

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setOpenDialog(true);
  };

  const handleDeleteBooking = async (id: number) => {
    if (window.confirm('정말로 이 예약을 삭제하시겠습니까?')) {
      try {
        setBookings(prev => prev.filter(booking => booking.id !== id));
        setSuccess('예약이 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('삭제 오류:', error);
        setError('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleCancelBooking = (id: number) => {
    setBookings(prev =>
      prev.map(booking =>
        booking.id === id 
          ? { 
              ...booking, 
              status: 'cancelled' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : booking
      )
    );
    setSuccess('예약이 취소되었습니다.');
  };

  const handleConfirmBooking = (id: number) => {
    setBookings(prev =>
      prev.map(booking =>
        booking.id === id 
          ? { 
              ...booking, 
              status: 'confirmed' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : booking
      )
    );
    setSuccess('예약이 확정되었습니다.');
  };

  const todayBookings = bookings.filter(booking => booking.date === new Date().toISOString().split('T')[0]);
  const pendingBookings = bookings.filter(booking => booking.status === 'pending').length;
  const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed').length;
  const availableRooms = rooms.filter(room => room.status === 'available').length;

  const paginatedBookings = filteredBookings.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (viewMode === 'view' && selectedBooking) {
    return (
      <Box sx={{ 
        p: 3, 
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MeetingRoomIcon />
            회의실 예약 상세
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
                  {selectedBooking.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  예약번호: {selectedBooking.bookingId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedBooking.status)}
                  {selectedBooking.recurring && (
                    <Chip label="반복예약" color="primary" size="small" />
                  )}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" color="primary.main">
                  {selectedBooking.roomName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBooking.roomLocation}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* 예약 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>예약 정보</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>일시</Typography>
                    <Typography variant="body1">
                      {selectedBooking.date} {selectedBooking.startTime} - {selectedBooking.endTime}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>회의실</Typography>
                    <Typography variant="body1">
                      {selectedBooking.roomName} ({selectedBooking.roomLocation})
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>설명</Typography>
                    <Typography variant="body1">
                      {selectedBooking.description}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* 주최자 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>주최자 정보</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedBooking.organizerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedBooking.organizerDepartment}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 참석자 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>참석자</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedBooking.attendees.map((attendee, index) => (
                  <Chip key={index} label={attendee} variant="outlined" />
                ))}
              </Box>
            </Box>

            {/* 반복 예약 정보 */}
            {selectedBooking.recurring && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>반복 예약 정보</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body1">
                    패턴: {selectedBooking.recurringPattern === 'daily' ? '매일' : 
                           selectedBooking.recurringPattern === 'weekly' ? '매주' : '매월'}
                  </Typography>
                  {selectedBooking.recurringEndDate && (
                    <Typography variant="body1">
                      종료일: {selectedBooking.recurringEndDate}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* 메모 */}
            {selectedBooking.notes && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>메모</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body1">
                    {selectedBooking.notes}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditBooking(selectedBooking)}
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
              {selectedBooking.status === 'pending' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleConfirmBooking(selectedBooking.id)}
                >
                  확정
                </Button>
              )}
              {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                >
                  취소
                </Button>
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
          <MeetingRoomIcon />
          회의실 예약
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={() => setViewMode('calendar')}
            sx={{ borderRadius: 2 }}
          >
            캘린더 보기
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            예약하기
          </Button>
        </Box>
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
              사용가능한 회의실
            </Typography>
            <Typography variant="h4" color="success.main">
              {availableRooms}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              오늘 예약
            </Typography>
            <Typography variant="h4">
              {todayBookings.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              대기중인 예약
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingBookings}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              확정된 예약
            </Typography>
            <Typography variant="h4" color="info.main">
              {confirmedBookings}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 회의실 현황 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>회의실 현황</Typography>
          <Grid container spacing={2}>
            {rooms.map((room) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={room.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {room.name}
                      </Typography>
                      {getRoomStatusChip(room.status)}
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {room.location} • 수용인원: {room.capacity}명
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {room.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {room.facilities.slice(0, 2).map((facility, index) => (
                        <Chip key={index} label={facility} size="small" variant="outlined" />
                      ))}
                      {room.facilities.length > 2 && (
                        <Chip label={`+${room.facilities.length - 2}`} size="small" variant="outlined" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

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
              placeholder="제목, 예약번호, 주최자 검색"
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
                <MenuItem value="confirmed">확정</MenuItem>
                <MenuItem value="pending">대기중</MenuItem>
                <MenuItem value="cancelled">취소됨</MenuItem>
                <MenuItem value="completed">완료</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>회의실</InputLabel>
              <Select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {rooms.map(room => (
                  <MenuItem key={room.id} value={room.id.toString()}>{room.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="date"
              label="날짜"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setRoomFilter('');
                setDateFilter('');
              }}
            >
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 예약 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>예약 정보</TableCell>
                <TableCell>회의실</TableCell>
                <TableCell>주최자</TableCell>
                <TableCell>일시</TableCell>
                <TableCell>참석자</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedBookings.map((booking) => (
                <TableRow key={booking.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {booking.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.bookingId}
                      </Typography>
                      {booking.recurring && (
                        <Chip label="반복" color="primary" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {booking.roomName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.roomLocation}
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
                          {booking.organizerName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {booking.organizerDepartment}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {booking.date}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.startTime} - {booking.endTime}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {booking.attendees.length}명
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(booking.status)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="보기">
                        <IconButton size="small" onClick={() => handleViewBooking(booking)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="수정">
                        <IconButton size="small" onClick={() => handleEditBooking(booking)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {booking.status === 'pending' && (
                        <Tooltip title="확정">
                          <IconButton 
                            size="small" 
                            onClick={() => handleConfirmBooking(booking.id)}
                            color="success"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <Tooltip title="취소">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCancelBooking(booking.id)}
                            color="error"
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="삭제">
                        <IconButton size="small" onClick={() => handleDeleteBooking(booking.id)}>
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
            count={Math.ceil(filteredBookings.length / itemsPerPage)}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      </Card>

      {/* 예약 작성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedBooking ? '예약 수정' : '회의실 예약'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              회의실 예약 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              회의실 예약 기능은 개발 중입니다.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained">
            {selectedBooking ? '수정' : '예약'}
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

export default MeetingRoomBooking;
