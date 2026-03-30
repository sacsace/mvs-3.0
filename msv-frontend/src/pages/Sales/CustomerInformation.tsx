import React, { useEffect, useMemo, useState } from 'react';
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
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
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

const CustomerInformation: React.FC = () => {
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

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/customers');
      if (response.data?.success) {
        setCustomers(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        setCustomers([]);
        setError(response.data?.message || '고객 정보를 불러오지 못했습니다.');
      }
    } catch (loadError: any) {
      setCustomers([]);
      setError(loadError.response?.data?.message || '고객 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

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
    setSelectedCustomer(null);
    setFormData(initialFormData);
    setOpenDialog(true);
  };

  const openEditDialog = (customer: Customer) => {
    if (customer.source_type === 'room_guest') {
      setError('숙박손님 정보는 예약 데이터에서 자동 표시되며 여기서 직접 수정할 수 없습니다.');
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
    if (!formData.name.trim()) {
      setError('고객명은 필수입니다.');
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
          throw new Error(response.data?.message || '고객 수정에 실패했습니다.');
        }
        setSuccess('고객 정보가 수정되었습니다.');
      } else {
        const response = await api.post('/customers', payload);
        if (!response.data?.success) {
          throw new Error(response.data?.message || '고객 등록에 실패했습니다.');
        }
        setSuccess('고객이 등록되었습니다.');
      }
      setOpenDialog(false);
      await loadCustomers();
    } catch (saveError: any) {
      setError(saveError.response?.data?.message || saveError.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (id: number) => {
    setError('');
    try {
      const response = await api.delete(`/customers/${id}`);
      if (!response.data?.success) {
        throw new Error(response.data?.message || '고객 삭제에 실패했습니다.');
      }
      setSuccess('고객이 삭제되었습니다.');
      await loadCustomers();
    } catch (deleteError: any) {
      setError(deleteError.response?.data?.message || deleteError.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = (id: number) => {
    const target = customers.find((row) => row.id === id);
    if (target?.source_type === 'room_guest') {
      setError('숙박손님 정보는 예약 데이터에서 자동 표시되며 여기서 직접 삭제할 수 없습니다.');
      return;
    }
    showConfirm(
      '해당 고객을 삭제하시겠습니까?',
      () => {
        void performDelete(id);
      },
      {
        title: '삭제 확인',
        confirmColor: 'error',
        confirmText: '삭제',
        cancelText: '취소'
      }
    );
  };

  const getStatusChip = (status: string) => {
    const value =
      status === 'active'
        ? { label: '활성', color: 'success' as const }
        : { label: '비활성', color: 'default' as const };
    return <Chip size="small" label={value.label} color={value.color} />;
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <Box sx={{ width: '100%', px: 2, py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CustomerIcon sx={{ mr: 2, fontSize: '2rem', color: 'primary.main' }} />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          고객 정보 관리
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>총 고객</Typography>
            <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>활성 고객</Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">{stats.active}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>비활성 고객</Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.inactive}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>이메일 등록 고객</Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">{stats.withEmail}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1fr auto' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="고객명, 사업자번호, 담당자, 연락처, 이메일 검색"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                label="상태"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
                <MenuItem value="room_guest">숙박손님</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              고객 추가
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>고객명</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>사업자번호</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>담당자</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>연락처</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>업종</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>등록일</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>작업</TableCell>
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
                    <Typography sx={{ py: 4, color: 'text.secondary' }}>표시할 고객 정보가 없습니다.</Typography>
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
                          <Chip size="small" label="숙박손님" color="info" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{customer.business_number || '-'}</TableCell>
                    <TableCell>{customer.ceo_name || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
                          <Typography variant="body2">{customer.phone || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
                          <Typography variant="body2">{customer.email || '-'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{customer.industry || '-'}</TableCell>
                    <TableCell>{getStatusChip(customer.status)}</TableCell>
                    <TableCell>{formatDate(customer.created_at)}</TableCell>
                    <TableCell align="center">
                      {customer.source_type === 'room_guest' ? (
                        <Typography variant="caption" color="text.secondary">
                          예약연동
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => openEditDialog(customer)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(customer.id)}>
                            <DeleteIcon />
                          </IconButton>
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
        <DialogTitle>{selectedCustomer ? '고객 정보 수정' : '고객 추가'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="고객명 *"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              fullWidth
              required
            />
            <TextField
              label="사업자번호"
              value={formData.business_number}
              onChange={(event) => setFormData({ ...formData, business_number: event.target.value })}
              fullWidth
            />
            <TextField
              label="담당자"
              value={formData.ceo_name}
              onChange={(event) => setFormData({ ...formData, ceo_name: event.target.value })}
              fullWidth
            />
            <TextField
              label="전화번호"
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              fullWidth
            />
            <TextField
              label="이메일"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              fullWidth
            />
            <TextField
              label="웹사이트"
              value={formData.website}
              onChange={(event) => setFormData({ ...formData, website: event.target.value })}
              fullWidth
            />
            <TextField
              label="업종"
              value={formData.industry}
              onChange={(event) => setFormData({ ...formData, industry: event.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                label="상태"
                value={formData.status}
                onChange={(event) => setFormData({ ...formData, status: event.target.value })}
              >
                <MenuItem value="active">활성</MenuItem>
                <MenuItem value="inactive">비활성</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="주소"
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
          <Button onClick={() => setOpenDialog(false)}>취소</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
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
