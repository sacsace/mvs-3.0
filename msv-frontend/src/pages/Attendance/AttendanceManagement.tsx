import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  AlertTitle
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import {
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import {
  mvsFilterToolbarSx,
  mvsSearchFieldSx,
  mvsInnerCardSx,
} from '../../theme/mvsLayout';
import { attendanceService, officeLocationService, vacationService } from '../../services/api';
import { useStore } from '../../store';

interface Attendance {
  id: number;
  user_id: number;
  date: string;
  check_in?: string;
  check_out?: string;
  check_in_local?: string;
  check_out_local?: string;
  check_in_display?: string;
  check_out_display?: string;
  check_in_client_time?: string;
  check_out_client_time?: string;
  work_hours?: number;
  status: 'normal' | 'late' | 'early' | 'overtime' | 'absent';
  notes?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    department?: string;
    position?: string;
    employee_number?: string;
  };
}

const pad2ymd = (value: number) => value.toString().padStart(2, '0');

const toYmd = (dateVal: string) => {
  const s = String(dateVal || '');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
};

const isWeekendYmd = (ymd: string) => {
  const matched = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return false;
  const y = parseInt(matched[1], 10);
  const mo = parseInt(matched[2], 10);
  const d = parseInt(matched[3], 10);
  const dt = new Date(`${y}-${pad2ymd(mo)}-${pad2ymd(d)}T12:00:00+05:30`);
  const day = dt.getDay();
  return day === 0 || day === 6;
};

const countVacationOverlapDaysInMonth = (
  vacations: Array<{ start_date: string; end_date: string }>,
  monthStart: string,
  monthEnd: string
) => {
  let total = 0;
  for (const v of vacations) {
    const vs = toYmd(String(v.start_date));
    const ve = toYmd(String(v.end_date));
    const start = vs > monthStart ? vs : monthStart;
    const end = ve < monthEnd ? ve : monthEnd;
    if (start > end) continue;
    const d1 = new Date(`${start}T12:00:00+05:30`);
    const d2 = new Date(`${end}T12:00:00+05:30`);
    total += Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
  }
  return total;
};

