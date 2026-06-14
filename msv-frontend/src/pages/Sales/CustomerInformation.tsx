import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  Tooltip,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  People as CustomerIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { api } from '../../services/api';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useMenuStore, useStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';

type CustomerStatus = 'active' | 'inactive';

interface Customer {
  id: number;
  name: string;
  business_number?: string;
  ceo_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  status: CustomerStatus | string;
  created_at?: string;
  updated_at?: string;
  source_type?: 'customer' | 'room_guest';
  source_booking_id?: number;
}

interface CustomerFormData {
  name: string;
  business_number: string;
  ceo_name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  industry: string;
  status: CustomerStatus | string;
}

const initialFormData: CustomerFormData = {
  name: '',
  business_number: '',
  ceo_name: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  industry: '',
  status: 'active'
};

const CUSTOMER_MENU_ROUTES = ['/customers/info', '/customers'];

const CustomerInformation: React.FC = () => {
  const { user } = useStore();
  const { language, menus, hasMenuPermission, loading: menusLoading } = useMenuStore();
  const txt = useCallback((ko: string, en: string) => (language === 'en' ? en : ko), [language]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'room_guest'>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  const elevated = user?.role === 'root' || user?.role === 'admin';
  const customerMenuFlags = useMemo(() => {
    const check = (action: 'view' | 'create' | 'edit' | 'delete') => {
      if (elevated) return true;
      for (const route of CUSTOMER_MENU_ROUTES) {
        const mid = findMenuIdByPath(menus, route);
        if (mid != null && hasMenuPermission(mid, action)) return true;
      }
      return false;
    };
    return {
      canCreate: check('create'),
      canEdit: check('edit'),
      canDelete: check('delete')
    };
  }, [menus, hasMenuPermission, elevated]);

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/customers');
      if (response.data?.success) {
        setCustomers(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setCustomers([]);
        setError(response.data?.message || txt('고객 정보를 불러오지 못했습니다.', 'Failed to load customers.'));
      }
    } catch (loadError: any) {
      setCustomers([]);
      setError(
        loadError.response?.data?.message ||
          txt('고객 정보를 불러오는 중 오류가 발생했습니다.', 'An error occurred while loading customers.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (menusLoading) return;
    void loadCustomers();
  }, [menusLoading]);

  const filteredCustomers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesKeyword =
        keyword.length === 0 ||
        customer.name?.toLowerCase().includes(keyword) ||
        customer.business_number?.toLowerCase().includes(keyword) ||
        customer.ceo_name?.toLowerCase().includes(keyword) ||
        customer.phone?.toLowerCase().includes(keyword) ||
        customer.email?.toLowerCase().includes(keyword);
      const normalizedStatus = customer.status === 'active' ? 'active' : 'inactive';
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'room_guest'
            ? customer.source_type === 'room_guest'
            : normalizedStatus === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((customer) => customer.status === 'active').length;
    const inactive = customers.filter((customer) => customer.status !== 'active').length;
    const withEmail = customers.filter((customer) => Boolean(customer.email)).length;
    return { total, active, inactive, withEmail };
  }, [customers]);

  const openCreateDialog = () => {
    if (!customerMenuFlags.canCreate) {
      setError(txt('고객을 등록할 권한이 없습니다.', 'You do not have permission to add customers.'));
      return;
    }
    setSelectedCustomer(null);
    setFormData(initialFormData);
    setOpenDialog(true);
  };

  const openEditDialog = (customer: Customer) => {
    if (!customerMenuFlags.canEdit) {
      setError(txt('고객 정보를 수정할 권한이 없습니다.', 'You do not have permission to edit customers.'));
      return;
    }
    if (customer.source_type === 'room_guest') {
      setError(
        txt(
          '숙박손님 정보는 예약 데이터에서 자동 표시되며 여기서 직접 수정할 수 없습니다.',
          'Guest records from reservations cannot be edited here.'
        )
      );
      return;
    }
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      business_number: customer.business_number || '',
      ceo_name: customer.ceo_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      website: customer.website || '',
      industry: customer.industry || '',
      status: customer.status === 'active' ? 'active' : 'inactive'
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (selectedCustomer && !customerMenuFlags.canEdit) {
      setError(txt('고객 정보를 수정할 권한이 없습니다.', 'You do not have permission to edit customers.'));
      return;
    }
    if (!selectedCustomer && !customerMenuFlags.canCreate) {
      setError(txt('고객을 등록할 권한이 없습니다.', 'You do not have permission to add customers.'));
      return;
    }
    if (!formData.name.trim()) {
      setError(txt('고객명은 필수입니다.', 'Customer name is required.'));
      return;
    }

    const payload = {
      name: formData.name.trim(),
      business_number: formData.business_number.trim() || undefined,
      ceo_name: formData.ceo_name.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      website: formData.website.trim() || undefined,
      industry: formData.industry.trim() || undefined,
      status: formData.status === 'active' ? 'active' : 'inactive'
    };

    setSaving(true);
    setError('');
    try {
      if (selectedCustomer) {
        const response = await api.put(`/customers/${selectedCustomer.id}`, payload);
        if (!response.data?.success) {
          throw new Error(response.data?.message || txt('고객 수정에 실패했습니다.', 'Failed to update customer.'));
        }
        setSuccess(txt('고객 정보가 수정되었습니다.', 'Customer updated.'));
      } else {
        const response = await api.post('/customers', payload);
        if (!response.data?.success) {
          throw new Error(response.data?.message || txt('고객 등록에 실패했습니다.', 'Failed to create customer.'));
        }
        setSuccess(txt('고객이 등록되었습니다.', 'Customer created.'));
      }
      setOpenDialog(false);
      await loadCustomers();
    } catch (saveError: any) {
      setError(
        saveError.response?.data?.message ||
          saveError.message ||
          txt('저장 중 오류가 발생했습니다.', 'An error occurred while saving.')
      );
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (id: number) => {
    setError('');
    try {
      const response = await api.delete(`/customers/${id}`);
      if (!response.data?.success) {
        throw new Error(response.data?.message || txt('고객 삭제에 실패했습니다.', 'Failed to delete customer.'));
      }
      setSuccess(txt('고객이 삭제되었습니다.', 'Customer deleted.'));
      await loadCustomers();
    } catch (deleteError: any) {
      setError(
        deleteError.response?.data?.message ||
          deleteError.message ||
          txt('삭제 중 오류가 발생했습니다.', 'An error occurred while deleting.')
      );
    }
  };

  const handleDelete = (id: number) => {
    if (!customerMenuFlags.canDelete) {
      setError(txt('고객을 삭제할 권한이 없습니다.', 'You do not have permission to delete customers.'));
      return;
    }
    const target = customers.find((row) => row.id === id);
    if (target?.source_type === 'room_guest') {
      setError(
        txt(
          '숙박손님 정보는 예약 데이터에서 자동 표시되며 여기서 직접 삭제할 수 없습니다.',
          'Guest records from reservations cannot be deleted here.'
        )
      );
      return;
    }
    showConfirm(
      txt('해당 고객을 삭제하시겠습니까?', 'Delete this customer?'),
      () => {
        void performDelete(id);
      },
      {
        title: txt('삭제 확인', 'Confirm delete'),
        confirmColor: 'error',
        confirmText: txt('삭제', 'Delete'),
        cancelText: txt('취소', 'Cancel')
      }
    );
  };

  const getStatusChip = (status: string) => {
    const active = status === 'active';
    return (
      <Chip
        size="small"
        label={active ? txt('활성', 'Active') : txt('비활성', 'Inactive')}
        sx={{
          height: 26,
          borderRadius: 9999,
          fontWeight: 600,
          fontSize: '0.75rem',
          bgcolor: active ? 'rgba(22, 163, 74, 0.12)' : '#F3F4F6',
          color: active ? '#15803D' : '#6B7280',
        }}
      />
    );
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ko-KR');
  };

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader title={txt('고객 정보 관리', 'Customer information')} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
        <Card variant="outlined" sx={{ borderRadius: '18px' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              {txt('총 고객', 'Total customers')}
            </Typography>
            <Typography sx={{ fontSize: '1.375rem', fontWeight: 700 }}>{stats.total}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: '18px' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              {txt('활성 고객', 'Active customers')}
            </Typography>
            <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, color: '#15803D' }}>{stats.active}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: '18px' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              {txt('비활성 고객', 'Inactive customers')}
            </Typography>
            <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, color: '#B45309' }}>{stats.inactive}</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: '18px' }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              {txt('이메일 등록 고객', 'With email on file')}
            </Typography>
            <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, color: '#1D4ED8' }}>{stats.withEmail}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3, borderRadius: '18px', bgcolor: '#F0F4F8', border: '1px solid #C5CED9', boxShadow: 'none' }} variant="outlined">
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1fr auto' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              label={txt('검색', 'Search')}
              placeholder={txt(
                '고객명, 사업자번호, 담당자, 연락처, 이메일 검색',
                'Search by name, business no., contact, phone, email'
              )}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
              sx={{ bgcolor: '#fff', borderRadius: '14px', '& .MuiInputBase-input::placeholder': { color: '#9CA3AF', opacity: 1 } }}
            />
            <FormControl fullWidth size="small">
              <InputLabel shrink>{txt('상태', 'Status')}</InputLabel>
              <Select
                label={txt('상태', 'Status')}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <MenuItem value="all">{txt('전체', 'All')}</MenuItem>
                <MenuItem value="active">{txt('활성', 'Active')}</MenuItem>
                <MenuItem value="inactive">{txt('비활성', 'Inactive')}</MenuItem>
                <MenuItem value="room_guest">{txt('숙박손님', 'Hotel guest')}</MenuItem>
              </Select>
            </FormControl>
            <Tooltip
              title={
                !customerMenuFlags.canCreate && !menusLoading
                  ? txt('등록 권한이 없습니다.', 'No permission to create.')
                  : ''
              }
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreateDialog}
                  disabled={menusLoading || !customerMenuFlags.canCreate}
                >
                  {txt('고객 추가', 'Add customer')}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: '20px', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead
              sx={{
                bgcolor: '#F8FAFC',
                '& .MuiTableCell-head': {
                  bgcolor: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                  letterSpacing: '0.02em',
                  borderBottom: '1px solid #EEF2F7',
                  borderTop: '2px solid',
                  borderTopColor: 'primary.main',
                  py: 1.5
                },
                '& .MuiTableCell-head:last-of-type': {
                  textAlign: 'center'
                }
              }}
            >
              <TableRow>
                <TableCell>{txt('고객명', 'Customer name')}</TableCell>
                <TableCell>{txt('사업자번호', 'Business no.')}</TableCell>
                <TableCell>{txt('담당자', 'Contact person')}</TableCell>
                <TableCell>{txt('연락처', 'Contact')}</TableCell>
                <TableCell sx={{ minWidth: 88, maxWidth: 140, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {txt('업종', 'Industry')}
                </TableCell>
                <TableCell>{txt('상태', 'Status')}</TableCell>
                <TableCell>{txt('등록일', 'Registered')}</TableCell>
                <TableCell>{txt('작업', 'Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress size={28} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography sx={{ py: 4, color: 'text.secondary' }}>
                      {txt('표시할 고객 정보가 없습니다.', 'No customers to display.')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography fontWeight={600}>{customer.name}</Typography>
                        {customer.source_type === 'room_guest' && (
                          <Chip size="small" label={txt('숙박손님', 'Hotel guest')} color="info" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{customer.business_number || '-'}</TableCell>
                    <TableCell>{customer.ceo_name || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon sx={{ fontSize: '1rem', color: 'text.secondary', flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>{customer.phone || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: '1rem', color: 'text.secondary', flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>{customer.email || '-'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 88, maxWidth: 160, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {customer.industry || '-'}
                    </TableCell>
                    <TableCell>{getStatusChip(customer.status)}</TableCell>
                    <TableCell>{formatDate(customer.created_at)}</TableCell>
                    <TableCell align="center">
                      {customer.source_type === 'room_guest' ? (
                        <Typography variant="caption" color="text.secondary">
                          {txt('예약연동', 'From booking')}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip
                            title={
                              !customerMenuFlags.canEdit && !menusLoading
                                ? txt('고객 정보를 수정할 권한이 없습니다.', 'No permission to edit customers.')
                                : txt('수정', 'Edit')
                            }
                            disableHoverListener={menusLoading || customerMenuFlags.canEdit}
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={menusLoading || !customerMenuFlags.canEdit}
                                onClick={() => openEditDialog(customer)}
                              >
                                <EditIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              !customerMenuFlags.canDelete && !menusLoading
                                ? txt('고객을 삭제할 권한이 없습니다.', 'No permission to delete customers.')
                                : txt('삭제', 'Delete')
                            }
                            disableHoverListener={menusLoading || customerMenuFlags.canDelete}
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={menusLoading || !customerMenuFlags.canDelete}
                                onClick={() => handleDelete(customer.id)}
                                sx={{
                                  color: '#94A3B8',
                                  '&:hover': { color: 'error.main', bgcolor: 'rgba(239, 68, 68, 0.08)' },
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCustomer ? txt('고객 정보 수정', 'Edit customer') : txt('고객 추가', 'Add customer')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label={txt('고객명 *', 'Customer name *')}
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              fullWidth
              required
            />
            <TextField
              label={txt('사업자번호', 'Business registration no.')}
              value={formData.business_number}
              onChange={(event) => setFormData({ ...formData, business_number: event.target.value })}
              fullWidth
            />
            <TextField
              label={txt('담당자', 'Contact person')}
              value={formData.ceo_name}
              onChange={(event) => setFormData({ ...formData, ceo_name: event.target.value })}
              fullWidth
            />
            <TextField
              label={txt('전화번호', 'Phone')}
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              fullWidth
            />
            <TextField
              label={txt('이메일', 'Email')}
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              fullWidth
            />
            <TextField
              label={txt('웹사이트', 'Website')}
              value={formData.website}
              onChange={(event) => setFormData({ ...formData, website: event.target.value })}
              fullWidth
            />
            <TextField
              label={txt('업종', 'Industry')}
              value={formData.industry}
              onChange={(event) => setFormData({ ...formData, industry: event.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>{txt('상태', 'Status')}</InputLabel>
              <Select
                label={txt('상태', 'Status')}
                value={formData.status}
                onChange={(event) => setFormData({ ...formData, status: event.target.value })}
              >
                <MenuItem value="active">{txt('활성', 'Active')}</MenuItem>
                <MenuItem value="inactive">{txt('비활성', 'Inactive')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={txt('주소', 'Address')}
              value={formData.address}
              onChange={(event) => setFormData({ ...formData, address: event.target.value })}
              fullWidth
              multiline
              minRows={2}
              sx={{ gridColumn: { sm: '1 / span 2' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>{txt('취소', 'Cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? txt('저장 중...', 'Saving...') : txt('저장', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerInformation;
