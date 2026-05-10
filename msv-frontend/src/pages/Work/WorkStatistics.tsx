import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import { workBoardService } from '../../services/api';

interface WorkStatistic {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  period: string;
  totalHours: number;
  productiveHours: number;
  tasksCompleted: number;
  tasksAssigned: number;
  efficiency: number;
  productivity: number;
  attendanceRate: number;
  tasksInProgress: number;
  tasksTodo: number;
}

interface StatusSummary {
  todo: number;
  progress: number;
  done: number;
  unassigned: number;
}

/** WorkBoardDetailPage·백엔드와 동일한 “완료” 열 규칙 (업무 종료 시 이동하는 열과 집계 일치) */
const isCompletedListTitle = (title: string): boolean => {
  const normalized = String(title || '').trim().toLowerCase();
  if (!normalized) return false;
  const keywords = ['완료', '종료', 'done', 'completed', 'closed'];
  return keywords.some((keyword) => normalized.includes(keyword));
};

const resolveCompletedListId = (
  lists: { id: number; title: string; position: number }[]
): number | null => {
  const sorted = [...lists].sort((a, b) => a.position - b.position);
  const byTitle = sorted.find((l) => isCompletedListTitle(l.title));
  if (byTitle) return byTitle.id;
  if (sorted.length >= 2) return sorted[sorted.length - 1].id;
  return null;
};

const listStatusForStats = (
  list: { id: number; title: string; position: number },
  completedListId: number | null
): 'done' | 'progress' | 'todo' => {
  if (completedListId != null && list.id === completedListId) return 'done';
  const normalized = (list.title || '').replace(/\s+/g, '').toLowerCase();
  if (normalized.includes('진행') || normalized.includes('doing') || normalized.includes('progress')) {
    return 'progress';
  }
  return 'todo';
};

