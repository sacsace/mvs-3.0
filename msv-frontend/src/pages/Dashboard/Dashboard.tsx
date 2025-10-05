import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tabs,
  Tab,
  Button,
  Tooltip,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  TrendingDown,
  Inventory,
  People,
  Receipt,
  Assessment,
  Notifications,
  Refresh,
  MoreVert,
  Person as PersonIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  ArrowForward as ArrowForwardIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { api } from '../../services/api';

// TabPanel 컴포넌트 정의
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// 샘플 데이터 (기본값으로 사용)
const defaultSalesData = [
  { name: '1월', sales: 0, profit: 0 },
  { name: '2월', sales: 0, profit: 0 },
  { name: '3월', sales: 0, profit: 0 },
  { name: '4월', sales: 0, profit: 0 },
  { name: '5월', sales: 0, profit: 0 },
  { name: '6월', sales: 0, profit: 0 },
];

const defaultInventoryData = [
  { name: '재고 부족', value: 0, color: '#ff6b6b' },
  { name: '정상 재고', value: 0, color: '#4ecdc4' },
  { name: '과다 재고', value: 0, color: '#ffe66d' },
];

const defaultRecentActivities = [
  { id: 1, type: 'invoice', message: '데이터를 불러오는 중...', time: '', icon: 'receipt' },
];

