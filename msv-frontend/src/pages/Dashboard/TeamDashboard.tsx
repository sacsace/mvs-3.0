import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  LinearProgress,
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
  Alert,
  Divider,
  Paper,
  Grid,
  IconButton,
  Tooltip,
  Badge,
  ListItemAvatar,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Group as GroupIcon,
  EmojiEvents as EmojiEventsIcon,
  Speed as SpeedIcon,
  Handshake as HandshakeIcon,
  SentimentSatisfied as SentimentSatisfiedIcon,
  CalendarToday as CalendarTodayIcon,
  Chat as ChatIcon,
  Share as ShareIcon,
  VideoCall as VideoCallIcon,
  Edit as WhiteboardIcon,
  AttachFile as AttachFileIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useStore } from '../../store';
import { api } from '../../services/api';

// 타입 정의
interface TeamStats {
  kpi: number;
  productivity: number;
  collaboration: number;
  satisfaction: number;
  projects: Array<{
    id: string;
    name: string;
    progress: number;
    status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
    deadline: string;
    teamMembers: number;
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    status: 'online' | 'offline' | 'busy' | 'away';
    avatar: string;
    tasksCompleted: number;
    tasksPending: number;
    efficiency: number;
    lastActive: string;
    department: string;
    skills: string[];
    currentProjects: string[];
  }>;
  recentActivities: Array<{
    id: string;
    type: 'task_completed' | 'meeting_scheduled' | 'file_shared' | 'project_updated';
    title: string;
    description: string;
    user: string;
    timestamp: string;
  }>;
  upcomingMeetings: Array<{
    id: string;
    title: string;
    time: string;
    participants: string[];
    room: string;
    type: 'meeting' | 'workshop' | 'review';
  }>;
  teamResources: {
    budget: number;
    usedBudget: number;
    availableBudget: number;
    equipment: Array<{
      name: string;
      status: 'available' | 'in_use' | 'maintenance';
      assignedTo: string;
    }>;
  };
  collaborationTools: {
    activeChats: number;
    sharedFiles: number;
    whiteboardSessions: number;
    videoCalls: number;
  };
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  avatar: string;
  tasksCompleted: number;
  tasksPending: number;
  efficiency: number;
  lastActive: string;
  department: string;
  skills: string[];
  currentProjects: string[];
}

