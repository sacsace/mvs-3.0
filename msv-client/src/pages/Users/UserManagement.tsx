import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { User, UserFormData } from '../../types';
import { apiService } from '../../services/api';

// 유효성 검사 스키마
const userSchema = yup.object({
  userid: yup.string().required('사용자 ID는 필수입니다'),
  username: yup.string().required('사용자명은 필수입니다'),
  email: yup.string().email('올바른 이메일 형식이 아닙니다').required('이메일은 필수입니다'),
  password: yup.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다').required('비밀번호는 필수입니다'),
  role: yup.string().oneOf(['root', 'audit', 'admin', 'user']).required('역할을 선택해주세요'),
  department: yup.string().required('부서는 필수입니다'),
  position: yup.string().required('직책은 필수입니다'),
  status: yup.string().oneOf(['active', 'inactive']).required('상태를 선택해주세요'),
  first_name: yup.string().required('이름은 필수입니다'),
  last_name: yup.string().required('성은 필수입니다'),
  personal_email: yup.string().email('올바른 이메일 형식이 아닙니다'),
  personal_phone: yup.string(),
  account_holder_name: yup.string(),
  bank_name: yup.string(),
  account_number: yup.string(),
  ifsc_code: yup.string(),
});

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: yupResolver(userSchema),
    defaultValues: {
      userid: '',
      username: '',
      email: '',
      password: '',
      role: 'user',
      department: '',
      position: '',
      status: 'active',
      mfa_enabled: false,
      preferences: {},
      first_name: '',
      last_name: '',
      middle_name: '',
      date_of_birth: '',
      gender: 'Male',
      nationality: '',
      marital_status: 'Single',
      blood_type: 'A+',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      personal_email: '',
      personal_phone: '',
      personal_address: '',
      profile_picture: '',
      bio: '',
      skills: [],
      languages: [],
      social_media: {},
      account_holder_name: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
    },
  });

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      setUsers(response.data.data);
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 추가
  const handleAddUser = async (data: UserFormData) => {
    try {
      await apiService.createUser(data);
      await fetchUsers();
      setIsAddModalOpen(false);
      reset();
    } catch (error) {
      console.error('사용자 추가 오류:', error);
    }
  };

  // 사용자 수정
  const handleUpdateUser = async (data: UserFormData) => {
    if (!selectedUser) return;
    
    try {
      await apiService.updateUser(selectedUser.id, data);
      await fetchUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
      reset();
    } catch (error) {
      console.error('사용자 수정 오류:', error);
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (id: number) => {
    if (window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      try {
        await apiService.deleteUser(id);
        await fetchUsers();
      } catch (error) {
        console.error('사용자 삭제 오류:', error);
      }
    }
  };

  // 필터링된 사용자 목록
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.userid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'root': return 'error';
      case 'audit': return 'warning';
      case 'admin': return 'primary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('users.title')}
      </Typography>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('users.userList')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('users.role')}</InputLabel>
                <Select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <MenuItem value="">{t('common.selectAll')}</MenuItem>
                  <MenuItem value="root">{t('roles.root')}</MenuItem>
                  <MenuItem value="audit">{t('roles.audit')}</MenuItem>
                  <MenuItem value="admin">{t('roles.admin')}</MenuItem>
                  <MenuItem value="user">{t('roles.user')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsAddModalOpen(true)}
                fullWidth
              >
                {t('users.addUser')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('users.userid')}</TableCell>
                  <TableCell>{t('users.username')}</TableCell>
                  <TableCell>{t('users.email')}</TableCell>
                  <TableCell>{t('users.role')}</TableCell>
                  <TableCell>{t('users.department')}</TableCell>
                  <TableCell>{t('users.position')}</TableCell>
                  <TableCell>{t('users.status')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {user.userid}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold">
                        {user.username}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role.toUpperCase()}
                        size="small"
                        color={getRoleColor(user.role) as any}
                      />
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.status === 'active' ? t('users.active') : t('users.inactive')}
                        color={getStatusColor(user.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditModalOpen(true);
                            reset({
                              ...user,
                              password: '', // 비밀번호는 수정 시 빈 값으로 설정
                            });
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(user.id)}
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
        </CardContent>
      </Card>

      {/* 사용자 추가/수정 모달 */}
      <Dialog
        open={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedUser(null);
          reset();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isAddModalOpen ? t('users.addUser') : t('users.editUser')}
        </DialogTitle>
        <form onSubmit={handleSubmit(isAddModalOpen ? handleAddUser : handleUpdateUser)}>
          <DialogContent>
            <Grid container spacing={2}>
              {/* 기본 정보 */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  {t('users.personalInfo')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="userid"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.userid')}
                      error={!!errors.userid}
                      helperText={errors.userid?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.username')}
                      error={!!errors.username}
                      helperText={errors.username?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.email')}
                      type="email"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('auth.password')}
                      type="password"
                      error={!!errors.password}
                      helperText={errors.password?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role}>
                      <InputLabel>{t('users.role')}</InputLabel>
                      <Select {...field}>
                        <MenuItem value="user">{t('roles.user')}</MenuItem>
                        <MenuItem value="admin">{t('roles.admin')}</MenuItem>
                        <MenuItem value="audit">{t('roles.audit')}</MenuItem>
                        <MenuItem value="root">{t('roles.root')}</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>{t('users.status')}</InputLabel>
                      <Select {...field}>
                        <MenuItem value="active">{t('users.active')}</MenuItem>
                        <MenuItem value="inactive">{t('users.inactive')}</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.department')}
                      error={!!errors.department}
                      helperText={errors.department?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.position')}
                      error={!!errors.position}
                      helperText={errors.position?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.firstName')}
                      error={!!errors.first_name}
                      helperText={errors.first_name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.lastName')}
                      error={!!errors.last_name}
                      helperText={errors.last_name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="personal_email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.personalEmail')}
                      type="email"
                      error={!!errors.personal_email}
                      helperText={errors.personal_email?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="personal_phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={t('users.personalPhone')}
                      error={!!errors.personal_phone}
                      helperText={errors.personal_phone?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="mfa_enabled"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      }
                      label={t('users.mfaEnabled')}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedUser(null);
              reset();
            }}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained">
              {isAddModalOpen ? t('common.add') : t('common.edit')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
