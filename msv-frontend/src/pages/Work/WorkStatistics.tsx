import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  MenuItem,
  Pagination,
  Snackbar,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsKpiCardSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPaginationSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsBodyListTableSx,
  mvsTableScrollSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx,
} from '../../theme/mvsLayout';
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
  ComposedChart,
  ErrorBar,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  Legend
} from 'recharts';
import { workBoardService } from '../../services/api';
import { useStore } from '../../store';

const TEAM_STATS_ROLES = new Set(['root', 'audit', 'admin', 'manager']);

const resolveCardCreatorId = (card: Record<string, unknown>): number | null => {
  const raw =
    card.created_by ??
    card.createdBy ??
    (card.cardCreator as { id?: number } | undefined)?.id ??
    (card.creator as { id?: number } | undefined)?.id;
  if (raw == null) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
};

const isCardRelevantToUser = (card: Record<string, unknown>, userId: number): boolean => {
  const assigneeId = (card.assignee as { id?: number } | undefined)?.id;
  const assigneeUserId = assigneeId != null ? Number(assigneeId) : null;
  const creatorId = resolveCardCreatorId(card);
  return assigneeUserId === userId || creatorId === userId;
};

interface ProcessingDurationStats {
  count: number;
  avgHours: number;
  medianHours: number;
  minHours: number;
  maxHours: number;
  stdDevHours: number;
}

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
  avgCompletedProcessingHours: number;
  avgOpenElapsedHours: number;
  totalCompletedProcessingHours: number;
  onTimeRate: number;
  overdueCount: number;
  monthlyCompleted: number;
  personalEfficiencyScore: number;
  completedProcessingCount: number;
  openElapsedCount: number;
  completedDuration: ProcessingDurationStats;
  openDuration: ProcessingDurationStats;
}

const EMPTY_DURATION_STATS: ProcessingDurationStats = {
  count: 0,
  avgHours: 0,
  medianHours: 0,
  minHours: 0,
  maxHours: 0,
  stdDevHours: 0
};

type ProcessingTimeMetric = 'median' | 'average';

type StatAccumulator = WorkStatistic & {
  completedProcessingMs: number;
  openElapsedMs: number;
  onTimeCompleted: number;
  dueDatedCompleted: number;
  completedDurationHoursSamples: number[];
  openDurationHoursSamples: number[];
};

const hoursToDays = (hours: number): number => hours / 24;

const computeSampleStats = (samples: number[]): ProcessingDurationStats => {
  if (samples.length === 0) return { ...EMPTY_DURATION_STATS };

  const sorted = [...samples].sort((a, b) => a - b);
  const count = sorted.length;
  const avgHours = sorted.reduce((sum, value) => sum + value, 0) / count;
  const mid = Math.floor(count / 2);
  const medianHours =
    count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const minHours = sorted[0];
  const maxHours = sorted[count - 1];
  const variance = sorted.reduce((sum, value) => sum + (value - avgHours) ** 2, 0) / count;
  const stdDevHours = Math.sqrt(variance);

  return {
    count,
    avgHours: Number(avgHours.toFixed(2)),
    medianHours: Number(medianHours.toFixed(2)),
    minHours: Number(minHours.toFixed(2)),
    maxHours: Number(maxHours.toFixed(2)),
    stdDevHours: Number(stdDevHours.toFixed(2))
  };
};

const buildCompletedDurationDistribution = (
  samples: number[],
  labels: {
    under1Day: string;
    days1to3: string;
    days3to7: string;
    days7to14: string;
    over14Days: string;
  }
) => {
  const buckets = [
    { name: labels.under1Day, min: 0, max: 24, color: '#16A34A' },
    { name: labels.days1to3, min: 24, max: 72, color: '#2563EB' },
    { name: labels.days3to7, min: 72, max: 168, color: '#F59E0B' },
    { name: labels.days7to14, min: 168, max: 336, color: '#F97316' },
    { name: labels.over14Days, min: 336, max: Infinity, color: '#DC2626' }
  ];

  return buckets.map((bucket) => ({
    name: bucket.name,
    value: samples.filter((hours) => hours >= bucket.min && hours < bucket.max).length,
    color: bucket.color
  }));
};

const resolveCardTimestamp = (
  card: Record<string, unknown>,
  field: 'created' | 'completed' | 'updated'
): Date | null => {
  const raw =
    field === 'created'
      ? card.created_at ?? card.createdAt
      : field === 'completed'
        ? card.completed_at ?? card.completedAt
        : card.updated_at ?? card.updatedAt;
  if (!raw) {
    return field === 'completed' ? resolveCardTimestamp(card, 'updated') : null;
  }
  const date = new Date(raw as string | Date);
  return Number.isFinite(date.getTime()) ? date : null;
};

