import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Monitor as MonitorIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Computer as ComputerIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  lastCheck: string;
  responseTime: number;
}

const Monitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState('30');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 시스템 메트릭 데이터
  const sampleMetrics: SystemMetric[] = [
    {
      name: 'CPU 사용률',
      value: 45,
      unit: '%',
      status: 'good',
      trend: 'stable'
    },
    {
      name: '메모리 사용률',
      value: 68,
      unit: '%',
      status: 'warning',
      trend: 'up'
    },
    {
      name: '디스크 사용률',
      value: 82,
      unit: '%',
      status: 'warning',
      trend: 'up'
    },
    {
      name: '네트워크 사용률',
      value: 23,
      unit: '%',
      status: 'good',
      trend: 'down'
    }
  ];

  // 샘플 서비스 상태 데이터
  const sampleServices: ServiceStatus[] = [
    {
      name: '웹 서버',
      status: 'running',
      uptime: '15일 3시간 42분',
      lastCheck: '2024-01-15 14:30:00',
      responseTime: 120
    },
    {
      name: '데이터베이스',
      status: 'running',
      uptime: '15일 3시간 42분',
      lastCheck: '2024-01-15 14:30:00',
      responseTime: 85
    },
    {
      name: 'Redis 캐시',
      status: 'running',
      uptime: '15일 3시간 42분',
      lastCheck: '2024-01-15 14:30:00',
      responseTime: 15
    },
    {
      name: '백업 서비스',
      status: 'stopped',
      uptime: '0일 0시간 0분',
      lastCheck: '2024-01-15 14:30:00',
      responseTime: 0
    }
  ];

  // 샘플 차트 데이터
  const cpuData = [
    { time: '00:00', cpu: 35 },
    { time: '04:00', cpu: 28 },
    { time: '08:00', cpu: 45 },
    { time: '12:00', cpu: 52 },
    { time: '16:00', cpu: 48 },
    { time: '20:00', cpu: 41 }
  ];

  const memoryData = [
    { time: '00:00', memory: 60 },
    { time: '04:00', memory: 58 },
    { time: '08:00', memory: 65 },
    { time: '12:00', memory: 68 },
    { time: '16:00', memory: 70 },
    { time: '20:00', memory: 66 }
  ];

  const networkData = [
    { time: '00:00', inbound: 120, outbound: 80 },
    { time: '04:00', inbound: 95, outbound: 65 },
    { time: '08:00', inbound: 180, outbound: 120 },
    { time: '12:00', inbound: 220, outbound: 150 },
    { time: '16:00', inbound: 200, outbound: 140 },
    { time: '20:00', inbound: 160, outbound: 110 }
  ];

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, parseInt(refreshInterval) * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMetrics(sampleMetrics);
      setServices(sampleServices);
    } catch (error) {
      showSnackbar('모니터링 데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good': return '양호';
      case 'warning': return '주의';
      case 'critical': return '위험';
      case 'running': return '실행중';
      case 'stopped': return '중지됨';
      case 'error': return '오류';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
      case 'running':
        return <CheckCircleIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'critical':
      case 'error':
        return <ErrorIcon />;
      case 'stopped':
        return <ComputerIcon />;
      default:
        return <MonitorIcon />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUpIcon />;
      case 'down': return <TrendingDownIcon />;
      case 'stable': return <SpeedIcon />;
      default: return <SpeedIcon />;
    }
  };

  const getProgressColor = (value: number, status: string) => {
    if (status === 'critical') return 'error';
    if (status === 'warning') return 'warning';
    return 'primary';
  };

  const getOverallHealth = () => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    const stoppedServices = services.filter(s => s.status === 'stopped').length;
    
    if (criticalCount > 0 || stoppedServices > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'good';
  };

  const overallHealth = getOverallHealth();

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          fontWeight: 600,
          color: 'text.primary'
        }}>
          <MonitorIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          시스템 모니터링
          <Chip
            icon={getStatusIcon(overallHealth)}
            label={getStatusText(overallHealth)}
            color={getStatusColor(overallHealth)}
            size="small"
            sx={{ ml: 2 }}
          />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          시스템 성능과 서비스 상태를 실시간으로 모니터링하는 페이지입니다.
        </Typography>
      </Box>

      {/* 새로고침 설정 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>새로고침 간격</InputLabel>
              <Select
                value={refreshInterval}
                label="새로고침 간격"
                onChange={(e) => setRefreshInterval(e.target.value)}
              >
                <MenuItem value="10">10초</MenuItem>
                <MenuItem value="30">30초</MenuItem>
                <MenuItem value="60">1분</MenuItem>
                <MenuItem value="300">5분</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadMonitoringData}
              disabled={loading}
            >
              수동 새로고침
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 시스템 메트릭 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Grid size={{ xs: 12, md: 3 }} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography color="text.secondary" variant="subtitle2">
                    {metric.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getTrendIcon(metric.trend)}
                    <Chip
                      icon={getStatusIcon(metric.status)}
                      label={getStatusText(metric.status)}
                      color={getStatusColor(metric.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </Box>
                <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
                  {metric.value}{metric.unit}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metric.value}
                  color={getProgressColor(metric.value, metric.status)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 성능 차트 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* CPU 사용률 차트 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                CPU 사용률
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cpuData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="cpu" stroke="#1976d2" fill="#1976d2" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 메모리 사용률 차트 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                메모리 사용률
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={memoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="memory" stroke="#ed6c02" fill="#ed6c02" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 네트워크 사용률 차트 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                네트워크 사용률
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={networkData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="inbound" fill="#2e7d32" name="인바운드" />
                  <Bar dataKey="outbound" fill="#1976d2" name="아웃바운드" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 서비스 상태 */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            서비스 상태
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>서비스명</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>가동시간</TableCell>
                  <TableCell>응답시간</TableCell>
                  <TableCell>마지막 확인</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CloudIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" fontWeight={500}>
                          {service.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(service.status)}
                        label={getStatusText(service.status)}
                        color={getStatusColor(service.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.uptime}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.responseTime}ms
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(service.lastCheck).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="서비스 재시작">
                          <IconButton size="small">
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="로그 보기">
                          <IconButton size="small">
                            <MonitorIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 알림 */}
      {overallHealth === 'critical' && (
        <Alert severity="error" sx={{ mt: 3 }}>
          시스템에 심각한 문제가 감지되었습니다. 즉시 확인이 필요합니다.
        </Alert>
      )}

      {overallHealth === 'warning' && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          시스템에 주의가 필요한 상태가 감지되었습니다.
        </Alert>
      )}

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Monitoring;
