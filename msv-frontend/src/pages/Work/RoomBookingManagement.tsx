import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
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
  Grid,
  Badge,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Hotel as HotelIcon,
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
  LocationOn as LocationOnIcon,
  Bed as BedIcon,
  Wifi as WifiIcon,
  Restaurant as RestaurantIcon,
  Pool as PoolIcon,
  CalendarToday as CalendarTodayIcon,
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Today as TodayIcon,
  Lock as LockIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useStore } from '../../store';

interface Room {
  id: number;
  roomNumber: string;
  roomType: 'standard' | 'deluxe' | 'suite' | 'presidential';
  floor: number;
  capacity: number;
  amenities: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'cleaning';
  description: string;
  pricePerNight: number;
  imageUrl?: string;
}

interface Booking {
  id: number;
  bookingId: string;
  roomId: number;
  roomNumber: string;
  roomType: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalNights: number;
  totalAmount: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partial';
  specialRequests?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const RoomBookingManagement: React.FC = () => {
  const { user } = useStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 샘플 데이터
  const sampleRooms: Room[] = [
    {
      id: 1,
      roomNumber: '101',
      roomType: 'standard',
      floor: 1,
      capacity: 2,
      amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar'],
      status: 'available',
      description: '스탠다드 객실 - 기본적인 편의시설을 갖춘 깔끔한 객실',
      pricePerNight: 80000,
      imageUrl: '/images/room-101.jpg'
    },
    {
      id: 2,
      roomNumber: '201',
      roomType: 'deluxe',
      floor: 2,
      capacity: 3,
      amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Coffee Machine'],
      status: 'occupied',
      description: '델럭스 객실 - 넓은 공간과 추가 편의시설을 제공하는 객실',
      pricePerNight: 120000,
      imageUrl: '/images/room-201.jpg'
    },
    {
      id: 3,
      roomNumber: '301',
      roomType: 'suite',
      floor: 3,
      capacity: 4,
      amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Coffee Machine', 'Jacuzzi', 'Living Room'],
      status: 'reserved',
      description: '스위트 객실 - 최고급 편의시설과 넓은 공간을 제공하는 프리미엄 객실',
      pricePerNight: 200000,
      imageUrl: '/images/room-301.jpg'
    },
    {
      id: 4,
      roomNumber: '401',
      roomType: 'presidential',
      floor: 4,
      capacity: 6,
      amenities: ['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Balcony', 'Coffee Machine', 'Jacuzzi', 'Living Room', 'Kitchen', 'Butler Service'],
      status: 'maintenance',
      description: '프레지덴셜 스위트 - 최고급 서비스와 모든 편의시설을 제공하는 VIP 객실',
      pricePerNight: 500000,
      imageUrl: '/images/room-401.jpg'
    }
  ];

  const sampleBookings: Booking[] = [
    {
      id: 1,
      bookingId: 'RB-2024-001',
      roomId: 1,
      roomNumber: '101',
      roomType: 'standard',
      guestName: '김고객',
      guestEmail: 'kim@example.com',
      guestPhone: '010-1234-5678',
      checkInDate: '2024-01-25',
      checkOutDate: '2024-01-27',
      numberOfGuests: 2,
      totalNights: 2,
      totalAmount: 160000,
      status: 'confirmed',
      paymentStatus: 'paid',
      specialRequests: '침대 2개 요청',
      createdAt: '2024-01-20 14:00:00',
      updatedAt: '2024-01-20 14:00:00',
      createdBy: '관리자'
    },
    {
      id: 2,
      bookingId: 'RB-2024-002',
      roomId: 2,
      roomNumber: '201',
      roomType: 'deluxe',
      guestName: '이손님',
      guestEmail: 'lee@example.com',
      guestPhone: '010-2345-6789',
      checkInDate: '2024-01-24',
      checkOutDate: '2024-01-26',
      numberOfGuests: 3,
      totalNights: 2,
      totalAmount: 240000,
      status: 'checked_in',
      paymentStatus: 'paid',
      specialRequests: '발렛 파킹 요청',
      createdAt: '2024-01-22 10:30:00',
      updatedAt: '2024-01-24 15:00:00',
      createdBy: '관리자'
    },
    {
      id: 3,
      bookingId: 'RB-2024-003',
      roomId: 3,
      roomNumber: '301',
      roomType: 'suite',
      guestName: '박VIP',
      guestEmail: 'park@example.com',
      guestPhone: '010-3456-7890',
      checkInDate: '2024-01-28',
      checkOutDate: '2024-01-30',
      numberOfGuests: 4,
      totalNights: 2,
      totalAmount: 400000,
      status: 'pending',
      paymentStatus: 'pending',
      specialRequests: '로즈 페탈 배치 요청',
      createdAt: '2024-01-23 16:20:00',
      updatedAt: '2024-01-23 16:20:00',
      createdBy: '관리자'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, roomTypeFilter, dateFilter]);

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
        booking.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.guestEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (roomTypeFilter) {
      filtered = filtered.filter(booking => booking.roomType === roomTypeFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(booking => 
        booking.checkInDate === dateFilter || 
        booking.checkOutDate === dateFilter ||
        (booking.checkInDate <= dateFilter && booking.checkOutDate >= dateFilter)
      );
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
      case 'checked_in':
        return <Chip label="체크인" color="info" size="small" />;
      case 'checked_out':
        return <Chip label="체크아웃" color="default" size="small" />;
      case 'no_show':
        return <Chip label="노쇼" color="error" size="small" />;
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
      case 'cleaning':
        return <Chip label="청소중" color="default" size="small" />;
      default:
        return <Chip label="알 수 없음" color="default" size="small" />;
    }
  };

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case 'standard':
        return '스탠다드';
      case 'deluxe':
        return '델럭스';
      case 'suite':
        return '스위트';
      case 'presidential':
        return '프레지덴셜';
      default:
        return '알 수 없음';
    }
  };

  const getPaymentStatusChip = (status: string) => {
    switch (status) {
      case 'paid':
        return <Chip label="결제완료" color="success" size="small" />;
      case 'pending':
        return <Chip label="결제대기" color="warning" size="small" />;
      case 'refunded':
        return <Chip label="환불완료" color="info" size="small" />;
      case 'partial':
        return <Chip label="부분결제" color="default" size="small" />;
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

  const handleCheckIn = (id: number) => {
    setBookings(prev =>
      prev.map(booking =>
        booking.id === id 
          ? { 
              ...booking, 
              status: 'checked_in' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : booking
      )
    );
    setSuccess('체크인이 완료되었습니다.');
  };

  const handleCheckOut = (id: number) => {
    setBookings(prev =>
      prev.map(booking =>
        booking.id === id 
          ? { 
              ...booking, 
              status: 'checked_out' as const,
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
            } 
          : booking
      )
    );
    setSuccess('체크아웃이 완료되었습니다.');
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

  const todayCheckIns = bookings.filter(booking => booking.checkInDate === new Date().toISOString().split('T')[0]);
  const todayCheckOuts = bookings.filter(booking => booking.checkOutDate === new Date().toISOString().split('T')[0]);
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
  const availableRooms = rooms.filter(room => room.status === 'available').length;
  const totalRevenue = bookings
    .filter(booking => booking.status === 'checked_out' && booking.paymentStatus === 'paid')
    .reduce((sum, booking) => sum + booking.totalAmount, 0);

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
            <HotelIcon />
            객실 예약 상세
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
                  {selectedBooking.guestName}님의 예약
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  예약번호: {selectedBooking.bookingId}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {getStatusChip(selectedBooking.status)}
                  {getPaymentStatusChip(selectedBooking.paymentStatus)}
                </Box>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h4" color="primary.main">
                  ₩{selectedBooking.totalAmount.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBooking.totalNights}박
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
                    <Typography variant="subtitle2" gutterBottom>객실</Typography>
                    <Typography variant="body1">
                      {selectedBooking.roomNumber}호 ({getRoomTypeLabel(selectedBooking.roomType)})
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>투숙객 수</Typography>
                    <Typography variant="body1">
                      {selectedBooking.numberOfGuests}명
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>체크인</Typography>
                    <Typography variant="body1">
                      {selectedBooking.checkInDate}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>체크아웃</Typography>
                    <Typography variant="body1">
                      {selectedBooking.checkOutDate}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* 고객 정보 */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>고객 정보</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedBooking.guestName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedBooking.guestEmail}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedBooking.guestPhone}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 특별 요청사항 */}
            {selectedBooking.specialRequests && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>특별 요청사항</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body1">
                    {selectedBooking.specialRequests}
                  </Typography>
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
              {selectedBooking.status === 'confirmed' && (
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleCheckIn(selectedBooking.id)}
                >
                  체크인
                </Button>
              )}
              {selectedBooking.status === 'checked_in' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleCheckOut(selectedBooking.id)}
                >
                  체크아웃
                </Button>
              )}
              {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'checked_out' && (
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
          <HotelIcon />
          객실 예약 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          예약하기
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
              사용가능한 객실
            </Typography>
            <Typography variant="h4" color="success.main">
              {availableRooms}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              사용중인 객실
            </Typography>
            <Typography variant="h4" color="error.main">
              {occupiedRooms}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              오늘 체크인
            </Typography>
            <Typography variant="h4">
              {todayCheckIns.length}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 매출
            </Typography>
            <Typography variant="h4" color="primary.main">
              ₩{totalRevenue.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 객실 현황 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>객실 현황</Typography>
          <Grid container spacing={2}>
            {rooms.map((room) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={room.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {room.roomNumber}호
                      </Typography>
                      {getRoomStatusChip(room.status)}
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {getRoomTypeLabel(room.roomType)} • {room.floor}층 • {room.capacity}명
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ₩{room.pricePerNight.toLocaleString()}/박
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {room.amenities.slice(0, 3).map((amenity, index) => (
                        <Chip key={index} label={amenity} size="small" variant="outlined" />
                      ))}
                      {room.amenities.length > 3 && (
                        <Chip label={`+${room.amenities.length - 3}`} size="small" variant="outlined" />
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
              placeholder="고객명, 예약번호, 이메일 검색"
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
                <MenuItem value="checked_in">체크인</MenuItem>
                <MenuItem value="checked_out">체크아웃</MenuItem>
                <MenuItem value="cancelled">취소됨</MenuItem>
                <MenuItem value="no_show">노쇼</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>객실 유형</InputLabel>
              <Select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="standard">스탠다드</MenuItem>
                <MenuItem value="deluxe">델럭스</MenuItem>
                <MenuItem value="suite">스위트</MenuItem>
                <MenuItem value="presidential">프레지덴셜</MenuItem>
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
                setRoomTypeFilter('');
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
                <TableCell>객실</TableCell>
                <TableCell>고객 정보</TableCell>
                <TableCell>체크인/아웃</TableCell>
                <TableCell>금액</TableCell>
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
                        {booking.bookingId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.totalNights}박 {booking.numberOfGuests}명
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {booking.roomNumber}호
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getRoomTypeLabel(booking.roomType)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {booking.guestName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {booking.guestEmail}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {booking.checkInDate}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ~ {booking.checkOutDate}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      ₩{booking.totalAmount.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPaymentStatusChip(booking.paymentStatus)}
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
                      {booking.status === 'confirmed' && (
                        <Tooltip title="체크인">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCheckIn(booking.id)}
                            color="info"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {booking.status === 'checked_in' && (
                        <Tooltip title="체크아웃">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCheckOut(booking.id)}
                            color="success"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {booking.status !== 'cancelled' && booking.status !== 'checked_out' && (
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
          {selectedBooking ? '예약 수정' : '객실 예약'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              객실 예약 정보를 입력해주세요.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              객실 예약 기능은 개발 중입니다.
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

export default RoomBookingManagement;
