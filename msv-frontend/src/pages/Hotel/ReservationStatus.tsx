import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyFilterWrapSx,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsOutlinedLabelProps,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { roomBookingService, roomTypeRoomService, roomTypeService } from '../../services/api';
import RoomBookingManagement from '../Work/RoomBookingManagement';
import { useStore } from '../../store';

const reservationFilterFieldSx = {
  ...(mvsSearchFieldSx as Record<string, unknown>),
  ...mvsFilterFieldHeightSx,
} as const;

const reservationMonthNavSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.25,
  px: 1,
  py: 0.25,
  borderRadius: '10px',
  bgcolor: '#F1F5F9',
  border: '1px solid #C5CED9',
} as const;

type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';

interface RoomBooking {
  id: number;
  room_id?: number;
  room_number?: string;
  room_type?: string;
  booking_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  status: BookingStatus;
  check_in_date: string;
  check_out_date: string;
  check_out_time?: string;
  special_requests?: string;
}

interface RoomSummary {
  key: string;
  roomNumber: string;
  roomType?: string;
  roomTypeId?: number;
  roomName?: string;
}

const isActiveBooking = (status?: BookingStatus) =>
  status !== 'cancelled' && status !== 'no_show';

const makeRoomKey = (roomType: string | undefined, roomNumber: string) =>
  `${roomType || 'Unknown'}|${roomNumber}`;

const formatDate = (value: string | undefined, locale: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale);
};

const pad2 = (value: number) => value.toString().padStart(2, '0');

const formatDayLabel = (value: Date, locale: string) => {
  const day = value.getDate().toString().padStart(2, '0');
  const weekday = value.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase();
  return { day, weekday };
};

const toIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  return `${year}-${month}-${day}`;
};

const addDaysToIso = (iso: string, days: number) => {
  const base = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(base.getTime())) return iso;
  base.setDate(base.getDate() + days);
  return toIsoDate(base);
};

const CHECKOUT_TIME_FALLBACK = '11:00:00';

const normalizeTimeValue = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return CHECKOUT_TIME_FALLBACK;
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  return CHECKOUT_TIME_FALLBACK;
};