const Dashboard: React.FC = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCustomers: 0,
    totalInvoices: 0,
    totalInventory: 0
  });

  const [salesData, setSalesData] = useState(defaultSalesData);
  const [inventoryData, setInventoryData] = useState(defaultInventoryData);
  const [recentActivities, setRecentActivities] = useState(defaultRecentActivities);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 실제 데이터 로드 함수
  const loadDashboardData = async () => {
    try {
    setLoading(true);
      setError(null);

      // 대시보드 통계 로드
      const statsResponse = await api.get('/dashboard/stats');
      if (statsResponse.data.success) {
        setStats({
          totalSales: statsResponse.data.data.totalRevenue || 0,
          totalCustomers: statsResponse.data.data.customerCount || 0,
          totalInvoices: statsResponse.data.data.invoiceCount || 0,
          totalInventory: statsResponse.data.data.inventoryCount || 0
        });
      }

      // 매출 추이 데이터 로드
      const revenueResponse = await api.get('/dashboard/revenue-trend');
      if (revenueResponse.data.success) {
        const revenueData = revenueResponse.data.data.map((item: any) => ({
          name: new Date(item.month).toLocaleDateString('ko-KR', { month: 'short' }),
          sales: parseFloat(item.revenue) || 0,
          profit: parseFloat(item.revenue) * 0.3 || 0 // 수익률 30% 가정
        }));
        setSalesData(revenueData);
      }

      // 재고 현황 데이터 로드
      const inventoryResponse = await api.get('/dashboard/inventory-status');
      if (inventoryResponse.data.success) {
        const inventoryStatus = inventoryResponse.data.data;
        setInventoryData([
          { name: '재고 부족', value: inventoryStatus.lowStock || 0, color: '#ff6b6b' },
          { name: '정상 재고', value: inventoryStatus.normalStock || 0, color: '#4ecdc4' },
          { name: '과다 재고', value: inventoryStatus.overStock || 0, color: '#ffe66d' },
        ]);
      }

      // 최근 활동 데이터 로드 (알림 API 사용)
      const notificationsResponse = await api.get('/notifications');
      if (notificationsResponse.data.success) {
        const activities = notificationsResponse.data.data.slice(0, 4).map((notification: any, index: number) => ({
          id: notification.id || index + 1,
          type: 'notification',
          message: notification.message || '새 알림',
          time: notification.created_at ? new Date(notification.created_at).toLocaleString('ko-KR') : '',
          icon: 'notifications'
        }));
        setRecentActivities(activities);
      }

    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const StatCard = ({ title, value, icon, trend, color = 'primary', onClick }: any) => (
    <Card 
      sx={{ 
        height: '100%', 
        position: 'relative', 
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid #f1f5f9',
        borderRadius: 2,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onClick ? { 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transform: 'translateY(-1px)',
          borderColor: '#e2e8f0'
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              color="text.secondary" 
              gutterBottom 
              variant="subtitle2"
              sx={{ 
                fontSize: '0.8125rem',
                fontWeight: 500,
                mb: 1
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h3" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                fontSize: '1.5rem',
                color: 'text.primary',
                mb: trend ? 1 : 0
              }}
            >
              {value === 0 ? '0' : value.toLocaleString()}
            </Typography>
            {trend && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 0.5
              }}>
                {trend > 0 ? (
                  <TrendingUp sx={{ 
                    color: 'success.main', 
                    fontSize: '1rem'
                  }} />
                ) : (
                  <TrendingDown sx={{ 
                    color: 'error.main', 
                    fontSize: '1rem'
                  }} />
                )}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: trend > 0 ? 'success.main' : 'error.main',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ 
            bgcolor: `${color}.main`, 
            width: 48, 
            height: 48,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            {React.cloneElement(icon, { sx: { fontSize: '1.25rem' } })}
          </Avatar>
        </Box>
        {onClick && (
          <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
            <ArrowForwardIcon sx={{ 
              color: 'text.secondary', 
              fontSize: '0.875rem',
              opacity: 0.6
            }} />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ title, description, icon, color, onClick }: any) => (
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { 
          boxShadow: 6,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48, mx: 'auto', mb: 2 }}>
          {icon}
        </Avatar>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ 
      width: '100%',
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%',
      p: 0 // 패딩 제거
    }}>
      {/* 헤더 섹션 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            backgroundColor: 'primary.main', 
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DashboardIcon sx={{ color: 'white', fontSize: '1.25rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
              fontSize: '1.5rem'
            }}>
              대시보드
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              Root Administrator님, 안녕하세요! 오늘의 업무 현황을 확인해보세요.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="새로고침">
            <IconButton 
              onClick={handleRefresh} 
              disabled={loading}
              size="small"
              sx={{ 
                backgroundColor: 'grey.50',
                '&:hover': { backgroundColor: 'grey.100' }
              }}
            >
              <Refresh sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="알림">
            <IconButton 
              size="small"
              sx={{ 
                backgroundColor: 'grey.50',
                '&:hover': { backgroundColor: 'grey.100' }
              }}
            >
              <Notifications sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>
          <Avatar sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: 'error.main',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            R
          </Avatar>
        </Box>
      </Box>

      {/* 대시보드 타입 선택 - 고정 탭 */}
      <Box sx={{ 
        mb: 4,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
              height: 3,
              borderRadius: '2px 2px 0 0'
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              minHeight: 56,
              px: 3,
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                color: 'primary.main'
              }
            }
          }}
        >
          <Tab 
            label="개인 대시보드" 
            icon={<PersonIcon sx={{ fontSize: '1rem' }} />} 
            iconPosition="start"
          />
          <Tab 
            label="팀 대시보드" 
            icon={<GroupIcon sx={{ fontSize: '1rem' }} />} 
            iconPosition="start"
          />
          <Tab 
            label="관리자 대시보드" 
            icon={<AdminPanelSettingsIcon sx={{ fontSize: '1rem' }} />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* 탭별 대시보드 내용 */}
      <TabPanel value={activeTab} index={0}>
        {/* 개인 대시보드 */}
        <Box>
          {/* 주요 지표 카드 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 3,
            mb: 4
          }}>
            <StatCard
              title="내 업무"
              value={12}
              icon={<PersonIcon />}
              trend={5.2}
              color="primary"
              onClick={() => navigate('/work/my-tasks')}
            />
            <StatCard
              title="완료된 작업"
              value={8}
              icon={<Assessment />}
              trend={12.5}
              color="success"
              onClick={() => navigate('/work/completed')}
            />
            <StatCard
              title="진행 중인 프로젝트"
              value={3}
              icon={<TrendingUp />}
              trend={2.1}
              color="warning"
              onClick={() => navigate('/projects/my')}
            />
            <StatCard
              title="미완료 보고서"
              value={2}
              icon={<Receipt />}
              trend={5.7}
              color="info"
              onClick={() => navigate('/work/reports')}
            />
          </Box>

          {/* 차트 섹션 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)'
            },
            gap: 3,
            mb: 4
          }}>
            {/* 주간 업무 완료율 */}
            <Card sx={{ 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              borderRadius: 2
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 3
                }}>
                  <TrendingUp color="primary" />
                  주간 업무 완료율
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={[
                    { day: '월', completed: 4, total: 6 },
                    { day: '화', completed: 3, total: 5 },
                    { day: '수', completed: 5, total: 7 },
                    { day: '목', completed: 2, total: 4 },
                    { day: '금', completed: 6, total: 8 },
                    { day: '토', completed: 1, total: 2 },
                    { day: '일', completed: 0, total: 1 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="completed" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="total" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 프로젝트 진행률 */}
            <Card sx={{ 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              borderRadius: 2
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 3
                }}>
                  <Assessment color="primary" />
                  프로젝트 진행률
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { project: '프로젝트 A', progress: 75 },
                    { project: '프로젝트 B', progress: 45 },
                    { project: '프로젝트 C', progress: 90 },
                    { project: '프로젝트 D', progress: 30 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="project" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="progress" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>

          {/* 개인 업무 목록 테이블 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                내 업무 목록
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>업무명</TableCell>
                      <TableCell>우선순위</TableCell>
                      <TableCell>진행률</TableCell>
                      <TableCell>마감일</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { task: '월간 보고서 작성', priority: '높음', progress: 80, deadline: '2024-01-15', status: '진행중' },
                      { task: '고객 미팅 준비', priority: '중간', progress: 60, deadline: '2024-01-12', status: '진행중' },
                      { task: '시스템 테스트', priority: '낮음', progress: 100, deadline: '2024-01-10', status: '완료' },
                      { task: '문서 정리', priority: '중간', progress: 30, deadline: '2024-01-18', status: '대기' }
                    ].map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.task}</TableCell>
                        <TableCell>
                          <Chip 
                            label={row.priority} 
                            color={row.priority === '높음' ? 'error' : row.priority === '중간' ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={row.progress} 
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="body2">{row.progress}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{row.deadline}</TableCell>
                        <TableCell>
                          <Chip 
                            label={row.status} 
                            color={row.status === '완료' ? 'success' : row.status === '진행중' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* 팀 대시보드 */}
        <Box>
          {/* 주요 지표 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 2,
            mb: 3,
            px: 0
          }}>
            <StatCard
              title="팀 구성원"
              value={15}
              icon={<GroupIcon />}
              trend={8.2}
              color="primary"
              onClick={() => navigate('/team/members')}
            />
            <StatCard
              title="팀 프로젝트"
              value={7}
              icon={<TrendingUp />}
              trend={12.5}
              color="success"
              onClick={() => navigate('/projects/team')}
            />
            <StatCard
              title="팀 성과"
              value={85}
              icon={<Assessment />}
              trend={5.2}
              color="warning"
              onClick={() => navigate('/reports/team')}
            />
            <StatCard
              title="협업 도구"
              value={12}
              icon={<Notifications />}
              trend={-2.1}
              color="info"
              onClick={() => navigate('/team/collaboration')}
            />
          </Box>

          {/* 팀 성과 통계 차트 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)'
            },
            gap: 2,
            mb: 3
          }}>
            {/* 팀원별 업무 완료율 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon color="primary" />
                  팀원별 업무 완료율
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { member: '김철수', completed: 85, total: 100 },
                    { member: '이영희', completed: 92, total: 100 },
                    { member: '박민수', completed: 78, total: 100 },
                    { member: '정수진', completed: 88, total: 100 },
                    { member: '최동현', completed: 95, total: 100 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="member" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="completed" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 팀 프로젝트 진행률 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="primary" />
                  팀 프로젝트 진행률
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: '완료', value: 3, color: '#4ecdc4' },
                        { name: '진행중', value: 2, color: '#45b7d1' },
                        { name: '대기', value: 2, color: '#f9ca24' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {[
                        { name: '완료', value: 3, color: '#4ecdc4' },
                        { name: '진행중', value: 2, color: '#45b7d1' },
                        { name: '대기', value: 2, color: '#f9ca24' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>

          {/* 팀원 업무 현황 테이블 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon color="primary" />
                팀원 업무 현황
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>팀원</TableCell>
                      <TableCell>담당 프로젝트</TableCell>
                      <TableCell>완료율</TableCell>
                      <TableCell>마감 예정일</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { member: '김철수', project: '웹사이트 리뉴얼', progress: 85, deadline: '2024-01-20', status: '진행중' },
                      { member: '이영희', project: '모바일 앱 개발', progress: 92, deadline: '2024-01-15', status: '진행중' },
                      { member: '박민수', project: '데이터베이스 최적화', progress: 78, deadline: '2024-01-25', status: '진행중' },
                      { member: '정수진', project: 'UI/UX 개선', progress: 100, deadline: '2024-01-10', status: '완료' },
                      { member: '최동현', project: 'API 개발', progress: 95, deadline: '2024-01-18', status: '진행중' }
                    ].map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.member}</TableCell>
                        <TableCell>{row.project}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={row.progress} 
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="body2">{row.progress}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{row.deadline}</TableCell>
                        <TableCell>
                          <Chip 
                            label={row.status} 
                            color={row.status === '완료' ? 'success' : 'primary'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* 관리자 대시보드 */}
        <Box>
          {/* 주요 지표 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 2,
            mb: 3,
            px: 0
      }}>
        <StatCard
          title="총 매출"
          value={stats.totalSales}
          icon={<Receipt />}
          trend={12.5}
          color="primary"
          onClick={() => navigate('/reports/sales')}
        />
        <StatCard
          title="고객 수"
          value={stats.totalCustomers}
          icon={<People />}
          trend={8.2}
          color="success"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          title="인보이스"
          value={stats.totalInvoices}
          icon={<Receipt />}
          trend={-2.1}
          color="warning"
          onClick={() => navigate('/invoice')}
        />
        <StatCard
          title="재고 수량"
          value={stats.totalInventory}
          icon={<Inventory />}
          trend={5.7}
          color="info"
          onClick={() => navigate('/inventory')}
        />
      </Box>

          {/* 관리자 통계 차트 */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)'
            },
            gap: 2,
            mb: 3
          }}>
            {/* 매출 추이 차트 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="primary" />
                  월별 매출 추이
                </Typography>
                {salesData.every(item => item.sales === 0) ? (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: 250,
                    color: 'text.secondary'
                  }}>
                    <Typography variant="body1">데이터 없음</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 재고 현황 차트 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory color="primary" />
                  재고 현황
                </Typography>
                {inventoryData.every(item => item.value === 0) ? (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: 250,
                    color: 'text.secondary'
                  }}>
                    <Typography variant="body1">데이터 없음</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={inventoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {inventoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 고객 현황 테이블 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People color="primary" />
                고객 현황
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>고객명</TableCell>
                      <TableCell>연락처</TableCell>
                      <TableCell>이메일</TableCell>
                      <TableCell>등급</TableCell>
                      <TableCell>최근 주문일</TableCell>
                      <TableCell>상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { name: 'ABC 회사', phone: '02-1234-5678', email: 'contact@abc.com', grade: 'VIP', lastOrder: '2024-01-10', status: '활성' },
                      { name: 'XYZ 기업', phone: '02-2345-6789', email: 'info@xyz.com', grade: '골드', lastOrder: '2024-01-08', status: '활성' },
                      { name: 'DEF 그룹', phone: '02-3456-7890', email: 'sales@def.com', grade: '실버', lastOrder: '2024-01-05', status: '활성' },
                      { name: 'GHI 산업', phone: '02-4567-8901', email: 'admin@ghi.com', grade: '브론즈', lastOrder: '2023-12-28', status: '비활성' },
                      { name: 'JKL 코퍼레이션', phone: '02-5678-9012', email: 'ceo@jkl.com', grade: 'VIP', lastOrder: '2024-01-12', status: '활성' }
                    ].map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={row.grade} 
                            color={row.grade === 'VIP' ? 'error' : row.grade === '골드' ? 'warning' : row.grade === '실버' ? 'default' : 'secondary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{row.lastOrder}</TableCell>
                        <TableCell>
                          <Chip 
                            label={row.status} 
                            color={row.status === '활성' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* 빠른 액션 */}
      <Card sx={{ mb: 3, mx: 0 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            빠른 액션
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 1.5 // 간격을 2에서 1.5로 줄임
          }}>
            <QuickActionCard
              title="새 인보이스"
              description="인보이스를 생성하세요"
              icon={<Receipt />}
              color="primary"
              onClick={() => navigate('/invoice/create')}
            />
            <QuickActionCard
              title="고객 등록"
              description="새 고객을 등록하세요"
              icon={<People />}
              color="success"
              onClick={() => navigate('/customers/register')}
            />
            <QuickActionCard
              title="재고 관리"
              description="재고를 확인하세요"
              icon={<Inventory />}
              color="warning"
              onClick={() => navigate('/inventory')}
            />
            <QuickActionCard
              title="보고서"
              description="상세 보고서를 확인하세요"
              icon={<Assessment />}
              color="info"
              onClick={() => navigate('/reports')}
            />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(2, 1fr)'
        },
        gap: 2, // 간격을 3에서 2로 줄임
        px: 0, // 패딩을 0으로 설정하여 카드들이 완전히 정렬되도록 함
        pb: 2 // 패딩을 3에서 2로 줄임
      }}>
        {/* 매출 차트 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="primary" />
              월별 매출 추이
            </Typography>
            {salesData.every(item => item.sales === 0) ? (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: 300,
                color: 'text.secondary'
              }}>
                <Typography variant="body1">데이터 없음</Typography>
              </Box>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 재고 현황 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory color="primary" />
              재고 현황
            </Typography>
            {inventoryData.every(item => item.value === 0) ? (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: 300,
                color: 'text.secondary'
              }}>
                <Typography variant="body1">데이터 없음</Typography>
              </Box>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inventoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Notifications color="primary" />
              최근 활동
            </Typography>
            <List>
              {recentActivities.map((activity) => (
                <ListItem key={activity.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <Receipt />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.message}
                    secondary={activity.time}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 1, width: '100%' }}
              onClick={() => navigate('/notifications')}
            >
              모든 활동 보기
            </Button>
          </CardContent>
        </Card>

        {/* 시스템 상태 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              시스템 상태
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">서버 상태</Typography>
                <Chip label="정상" color="success" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">데이터베이스</Typography>
                <Chip label="정상" color="success" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">API 응답</Typography>
                <Chip label="정상" color="success" size="small" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">보안 상태</Typography>
                <Chip label="정상" color="success" size="small" />
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 2, width: '100%' }}
              onClick={() => navigate('/dashboard/monitoring')}
            >
              상세 모니터링
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;