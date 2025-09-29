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
  Switch,
  FormControlLabel,
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
  Checkbox,
  Avatar,
  Tabs,
  Tab,
  InputAdornment,
  Divider,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon2,
  Delete as DeleteIcon2,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  company: string;
  department: string;
  avatar?: string;
}

interface Company {
  id: number;
  name: string;
  domain: string;
  userCount: number;
}

interface MenuPermission {
  read: boolean;
  write: boolean;
  delete: boolean;
}

interface UserPermission {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  company: string;
  permissions: {
    [key: string]: MenuPermission;
  };
}

const MenuPermissionManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserPermission | null>(null);

  const [users] = useState<User[]>([
    { id: 1, name: '김관리', email: 'admin@company.com', role: '관리자', company: 'ABC회사', department: '경영진' },
    { id: 2, name: '이부장', email: 'manager@company.com', role: '부서장', company: 'ABC회사', department: '개발팀' },
    { id: 3, name: '박대리', email: 'staff@company.com', role: '일반사원', company: 'ABC회사', department: '개발팀' },
    { id: 4, name: '최팀장', email: 'team@company.com', role: '팀장', company: 'XYZ회사', department: '마케팅팀' },
    { id: 5, name: '정사원', email: 'emp@company.com', role: '일반사원', company: 'XYZ회사', department: '영업팀' },
  ]);

  const [companies] = useState<Company[]>([
    { id: 1, name: 'ABC회사', domain: 'abc.com', userCount: 3 },
    { id: 2, name: 'XYZ회사', domain: 'xyz.com', userCount: 2 },
  ]);

  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([
    {
      id: 1,
      userId: 1,
      userName: '김관리',
      userRole: '관리자',
      company: 'ABC회사',
      permissions: {
        dashboard: { read: true, write: true, delete: true },
        company: { read: true, write: true, delete: true },
        partners: { read: true, write: true, delete: true },
        organization: { read: true, write: true, delete: true },
        menuPermission: { read: true, write: true, delete: true },
        systemSettings: { read: true, write: true, delete: true },
        hr: { read: true, write: true, delete: true },
        tasks: { read: true, write: true, delete: true },
        accounting: { read: true, write: true, delete: true },
        inventory: { read: true, write: true, delete: true },
        customers: { read: true, write: true, delete: true },
        ai: { read: true, write: true, delete: true },
        communication: { read: true, write: true, delete: true }
      }
    },
    {
      id: 2,
      userId: 2,
      userName: '이부장',
      userRole: '부서장',
      company: 'ABC회사',
      permissions: {
        dashboard: { read: true, write: true, delete: false },
        company: { read: true, write: false, delete: false },
        partners: { read: true, write: true, delete: false },
        organization: { read: true, write: false, delete: false },
        menuPermission: { read: false, write: false, delete: false },
        systemSettings: { read: false, write: false, delete: false },
        hr: { read: true, write: true, delete: false },
        tasks: { read: true, write: true, delete: true },
        accounting: { read: true, write: false, delete: false },
        inventory: { read: true, write: true, delete: false },
        customers: { read: true, write: true, delete: false },
        ai: { read: true, write: false, delete: false },
        communication: { read: true, write: true, delete: false }
      }
    },
    {
      id: 3,
      userId: 3,
      userName: '박대리',
      userRole: '일반사원',
      company: 'ABC회사',
      permissions: {
        dashboard: { read: true, write: false, delete: false },
        company: { read: true, write: false, delete: false },
        partners: { read: true, write: false, delete: false },
        organization: { read: true, write: false, delete: false },
        menuPermission: { read: false, write: false, delete: false },
        systemSettings: { read: false, write: false, delete: false },
        hr: { read: true, write: false, delete: false },
        tasks: { read: true, write: true, delete: false },
        accounting: { read: false, write: false, delete: false },
        inventory: { read: true, write: false, delete: false },
        customers: { read: true, write: false, delete: false },
        ai: { read: false, write: false, delete: false },
        communication: { read: true, write: true, delete: false }
      }
    },
    {
      id: 4,
      userId: 4,
      userName: '최팀장',
      userRole: '팀장',
      company: 'XYZ회사',
      permissions: {
        dashboard: { read: true, write: true, delete: false },
        company: { read: true, write: false, delete: false },
        partners: { read: true, write: true, delete: false },
        organization: { read: true, write: false, delete: false },
        menuPermission: { read: false, write: false, delete: false },
        systemSettings: { read: false, write: false, delete: false },
        hr: { read: true, write: true, delete: false },
        tasks: { read: true, write: true, delete: false },
        accounting: { read: true, write: false, delete: false },
        inventory: { read: true, write: true, delete: false },
        customers: { read: true, write: true, delete: false },
        ai: { read: true, write: false, delete: false },
        communication: { read: true, write: true, delete: false }
      }
    },
    {
      id: 5,
      userId: 5,
      userName: '정사원',
      userRole: '일반사원',
      company: 'XYZ회사',
      permissions: {
        dashboard: { read: true, write: false, delete: false },
        company: { read: true, write: false, delete: false },
        partners: { read: true, write: false, delete: false },
        organization: { read: true, write: false, delete: false },
        menuPermission: { read: false, write: false, delete: false },
        systemSettings: { read: false, write: false, delete: false },
        hr: { read: true, write: false, delete: false },
        tasks: { read: true, write: true, delete: false },
        accounting: { read: false, write: false, delete: false },
        inventory: { read: true, write: false, delete: false },
        customers: { read: true, write: false, delete: false },
        ai: { read: false, write: false, delete: false },
        communication: { read: true, write: true, delete: false }
      }
    }
  ]);

  const menuItems = [
    { key: 'dashboard', name: '대시보드', icon: '📊' },
    { key: 'company', name: '회사 정보', icon: '🏢' },
    { key: 'partners', name: '파트너 관리', icon: '🤝' },
    { key: 'organization', name: '조직도 관리', icon: '🏗️' },
    { key: 'menuPermission', name: '메뉴 권한', icon: '🔐' },
    { key: 'systemSettings', name: '시스템 설정', icon: '⚙️' },
    { key: 'hr', name: '인사관리', icon: '👥' },
    { key: 'tasks', name: '업무관리', icon: '📋' },
    { key: 'accounting', name: '회계관리', icon: '💰' },
    { key: 'inventory', name: '재고관리', icon: '📦' },
    { key: 'customers', name: '고객관리', icon: '👤' },
    { key: 'ai', name: 'AI 분석', icon: '🤖' },
    { key: 'communication', name: '커뮤니케이션', icon: '💬' }
  ];

  const handleEditUser = (userPermission: UserPermission) => {
    setSelectedUser(userPermission);
    setOpenDialog(true);
  };

  const handlePermissionChange = (userId: number, menuKey: string, permissionType: 'read' | 'write' | 'delete', value: boolean) => {
    setUserPermissions(userPermissions.map(up => 
      up.userId === userId 
        ? {
            ...up,
            permissions: {
              ...up.permissions,
              [menuKey]: {
                ...up.permissions[menuKey],
                [permissionType]: value
              }
            }
          }
        : up
    ));
  };

  const filteredUsers = userPermissions.filter(user => {
    const matchesSearch = user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.userRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = companyFilter === 'all' || user.company === companyFilter;
    const matchesRole = roleFilter === 'all' || user.userRole === roleFilter;
    return matchesSearch && matchesCompany && matchesRole;
  });

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? <CheckIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />;
  };

  const getPermissionChip = (hasPermission: boolean) => {
    return (
      <Chip
        icon={getPermissionIcon(hasPermission)}
        label={hasPermission ? '허용' : '차단'}
        color={hasPermission ? 'success' : 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Box sx={{ 
      width: '100%'
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SecurityIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          메뉴 권한 관리
        </Typography>
      </Box>

      {/* 탭 메뉴 */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<PersonIcon />} 
            label="사용자별 권한" 
            iconPosition="start"
          />
          <Tab 
            icon={<BusinessIcon />} 
            label="회사별 권한" 
            iconPosition="start"
          />
        </Tabs>
      </Card>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="사용자명, 역할, 회사로 검색..."
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
              <InputLabel>회사</InputLabel>
              <Select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                <MenuItem value="all">전체 회사</MenuItem>
                {companies.map(company => (
                  <MenuItem key={company.id} value={company.name}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>역할</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">전체 역할</MenuItem>
                <MenuItem value="관리자">관리자</MenuItem>
                <MenuItem value="부서장">부서장</MenuItem>
                <MenuItem value="팀장">팀장</MenuItem>
                <MenuItem value="일반사원">일반사원</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* 사용자별 권한 탭 */}
      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} />
              사용자별 메뉴 권한 ({filteredUsers.length}명)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>사용자</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>역할</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>회사</TableCell>
                    {menuItems.map((menu) => (
                      <TableCell key={menu.key} align="center" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '1.2rem' }}>
                            {menu.icon}
                          </Typography>
                          <Typography variant="caption">
                            {menu.name}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                            {user.userName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                              {user.userName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {user.userId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.userRole}
                          color={user.userRole === '관리자' ? 'error' : user.userRole === '부서장' ? 'warning' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <BusinessIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                          {user.company}
                        </Box>
                      </TableCell>
                      {menuItems.map((menu) => (
                        <TableCell key={menu.key} align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Tooltip title="읽기 권한">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <VisibilityIcon 
                                  sx={{ 
                                    fontSize: '1rem', 
                                    mr: 0.5,
                                    color: user.permissions[menu.key].read ? 'success.main' : 'text.disabled'
                                  }} 
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                  읽기
                                </Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title="쓰기 권한">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <EditIcon2 
                                  sx={{ 
                                    fontSize: '1rem', 
                                    mr: 0.5,
                                    color: user.permissions[menu.key].write ? 'success.main' : 'text.disabled'
                                  }} 
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                  쓰기
                                </Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title="삭제 권한">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DeleteIcon2 
                                  sx={{ 
                                    fontSize: '1rem', 
                                    mr: 0.5,
                                    color: user.permissions[menu.key].delete ? 'success.main' : 'text.disabled'
                                  }} 
                                />
                                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                  삭제
                                </Typography>
                              </Box>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      ))}
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 회사별 권한 탭 */}
      {activeTab === 1 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
          gap: 3 
        }}>
          {companies.map((company) => (
            <Card key={company.id}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {company.name}
                  </Typography>
                  <Chip 
                    label={`${company.userCount}명`} 
                    color="info" 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {menuItems.map((menu) => {
                    const companyUsers = userPermissions.filter(up => up.company === company.name);
                    const hasReadPermission = companyUsers.some(up => up.permissions[menu.key].read);
                    const hasWritePermission = companyUsers.some(up => up.permissions[menu.key].write);
                    const hasDeletePermission = companyUsers.some(up => up.permissions[menu.key].delete);
                    
                    return (
                      <Card key={menu.key} sx={{ minWidth: 200, mb: 1 }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: '1.2rem', mr: 1 }}>
                              {menu.icon}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {menu.name}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption">읽기</Typography>
                              {getPermissionChip(hasReadPermission)}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption">쓰기</Typography>
                              {getPermissionChip(hasWritePermission)}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption">삭제</Typography>
                              {getPermissionChip(hasDeletePermission)}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* 사용자 권한 수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedUser?.userName} 권한 설정
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, 
              gap: 3 
            }}>
              {menuItems.map((menu) => (
                <Card key={menu.key} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2" sx={{ fontSize: '1.2rem', mr: 1 }}>
                        {menu.icon}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        {menu.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedUser?.permissions[menu.key].read || false}
                            onChange={(e) => selectedUser && handlePermissionChange(selectedUser.userId, menu.key, 'read', e.target.checked)}
                          />
                        }
                        label="읽기 권한"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedUser?.permissions[menu.key].write || false}
                            onChange={(e) => selectedUser && handlePermissionChange(selectedUser.userId, menu.key, 'write', e.target.checked)}
                          />
                        }
                        label="쓰기 권한"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={selectedUser?.permissions[menu.key].delete || false}
                            onChange={(e) => selectedUser && handlePermissionChange(selectedUser.userId, menu.key, 'delete', e.target.checked)}
                          />
                        }
                        label="삭제 권한"
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
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

export default MenuPermissionManagement;
