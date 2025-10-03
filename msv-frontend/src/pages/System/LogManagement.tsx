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
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  Grid,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

const LogManagement: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    level: '',
    source: '',
    search: '',
    dateRange: 'today'
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 로그 데이터
  const sampleLogs: LogEntry[] = [
    {
      id: 1,
      timestamp: '2024-01-15 14:30:25',
      level: 'info',
      source: 'auth',
      message: '사용자 로그인 성공',
      userId: 'user123',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      details: { loginMethod: 'password', sessionId: 'sess_abc123' }
    },
    {
      id: 2,
      timestamp: '2024-01-15 14:28:15',
      level: 'warning',
      source: 'database',
      message: '데이터베이스 연결 지연 감지',
      details: { connectionTime: '5.2s', query: 'SELECT * FROM users' }
    },
    {
      id: 3,
      timestamp: '2024-01-15 14:25:42',
      level: 'error',
      source: 'api',
      message: 'API 요청 실패',
      userId: 'user456',
      ipAddress: '192.168.1.101',
      details: { endpoint: '/api/users', statusCode: 500, error: 'Internal Server Error' }
    },
    {
      id: 4,
      timestamp: '2024-01-15 14:20:18',
      level: 'info',
      source: 'system',
      message: '시스템 백업 완료',
      details: { backupSize: '2.5GB', duration: '15분' }
    },
    {
      id: 5,
      timestamp: '2024-01-15 14:15:33',
      level: 'debug',
      source: 'cache',
      message: '캐시 무효화 실행',
      details: { cacheKey: 'user:123:profile', reason: 'TTL 만료' }
    }
  ];

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredLogs = sampleLogs;
      
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      
      if (filters.source) {
        filteredLogs = filteredLogs.filter(log => log.source === filters.source);
      }
      
      if (filters.search) {
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(filters.search.toLowerCase()) ||
          log.source.toLowerCase().includes(filters.search.toLowerCase()) ||
          (log.userId && log.userId.toLowerCase().includes(filters.search.toLowerCase()))
        );
      }
      
      setLogs(filteredLogs);
      setTotalPages(Math.ceil(filteredLogs.length / 10));
    } catch (error) {
      showSnackbar('로그 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleClearLogs = () => {
    if (window.confirm('모든 로그를 삭제하시겠습니까?')) {
      showSnackbar('로그가 삭제되었습니다.', 'success');
      loadLogs();
    }
  };

  const handleExportLogs = () => {
    showSnackbar('로그가 내보내기되었습니다.', 'success');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <ErrorIcon />;
      case 'warning': return <WarningIcon />;
      case 'info': return <InfoIcon />;
      case 'debug': return <BugReportIcon />;
      default: return <InfoIcon />;
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'error': return '오류';
      case 'warning': return '경고';
      case 'info': return '정보';
      case 'debug': return '디버그';
      default: return level;
    }
  };

  const getSourceText = (source: string) => {
    switch (source) {
      case 'auth': return '인증';
      case 'database': return '데이터베이스';
      case 'api': return 'API';
      case 'system': return '시스템';
      case 'cache': return '캐시';
      default: return source;
    }
  };

  const getLogStats = () => {
    const total = logs.length;
    const errors = logs.filter(log => log.level === 'error').length;
    const warnings = logs.filter(log => log.level === 'warning').length;
    const infos = logs.filter(log => log.level === 'info').length;
    return { total, errors, warnings, infos };
  };

  const stats = getLogStats();

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
          <BugReportIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          로그 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          시스템 로그를 모니터링하고 관리하는 페이지입니다.
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    총 로그 수
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {stats.total}
                  </Typography>
                </Box>
                <BugReportIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    오류
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="error.main">
                    {stats.errors}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: '2.5rem', color: 'error.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    경고
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="warning.main">
                    {stats.warnings}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: '2.5rem', color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    정보
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="info.main">
                    {stats.infos}
                  </Typography>
                </Box>
                <InfoIcon sx={{ fontSize: '2.5rem', color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 액션 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="메시지, 소스, 사용자 검색"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>레벨</InputLabel>
                <Select
                  value={filters.level}
                  label="레벨"
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="error">오류</MenuItem>
                  <MenuItem value="warning">경고</MenuItem>
                  <MenuItem value="info">정보</MenuItem>
                  <MenuItem value="debug">디버그</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>소스</InputLabel>
                <Select
                  value={filters.source}
                  label="소스"
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="auth">인증</MenuItem>
                  <MenuItem value="database">데이터베이스</MenuItem>
                  <MenuItem value="api">API</MenuItem>
                  <MenuItem value="system">시스템</MenuItem>
                  <MenuItem value="cache">캐시</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFilters({ level: '', source: '', search: '', dateRange: 'today' })}
                >
                  필터 초기화
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadLogs}
                  disabled={loading}
                >
                  새로고침
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportLogs}
                >
                  내보내기
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearLogs}
                >
                  로그 삭제
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 로그 목록 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>시간</TableCell>
                  <TableCell>레벨</TableCell>
                  <TableCell>소스</TableCell>
                  <TableCell>메시지</TableCell>
                  <TableCell>사용자</TableCell>
                  <TableCell>IP 주소</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {log.timestamp}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getLevelIcon(log.level)}
                        label={getLevelText(log.level)}
                        color={getLevelColor(log.level)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getSourceText(log.source)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.userId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.ipAddress || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="상세 정보">
                        <IconButton size="small">
                          <ExpandMoreIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 페이지네이션 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

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

export default LogManagement;