const getGuestColor = (guestName?: string) => {
  const key = String(guestName || '').trim() || 'default-guest';
  let hash = 0;
  for (let idx = 0; idx < key.length; idx += 1) {
    hash = (hash * 31 + key.charCodeAt(idx)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 52% 72%)`;
};

const ReservationStatus: React.FC = () => {
  const { user } = useStore();
  const canManagePastCheckIn = user?.role === 'root' || user?.role === 'admin';
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [roomTypeDialogOpen, setRoomTypeDialogOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingDialogSeed, setBookingDialogSeed] = useState<{
    roomType: string;
    roomNumber: string;
    checkInDate: string;
    checkInTime?: string;
    checkOutDate: string;
  } | null>(null);
  const [bookingInfoOpen, setBookingInfoOpen] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<RoomBooking | null>(null);
  const [reservationMessageBooking, setReservationMessageBooking] = useState<RoomBooking | null>(null);
  const [bookingGateMessage, setBookingGateMessage] = useState('');
  const [roomTypes, setRoomTypes] = useState<Array<{ id: number; name: string; count: number }>>([]);
  const [roomNameMap, setRoomNameMap] = useState<Map<string, string>>(new Map());
  const [roomNameDialogOpen, setRoomNameDialogOpen] = useState(false);
  const [roomNameForm, setRoomNameForm] = useState({
    roomTypeId: 0,
    roomTypeName: '',
    roomNumber: '',
    roomName: ''
  });
  const [roomTypeForm, setRoomTypeForm] = useState({
    name: '',
    count: '',
    description: '',
    nightlyRate: ''
  });

  const monthStart = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  }, [currentMonth]);

  const monthEnd = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  }, [currentMonth]);

  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const cursor = new Date(monthStart);
    while (cursor <= monthEnd) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [monthStart, monthEnd]);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await roomBookingService.getRoomBookings({
        check_in_date: toIsoDate(monthStart),
        check_out_date: toIsoDate(monthEnd)
      });
      if (response.success) {
        setBookings(response.data || []);
      } else {
        setBookings([]);
        setError(response.message || t('reservationStatus.errors.loadFailed'));
      }
    } catch (err) {
      console.error('예약 데이터 로드 오류:', err);
      setBookings([]);
      setError(t('reservationStatus.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [monthStart, monthEnd]);

  useEffect(() => {
    const loadRoomTypes = async () => {
      try {
        const response = await roomTypeService.getRoomTypes({ status: 'active' });
        if (response.success) {
          const mapped = (response.data || [])
            .map((item: any) => ({
              id: Number(item?.id),
              name: String(item?.name || '').trim(),
              count: Number(item?.room_count || 0)
            }))
            .filter((item: { name: string }) => !!item.name);
          setRoomTypes(mapped);
        }
      } catch (err) {
        console.warn('객실 유형 목록 조회 실패:', err);
      }
    };

    loadRoomTypes();
  }, []);

  useEffect(() => {
    const loadRoomNames = async () => {
      try {
        const response = await roomTypeRoomService.getRoomTypeRooms();
        if (response.success) {
          const map = new Map<string, string>();
          (response.data || []).forEach((item: any) => {
            const key = `${item.room_type_id}|${String(item.room_number)}`;
            map.set(key, String(item.room_name || '').trim());
          });
          setRoomNameMap(map);
        }
      } catch (err) {
        console.warn('객실 호실명 목록 조회 실패:', err);
      }
    };
    loadRoomNames();
  }, []);

  const roomSummaries = useMemo<RoomSummary[]>(() => {
    const roomMap = new Map<string, RoomSummary>();
    const typeIdMap = new Map<string, number>();
    roomTypes.forEach((roomType) => {
      typeIdMap.set(roomType.name, roomType.id);
    });

    roomTypes.forEach((roomType) => {
      const count = Math.max(0, Number(roomType.count || 0));
      for (let idx = 1; idx <= count; idx += 1) {
        const roomNumber = String(idx);
        const key = makeRoomKey(roomType.name, roomNumber);
        const nameKey = `${roomType.id}|${roomNumber}`;
        if (!roomMap.has(key)) {
          roomMap.set(key, {
            key,
            roomNumber,
            roomType: roomType.name,
            roomTypeId: roomType.id,
            roomName: roomNameMap.get(nameKey)
          });
        }
      }
    });

    bookings.forEach((booking) => {
      const roomNumber = booking.room_number || (booking.room_id ? String(booking.room_id) : 'Unknown');
      const roomType = booking.room_type || 'Unknown';
      const roomTypeId = typeIdMap.get(roomType);
      const key = makeRoomKey(roomType, roomNumber);
      if (!roomMap.has(key)) {
        const nameKey = roomTypeId ? `${roomTypeId}|${roomNumber}` : '';
        roomMap.set(key, {
          key,
          roomNumber,
          roomType,
          roomTypeId,
          roomName: nameKey ? roomNameMap.get(nameKey) : undefined
        });
      }
    });

    return Array.from(roomMap.values()).sort((a, b) => {
      const typeCompare = (a.roomType || '').localeCompare(b.roomType || '');
      if (typeCompare !== 0) return typeCompare;
      const aNum = Number(a.roomNumber);
      const bNum = Number(b.roomNumber);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.roomNumber.localeCompare(b.roomNumber);
    });
  }, [bookings, roomNameMap, roomTypes]);

  const roomTypeOptions = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((booking) => {
      if (booking.room_type) {
        set.add(booking.room_type);
      }
    });
    roomTypes.forEach((roomType) => set.add(roomType.name));
    return Array.from(set).sort();
  }, [bookings, roomTypes]);

  const filteredRooms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return roomSummaries.filter((room) => {
      const matchesSearch =
        !keyword ||
        (room.roomName || '').toLowerCase().includes(keyword) ||
        room.roomNumber.toLowerCase().includes(keyword) ||
        (room.roomType || '').toLowerCase().includes(keyword);
      const matchesType = !roomTypeFilter || room.roomType === roomTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [roomSummaries, searchTerm, roomTypeFilter]);

  const groupedRooms = useMemo(() => {
    const groups = new Map<string, RoomSummary[]>();
    filteredRooms.forEach((room) => {
      const typeKey = room.roomType || t('reservationStatus.misc.other');
      if (!groups.has(typeKey)) {
        groups.set(typeKey, []);
      }
      groups.get(typeKey)!.push(room);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRooms]);

  const bookingDaysByRoom = useMemo(() => {
    const map = new Map<string, Set<string>>();
    bookings.forEach((booking) => {
      if (!isActiveBooking(booking.status)) return;
      const roomNumber = booking.room_number || (booking.room_id ? String(booking.room_id) : 'Unknown');
      const roomKey = makeRoomKey(booking.room_type || 'Unknown', roomNumber);
      const startIso = String(booking.check_in_date || '').slice(0, 10);
      const endIso = String(booking.check_out_date || '').slice(0, 10);
      if (!startIso || !endIso) return;
      if (!map.has(roomKey)) {
        map.set(roomKey, new Set());
      }
      const daySet = map.get(roomKey)!;
      if (startIso === endIso) {
        // 당일 입실/퇴실은 풀칸 1일로 표시
        daySet.add(startIso);
      } else {
        // 체크아웃일은 제외하고, 체크인일부터 전날까지 풀칸 처리
        let cursorIso = startIso;
        while (cursorIso < endIso) {
          daySet.add(cursorIso);
          cursorIso = addDaysToIso(cursorIso, 1);
        }
      }
    });
    return map;
  }, [bookings]);

  const checkoutDaysByRoom = useMemo(() => {
    const map = new Map<string, Set<string>>();
    bookings.forEach((booking) => {
      if (!isActiveBooking(booking.status)) return;
      const roomNumber = booking.room_number || (booking.room_id ? String(booking.room_id) : 'Unknown');
      const roomKey = makeRoomKey(booking.room_type || 'Unknown', roomNumber);
      const startIso = String(booking.check_in_date || '').slice(0, 10);
      const endIso = String(booking.check_out_date || '').slice(0, 10);
      if (!startIso || !endIso) return;
      // 같은 날 체크인/체크아웃인 경우는 기존 full 처리만 사용
      if (startIso === endIso) return;
      if (!map.has(roomKey)) {
        map.set(roomKey, new Set());
      }
      map.get(roomKey)!.add(endIso);
    });
    return map;
  }, [bookings]);

  const todayIso = toIsoDate(new Date());

  const nextIsoDate = (value: string) => {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    if (!year || !month || !day) return value;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return value;
    date.setDate(date.getDate() + 1);
    return toIsoDate(date);
  };

  const findBookingForCell = (room: RoomSummary, iso: string) => {
    const roomTypeKey = room.roomType || 'Unknown';
    const roomNumber = room.roomNumber;
    const targetDate = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) return null;
    return bookings.find((booking) => {
      if (!isActiveBooking(booking.status)) return false;
      const bookingRoomType = booking.room_type || 'Unknown';
      const bookingRoomNumber = booking.room_number || (booking.room_id ? String(booking.room_id) : 'Unknown');
      if (bookingRoomType !== roomTypeKey || bookingRoomNumber !== roomNumber) {
        return false;
      }
      const start = new Date(`${booking.check_in_date}T00:00:00`);
      const end = new Date(`${booking.check_out_date}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      if (start.toDateString() === end.toDateString()) {
        return targetDate.toDateString() === start.toDateString();
      }
      // 체크아웃일은 full-day 점유에서 제외(반칸 표시는 별도 처리)
      return targetDate >= start && targetDate < end;
    }) || null;
  };

  const findCheckoutBookingForCell = (room: RoomSummary, iso: string) => {
    const roomTypeKey = room.roomType || 'Unknown';
    const roomNumber = room.roomNumber;
    return bookings.find((booking) => {
      if (!isActiveBooking(booking.status)) return false;
      const bookingRoomType = booking.room_type || 'Unknown';
      const bookingRoomNumber = booking.room_number || (booking.room_id ? String(booking.room_id) : 'Unknown');
      if (bookingRoomType !== roomTypeKey || bookingRoomNumber !== roomNumber) return false;
      const start = new Date(`${booking.check_in_date}T00:00:00`);
      const end = new Date(`${booking.check_out_date}T00:00:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      return booking.check_out_date === iso && start < end;
    }) || null;
  };

  const canReserveAfterCheckout = (booking: RoomBooking) => {
    const normalizedTime = normalizeTimeValue(booking.check_out_time);
    const checkoutDateTime = new Date(`${booking.check_out_date}T${normalizedTime}`);
    if (Number.isNaN(checkoutDateTime.getTime())) return false;
    const availableAt = new Date(checkoutDateTime.getTime() + (2 * 60 * 60 * 1000));
    return new Date() >= availableAt;
  };

  const getAvailableAfterCheckout = (booking: RoomBooking) => {
    const normalizedTime = normalizeTimeValue(booking.check_out_time);
    const checkoutDateTime = new Date(`${booking.check_out_date}T${normalizedTime}`);
    if (Number.isNaN(checkoutDateTime.getTime())) return null;
    return new Date(checkoutDateTime.getTime() + (2 * 60 * 60 * 1000));
  };

  const handleCellClick = (room: RoomSummary, iso: string, isBooked: boolean, isCheckoutHalf: boolean) => {
    if (isBooked) {
      const matched = findBookingForCell(room, iso);
      if (matched) {
        setReservationMessageBooking(matched);
      }
      return;
    }
    if (!canManagePastCheckIn && iso < todayIso) {
      return;
    }
    if (isCheckoutHalf) {
      const matchedCheckoutBooking = findCheckoutBookingForCell(room, iso);
      if (matchedCheckoutBooking && !canReserveAfterCheckout(matchedCheckoutBooking)) {
        const checkoutTime = normalizeTimeValue(matchedCheckoutBooking.check_out_time);
        setBookingGateMessage(
          i18n.language === 'en'
            ? `Booking is available 2 hours after checkout (${matchedCheckoutBooking.check_out_date} ${checkoutTime}).`
            : `체크아웃(${matchedCheckoutBooking.check_out_date} ${checkoutTime}) 2시간 이후부터 예약 가능합니다.`
        );
        setBookingInfo(matchedCheckoutBooking);
        setBookingInfoOpen(true);
        return;
      }
    }
    setBookingGateMessage('');
    setBookingDialogSeed({
      roomType: room.roomType || '',
      roomNumber: room.roomNumber,
      checkInDate: iso,
      checkOutDate: nextIsoDate(iso)
    });
    setBookingDialogOpen(true);
  };

  const handleCloseBookingDialog = () => {
    setBookingDialogOpen(false);
    setBookingDialogSeed(null);
    loadBookings();
  };

  const handleEditBooking = (booking: RoomBooking | null) => {
    if (!booking) return;
    setReservationMessageBooking(null);
    setBookingInfoOpen(false);
    setBookingInfo(null);
    setBookingGateMessage('');
    navigate('/hotel/room-reservation', {
      state: { editBookingId: booking.id }
    });
  };

  const handleBookAfterCheckout = () => {
    if (!bookingInfo) return;

    const checkoutTime = normalizeTimeValue(bookingInfo.check_out_time);
    const availableAt = getAvailableAfterCheckout(bookingInfo);
    let nextCheckInDate = bookingInfo.check_out_date;
    let nextCheckInTime = '';

    if (availableAt) {
      nextCheckInDate = toIsoDate(availableAt);
      nextCheckInTime = `${pad2(availableAt.getHours())}:${pad2(availableAt.getMinutes())}`;
    }

    if (!canReserveAfterCheckout(bookingInfo)) {
      setBookingGateMessage(
        i18n.language === 'en'
          ? `Booking is available 2 hours after checkout (${bookingInfo.check_out_date} ${checkoutTime}).`
          : `체크아웃(${bookingInfo.check_out_date} ${checkoutTime}) 2시간 이후부터 예약 가능합니다.`
      );
    }

    const nextRoomNumber =
      bookingInfo.room_number || (bookingInfo.room_id ? String(bookingInfo.room_id) : '');

    setBookingInfoOpen(false);
    setBookingInfo(null);
    setBookingGateMessage('');
    setBookingDialogSeed({
      roomType: bookingInfo.room_type || '',
      roomNumber: nextRoomNumber,
      checkInDate: nextCheckInDate,
      checkInTime: nextCheckInTime,
      checkOutDate: nextIsoDate(nextCheckInDate)
    });
    setBookingDialogOpen(true);
  };

  const monthLabel = currentMonth.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'long'
  });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleOpenRoomTypeDialog = () => {
    setRoomTypeForm((prev) => ({
      ...prev,
      name: roomTypeFilter
    }));
    setRoomTypeDialogOpen(true);
  };

  const handleApplyRoomType = () => {
    setRoomTypeFilter(roomTypeForm.name.trim());
    setRoomTypeDialogOpen(false);
  };

  const handleOpenRoomNameDialog = (room: RoomSummary) => {
    if (!room.roomTypeId) return;
    setRoomNameForm({
      roomTypeId: room.roomTypeId,
      roomTypeName: room.roomType || '',
      roomNumber: room.roomNumber,
      roomName: room.roomName || ''
    });
    setRoomNameDialogOpen(true);
  };

  const handleSaveRoomName = async () => {
    if (!roomNameForm.roomTypeId || !roomNameForm.roomNumber) {
      setRoomNameDialogOpen(false);
      return;
    }
    try {
      const response = await roomTypeRoomService.upsertRoomTypeRoom({
        room_type_id: roomNameForm.roomTypeId,
        room_number: roomNameForm.roomNumber,
        room_name: roomNameForm.roomName
      });
      if (response.success) {
        const key = `${roomNameForm.roomTypeId}|${roomNameForm.roomNumber}`;
        setRoomNameMap((prev) => {
          const next = new Map(prev);
          if (roomNameForm.roomName.trim()) {
            next.set(key, roomNameForm.roomName.trim());
          } else {
            next.delete(key);
          }
          return next;
        });
      }
    } catch (err) {
      console.warn('객실 호실명 저장 실패:', err);
    } finally {
      setRoomNameDialogOpen(false);
    }
  };

  const gridBorder = theme.palette.mode === 'light' ? '#D1DAE4' : theme.palette.divider;
  const stickyRoomBg = theme.palette.mode === 'light' ? '#F1F5F9' : theme.palette.grey[900];
  const pastCellBg = alpha(theme.palette.grey[500], 0.14);
  const groupRowBg = theme.palette.mode === 'light' ? '#F4F7FB' : alpha(theme.palette.common.white, 0.04);

  const calendarCellBorderSx = {
    borderRight: `1px solid ${gridBorder}`,
    borderBottom: `1px solid ${gridBorder}`,
  } as const;

  const calendarRoomRowHeight = 34;
  const calendarRoomFontSize = '0.68rem';

  const calendarHeadCellSx = {
    py: '2px !important',
    px: 0.25,
    lineHeight: 1.1,
    textAlign: 'center' as const,
  } as const;

  const calendarSideHeadCellSx = {
    ...calendarHeadCellSx,
    fontWeight: 600,
    fontSize: `${calendarRoomFontSize} !important`,
  } as const;

  const calendarGroupCellSx = {
    py: '2px !important',
    height: 36,
    minHeight: 36,
    maxHeight: 36,
    lineHeight: '36px',
    textAlign: 'center' as const,
  } as const;

  const calendarRoomCellSx = {
    py: '1px !important',
    px: '0.35rem !important',
    height: calendarRoomRowHeight,
    minHeight: calendarRoomRowHeight,
    maxHeight: calendarRoomRowHeight,
    lineHeight: `${calendarRoomRowHeight}px`,
    fontSize: calendarRoomFontSize,
    fontWeight: 600,
    textAlign: 'center' as const,
  } as const;

  const calendarDateCellSx = {
    height: calendarRoomRowHeight,
    minHeight: calendarRoomRowHeight,
    maxHeight: calendarRoomRowHeight,
    py: '1px !important',
    px: 0,
    lineHeight: `${calendarRoomRowHeight}px`,
    fontSize: '0.62rem',
  } as const;

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('reservationStatus.title')}
        description={t('reservationStatus.description')}
        actions={
          <>
            <Button
              variant="contained"
              disableElevation
              onClick={() => navigate('/hotel/room-reservation')}
              sx={mvsBodyPrimaryBtnSx}
            >
              {t('reservationStatus.actions.book')}
            </Button>
            <Button
              variant="outlined"
              onClick={handleOpenRoomTypeDialog}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('reservationStatus.actions.roomTypeInput')}
            </Button>
            <Box sx={reservationMonthNavSx}>
              <IconButton
                onClick={handlePrevMonth}
                size="small"
                aria-label="previous month"
                sx={{ borderRadius: '10px' }}
              >
                <ChevronLeft fontSize="small" />
              </IconButton>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: '0.01em', px: 0.5, whiteSpace: 'nowrap' }}>
                {monthLabel}
              </Typography>
              <IconButton
                onClick={handleNextMonth}
                size="small"
                aria-label="next month"
                sx={{ borderRadius: '10px' }}
              >
                <ChevronRight fontSize="small" />
              </IconButton>
            </Box>
          </>
        }
      />

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box sx={mvsBodyFilterWrapSx}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 2fr) minmax(0, 1fr)' },
              gap: 2,
              alignItems: 'flex-end',
              ...(mvsSearchFieldSx as Record<string, unknown>),
            }}
          >
            <TextField
              size="small"
              fullWidth
              label={t('reservationStatus.filters.search')}
              placeholder={t('reservationStatus.placeholders.search')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              sx={reservationFilterFieldSx}
              {...mvsOutlinedLabelProps}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              fullWidth
              select
              label={t('reservationStatus.filters.roomType')}
              value={roomTypeFilter}
              onChange={(event) => setRoomTypeFilter(event.target.value)}
              sx={reservationFilterFieldSx}
              {...mvsOutlinedLabelProps}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => (selected ? selected : t('reservationStatus.filters.all')),
              }}
            >
              <MenuItem value="">{t('reservationStatus.filters.all')}</MenuItem>
              {roomTypeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          {error}
        </Alert>
      )}

      <Box sx={mvsBodyListZoneSx}>
        <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
          <Table
            size="small"
            stickyHeader
            sx={{
              width: '100%',
              minWidth: { xs: 640, sm: 800 },
              tableLayout: 'fixed',
              borderCollapse: 'separate',
              borderSpacing: 0,
              bgcolor: 'transparent',
              '& .MuiTableCell-root': {
                borderLeft: 'none',
                borderTop: 'none',
                ...calendarCellBorderSx,
              },
              '& .MuiTableCell-sizeSmall': {
                paddingTop: '1px',
                paddingBottom: '1px',
              },
              '& .MuiTableBody-root .MuiTableRow-root': {
                height: calendarRoomRowHeight,
              },
              '& .MuiTableBody-root .MuiTableCell-root': {
                paddingTop: '1px',
                paddingBottom: '1px',
              },
            }}
          >
              <colgroup>
                <col style={{ width: 104 }} />
                {dateRange.map((date) => (
                  <col key={toIsoDate(date)} />
                ))}
                <col style={{ width: 76 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <TableHead
                sx={{
                  ...mvsTableHeadHighlightSx,
                  '& .MuiTableCell-head': {
                    py: '2px !important',
                    px: 0.25,
                    lineHeight: 1.1,
                  },
                }}
              >
                <TableRow>
                  <TableCell
                    align="center"
                    sx={{
                      ...calendarSideHeadCellSx,
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      bgcolor: `${stickyRoomBg} !important`,
                      borderRight: `2px solid ${gridBorder}`,
                      color: 'text.primary',
                      width: 104,
                    }}
                  >
                    {t('reservationStatus.columns.room')}
                  </TableCell>
                  {dateRange.map((date) => {
                    const { day, weekday } = formatDayLabel(date, i18n.language === 'en' ? 'en-US' : 'ko-KR');
                    return (
                      <TableCell
                        key={toIsoDate(date)}
                        align="center"
                        sx={{
                          fontWeight: 700,
                      fontSize: '0.7rem',
                      lineHeight: 1.1,
                      overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          px: 0.25
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: '0.65rem' }}>
                            {day}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, fontSize: '0.6rem' }}>
                            {weekday}
                          </Typography>
                        </Box>
                      </TableCell>
                    );
                  })}
                  <TableCell align="center" sx={{ ...calendarSideHeadCellSx, width: 76 }}>
                    {t('reservationStatus.columns.booked')}
                  </TableCell>
                  <TableCell align="center" sx={{ ...calendarSideHeadCellSx, width: 92 }}>
                    {t('reservationStatus.columns.remaining')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow sx={{ height: 'auto !important' }}>
                    <TableCell colSpan={dateRange.length + 3} align="center">
                      <Box sx={{ py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredRooms.length === 0 && (
                  <TableRow sx={{ height: 'auto !important' }}>
                    <TableCell colSpan={dateRange.length + 3} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {t('reservationStatus.empty.noData')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && groupedRooms.map(([roomType, rooms]) => (
                  <React.Fragment key={roomType}>
                    <TableRow>
                    <TableCell
                        align="center"
                        colSpan={dateRange.length + 3}
                        sx={{
                          ...calendarGroupCellSx,
                          position: 'sticky',
                          left: 0,
                          backgroundColor: groupRowBg,
                          fontWeight: 700,
                          color: 'text.primary',
                          borderRight: `2px solid ${gridBorder}`,
                          fontSize: '0.7rem',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {roomType} ({rooms.length})
                      </TableCell>
                    </TableRow>
                    {rooms.map((room) => {
                      const bookingDays = bookingDaysByRoom.get(room.key) || new Set<string>();
                      const checkoutDays = checkoutDaysByRoom.get(room.key) || new Set<string>();
                      const bookedCount = bookingDays.size;
                      const availableCount = Math.max(dateRange.length - bookedCount, 0);

                      return (
                        <TableRow
                          key={room.key}
                          hover
                          sx={{
                            '&:hover td': {
                              backgroundColor: 'action.hover'
                            },
                            '&:hover td:first-of-type': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <TableCell
                            align="center"
                            sx={{
                              ...calendarRoomCellSx,
                              position: 'sticky',
                              left: 0,
                              backgroundColor: `${theme.palette.background.paper} !important`,
                              borderRight: `2px solid ${gridBorder}`,
                              fontWeight: 600,
                              zIndex: 2,
                              color: 'text.primary',
                              boxShadow: `4px 0 12px ${alpha('#0f172a', 0.04)}`,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                cursor: room.roomTypeId ? 'pointer' : 'default',
                                display: 'block',
                                width: '100%',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: 'text.primary',
                                lineHeight: `${calendarRoomRowHeight}px`,
                                fontSize: calendarRoomFontSize,
                              }}
                              onClick={() => room.roomTypeId && handleOpenRoomNameDialog(room)}
                            >
                              {room.roomName || room.roomNumber}
                            </Box>
                          </TableCell>
                          {dateRange.map((date) => {
                            const iso = toIsoDate(date);
                            const isBooked = bookingDays.has(iso);
                            const hasCheckoutHalf = checkoutDays.has(iso);
                            const isCheckoutHalf = !isBooked && hasCheckoutHalf;
                            const hasReservationMark = isBooked || hasCheckoutHalf;
                            const matchedBooking = isBooked
                              ? findBookingForCell(room, iso)
                              : null;
                            const matchedCheckoutBooking = hasCheckoutHalf
                                ? findCheckoutBookingForCell(room, iso)
                                : null;
                            const bookedGuestColor = matchedBooking ? getGuestColor(matchedBooking.guest_name) : '#b7d574';
                            const checkoutGuestColor = matchedCheckoutBooking
                              ? getGuestColor(matchedCheckoutBooking.guest_name)
                              : '#b7d574';
                            return (
                              <TableCell
                                key={`${room.key}-${iso}`}
                                align="center"
                                sx={{
                                  bgcolor: iso < todayIso ? pastCellBg : undefined,
                                  background:
                                    iso < todayIso
                                      ? undefined
                                      : isBooked && hasCheckoutHalf
                                        ? `linear-gradient(90deg, ${checkoutGuestColor} 0 50%, ${bookedGuestColor} 50% 100%)`
                                        : isBooked
                                          ? bookedGuestColor
                                          : hasCheckoutHalf
                                            ? `linear-gradient(90deg, ${checkoutGuestColor} 0 50%, transparent 50% 100%)`
                                            : undefined,
                                  cursor: isBooked || canManagePastCheckIn || iso >= todayIso
                                    ? 'pointer'
                                    : 'not-allowed',
                                  opacity: iso < todayIso && !isBooked && !canManagePastCheckIn ? 0.45 : 1,
                                  color: hasReservationMark ? '#1f2a14' : undefined,
                                  ...calendarDateCellSx,
                                }}
                                onClick={() => handleCellClick(room, iso, isBooked, isCheckoutHalf)}
                              >
                                {hasReservationMark ? 'B' : ''}
                              </TableCell>
                            );
                          })}
                          <TableCell
                            align="center"
                            sx={{
                              whiteSpace: 'nowrap',
                              ...calendarRoomCellSx,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'center',
                                fontWeight: 600,
                                lineHeight: `${calendarRoomRowHeight}px`,
                                fontSize: calendarRoomFontSize,
                              }}
                            >
                              {bookedCount}
                            </Box>
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              whiteSpace: 'nowrap',
                              ...calendarRoomCellSx,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'center',
                                fontWeight: 600,
                                lineHeight: `${calendarRoomRowHeight}px`,
                                fontSize: calendarRoomFontSize,
                              }}
                            >
                              {availableCount}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
      </Box>

      <Dialog open={roomTypeDialogOpen} onClose={() => setRoomTypeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('reservationStatus.dialog.roomTypeTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('reservationStatus.dialog.roomName')}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                size="small"
                placeholder={t('reservationStatus.placeholders.roomTypeName')}
                value={roomTypeForm.name}
                onChange={(event) =>
                  setRoomTypeForm((prev) => ({ ...prev, name: event.target.value }))
                }
                sx={mvsSearchFieldSx}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('reservationStatus.dialog.roomCount')}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 0 }}
                placeholder={t('reservationStatus.placeholders.roomCount')}
                value={roomTypeForm.count}
                onChange={(event) =>
                  setRoomTypeForm((prev) => ({ ...prev, count: event.target.value }))
                }
                sx={mvsSearchFieldSx}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('reservationStatus.dialog.nightlyRate')}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 0 }}
                placeholder={t('reservationStatus.placeholders.nightlyRate')}
                value={roomTypeForm.nightlyRate}
                onChange={(event) =>
                  setRoomTypeForm((prev) => ({ ...prev, nightlyRate: event.target.value }))
                }
                sx={mvsSearchFieldSx}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('reservationStatus.dialog.description')}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={t('reservationStatus.placeholders.roomTypeDesc')}
                multiline
                minRows={3}
                value={roomTypeForm.description}
                onChange={(event) =>
                  setRoomTypeForm((prev) => ({ ...prev, description: event.target.value }))
                }
                sx={mvsSearchFieldSx}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoomTypeDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" disableElevation onClick={handleApplyRoomType} sx={mvsBodyPrimaryBtnSx}>
            {t('reservationStatus.actions.apply')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={roomNameDialogOpen} onClose={() => setRoomNameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('reservationStatus.dialog.roomLabelTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('reservationStatus.filters.roomType')}
              </Typography>
              <TextField
                size="small"
                value={roomNameForm.roomTypeName}
                InputProps={{ readOnly: true }}
                fullWidth
                sx={mvsSearchFieldSx}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('reservationStatus.dialog.roomNo')}
              </Typography>
              <TextField
                size="small"
                value={roomNameForm.roomNumber}
                InputProps={{ readOnly: true }}
                fullWidth
                sx={mvsSearchFieldSx}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                {t('reservationStatus.dialog.roomLabel')}
              </Typography>
              <TextField
                size="small"
                placeholder={t('reservationStatus.placeholders.roomLabel')}
                value={roomNameForm.roomName}
                onChange={(event) =>
                  setRoomNameForm((prev) => ({ ...prev, roomName: event.target.value }))
                }
                fullWidth
                sx={mvsSearchFieldSx}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoomNameDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" disableElevation onClick={handleSaveRoomName} sx={mvsBodyPrimaryBtnSx}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {bookingDialogOpen && bookingDialogSeed && (
        <RoomBookingManagement
          dialogOnly
          initialFormState={{
            roomType: bookingDialogSeed.roomType,
            roomNumber: bookingDialogSeed.roomNumber,
            checkInDate: bookingDialogSeed.checkInDate,
            checkInTime: bookingDialogSeed.checkInTime,
            checkOutDate: bookingDialogSeed.checkOutDate
          }}
          onCloseDialog={handleCloseBookingDialog}
        />
      )}

      <Dialog
        open={Boolean(reservationMessageBooking)}
        onClose={() => setReservationMessageBooking(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('reservationStatus.dialog.reservationMessageTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {(reservationMessageBooking?.room_number ||
                reservationMessageBooking?.room_id ||
                '-') +
                ' · ' +
                (reservationMessageBooking?.guest_name || '-')}
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {reservationMessageBooking?.special_requests?.trim() ||
                t('reservationStatus.info.noReservationMessage')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => handleEditBooking(reservationMessageBooking)}
          >
            {t('reservationStatus.actions.editBooking')}
          </Button>
          <Button onClick={() => setReservationMessageBooking(null)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={bookingInfoOpen}
        onClose={() => {
          setBookingInfoOpen(false);
          setBookingInfo(null);
          setBookingGateMessage('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('reservationStatus.dialog.bookingInfoTitle')}</DialogTitle>
        <DialogContent>
          {bookingGateMessage && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              {bookingGateMessage}
            </Alert>
          )}
          {bookingInfo ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reservationStatus.info.bookingNo')}</Typography>
                <Typography variant="body2">{bookingInfo.booking_id || bookingInfo.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reservationStatus.info.guest')}</Typography>
                <Typography variant="body2">{bookingInfo.guest_name || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reservationStatus.info.contact')}</Typography>
                <Typography variant="body2">{bookingInfo.guest_phone || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reservationStatus.info.email')}</Typography>
                <Typography variant="body2">{bookingInfo.guest_email || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('reservationStatus.columns.checkin')}</Typography>
                  <Typography variant="body2">{formatDate(bookingInfo.check_in_date, i18n.language === 'en' ? 'en-US' : 'ko-KR')}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('reservationStatus.columns.checkout')}</Typography>
                  <Typography variant="body2">{formatDate(bookingInfo.check_out_date, i18n.language === 'en' ? 'en-US' : 'ko-KR')}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('reservationStatus.columns.memo')}</Typography>
                <Typography variant="body2">{bookingInfo.special_requests || '-'}</Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('reservationStatus.empty.bookingNotFound')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {bookingInfo && (
            <Button
              variant="outlined"
              onClick={() => handleEditBooking(bookingInfo)}
            >
              {t('reservationStatus.actions.editBooking')}
            </Button>
          )}
          {bookingGateMessage && bookingInfo && (
            <Button
              variant="contained"
              onClick={handleBookAfterCheckout}
            >
              {t('reservationStatus.actions.bookAfterCheckout')}
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              if (bookingInfo) {
                navigate('/hotel/room-reservation', {
                  state: { viewBookingId: bookingInfo.id }
                });
              }
              setBookingInfoOpen(false);
              setBookingInfo(null);
              setBookingGateMessage('');
            }}
          >
            {t('reservationStatus.actions.invoice')}
          </Button>
          <Button
            onClick={() => {
              setBookingInfoOpen(false);
              setBookingInfo(null);
              setBookingGateMessage('');
            }}
          >
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReservationStatus;
