import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Avatar,
  Tooltip,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import { api } from '../../services/api';

interface Contract {
  id: number;
  customer_id: number | null;
  customer_name?: string;
  contract_number: string;
  title: string;
  description?: string;
  contract_type?: 'sales' | 'purchase_lease';
  contract_value: number;
  start_date: string;
  end_date: string;
  status: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: number;
  name: string;
  business_number?: string;
  ceo_name?: string;
  phone?: string;
  email?: string;
  industry?: string;
}

const ContractManagement: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contractTypeFilter, setContractTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 폼 데이터
  const [formData, setFormData] = useState({
    customer_id: '',
    contract_number: '',
    title: '',
    description: '',
    contract_value: '',
    contract_type: 'sales',
    start_date: '',
    end_date: '',
    status: 'active',
    attachments: [] as string[]
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/contracts');
      const rows = (response.data.data || []).map((row: any) => ({
        ...row,
        contract_type: row.contract_type || 'sales',
        contract_value: Number(row.contract_value ?? row.value ?? 0),
        attachments: Array.isArray(row.attachments) ? row.attachments : []
      }));
      setContracts(rows);
    } catch (error) {
      console.error('계약 목록 로드 오류:', error);
      showSnackbar('계약 목록을 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await api.get('/customers');
      const rows = (response.data.data || []).filter((customer: any) => {
        if (customer?.source_type && customer.source_type !== 'customer') return false;
        if (typeof customer?.id === 'number' && customer.id >= 1000000000) return false;
        return true;
      });
      setCustomers(rows);
    } catch (error) {
      console.error('고객 목록 로드 오류:', error);
    }
  }, []);

  useEffect(() => {
    loadContracts();
    loadCustomers();
  }, [loadContracts, loadCustomers]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilter = (event: any) => {
    setStatusFilter(event.target.value);
  };

  const handleDateFilter = (event: any) => {
    setDateFilter(event.target.value);
  };

  const handleContractTypeFilter = (event: any) => {
    setContractTypeFilter(event.target.value);
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesType = contractTypeFilter === 'all' || (contract.contract_type || 'sales') === contractTypeFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      
      switch (dateFilter) {
        case 'active':
          matchesDate = startDate <= now && endDate >= now;
          break;
        case 'expired':
          matchesDate = endDate < now;
          break;
        case 'upcoming':
          matchesDate = startDate > now;
          break;
        case 'expiring_soon':
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          matchesDate = endDate <= thirtyDaysFromNow && endDate >= now;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  const handleCreateContract = () => {
    setFormData({
      customer_id: '',
      contract_number: '',
      title: '',
      description: '',
      contract_value: '',
      contract_type: 'sales',
      start_date: '',
      end_date: '',
      status: 'active',
      attachments: []
    });
    setSelectedFiles([]);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEditContract = (contract: Contract) => {
    setFormData({
      customer_id: contract.customer_id ? contract.customer_id.toString() : '',
      contract_number: contract.contract_number,
      title: contract.title,
      description: contract.description || '',
      contract_value: contract.contract_value.toString(),
      contract_type: contract.contract_type || 'sales',
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: contract.status,
      attachments: Array.isArray(contract.attachments) ? contract.attachments : []
    });
    setSelectedFiles([]);
    setSelectedContract(contract);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleViewContract = (contract: Contract) => {
    setFormData({
      customer_id: contract.customer_id ? contract.customer_id.toString() : '',
      contract_number: contract.contract_number,
      title: contract.title,
      description: contract.description || '',
      contract_value: contract.contract_value.toString(),
      contract_type: contract.contract_type || 'sales',
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: contract.status,
      attachments: Array.isArray(contract.attachments) ? contract.attachments : []
    });
    setSelectedFiles([]);
    setSelectedContract(contract);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleSaveContract = async () => {
    try {
      const data = {
        ...formData,
        customer_id: formData.customer_id ? parseInt(formData.customer_id, 10) : null,
        contract_value: parseFloat(formData.contract_value),
        attachments: formData.attachments
      };

      if (dialogMode === 'create') {
        const createResponse = await api.post('/contracts', data);
        const createdContractId = createResponse.data?.data?.id;
        if (createdContractId && selectedFiles.length > 0) {
          const form = new FormData();
          selectedFiles.forEach((file) => form.append('files', file));
          await api.post(`/contracts/${createdContractId}/upload-files`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        showSnackbar('계약이 성공적으로 등록되었습니다.', 'success');
      } else if (dialogMode === 'edit' && selectedContract) {
        await api.put(`/contracts/${selectedContract.id}`, data);
        if (selectedFiles.length > 0) {
          const form = new FormData();
          selectedFiles.forEach((file) => form.append('files', file));
          await api.post(`/contracts/${selectedContract.id}/upload-files`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        showSnackbar('계약이 성공적으로 수정되었습니다.', 'success');
      }
      
      setDialogOpen(false);
      setSelectedFiles([]);
      loadContracts();
    } catch (error) {
      console.error('계약 저장 오류:', error);
      showSnackbar('계약 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteContract = async (contract: Contract) => {
    if (window.confirm(`'${contract.title}' 계약을 삭제하시겠습니까?`)) {
      try {
        await api.delete(`/contracts/${contract.id}`);
        showSnackbar('계약이 성공적으로 삭제되었습니다.', 'success');
        loadContracts();
      } catch (error) {
        console.error('계약 삭제 오류:', error);
        showSnackbar('계약 삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'expired': return 'error';
      case 'suspended': return 'warning';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'inactive': return '비활성';
      case 'expired': return '만료';
      case 'suspended': return '정지';
      default: return status;
    }
  };

  const getContractStatus = (contract: Contract) => {
    const now = new Date();
    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    
    if (endDate < now) return { status: 'expired', text: '만료됨', color: 'error' };
    if (startDate > now) return { status: 'upcoming', text: '시작 예정', color: 'info' };
    
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (endDate <= thirtyDaysFromNow) return { status: 'expiring_soon', text: '만료 임박', color: 'warning' };
    
    return { status: 'active', text: '진행중', color: 'success' };
  };

  const getTotalValue = () => {
    return contracts
      .filter(contract => contract.status === 'active')
      .reduce((sum, contract) => sum + contract.contract_value, 0);
  };

  const getActiveContracts = () => {
    return contracts.filter(contract => {
      const now = new Date();
      const startDate = new Date(contract.start_date);
      const endDate = new Date(contract.end_date);
      return startDate <= now && endDate >= now;
    }).length;
  };

  const getExpiringSoonContracts = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return contracts.filter(contract => {
      const endDate = new Date(contract.end_date);
      return endDate <= thirtyDaysFromNow && endDate >= now;
    }).length;
  };

  const getExpiredContracts = () => {
    const now = new Date();
    return contracts.filter(contract => {
      const endDate = new Date(contract.end_date);
      return endDate < now;
    }).length;
  };

  const uploadBaseUrl = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DescriptionIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            계약 관리
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadContracts}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateContract}
          >
            계약 등록
          </Button>
        </Box>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    총 계약 수
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {contracts.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <DescriptionIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    진행중 계약
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getActiveContracts()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    만료 임박
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {getExpiringSoonContracts()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <WarningIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    총 계약 가치
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Rs. {getTotalValue().toLocaleString()}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 검색 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder="계약명, 계약번호, 고객명으로 검색..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilter}
                  label="상태"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                  <MenuItem value="expired">만료</MenuItem>
                  <MenuItem value="suspended">정지</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>계약 구분</InputLabel>
                <Select
                  value={contractTypeFilter}
                  onChange={handleContractTypeFilter}
                  label="계약 구분"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="sales">매출 계약</MenuItem>
                  <MenuItem value="purchase_lease">매입(구매/임대)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>기간</InputLabel>
                <Select
                  value={dateFilter}
                  onChange={handleDateFilter}
                  label="기간"
                >
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="active">진행중</MenuItem>
                  <MenuItem value="expired">만료됨</MenuItem>
                  <MenuItem value="upcoming">시작 예정</MenuItem>
                  <MenuItem value="expiring_soon">만료 임박</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 계약 목록 테이블 */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>계약명</TableCell>
                  <TableCell>계약번호</TableCell>
                  <TableCell>고객</TableCell>
                  <TableCell>계약 구분</TableCell>
                  <TableCell>계약 가치</TableCell>
                  <TableCell>계약 기간</TableCell>
                  <TableCell>계약 상태</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>등록일</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const contractStatus = getContractStatus(contract);
                  return (
                    <TableRow
                      key={contract.id}
                      hover
                      onClick={() => handleViewContract(contract)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {contract.title}
                          </Typography>
                          {contract.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {contract.description.length > 50 
                                ? `${contract.description.substring(0, 50)}...` 
                                : contract.description}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FileCopyIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {contract.contract_number}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {contract.customer_name?.charAt(0) || 'C'}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {contract.customer_name || '고객 정보 없음'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={(contract.contract_type || 'sales') === 'sales' ? 'primary' : 'secondary'}
                          label={(contract.contract_type || 'sales') === 'sales' ? '매출 계약' : '매입(구매/임대)'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          Rs. {contract.contract_value.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="caption">
                              {new Date(contract.start_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="caption">
                              {new Date(contract.end_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={contractStatus.text}
                          color={contractStatus.color as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(contract.status)}
                          color={getStatusColor(contract.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(contract.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="수정">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditContract(contract);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="삭제">
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteContract(contract);
                              }}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 계약 등록/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' && '새 계약 등록'}
          {dialogMode === 'edit' && '계약 수정'}
          {dialogMode === 'view' && '계약 보기'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>고객(선택)</InputLabel>
                <Select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  label="고객(선택)"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="">일반 임대 계약(고객 없음)</MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {dialogMode === 'create' ? (
                <TextField
                  fullWidth
                  label="계약번호"
                  value="자동 생성"
                  disabled
                  helperText="등록 시 계약번호가 자동으로 생성됩니다."
                />
              ) : (
                <TextField
                  fullWidth
                  label="계약번호"
                  value={formData.contract_number}
                  disabled
                />
              )}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="계약명"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="계약 가치 (INR)"
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>계약 구분</InputLabel>
                <Select
                  value={formData.contract_type}
                  onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                  label="계약 구분"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="sales">매출 계약</MenuItem>
                  <MenuItem value="purchase_lease">매입(구매/임대)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="계약 시작일"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="계약 종료일"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={dialogMode === 'view'}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="상태"
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="active">활성</MenuItem>
                  <MenuItem value="inactive">비활성</MenuItem>
                  <MenuItem value="expired">만료</MenuItem>
                  <MenuItem value="suspended">정지</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="계약 설명"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant="outlined"
                component="label"
                disabled={dialogMode === 'view'}
              >
                계약서 파일 첨부
                <input
                  hidden
                  type="file"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    setSelectedFiles(files);
                  }}
                />
              </Button>
              {selectedFiles.length > 0 && (
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  선택 파일: {selectedFiles.map((file) => file.name).join(', ')}
                </Typography>
              )}
              {Array.isArray(formData.attachments) && formData.attachments.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">기존 첨부파일</Typography>
                  {formData.attachments.map((filePath) => (
                    <a
                      key={filePath}
                      href={`${uploadBaseUrl}/uploads/${filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {filePath.split('/').pop()}
                    </a>
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {dialogMode === 'view' ? '닫기' : '취소'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveContract} variant="contained">
              {dialogMode === 'create' ? '등록' : '수정'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractManagement;