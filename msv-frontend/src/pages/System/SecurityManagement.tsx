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
  Grid,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Security as SecurityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  Shield as ShieldIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface SecurityPolicy {
  id: number;
  name: string;
  type: 'password' | 'access' | 'network' | 'data';
  status: 'active' | 'inactive';
  description: string;
  lastModified: string;
  severity: 'high' | 'medium' | 'low';
}

interface SecurityEvent {
  id: number;
  timestamp: string;
  type: 'login' | 'logout' | 'failed_login' | 'access_denied' | 'data_breach';
  source: string;
  user?: string;
  ipAddress?: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  status: 'resolved' | 'pending' | 'investigating';
}

interface UserSession {
  id: number;
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  lastActivity: string;
  status: 'active' | 'idle' | 'expired';
}

const SecurityManagement: React.FC = () => {
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<SecurityPolicy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'password',
    status: 'active',
    description: '',
    severity: 'medium'
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 보안 정책 데이터
  const samplePolicies: SecurityPolicy[] = [
    {
      id: 1,
      name: '비밀번호 정책',
      type: 'password',
      status: 'active',
      description: '최소 8자 이상, 대소문자, 숫자, 특수문자 포함',
      lastModified: '2024-01-10',
      severity: 'high'
    },
    {
      id: 2,
      name: '2단계 인증',
      type: 'access',
      status: 'active',
      description: '모든 관리자 계정에 2단계 인증 의무화',
      lastModified: '2024-01-08',
      severity: 'high'
    },
    {
      id: 3,
      name: '네트워크 접근 제한',
      type: 'network',
      status: 'active',
      description: '특정 IP 대역에서만 관리자 접근 허용',
      lastModified: '2024-01-05',
      severity: 'medium'
    },
    {
      id: 4,
      name: '데이터 암호화',
      type: 'data',
      status: 'active',
      description: '민감한 데이터 저장 시 AES-256 암호화',
      lastModified: '2024-01-03',
      severity: 'high'
    }
  ];

  // 샘플 보안 이벤트 데이터
  const sampleEvents: SecurityEvent[] = [
    {
      id: 1,
      timestamp: '2024-01-15 14:30:25',
      type: 'failed_login',
      source: 'web',
      user: 'admin',
      ipAddress: '192.168.1.100',
      description: '잘못된 비밀번호로 로그인 시도',
      severity: 'medium',
      status: 'resolved'
    },
    {
      id: 2,
      timestamp: '2024-01-15 14:25:15',
      type: 'access_denied',
      source: 'api',
      user: 'user123',
      ipAddress: '192.168.1.101',
      description: '권한이 없는 리소스에 접근 시도',
      severity: 'low',
      status: 'resolved'
    },
    {
      id: 3,
      timestamp: '2024-01-15 14:20:42',
      type: 'login',
      source: 'web',
      user: 'manager',
      ipAddress: '192.168.1.102',
      description: '정상적인 로그인',
      severity: 'low',
      status: 'resolved'
    }
  ];

  // 샘플 사용자 세션 데이터
  const sampleSessions: UserSession[] = [
    {
      id: 1,
      userId: 'user001',
      userName: '김철수',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      loginTime: '2024-01-15 09:00:00',
      lastActivity: '2024-01-15 14:30:00',
      status: 'active'
    },
    {
      id: 2,
      userId: 'user002',
      userName: '이영희',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      loginTime: '2024-01-15 10:15:00',
      lastActivity: '2024-01-15 14:25:00',
      status: 'idle'
    },
    {
      id: 3,
      userId: 'user003',
      userName: '박민수',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      loginTime: '2024-01-15 11:30:00',
      lastActivity: '2024-01-15 13:45:00',
      status: 'expired'
    }
  ];

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPolicies(samplePolicies);
      setEvents(sampleEvents);
      setSessions(sampleSessions);
    } catch (error) {
      showSnackbar('보안 데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreatePolicy = () => {
    setSelectedPolicy(null);
    setFormData({
      name: '',
      type: 'password',
      status: 'active',
      description: '',
      severity: 'medium'
    });
    setOpenDialog(true);
  };

  const handleEditPolicy = (policy: SecurityPolicy) => {
    setSelectedPolicy(policy);
    setFormData({
      name: policy.name,
      type: policy.type,
      status: policy.status,
      description: policy.description,
      severity: policy.severity
    });
    setOpenDialog(true);
  };

  const handleSavePolicy = () => {
    showSnackbar('보안 정책이 저장되었습니다.', 'success');
    setOpenDialog(false);
    loadSecurityData();
  };

  const handleDeletePolicy = (id: number) => {
    if (window.confirm('이 보안 정책을 삭제하시겠습니까?')) {
      showSnackbar('보안 정책이 삭제되었습니다.', 'success');
      loadSecurityData();
    }
  };

  const handleTerminateSession = (id: number) => {
    if (window.confirm('이 세션을 종료하시겠습니까?')) {
      showSnackbar('세션이 종료되었습니다.', 'success');
      loadSecurityData();
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'password': return '비밀번호';
      case 'access': return '접근';
      case 'network': return '네트워크';
      case 'data': return '데이터';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'password': return <LockIcon />;
      case 'access': return <VpnKeyIcon />;
      case 'network': return <ComputerIcon />;
      case 'data': return <ShieldIcon />;
      default: return <SecurityIcon />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return severity;
    }
  };

  const getEventTypeText = (type: string) => {
    switch (type) {
      case 'login': return '로그인';
      case 'logout': return '로그아웃';
      case 'failed_login': return '로그인 실패';
      case 'access_denied': return '접근 거부';
      case 'data_breach': return '데이터 유출';
      default: return type;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return <CheckCircleIcon />;
      case 'logout': return <PersonIcon />;
      case 'failed_login': return <ErrorIcon />;
      case 'access_denied': return <BlockIcon />;
      case 'data_breach': return <WarningIcon />;
      default: return <SecurityIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'idle': return 'warning';
      case 'expired': return 'error';
      case 'resolved': return 'success';
      case 'pending': return 'warning';
      case 'investigating': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'idle': return '유휴';
      case 'expired': return '만료';
      case 'resolved': return '해결됨';
      case 'pending': return '대기중';
      case 'investigating': return '조사중';
      default: return status;
    }
  };

  const getSecurityScore = () => {
    const activePolicies = policies.filter(p => p.status === 'active').length;
    const totalPolicies = policies.length;
    const recentEvents = events.filter(e => {
      const eventDate = new Date(e.timestamp);
      const now = new Date();
      return (now.getTime() - eventDate.getTime()) < 24 * 60 * 60 * 1000; // 24시간 이내
    }).length;
    
    let score = 0;
    if (totalPolicies > 0) {
      score += (activePolicies / totalPolicies) * 50;
    }
    if (recentEvents === 0) {
      score += 50;
    } else {
      score += Math.max(0, 50 - (recentEvents * 10));
    }
    
    return Math.round(score);
  };

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
          <SecurityIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          보안 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          시스템 보안 정책과 이벤트를 관리하는 페이지입니다.
        </Typography>
      </Box>

      {/* 보안 점수 및 통계 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    보안 점수
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color={getSecurityScore() >= 80 ? 'success.main' : getSecurityScore() >= 60 ? 'warning.main' : 'error.main'}>
                    {getSecurityScore()}/100
                  </Typography>
                </Box>
                <ShieldIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.7 }} />
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
                    활성 정책
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {policies.filter(p => p.status === 'active').length}
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: '2.5rem', color: 'success.main', opacity: 0.7 }} />
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
                    활성 세션
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="info.main">
                    {sessions.filter(s => s.status === 'active').length}
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: '2.5rem', color: 'info.main', opacity: 0.7 }} />
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
                    최근 이벤트
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="warning.main">
                    {events.filter(e => {
                      const eventDate = new Date(e.timestamp);
                      const now = new Date();
                      return (now.getTime() - eventDate.getTime()) < 24 * 60 * 60 * 1000;
                    }).length}
                  </Typography>
                </Box>
                <WarningIcon sx={{ fontSize: '2.5rem', color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 보안 정책 관리 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              보안 정책
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePolicy}
            >
              새 정책 추가
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>정책명</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>심각도</TableCell>
                  <TableCell>설명</TableCell>
                  <TableCell>마지막 수정</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getTypeIcon(policy.type)}
                        <Typography variant="body2" fontWeight={500} sx={{ ml: 1 }}>
                          {policy.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getTypeText(policy.type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(policy.status)}
                        color={getStatusColor(policy.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getSeverityText(policy.severity)}
                        color={getSeverityColor(policy.severity)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {policy.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(policy.lastModified).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleEditPolicy(policy)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDeletePolicy(policy.id)}>
                            <DeleteIcon />
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

      {/* 보안 이벤트 및 세션 관리 */}
      <Grid container spacing={3}>
        {/* 보안 이벤트 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                최근 보안 이벤트
              </Typography>
              <List>
                {events.slice(0, 5).map((event) => (
                  <ListItem key={event.id} divider>
                    <ListItemIcon>
                      {getEventTypeIcon(event.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={500}>
                            {getEventTypeText(event.type)}
                          </Typography>
                          <Chip
                            label={getSeverityText(event.severity)}
                            color={getSeverityColor(event.severity)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {event.timestamp} | {event.source}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {event.description}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 활성 세션 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                활성 세션
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>사용자</TableCell>
                      <TableCell>IP 주소</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>마지막 활동</TableCell>
                      <TableCell align="center">작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {session.userName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {session.ipAddress}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusText(session.status)}
                            color={getStatusColor(session.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(session.lastActivity).toLocaleTimeString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="세션 종료">
                            <IconButton size="small" onClick={() => handleTerminateSession(session.id)}>
                              <BlockIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 보안 정책 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPolicy ? '보안 정책 수정' : '새 보안 정책 생성'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="정책명"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>정책 유형</InputLabel>
                <Select
                  value={formData.type}
                  label="정책 유형"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="password">비밀번호</MenuItem>
                  <MenuItem value="access">접근</MenuItem>
                  <MenuItem value="network">네트워크</MenuItem>
                  <MenuItem value="data">데이터</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>심각도</InputLabel>
                <Select
                  value={formData.severity}
                  label="심각도"
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'inactive' })}
                  />
                }
                label="정책 활성화"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="설명"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSavePolicy}>
            저장
          </Button>
        </DialogActions>
      </Dialog>

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

export default SecurityManagement;
