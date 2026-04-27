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
  Link
} from '@mui/material';
import { Assessment as AssessmentIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { attendanceService } from '../../services/api';
import { useStore } from '../../store';

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

function rowDateYmd(dateVal: string) {
  const s = String(dateVal || '');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
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
  const { t } = useTranslation();
  const { user } = useStore();
  const canSeeCompanyAttendance = ['admin', 'root', 'audit'].includes(String(user?.role || ''));
  const now = new Date();
  const [startDate, setStartDate] = useState(formatYmd(startOfMonth(now)));
  const [endDate, setEndDate] = useState(formatYmd(endOfMonth(now)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailUserName, setDetailUserName] = useState('');

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

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AssessmentIcon color="primary" />
        <Typography variant="h6" component="h1">
          {t('attendanceStatistics.title')}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('attendanceStatistics.description')}
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                label={t('attendanceStatistics.startDate')}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="date"
                label={t('attendanceStatistics.endDate')}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={load}
                disabled={loading}
                fullWidth
              >
                {t('attendanceStatistics.refresh')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 3
        }}
      >
        <Card>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t('attendanceStatistics.cards.people')}
            </Typography>
            <Typography variant="h5">{totals.people}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t('attendanceStatistics.cards.records')}
            </Typography>
            <Typography variant="h5">{totals.records}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t('attendanceStatistics.cards.totalHours')}
            </Typography>
            <Typography variant="h5">{totals.totalHours.toFixed(1)}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t('attendanceStatistics.cards.late')}
            </Typography>
            <Typography variant="h5" color="warning.main">
              {totals.late}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              {t('attendanceStatistics.cards.absent')}
            </Typography>
            <Typography variant="h5" color="error.main">
              {totals.absent}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
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
                      backgroundColor: '#F5F6F8',
                      color: '#64748B',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      py: 1.25,
                      borderBottom: '1px solid #E2E8F0',
                      borderRight: 'none',
                      borderLeft: 'none',
                      borderTop: 'none',
                      whiteSpace: 'nowrap'
                    }
                  }}
                >
                  <TableCell>{t('attendanceStatistics.table.name')}</TableCell>
                  <TableCell>{t('attendanceStatistics.table.department')}</TableCell>
                  <TableCell align="right">{t('attendanceStatistics.table.records')}</TableCell>
                  <TableCell align="right">{t('attendanceStatistics.table.totalHours')}</TableCell>
                  <TableCell align="right">{t('attendanceStatistics.table.normal')}</TableCell>
                  <TableCell align="right">{t('attendanceStatistics.table.late')}</TableCell>
                  <TableCell align="right">{t('attendanceStatistics.table.absent')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {aggregates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {t('attendanceStatistics.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  aggregates.map((r) => (
                    <TableRow key={r.userId} hover>
                      <TableCell>
                        <Link
                          component="button"
                          type="button"
                          variant="body2"
                          onClick={() => openDetail(r)}
                          sx={{
                            cursor: 'pointer',
                            fontWeight: 600,
                            textAlign: 'left',
                            verticalAlign: 'baseline',
                            border: 'none',
                            background: 'none',
                            p: 0,
                            '&:hover': { textDecoration: 'underline' }
                          }}
                        >
                          {r.name}
                        </Link>
                      </TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell align="right">{r.recordCount}</TableCell>
                      <TableCell align="right">{r.totalHours.toFixed(2)}</TableCell>
                      <TableCell align="right">{r.normalCount}</TableCell>
                      <TableCell align="right">{r.lateCount}</TableCell>
                      <TableCell align="right">{r.absentCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog open={detailOpen} onClose={closeDetail} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle>
              {t('attendanceStatistics.detail.dialogTitle', { name: detailUserName || '—' })}
            </DialogTitle>
            <DialogContent dividers>
              {detailRows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('attendanceStatistics.detail.empty')}
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('attendanceStatistics.detail.date')}</TableCell>
                        <TableCell>{t('attendanceStatistics.detail.checkIn')}</TableCell>
                        <TableCell>{t('attendanceStatistics.detail.checkOut')}</TableCell>
                        <TableCell align="right">{t('attendanceStatistics.detail.workHours')}</TableCell>
                        <TableCell>{t('attendanceStatistics.detail.status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailRows.map((row) => (
                        <TableRow key={row.id}>
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
            <DialogActions>
              <Button onClick={closeDetail} variant="contained" color="inherit">
                {t('attendanceStatistics.detail.close')}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default AttendanceStatistics;
