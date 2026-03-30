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
import {
  BarChart as BarChartIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  PieChart as PieChartIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon
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

const WorkStatistics: React.FC = () => {
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

  const classifyStatus = (listTitle: string): 'done' | 'progress' | 'todo' => {
    const normalized = (listTitle || '').replace(/\s+/g, '').toLowerCase();
    if (normalized.includes('완료') || normalized.includes('done')) return 'done';
    if (normalized.includes('진행') || normalized.includes('doing') || normalized.includes('progress')) return 'progress';
    return 'todo';
  };

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

        for (const list of board.lists || []) {
          const status = classifyStatus(list.title || '');
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
    { name: t('workStatistics.status.todo'), value: statusSummary.todo, color: '#94a3b8' },
    { name: t('workStatistics.status.inProgress'), value: statusSummary.progress, color: '#3b82f6' },
    { name: t('workStatistics.status.done'), value: statusSummary.done, color: '#22c55e' },
    { name: t('workStatistics.status.unassigned'), value: statusSummary.unassigned, color: '#f59e0b' }
  ];

  const efficiencyTrendData = statistics.slice(0, 10).map((s) => ({
    name: s.employeeName,
    completionRate: s.productivity
  }));

  const TabPanel = ({ children, value, index, ...other }: any) => (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: 'workArea.main', borderRadius: 2, minHeight: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" sx={{ fontSize: '16px !important', fontWeight: 600, color: 'text.primary', lineHeight: 1.5 }}>
            {t('workStatistics.title')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadStatisticsData} sx={{ borderRadius: 2 }}>
            {t('workStatistics.actions.refresh')}
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} sx={{ borderRadius: 2 }}>
            {t('workStatistics.actions.export')}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>{t('workStatistics.summary.avgEfficiency')}</Typography>
            <Typography variant="h4" color={getEfficiencyColor(averageEfficiency) + '.main'}>{averageEfficiency.toFixed(1)}%</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>{t('workStatistics.summary.avgCompletionRate')}</Typography>
            <Typography variant="h4" color={getProductivityColor(averageProductivity) + '.main'}>{averageProductivity.toFixed(1)}%</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>{t('workStatistics.summary.totalAssignedCards')}</Typography>
            <Typography variant="h4">{totalAssigned}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>{t('workStatistics.summary.completedCards')}</Typography>
            <Typography variant="h4">{totalTasksCompleted}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>{t('workStatistics.summary.overallCompletionRate')}</Typography>
            <Typography variant="h4" color="success.main">{completionRate.toFixed(1)}%</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder={t('workStatistics.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <FormControl fullWidth>
              <InputLabel>{t('workStatistics.filters.department')}</InputLabel>
              <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <MenuItem value="">{t('workStatistics.filters.all')}</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('workStatistics.filters.period')}</InputLabel>
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
              startIcon={<FilterIcon />}
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('');
                setPeriodFilter('');
              }}
            >
              {t('workStatistics.actions.reset')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
            <Tab label={t('workStatistics.tabs.assigneeStats')} icon={<PersonIcon />} />
            <Tab label={t('workStatistics.tabs.completionComparison')} icon={<TrendingUpIcon />} />
            <Tab label={t('workStatistics.tabs.cardStatusDistribution')} icon={<PieChartIcon />} />
            <Tab label={t('workStatistics.tabs.efficiencyAnalysis')} icon={<TimelineIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
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
              <TableBody>
                {paginatedStatistics.map((stat) => (
                  <TableRow key={stat.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">{stat.employeeName}</Typography>
                          <Typography variant="body2" color="text.secondary">{stat.position} • {stat.department}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{stat.period}</TableCell>
                    <TableCell>{stat.tasksAssigned}</TableCell>
                    <TableCell>{stat.tasksInProgress}</TableCell>
                    <TableCell>{stat.tasksCompleted}</TableCell>
                    <TableCell>
                      <Chip label={`${stat.efficiency.toFixed(1)}%`} color={getEfficiencyColor(stat.efficiency)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={`${stat.productivity.toFixed(1)}%`} color={getProductivityColor(stat.productivity)} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedStatistics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {t('workStatistics.empty.noAssigneeStats')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={Math.max(1, Math.ceil(filteredStatistics.length / itemsPerPage))}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>{t('workStatistics.charts.completionByAssignee')}</Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="productivity" name={t('workStatistics.columns.completionRate')} stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="efficiency" name={t('workStatistics.columns.efficiency')} stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>{t('workStatistics.charts.cardStatusDistribution')}</Typography>
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
          <Typography variant="h6" gutterBottom>{t('workStatistics.charts.efficiencyByAssignee')}</Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="completionRate" name={t('workStatistics.columns.completionRate')} fill="#0d8aff" />
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
