import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const AttendanceManagement: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState([
    {
      id: 1,
      employee: '홍길동',
      department: '개발팀',
      date: '2024-01-15',
      checkIn: '09:00',
      checkOut: '18:00',
      workHours: 9,
      status: 'normal'
    },
    {
      id: 2,
      employee: '김철수',
      department: '마케팅팀',
      date: '2024-01-15',
      checkIn: '09:15',
      checkOut: '18:30',
      workHours: 9.25,
      status: 'overtime'
    },
    {
      id: 3,
      employee: '이영희',
      department: '영업팀',
      date: '2024-01-15',
      checkIn: '08:45',
      checkOut: '17:45',
      workHours: 9,
      status: 'early'
    }
  ]);

  const [filter, setFilter] = useState({
    department: 'all',
    status: 'all',
    date: ''
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return '정상';
      case 'late': return '지각';
      case 'early': return '조기퇴근';
      case 'overtime': return '야근';
      case 'absent': return '결근';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'success';
      case 'late': return 'warning';
      case 'early': return 'info';
      case 'overtime': return 'secondary';
      case 'absent': return 'error';
      default: return 'default';
    }
  };

  const handleCheckIn = (employeeId: number) => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    
    setAttendanceData(attendanceData.map(attendance => 
      attendance.id === employeeId 
        ? { ...attendance, checkIn: timeString, status: 'normal' }
        : attendance
    ));
  };

  const handleCheckOut = (employeeId: number) => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    
    setAttendanceData(attendanceData.map(attendance => 
      attendance.id === employeeId 
        ? { ...attendance, checkOut: timeString }
        : attendance
    ));
  };

  const filteredData = attendanceData.filter(attendance => {
    if (filter.department !== 'all' && attendance.department !== filter.department) return false;
    if (filter.status !== 'all' && attendance.status !== filter.status) return false;
    if (filter.date && attendance.date !== filter.date) return false;
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ScheduleIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          근태 관리
        </Typography>
      </Box>

      <Box>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">근태 현황</Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  size="small"
                >
                  새로고침
                </Button>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>부서</InputLabel>
                  <Select
                    value={filter.department}
                    onChange={(e) => setFilter({...filter, department: e.target.value})}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="개발팀">개발팀</MenuItem>
                    <MenuItem value="마케팅팀">마케팅팀</MenuItem>
                    <MenuItem value="영업팀">영업팀</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={filter.status}
                    onChange={(e) => setFilter({...filter, status: e.target.value})}
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="normal">정상</MenuItem>
                    <MenuItem value="late">지각</MenuItem>
                    <MenuItem value="early">조기퇴근</MenuItem>
                    <MenuItem value="overtime">야근</MenuItem>
                    <MenuItem value="absent">결근</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  type="date"
                  label="날짜"
                  value={filter.date}
                  onChange={(e) => setFilter({...filter, date: e.target.value})}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <Box sx={{ display: 'flex', gap: 1, height: '100%', alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<CheckInIcon />}
                    size="small"
                  >
                    출근
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckOutIcon />}
                    size="small"
                  >
                    퇴근
                  </Button>
                </Box>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>직원명</TableCell>
                      <TableCell>부서</TableCell>
                      <TableCell>날짜</TableCell>
                      <TableCell>출근시간</TableCell>
                      <TableCell>퇴근시간</TableCell>
                      <TableCell>근무시간</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.map((attendance) => (
                      <TableRow key={attendance.id}>
                        <TableCell>{attendance.employee}</TableCell>
                        <TableCell>{attendance.department}</TableCell>
                        <TableCell>{attendance.date}</TableCell>
                        <TableCell>
                          {attendance.checkIn || '-'}
                        </TableCell>
                        <TableCell>
                          {attendance.checkOut || '-'}
                        </TableCell>
                        <TableCell>
                          {attendance.workHours}시간
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(attendance.status)}
                            color={getStatusColor(attendance.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleCheckIn(attendance.id)}
                            disabled={!!attendance.checkIn}
                          >
                            <CheckInIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleCheckOut(attendance.id)}
                            disabled={!!attendance.checkOut}
                          >
                            <CheckOutIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default AttendanceManagement;