const TeamDashboard: React.FC = () => {
  const { user } = useStore();
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openMemberDialog, setOpenMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [openMeetingDialog, setOpenMeetingDialog] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const fetchTeamData = async () => {
      setLoading(true);
      try {
        const [statsResponse, membersResponse] = await Promise.all([
          api.get('/dashboard/team-stats'),
          api.get('/team/members')
        ]);

        if (statsResponse.data.success) {
          setTeamStats(statsResponse.data.data);
        }
        if (membersResponse.data.success) {
          setTeamMembers(membersResponse.data.data);
        }
      } catch (error) {
        console.error('팀 데이터 로드 오류:', error);
        setError('팀 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, []);

  // 팀원 상세 보기
  const handleMemberView = (member: TeamMember) => {
    setSelectedMember(member);
    setOpenMemberDialog(true);
  };

  // 상태 색상 반환
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'default';
      case 'busy': return 'warning';
      case 'away': return 'info';
      default: return 'default';
    }
  };

  // 상태 아이콘 반환
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '⚫';
      case 'busy': return '🟡';
      case 'away': return '🔵';
      default: return '⚫';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon color="primary" />
          팀 대시보드
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          팀 성과 지표와 협업 현황을 확인하세요.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)'
        },
        gap: 3,
        px: 3,
        pb: 3
      }}>
        {/* 팀 성과 지표 */}
        <Card sx={{ gridColumn: 'span 2' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsIcon color="primary" />
              팀 성과 지표
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)'
              },
              gap: 3 
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {teamStats?.kpi || 0}%
                </Typography>
                <Typography variant="body2">목표 달성률</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={teamStats?.kpi || 0} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {teamStats?.productivity || 0}
                </Typography>
                <Typography variant="body2">생산성 지수</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={teamStats?.productivity || 0} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {teamStats?.collaboration || 0}
                </Typography>
                <Typography variant="body2">협업 점수</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={teamStats?.collaboration || 0} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {teamStats?.satisfaction || 0}%
                </Typography>
                <Typography variant="body2">만족도</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={teamStats?.satisfaction || 0} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 팀원 현황 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon color="primary" />
              팀원 현황
            </Typography>
            <List dense>
              {teamStats?.teamMembers?.slice(0, 5).map((member) => (
                <ListItem key={member.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar src={member.avatar} sx={{ width: 32, height: 32 }}>
                      {member.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.name}
                    secondary={`${member.role} • ${member.status}`}
                    onClick={() => handleMemberView(member)}
                    sx={{ cursor: 'pointer' }}
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={getStatusIcon(member.status)}
                      size="small"
                      color={getStatusColor(member.status) as any}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonAddIcon />}
              sx={{ mt: 1, width: '100%' }}
            >
              팀원 추가
            </Button>
          </CardContent>
        </Card>

        {/* 팀 프로젝트 진행률 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon color="primary" />
              팀 프로젝트 진행률
            </Typography>
            {teamStats?.projects?.map((project) => (
              <Box key={project.id} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{project.name}</Typography>
                  <Typography variant="body2">{project.progress}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={project.progress} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Chip
                    label={project.status}
                    size="small"
                    color={project.status === 'completed' ? 'success' : 'primary'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {project.teamMembers}명 참여
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsIcon color="primary" />
              최근 활동
            </Typography>
            <List dense>
              {teamStats?.recentActivities?.slice(0, 5).map((activity) => (
                <ListItem key={activity.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <NotificationsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.title}
                    secondary={`${activity.user} • ${activity.timestamp}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* 예정된 회의 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayIcon color="primary" />
              예정된 회의
            </Typography>
            <List dense>
              {teamStats?.upcomingMeetings?.slice(0, 3).map((meeting) => (
                <ListItem key={meeting.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <VideoCallIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={meeting.title}
                    secondary={`${meeting.time} • ${meeting.room}`}
                  />
                  <Chip
                    label={meeting.type}
                    size="small"
                    color="primary"
                  />
                </ListItem>
              ))}
            </List>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              sx={{ mt: 1, width: '100%' }}
              onClick={() => setOpenMeetingDialog(true)}
            >
              회의 예약
            </Button>
          </CardContent>
        </Card>

        {/* 팀 리소스 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon color="primary" />
              팀 리소스
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2">예산 사용률</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(teamStats?.teamResources?.usedBudget || 0) / (teamStats?.teamResources?.budget || 1) * 100} 
                  sx={{ mt: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary">
                  ₩{(teamStats?.teamResources?.usedBudget || 0).toLocaleString()} / ₩{(teamStats?.teamResources?.budget || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2">장비 현황</Typography>
                <List dense>
                  {teamStats?.teamResources?.equipment?.slice(0, 3).map((equipment, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText
                        primary={equipment.name}
                        secondary={equipment.assignedTo}
                      />
                      <Chip
                        label={equipment.status}
                        size="small"
                        color={equipment.status === 'available' ? 'success' : 'warning'}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 협업 도구 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HandshakeIcon color="primary" />
              협업 도구
            </Typography>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)'
              },
              gap: 2 
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {teamStats?.collaborationTools?.activeChats || 0}
                </Typography>
                <Typography variant="body2">활성 채팅</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {teamStats?.collaborationTools?.sharedFiles || 0}
                </Typography>
                <Typography variant="body2">공유 파일</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {teamStats?.collaborationTools?.whiteboardSessions || 0}
                </Typography>
                <Typography variant="body2">화이트보드</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {teamStats?.collaborationTools?.videoCalls || 0}
                </Typography>
                <Typography variant="body2">화상회의</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="outlined" size="small" startIcon={<ChatIcon />}>
                채팅
              </Button>
              <Button variant="outlined" size="small" startIcon={<WhiteboardIcon />}>
                화이트보드
              </Button>
              <Button variant="outlined" size="small" startIcon={<VideoCallIcon />}>
                화상회의
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 팀원 상세 다이얼로그 */}
      <Dialog open={openMemberDialog} onClose={() => setOpenMemberDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="primary" />
            {selectedMember?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMember && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={selectedMember.avatar} sx={{ width: 64, height: 64 }}>
                  {selectedMember.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedMember.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedMember.role} • {selectedMember.department}
                  </Typography>
                  <Chip
                    label={selectedMember.status}
                    size="small"
                    color={getStatusColor(selectedMember.status) as any}
                  />
                </Box>
              </Box>
              
              <Divider />
              
              <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)'
              },
              gap: 2 
            }}>
                <Box>
                  <Typography variant="subtitle2">완료된 작업</Typography>
                  <Typography variant="h6">{selectedMember.tasksCompleted}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">대기 중인 작업</Typography>
                  <Typography variant="h6">{selectedMember.tasksPending}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">효율성</Typography>
                  <Typography variant="h6">{selectedMember.efficiency}%</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">마지막 활동</Typography>
                  <Typography variant="body2">{selectedMember.lastActive}</Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2">기술 스택</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {selectedMember.skills.map((skill, index) => (
                    <Chip key={index} label={skill} size="small" />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2">현재 프로젝트</Typography>
                <List dense>
                  {selectedMember.currentProjects.map((project, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText primary={project} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMemberDialog(false)}>닫기</Button>
          <Button variant="contained" startIcon={<EditIcon />}>
            편집
          </Button>
        </DialogActions>
      </Dialog>

      {/* 회의 예약 다이얼로그 */}
      <Dialog open={openMeetingDialog} onClose={() => setOpenMeetingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>회의 예약</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="회의 제목"
              size="small"
            />
            <TextField
              fullWidth
              label="회의실"
              size="small"
            />
            <TextField
              fullWidth
              label="날짜 및 시간"
              type="datetime-local"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="참석자"
              size="small"
              placeholder="이메일 주소를 입력하세요"
            />
            <FormControl fullWidth size="small">
              <InputLabel>회의 유형</InputLabel>
              <Select>
                <MenuItem value="meeting">일반 회의</MenuItem>
                <MenuItem value="workshop">워크샵</MenuItem>
                <MenuItem value="review">리뷰</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMeetingDialog(false)}>취소</Button>
          <Button variant="contained">예약</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamDashboard;
