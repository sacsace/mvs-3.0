import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

export interface CalendarVacationItem {
  id: number;
  employeeName: string;
  vacationType: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  days: number;
}

/** 부서 Select에서「전체 부서」선택 시 `value`로 사용 (실제 부서명과 충돌 방지) */
export const CALENDAR_DEPARTMENT_ALL_VALUE = '__ALL_DEPARTMENTS__';

export interface DepartmentLeaveCalendarProps {
  vacations: CalendarVacationItem[];
  viewMonth: Date;
  onMonthChange: (d: Date) => void;
  onSelectVacation: (v: CalendarVacationItem) => void;
  language: 'ko' | 'en';
  /** 요일 헤더: 월 시작 = 월요일 */
  weekStartsOn?: 0 | 1;
}

function dayInVacation(day: Date, v: CalendarVacationItem): boolean {
  const rawS = v.startDate.includes('T') ? v.startDate.split('T')[0] : v.startDate.slice(0, 10);
  const rawE = v.endDate.includes('T') ? v.endDate.split('T')[0] : v.endDate.slice(0, 10);
  const start = startOfDay(parseISO(rawS));
  const end = startOfDay(parseISO(rawE));
  const d = startOfDay(day);
  return d >= start && d <= end;
}

const statusColor = (status: CalendarVacationItem['status'], theme: Theme): string => {
  switch (status) {
    case 'pending':
      return theme.palette.warning.main;
    case 'approved':
      return theme.palette.success.main;
    case 'rejected':
      return theme.palette.error.main;
    default:
      return theme.palette.grey[400];
  }
};

const DepartmentLeaveCalendar: React.FC<DepartmentLeaveCalendarProps> = ({
  vacations,
  viewMonth,
  onMonthChange,
  onSelectVacation,
  language,
  weekStartsOn = 1,
}) => {
  const theme = useTheme();
  const locale = language === 'ko' ? ko : enUS;
  const weekStartsOnOpt = weekStartsOn;

  const { gridDays, weekdayLabels } = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: weekStartsOnOpt });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartsOnOpt });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const firstWeek = days.slice(0, 7);
    const labels = firstWeek.map((d) =>
      format(d, 'EEE', { locale })
    );

    return { gridDays: days, weekdayLabels: labels };
  }, [viewMonth, weekStartsOnOpt, locale]);

  const vacationsByDay = useMemo(() => {
    const map = new Map<string, CalendarVacationItem[]>();
    gridDays.forEach((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const list = vacations.filter((v) => dayInVacation(day, v));
      map.set(key, list);
    });
    return map;
  }, [gridDays, vacations]);

  const maxChips = 3;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => onMonthChange(subMonths(viewMonth, 1))}
            aria-label="prev month"
          >
            <ChevronLeft />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
            {format(viewMonth, language === 'ko' ? 'yyyy년 M월' : 'MMMM yyyy', { locale })}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onMonthChange(addMonths(viewMonth, 1))}
            aria-label="next month"
          >
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 0.5,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        {weekdayLabels.map((label, idx) => (
          <Box
            key={`wd-${idx}-${label}`}
            sx={{
              py: 1,
              textAlign: 'center',
              bgcolor: '#F5F6F8',
              borderBottom: '2px solid #E2E8F0',
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </Box>
        ))}

        {gridDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, viewMonth);
          const list = vacationsByDay.get(key) || [];
          const show = list.slice(0, maxChips);
          const more = list.length - show.length;

          return (
            <Box
              key={key}
              sx={{
                minHeight: { xs: 72, sm: 88 },
                p: 0.4,
                borderRight: `1px solid ${theme.palette.divider}`,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: inMonth ? 'background.paper' : 'action.hover',
                '&:nth-of-type(7n)': { borderRight: 'none' },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: inMonth ? 600 : 400,
                  color: inMonth ? 'text.primary' : 'text.disabled',
                  mb: 0.25,
                  fontSize: '0.7rem',
                }}
              >
                {format(day, 'd')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {show.map((v) => (
                  <Tooltip
                    key={`${v.id}-${key}`}
                    title={`${v.employeeName} · ${v.days}${language === 'ko' ? '일' : 'd'}`}
                    arrow
                  >
                    <Chip
                      size="small"
                      label={v.employeeName}
                      onClick={() => onSelectVacation(v)}
                      sx={{
                        height: 18,
                        maxWidth: '100%',
                        fontSize: '0.65rem',
                        '& .MuiChip-label': {
                          px: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                        bgcolor: statusColor(v.status, theme),
                        color: theme.palette.getContrastText(statusColor(v.status, theme)),
                        '&:hover': { opacity: 0.92 },
                      }}
                    />
                  </Tooltip>
                ))}
                {more > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', pl: 0.25 }}>
                    +{more}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default DepartmentLeaveCalendar;