const WorkStatistics: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [statistics, setStatistics] = useState<WorkStatistic[]>([]);
  const [filteredStatistics, setFilteredStatistics] = useState<WorkStatistic[]>([]);
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({ todo: 0, progress: 0, done: 0, unassigned: 0 });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${m}`;
  }, []);

  const loadStatisticsData = useCallback(async () => {
    setError('');
    try {
      const boardsRes = await workBoardService.getBoards();
      if (!boardsRes?.success) {
        throw new Error(boardsRes?.message || t('workStatistics.errors.loadBoardsFailed'));
      }

      const boardIds: number[] = (boardsRes.data || []).map((b: any) => b.id).filter(Boolean);
      if (boardIds.length === 0) {
        setStatistics([]);
        setStatusSummary({ todo: 0, progress: 0, done: 0, unassigned: 0 });
        return;
      }

      const details = await Promise.all(
        boardIds.map(async (id) => {
          try {
            const r = await workBoardService.getBoard(id);
            return r?.success ? r.data : null;
          } catch {
            return null;
          }
        })
      );

      const validBoards = details.filter(Boolean) as any[];
      const memberMeta = new Map<number, { name: string; department: string; position: string }>();
      const statMap = new Map<number, WorkStatistic>();

      const summary: StatusSummary = { todo: 0, progress: 0, done: 0, unassigned: 0 };

      for (const board of validBoards) {
        for (const m of board.members || []) {
          const uid = m?.user?.id;
          if (!uid) continue;
          if (!memberMeta.has(uid)) {
            memberMeta.set(uid, {
              name: m.user.username || t('workStatistics.userFallback', { id: uid }),
              department: m.user.department || '-',
              position: m.user.position || '-'
            });
          }
        }

        const listsForResolve = (board.lists || []).map((l: any) => ({
          id: Number(l.id),
          title: String(l.title || ''),
          position: Number(l.position) || 0
        }));
        const completedListId = resolveCompletedListId(listsForResolve);

        for (const list of board.lists || []) {
          const status = listStatusForStats(
            {
              id: Number(list.id),
              title: String(list.title || ''),
              position: Number(list.position) || 0
            },
            completedListId
          );
          for (const card of list.cards || []) {
            if (status === 'done') summary.done += 1;
            else if (status === 'progress') summary.progress += 1;
            else summary.todo += 1;

            const assigneeId = card.assignee?.id;
            if (!assigneeId) {
              summary.unassigned += 1;
              continue;
            }

            if (!statMap.has(assigneeId)) {
              const meta = memberMeta.get(assigneeId);
              statMap.set(assigneeId, {
                id: assigneeId,
                employeeId: assigneeId,
                employeeName: meta?.name || card.assignee?.username || t('workStatistics.userFallback', { id: assigneeId }),
                department: meta?.department || '-',
                position: meta?.position || '-',
                period: currentPeriod,
                totalHours: 0,
                productiveHours: 0,
                tasksCompleted: 0,
                tasksAssigned: 0,
                efficiency: 0,
                productivity: 0,
                attendanceRate: 0,
                tasksInProgress: 0,
                tasksTodo: 0
              });
            }

            const item = statMap.get(assigneeId)!;
            item.tasksAssigned += 1;
            if (status === 'done') item.tasksCompleted += 1;
            else if (status === 'progress') item.tasksInProgress += 1;
            else item.tasksTodo += 1;
          }
        }
      }

      const rows = Array.from(statMap.values()).map((s) => {
        const doneRate = s.tasksAssigned > 0 ? (s.tasksCompleted / s.tasksAssigned) * 100 : 0;
        const progressRate = s.tasksAssigned > 0 ? (s.tasksInProgress / s.tasksAssigned) * 100 : 0;
        const totalHours = s.tasksAssigned * 2;
        const productiveHours = s.tasksCompleted * 2 + s.tasksInProgress * 1.2;
        return {
          ...s,
          totalHours: Number(totalHours.toFixed(1)),
          productiveHours: Number(productiveHours.toFixed(1)),
          productivity: Number(doneRate.toFixed(1)),
          efficiency: Number((doneRate * 0.7 + progressRate * 0.3).toFixed(1)),
          attendanceRate: Number(Math.min(100, 85 + doneRate * 0.15).toFixed(1))
        };
      });

      // 담당카드가 0인 멤버도 포함 (보드 멤버 기준)
      memberMeta.forEach((meta, uid) => {
        if (!statMap.has(uid)) {
          rows.push({
            id: uid,
            employeeId: uid,
            employeeName: meta.name,
            department: meta.department,
            position: meta.position,
            period: currentPeriod,
            totalHours: 0,
            productiveHours: 0,
            tasksCompleted: 0,
            tasksAssigned: 0,
            efficiency: 0,
            productivity: 0,
            attendanceRate: 0,
            tasksInProgress: 0,
            tasksTodo: 0
          });
        }
      });

      rows.sort((a, b) => b.tasksAssigned - a.tasksAssigned || b.tasksCompleted - a.tasksCompleted);

      setStatistics(rows);
      setStatusSummary(summary);
    } catch (err: any) {
      console.error('통계 데이터 로드 오류:', err);
      setError(err?.message || t('workStatistics.errors.loadStatsFailed'));
      setStatistics([]);
      setStatusSummary({ todo: 0, progress: 0, done: 0, unassigned: 0 });
    }
  }, [currentPeriod, t]);

  const filterStatistics = useCallback(() => {
    let filtered = statistics;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((stat) =>
        stat.employeeName.toLowerCase().includes(q) ||
        stat.department.toLowerCase().includes(q) ||
        stat.position.toLowerCase().includes(q)
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter((stat) => stat.department === departmentFilter);
    }

    if (periodFilter) {
      filtered = filtered.filter((stat) => stat.period === periodFilter);
    }

    setFilteredStatistics(filtered);
  }, [statistics, searchTerm, departmentFilter, periodFilter]);

  useEffect(() => {
    loadStatisticsData();
  }, [loadStatisticsData]);

  useEffect(() => {
    filterStatistics();
  }, [filterStatistics]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'success';
    if (efficiency >= 70) return 'warning';
    return 'error';
  };

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 90) return 'success';
    if (productivity >= 70) return 'warning';
    return 'error';
  };

  const softMetricColor = (kind: 'success' | 'warning' | 'error') =>
    kind === 'success'
      ? '#15803D'
      : kind === 'warning'
        ? '#B45309'
        : '#DC2626';

  const safeAvg = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, n) => sum + n, 0) / arr.length;
  };

  const averageEfficiency = safeAvg(statistics.map((s) => s.efficiency));
  const averageProductivity = safeAvg(statistics.map((s) => s.productivity));
  const totalAssigned = statistics.reduce((sum, s) => sum + s.tasksAssigned, 0);
  const totalTasksCompleted = statistics.reduce((sum, s) => sum + s.tasksCompleted, 0);
  const completionRate = totalAssigned > 0 ? (totalTasksCompleted / totalAssigned) * 100 : 0;

  const paginatedStatistics = filteredStatistics.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const departments = Array.from(new Set(statistics.map((stat) => stat.department))).filter(Boolean);
  const periods = Array.from(new Set(statistics.map((stat) => stat.period))).filter(Boolean);

  const productivityData = statistics.slice(0, 8).map((s) => ({
    name: s.employeeName,
    productivity: s.productivity,
    efficiency: s.efficiency
  }));

  const timeDistributionData = [
    { name: t('workStatistics.status.todo'), value: statusSummary.todo, color: '#94A3B8' },
    { name: t('workStatistics.status.inProgress'), value: statusSummary.progress, color: '#2563EB' },
    { name: t('workStatistics.status.done'), value: statusSummary.done, color: '#16A34A' },
    { name: t('workStatistics.status.unassigned'), value: statusSummary.unassigned, color: '#F59E0B' }
  ];

  const efficiencyTrendData = statistics.slice(0, 10).map((s) => ({
    name: s.employeeName,
    completionRate: s.productivity
  }));

  const TabPanel = ({ children, value, index, ...other }: any) => (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );

  const kpiCardSx = {
    borderRadius: '16px',
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
    boxShadow:
      theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)',
    bgcolor: 'background.paper',
  } as const;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minHeight: '100%', bgcolor: 'transparent' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography
          component="h1"
          variant="pageTitle"
          sx={{
            color: 'text.primary',
            fontSize: { xs: '1.125rem', sm: '1.3125rem' },
            fontWeight: 600,
            letterSpacing: '-0.022em',
            lineHeight: 1.28,
          }}
        >
          {t('workStatistics.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
            onClick={loadStatisticsData}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            {t('workStatistics.actions.refresh')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            {t('workStatistics.actions.export')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.avgEfficiency')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: softMetricColor(getEfficiencyColor(averageEfficiency) as 'success' | 'warning' | 'error') }}>
              {averageEfficiency.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.avgCompletionRate')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: softMetricColor(getProductivityColor(averageProductivity) as 'success' | 'warning' | 'error') }}>
              {averageProductivity.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.totalAssignedCards')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'text.primary' }}>{totalAssigned}</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.completedCards')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'text.primary' }}>{totalTasksCompleted}</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.overallCompletionRate')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: softMetricColor('success') }}>{completionRate.toFixed(1)}%</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '16px',
          border: 'none',
          boxShadow: 'none',
          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.06) : alpha(theme.palette.common.black, 0.03),
        }}
      >
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder={t('workStatistics.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '12px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.1)' : undefined,
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'text.secondary',
                  opacity: 0.85,
                },
              }}
            />
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'text.primary', opacity: 0.75 }}>{t('workStatistics.filters.department')}</InputLabel>
              <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <MenuItem value="">{t('workStatistics.filters.all')}</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'text.primary', opacity: 0.75 }}>{t('workStatistics.filters.period')}</InputLabel>
              <Select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                <MenuItem value="">{t('workStatistics.filters.all')}</MenuItem>
                {periods.map((period) => (
                  <MenuItem key={period} value={period}>{period}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('');
                setPeriodFilter('');
              }}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.16)' : undefined,
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              {t('workStatistics.actions.reset')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(_e, newValue) => setTabValue(newValue)}
            sx={{
              px: 1,
              minHeight: 48,
              '& .MuiTabs-indicator': {
                height: 2,
                borderRadius: '2px 2px 0 0',
                bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.85)' : theme.palette.grey[300],
              },
              '& .MuiTab-root': {
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.875rem',
                textTransform: 'none',
                minHeight: 48,
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'text.primary',
                fontWeight: 600,
              },
            }}
          >
            <Tab label={t('workStatistics.tabs.assigneeStats')} />
            <Tab label={t('workStatistics.tabs.completionComparison')} />
            <Tab label={t('workStatistics.tabs.cardStatusDistribution')} />
            <Tab label={t('workStatistics.tabs.efficiencyAnalysis')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer sx={{ bgcolor: 'transparent' }}>
            <Table
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
                  '& .MuiTableCell-head': {
                    bgcolor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.04),
                    color: theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.6)' : theme.palette.grey[300],
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    borderBottom: `1px solid ${
                      theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                    }`,
                    py: 1.5,
                    px: 2,
                  },
                }}
              >
                <TableRow>
                  <TableCell>{t('workStatistics.columns.employeeInfo')}</TableCell>
                  <TableCell>{t('workStatistics.columns.period')}</TableCell>
                  <TableCell>{t('workStatistics.columns.totalAssignedCards')}</TableCell>
                  <TableCell>{t('workStatistics.columns.inProgress')}</TableCell>
                  <TableCell>{t('workStatistics.columns.completedCards')}</TableCell>
                  <TableCell>{t('workStatistics.columns.efficiency')}</TableCell>
                  <TableCell>{t('workStatistics.columns.completionRate')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  '& .MuiTableCell-body': {
                    py: 1.5,
                    px: 2,
                    fontSize: '0.875rem',
                    borderBottom: `1px solid ${
                      theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                    }`,
                  },
                  '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
                    borderBottom: 'none',
                  },
                }}
              >
                {paginatedStatistics.map((stat) => (
                  <TableRow
                    key={stat.id}
                    hover
                    sx={{
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            mr: 2,
                            width: 40,
                            height: 40,
                            bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                            color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.55)' : theme.palette.grey[300],
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'text.primary' }}>
                            {stat.employeeName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary', opacity: 0.68, mt: 0.25 }}>
                            {stat.position} • {stat.department}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.period}</TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.tasksAssigned}</TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.tasksInProgress}</TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.tasksCompleted}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${stat.efficiency.toFixed(1)}%`}
                        size="small"
                        sx={{
                          height: 26,
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          border: '1px solid',
                          borderColor:
                            getEfficiencyColor(stat.efficiency) === 'success'
                              ? alpha(theme.palette.success.main, 0.35)
                              : getEfficiencyColor(stat.efficiency) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.4)
                                : alpha(theme.palette.error.main, 0.35),
                          bgcolor:
                            getEfficiencyColor(stat.efficiency) === 'success'
                              ? alpha(theme.palette.success.main, 0.08)
                              : getEfficiencyColor(stat.efficiency) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.1)
                                : alpha(theme.palette.error.main, 0.08),
                          color: softMetricColor(getEfficiencyColor(stat.efficiency) as 'success' | 'warning' | 'error'),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${stat.productivity.toFixed(1)}%`}
                        size="small"
                        sx={{
                          height: 26,
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          border: '1px solid',
                          borderColor:
                            getProductivityColor(stat.productivity) === 'success'
                              ? alpha(theme.palette.success.main, 0.35)
                              : getProductivityColor(stat.productivity) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.4)
                                : alpha(theme.palette.error.main, 0.35),
                          bgcolor:
                            getProductivityColor(stat.productivity) === 'success'
                              ? alpha(theme.palette.success.main, 0.08)
                              : getProductivityColor(stat.productivity) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.1)
                                : alpha(theme.palette.error.main, 0.08),
                          color: softMetricColor(getProductivityColor(stat.productivity) as 'success' | 'warning' | 'error'),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedStatistics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography sx={{ py: 2, textAlign: 'center', color: 'text.primary', opacity: 0.65 }}>
                        {t('workStatistics.empty.noAssigneeStats')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5, px: 2 }}>
            <Pagination
              count={Math.max(1, Math.ceil(filteredStatistics.length / itemsPerPage))}
              page={page}
              onChange={(_, value) => setPage(value)}
              shape="rounded"
              siblingCount={1}
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: '10px',
                  fontWeight: 600,
                  minWidth: 36,
                  height: 36,
                },
                '& .Mui-selected': {
                  bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.12)' : alpha(theme.palette.common.white, 0.16),
                  },
                },
              }}
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
            {t('workStatistics.charts.completionByAssignee')}
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="productivity" name={t('workStatistics.columns.completionRate')} stroke="#2563EB" strokeWidth={2} />
                <Line type="monotone" dataKey="efficiency" name={t('workStatistics.columns.efficiency')} stroke="#007A83" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
            {t('workStatistics.charts.cardStatusDistribution')}
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {timeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
            {t('workStatistics.charts.efficiencyByAssignee')}
          </Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="completionRate" name={t('workStatistics.columns.completionRate')} fill="#007A83" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>
      </Card>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkStatistics;
