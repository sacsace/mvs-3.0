import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  LinearProgress,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '../../store';

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
  overtimeHours: number;
  breakTime: number;
  focusTime: number;
  meetingTime: number;
  codeReviewTime: number;
  testingTime: number;
  documentationTime: number;
  createdAt: string;
}

const WorkStatistics: React.FC = () => {
  const { user } = useStore();
  const [statistics, setStatistics] = useState<WorkStatistic[]>([]);
  const [filteredStatistics, setFilteredStatistics] = useState<WorkStatistic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);

  // 샘플 데이터
  const sampleData: WorkStatistic[] = [
    {
      id: 1,
      employeeId: 1001,
      employeeName: '김개발',
      department: '개발팀',
      position: '개발팀장',
      period: '2024-01',
      totalHours: 176,
      productiveHours: 140,
      tasksCompleted: 12,
      tasksAssigned: 15,
      efficiency: 85.2,
      productivity: 92.5,
      attendanceRate: 98.5,
      overtimeHours: 16,
      breakTime: 8,
      focusTime: 120,
      meetingTime: 20,
      codeReviewTime: 15,
      testingTime: 25,
      documentationTime: 10,
      createdAt: '2024-01-31'
    },
    {
      id: 2,
      employeeId: 1002,
      employeeName: '이프론트',
      department: '개발팀',
      position: '프론트엔드 개발자',
      period: '2024-01',
      totalHours: 168,
      productiveHours: 135,
      tasksCompleted: 10,
      tasksAssigned: 12,
      efficiency: 80.4,
      productivity: 88.3,
      attendanceRate: 100,
      overtimeHours: 8,
      breakTime: 6,
      focusTime: 110,
      meetingTime: 15,
      codeReviewTime: 12,
      testingTime: 20,
      documentationTime: 8,
      createdAt: '2024-01-31'
    },
    {
      id: 3,
      employeeId: 1003,
      employeeName: '박백엔드',
      department: '개발팀',
      position: '백엔드 개발자',
      period: '2024-01',
      totalHours: 172,
      productiveHours: 145,
      tasksCompleted: 11,
      tasksAssigned: 13,
      efficiency: 84.3,
      productivity: 90.1,
      attendanceRate: 97.8,
      overtimeHours: 12,
      breakTime: 7,
      focusTime: 125,
      meetingTime: 18,
      codeReviewTime: 18,
      testingTime: 22,
      documentationTime: 12,
      createdAt: '2024-01-31'
    },
    {
      id: 4,
      employeeId: 2001,
      employeeName: '최마케팅',
      department: '마케팅팀',
      position: '마케팅팀장',
      period: '2024-01',
      totalHours: 160,
      productiveHours: 130,
      tasksCompleted: 8,
      tasksAssigned: 10,
      efficiency: 81.3,
      productivity: 87.2,
      attendanceRate: 95.5,
      overtimeHours: 0,
      breakTime: 5,
      focusTime: 100,
      meetingTime: 25,
      codeReviewTime: 0,
      testingTime: 0,
      documentationTime: 15,
      createdAt: '2024-01-31'
    }
  ];

  // 차트 데이터
  const productivityData = [
    { name: '1월', 김개발: 92.5, 이프론트: 88.3, 박백엔드: 90.1, 최마케팅: 87.2 },
    { name: '2월', 김개발: 94.2, 이프론트: 89.1, 박백엔드: 91.5, 최마케팅: 88.7 },
    { name: '3월', 김개발: 93.8, 이프론트: 90.3, 박백엔드: 92.1, 최마케팅: 89.4 }
  ];

  const timeDistributionData = [
    { name: '집중 시간', value: 455, color: '#8884d8' },
    { name: '회의 시간', value: 78, color: '#82ca9d' },
    { name: '코드 리뷰', value: 45, color: '#ffc658' },
    { name: '테스트', value: 67, color: '#ff7300' },
    { name: '문서화', value: 45, color: '#00ff00' }
  ];

  const efficiencyTrendData = [
    { name: '1주', efficiency: 82 },
    { name: '2주', efficiency: 85 },
    { name: '3주', efficiency: 88 },
    { name: '4주', efficiency: 90 }
  ];

  useEffect(() => {
    loadStatisticsData();
  }, []);

  useEffect(() => {
    filterStatistics();
  }, [statistics, searchTerm, departmentFilter, periodFilter]);

  const loadStatisticsData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatistics(sampleData);
    } catch (error) {
      console.error('통계 데이터 로드 오류:', error);
      setError('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const filterStatistics = () => {
    let filtered = statistics;

    if (searchTerm) {
      filtered = filtered.filter(stat =>
        stat.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter(stat => stat.department === departmentFilter);
    }

    if (periodFilter) {
      filtered = filtered.filter(stat => stat.period === periodFilter);
    }

    setFilteredStatistics(filtered);
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'success';
    if (efficiency >= 80) return 'warning';
    return 'error';
  };

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 90) return 'success';
    if (productivity >= 80) return 'warning';
    return 'error';
  };

  const averageEfficiency = statistics.reduce((sum, stat) => sum + stat.efficiency, 0) / statistics.length;
  const averageProductivity = statistics.reduce((sum, stat) => sum + stat.productivity, 0) / statistics.length;
  const totalHours = statistics.reduce((sum, stat) => sum + stat.totalHours, 0);
  const totalTasksCompleted = statistics.reduce((sum, stat) => sum + stat.tasksCompleted, 0);
  const averageAttendance = statistics.reduce((sum, stat) => sum + stat.attendanceRate, 0) / statistics.length;

  const paginatedStatistics = filteredStatistics.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const departments = Array.from(new Set(statistics.map(stat => stat.department)));
  const periods = Array.from(new Set(statistics.map(stat => stat.period)));

  const TabPanel = ({ children, value, index, ...other }: any) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon />
          업무 통계
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadStatisticsData}
            sx={{ borderRadius: 2 }}
          >
            새로고침
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            sx={{ borderRadius: 2 }}
          >
            내보내기
          </Button>
        </Box>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2, 
        mb: 3 
      }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              평균 효율성
            </Typography>
            <Typography variant="h4" color={getEfficiencyColor(averageEfficiency) + '.main'}>
              {averageEfficiency.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              평균 생산성
            </Typography>
            <Typography variant="h4" color={getProductivityColor(averageProductivity) + '.main'}>
              {averageProductivity.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              총 근무 시간
            </Typography>
            <Typography variant="h4">
              {totalHours}h
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              완료된 업무
            </Typography>
            <Typography variant="h4">
              {totalTasksCompleted}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              평균 출근률
            </Typography>
            <Typography variant="h4" color="success.main">
              {averageAttendance.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' },
            gap: 2, 
            alignItems: 'center' 
          }}>
            <TextField
              fullWidth
              placeholder="직원명, 부서, 직책 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>부서</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>기간</InputLabel>
              <Select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {periods.map(period => (
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
              초기화
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 탭 메뉴 */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="개인별 통계" icon={<PersonIcon />} />
            <Tab label="생산성 추이" icon={<TrendingUpIcon />} />
            <Tab label="시간 분포" icon={<PieChartIcon />} />
            <Tab label="효율성 분석" icon={<TimelineIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* 개인별 통계 테이블 */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>직원 정보</TableCell>
                  <TableCell>기간</TableCell>
                  <TableCell>총 근무시간</TableCell>
                  <TableCell>생산적 시간</TableCell>
                  <TableCell>효율성</TableCell>
                  <TableCell>생산성</TableCell>
                  <TableCell>출근률</TableCell>
                  <TableCell>완료 업무</TableCell>
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
                          <Typography variant="subtitle2" fontWeight="bold">
                            {stat.employeeName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {stat.position} • {stat.department}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{stat.period}</TableCell>
                    <TableCell>{stat.totalHours}h</TableCell>
                    <TableCell>{stat.productiveHours}h</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${stat.efficiency.toFixed(1)}%`} 
                        color={getEfficiencyColor(stat.efficiency)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${stat.productivity.toFixed(1)}%`} 
                        color={getProductivityColor(stat.productivity)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{stat.attendanceRate.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {stat.tasksCompleted}/{stat.tasksAssigned}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={Math.ceil(filteredStatistics.length / itemsPerPage)}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* 생산성 추이 차트 */}
          <Typography variant="h6" gutterBottom>월별 생산성 추이</Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="김개발" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="이프론트" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="박백엔드" stroke="#ffc658" strokeWidth={2} />
                <Line type="monotone" dataKey="최마케팅" stroke="#ff7300" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* 시간 분포 파이 차트 */}
          <Typography variant="h6" gutterBottom>시간 분포</Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
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
          {/* 효율성 분석 차트 */}
          <Typography variant="h6" gutterBottom>주간 효율성 추이</Typography>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={efficiencyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="efficiency" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </TabPanel>
      </Card>

      {/* 스낵바 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkStatistics;
