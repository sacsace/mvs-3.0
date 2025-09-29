import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  Divider,
  Grid,
  Tooltip,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  LocalHospital as SickIcon,
  School as StudyIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface VacationRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  avatar?: string;
  vacationType: 'annual' | 'sick' | 'personal' | 'study' | 'maternity' | 'paternity';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  attachments?: string[];
}

const VacationManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    vacationType: 'annual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([
    {
      id: 1,
      employeeId: 1001,
      employeeName: '김철수',
      department: '개발팀',
      position: '대리',
      vacationType: 'annual',
      startDate: '2024-01-15',
      endDate: '2024-01-19',
      days: 5,
      reason: '가족 여행',
      status: 'pending',
      appliedDate: '2024-01-10',
      attachments: ['여행계획서.pdf']
    },
    {
      id: 2,
      employeeId: 1002,
      employeeName: '이영희',
      department: '마케팅팀',
      position: '팀장',
      vacationType: 'sick',
      startDate: '2024-01-12',
      endDate: '2024-01-12',
      days: 1,
      reason: '감기로 인한 휴가',
      status: 'approved',
      appliedDate: '2024-01-11',
      approvedBy: '박부장',
      approvedDate: '2024-01-11'
    },
    {
      id: 3,
      employeeId: 1003,
      employeeName: '박민수',
      department: '영업팀',
      position: '과장',
      vacationType: 'study',
      startDate: '2024-01-20',
      endDate: '2024-01-22',
      days: 3,
      reason: '자격증 시험 준비',
      status: 'rejected',
      appliedDate: '2024-01-15',
      rejectionReason: '업무 일정상 불가'
    },
    {
      id: 4,
      employeeId: 1004,
      employeeName: '최지영',
      department: '인사팀',
      position: '대리',
      vacationType: 'maternity',
      startDate: '2024-02-01',
      endDate: '2024-05-31',
      days: 90,
      reason: '출산 휴가',
      status: 'approved',
      appliedDate: '2024-01-20',
      approvedBy: '김부장',
      approvedDate: '2024-01-21'
    }
  ]);

  const vacationTypes = [
    { key: 'annual', name: '연차', icon: <HomeIcon />, color: 'primary' },
    { key: 'sick', name: '병가', icon: <SickIcon />, color: 'error' },
    { key: 'personal', name: '개인사유', icon: <PersonIcon />, color: 'default' },
    { key: 'study', name: '교육', icon: <StudyIcon />, color: 'info' },
    { key: 'maternity', name: '출산', icon: <EventIcon />, color: 'success' },
    { key: 'paternity', name: '육아', icon: <WorkIcon />, color: 'warning' }
  ];

  const getStatusChip = (status: string) => {
    const statusConfig = {
      pending: { label: '대기', color: 'warning' as const },
      approved: { label: '승인', color: 'success' as const },
      rejected: { label: '거부', color: 'error' as const },
      cancelled: { label: '취소', color: 'default' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getTypeChip = (type: string) => {
    const typeConfig = vacationTypes.find(t => t.key === type);
    return (
      <Chip
        icon={typeConfig?.icon}
        label={typeConfig?.name}
        color={typeConfig?.color as any}
        size="small"
        variant="outlined"
      />
    );
  };

  const handleAdd = () => {
    setSelectedRequest(null);
    setFormData({
      employeeId: '',
      vacationType: 'annual',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (request: VacationRequest) => {
    setSelectedRequest(request);
    setFormData({
      employeeId: request.employeeId.toString(),
      vacationType: request.vacationType,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason
    });
    setOpenDialog(true);
  };

  const handleApprove = (id: number) => {
    setVacationRequests(requests =>
      requests.map(req =>
        req.id === id
          ? { ...req, status: 'approved' as const, approvedBy: '관리자', approvedDate: new Date().toISOString().split('T')[0] }
          : req
      )
    );
  };

  const handleReject = (id: number) => {
    setVacationRequests(requests =>
      requests.map(req =>
        req.id === id
          ? { ...req, status: 'rejected' as const, rejectionReason: '업무 일정상 불가' }
          : req
      )
    );
  };

  const filteredRequests = vacationRequests.filter(request => {
    const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          request.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.vacationType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1 }} />
                휴가 신청 목록 ({filteredRequests.length}건)
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>직원</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>휴가 유형</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>기간</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>일수</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>사유</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>신청일</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                              {request.employeeName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {request.employeeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {request.department} • {request.position}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {getTypeChip(request.vacationType)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {request.startDate} ~ {request.endDate}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={`${request.days}일`} color="info" size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {request.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(request.status)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {request.appliedDate}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="상세보기">
                              <IconButton size="small" onClick={() => handleEdit(request)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {request.status === 'pending' && (
                              <>
                                <Tooltip title="승인">
                                  <IconButton size="small" onClick={() => handleApprove(request.id)} color="success">
                                    <ApproveIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="거부">
                                  <IconButton size="small" onClick={() => handleReject(request.id)} color="error">
                                    <RejectIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      case 1:
        return (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
            gap: 3 
          }}>
            {vacationTypes.map((type) => {
              const typeRequests = vacationRequests.filter(req => req.vacationType === type.key);
              const pendingCount = typeRequests.filter(req => req.status === 'pending').length;
              const approvedCount = typeRequests.filter(req => req.status === 'approved').length;
              const totalDays = typeRequests.reduce((sum, req) => sum + req.days, 0);
              
              return (
                <Card key={type.key}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: 1, 
                        bgcolor: `${type.color}.light`, 
                        color: `${type.color}.main`,
                        mr: 2
                      }}>
                        {type.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {type.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">총 신청</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {typeRequests.length}건
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">대기중</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                        {pendingCount}건
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">승인</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {approvedCount}건
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">총 일수</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {totalDays}일
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      px: 2,
      py: 3
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CalendarIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          휴가 관리
        </Typography>
      </Box>

      {/* 탭 메뉴 */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<ScheduleIcon />} 
            label="휴가 신청 관리" 
            iconPosition="start"
          />
          <Tab 
            icon={<WorkIcon />} 
            label="휴가 유형별 현황" 
            iconPosition="start"
          />
        </Tabs>
      </Card>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="직원명, 부서, 사유로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="pending">대기</MenuItem>
                <MenuItem value="approved">승인</MenuItem>
                <MenuItem value="rejected">거부</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>휴가 유형</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">전체 유형</MenuItem>
                {vacationTypes.map(type => (
                  <MenuItem key={type.key} value={type.key}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{ mr: 1 }}
            >
              내보내기
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
            >
              휴가 신청
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 탭 콘텐츠 */}
      {getTabContent()}

      {/* 휴가 신청/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRequest ? '휴가 신청 수정' : '새 휴가 신청'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="직원 ID"
                value={formData.employeeId}
                onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>휴가 유형</InputLabel>
                <Select
                  value={formData.vacationType}
                  onChange={(e) => setFormData({...formData, vacationType: e.target.value as any})}
                >
                  {vacationTypes.map(type => (
                    <MenuItem key={type.key} value={type.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1 }}>{type.icon}</Box>
                        {type.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="시작일"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                label="종료일"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
            <TextField
              fullWidth
              label="휴가 사유"
              multiline
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={() => setOpenDialog(false)} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VacationManagement;
