import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  Chip,
  Switch,
  FormControlLabel,
  Slider
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import {
  Sync as SyncIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import {
  mvsFilterToolbarSx,
  mvsSearchFieldSx,
  mvsInnerCardSx,
  mvsTitleBlockSx,
} from '../../theme/mvsLayout';
import { attendanceService } from '../../services/api';
import { heresnowIntegrationService } from '../../services/api';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';

interface AttendanceRow {
  id: number;
  user_id: number;
  date: string;
  work_hours?: number;
  status: string;
  check_in?: string | null;
  check_out?: string | null;
  check_in_local?: string | null;
  check_out_local?: string | null;
  check_in_display?: string | null;
  check_out_display?: string | null;
  user?: {
    id: number;
    username: string;
    email?: string;
    department?: string;
    position?: string;
    employee_number?: string;
  };
}

interface UserAggregate {
  userId: number;
  name: string;
  department: string;
  recordCount: number;
  totalHours: number;
  lateCount: number;
  absentCount: number;
  normalCount: number;
}

type MatrixCellType = 'complete' | 'partial' | 'absent' | 'empty';
type MatrixUserRow = {
  key: string;
  userId: number | null;
  name: string;
  department: string;
  isUnregistered: boolean;
  prefillEmail?: string;
};
type MatrixCellRow = {
  status?: string;
  check_in?: string | null;
  check_out?: string | null;
};
type UnregisteredAttendanceRecord = {
  email?: string;
  name?: string;
  externalEmployeeId?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatYm(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getCurrentMonthInputValue() {
  return formatYm(new Date());
}

function monthRangeFromYm(ym: string): { start: string; end: string } | null {
  const match = String(ym || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: formatYmd(start), end: formatYmd(end) };
}

function deriveYmFromRange(start: string, end: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return '';
  if (!start.endsWith('-01')) return '';
  const d = new Date(`${start}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const monthEnd = formatYmd(endOfMonth(d));
  if (end !== monthEnd) return '';
  return start.slice(0, 7);
}

function rowDateYmd(dateVal: string) {
  const s = String(dateVal || '');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
}

function enumerateYmdRange(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return [];
  const cursor = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const out: string[] = [];
  while (cursor <= endDate) {
    out.push(formatYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function displayClockCell(
  display?: string | null,
  local?: string | null,
  iso?: string | null
): string {
  if (display) return display;
  if (local) return local;
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  } catch {
    return '—';
  }
}

const AttendanceStatistics: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useStore();
  const inkFg = theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.common.black;
  const labelColor = theme.palette.mode === 'dark' ? inkFg : 'text.secondary';
  const valueColor = theme.palette.mode === 'dark' ? inkFg : 'text.primary';
  const canSeeCompanyAttendance = ['admin', 'root', 'audit'].includes(String(user?.role || ''));
  const now = new Date();
  const [startDate, setStartDate] = useState(formatYmd(startOfMonth(now)));
  const [endDate, setEndDate] = useState(formatYmd(endOfMonth(now)));
  const [selectedMonth, setSelectedMonth] = useState(formatYm(now));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailUserName, setDetailUserName] = useState('');
  const [heresnowStatus, setHeresnowStatus] = useState<any>(null);
  const [heresnowSyncLoading, setHeresnowSyncLoading] = useState(false);
  const [heresnowSyncMonth, setHeresnowSyncMonth] = useState(getCurrentMonthInputValue());
  const [heresnowTestLoading, setHeresnowTestLoading] = useState(false);
  const [heresnowSettingsLoading, setHeresnowSettingsLoading] = useState(false);
  const [heresnowCompanyId, setHeresnowCompanyId] = useState('');
  const [heresnowExternalCompanyId, setHeresnowExternalCompanyId] = useState('');
  const [heresnowApiKey, setHeresnowApiKey] = useState('');
  const [heresnowMessage, setHeresnowMessage] = useState<string | null>(null);
  const [heresnowError, setHeresnowError] = useState<string | null>(null);
  const [nameColumnWidth, setNameColumnWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 110;
    const saved = Number(window.localStorage.getItem('attendanceStats.nameColumnWidth') || 110);
    if (!Number.isFinite(saved)) return 110;
    return Math.min(220, Math.max(90, saved));
  });

  const detailRows = useMemo(() => {
    if (detailUserId == null) return [];
    return rows
      .filter((r) => r.user_id === detailUserId)
      .sort((a, b) => rowDateYmd(b.date).localeCompare(rowDateYmd(a.date)));
  }, [rows, detailUserId]);

  const statusLabel = useCallback(
    (status: string) => {
      switch (status) {
        case 'normal':
          return t('attendanceManagement.statusNormal');
        case 'late':
          return t('attendanceManagement.statusLate');
        case 'early':
          return t('attendanceManagement.statusEarly');
        case 'overtime':
          return t('attendanceManagement.statusOvertime');
        case 'absent':
          return t('attendanceManagement.statusAbsent');
        default:
          return status || '—';
      }
    },
    [t]
  );

  const openDetail = (agg: UserAggregate) => {
    setDetailUserId(agg.userId);
    setDetailUserName(agg.name);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailUserId(null);
    setDetailUserName('');
  };

  const canManageHeresnow = ['admin', 'root'].includes(String(user?.role || ''));
  const normalizedCompanyId = String(heresnowCompanyId || heresnowStatus?.companyId || '').trim();
  const normalizedExternalCompanyId = String(heresnowExternalCompanyId || heresnowStatus?.externalCompanyId || '').trim();
  const showExternalCompanyId = Boolean(normalizedExternalCompanyId && normalizedExternalCompanyId !== normalizedCompanyId);

  const applyMonth = (ym: string) => {
    const range = monthRangeFromYm(ym);
    if (!range) return;
    setSelectedMonth(ym);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { start_date: startDate, end_date: endDate };
      const res = canSeeCompanyAttendance
        ? await attendanceService.getCompanyAttendances(params)
        : await attendanceService.getAttendances(params);
      if (res?.success && Array.isArray(res.data)) {
        setRows(res.data as AttendanceRow[]);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('attendanceStatistics.loadError'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, t, canSeeCompanyAttendance]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    heresnowIntegrationService
      .getStatus()
      .then((res) => {
        if (cancelled || !res?.success) return;
        setHeresnowStatus(res.data);
        setHeresnowCompanyId(String(res.data?.companyId || ''));
        setHeresnowExternalCompanyId(String(res.data?.externalCompanyId || ''));
      })
      .catch(() => {
        if (!cancelled) setHeresnowStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('attendanceStats.nameColumnWidth', String(nameColumnWidth));
  }, [nameColumnWidth]);

  const handleHeresnowToggle = async (enabled: boolean) => {
    if (!canManageHeresnow) return;
    try {
      setHeresnowError(null);
      const res = await heresnowIntegrationService.updateSettings({ enabled });
      if (res.success) {
        setHeresnowStatus(res.data);
        setHeresnowCompanyId(String(res.data?.companyId || heresnowCompanyId || ''));
        setHeresnowExternalCompanyId(String(res.data?.externalCompanyId || heresnowExternalCompanyId || ''));
        setHeresnowMessage(enabled ? t('attendanceManagement.heresnowActive') : t('attendanceManagement.heresnowInactive'));
      }
    } catch (e: any) {
      setHeresnowError(e?.response?.data?.message || t('attendanceManagement.heresnowSyncFailed'));
    }
  };

  const handleSaveHeresnowSettings = async () => {
    if (!canManageHeresnow) return;
    setHeresnowSettingsLoading(true);
    setHeresnowError(null);
    setHeresnowMessage(null);
    try {
      const payload: { companyId?: string; externalCompanyId?: string; apiKey?: string } = {};
      const companyId = String(heresnowCompanyId || '').trim();
      const ext = String(heresnowExternalCompanyId || '').trim() || companyId;
      if (companyId) payload.companyId = companyId;
      if (ext) payload.externalCompanyId = ext;
      if (heresnowApiKey.trim()) payload.apiKey = heresnowApiKey.trim();
      const res = await heresnowIntegrationService.updateSettings(payload);
      if (res.success) {
        setHeresnowStatus(res.data);
        setHeresnowCompanyId(String(res.data?.companyId || companyId || ''));
        setHeresnowExternalCompanyId(String(res.data?.externalCompanyId || ext || ''));
        setHeresnowApiKey('');
        setHeresnowMessage(t('attendanceManagement.heresnowSettingsSaved'));
      } else {
        setHeresnowError(res.message || t('attendanceManagement.heresnowSyncFailed'));
      }
    } catch (e: any) {
      setHeresnowError(e?.response?.data?.message || t('attendanceManagement.heresnowSyncFailed'));
    } finally {
      setHeresnowSettingsLoading(false);
    }
  };

  const handleHeresnowTest = async () => {
    setHeresnowTestLoading(true);
    setHeresnowError(null);
    setHeresnowMessage(null);
    try {
      const res = await heresnowIntegrationService.testConnection();
      if (res.success) {
        setHeresnowMessage(
          res.message || t('attendanceManagement.heresnowTestSuccess', { count: res?.data?.previewCount ?? 0 })
        );
      } else {
        setHeresnowError(res.message || t('attendanceManagement.heresnowTestFailed'));
      }
    } catch (e: any) {
      setHeresnowError(e?.response?.data?.message || t('attendanceManagement.heresnowTestFailed'));
    } finally {
      setHeresnowTestLoading(false);
    }
  };

  const handleHeresnowSync = async () => {
    setHeresnowSyncLoading(true);
    setHeresnowError(null);
    setHeresnowMessage(null);
    try {
      const syncPayload: { since?: string } = {};
      if (/^\d{4}-\d{2}$/.test(heresnowSyncMonth)) {
        syncPayload.since = `${heresnowSyncMonth}-01`;
      }
      const res = await heresnowIntegrationService.sync(syncPayload);
      if (res.success) {
        const total = Number(res?.data?.total || 0);
        const applied = Number(res?.data?.applied || 0);
        const debug = res?.data?.debug;
        const noStatusAccepted = Number(debug?.fetch?.NO_STATUS?.acceptedRows || 0);
        const pendingAccepted = Number(debug?.fetch?.PENDING?.acceptedRows || 0);
        const deliveredAccepted = Number(debug?.fetch?.DELIVERED?.acceptedRows || 0);
        const debugSuffix = ` (NO_STATUS=${noStatusAccepted}, PENDING=${pendingAccepted}, DELIVERED=${deliveredAccepted}, total=${total}, applied=${applied})`;
        setHeresnowMessage(
          total > 0
            ? `${t('attendanceManagement.heresnowSyncResult', { total, applied })}${debugSuffix}`
            : `${t('attendanceManagement.heresnowSyncNoData')}${debugSuffix}`
        );
        const statusRes = await heresnowIntegrationService.getStatus();
        if (statusRes.success) setHeresnowStatus(statusRes.data);
        await load();
      } else {
        setHeresnowError(res.message || t('attendanceManagement.heresnowSyncFailed'));
      }
    } catch (e: any) {
      setHeresnowError(e?.response?.data?.message || t('attendanceManagement.heresnowSyncFailed'));
    } finally {
      setHeresnowSyncLoading(false);
    }
  };

  useEffect(() => {
    const derived = deriveYmFromRange(startDate, endDate);
    setSelectedMonth((prev) => (prev === derived ? prev : derived));
  }, [startDate, endDate]);

  const aggregates = useMemo(() => {
    const map = new Map<number, UserAggregate>();
    for (const a of rows) {
      const uid = a.user_id;
      const u = a.user;
      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          name: u?.username || `User #${uid}`,
          department: u?.department || '—',
          recordCount: 0,
          totalHours: 0,
          lateCount: 0,
          absentCount: 0,
          normalCount: 0
        });
      }
      const s = map.get(uid)!;
      s.recordCount += 1;
      s.totalHours += Number(a.work_hours) || 0;
      if (a.status === 'late') s.lateCount += 1;
      else if (a.status === 'absent') s.absentCount += 1;
      else if (a.status === 'normal' || a.status === 'early' || a.status === 'overtime') s.normalCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const totals = useMemo(() => {
    let hours = 0;
    let late = 0;
    let absent = 0;
    for (const a of aggregates) {
      hours += a.totalHours;
      late += a.lateCount;
      absent += a.absentCount;
    }
    return {
      people: aggregates.length,
      records: rows.length,
      totalHours: hours,
      late,
      absent
    };
  }, [aggregates, rows.length]);

  const fieldPaperSx = {
    borderRadius: '12px',
    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      minHeight: 44,
      '& fieldset': {
        borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.1)' : undefined,
      },
    },
  };

  const kpiCards = [
    { key: 'people', label: t('attendanceStatistics.cards.people'), value: totals.people, valueSx: { color: valueColor } },
    { key: 'records', label: t('attendanceStatistics.cards.records'), value: totals.records, valueSx: { color: valueColor } },
    {
      key: 'hours',
      label: t('attendanceStatistics.cards.totalHours'),
      value: totals.totalHours.toFixed(1),
      valueSx: { color: valueColor },
    },
    {
      key: 'late',
      label: t('attendanceStatistics.cards.late'),
      value: totals.late,
      valueSx: { color: 'warning.dark' },
    },
    {
      key: 'absent',
      label: t('attendanceStatistics.cards.absent'),
      value: totals.absent,
      valueSx: { color: 'error.dark' },
    },
  ] as const;

  const dayColumns = useMemo(() => enumerateYmdRange(startDate, endDate), [startDate, endDate]);

  const unregisteredAttendanceRows = useMemo(() => {
    const records = Array.isArray(heresnowStatus?.unregisteredAttendanceRecords)
      ? heresnowStatus.unregisteredAttendanceRecords as UnregisteredAttendanceRecord[]
      : [];
    return records
      .map((record) => {
        const date = String(record?.date || '').slice(0, 10);
        const email = String(record?.email || '').trim().toLowerCase();
        const externalEmployeeId = String(record?.externalEmployeeId || '').trim();
        const displayName = email || externalEmployeeId || String(record?.name || '').trim();
        const identity = email || externalEmployeeId || displayName;
        if (!identity || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        if (date < startDate || date > endDate) return null;
        return {
          personKey: `unregistered:${identity}`,
          date,
          name: email || displayName,
          email,
          externalEmployeeId,
          status: String(record?.status || '').trim().toLowerCase() || undefined,
          check_in: record?.checkIn || null,
          check_out: record?.checkOut || null
        };
      })
      .filter(Boolean) as Array<{
      personKey: string;
      date: string;
      name: string;
      email: string;
      externalEmployeeId: string;
      status?: string;
      check_in?: string | null;
      check_out?: string | null;
    }>;
  }, [heresnowStatus?.unregisteredAttendanceRecords, startDate, endDate]);

  const matrixUsers = useMemo(() => {
    const users: MatrixUserRow[] = aggregates.map((a) => ({
      key: `user:${a.userId}`,
      userId: a.userId,
      name: a.name,
      department: a.department,
      isUnregistered: false
    }));
    const unregisteredMap = new Map<string, MatrixUserRow>();
    for (const row of unregisteredAttendanceRows) {
      if (!unregisteredMap.has(row.personKey)) {
        unregisteredMap.set(row.personKey, {
          key: row.personKey,
          userId: null,
          name: row.name || row.email || row.externalEmployeeId || '-',
          department: '—',
          isUnregistered: true,
          prefillEmail: row.email || undefined
        });
      }
    }
    return [...users, ...Array.from(unregisteredMap.values())]
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [aggregates, unregisteredAttendanceRows]);

  const matrixMap = useMemo(() => {
    const map = new Map<string, MatrixCellRow>();
    for (const row of rows) {
      const key = `user:${row.user_id}:${rowDateYmd(row.date)}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { status: row.status, check_in: row.check_in, check_out: row.check_out });
        continue;
      }
      const prevScore = (prev.check_out ? 2 : 0) + (prev.check_in ? 1 : 0);
      const nextScore = (row.check_out ? 2 : 0) + (row.check_in ? 1 : 0);
      if (nextScore >= prevScore) {
        map.set(key, { status: row.status, check_in: row.check_in, check_out: row.check_out });
      }
    }
    for (const row of unregisteredAttendanceRows) {
      const key = `${row.personKey}:${row.date}`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { status: row.status, check_in: row.check_in, check_out: row.check_out });
        continue;
      }
      const prevScore = (prev.check_out ? 2 : 0) + (prev.check_in ? 1 : 0);
      const nextScore = (row.check_out ? 2 : 0) + (row.check_in ? 1 : 0);
      if (nextScore >= prevScore) {
        map.set(key, { status: row.status, check_in: row.check_in, check_out: row.check_out });
      }
    }
    return map;
  }, [rows, unregisteredAttendanceRows]);

  const getMatrixCellType = (row?: MatrixCellRow): MatrixCellType => {
    if (!row) return 'empty';
    if (row.status === 'absent') return 'absent';
    if (!row.check_in) return 'absent';
    if (row.check_out) return 'complete';
    return 'partial';
  };

  const matrixLegend = useMemo(() => {
    let complete = 0;
    let partial = 0;
    let absent = 0;
    for (const row of Array.from(matrixMap.values())) {
      const type = getMatrixCellType(row);
      if (type === 'complete') complete += 1;
      else if (type === 'partial') partial += 1;
      else if (type === 'absent') absent += 1;
    }
    return { complete, partial, absent };
  }, [matrixMap]);

  const softTableHeadSx = {
    bgcolor:
      theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.04),
    '& .MuiTableCell-head': {
      bgcolor:
        theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.04),
      color: theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.6)' : theme.palette.grey[300],
      fontWeight: 600,
      fontSize: '0.75rem',
      letterSpacing: '0.01em',
      borderBottom: `1px solid ${
        theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
      }`,
      borderTop: 'none',
      py: 1.5,
      px: 2,
    },
  };

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('attendanceStatistics.title')}
        description={t('attendanceStatistics.description')}
      />

      {heresnowError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setHeresnowError(null)}>
          {heresnowError}
        </Alert>
      )}
      {heresnowMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setHeresnowMessage(null)}>
          {heresnowMessage}
        </Alert>
      )}

      <Card elevation={0} sx={{ ...mvsInnerCardSx, mb: 3, p: { xs: 1.75, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: valueColor }}>
                {t('attendanceManagement.heresnowTitle')}
              </Typography>
              <Chip
                size="small"
                label={heresnowStatus?.enabled ? t('attendanceManagement.heresnowActive') : t('attendanceManagement.heresnowInactive')}
                color={heresnowStatus?.enabled ? 'success' : 'default'}
                sx={{ height: 24, fontWeight: 600 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, lineHeight: 1.55 }}>
              {t('attendanceManagement.heresnowDescription')}
            </Typography>
            <Box
              sx={{
                mt: 0.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 1,
              }}
            >
              <Box
                sx={{
                  px: 1.2,
                  py: 1,
                  borderRadius: 1.5,
                  border: (themeArg) => `1px solid ${alpha(themeArg.palette.divider, 0.8)}`,
                  bgcolor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.white, 0.02)
                    : alpha(theme.palette.common.white, 0.75),
                  gridColumn: { xs: '1 / -1', md: '1 / -1' }
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {t('attendanceManagement.heresnowLastSync')}
                </Typography>
                <Typography sx={{ mt: 0.15, color: 'text.primary', fontWeight: 600, fontSize: '0.84rem' }}>
                  {heresnowStatus?.lastSyncAt ? new Date(heresnowStatus.lastSyncAt).toLocaleString() : '-'}
                </Typography>
              </Box>
            </Box>

            {canManageHeresnow && (
              <Box
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gridTemplateColumns: showExternalCompanyId
                    ? { xs: '1fr', lg: '1fr 1fr 1fr auto' }
                    : { xs: '1fr', lg: '1fr 1fr auto' },
                  alignItems: { xs: 'stretch', lg: 'center' },
                  gap: 1,
                  p: { xs: 1.2, sm: 1.5 },
                  border: (themeArg) => `1px solid ${alpha(themeArg.palette.divider, 0.65)}`,
                  borderRadius: 2.5,
                  bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.grey[100], 0.6),
                }}
              >
                <TextField
                  size="small"
                  label={t('attendanceManagement.heresnowCompanyId')}
                  value={heresnowCompanyId}
                  onChange={(e) => setHeresnowCompanyId(e.target.value)}
                  sx={{ minWidth: 0 }}
                />
                {showExternalCompanyId && (
                  <TextField
                    size="small"
                    label={t('attendanceManagement.heresnowExternalCompanyId')}
                    value={heresnowExternalCompanyId}
                    onChange={(e) => setHeresnowExternalCompanyId(e.target.value)}
                    sx={{ minWidth: 0 }}
                  />
                )}
                <TextField
                  size="small"
                  label={t('attendanceManagement.heresnowApiKeyLabel')}
                  placeholder={t('attendanceManagement.heresnowApiKeyPlaceholder')}
                  type="text"
                  inputProps={{ autoComplete: 'off' }}
                  value={heresnowApiKey || String(heresnowStatus?.apiKeyMasked || '')}
                  onFocus={() => {
                    if (!heresnowApiKey && heresnowStatus?.apiKeyMasked) {
                      setHeresnowApiKey('');
                    }
                  }}
                  onChange={(e) => setHeresnowApiKey(e.target.value)}
                  sx={{ minWidth: 0 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveHeresnowSettings}
                  disabled={heresnowSettingsLoading}
                  sx={{ textTransform: 'none', fontWeight: 600, minWidth: { xs: '100%', lg: 128 }, height: 40 }}
                >
                  {heresnowSettingsLoading ? <CircularProgress size={16} color="inherit" /> : t('attendanceManagement.heresnowSettingsSave')}
                </Button>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 0.9,
              flexWrap: 'wrap',
              pt: 1.35,
              mt: 0.4,
              borderTop: (themeArg) => `1px dashed ${alpha(themeArg.palette.divider, 0.75)}`,
            }}
          >
            {canManageHeresnow && (
              <FormControlLabel
                control={<Switch size="small" checked={Boolean(heresnowStatus?.enabled)} onChange={(e) => handleHeresnowToggle(e.target.checked)} />}
                label={t('attendanceManagement.heresnowActive')}
                sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontWeight: 600, fontSize: '0.9rem' } }}
              />
            )}
            {canManageHeresnow && (
              <TextField
                type="month"
                size="small"
                label={t('attendanceManagement.heresnowSyncMonthLabel')}
                value={heresnowSyncMonth}
                onChange={(e) => setHeresnowSyncMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 170, '& .MuiInputBase-root': { height: 38 } }}
              />
            )}
            {canManageHeresnow && (
              <Button
                variant="outlined"
                size="small"
                startIcon={heresnowTestLoading ? <CircularProgress size={16} /> : <SyncIcon />}
                disabled={heresnowTestLoading || !heresnowStatus?.enabled}
                onClick={handleHeresnowTest}
                sx={{ textTransform: 'none', fontWeight: 600, height: 38 }}
              >
                {t('attendanceManagement.heresnowTest')}
              </Button>
            )}
            {canManageHeresnow && (
              <Button
                variant="contained"
                size="small"
                startIcon={heresnowSyncLoading ? <CircularProgress size={16} /> : <SyncIcon />}
                disabled={heresnowSyncLoading || !heresnowStatus?.enabled}
                onClick={handleHeresnowSync}
                sx={{ textTransform: 'none', fontWeight: 700, height: 38 }}
              >
                {t('attendanceManagement.heresnowSync')}
              </Button>
            )}
            <Button
              href="https://www.heresnow.in"
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: '1rem !important' }} />}
              sx={{ textTransform: 'none', fontWeight: 600, height: 38, px: 1.2 }}
            >
              {t('attendanceManagement.heresnowOpen')}
            </Button>
          </Box>
        </Box>
      </Card>

      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ py: 3, px: 3, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

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
            <Grid container spacing={2} alignItems="flex-end" sx={{ width: '100%', m: 0 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  type="month"
                  label={t('attendanceStatistics.monthLabel')}
                  value={selectedMonth}
                  onChange={(e) => {
                    const ym = e.target.value;
                    setSelectedMonth(ym);
                    const range = monthRangeFromYm(ym);
                    if (range) {
                      setStartDate(range.start);
                      setEndDate(range.end);
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={fieldPaperSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, minHeight: 44 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    onClick={() => applyMonth(formatYm(new Date()))}
                    sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('attendanceStatistics.thisMonth')}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    onClick={() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() - 1);
                      applyMonth(formatYm(d));
                    }}
                    sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('attendanceStatistics.lastMonth')}
                  </Button>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
                <TextField
                  fullWidth
                  type="date"
                  label={t('attendanceStatistics.startDate')}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={fieldPaperSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>
                <TextField
                  fullWidth
                  type="date"
                  label={t('attendanceStatistics.endDate')}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={fieldPaperSx}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 'auto' }} sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
                <Button
                  variant="contained"
                  color="primary"
                  disableElevation
                  startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
                  onClick={load}
                  disabled={loading}
                  sx={{
                    minHeight: 44,
                    px: 3,
                    borderRadius: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 'none',
                    width: { xs: '100%', md: 'auto' },
                  }}
                >
                  {t('attendanceStatistics.refresh')}
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Box
            sx={{
              mt: 2.5,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2,
            }}
          >
            {kpiCards.map((item) => (
              <Card
                key={item.key}
                elevation={0}
                sx={{
                  ...mvsInnerCardSx,
                  p: 0,
                  overflow: 'hidden',
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
                  border: '1px solid',
                  borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
                  boxShadow:
                    theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)',
                }}
              >
                <CardContent sx={{ py: 2, px: 2.25 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: labelColor,
                      display: 'block',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      mb: 1,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant="kpiNumber" sx={item.valueSx}>
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, mt: 2.5 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              <Box sx={{ mt: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mb: 1.25 }}>
                  <Typography variant="body2" sx={{ color: labelColor, fontWeight: 600 }}>
                    {t('attendanceStatistics.matrix.legendTitle')}
                  </Typography>
                  <Chip size="small" label={`✓ ${t('attendanceStatistics.matrix.complete')} ${matrixLegend.complete}`} color="success" variant="outlined" />
                  <Chip size="small" label={`◐ ${t('attendanceStatistics.matrix.partial')} ${matrixLegend.partial}`} color="warning" variant="outlined" />
                  <Chip size="small" label={`✕ ${t('attendanceStatistics.matrix.absent')} ${matrixLegend.absent}`} color="error" variant="outlined" />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 0, md: 1 } }}>
                    <Typography variant="caption" sx={{ color: labelColor, whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {t('attendanceStatistics.matrix.nameColumnWidth')}
                    </Typography>
                    <Slider
                      size="small"
                      min={90}
                      max={220}
                      step={2}
                      value={nameColumnWidth}
                      onChange={(_, v) => setNameColumnWidth(Number(v))}
                      sx={{ width: 120 }}
                    />
                  </Box>
                </Box>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'light' ? 'rgba(15,23,42,0.08)' : 'divider',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    bgcolor: 'transparent',
                  }}
                >
                  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead sx={softTableHeadSx}>
                      <TableRow>
                        <TableCell
                          sx={{
                            width: `${nameColumnWidth}px`,
                            minWidth: `${nameColumnWidth}px`,
                            maxWidth: `${nameColumnWidth}px`,
                            px: 0.75,
                          }}
                        >
                          {t('attendanceStatistics.table.name')}
                        </TableCell>
                        {dayColumns.map((ymd) => (
                          <TableCell
                            key={ymd}
                            align="center"
                            sx={{
                              minWidth: 0,
                              px: 0.05,
                              fontSize: '0.5rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {Number(ymd.slice(8, 10))}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {matrixUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={Math.max(2, dayColumns.length + 1)} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" sx={{ color: labelColor }}>
                              {t('attendanceStatistics.empty')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        matrixUsers.map((u) => (
                          <TableRow key={u.key} hover>
                            <TableCell
                              sx={{
                                py: 1.1,
                                px: 0.75,
                                width: `${nameColumnWidth}px`,
                                minWidth: `${nameColumnWidth}px`,
                                maxWidth: `${nameColumnWidth}px`,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {u.isUnregistered ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                                  <Link
                                    component="button"
                                    type="button"
                                    variant="body2"
                                    onClick={() => {
                                      if (!u.prefillEmail) return;
                                      navigate(`/users?prefill_email=${encodeURIComponent(u.prefillEmail)}`);
                                    }}
                                    sx={{
                                      fontWeight: 600,
                                      color: 'text.primary',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      textDecoration: 'none',
                                      cursor: u.prefillEmail ? 'pointer' : 'default',
                                      '&:hover': u.prefillEmail ? { textDecoration: 'underline' } : undefined
                                    }}
                                  >
                                    {u.name}
                                  </Link>
                                  <Chip
                                    size="small"
                                    label={t('attendanceStatistics.matrix.unregistered')}
                                    color="warning"
                                    variant="outlined"
                                    sx={{ height: 20, '& .MuiChip-label': { px: 0.8, fontSize: '0.66rem', fontWeight: 700 } }}
                                  />
                                </Box>
                              ) : (
                                <Link
                                  component="button"
                                  type="button"
                                  variant="body2"
                                  onClick={() =>
                                    openDetail({
                                      userId: Number(u.userId),
                                      name: u.name,
                                      department: u.department,
                                      recordCount: 0,
                                      totalHours: 0,
                                      lateCount: 0,
                                      absentCount: 0,
                                      normalCount: 0
                                    })
                                  }
                                  sx={{
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' }
                                  }}
                                >
                                  {u.name}
                                </Link>
                              )}
                            </TableCell>
                            {dayColumns.map((ymd) => {
                              const row = matrixMap.get(`${u.key}:${ymd}`);
                              const type = getMatrixCellType(row);
                              const text = type === 'complete' ? '✓' : type === 'partial' ? '◐' : type === 'absent' ? '✕' : '·';
                              const color =
                                type === 'complete'
                                  ? 'success.main'
                                  : type === 'partial'
                                    ? 'warning.main'
                                    : type === 'absent'
                                      ? 'error.main'
                                      : 'text.disabled';
                              return (
                                <TableCell key={`${u.key}-${ymd}`} align="center" sx={{ py: 0.6, px: 0.2 }}>
                                  <Box
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '5px',
                                      border: '1px solid',
                                      borderColor:
                                        type === 'empty'
                                          ? (theme.palette.mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)')
                                          : 'transparent',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.58rem',
                                      fontWeight: 700,
                                      color,
                                      bgcolor:
                                        type === 'empty'
                                          ? 'transparent'
                                          : (theme.palette.mode === 'light' ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.06)')
                                    }}
                                  >
                                    {text}
                                  </Box>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Dialog open={detailOpen} onClose={closeDetail} maxWidth="md" fullWidth scroll="paper">
                <DialogTitle sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {t('attendanceStatistics.detail.dialogTitle', { name: detailUserName || '—' })}
                </DialogTitle>
                <DialogContent dividers>
                  {detailRows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t('attendanceStatistics.detail.empty')}
                    </Typography>
                  ) : (
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
                        size="small"
                        sx={{
                          borderCollapse: 'collapse',
                          '& .MuiTableCell-root': {
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderTop: 'none',
                          },
                        }}
                      >
                        <TableHead sx={softTableHeadSx}>
                          <TableRow>
                            <TableCell>{t('attendanceStatistics.detail.date')}</TableCell>
                            <TableCell>{t('attendanceStatistics.detail.checkIn')}</TableCell>
                            <TableCell>{t('attendanceStatistics.detail.checkOut')}</TableCell>
                            <TableCell align="right">{t('attendanceStatistics.detail.workHours')}</TableCell>
                            <TableCell>{t('attendanceStatistics.detail.status')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody
                          sx={{
                            '& .MuiTableCell-body': {
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
                          {detailRows.map((row) => (
                            <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                              <TableCell>{rowDateYmd(row.date)}</TableCell>
                              <TableCell>
                                {displayClockCell(
                                  row.check_in_display,
                                  row.check_in_local,
                                  row.check_in ?? null
                                )}
                              </TableCell>
                              <TableCell>
                                {displayClockCell(
                                  row.check_out_display,
                                  row.check_out_local,
                                  row.check_out ?? null
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {row.work_hours != null ? Number(row.work_hours).toFixed(2) : '—'}
                              </TableCell>
                              <TableCell>{statusLabel(row.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                  <Button onClick={closeDetail} variant="outlined" color="inherit" sx={{ borderRadius: '12px', textTransform: 'none' }}>
                    {t('attendanceStatistics.detail.close')}
                  </Button>
                </DialogActions>
              </Dialog>

            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AttendanceStatistics;