const AttendanceManagement: React.FC = () => {
  const theme = useTheme();
  /** ???: ??, ??: ??? ?? */
  const inkFg = theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black;
  const { user } = useStore();
  const { t } = useTranslation();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [filter, setFilter] = useState({
    status: 'all'
  });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [vacationDaysInMonth, setVacationDaysInMonth] = useState(0);
  const [officeLocation, setOfficeLocation] = useState<{ latitude: number; longitude: number; radiusMeters?: number } | null>(null);
  /** 근태관리는 개인화 화면으로 고정: 로그인 사용자 데이터만 조회 */
  const TIME_ZONE = 'Asia/Kolkata';
  const IST_OFFSET_MINUTES = 330;
  const pad2 = (value: number) => value.toString().padStart(2, '0');
  const parseUtcDate = (value: string) => {
    const hasTimeZone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value);
    return new Date(hasTimeZone ? value : `${value}Z`);
  };
  const getClientTimeParts = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const lookup = (type: string) => parts.find((part) => part.type === type)?.value || '';
    return {
      year: lookup('year'),
      month: lookup('month'),
      day: lookup('day'),
      hour: lookup('hour'),
      minute: lookup('minute'),
      second: lookup('second')
    };
  };
  const getClientDate = () => {
    const { year, month, day } = getClientTimeParts();
    return `${year}-${month}-${day}`;
  };
  const getMonthBoundsIST = () => {
    const { year, month } = getClientTimeParts();
    const y = parseInt(year, 10);
    const mb = parseInt(month, 10);
    const lastDay = new Date(y, mb, 0).getDate();
    return {
      start_date: `${year}-${month}-01`,
      end_date: `${year}-${month}-${pad2(lastDay)}`,
      year: y,
      month: mb
    };
  };
  const initialBounds = getMonthBoundsIST();
  const [startDate, setStartDate] = useState(initialBounds.start_date);
  const [endDate, setEndDate] = useState(initialBounds.end_date);
  const getClientTimeISO = () => {
    const { year, month, day, hour, minute, second } = getClientTimeParts();
    return `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`;
  };
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const earthRadiusMeters = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
      * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  };

  useEffect(() => {
    const fetchOfficeLocation = async () => {
      try {
        const response = await officeLocationService.getOfficeLocation();
        if (response.success) {
          const location = response.data?.officeLocation;
          if (location?.latitude && location?.longitude) {
            setOfficeLocation({
              latitude: typeof location.latitude === 'string' ? parseFloat(location.latitude) : location.latitude,
              longitude: typeof location.longitude === 'string' ? parseFloat(location.longitude) : location.longitude,
              radiusMeters: location.radiusMeters
            });
          } else {
            setOfficeLocation(null);
          }
        }
      } catch (locationError) {
        console.error('??? ?? ?? ??:', locationError);
      }
    };

    fetchOfficeLocation();
  }, []);

  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('? ??????? ?? ??? ??? ? ????.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

  // ??? ?? ??
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
      const response = await attendanceService.getTodayAttendance(getClientDate());
        if (response.success) {
          setTodayAttendance(response.data);
        }
      } catch (error) {
        console.error('??? ?? ?? ??:', error);
      }
    };

    if (user) {
      fetchTodayAttendance();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setVacationDaysInMonth(0);
      return;
    }
    let cancelled = false;
    vacationService
      .getVacations({
        user_id: user.id,
        status: 'approved',
        start_date: startDate,
        end_date: endDate
      })
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setVacationDaysInMonth(countVacationOverlapDaysInMonth(list, startDate, endDate));
      })
      .catch(() => {
        if (!cancelled) setVacationDaysInMonth(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, startDate, endDate]);

  const myMonthStats = useMemo(() => {
    if (!user?.id) {
      return { workingDays: 0, lateDays: 0 };
    }
    const myRows = attendances.filter((a) => {
      const ymd = toYmd(a.date);
      return a.user_id === user.id && ymd >= startDate && ymd <= endDate;
    });
    const workingDays = new Set(myRows.map((a) => toYmd(a.date))).size;
    const lateDays = myRows.filter(
      (a) => a.status === 'late' && !isWeekendYmd(toYmd(a.date))
    ).length;
    return { workingDays, lateDays };
  }, [attendances, user?.id, startDate, endDate]);

  // ?? ?? ??
  const fetchAttendances = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        start_date: startDate,
        end_date: endDate
      };
      if (filter.status !== 'all') {
        params.status = filter.status;
      }

      const response = await attendanceService.getAttendances(params);
      if (response.success) {
        setAttendances(response.data || []);
      } else {
        setError(response.message || t('attendanceManagement.loadListFailed'));
      }
    } catch (error: any) {
      console.error('?? ?? ?? ??:', error);
      setError(error.response?.data?.message || t('attendanceManagement.loadListError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return;
    if (startDate > endDate) return;
    fetchAttendances();
  }, [filter.status, startDate, endDate]);

  // ?? ??
  const handleCheckIn = async () => {
    if (todayAttendance?.check_in) {
      setError(t('attendanceManagement.alreadyCheckedIn'));
      return;
    }
    setCheckInLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const client_time = getClientTimeISO();
      const client_date = getClientDate();
      const requiresSecureContext = typeof window !== 'undefined' && !window.isSecureContext;
      const canUseGeo = !!navigator.geolocation && !requiresSecureContext;
      let skipGeo = !canUseGeo;
      let latitude: number | undefined;
      let longitude: number | undefined;
      let accuracy: number | undefined;

      if (canUseGeo) {
        try {
          const position = await getCurrentPosition();
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          accuracy = position.coords.accuracy;
        } catch (geoError) {
          skipGeo = true;
        }
      }

      if (officeLocation && !skipGeo && latitude !== undefined && longitude !== undefined) {
        const radiusMeters = officeLocation.radiusMeters ?? 200;
        const distance = calculateDistanceMeters(
          latitude,
          longitude,
          officeLocation.latitude,
          officeLocation.longitude
        );
        if (distance > radiusMeters) {
          setError(t('attendanceManagement.officeOnly'));
          return;
        }
      }
            const response = await attendanceService.checkIn({
        latitude,
        longitude,
        accuracy,
        client_time,
        client_date,
        use_server_time: skipGeo,
        skip_geo: skipGeo
      });
      if (response.success) {
        setSuccess(response.message || t('attendanceManagement.checkInSuccess'));
        setTodayAttendance(response.data);
        fetchAttendances();
      } else {
        setError(response.message || t('attendanceManagement.checkInFailed'));
      }
    } catch (error: any) {
      console.error('?? ?? ??:', error);
      if (error.code === 1 || error.message?.includes('Geolocation')) {
        setError(t('attendanceManagement.locationRequired'));
      } else {
        setError(error.response?.data?.message || t('attendanceManagement.checkInError'));
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  // ?? ??
  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const client_time = getClientTimeISO();
      const client_date = getClientDate();
            const response = await attendanceService.checkOut({
        client_time,
        client_date,
        use_server_time: true,
        skip_geo: true
      });
      if (response.success) {
        // ?? ???? ?? ??(i18n) ???? ?? ??
        setSuccess(t('attendanceManagement.checkOutSuccess'));
        setTodayAttendance(response.data);
        fetchAttendances();
      } else {
        setError(response.message || t('attendanceManagement.checkOutFailed'));
      }
    } catch (error: any) {
      console.error('?? ?? ??:', error);
        setError(error.response?.data?.message || t('attendanceManagement.checkOutError'));
    } finally {
      setCheckOutLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return t('attendanceManagement.statusNormal');
      case 'late': return t('attendanceManagement.statusLate');
      case 'early': return t('attendanceManagement.statusEarly');
      case 'overtime': return t('attendanceManagement.statusOvertime');
      case 'absent': return t('attendanceManagement.statusAbsent');
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'late': return 'warning';
      case 'early': return 'info';
      case 'overtime': return 'secondary';
      case 'absent': return 'error';
      default: return 'default';
    }
  };

  type DisplayStatus = {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    holiday?: boolean;
  };

  const getDisplayStatus = (attendance: Attendance): DisplayStatus => {
    const ymd = toYmd(attendance.date);
    if (isWeekendYmd(ymd)) {
      return {
        label: t('attendanceManagement.statusHolidayWork'),
        color: 'default',
        holiday: true
      };
    }
    return {
      label: getStatusLabel(attendance.status),
      color: getStatusColor(attendance.status) as DisplayStatus['color']
    };
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = parseUtcDate(dateString);
      if (Number.isNaN(date.getTime())) return dateString;
      const istMs = date.getTime() + IST_OFFSET_MINUTES * 60 * 1000;
      const istDate = new Date(istMs);
      const hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes();
      const period = hours >= 12 ? '오후' : '오전';
      const displayHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${period} ${pad2(displayHour)}:${pad2(minutes)}`;
    } catch (error) {
      console.error('?? ??? ??:', error, dateString);
      return dateString;
    }
  };

  const formatClientTimeString = (value?: string) => {
    if (!value) return null;
    const match = value.match(/T(\d{2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = match[2];
    const period = hours >= 12 ? '오후' : '오전';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${period} ${pad2(displayHour)}:${minutes}`;
  };

  const displayTime = (
    rawTime?: string,
    localTime?: string,
    displayTimeValue?: string,
    clientTimeValue?: string
  ) => {
    const clientDisplay = formatClientTimeString(clientTimeValue);
    if (clientDisplay) {
      return clientDisplay;
    }
    if (displayTimeValue) {
      return displayTimeValue;
    }
    if (rawTime) {
      return formatTime(rawTime);
    }
    if (localTime) {
      return localTime;
    }
    return '-';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: TIME_ZONE
      });
    } catch {
      return dateString;
    }
  };

  const filteredAttendances = attendances.filter((attendance) => {
    const ymd = toYmd(attendance.date);
    if (ymd < startDate || ymd > endDate) return false;
    if (filter.status !== 'all' && attendance.status !== filter.status) return false;
    return true;
  });

  const todayYmd = getClientDate();
  const todayIsWeekend = isWeekendYmd(todayYmd);

  const labelColor = theme.palette.mode === 'dark' ? inkFg : 'text.secondary';
  const valueColor = theme.palette.mode === 'dark' ? inkFg : 'text.primary';

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader title={t('attendanceManagement.pageTitle')} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>{t('attendanceManagement.heresnowTitle')}</AlertTitle>
        {t('attendanceManagement.personalViewNotice')}
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          elevation={0}
          sx={{
            ...mvsInnerCardSx,
            p: 0,
            overflow: 'hidden',
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#FFFFFF',
          }}
        >
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: labelColor, display: 'block', fontWeight: 600, letterSpacing: '0.02em', mb: 1 }}>
              {t('attendanceManagement.statWorkingDays')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ color: valueColor }}>
              {myMonthStats.workingDays}
            </Typography>
          </CardContent>
        </Card>
        <Card
          elevation={0}
          sx={{
            ...mvsInnerCardSx,
            p: 0,
            overflow: 'hidden',
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#FFFFFF',
          }}
        >
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: labelColor, display: 'block', fontWeight: 600, letterSpacing: '0.02em', mb: 1 }}>
              {t('attendanceManagement.statVacationDays')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ color: valueColor }}>
              {vacationDaysInMonth}
            </Typography>
          </CardContent>
        </Card>
        <Card
          elevation={0}
          sx={{
            ...mvsInnerCardSx,
            p: 0,
            overflow: 'hidden',
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : '#FFFFFF',
          }}
        >
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: labelColor, display: 'block', fontWeight: 600, letterSpacing: '0.02em', mb: 1 }}>
              {t('attendanceManagement.statLateDays')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ color: 'warning.dark' }}>
              {myMonthStats.lateDays}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* ??? ?? ?? ? ???? ???? ?? ?, ?? ??? ?? */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '20px',
          border: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
        }}
      >
        <CardContent sx={{ py: 3, px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
            <Typography
              variant="sectionTitle"
              sx={{
                color: valueColor,
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              {t('attendanceManagement.todayAttendance')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, '& .MuiButton-root': { minHeight: 40, textTransform: 'none', borderRadius: '12px', fontWeight: 600 } }}>
              <Button
                variant="contained"
                color="primary"
                disableElevation
                startIcon={<CheckInIcon sx={{ fontSize: 18 }} />}
                onClick={handleCheckIn}
                disabled={checkInLoading || !!todayAttendance?.check_in}
                size="medium"
              >
                {checkInLoading ? <CircularProgress size={16} color="inherit" /> : t('attendanceManagement.checkIn')}
              </Button>
              <Button
                variant="outlined"
                disableElevation
                startIcon={<CheckOutIcon sx={{ fontSize: 18 }} />}
                onClick={handleCheckOut}
                disabled={checkOutLoading || !todayAttendance?.check_in || !!todayAttendance?.check_out}
                size="medium"
                sx={{
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.18)' : undefined,
                    bgcolor: 'action.hover',
                  },
                  '&.Mui-disabled': {
                    borderColor: 'divider',
                  },
                }}
              >
                {checkOutLoading ? <CircularProgress size={16} /> : t('attendanceManagement.checkOut')}
              </Button>
            </Box>
          </Box>
          
          {todayAttendance ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2.5,
                p: 2.5,
                borderRadius: '14px',
                border: '1px solid',
                borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : 'divider',
                bgcolor: (th) =>
                  th.palette.mode === 'dark' ? alpha(th.palette.common.white, 0.04) : alpha(th.palette.common.black, 0.02),
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: labelColor, display: 'block', mb: 0.5 }}>{t('attendanceManagement.checkInTime')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: valueColor, fontSize: '0.9375rem' }}>
                  {displayTime(
                    todayAttendance.check_in,
                    todayAttendance.check_in_local,
                    todayAttendance.check_in_display,
                    todayAttendance.check_in_client_time
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: labelColor, display: 'block', mb: 0.5 }}>{t('attendanceManagement.checkOutTime')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: valueColor, fontSize: '0.9375rem' }}>
                  {displayTime(
                    todayAttendance.check_out,
                    todayAttendance.check_out_local,
                    todayAttendance.check_out_display,
                    todayAttendance.check_out_client_time
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: labelColor, display: 'block', mb: 0.5 }}>{t('attendanceManagement.workHours')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: valueColor, fontSize: '0.9375rem' }}>
                  {todayAttendance.work_hours != null ? `${todayAttendance.work_hours}${t('attendanceManagement.hoursUnit')}` : '-'}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 0.75
                }}
              >
                <Typography variant="caption" component="span" display="block" sx={{ color: labelColor, mb: 0.5 }}>
                  {t('attendanceManagement.status')}
                </Typography>
                <Chip
                  label={
                    todayIsWeekend
                      ? t('attendanceManagement.statusHolidayWork')
                      : getStatusLabel(todayAttendance.status)
                  }
                  color={(todayIsWeekend ? 'default' : getStatusColor(todayAttendance.status)) as any}
                  size="small"
                  variant={todayIsWeekend ? 'outlined' : 'filled'}
                  sx={
                    todayIsWeekend
                      ? {
                          height: 26,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : theme.palette.divider,
                          bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.8)' : alpha(theme.palette.common.white, 0.06),
                          color: 'text.primary',
                        }
                      : { height: 26, fontWeight: 600, fontSize: '0.75rem' }
                  }
                />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: labelColor }}>
              {t('attendanceManagement.noTodayAttendance')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ?? ?? */}
      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
        }}
      >
        <CardContent sx={{ py: 3, px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Typography variant="sectionTitle" sx={{ color: valueColor }}>
              {t('attendanceManagement.attendanceStatus')}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
              size="small"
              onClick={fetchAttendances}
              disabled={loading}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '12px',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              {t('attendanceManagement.refresh')}
            </Button>
          </Box>

          {/* ?? (?? ??) ? ??? ?? ?? ????? ?? ?? ??? */}
          <Box
            sx={{
              ...mvsFilterToolbarSx,
              ...mvsSearchFieldSx,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: 2,
              marginBottom: 0,
              backgroundColor:
                theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.03),
            }}
          >
            <Box sx={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: labelColor, fontSize: '0.8125rem', fontWeight: 600 }}>
                {t('attendanceManagement.currentMonthRange')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  type="date"
                  label={t('attendanceManagement.startDate')}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 170 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label={t('attendanceManagement.endDate')}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 170 }}
                />
              </Box>
            </Box>
            <TextField
              fullWidth
              size="small"
              select
              label={t('attendanceManagement.status')}
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) =>
                  selected === 'all' ? t('attendanceManagement.all') : getStatusLabel(String(selected)),
              }}
              sx={{ flex: '1 1 180px', minWidth: 160 }}
            >
              <MenuItem value="all">{t('attendanceManagement.all')}</MenuItem>
              <MenuItem value="normal">{t('attendanceManagement.statusNormal')}</MenuItem>
              <MenuItem value="late">{t('attendanceManagement.statusLate')}</MenuItem>
              <MenuItem value="early">{t('attendanceManagement.statusEarly')}</MenuItem>
              <MenuItem value="overtime">{t('attendanceManagement.statusOvertime')}</MenuItem>
              <MenuItem value="absent">{t('attendanceManagement.statusAbsent')}</MenuItem>
            </TextField>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredAttendances.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: labelColor }}>
                {t('attendanceManagement.noRecords')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2.5 }}>
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 0,
                  overflow: 'visible',
                  border: 'none',
                  boxShadow: 'none',
                  bgcolor: 'transparent',
                }}
              >
                <Table
                  size="medium"
                  sx={{
                    borderCollapse: 'collapse',
                    '& .MuiTableCell-root': {
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderTop: 'none',
                    },
                  }}
                >
                  <TableHead
                    sx={{
                      bgcolor:
                        theme.palette.mode === 'light'
                          ? 'rgba(0, 0, 0, 0.02)'
                          : alpha(theme.palette.common.white, 0.04),
                      '& .MuiTableCell-head': {
                        bgcolor:
                          theme.palette.mode === 'light'
                            ? 'rgba(0, 0, 0, 0.02)'
                            : alpha(theme.palette.common.white, 0.04),
                        color:
                          theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.6)' : theme.palette.grey[300],
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.01em',
                        borderBottom: `1px solid ${
                          theme.palette.mode === 'light'
                            ? 'rgba(15, 23, 42, 0.06)'
                            : theme.palette.divider
                        }`,
                        py: 1.5,
                        px: 2,
                      },
                    }}
                  >
                      <TableRow>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceManagement.employeeName')}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceManagement.date')}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceManagement.checkInTimeShort')}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceManagement.checkOutTimeShort')}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceManagement.workHoursShort')}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceManagement.status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody
                      sx={{
                        '& .MuiTableCell-body': {
                          color: valueColor,
                          py: 1.5,
                          px: 2,
                          fontSize: '0.875rem',
                          borderBottom: `1px solid ${
                            theme.palette.mode === 'light'
                              ? 'rgba(15, 23, 42, 0.06)'
                              : theme.palette.divider
                          }`,
                        },
                        '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      {filteredAttendances.map((attendance) => {
                        const disp = getDisplayStatus(attendance);
                        return (
                          <TableRow
                            key={attendance.id}
                            hover
                            sx={{
                              transition: 'background-color 0.15s ease',
                              '&:hover': {
                                bgcolor: theme.palette.action.hover,
                              },
                            }}
                          >
                            <TableCell sx={{ fontWeight: 500 }}>{attendance.user?.username || '-'}</TableCell>
                            <TableCell>{formatDate(attendance.date)}</TableCell>
                            <TableCell>{displayTime(
                              attendance.check_in,
                              attendance.check_in_local,
                              attendance.check_in_display,
                              attendance.check_in_client_time
                            )}</TableCell>
                            <TableCell>{displayTime(
                              attendance.check_out,
                              attendance.check_out_local,
                              attendance.check_out_display,
                              attendance.check_out_client_time
                            )}</TableCell>
                            <TableCell>
                              {attendance.work_hours != null ? `${attendance.work_hours}${t('attendanceManagement.hoursUnit')}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={disp.label}
                                color={disp.color as any}
                                size="small"
                                variant={disp.holiday ? 'outlined' : 'filled'}
                                sx={{
                                  height: 26,
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  ...(disp.holiday
                                    ? {
                                        borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : theme.palette.divider,
                                        bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.9)' : alpha(theme.palette.common.white, 0.06),
                                        color: 'text.primary',
                                      }
                                    : {}),
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttendanceManagement;
