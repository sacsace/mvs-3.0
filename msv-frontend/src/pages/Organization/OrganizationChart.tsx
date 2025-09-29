import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as AccountTreeIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

interface Department {
  id: number;
  name: string;
  manager: string;
  employeeCount: number;
  parentId: number | null;
  status: 'active' | 'inactive';
  budget: number;
  location: string;
  notes?: string;
}

const OrganizationChart: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([
    { id: 1, name: '경영진', manager: '김대표', employeeCount: 3, parentId: null, status: 'active', budget: 500000000, location: '본사 10층', notes: '최고 경영진' },
    { id: 2, name: '개발팀', manager: '이개발', employeeCount: 15, parentId: 1, status: 'active', budget: 200000000, location: '본사 8층', notes: '소프트웨어 개발' },
    { id: 3, name: '프론트엔드팀', manager: '박프론트', employeeCount: 8, parentId: 2, status: 'active', budget: 100000000, location: '본사 8층', notes: '웹/모바일 프론트엔드' },
    { id: 4, name: '백엔드팀', manager: '최백엔드', employeeCount: 7, parentId: 2, status: 'active', budget: 100000000, location: '본사 8층', notes: '서버 및 API 개발' },
    { id: 5, name: '마케팅팀', manager: '정마케팅', employeeCount: 12, parentId: 1, status: 'active', budget: 150000000, location: '본사 7층', notes: '마케팅 및 홍보' },
    { id: 6, name: '영업팀', manager: '한영업', employeeCount: 10, parentId: 1, status: 'active', budget: 120000000, location: '본사 6층', notes: '영업 및 고객관리' },
    { id: 7, name: '인사팀', manager: '김인사', employeeCount: 5, parentId: 1, status: 'active', budget: 80000000, location: '본사 5층', notes: '인사 및 채용' },
    { id: 8, name: '재무팀', manager: '이재무', employeeCount: 4, parentId: 1, status: 'active', budget: 60000000, location: '본사 5층', notes: '재무 및 회계' },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<Omit<Department, 'id'>>({
    name: '',
    manager: '',
    employeeCount: 0,
    parentId: null,
    status: 'active',
    budget: 0,
    location: '',
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleAdd = () => {
    setSelectedDepartment(null);
    setFormData({
      name: '',
      manager: '',
      employeeCount: 0,
      parentId: null,
      status: 'active',
      budget: 0,
      location: '',
      notes: ''
    });
    setOpenDialog(true);
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      manager: department.manager,
      employeeCount: department.employeeCount,
      parentId: department.parentId,
      status: department.status,
      budget: department.budget,
      location: department.location,
      notes: department.notes || ''
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedDepartment) {
      setDepartments(departments.map(dept =>
        dept.id === selectedDepartment.id
          ? { ...dept, ...formData }
          : dept
      ));
    } else {
      const newDepartment: Department = {
        id: departments.length > 0 ? Math.max(...departments.map(d => d.id)) + 1 : 1,
        ...formData
      };
      setDepartments([...departments, newDepartment]);
    }
    setOpenDialog(false);
  };

  const handleDelete = (id: number) => {
    setDepartments(departments.filter(dept => dept.id !== id));
  };

  const getStatusChip = (status: 'active' | 'inactive') => {
    return (
      <Chip
        label={status === 'active' ? '활성' : '비활성'}
        color={status === 'active' ? 'success' : 'default'}
        size="small"
      />
    );
  };

  const getParentDepartmentName = (parentId: number | null) => {
    if (parentId === null) return '최상위 부서';
    const parent = departments.find(dept => dept.id === parentId);
    return parent ? parent.name : '알 수 없음';
  };

  const filteredDepartments = departments.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ 
      width: '100%'
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AccountTreeIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          조직 관리
        </Typography>
      </Box>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="부서명, 부서장, 위치로 검색..."
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
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
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
              부서 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 부서 목록 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>부서명</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>부서장</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>직원 수</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상위 부서</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>예산</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>위치</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>비고</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.map((dept) => (
                <TableRow key={dept.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {dept.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {dept.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      {dept.manager}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <GroupIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      {dept.employeeCount}명
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {getParentDepartmentName(dept.parentId)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(dept.status)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {dept.budget.toLocaleString()}원
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                      {dept.location}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dept.notes || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(dept)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(dept.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 부서 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedDepartment ? '부서 수정' : '새 부서 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="부서명"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              <TextField
                fullWidth
                label="부서장"
                value={formData.manager}
                onChange={(e) => setFormData({...formData, manager: e.target.value})}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="직원 수"
                type="number"
                value={formData.employeeCount}
                onChange={(e) => setFormData({...formData, employeeCount: parseInt(e.target.value) || 0})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>상위 부서</InputLabel>
                <Select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({...formData, parentId: e.target.value ? parseInt(String(e.target.value)) : null})}
                >
                  <MenuItem value="">최상위 부서</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                >
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="예산 (원)"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})}
              />
            </Box>
            <TextField
              fullWidth
              label="위치"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            />
            <TextField
              fullWidth
              label="비고"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationChart;
