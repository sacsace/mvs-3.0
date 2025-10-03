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
  LinearProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Backup as BackupIcon,
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface BackupJob {
  id: number;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  schedule: string;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'inactive' | 'running' | 'failed';
  size?: string;
  location: string;
  retention: number;
  description: string;
}

interface BackupFile {
  id: number;
  name: string;
  type: 'database' | 'files' | 'system';
  size: string;
  createdDate: string;
  status: 'completed' | 'failed' | 'in_progress';
  location: string;
}

const BackupManagement: React.FC = () => {
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<BackupJob | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'full',
    schedule: 'daily',
    location: '/backups',
    retention: 30,
    description: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 샘플 백업 작업 데이터
  const sampleJobs: BackupJob[] = [
    {
      id: 1,
      name: '일일 데이터베이스 백업',
      type: 'full',
      schedule: 'daily',
      lastRun: '2024-01-15 02:00:00',
      nextRun: '2024-01-16 02:00:00',
      status: 'active',
      size: '2.5GB',
      location: '/backups/database',
      retention: 30,
      description: '전체 데이터베이스 백업'
    },
    {
      id: 2,
      name: '주간 파일 백업',
      type: 'incremental',
      schedule: 'weekly',
      lastRun: '2024-01-14 03:00:00',
      nextRun: '2024-01-21 03:00:00',
      status: 'active',
      size: '850MB',
      location: '/backups/files',
      retention: 12,
      description: '사용자 파일 및 문서 백업'
    },
    {
      id: 3,
      name: '월간 시스템 백업',
      type: 'full',
      schedule: 'monthly',
      lastRun: '2024-01-01 01:00:00',
      nextRun: '2024-02-01 01:00:00',
      status: 'active',
      size: '5.2GB',
      location: '/backups/system',
      retention: 6,
      description: '전체 시스템 백업'
    }
  ];

  // 샘플 백업 파일 데이터
  const sampleFiles: BackupFile[] = [
    {
      id: 1,
      name: 'db_backup_20240115_020000.sql',
      type: 'database',
      size: '2.5GB',
      createdDate: '2024-01-15 02:00:00',
      status: 'completed',
      location: '/backups/database'
    },
    {
      id: 2,
      name: 'files_backup_20240114_030000.tar.gz',
      type: 'files',
      size: '850MB',
      createdDate: '2024-01-14 03:00:00',
      status: 'completed',
      location: '/backups/files'
    },
    {
      id: 3,
      name: 'system_backup_20240101_010000.img',
      type: 'system',
      size: '5.2GB',
      createdDate: '2024-01-01 01:00:00',
      status: 'completed',
      location: '/backups/system'
    }
  ];

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBackupJobs(sampleJobs);
      setBackupFiles(sampleFiles);
    } catch (error) {
      showSnackbar('백업 데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateJob = () => {
    setSelectedJob(null);
    setFormData({
      name: '',
      type: 'full',
      schedule: 'daily',
      location: '/backups',
      retention: 30,
      description: ''
    });
    setOpenDialog(true);
  };

  const handleEditJob = (job: BackupJob) => {
    setSelectedJob(job);
    setFormData({
      name: job.name,
      type: job.type,
      schedule: job.schedule,
      location: job.location,
      retention: job.retention,
      description: job.description
    });
    setOpenDialog(true);
  };

  const handleSaveJob = () => {
    showSnackbar('백업 작업이 저장되었습니다.', 'success');
    setOpenDialog(false);
    loadBackupData();
  };

  const handleDeleteJob = (id: number) => {
    if (window.confirm('이 백업 작업을 삭제하시겠습니까?')) {
      showSnackbar('백업 작업이 삭제되었습니다.', 'success');
      loadBackupData();
    }
  };

  const handleRunJob = (id: number) => {
    showSnackbar('백업 작업이 시작되었습니다.', 'success');
    loadBackupData();
  };

  const handleStopJob = (id: number) => {
    showSnackbar('백업 작업이 중지되었습니다.', 'success');
    loadBackupData();
  };

  const handleDownloadBackup = (file: BackupFile) => {
    showSnackbar('백업 파일 다운로드가 시작되었습니다.', 'success');
  };

  const handleDeleteBackup = (id: number) => {
    if (window.confirm('이 백업 파일을 삭제하시겠습니까?')) {
      showSnackbar('백업 파일이 삭제되었습니다.', 'success');
      loadBackupData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'running': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'running': return '실행중';
      case 'failed': return '실패';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'full': return '전체';
      case 'incremental': return '증분';
      case 'differential': return '차등';
      default: return type;
    }
  };

  const getScheduleText = (schedule: string) => {
    switch (schedule) {
      case 'daily': return '매일';
      case 'weekly': return '매주';
      case 'monthly': return '매월';
      default: return schedule;
    }
  };

  const getFileTypeText = (type: string) => {
    switch (type) {
      case 'database': return '데이터베이스';
      case 'files': return '파일';
      case 'system': return '시스템';
      default: return type;
    }
  };

  const getFileStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  };

  const getFileStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'failed': return '실패';
      case 'in_progress': return '진행중';
      default: return status;
    }
  };

  const getTotalStorageUsed = () => {
    return backupFiles.reduce((total, file) => {
      const size = parseFloat(file.size.replace(/[^\d.]/g, ''));
      const unit = file.size.replace(/[\d.]/g, '');
      let multiplier = 1;
      if (unit.includes('GB')) multiplier = 1024;
      if (unit.includes('TB')) multiplier = 1024 * 1024;
      return total + (size * multiplier);
    }, 0);
  };

  const formatStorageSize = (sizeInMB: number) => {
    if (sizeInMB >= 1024 * 1024) {
      return `${(sizeInMB / (1024 * 1024)).toFixed(1)}TB`;
    } else if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)}GB`;
    } else {
      return `${sizeInMB.toFixed(1)}MB`;
    }
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
          <BackupIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
        백업 관리
      </Typography>
        <Typography variant="body2" color="text.secondary">
          시스템 백업을 설정하고 관리하는 페이지입니다.
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    활성 작업
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {backupJobs.filter(job => job.status === 'active').length}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    백업 파일
                  </Typography>
                  <Typography variant="h4" fontWeight={600}>
                    {backupFiles.length}
                  </Typography>
                </Box>
                <StorageIcon sx={{ fontSize: '2.5rem', color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    사용된 저장공간
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="info.main">
                    {formatStorageSize(getTotalStorageUsed())}
                  </Typography>
                </Box>
                <StorageIcon sx={{ fontSize: '2.5rem', color: 'info.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="subtitle2">
                    성공률
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="success.main">
                    {backupFiles.length > 0 ? Math.round((backupFiles.filter(f => f.status === 'completed').length / backupFiles.length) * 100) : 0}%
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: '2.5rem', color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 백업 작업 관리 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              백업 작업
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateJob}
            >
              새 백업 작업
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>작업명</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>스케줄</TableCell>
                  <TableCell>마지막 실행</TableCell>
                  <TableCell>다음 실행</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>크기</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backupJobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {job.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {job.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getTypeText(job.type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getScheduleText(job.schedule)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {job.lastRun ? new Date(job.lastRun).toLocaleString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {job.nextRun ? new Date(job.nextRun).toLocaleString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(job.status)}
                        color={getStatusColor(job.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {job.size || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {job.status === 'running' ? (
                          <Tooltip title="중지">
                            <IconButton size="small" onClick={() => handleStopJob(job.id)}>
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="실행">
                            <IconButton size="small" onClick={() => handleRunJob(job.id)}>
                              <PlayArrowIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="수정">
                          <IconButton size="small" onClick={() => handleEditJob(job)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDeleteJob(job.id)}>
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

      {/* 백업 파일 목록 */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            백업 파일
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>파일명</TableCell>
                  <TableCell>유형</TableCell>
                  <TableCell>크기</TableCell>
                  <TableCell>생성일</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>위치</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backupFiles.map((file) => (
                  <TableRow key={file.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {file.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getFileTypeText(file.type)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {file.size}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(file.createdDate).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getFileStatusText(file.status)}
                        color={getFileStatusColor(file.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {file.location}
        </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="다운로드">
                          <IconButton size="small" onClick={() => handleDownloadBackup(file)}>
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton size="small" onClick={() => handleDeleteBackup(file.id)}>
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

      {/* 백업 작업 생성/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedJob ? '백업 작업 수정' : '새 백업 작업 생성'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="작업명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>백업 유형</InputLabel>
                <Select
                  value={formData.type}
                  label="백업 유형"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="full">전체 백업</MenuItem>
                  <MenuItem value="incremental">증분 백업</MenuItem>
                  <MenuItem value="differential">차등 백업</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>스케줄</InputLabel>
                <Select
                  value={formData.schedule}
                  label="스케줄"
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                >
                  <MenuItem value="daily">매일</MenuItem>
                  <MenuItem value="weekly">매주</MenuItem>
                  <MenuItem value="monthly">매월</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="저장 위치"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="보존 기간 (일)"
                type="number"
                value={formData.retention}
                onChange={(e) => setFormData({ ...formData, retention: Number(e.target.value) })}
                required
              />
            </Box>
            <TextField
              fullWidth
              label="설명"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSaveJob}>
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

export default BackupManagement;
