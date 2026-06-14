import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import {
  Folder as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { api } from '../../services/api';
import { projectService } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useStore } from '../../store';
import { showErrorPopup, showSuccessPopup } from '../../utils/errorHandler';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';

interface User {
  id: number;
  userid: string;
  username: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  status?: string;
}

const ProjectManagement: React.FC = () => {
  const { user } = useStore();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: '',
    manager_id: '',
    team: '',
    status: 'planning',
    startDate: '',
    endDate: '',
    priority: 'medium',
    project_code: '',
    budget: 0,
    progress: 0
  });

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, limit: 1000 };
      if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (managerFilter !== 'all') {
        params.manager_id = managerFilter;
      }
      
      const response = await projectService.getProjects(params);
      if (response.success) {
        const projectsData = (response.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          manager: p.manager?.username || '알 수 없음',
          manager_id: p.project_manager,
          team: [], // 팀 정보는 별도로 관리 필요
          status: p.status || 'planning',
          progress: p.progress || 0,
          startDate: p.start_date || '',
          endDate: p.end_date || '',
          priority: p.priority || 'medium',
          project_code: p.project_code || '',
          budget: parseFloat(p.budget || 0)
        }));
        setProjects(projectsData);
      } else {
        showErrorPopup(response.message || '프로젝트 목록을 불러올 수 없습니다.', '프로젝트 목록 조회 오류');
      }
    } catch (error: any) {
      console.error('프로젝트 목록 조회 오류:', error);
      showErrorPopup(error, '프로젝트 목록 조회 오류');
    } finally {
      setLoading(false);
    }
  }, [managerFilter, selectedCompanyId, statusFilter, user?.role]);

  const loadCompanies = useCallback(async () => {
    try {
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch (error) {
      console.error('회사 목록 로드 오류:', error);
    }
  }, []);

  const filterProjects = useCallback(() => {
    let filtered = projects;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.manager.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 상태 필터링
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // 담당자 필터링
    if (managerFilter !== 'all') {
      filtered = filtered.filter(project => project.manager_id?.toString() === managerFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, managerFilter]);

  const loadUsers = useCallback(async () => {
    try {
      const params: { company_id?: number } = {};
      if (user?.company_id) {
        params.company_id = user.company_id;
      }
      const usersData = await useReferenceDataStore.getState().fetchUsers(params);
      setUsers(usersData);
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
    }
  }, [user?.company_id]);

  useEffect(() => {
    loadUsers();
    loadProjects();
    if (user?.role === 'root' || user?.role === 'audit') {
      loadCompanies();
    }
  }, [loadCompanies, loadProjects, loadUsers, user?.role]);

  useEffect(() => {
    filterProjects();
  }, [filterProjects]);

  useEffect(() => {
    if (!openDialog) return;
    if (!formData.team || users.length === 0) {
      setTeamMembers([]);
      return;
    }
    const teamNames = formData.team
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const matched = users.filter((userItem) => teamNames.includes(userItem.username));
    setTeamMembers(matched);
  }, [formData.team, openDialog, users]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return '기획';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'on_hold': return '보류';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'info';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'on_hold': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // 시간 기반 진행율 자동 계산
  const calculateProgressByTime = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    if (today < start) return 0;
    if (today > end) return 100;
    
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  };

  const handleOpenDialog = (project?: any) => {
    if (project) {
      setSelectedProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        manager: project.manager || '',
        manager_id: project.manager_id || '',
        team: project.team.join(', '),
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        priority: project.priority,
        project_code: project.project_code || '',
        budget: project.budget || 0,
        progress: project.progress || 0
      });
    } else {
      setSelectedProject(null);
      setFormData({
        name: '',
        description: '',
        manager: '',
        manager_id: '',
        team: '',
        status: 'planning',
        startDate: '',
        endDate: '',
        priority: 'medium',
        project_code: '',
        budget: 0,
        progress: 0
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProject(null);
  };

  const handleSave = async () => {
    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        project_manager: formData.manager_id ? parseInt(formData.manager_id) : null,
        status: formData.status,
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        priority: formData.priority,
        project_code: formData.project_code || `PROJ-${Date.now()}`,
        budget: formData.budget || 0,
        progress: formData.progress || 0
      };

      if (selectedProject) {
        // 수정
        const response = await projectService.updateProject(selectedProject.id, projectData);
        if (response.success) {
          showSuccessPopup('프로젝트가 수정되었습니다.');
          handleCloseDialog();
          loadProjects();
        } else {
          showErrorPopup(response.message || '프로젝트 수정에 실패했습니다.', '프로젝트 수정 오류');
        }
      } else {
        // 생성
        const response = await projectService.createProject(projectData);
        if (response.success) {
          showSuccessPopup('프로젝트가 생성되었습니다.');
          handleCloseDialog();
          loadProjects();
        } else {
          showErrorPopup(response.message || '프로젝트 생성에 실패했습니다.', '프로젝트 생성 오류');
        }
      }
    } catch (error: any) {
      console.error('프로젝트 저장 오류:', error);
      showErrorPopup(error, '프로젝트 저장 오류');
    }
  };

  const handleDelete = async (id: number) => {
    showConfirm(
      '정말로 이 프로젝트를 삭제하시겠습니까?',
      async () => {
        try {
          const response = await projectService.deleteProject(id);
          if (response.success) {
            showSuccessPopup('프로젝트가 삭제되었습니다.');
            loadProjects();
          } else {
            showErrorPopup(response.message || '프로젝트 삭제에 실패했습니다.', '프로젝트 삭제 오류');
          }
        } catch (error: any) {
          console.error('프로젝트 삭제 오류:', error);
          showErrorPopup(error, '프로젝트 삭제 오류');
        }
      },
      { confirmColor: 'error' }
    );
  };

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title="프로젝트 관리"
        description="프로젝트를 관리하고 조회하는 페이지입니다."
      />



      <Box>
        {/* 검색 및 필터 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: (user?.role === 'root' || user?.role === 'audit') ? '2fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr' },
              gap: 2, 
              alignItems: 'flex-end' 
            }}>
              <TextField
                fullWidth
                label="검색"
                placeholder="프로젝트명, 설명, 코드, 담당자로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              {(user?.role === 'root' || user?.role === 'audit') && (
                <TextField
                  fullWidth
                  select
                  label="회사"
                  value={selectedCompanyId}
                  onChange={(e) => {
                    const value = String(e.target.value);
                    if (value === '') {
                      setSelectedCompanyId('');
                    } else {
                      const num = Number(value);
                      setSelectedCompanyId(isNaN(num) ? '' : num);
                    }
                    setTimeout(() => loadProjects(), 100);
                  }}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{ height: '40px' }}
                >
                  <MenuItem value="">전체 회사</MenuItem>
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                fullWidth
                select
                label="상태"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                SelectProps={{ displayEmpty: true }}
                sx={{ height: '40px' }}
              >
                <MenuItem value="all">전체 상태</MenuItem>
                <MenuItem value="planning">기획</MenuItem>
                <MenuItem value="in_progress">진행중</MenuItem>
                <MenuItem value="completed">완료</MenuItem>
                <MenuItem value="on_hold">보류</MenuItem>
                <MenuItem value="cancelled">취소</MenuItem>
              </TextField>
              <TextField
                fullWidth
                select
                label="담당자"
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
                SelectProps={{ displayEmpty: true }}
                sx={{ height: '40px' }}
              >
                <MenuItem value="all">전체 담당자</MenuItem>
                {users
                  .filter(u => !u.status || u.status === 'active')
                  .map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      {user.username}
                    </MenuItem>
                  ))}
              </TextField>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setManagerFilter('all');
                  setSelectedCompanyId('');
                  setTimeout(() => loadProjects(), 100);
                }}
                sx={{ height: '40px' }}
              >
                초기화
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">프로젝트 목록 ({filteredProjects.length}건)</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  size="small"
                >
                  새 프로젝트
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredProjects.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {projects.length === 0 ? '프로젝트가 없습니다.' : '검색 결과가 없습니다.'}
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>프로젝트명</TableCell>
                        <TableCell>담당자</TableCell>
                        <TableCell>팀원</TableCell>
                        <TableCell>진행률</TableCell>
                        <TableCell>상태</TableCell>
                        <TableCell>우선순위</TableCell>
                        <TableCell>기간</TableCell>
                        <TableCell>작업</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {project.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {project.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{project.manager}</TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {project.team.join(', ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: '100px' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={project.progress} 
                              sx={{ mb: 0.5 }}
                            />
                            <Typography variant="caption">
                              {project.progress}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(project.status)}
                            color={getStatusColor(project.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.priority.toUpperCase()}
                            color={getPriorityColor(project.priority) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {project.startDate} ~ {project.endDate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(project)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(project.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 프로젝트 편집 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedProject ? '프로젝트 수정' : '새 프로젝트 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                프로젝트명
              </Typography>
              <TextField
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                size="small"
                placeholder="프로젝트명을 입력하세요"
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                담당자
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.manager_id}
                  onChange={(e) => {
                    const selectedUser = users.find(u => u.id.toString() === e.target.value);
                    setFormData({
                      ...formData,
                      manager_id: e.target.value,
                      manager: selectedUser ? selectedUser.username : ''
                    });
                  }}
                  displayEmpty
                >
                  <MenuItem value="">담당자 없음</MenuItem>
                  {users
                    .filter(u => !u.status || u.status === 'active')
                    .map((user) => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.username} {user.department ? `(${user.department})` : ''}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                프로젝트 설명
              </Typography>
              <TextField
                fullWidth
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                multiline
                rows={3}
                size="small"
                placeholder="프로젝트 설명을 입력하세요"
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                팀원
              </Typography>
              <Autocomplete
                multiple
                options={users.filter(u => !u.status || u.status === 'active')}
                value={teamMembers}
                onChange={(_, newValue) => {
                  setTeamMembers(newValue);
                  const teamNames = newValue.map((member) => member.username).join(', ');
                  setFormData(prev => ({ ...prev, team: teamNames }));
                }}
                getOptionLabel={(option) => `${option.username}${option.department ? ` (${option.department})` : ''}`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="팀원을 검색해서 선택하세요"
                  />
                )}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                상태
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <MenuItem value="planning">기획</MenuItem>
                  <MenuItem value="in_progress">진행중</MenuItem>
                  <MenuItem value="completed">완료</MenuItem>
                  <MenuItem value="on_hold">보류</MenuItem>
                  <MenuItem value="cancelled">취소</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                우선순위
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                >
                  <MenuItem value="high">높음</MenuItem>
                  <MenuItem value="medium">보통</MenuItem>
                  <MenuItem value="low">낮음</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                시작일
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setFormData({...formData, startDate: newStartDate});
                  if (newStartDate && formData.endDate) {
                    const autoProgress = calculateProgressByTime(newStartDate, formData.endDate);
                    setFormData(prev => ({...prev, startDate: newStartDate, progress: autoProgress}));
                  }
                }}
                size="small"
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                종료일
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={formData.endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  setFormData({...formData, endDate: newEndDate});
                  if (formData.startDate && newEndDate) {
                    const autoProgress = calculateProgressByTime(formData.startDate, newEndDate);
                    setFormData(prev => ({...prev, endDate: newEndDate, progress: autoProgress}));
                  }
                }}
                size="small"
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                진행률 (%)
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  type="number"
                  value={formData.progress}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFormData({...formData, progress: Math.min(100, Math.max(0, value))});
                  }}
                  size="small"
                  InputProps={{
                    inputProps: { min: 0, max: 100 }
                  }}
                  helperText="0~100 사이의 값을 입력하세요"
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (formData.startDate && formData.endDate) {
                      const autoProgress = calculateProgressByTime(formData.startDate, formData.endDate);
                      setFormData({...formData, progress: autoProgress});
                    }
                  }}
                  disabled={!formData.startDate || !formData.endDate}
                  sx={{ height: '40px', whiteSpace: 'nowrap' }}
                >
                  시간 기반<br/>자동 계산
                </Button>
              </Box>
              {formData.startDate && formData.endDate && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={formData.progress} 
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    현재 진행률: {formData.progress}%
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>

      {/* 확인 다이얼로그 */}
      <ConfirmDialog
        open={dialogState.open}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        confirmColor={dialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default ProjectManagement;
