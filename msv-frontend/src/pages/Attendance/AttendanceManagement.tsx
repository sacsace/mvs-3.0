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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { attendanceService, officeLocationService, vacationService, api } from '../../services/api';
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
  /** 라이트: 검정, 다크: 대비용 백색 */
  const inkFg = theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black;
  const { user } = useStore();
  const { t } = useTranslation();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [filter, setFilter] = useState({
    department: 'all',
    status: 'all'
  });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [vacationDaysInMonth, setVacationDaysInMonth] = useState(0);
  const [officeLocation, setOfficeLocation] = useState<{ latitude: number; longitude: number; radiusMeters?: number } | null>(null);
  /** admin / root / audit: 근태 현황에서 회사 전체·부서 필터 (일반 직원은 본인만) */
  const canListCompanyAttendance = ['admin', 'root', 'audit'].includes(String(user?.role || ''));
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
    if (!canListCompanyAttendance) {
      setDepartments([]);
      return;
    }
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        if (response.data.success) {
          const usersData = response.data.data || [];
          const deptSet = new Set<string>();
          usersData.forEach((u: any) => {
            if (u.department) deptSet.add(u.department);
          });
          setDepartments(Array.from(deptSet).sort());
        }
      } catch (e) {
        console.error('사용자 목록 로드 오류:', e);
      }
    };
    fetchUsers();
  }, [canListCompanyAttendance]);

  useEffect(() => {
    if (!canListCompanyAttendance) {
      setFilter((f) => (f.department !== 'all' ? { ...f, department: 'all' } : f));
    }
  }, [canListCompanyAttendance]);

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
        console.error('사무실 위치 로드 오류:', locationError);
      }
    };

    fetchOfficeLocation();
  }, []);

  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저에서는 위치 정보를 사용할 수 없습니다.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });

  // 오늘의 근태 조회
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
      const response = await attendanceService.getTodayAttendance(getClientDate());
        if (response.success) {
          setTodayAttendance(response.data);
        }
      } catch (error) {
        console.error('오늘의 근태 조회 오류:', error);
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
    const bounds = getMonthBoundsIST();
    let cancelled = false;
    vacationService
      .getVacations({
        user_id: user.id,
        status: 'approved',
        start_date: bounds.start_date,
        end_date: bounds.end_date
      })
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setVacationDaysInMonth(countVacationOverlapDaysInMonth(list, bounds.start_date, bounds.end_date));
      })
      .catch(() => {
        if (!cancelled) setVacationDaysInMonth(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const myMonthStats = useMemo(() => {
    const bounds = getMonthBoundsIST();
    if (!user?.id) {
      return { workingDays: 0, lateDays: 0 };
    }
    const myRows = attendances.filter((a) => {
      const ymd = toYmd(a.date);
      return a.user_id === user.id && ymd >= bounds.start_date && ymd <= bounds.end_date;
    });
    const workingDays = new Set(myRows.map((a) => toYmd(a.date))).size;
    const lateDays = myRows.filter(
      (a) => a.status === 'late' && !isWeekendYmd(toYmd(a.date))
    ).length;
    return { workingDays, lateDays };
  }, [attendances, user?.id]);

  // 근태 목록 조회
  const fetchAttendances = async () => {
    setLoading(true);
    setError(null);
    try {
      const bounds = getMonthBoundsIST();
      const params: any = {
        start_date: bounds.start_date,
        end_date: bounds.end_date
      };
      if (filter.status !== 'all') {
        params.status = filter.status;
      }
      if (canListCompanyAttendance && filter.department !== 'all') {
        params.department = filter.department;
      }

      const response = canListCompanyAttendance
        ? await attendanceService.getCompanyAttendances(params)
        : await attendanceService.getAttendances(params);
      if (response.success) {
        setAttendances(response.data || []);
      } else {
        setError(response.message || t('attendanceManagement.loadListFailed'));
      }
    } catch (error: any) {
      console.error('근태 목록 조회 오류:', error);
      setError(error.response?.data?.message || t('attendanceManagement.loadListError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, [filter.department, filter.status, canListCompanyAttendance]);

  // 출근 처리
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
      console.error('출근 처리 오류:', error);
      if (error.code === 1 || error.message?.includes('Geolocation')) {
        setError(t('attendanceManagement.locationRequired'));
      } else {
        setError(error.response?.data?.message || t('attendanceManagement.checkInError'));
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  // 퇴근 처리
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
        // 성공 메시지는 선택 언어(i18n) 기준으로 고정 표시
        setSuccess(t('attendanceManagement.checkOutSuccess'));
        setTodayAttendance(response.data);
        fetchAttendances();
      } else {
        setError(response.message || t('attendanceManagement.checkOutFailed'));
      }
    } catch (error: any) {
      console.error('퇴근 처리 오류:', error);
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

  const getDisplayStatus = (attendance: Attendance) => {
    const ymd = toYmd(attendance.date);
    if (isWeekendYmd(ymd)) {
      return {
        label: t('attendanceManagement.statusHolidayWork'),
        color: 'primary' as const
      };
    }
    return {
      label: getStatusLabel(attendance.status),
      color: getStatusColor(attendance.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
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
      console.error('시간 포맷팅 오류:', error, dateString);
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

  const boundsThisMonth = getMonthBoundsIST();
  const filteredAttendances = attendances.filter((attendance) => {
    const ymd = toYmd(attendance.date);
    if (ymd < boundsThisMonth.start_date || ymd > boundsThisMonth.end_date) return false;
    if (filter.department !== 'all' && attendance.user?.department !== filter.department) return false;
    if (filter.status !== 'all' && attendance.status !== filter.status) return false;
    return true;
  });

  const monthPeriodLabel = (() => {
    const b = getMonthBoundsIST();
    return t('attendanceManagement.monthPeriodLabel', { year: b.year, month: b.month });
  })();

  const todayYmd = getClientDate();
  const todayIsWeekend = isWeekendYmd(todayYmd);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <ScheduleIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
        <Typography component="h1" sx={{ 
          fontSize: '16px !important',
          fontWeight: 600,
          color: inkFg,
          lineHeight: 1.5
        }}>
          {t('attendanceManagement.pageTitle')}
        </Typography>
      </Box>

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

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          justifyContent: 'space-around',
          alignItems: 'center'
        }}
      >
        <Box sx={{ textAlign: 'center', minWidth: 100 }}>
          <Typography variant="caption" sx={{ color: inkFg, display: 'block' }}>
            {t('attendanceManagement.statWorkingDays')}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: inkFg }}>
            {myMonthStats.workingDays}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', minWidth: 100 }}>
          <Typography variant="caption" sx={{ color: inkFg, display: 'block' }}>
            {t('attendanceManagement.statVacationDays')}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: inkFg }}>
            {vacationDaysInMonth}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', minWidth: 100 }}>
          <Typography variant="caption" sx={{ color: inkFg, display: 'block' }}>
            {t('attendanceManagement.statLateDays')}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: inkFg }}>
            {myMonthStats.lateDays}
          </Typography>
        </Box>
      </Paper>

      {/* 오늘의 근태 카드 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography
              variant="h6"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: inkFg }}
            >
              <AccessTimeIcon color="primary" />
              {t('attendanceManagement.todayAttendance')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckInIcon />}
                onClick={handleCheckIn}
                disabled={checkInLoading || !!todayAttendance?.check_in}
                size="small"
              >
                {checkInLoading ? <CircularProgress size={16} /> : t('attendanceManagement.checkIn')}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<CheckOutIcon />}
                onClick={handleCheckOut}
                disabled={checkOutLoading || !todayAttendance?.check_in || !!todayAttendance?.check_out}
                size="small"
              >
                {checkOutLoading ? <CircularProgress size={16} /> : t('attendanceManagement.checkOut')}
              </Button>
            </Box>
          </Box>
          
          {todayAttendance ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: inkFg }}>{t('attendanceManagement.checkInTime')}</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: inkFg }}>
                  {displayTime(
                    todayAttendance.check_in,
                    todayAttendance.check_in_local,
                    todayAttendance.check_in_display,
                    todayAttendance.check_in_client_time
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: inkFg }}>{t('attendanceManagement.checkOutTime')}</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: inkFg }}>
                  {displayTime(
                    todayAttendance.check_out,
                    todayAttendance.check_out_local,
                    todayAttendance.check_out_display,
                    todayAttendance.check_out_client_time
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: inkFg }}>{t('attendanceManagement.workHours')}</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ color: inkFg }}>
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
                <Typography variant="caption" component="span" display="block" sx={{ color: inkFg }}>
                  {t('attendanceManagement.status')}
                </Typography>
                <Chip
                  label={
                    todayIsWeekend
                      ? t('attendanceManagement.statusHolidayWork')
                      : getStatusLabel(todayAttendance.status)
                  }
                  color={(todayIsWeekend ? 'primary' : getStatusColor(todayAttendance.status)) as any}
                  size="small"
                />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: inkFg }}>
              {t('attendanceManagement.noTodayAttendance')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 근태 현황 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: inkFg }}>
              {t('attendanceManagement.attendanceStatus')}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              size="small"
              onClick={fetchAttendances}
              disabled={loading}
            >
              {t('attendanceManagement.refresh')}
            </Button>
          </Box>

          {/* 필터 (당월 고정) */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 200px' }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: inkFg, fontSize: '0.875rem' }}>
                {t('attendanceManagement.currentMonthRange')}
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ color: inkFg }}>
                {monthPeriodLabel}
              </Typography>
              <Typography variant="caption" sx={{ color: inkFg }}>
                {boundsThisMonth.start_date} ~ {boundsThisMonth.end_date}
              </Typography>
            </Box>
            {canListCompanyAttendance && (
              <FormControl sx={{ flex: '1 1 180px', minWidth: 160 }} size="small">
                <Typography variant="body2" sx={{ mb: 0.5, color: inkFg, fontSize: '0.875rem' }}>
                  {t('attendanceManagement.department')}
                </Typography>
                <Select
                  value={filter.department}
                  onChange={(e) => setFilter({ ...filter, department: e.target.value })}
                  displayEmpty
                  sx={{ height: '40px' }}
                >
                  <MenuItem value="all">{t('attendanceManagement.all')}</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl sx={{ flex: '1 1 180px', minWidth: 160 }} size="small">
              <Typography variant="body2" sx={{ mb: 0.5, color: inkFg, fontSize: '0.875rem' }}>
                {t('attendanceManagement.status')}
              </Typography>
              <Select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                displayEmpty
                sx={{ height: '40px' }}
              >
                <MenuItem value="all">{t('attendanceManagement.all')}</MenuItem>
                <MenuItem value="normal">{t('attendanceManagement.statusNormal')}</MenuItem>
                <MenuItem value="late">{t('attendanceManagement.statusLate')}</MenuItem>
                <MenuItem value="early">{t('attendanceManagement.statusEarly')}</MenuItem>
                <MenuItem value="overtime">{t('attendanceManagement.statusOvertime')}</MenuItem>
                <MenuItem value="absent">{t('attendanceManagement.statusAbsent')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredAttendances.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: inkFg }}>
                {t('attendanceManagement.noRecords')}
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                overflow: 'hidden'
              }}
            >
              <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                <TableHead>
                  <TableRow
                    sx={{
                      '& .MuiTableCell-head': {
                        backgroundColor: 'grey.50',
                        color: inkFg,
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        py: 1.25,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        borderRight: 'none',
                        borderLeft: 'none',
                        borderTop: 'none',
                        whiteSpace: 'nowrap'
                      }
                    }}
                  >
                    <TableCell>{t('attendanceManagement.employeeId')}</TableCell>
                    <TableCell>{t('attendanceManagement.employeeName')}</TableCell>
                    <TableCell>{t('attendanceManagement.department')}</TableCell>
                    <TableCell>{t('attendanceManagement.date')}</TableCell>
                    <TableCell>{t('attendanceManagement.checkInTimeShort')}</TableCell>
                    <TableCell>{t('attendanceManagement.checkOutTimeShort')}</TableCell>
                    <TableCell>{t('attendanceManagement.workHoursShort')}</TableCell>
                    <TableCell>{t('attendanceManagement.status')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={{ '& .MuiTableCell-body': { color: inkFg } }}>
                  {filteredAttendances.map((attendance) => {
                    const disp = getDisplayStatus(attendance);
                    return (
                      <TableRow key={attendance.id} hover>
                        <TableCell>{attendance.user?.employee_number || '-'}</TableCell>
                        <TableCell>{attendance.user?.username || '-'}</TableCell>
                        <TableCell>{attendance.user?.department || '-'}</TableCell>
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
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttendanceManagement;
