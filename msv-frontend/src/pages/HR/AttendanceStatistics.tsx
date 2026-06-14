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
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import {
  mvsFilterToolbarSx,
  mvsSearchFieldSx,
  mvsInnerCardSx,
  mvsTitleBlockSx,
} from '../../theme/mvsLayout';
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
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceStatistics.table.name')}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('attendanceStatistics.table.department')}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {t('attendanceStatistics.table.records')}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {t('attendanceStatistics.table.totalHours')}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {t('attendanceStatistics.table.normal')}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {t('attendanceStatistics.table.late')}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {t('attendanceStatistics.table.absent')}
                          </TableCell>
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
                        {aggregates.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" sx={{ color: labelColor }}>
                                {t('attendanceStatistics.empty')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          aggregates.map((r) => (
                            <TableRow
                              key={r.userId}
                              hover
                              sx={{
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                            >
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
                                    p: '2px 6px',
                                    m: '-2px -6px',
                                    borderRadius: '8px',
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    '&:hover': {
                                      textDecoration: 'underline',
                                      textDecorationColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.35)' : undefined,
                                      textUnderlineOffset: '3px',
                                      bgcolor: 'transparent',
                                    },
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
