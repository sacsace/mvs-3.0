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
  Alert
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';

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

// 샘플 데이터
const salesData = [
  { name: '1월', sales: 4000, profit: 2400 },
  { name: '2월', sales: 3000, profit: 1398 },
  { name: '3월', sales: 2000, profit: 9800 },
  { name: '4월', sales: 2780, profit: 3908 },
  { name: '5월', sales: 1890, profit: 4800 },
  { name: '6월', sales: 2390, profit: 3800 },
];

const inventoryData = [
  { name: '재고 부족', value: 5, color: '#ff6b6b' },
  { name: '정상 재고', value: 15, color: '#4ecdc4' },
  { name: '과다 재고', value: 3, color: '#ffe66d' },
];

const recentActivities = [
  { id: 1, type: 'invoice', message: '새 인보이스 #INV-001 생성', time: '2분 전', icon: 'receipt' },
  { id: 2, type: 'customer', message: '고객 ABC Corp 등록', time: '15분 전', icon: 'people' },
  { id: 3, type: 'inventory', message: '재고 부족 알림: 제품 A', time: '1시간 전', icon: 'inventory' },
  { id: 4, type: 'quotation', message: '견적서 #QUO-003 승인', time: '2시간 전', icon: 'description' },
];

const Dashboard: React.FC = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalSales: 1250000,
    totalCustomers: 156,
    totalInvoices: 89,
    totalInventory: 234
  });

  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
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
              {value.toLocaleString()}
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
      p: 2 // 패딩을 3에서 2로 줄임
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        mb: 3, // 마진을 4에서 3으로 줄임
        p: 2, // 패딩을 3에서 2로 줄임
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        border: '1px solid #f1f5f9'
      }}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            fontWeight: 600,
            color: 'text.primary',
            mb: 1,
            fontSize: '1.25rem'
          }}>
            <DashboardIcon sx={{ fontSize: '1.25rem', color: 'primary.main' }} />
            대시보드
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {user?.role === 'root' ? 'Root Administrator' : user?.username}님, 안녕하세요! 오늘의 업무 현황을 확인해보세요.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
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
              <Refresh sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="더보기">
            <IconButton 
              size="small"
              sx={{ 
                backgroundColor: 'grey.50',
                '&:hover': { backgroundColor: 'grey.100' }
              }}
            >
              <MoreVert sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 대시보드 타입 선택 */}
      <Card sx={{ mb: 4, mx: 0 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ 
            mb: 3, 
            fontWeight: 600,
            color: 'text.primary'
          }}>
            대시보드 타입 선택
          </Typography>
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
              height: 3,
              borderRadius: '2px 2px 0 0'
            }
          }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab 
                label="개인 대시보드" 
                icon={<PersonIcon sx={{ fontSize: '1.125rem' }} />} 
                iconPosition="start"
                onClick={() => navigate('/dashboard/personal')}
                sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: 48,
                  '&.Mui-selected': {
                    color: 'primary.main'
                  }
                }}
              />
              <Tab 
                label="팀 대시보드" 
                icon={<GroupIcon sx={{ fontSize: '1.125rem' }} />} 
                iconPosition="start"
                onClick={() => navigate('/dashboard/team')}
                sx={{ 
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: 48,
                  '&.Mui-selected': {
                    color: 'primary.main'
                  }
                }}
              />
              {user?.role === 'root' || user?.role === 'admin' ? (
                <Tab 
                  label="관리자 대시보드" 
                  icon={<AdminPanelSettingsIcon sx={{ fontSize: '1.125rem' }} />} 
                  iconPosition="start"
                  onClick={() => navigate('/dashboard/admin')}
                  sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'none',
                    minHeight: 48,
                    '&.Mui-selected': {
                      color: 'primary.main'
                    }
                  }}
                />
              ) : null}
            </Tabs>
          </Box>
        </CardContent>
      </Card>

      {/* 주요 지표 */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)'
        },
        gap: 2, // 간격을 3에서 2로 줄임
        mb: 2, // 마진을 3에서 2로 줄임
        px: 0 // 패딩을 0으로 설정하여 카드들이 완전히 정렬되도록 함
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
          </CardContent>
        </Card>

        {/* 재고 현황 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Inventory color="primary" />
              재고 현황
            </Typography>
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