const matchesPeriod = (date: Date, period: string): boolean => {
  const [year, month] = period.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
};

const isOverdueCard = (dueDate: string | null | undefined, now: Date): boolean => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  return now > due;
};

const isOnTimeCompletion = (dueDate: string | null | undefined, completedAt: Date): boolean => {
  if (!dueDate) return true;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  return completedAt <= due;
};

const computePersonalEfficiencyScore = (
  completionRate: number,
  onTimeRate: number,
  monthlyCompleted: number,
  overdueCount: number,
  tasksAssigned: number
): number => {
  if (tasksAssigned <= 0) return 0;
  const velocityScore = Math.min(100, monthlyCompleted * 25);
  const overduePenalty = Math.min(40, overdueCount * 10);
  const weighted =
    completionRate * 0.4 +
    onTimeRate * 0.25 +
    velocityScore * 0.2 +
    Math.max(0, 100 - overduePenalty) * 0.15;
  return Number(weighted.toFixed(1));
};

const msBetweenTimestamps = (start?: string | Date | null, end?: string | Date | null): number => {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 0;
  return endMs - startMs;
};

const createEmptyAccumulator = (
  assigneeId: number,
  meta: { name: string; department: string; position: string } | undefined,
  fallbackName: string,
  period: string
): StatAccumulator => ({
  id: assigneeId,
  employeeId: assigneeId,
  employeeName: meta?.name || fallbackName,
  department: meta?.department || '-',
  position: meta?.position || '-',
  period,
  totalHours: 0,
  productiveHours: 0,
  tasksCompleted: 0,
  tasksAssigned: 0,
  efficiency: 0,
  productivity: 0,
  attendanceRate: 0,
  tasksInProgress: 0,
  tasksTodo: 0,
  avgCompletedProcessingHours: 0,
  avgOpenElapsedHours: 0,
  totalCompletedProcessingHours: 0,
  onTimeRate: 0,
  overdueCount: 0,
  monthlyCompleted: 0,
  personalEfficiencyScore: 0,
  completedProcessingCount: 0,
  openElapsedCount: 0,
  completedDuration: { ...EMPTY_DURATION_STATS },
  openDuration: { ...EMPTY_DURATION_STATS },
  completedProcessingMs: 0,
  openElapsedMs: 0,
  onTimeCompleted: 0,
  dueDatedCompleted: 0,
  completedDurationHoursSamples: [],
  openDurationHoursSamples: []
});

