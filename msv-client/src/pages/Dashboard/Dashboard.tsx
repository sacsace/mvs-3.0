import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useGlobalStore } from '../../store';
import { apiService } from '../../services/api';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, notifications } = useGlobalStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalNotifications: 0,
    unreadNotifications: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 통계 데이터 로드
  const loadStats = async () => {
    try {
      setLoading(true);
      const [usersResponse, notificationsResponse] = await Promise.all([
        apiService.getUsers(),
        apiService.getNotifications(),
      ]);

      const users = usersResponse.data.data;
      const notifications = notificationsResponse.data.data;

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.status === 'active').length,
        totalNotifications: notifications.length,
        unreadNotifications: notifications.filter((n: any) => !n.is_read).length,
      });

      // 최근 활동 (임시 데이터)
      setRecentActivities([
        {
          id: 1,
          type: 'user_created',
          message: '새 사용자가 추가되었습니다',
          user: 'Admin User',
          time: '2분 전',
          icon: <PeopleIcon />,
        },
        {
          id: 2,
          type: 'notification_sent',
          message: '새 알림이 전송되었습니다',
          user: 'System',
          time: '5분 전',
          icon: <NotificationsIcon />,
        },
        {
          id: 3,
          type: 'chat_message',
          message: '새 채팅 메시지가 있습니다',
          user: 'Test User',
          time: '10분 전',
          icon: <ChatIcon />,
        },
        {
          id: 4,
          type: 'system_update',
          message: '시스템이 업데이트되었습니다',
          user: 'System',
          time: '1시간 전',
          icon: <SettingsIcon />,
        },
      ]);
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const StatCard = ({ title, value, icon, color, trend }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
        {trend && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              {trend}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={75}
              sx={{ mt: 1, height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ title, description, icon, color, onClick }: any) => (
    <Card 
      sx={{ 
        height: '100%', 
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48, mx: 'auto', mb: 2 }}>
          {icon}
        </Avatar>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('nav.dashboard')}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            안녕하세요, {user?.username}님! 오늘도 좋은 하루 되세요.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadStats}
        >
          새로고침
        </Button>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="전체 사용자"
            value={stats.totalUsers}
            icon={<PeopleIcon />}
            color="primary.main"
            trend="이번 주 +12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="활성 사용자"
            value={stats.activeUsers}
            icon={<TrendingUpIcon />}
            color="success.main"
            trend="이번 주 +8%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="총 알림"
            value={stats.totalNotifications}
            icon={<NotificationsIcon />}
            color="warning.main"
            trend="이번 주 +15%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="읽지 않은 알림"
            value={stats.unreadNotifications}
            icon={<ChatIcon />}
            color="error.main"
            trend="즉시 확인 필요"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 빠른 작업 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                빠른 작업
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <QuickActionCard
                    title="사용자 관리"
                    description="사용자 추가, 수정, 삭제"
                    icon={<PeopleIcon />}
                    color="primary.main"
                    onClick={() => window.location.href = '/users'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <QuickActionCard
                    title="알림 관리"
                    description="알림 확인 및 관리"
                    icon={<NotificationsIcon />}
                    color="warning.main"
                    onClick={() => window.location.href = '/notifications'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <QuickActionCard
                    title="채팅"
                    description="팀 채팅 및 소통"
                    icon={<ChatIcon />}
                    color="info.main"
                    onClick={() => window.location.href = '/chat'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <QuickActionCard
                    title="설정"
                    description="시스템 설정 관리"
                    icon={<SettingsIcon />}
                    color="secondary.main"
                    onClick={() => window.location.href = '/settings'}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 활동 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  최근 활동
                </Typography>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              <List>
                {recentActivities.map((activity) => (
                  <ListItem key={activity.id} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'action.hover', width: 32, height: 32 }}>
                        {activity.icon}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.message}
                      secondary={`${activity.user} • ${activity.time}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 시스템 상태 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                시스템 상태
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" gutterBottom>
                      99.9%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      시스템 가동률
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={99.9}
                      color="success"
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" gutterBottom>
                      2.3s
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      평균 응답 시간
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={85}
                      color="info"
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" gutterBottom>
                      1.2GB
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      메모리 사용량
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={60}
                      color="warning"
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
