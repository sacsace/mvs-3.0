import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
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
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Card,
  CardContent,
  TableSortLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  AccountCircle as AccountCircleIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  Download as DownloadIcon,
  FileDownload as FileDownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useStore } from '../../store';
import { api } from '../../services/api';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useTranslation } from 'react-i18next';

interface User {
  id: number;
  userid: string;
  username: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_payment_officer?: boolean;
  // 인사관리 필드
  employee_number?: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  hire_date?: string;
  employment_type?: 'fulltime' | 'contract' | 'parttime' | 'intern';
  salary?: number;
}

interface Company {
  id: number;
  name: string;
}

const UserManagement: React.FC = () => {
  const { user } = useStore();
  const { t } = useTranslation();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [showInactive, setShowInactive] = useState(false); // 비활성 사용자 표시 여부
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    // 기본 정보
    employee_number: '',
    username: '',
    birth_date: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
    // 인사 정보
    hire_date: '',
    department: '',
    position: '',
    employment_type: 'fulltime',
    salary: '',
    // 계정 정보
    userid: '',
    password: '',
    role: 'user',
    status: 'active',
    is_payment_officer: false,
    company_id: undefined as number | undefined
  } as {
    employee_number: string;
    username: string;
    birth_date: string;
    gender: string;
    phone: string;
    email: string;
    address: string;
    emergency_contact: string;
    emergency_phone: string;
    hire_date: string;
    department: string;
    position: string;
    employment_type: string;
    salary: string;
    userid: string;
    password: string;
    role: string;
    status: string;
    is_payment_officer: boolean;
    company_id?: number;
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get('/company');
      if (response.data && response.data.success) {
        const companiesData = Array.isArray(response.data.data) 
          ? response.data.data 
          : (response.data.data ? [response.data.data] : []);
        setCompanies(companiesData.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error('회사 목록 조회 오류:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔍 [사용자 관리] 사용자 목록 조회 시작');
      
      const params: any = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }
      
      const response = await api.get('/users', { params });
      console.log('🔍 [사용자 관리] API 응답:', {
        status: response.status,
        success: response.data?.success,
        dataType: Array.isArray(response.data?.data) ? 'array' : typeof response.data?.data,
        dataLength: Array.isArray(response.data?.data) ? response.data.data.length : (response.data?.data ? 1 : 0),
        fullResponse: response.data
      });
      
      if (response.data && response.data.success) {
        const usersData = Array.isArray(response.data.data) ? response.data.data : (response.data.data ? [response.data.data] : []);
        console.log('🔍 [사용자 관리] 설정할 사용자 개수:', usersData.length);
        console.log('🔍 [사용자 관리] 사용자 데이터 샘플:', usersData.slice(0, 3).map((u: any) => ({
          id: u.id,
          userid: u.userid,
          username: u.username,
          email: u.email
        })));
        setUsers(usersData);
      } else {
        console.error('❌ [사용자 관리] API 응답 실패:', response.data);
        setError(response.data?.message || t('userManagement.loadFailed'));
        setUsers([]);
      }
    } catch (error: any) {
      console.error('❌ [사용자 관리] 사용자 목록 조회 실패:', error);
      console.error('❌ [사용자 관리] 에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.message || error.message || t('userManagement.loadFailed');
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
      console.log('🔍 [사용자 관리] 로딩 완료');
    }
  }, [searchTerm, selectedCompanyId, user?.role]);

  useEffect(() => {
    fetchUsers();
    if (user?.role === 'root' || user?.role === 'audit') {
      fetchCompanies();
    }
  }, [fetchCompanies, fetchUsers, user?.role]);

  useEffect(() => {
    // 검색어나 회사 필터가 변경되면 사용자 목록 다시 조회
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300); // 디바운싱

    return () => clearTimeout(timer);
  }, [fetchUsers, searchTerm, selectedCompanyId]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      employee_number: '',
      username: '',
      birth_date: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
      hire_date: '',
      department: '',
      position: '',
      employment_type: 'fulltime',
      salary: '',
      userid: '',
      password: '',
      role: 'user',
      status: 'active',
    is_payment_officer: false,
    company_id: undefined
    } as any);
    setViewMode('create');
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      employee_number: (user as any).employee_number || '',
      username: user.username,
      birth_date: (user as any).birth_date || '',
      gender: (user as any).gender || '',
      phone: (user as any).phone || '',
      email: user.email,
      address: (user as any).address || '',
      emergency_contact: (user as any).emergency_contact || '',
      emergency_phone: (user as any).emergency_phone || '',
      hire_date: (user as any).hire_date || '',
      department: user.department || '',
      position: user.position || '',
      employment_type: (user as any).employment_type || 'fulltime',
      salary: (user as any).salary || '',
      userid: user.userid,
      password: '',
      role: user.role,
      status: (user as any).status || 'active',
      is_payment_officer: (user as any).is_payment_officer || false,
      company_id: undefined
    } as any);
    setViewMode('edit');
  };

  const handleDeleteUser = async (userId: number) => {
      showConfirm(
      t('userManagement.confirmDelete'),
      async () => {
        try {
          await api.delete(`/users/${userId}`);
          setSuccess(t('userManagement.userDeleted'));
          fetchUsers();
        } catch (error) {
          setError('사용자 삭제에 실패했습니다.');
        }
      },
      { confirmColor: 'error' }
    );
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setOpenViewDialog(true);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedUsers(filteredUsers.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      setError(t('userManagement.selectUsers'));
      return;
    }

    showConfirm(
      `정말로 선택한 ${selectedUsers.length}명의 사용자를 삭제하시겠습니까?`,
      async () => {
        try {
          await Promise.all(selectedUsers.map(userId => api.delete(`/users/${userId}`)));
          setSuccess(`${selectedUsers.length}명의 사용자가 삭제되었습니다.`);
          setSelectedUsers([]);
          fetchUsers();
        } catch (error) {
          setError('사용자 삭제에 실패했습니다.');
        }
      },
      { confirmColor: 'error' }
    );
  };

  // Excel 샘플 파일 다운로드
  const handleDownloadSample = async () => {
    try {
      const response = await api.get('/users/excel/sample', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `사용자_입력_샘플_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel 샘플 다운로드 오류:', error);
      setError('Excel 샘플 파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  // Excel 파일 내보내기
  const handleExportExcel = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCompanyId) params.company_id = selectedCompanyId;

      const response = await api.get('/users/excel/export', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `사용자_목록_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      setError('Excel 파일 내보내기 중 오류가 발생했습니다.');
    }
  };

  // Excel 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Excel 파일 가져오기
  const handleImportExcel = async () => {
    if (!importFile) {
      setError('Excel 파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    setImportLoading(true);
    setImportResult(null);

    try {
      const response = await api.post('/users/excel/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setImportResult(response.data.data);
      setSuccess(response.data.message);
      
      // 성공적으로 가져온 경우 사용자 목록 새로고침
      if (response.data.data.success.length > 0) {
        setTimeout(() => {
          fetchUsers();
          setImportDialogOpen(false);
          setImportFile(null);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Excel 가져오기 오류:', error);
      setError(error.response?.data?.message || 'Excel 파일 가져오기 중 오류가 발생했습니다.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // root가 회사를 선택하지 않은 경우 검증
      if (!editingUser && user?.role === 'root' && !(formData as any).company_id) {
        setError(t('userManagement.selectCompany'));
        return;
      }

      // 비밀번호가 없으면 기본값 설정 (신규 등록 시)
      const submitData: any = {
        ...formData,
        password: formData.password || (editingUser ? undefined : 'default123')
      };
      
      if (editingUser) {
        // 수정 시 비밀번호가 없으면 제외
        if (!submitData.password) {
          delete submitData.password;
        }
        await api.put(`/users/${editingUser.id}`, submitData);
        setSuccess(t('userManagement.userUpdated'));
      } else {
        // root가 다른 회사에 사용자를 등록하는 경우
        if (user?.role === 'root' && (formData as any).company_id) {
          submitData.company_id = (formData as any).company_id;
        }
        await api.post('/users', submitData);
        setSuccess(t('userManagement.userCreated'));
      }
      setViewMode('list');
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || '작업에 실패했습니다.');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'root': return 'error';
      case 'admin': return 'error';
      case 'user': return 'primary';
      case 'audit': return 'warning';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'root': return t('userManagement.roleRoot');
      case 'admin': return t('userManagement.roleAdmin');
      case 'user': return t('userManagement.roleUser');
      case 'audit': return t('userManagement.roleAudit');
      default: return role;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // 필터링된 사용자 목록 계산
  const filteredUsers = React.useMemo(() => {
    const filtered = users.filter(user => {
      // 기본적으로 inactive 사용자는 숨김
      if (!showInactive && user.status === 'inactive') {
        return false;
      }
      
      // 검색어 필터링
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.username.toLowerCase().includes(searchLower) ||
          user.userid.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.department && user.department.toLowerCase().includes(searchLower)) ||
          (user.position && user.position.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });

    // 정렬 처리
    if (orderBy) {
      return [...filtered].sort((a, b) => {
        let aValue: any = a[orderBy as keyof User];
        let bValue: any = b[orderBy as keyof User];
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue || '').toLowerCase();
        }
        
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [users, searchTerm, showInactive, orderBy, order]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>{t('userManagement.loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%'
    }}>
      {/* 상단 네비게이션 탭 */}
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              {t('userManagement.description')}
            </Typography>
          </Box>
          {viewMode === 'list' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadSample}
                sx={{ borderRadius: 2 }}
              >
                {t('userManagement.excelSample')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportExcel}
                sx={{ borderRadius: 2 }}
              >
                {t('userManagement.excelExport')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                {t('userManagement.excelImport')}
              </Button>
              {selectedUsers.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteSelected}
                  sx={{ borderRadius: 2 }}
                >
                  {t('userManagement.deleteSelected')} ({selectedUsers.length})
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* 탭 네비게이션 */}
        <Card sx={{ mb: 3 }}>
          <Tabs
            value={viewMode === 'list' ? 0 : 1}
            onChange={(e, newValue) => {
              if (newValue === 0) {
                setViewMode('list');
              } else if (newValue === 1) {
                handleCreateUser();
              }
            }}
          >
            <Tab label={t('userManagement.userList')} />
            <Tab label={t('userManagement.addUser')} />
          </Tabs>
        </Card>
      </Box>

      {/* 검색 및 필터 */}
      {viewMode === 'list' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder={t('userManagement.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                <PersonIcon fontSize="small" color="action" />
              </Box>
            )
          }}
        />
        {user?.role === 'root' && (
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value as number | '')}
              displayEmpty
            >
              <MenuItem value="">{t('userManagement.allCompanies')}</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            size="small"
          />
          <Typography variant="body2" sx={{ ml: -1, mr: 1 }}>
            {t('userManagement.includeInactive')}
          </Typography>
        </Box>
      </Box>
      )}

      {/* 알림 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* 사용자 테이블 */}
      {viewMode === 'list' && (
      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table
          size="small"
          sx={{
            '& .MuiTableHead-root .MuiTableCell-root': {
              py: 1.2
            },
            '& .MuiTableBody-root .MuiTableCell-root': {
              py: 0.95
            }
          }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length}
                  checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'username'}
                  direction={orderBy === 'username' ? order : 'asc'}
                  onClick={() => handleSort('username')}
                >
                  {t('userManagement.name')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'email'}
                  direction={orderBy === 'email' ? order : 'asc'}
                  onClick={() => handleSort('email')}
                >
                  {t('userManagement.email')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'role'}
                  direction={orderBy === 'role' ? order : 'asc'}
                  onClick={() => handleSort('role')}
                >
                  {t('userManagement.role')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'department'}
                  direction={orderBy === 'department' ? order : 'asc'}
                  onClick={() => handleSort('department')}
                >
                  {t('userManagement.department')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'position'}
                  direction={orderBy === 'position' ? order : 'asc'}
                  onClick={() => handleSort('position')}
                >
                  {t('userManagement.position')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  {t('userManagement.status')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'created_at'}
                  direction={orderBy === 'created_at' ? order : 'asc'}
                  onClick={() => handleSort('created_at')}
                >
                  생성일
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm || !showInactive 
                        ? (searchTerm ? t('userManagement.noSearchResults') : t('userManagement.noUsersToDisplay'))
                        : t('userManagement.noUsers')}
                    </Typography>
                    {!searchTerm && !showInactive && (
                      <Typography variant="body2" color="text.secondary">
                        {t('userManagement.noUsersIncludeInactive')}
                      </Typography>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleCreateUser}
                      sx={{ mt: 1 }}
                    >
                      {t('userManagement.addUser')}
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow 
                  key={user.id} 
                  hover
                  onClick={() => handleViewUser(user)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 1.75, width: 36, height: 36, bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.24 }}>
                          {user.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.24 }}>
                          {user.userid}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getRoleLabel(user.role)} 
                      color={getRoleColor(user.role) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>{user.position || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status} 
                      color={getStatusColor(user.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* 사용자 생성/편집 폼 (본문에 표시) */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                {editingUser ? '사용자 정보 수정' : '신규 사용자 등록'}
              </Typography>
              <Button onClick={() => {
                setViewMode('list');
                setEditingUser(null);
              }}>
                목록으로
              </Button>
            </Box>
            <form onSubmit={handleSubmit}>
              <Box sx={{ p: 3 }}>
              {/* 기본 정보 섹션 */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountCircleIcon color="primary" />
                    <Typography variant="h6">기본 정보</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2 
                  }}>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          사원번호
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.employee_number}
                          onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                          placeholder={editingUser ? "수정하려면 입력하세요" : "비워두면 자동 생성됩니다"}
                          helperText={!editingUser ? "회사명 약자와 시퀀스 번호로 자동 생성됩니다" : ""}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          이름 <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          required
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          생년월일
                        </Typography>
                        <TextField
                          fullWidth
                          type="date"
                          variant="outlined"
                          value={formData.birth_date}
                          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          성별
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value="">선택하세요</MenuItem>
                            <MenuItem value="male">남성</MenuItem>
                            <MenuItem value="female">여성</MenuItem>
                            <MenuItem value="other">기타</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          전화번호
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="010-1234-5678"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          이메일 <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <TextField
                          fullWidth
                          type="email"
                          variant="outlined"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </Box>
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          주소
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          multiline
                          rows={2}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          비상연락처 이름
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.emergency_contact}
                          onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                          placeholder="비상연락처 이름"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          비상연락처 전화번호
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.emergency_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                          placeholder="010-1234-5678"
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 인사 정보 섹션 */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkIcon color="primary" />
                    <Typography variant="h6">인사 정보</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2 
                  }}>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          입사일
                        </Typography>
                        <TextField
                          fullWidth
                          type="date"
                          variant="outlined"
                          value={formData.hire_date}
                          onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          근무형태
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.employment_type}
                            onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value="fulltime">정규직</MenuItem>
                            <MenuItem value="contract">계약직</MenuItem>
                            <MenuItem value="parttime">파트타임</MenuItem>
                            <MenuItem value="intern">인턴</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          부서
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="예: 개발팀, 영업팀"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          직급/직책
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          placeholder="예: 대리, 과장, 팀장"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          급여
                        </Typography>
                        <TextField
                          fullWidth
                          type="number"
                          variant="outlined"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                          placeholder="월 급여액"
                          InputProps={{
                            endAdornment: <Typography variant="body2" sx={{ mr: 1 }}>INR</Typography>
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 계정 정보 섹션 */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon color="primary" />
                    <Typography variant="h6">계정 정보</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2 
                  }}>
                    {user?.role === 'root' && !editingUser && (
                      <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                            회사 선택 <span style={{ color: 'red' }}>*</span>
                          </Typography>
                          <FormControl fullWidth>
                            <Select
                              value={(formData as any).company_id || ''}
                              onChange={(e) => setFormData({ ...formData, company_id: e.target.value as number })}
                              required
                            >
                              {companies.map((company) => (
                                <MenuItem key={company.id} value={company.id}>
                                  {company.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                    )}
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          사용자 ID <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.userid}
                          onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                          required
                          disabled={!!editingUser}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          비밀번호 {!editingUser && <span style={{ color: 'red' }}>*</span>}
                        </Typography>
                        <TextField
                          fullWidth
                          type="password"
                          variant="outlined"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={!editingUser}
                          placeholder={editingUser ? "변경 시에만 입력" : "비밀번호를 입력하세요"}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          역할 <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value="user">사용자</MenuItem>
                            <MenuItem value="admin">관리자</MenuItem>
                            <MenuItem value="audit">감사</MenuItem>
                            {user?.role === 'root' && (
                              <MenuItem value="root">Root</MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          상태
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value="active">활성</MenuItem>
                            <MenuItem value="inactive">비활성</MenuItem>
                            <MenuItem value="suspended">정지</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                          송금 담당자
                        </Typography>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean((formData as any).is_payment_officer)}
                              onChange={(e) => setFormData({ ...formData, is_payment_officer: e.target.checked })}
                            />
                          }
                          label="송금 담당자로 지정"
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={() => {
                  setViewMode('list');
                  setEditingUser(null);
                }}>
                  취소
                </Button>
                <Button type="submit" variant="contained" size="large">
                  {editingUser ? '수정' : '등록'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 사용자 상세 보기 다이얼로그 */}
      <Dialog 
        open={openViewDialog} 
        onClose={() => setOpenViewDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            사용자 상세 정보
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box>
              {/* 기본 정보 */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountCircleIcon color="primary" />
                    <Typography variant="h6">기본 정보</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2 
                  }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        사원번호
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).employee_number || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        이름
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedUser.username}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        생년월일
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).birth_date 
                          ? new Date((selectedUser as any).birth_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        성별
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).gender === 'male' ? '남성' : 
                         (selectedUser as any).gender === 'female' ? '여성' : 
                         (selectedUser as any).gender === 'other' ? '기타' : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        전화번호
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).phone || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        이메일
                      </Typography>
                      <Typography variant="body1">
                        {selectedUser.email}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        송금 담당자
                      </Typography>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={Boolean((selectedUser as any).is_payment_officer)}
                            disabled
                          />
                        }
                        label={(selectedUser as any).is_payment_officer ? '지정됨' : '미지정'}
                      />
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        주소
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).address || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        비상연락처 이름
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).emergency_contact || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        비상연락처 전화번호
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).emergency_phone || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 인사 정보 */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WorkIcon color="primary" />
                    <Typography variant="h6">인사 정보</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2 
                  }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        입사일
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).hire_date 
                          ? new Date((selectedUser as any).hire_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        근무형태
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).employment_type === 'fulltime' ? '정규직' :
                         (selectedUser as any).employment_type === 'contract' ? '계약직' :
                         (selectedUser as any).employment_type === 'parttime' ? '파트타임' :
                         (selectedUser as any).employment_type === 'intern' ? '인턴' : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        부서
                      </Typography>
                      <Typography variant="body1">
                        {selectedUser.department || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        직급/직책
                      </Typography>
                      <Typography variant="body1">
                        {selectedUser.position || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        급여
                      </Typography>
                      <Typography variant="body1">
                        {(selectedUser as any).salary 
                          ? `₹${(selectedUser as any).salary.toLocaleString()}`
                          : '-'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 계정 정보 */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon color="primary" />
                    <Typography variant="h6">계정 정보</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2 
                  }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        사용자 ID
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedUser.userid}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        역할
                      </Typography>
                      <Chip 
                        label={getRoleLabel(selectedUser.role)} 
                        color={getRoleColor(selectedUser.role) as any}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        상태
                      </Typography>
                      <Chip 
                        label={selectedUser.status} 
                        color={getStatusColor(selectedUser.status) as any}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        생성일
                      </Typography>
                      <Typography variant="body1">
                        {new Date(selectedUser.created_at).toLocaleDateString('ko-KR')}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)}>닫기</Button>
          {selectedUser && (
            <Button 
              variant="contained" 
              startIcon={<EditIcon />}
              onClick={() => {
                setOpenViewDialog(false);
                handleEditUser(selectedUser);
              }}
            >
              수정
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Excel 가져오기 다이얼로그 */}
      <Dialog 
        open={importDialogOpen} 
        onClose={() => {
          setImportDialogOpen(false);
          setImportFile(null);
          setImportResult(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Excel 파일 가져오기</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              style={{ marginBottom: 16 }}
            />
            {importFile && (
              <Alert severity="info" sx={{ mb: 2 }}>
                선택된 파일: {importFile.name}
              </Alert>
            )}
            {importResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  가져오기 결과
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  총 {importResult.total}건 중 {importResult.success.length}건 성공
                </Alert>
                {importResult.failed.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      실패: {importResult.failed.length}건
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
                      {importResult.failed.map((item: any, index: number) => (
                        <Alert key={index} severity="error" sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            행 {item.row}: {item.error}
                          </Typography>
                          {item.data && (
                            <Typography variant="caption" color="text.secondary">
                              사용자ID: {item.data['사용자ID']}, 이름: {item.data['이름']}
                            </Typography>
                          )}
                        </Alert>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setImportDialogOpen(false);
              setImportFile(null);
              setImportResult(null);
            }}
          >
            닫기
          </Button>
          <Button
            variant="contained"
            onClick={handleImportExcel} 
            disabled={!importFile || importLoading}
            startIcon={importLoading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            {importLoading ? '가져오는 중...' : '가져오기'}
          </Button>
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

export default UserManagement;