const finalizeStatistic = (stat: StatAccumulator): WorkStatistic => {
  const avgCompletedProcessingHours =
    stat.completedProcessingCount > 0
      ? stat.completedProcessingMs / stat.completedProcessingCount / 3_600_000
      : 0;
  const avgOpenElapsedHours =
    stat.openElapsedCount > 0 ? stat.openElapsedMs / stat.openElapsedCount / 3_600_000 : 0;
  const totalCompletedProcessingHours = stat.completedProcessingMs / 3_600_000;
  const onTimeRate =
    stat.dueDatedCompleted > 0
      ? Number(((stat.onTimeCompleted / stat.dueDatedCompleted) * 100).toFixed(1))
      : 100;
  const completionRate =
    stat.tasksAssigned > 0 ? (stat.tasksCompleted / stat.tasksAssigned) * 100 : 0;
  const personalEfficiencyScore = computePersonalEfficiencyScore(
    completionRate,
    onTimeRate,
    stat.monthlyCompleted,
    stat.overdueCount,
    stat.tasksAssigned
  );
  const completedDuration = computeSampleStats(stat.completedDurationHoursSamples);
  const openDuration = computeSampleStats(stat.openDurationHoursSamples);

  return {
    id: stat.id,
    employeeId: stat.employeeId,
    employeeName: stat.employeeName,
    department: stat.department,
    position: stat.position,
    period: stat.period,
    totalHours: stat.totalHours,
    productiveHours: stat.productiveHours,
    tasksCompleted: stat.tasksCompleted,
    tasksAssigned: stat.tasksAssigned,
    efficiency: personalEfficiencyScore,
    productivity: Number(completionRate.toFixed(1)),
    attendanceRate: stat.attendanceRate,
    tasksInProgress: stat.tasksInProgress,
    tasksTodo: stat.tasksTodo,
    avgCompletedProcessingHours: Number(avgCompletedProcessingHours.toFixed(2)),
    avgOpenElapsedHours: Number(avgOpenElapsedHours.toFixed(2)),
    totalCompletedProcessingHours: Number(totalCompletedProcessingHours.toFixed(1)),
    onTimeRate,
    overdueCount: stat.overdueCount,
    monthlyCompleted: stat.monthlyCompleted,
    personalEfficiencyScore,
    completedProcessingCount: stat.completedProcessingCount,
    openElapsedCount: stat.openElapsedCount,
    completedDuration,
    openDuration
  };
};

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
  const { user } = useStore();
  const isPersonalStatsView = !user?.role || !TEAM_STATS_ROLES.has(user.role);
  const currentUserId = user?.id != null ? Number(user.id) : null;
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
  const [processingTimeMetric, setProcessingTimeMetric] = useState<ProcessingTimeMetric>('median');
  const [completedDurationSamples, setCompletedDurationSamples] = useState<number[]>([]);

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
      const statMap = new Map<number, StatAccumulator>();
      const now = new Date();
      const globalCompletedSamples: number[] = [];

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
            if (isPersonalStatsView && currentUserId != null && !isCardRelevantToUser(card, currentUserId)) {
              continue;
            }

            if (status === 'done') summary.done += 1;
            else if (status === 'progress') summary.progress += 1;
            else summary.todo += 1;

            const assigneeId = card.assignee?.id != null ? Number(card.assignee.id) : null;
            const statUserId = isPersonalStatsView && currentUserId != null
              ? currentUserId
              : assigneeId;

            if (!statUserId) {
              summary.unassigned += 1;
              continue;
            }

            if (!statMap.has(statUserId)) {
              const meta = memberMeta.get(statUserId);
              const fallbackName = isPersonalStatsView && currentUserId === statUserId
                ? (user?.username || t('workStatistics.userFallback', { id: statUserId }))
                : (card.assignee?.username || t('workStatistics.userFallback', { id: statUserId }));
              statMap.set(
                statUserId,
                createEmptyAccumulator(
                  statUserId,
                  meta ?? (isPersonalStatsView && currentUserId === statUserId
                    ? {
                        name: user?.username || fallbackName,
                        department: (user as { department?: string })?.department || '-',
                        position: (user as { position?: string })?.position || '-',
                      }
                    : undefined),
                  fallbackName,
                  currentPeriod
                )
              );
            }

            const item = statMap.get(statUserId)!;
            item.tasksAssigned += 1;
            if (status === 'done') item.tasksCompleted += 1;
            else if (status === 'progress') item.tasksInProgress += 1;
            else item.tasksTodo += 1;

            const createdAt = resolveCardTimestamp(card, 'created');
            const completedAt = resolveCardTimestamp(card, 'completed');
            if (createdAt) {
              if (status === 'done') {
                const endAt = completedAt ?? now;
                const durationMs = msBetweenTimestamps(createdAt, endAt);
                const durationHours = (durationMs > 0 ? durationMs : 60_000) / 3_600_000;
                item.completedProcessingMs += durationMs > 0 ? durationMs : 60_000;
                item.completedProcessingCount += 1;
                item.completedDurationHoursSamples.push(durationHours);
                globalCompletedSamples.push(durationHours);
                if (matchesPeriod(endAt, currentPeriod)) {
                  item.monthlyCompleted += 1;
                }
                if (card.due_date) {
                  item.dueDatedCompleted += 1;
                  if (isOnTimeCompletion(card.due_date, endAt)) {
                    item.onTimeCompleted += 1;
                  }
                }
              } else {
                const durationMs = msBetweenTimestamps(createdAt, now);
                if (durationMs > 0) {
                  const durationHours = durationMs / 3_600_000;
                  item.openElapsedMs += durationMs;
                  item.openElapsedCount += 1;
                  item.openDurationHoursSamples.push(durationHours);
                }
                if (isOverdueCard(card.due_date, now)) {
                  item.overdueCount += 1;
                }
              }
            }
          }
        }
      }

      const rows = Array.from(statMap.values()).map((s) => {
        const totalHours = s.tasksAssigned * 2;
        const productiveHours = s.tasksCompleted * 2 + s.tasksInProgress * 1.2;
        const finalized = finalizeStatistic(s);
        const doneRate = finalized.productivity;
        return {
          ...finalized,
          totalHours: Number(totalHours.toFixed(1)),
          productiveHours: Number(productiveHours.toFixed(1)),
          attendanceRate: Number(Math.min(100, 85 + doneRate * 0.15).toFixed(1))
        };
      });

      // 담당카드가 0인 멤버도 포함 (보드 멤버 기준, 관리자 뷰만)
      if (!isPersonalStatsView) {
        memberMeta.forEach((meta, uid) => {
          if (!statMap.has(uid)) {
            rows.push(
              finalizeStatistic(createEmptyAccumulator(uid, meta, meta.name, currentPeriod))
            );
          }
        });
      } else if (currentUserId != null && !statMap.has(currentUserId)) {
        const meta = memberMeta.get(currentUserId);
        rows.push(
          finalizeStatistic(
            createEmptyAccumulator(
              currentUserId,
              meta ?? {
                name: user?.username || t('workStatistics.userFallback', { id: currentUserId }),
                department: (user as { department?: string })?.department || '-',
                position: (user as { position?: string })?.position || '-',
              },
              user?.username || t('workStatistics.userFallback', { id: currentUserId }),
              currentPeriod
            )
          )
        );
      }

      rows.sort(
        (a, b) =>
          b.personalEfficiencyScore - a.personalEfficiencyScore ||
          b.tasksAssigned - a.tasksAssigned ||
          b.tasksCompleted - a.tasksCompleted
      );

      setStatistics(rows);
      setStatusSummary(summary);
      setCompletedDurationSamples(globalCompletedSamples);
    } catch (err: any) {
      console.error('통계 데이터 로드 오류:', err);
      setError(err?.message || t('workStatistics.errors.loadStatsFailed'));
      setStatistics([]);
      setStatusSummary({ todo: 0, progress: 0, done: 0, unassigned: 0 });
      setCompletedDurationSamples([]);
    }
  }, [currentPeriod, currentUserId, isPersonalStatsView, t, user]);

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

  const formatProcessingDuration = useCallback(
    (hours: number, hasData = false) => {
      if (hours <= 0) {
        return hasData
          ? t('workStatistics.duration.lessThanMinute')
          : t('workStatistics.duration.none');
      }
      if (hours >= 24) {
        return t('workStatistics.duration.days', { value: (hours / 24).toFixed(1) });
      }
      if (hours >= 1) {
        return t('workStatistics.duration.hours', { value: Math.round(hours) });
      }
      return t('workStatistics.duration.minutes', { value: Math.max(1, Math.round(hours * 60)) });
    },
    [t]
  );

  const formatDaysLabel = useCallback(
    (days: number, hasData = false) => {
      if (days <= 0) {
        return hasData
          ? t('workStatistics.duration.lessThanMinute')
          : t('workStatistics.duration.none');
      }
      if (days >= 1) {
        return t('workStatistics.duration.days', { value: days.toFixed(1) });
      }
      return t('workStatistics.duration.hours', { value: Math.max(1, Math.round(days * 24)) });
    },
    [t]
  );

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

  const averageEfficiency = safeAvg(
    statistics.filter((s) => s.tasksAssigned > 0).map((s) => s.personalEfficiencyScore)
  );
  const averageOnTimeRate = safeAvg(
    statistics.filter((s) => s.tasksAssigned > 0).map((s) => s.onTimeRate)
  );
  const averageProductivity = safeAvg(statistics.map((s) => s.productivity));
  const totalAssigned = statistics.reduce((sum, s) => sum + s.tasksAssigned, 0);
  const totalTasksCompleted = statistics.reduce((sum, s) => sum + s.tasksCompleted, 0);
  const totalCompletedProcessingHours = statistics.reduce(
    (sum, s) => sum + s.totalCompletedProcessingHours,
    0
  );
  const averageProcessingTime =
    totalTasksCompleted > 0 ? totalCompletedProcessingHours / totalTasksCompleted : 0;
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

  const efficiencyTrendData = statistics
    .filter((s) => s.tasksAssigned > 0)
    .sort((a, b) => b.personalEfficiencyScore - a.personalEfficiencyScore)
    .slice(0, 10)
    .map((s) => ({
      name: s.employeeName,
      personalEfficiency: s.personalEfficiencyScore,
      completionRate: s.productivity,
      onTimeRate: s.onTimeRate
    }));

  const teamCompletedStats = useMemo(
    () => computeSampleStats(completedDurationSamples),
    [completedDurationSamples]
  );

  const completedDurationDistribution = useMemo(
    () =>
      buildCompletedDurationDistribution(completedDurationSamples, {
        under1Day: t('workStatistics.processingTime.buckets.under1Day'),
        days1to3: t('workStatistics.processingTime.buckets.days1to3'),
        days3to7: t('workStatistics.processingTime.buckets.days3to7'),
        days7to14: t('workStatistics.processingTime.buckets.days7to14'),
        over14Days: t('workStatistics.processingTime.buckets.over14Days')
      }).filter((bucket) => bucket.value > 0),
    [completedDurationSamples, t]
  );

  const teamCompletedMedianDays = hoursToDays(teamCompletedStats.medianHours);
  const teamCompletedAvgDays = hoursToDays(teamCompletedStats.avgHours);

  const processingTimeChartData = useMemo(() => {
    const pickCompletedHours = (stats: ProcessingDurationStats) =>
      processingTimeMetric === 'median' ? stats.medianHours : stats.avgHours;
    const pickOpenHours = (stats: ProcessingDurationStats) =>
      processingTimeMetric === 'median' ? stats.medianHours : stats.avgHours;

    return statistics
      .filter((s) => s.completedDuration.count > 0 || s.openDuration.count > 0)
      .sort(
        (a, b) =>
          pickCompletedHours(b.completedDuration) - pickCompletedHours(a.completedDuration) ||
          pickOpenHours(b.openDuration) - pickOpenHours(a.openDuration)
      )
      .slice(0, 10)
      .map((s) => ({
        name: s.employeeName,
        completedDays: Number(hoursToDays(pickCompletedHours(s.completedDuration)).toFixed(1)),
        openDays: Number(hoursToDays(pickOpenHours(s.openDuration)).toFixed(1)),
        completedRange: [
          Number(hoursToDays(s.completedDuration.minHours).toFixed(1)),
          Number(hoursToDays(s.completedDuration.maxHours).toFixed(1))
        ] as [number, number],
        openRange: [
          Number(hoursToDays(s.openDuration.minHours).toFixed(1)),
          Number(hoursToDays(s.openDuration.maxHours).toFixed(1))
        ] as [number, number],
        completedCount: s.completedDuration.count,
        openCount: s.openDuration.count
      }));
  }, [statistics, processingTimeMetric]);

  const processingTimeDetailRows = useMemo(
    () =>
      statistics
        .filter((s) => s.completedDuration.count > 0 || s.openDuration.count > 0)
        .sort((a, b) => b.completedDuration.medianHours - a.completedDuration.medianHours),
    [statistics]
  );

  const personalEfficiencyRows = statistics
    .filter((s) => s.tasksAssigned > 0)
    .sort((a, b) => b.personalEfficiencyScore - a.personalEfficiencyScore);

  const TabPanel = ({ children, value, index, ...other }: any) => (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 2, px: { xs: 2, sm: 2.5, md: 3 } }}>{children}</Box>}
    </div>
  );

  const statsFilterFieldSx = {
    ...mvsSearchFieldSx,
    ...mvsFilterFieldHeightSx,
  } as const;

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('workStatistics.title')}
        actions={
          <>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
            onClick={loadStatisticsData}
            sx={mvsBodyOutlinedBtnSx}
          >
            {t('workStatistics.actions.refresh')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
            sx={mvsBodyOutlinedBtnSx}
          >
            {t('workStatistics.actions.export')}
          </Button>
          </>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(7, 1fr)' }, gap: 2.5, mb: 3 }}>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.avgPersonalEfficiency')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: softMetricColor(getEfficiencyColor(averageEfficiency) as 'success' | 'warning' | 'error') }}>
              {averageEfficiency.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.avgOnTimeRate')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: softMetricColor(getProductivityColor(averageOnTimeRate) as 'success' | 'warning' | 'error') }}>
              {averageOnTimeRate.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.avgCompletionRate')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: softMetricColor(getProductivityColor(averageProductivity) as 'success' | 'warning' | 'error') }}>
              {averageProductivity.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.totalAssignedCards')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'text.primary' }}>{totalAssigned}</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.completedCards')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'text.primary' }}>{totalTasksCompleted}</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.overallCompletionRate')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: softMetricColor('success') }}>{completionRate.toFixed(1)}%</Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={mvsKpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
              {t('workStatistics.summary.avgProcessingTime')}
            </Typography>
            <Typography variant="kpiNumber" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatProcessingDuration(averageProcessingTime, totalTasksCompleted > 0)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            bgcolor: '#FFFFFF',
            ...statsFilterFieldSx,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
            <TextField
              fullWidth
              size="small"
              label={t('common.search')}
              placeholder={t('workStatistics.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
              sx={statsFilterFieldSx}
            />
            <TextField
              fullWidth
              size="small"
              select
              label={t('workStatistics.filters.department')}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              sx={statsFilterFieldSx}
            >
              <MenuItem value="">{t('workStatistics.filters.all')}</MenuItem>
              {departments.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('workStatistics.filters.period')}
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{ displayEmpty: true }}
              sx={statsFilterFieldSx}
            >
              <MenuItem value="">{t('workStatistics.filters.all')}</MenuItem>
              {periods.map((period) => (
                <MenuItem key={period} value={period}>{period}</MenuItem>
              ))}
            </TextField>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('');
                setPeriodFilter('');
              }}
              sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
            >
              {t('workStatistics.actions.reset')}
            </Button>
        </Box>
      </Card>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: '#C5CED9' }}>
          <Tabs
            value={tabValue}
            onChange={(_e, newValue) => setTabValue(newValue)}
            sx={{
              minHeight: 40,
              px: { xs: 1, sm: 1.5 },
              bgcolor: '#FFFFFF',
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8125rem',
                minHeight: 40,
                py: 0.75,
                letterSpacing: '-0.01em',
                color: 'text.secondary',
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
              },
            }}
          >
            <Tab label={t('workStatistics.tabs.assigneeStats')} />
            <Tab label={t('workStatistics.tabs.completionComparison')} />
            <Tab label={t('workStatistics.tabs.cardStatusDistribution')} />
            <Tab label={t('workStatistics.tabs.efficiencyAnalysis')} />
            <Tab label={t('workStatistics.tabs.processingTimeAnalysis')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
            <Table
              size="small"
              sx={{
                borderCollapse: 'collapse',
                bgcolor: 'transparent',
                '& .MuiTableCell-root': {
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                },
              }}
            >
              <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  <TableCell>{t('workStatistics.columns.employeeInfo')}</TableCell>
                  <TableCell>{t('workStatistics.columns.period')}</TableCell>
                  <TableCell>{t('workStatistics.columns.totalAssignedCards')}</TableCell>
                  <TableCell>{t('workStatistics.columns.inProgress')}</TableCell>
                  <TableCell>{t('workStatistics.columns.completedCards')}</TableCell>
                  <TableCell>{t('workStatistics.columns.avgProcessingTime')}</TableCell>
                  <TableCell>{t('workStatistics.columns.avgElapsedTime')}</TableCell>
                  <TableCell>{t('workStatistics.columns.personalEfficiency')}</TableCell>
                  <TableCell>{t('workStatistics.columns.completionRate')}</TableCell>
                  <TableCell>{t('workStatistics.columns.onTimeRate')}</TableCell>
                  <TableCell>{t('workStatistics.columns.overdueCards')}</TableCell>
                  <TableCell>{t('workStatistics.columns.monthlyCompleted')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={mvsTableBodyRowSx}>
                {paginatedStatistics.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            mr: 1.25,
                            width: 34,
                            height: 34,
                            bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                            color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.55)' : theme.palette.grey[300],
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 17 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
                            {stat.employeeName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.period}</TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.tasksAssigned}</TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.tasksInProgress}</TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>{stat.tasksCompleted}</TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>
                      {formatProcessingDuration(stat.avgCompletedProcessingHours, stat.completedProcessingCount > 0)}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>
                      {formatProcessingDuration(stat.avgOpenElapsedHours, stat.openElapsedCount > 0)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${stat.personalEfficiencyScore.toFixed(1)}%`}
                        size="small"
                        sx={{
                          height: 26,
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          border: '1px solid',
                          borderColor:
                            getEfficiencyColor(stat.personalEfficiencyScore) === 'success'
                              ? alpha(theme.palette.success.main, 0.35)
                              : getEfficiencyColor(stat.personalEfficiencyScore) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.4)
                                : alpha(theme.palette.error.main, 0.35),
                          bgcolor:
                            getEfficiencyColor(stat.personalEfficiencyScore) === 'success'
                              ? alpha(theme.palette.success.main, 0.08)
                              : getEfficiencyColor(stat.personalEfficiencyScore) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.1)
                                : alpha(theme.palette.error.main, 0.08),
                          color: softMetricColor(getEfficiencyColor(stat.personalEfficiencyScore) as 'success' | 'warning' | 'error'),
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
                    <TableCell>
                      <Chip
                        label={`${stat.onTimeRate.toFixed(1)}%`}
                        size="small"
                        sx={{
                          height: 26,
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                          border: '1px solid',
                          borderColor:
                            getProductivityColor(stat.onTimeRate) === 'success'
                              ? alpha(theme.palette.success.main, 0.35)
                              : getProductivityColor(stat.onTimeRate) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.4)
                                : alpha(theme.palette.error.main, 0.35),
                          bgcolor:
                            getProductivityColor(stat.onTimeRate) === 'success'
                              ? alpha(theme.palette.success.main, 0.08)
                              : getProductivityColor(stat.onTimeRate) === 'warning'
                                ? alpha(theme.palette.warning.main, 0.1)
                                : alpha(theme.palette.error.main, 0.08),
                          color: softMetricColor(getProductivityColor(stat.onTimeRate) as 'success' | 'warning' | 'error'),
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: stat.overdueCount > 0 ? 'error.main' : 'text.primary', opacity: 0.88, fontWeight: 600 }}>
                      {stat.overdueCount}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', opacity: 0.88, fontWeight: 500 }}>
                      {stat.monthlyCompleted}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedStatistics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12}>
                      <Typography sx={{ py: 2, textAlign: 'center', color: 'text.primary', opacity: 0.65 }}>
                        {t('workStatistics.empty.noAssigneeStats')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={mvsBodyPaginationSx}>
            <Pagination
              count={Math.max(1, Math.ceil(filteredStatistics.length / itemsPerPage))}
              page={page}
              onChange={(_, value) => setPage(value)}
              shape="rounded"
              siblingCount={1}
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
            {t('workStatistics.charts.personalEfficiencyByAssignee')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {t('workStatistics.tooltips.personalEfficiencyChart')}
          </Typography>
          <Box sx={{ height: 400, mb: 3 }}>
            {efficiencyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyTrendData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar
                    dataKey="personalEfficiency"
                    name={t('workStatistics.columns.personalEfficiency')}
                    fill="#007A83"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="completionRate"
                    name={t('workStatistics.columns.completionRate')}
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="onTimeRate"
                    name={t('workStatistics.columns.onTimeRate')}
                    fill="#16A34A"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography sx={{ color: 'text.secondary' }}>
                  {t('workStatistics.empty.noPersonalEfficiencyData')}
                </Typography>
              </Box>
            )}
          </Box>

          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>
            {t('workStatistics.sections.personalEfficiencyDetail')}
          </Typography>
          <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx, mb: 2 }}>
            <Table size="small" sx={{ borderCollapse: 'collapse', bgcolor: 'transparent' }}>
              <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  <TableCell>{t('workStatistics.columns.employeeInfo')}</TableCell>
                  <TableCell>{t('workStatistics.columns.personalEfficiency')}</TableCell>
                  <TableCell>{t('workStatistics.columns.completionRate')}</TableCell>
                  <TableCell>{t('workStatistics.columns.onTimeRate')}</TableCell>
                  <TableCell>{t('workStatistics.columns.monthlyCompleted')}</TableCell>
                  <TableCell>{t('workStatistics.columns.overdueCards')}</TableCell>
                  <TableCell>{t('workStatistics.columns.avgProcessingTime')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={mvsTableBodyRowSx}>
                {personalEfficiencyRows.slice(0, 15).map((stat) => (
                  <TableRow key={`efficiency-${stat.id}`}>
                    <TableCell>{stat.employeeName}</TableCell>
                    <TableCell>{stat.personalEfficiencyScore.toFixed(1)}%</TableCell>
                    <TableCell>{stat.productivity.toFixed(1)}%</TableCell>
                    <TableCell>{stat.onTimeRate.toFixed(1)}%</TableCell>
                    <TableCell>{stat.monthlyCompleted}</TableCell>
                    <TableCell sx={{ color: stat.overdueCount > 0 ? 'error.main' : 'inherit', fontWeight: stat.overdueCount > 0 ? 600 : 400 }}>
                      {stat.overdueCount}
                    </TableCell>
                    <TableCell>
                      {formatProcessingDuration(stat.avgCompletedProcessingHours, stat.completedProcessingCount > 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {personalEfficiencyRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
                        {t('workStatistics.empty.noPersonalEfficiencyData')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
                {t('workStatistics.charts.processingTimeByAssignee')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('workStatistics.tooltips.processingTimeChart')}
              </Typography>
            </Box>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={processingTimeMetric}
              onChange={(_e, value: ProcessingTimeMetric | null) => {
                if (value) setProcessingTimeMetric(value);
              }}
              sx={{ borderRadius: '10px' }}
            >
              <ToggleButton value="median" sx={{ textTransform: 'none', px: 2 }}>
                {t('workStatistics.processingTime.median')}
              </ToggleButton>
              <ToggleButton value="average" sx={{ textTransform: 'none', px: 2 }}>
                {t('workStatistics.processingTime.average')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            <Card elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {t('workStatistics.processingTime.teamMedian')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {formatDaysLabel(teamCompletedMedianDays, teamCompletedStats.count > 0)}
                </Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {t('workStatistics.processingTime.teamAverage')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {formatDaysLabel(teamCompletedAvgDays, teamCompletedStats.count > 0)}
                </Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {t('workStatistics.processingTime.fastest')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5, color: 'success.main' }}>
                  {formatDaysLabel(hoursToDays(teamCompletedStats.minHours), teamCompletedStats.count > 0)}
                </Typography>
              </CardContent>
            </Card>
            <Card elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {t('workStatistics.processingTime.slowest')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.5, color: 'warning.main' }}>
                  {formatDaysLabel(hoursToDays(teamCompletedStats.maxHours), teamCompletedStats.count > 0)}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 3, mb: 3 }}>
            <Box sx={{ height: 420 }}>
              {processingTimeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={processingTimeChartData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) => `${value}${t('workStatistics.processingTime.dayUnit')}`}
                      label={{
                        value: t('workStatistics.processingTime.yAxisDays'),
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: theme.palette.text.secondary, fontSize: 12 }
                      }}
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => {
                        const label =
                          name === 'completedDays'
                            ? t('workStatistics.charts.avgCompletedProcessing')
                            : t('workStatistics.charts.avgOpenElapsed');
                        return [formatDaysLabel(Number(value), true), label];
                      }}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload;
                        if (!row) return label;
                        return `${label} (${t('workStatistics.processingTime.sampleCount', {
                          completed: row.completedCount,
                          open: row.openCount
                        })})`;
                      }}
                    />
                    <Legend />
                    <ReferenceLine
                      y={teamCompletedMedianDays}
                      stroke="#007A83"
                      strokeDasharray="6 4"
                      label={{
                        value: t('workStatistics.processingTime.teamMedianLine'),
                        position: 'insideTopRight',
                        fill: '#007A83',
                        fontSize: 12
                      }}
                    />
                    <Bar
                      dataKey="completedDays"
                      name={t('workStatistics.charts.avgCompletedProcessing')}
                      fill="#2563EB"
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                    >
                      <ErrorBar dataKey="completedRange" width={8} strokeWidth={2} stroke="#64748B" />
                    </Bar>
                    <Bar
                      dataKey="openDays"
                      name={t('workStatistics.charts.avgOpenElapsed')}
                      fill="#F59E0B"
                      radius={[6, 6, 0, 0]}
                      barSize={28}
                    >
                      <ErrorBar dataKey="openRange" width={8} strokeWidth={2} stroke="#94A3B8" />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography sx={{ color: 'text.secondary' }}>
                    {t('workStatistics.empty.noProcessingTimeData')}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>
                {t('workStatistics.charts.completedDurationDistribution')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {t('workStatistics.tooltips.durationDistribution')}
              </Typography>
              <Box sx={{ height: 360 }}>
                {completedDurationDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completedDurationDistribution} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value: number) => [
                          t('workStatistics.processingTime.cardsCount', { count: value }),
                          t('workStatistics.charts.completedDurationDistribution')
                        ]}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                        {completedDurationDistribution.map((entry, index) => (
                          <Cell key={`duration-bucket-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography sx={{ color: 'text.secondary' }}>
                      {t('workStatistics.empty.noProcessingTimeData')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>
            {t('workStatistics.sections.processingTimeDetail')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {t('workStatistics.tooltips.processingTimeDetail')}
          </Typography>
          <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx, mb: 2 }}>
            <Table size="small" sx={{ borderCollapse: 'collapse', bgcolor: 'transparent' }}>
              <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  <TableCell>{t('workStatistics.columns.employeeInfo')}</TableCell>
                  <TableCell>{t('workStatistics.processingTime.sampleSize')}</TableCell>
                  <TableCell>{t('workStatistics.processingTime.median')}</TableCell>
                  <TableCell>{t('workStatistics.processingTime.average')}</TableCell>
                  <TableCell>{t('workStatistics.processingTime.min')}</TableCell>
                  <TableCell>{t('workStatistics.processingTime.max')}</TableCell>
                  <TableCell>{t('workStatistics.processingTime.stdDev')}</TableCell>
                  <TableCell>{t('workStatistics.columns.avgElapsedTime')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={mvsTableBodyRowSx}>
                {processingTimeDetailRows.map((stat) => (
                  <TableRow key={`processing-${stat.id}`}>
                    <TableCell>{stat.employeeName}</TableCell>
                    <TableCell>
                      {t('workStatistics.processingTime.sampleCount', {
                        completed: stat.completedDuration.count,
                        open: stat.openDuration.count
                      })}
                    </TableCell>
                    <TableCell>
                      {formatProcessingDuration(stat.completedDuration.medianHours, stat.completedDuration.count > 0)}
                    </TableCell>
                    <TableCell>
                      {formatProcessingDuration(stat.completedDuration.avgHours, stat.completedDuration.count > 0)}
                    </TableCell>
                    <TableCell>
                      {formatProcessingDuration(stat.completedDuration.minHours, stat.completedDuration.count > 0)}
                    </TableCell>
                    <TableCell>
                      {formatProcessingDuration(stat.completedDuration.maxHours, stat.completedDuration.count > 0)}
                    </TableCell>
                    <TableCell>
                      {formatProcessingDuration(stat.completedDuration.stdDevHours, stat.completedDuration.count > 1)}
                    </TableCell>
                    <TableCell>
                      {formatProcessingDuration(stat.openDuration.medianHours, stat.openDuration.count > 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {processingTimeDetailRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography sx={{ py: 2, textAlign: 'center', color: 'text.secondary' }}>
                        {t('workStatistics.empty.noProcessingTimeData')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkStatistics;
