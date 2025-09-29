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
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Folder as FolderIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'MVS 3.0 시스템 개발',
      description: '통합 업무 관리 시스템 개발 프로젝트',
      manager: '홍길동',
      team: ['김철수', '이영희', '박민수'],
      status: 'in_progress',
      progress: 75,
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      priority: 'high'
    },
    {
      id: 2,
      name: '고객 포털 구축',
      description: '고객용 웹 포털 시스템 구축',
      manager: '김영수',
      team: ['정수진', '최동훈'],
      status: 'planning',
      progress: 25,
      startDate: '2024-02-01',
      endDate: '2024-05-31',
      priority: 'medium'
    },
    {
      id: 3,
      name: '데이터 마이그레이션',
      description: '기존 시스템 데이터 이전 작업',
      manager: '박지영',
      team: ['윤태호', '강미영'],
      status: 'completed',
      progress: 100,
      startDate: '2023-12-01',
      endDate: '2024-01-15',
      priority: 'high'
    }
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: '',
    team: '',
    status: 'planning',
    startDate: '',
    endDate: '',
    priority: 'medium'
  });

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

  const handleOpenDialog = (project?: any) => {
    if (project) {
      setSelectedProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        manager: project.manager,
        team: project.team.join(', '),
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        priority: project.priority
      });
    } else {
      setSelectedProject(null);
      setFormData({
        name: '',
        description: '',
        manager: '',
        team: '',
        status: 'planning',
        startDate: '',
        endDate: '',
        priority: 'medium'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProject(null);
  };

  const handleSave = () => {
    if (selectedProject) {
      // 수정
      setProjects(projects.map(project => 
        project.id === selectedProject.id 
          ? { 
              ...project, 
              ...formData, 
              team: formData.team.split(',').map(t => t.trim()),
              progress: project.progress
            }
          : project
      ));
    } else {
      // 새로 추가
      const newProject = {
        id: projects.length + 1,
        ...formData,
        team: formData.team.split(',').map(t => t.trim()),
        progress: 0
      };
      setProjects([...projects, newProject]);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: number) => {
    setProjects(projects.filter(project => project.id !== id));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FolderIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          프로젝트 관리
        </Typography>
      </Box>

      <Box>
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">프로젝트 목록</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  size="small"
                >
                  새 프로젝트
                </Button>
              </Box>

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
                    {projects.map((project) => (
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
            <TextField
              fullWidth
              label="프로젝트명"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              size="small"
            />
            <TextField
              fullWidth
              label="담당자"
              value={formData.manager}
              onChange={(e) => setFormData({...formData, manager: e.target.value})}
              size="small"
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                fullWidth
                label="프로젝트 설명"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                multiline
                rows={3}
                size="small"
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                fullWidth
                label="팀원 (쉼표로 구분)"
                value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
                size="small"
                placeholder="홍길동, 김철수, 이영희"
              />
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>상태</InputLabel>
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
            <FormControl fullWidth size="small">
              <InputLabel>우선순위</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                <MenuItem value="high">높음</MenuItem>
                <MenuItem value="medium">보통</MenuItem>
                <MenuItem value="low">낮음</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="date"
              label="시작일"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              label="종료일"
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectManagement;
