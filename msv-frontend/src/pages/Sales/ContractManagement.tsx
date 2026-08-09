import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsKpiCardSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsTableScrollSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx,
} from '../../theme/mvsLayout';
import MuiLink from '@mui/material/Link';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { api } from '../../services/api';
import { useMenuStore, useStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

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

/** DB `menus.route` — `App.tsx`의 `/customers/contracts` */
const CONTRACT_MENU_ROUTES = ['/customers/contracts', '/sales', '/customers'];

const ContractManagement: React.FC = () => {
  const theme = useTheme();
  const { user } = useStore();
  const { language, menus, hasMenuPermission, loading: menusLoading } = useMenuStore();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const txt = useCallback((ko: string, en: string) => (language === 'en' ? en : ko), [language]);
  const dateLocale = language === 'en' ? 'en-US' : 'ko-KR';
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

  const elevated = user?.role === 'root' || user?.role === 'admin';
  const contractMenuFlags = useMemo(() => {
    const check = (action: 'view' | 'create' | 'edit' | 'delete') => {
      if (elevated) return true;
      for (const route of CONTRACT_MENU_ROUTES) {
        const mid = findMenuIdByPath(menus, route);
        if (mid != null && hasMenuPermission(mid, action)) return true;
      }
      return false;
    };
    return {
      canRead: check('view') || check('create'),
      canCreate: check('create'),
      canEdit: check('edit'),
      canDelete: check('delete')
    };
  }, [menus, hasMenuPermission, elevated]);

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
      showSnackbar(txt('계약 목록을 불러오는 중 오류가 발생했습니다.', 'Failed to load contracts.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [txt]);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await api.get('/customers');
      const rows = (response.data.data || []).filter((customer: any) => {
        if (customer?.source_type && customer.source_type !== 'customer') return false;
        if (typeof customer?.id === 'number' && customer.id >= 1000000000) return false;
        return true;
      });
      setCustomers(rows);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (menusLoading) return;
    void loadContracts();
    void loadCustomers();
  }, [menusLoading, loadContracts, loadCustomers]);

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
    if (!contractMenuFlags.canCreate) {
      showSnackbar(
        txt('계약을 등록할 권한이 없습니다.', 'You do not have permission to register contracts.'),
        'error'
      );
      return;
    }
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
    if (!contractMenuFlags.canEdit) {
      showSnackbar(txt('계약을 수정할 권한이 없습니다.', 'You do not have permission to edit contracts.'), 'error');
      return;
    }
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
    if (!contractMenuFlags.canRead) {
      showSnackbar(txt('계약을 조회할 권한이 없습니다.', 'You do not have permission to view contracts.'), 'error');
      return;
    }
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
    if (dialogMode === 'create' && !contractMenuFlags.canCreate) {
      showSnackbar(
        txt('계약을 등록할 권한이 없습니다.', 'You do not have permission to register contracts.'),
        'error'
      );
      return;
    }
    if (dialogMode === 'edit' && !contractMenuFlags.canEdit) {
      showSnackbar(txt('계약을 수정할 권한이 없습니다.', 'You do not have permission to edit contracts.'), 'error');
      return;
    }
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
        showSnackbar(txt('계약이 성공적으로 등록되었습니다.', 'Contract created.'), 'success');
      } else if (dialogMode === 'edit' && selectedContract) {
        await api.put(`/contracts/${selectedContract.id}`, data);
        if (selectedFiles.length > 0) {
          const form = new FormData();
          selectedFiles.forEach((file) => form.append('files', file));
          await api.post(`/contracts/${selectedContract.id}/upload-files`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        showSnackbar(txt('계약이 성공적으로 수정되었습니다.', 'Contract updated.'), 'success');
      }
      
      setDialogOpen(false);
      setSelectedFiles([]);
      loadContracts();
    } catch (error) {
      showSnackbar(txt('계약 저장 중 오류가 발생했습니다.', 'Failed to save contract.'), 'error');
    }
  };

  const handleDeleteContract = (contract: Contract) => {
    if (!contractMenuFlags.canDelete) {
      showSnackbar(txt('계약을 삭제할 권한이 없습니다.', 'You do not have permission to delete contracts.'), 'error');
      return;
    }
    showConfirm(
      txt(`'${contract.title}' 계약을 삭제하시겠습니까?`, `Delete contract '${contract.title}'?`),
      () => {
        void (async () => {
          try {
            await api.delete(`/contracts/${contract.id}`);
            showSnackbar(txt('계약이 성공적으로 삭제되었습니다.', 'Contract deleted.'), 'success');
            loadContracts();
          } catch (error) {
            showSnackbar(txt('계약 삭제 중 오류가 발생했습니다.', 'Failed to delete contract.'), 'error');
          }
        })();
      },
      {
        title: txt('삭제 확인', 'Confirm delete'),
        confirmColor: 'error',
        confirmText: txt('삭제', 'Delete'),
        cancelText: txt('취소', 'Cancel')
      }
    );
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
      case 'active':
        return txt('활성', 'Active');
      case 'inactive':
        return txt('비활성', 'Inactive');
      case 'expired':
        return txt('만료', 'Expired');
      case 'suspended':
        return txt('정지', 'Suspended');
      default:
        return status;
    }
  };

  const getContractStatus = (contract: Contract) => {
    const now = new Date();
    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);

    if (endDate < now) return { status: 'expired', text: txt('만료됨', 'Expired'), color: 'error' };
    if (startDate > now) return { status: 'upcoming', text: txt('시작 예정', 'Upcoming'), color: 'info' };

    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (endDate <= thirtyDaysFromNow)
      return { status: 'expiring_soon', text: txt('만료 임박', 'Expiring soon'), color: 'warning' };

    return { status: 'active', text: txt('진행중', 'In progress'), color: 'success' };
  };

  const contractTypeLabel = (type?: string) =>
    (type || 'sales') === 'sales'
      ? txt('매출 계약', 'Sales contract')
      : txt('매입(구매/임대)', 'Purchase / lease');

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

  const uploadBaseUrl = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

  const softChipSx = (tone: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary') => {
    const light = theme.palette.mode === 'light';
    if (tone === 'default') {
      return {
        height: 26,
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.6875rem',
        border: `1px solid ${light ? 'rgba(15, 23, 42, 0.12)' : theme.palette.divider}`,
        bgcolor: light ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.06),
        color: 'text.secondary',
      } as const;
    }
    const main =
      tone === 'primary'
        ? theme.palette.primary.main
        : tone === 'secondary'
          ? theme.palette.secondary.main
          : theme.palette[tone].main;
    const dark =
      tone === 'primary'
        ? theme.palette.primary.dark
        : tone === 'secondary'
          ? theme.palette.secondary.dark
          : theme.palette[tone].dark;
    return {
      height: 26,
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '0.6875rem',
      border: `1px solid ${alpha(main, light ? 0.3 : 0.42)}`,
      bgcolor: alpha(main, light ? 0.08 : 0.12),
      color: dark,
    } as const;
  };

  const lifecycleChipSx = (color: string) => {
    if (color === 'success') return softChipSx('success');
    if (color === 'warning') return softChipSx('warning');
    if (color === 'error') return softChipSx('error');
    if (color === 'info') return softChipSx('info');
    return softChipSx('default');
  };

  const contractFilterFieldSx = {
    ...mvsSearchFieldSx,
    ...mvsFilterFieldHeightSx,
  } as const;

  /** 계약 등록·수정 다이얼로그 — 입력 필 Apple 계열 톤 */
  const contractDialogFormSx = {
    color: 'text.primary',
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.1 : 0.05),
      transition: theme.transitions.create(['background-color', 'box-shadow'], { duration: 150 }),
      '&:hover': {
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.14 : 0.08),
      },
      '&.Mui-focused': {
        bgcolor: 'background.paper',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
      },
      '& fieldset': {
        borderColor: alpha(theme.palette.divider, 0.9),
      },
      '&.Mui-disabled': {
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.04),
      },
    },
    '& .MuiOutlinedInput-input::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
    '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
    '& .MuiFormHelperText-root': {
      mt: 0.75,
      letterSpacing: '-0.01em',
      color: 'text.secondary',
    },
  };

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={txt('계약 관리', 'Contract management')}
        actions={
          <>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
            onClick={() => void loadContracts()}
            disabled={loading || menusLoading || !contractMenuFlags.canRead}
            sx={mvsBodyOutlinedBtnSx}
          >
            {txt('새로고침', 'Refresh')}
          </Button>
          <Tooltip
            title={
              !contractMenuFlags.canCreate && !menusLoading
                ? txt('등록 권한이 없습니다.', 'No permission to create.')
                : ''
            }
          >
            <span>
              <Button
                variant="contained"
                color="primary"
                disableElevation
                startIcon={<AddIcon sx={{ fontSize: 20 }} />}
                onClick={handleCreateContract}
                disabled={menusLoading || !contractMenuFlags.canCreate}
                sx={mvsBodyPrimaryBtnSx}
              >
                {txt('계약 등록', 'Register contract')}
              </Button>
            </span>
          </Tooltip>
          </>
        }
      />

      {/* 통계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
                {txt('총 계약 수', 'Total contracts')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
                {contracts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
                {txt('진행중 계약', 'In progress')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'success.dark' }}>
                {getActiveContracts()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
                {txt('만료 임박', 'Expiring soon')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'warning.dark' }}>
                {getExpiringSoonContracts()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={mvsKpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1, letterSpacing: '0.02em' }}>
                {txt('총 계약 가치', 'Total contract value')}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
                Rs. {getTotalValue().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 검색 */}
      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            bgcolor: '#FFFFFF',
            ...contractFilterFieldSx,
          }}
        >
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label={txt('검색', 'Search')}
                placeholder={txt(
                  '계약명, 고객명으로 검색...',
                  'Search by title or customer…'
                )}
                value={searchTerm}
                onChange={handleSearch}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={contractFilterFieldSx}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small" sx={contractFilterFieldSx}>
                <InputLabel shrink>{txt('상태', 'Status')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilter}
                  label={txt('상태', 'Status')}
                >
                  <MenuItem value="all">{txt('전체', 'All')}</MenuItem>
                  <MenuItem value="active">{txt('활성', 'Active')}</MenuItem>
                  <MenuItem value="inactive">{txt('비활성', 'Inactive')}</MenuItem>
                  <MenuItem value="expired">{txt('만료', 'Expired')}</MenuItem>
                  <MenuItem value="suspended">{txt('정지', 'Suspended')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small" sx={contractFilterFieldSx}>
                <InputLabel shrink>{txt('계약 구분', 'Contract type')}</InputLabel>
                <Select
                  value={contractTypeFilter}
                  onChange={handleContractTypeFilter}
                  label={txt('계약 구분', 'Contract type')}
                >
                  <MenuItem value="all">{txt('전체', 'All')}</MenuItem>
                  <MenuItem value="sales">{txt('매출 계약', 'Sales contract')}</MenuItem>
                  <MenuItem value="purchase_lease">{txt('매입(구매/임대)', 'Purchase / lease')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small" sx={contractFilterFieldSx}>
                <InputLabel shrink>{txt('기간', 'Period')}</InputLabel>
                <Select
                  value={dateFilter}
                  onChange={handleDateFilter}
                  label={txt('기간', 'Period')}
                >
                  <MenuItem value="all">{txt('전체', 'All')}</MenuItem>
                  <MenuItem value="active">{txt('진행중', 'In progress')}</MenuItem>
                  <MenuItem value="expired">{txt('만료됨', 'Ended')}</MenuItem>
                  <MenuItem value="upcoming">{txt('시작 예정', 'Upcoming')}</MenuItem>
                  <MenuItem value="expiring_soon">{txt('만료 임박', 'Expiring soon')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* 계약 목록 테이블 */}
      <Box sx={mvsBodyListZoneSx}>
        <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
          <Table
            size="small"
            sx={{
              borderCollapse: 'collapse',
              bgcolor: 'transparent',
              '& .MuiTableCell-root': {
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
              },
            }}
          >
            <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  <TableCell>{txt('계약명', 'Title')}</TableCell>
                  <TableCell>{txt('고객', 'Customer')}</TableCell>
                  <TableCell>{txt('계약 구분', 'Type')}</TableCell>
                  <TableCell>{txt('계약 가치', 'Value')}</TableCell>
                  <TableCell>{txt('계약 기간', 'Period')}</TableCell>
                  <TableCell>{txt('계약 상태', 'Lifecycle')}</TableCell>
                  <TableCell>{txt('상태', 'Status')}</TableCell>
                  <TableCell>{txt('등록일', 'Created')}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{txt('작업', 'Actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={mvsTableBodyRowSx}>
                {filteredContracts.map((contract) => {
                  const contractStatus = getContractStatus(contract);
                  return (
                    <TableRow
                      key={contract.id}
                      onClick={contractMenuFlags.canRead ? () => handleViewContract(contract) : undefined}
                      sx={{ cursor: contractMenuFlags.canRead ? 'pointer' : 'default' }}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              bgcolor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.12),
                              color: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.75)' : theme.palette.grey[200],
                            }}
                          >
                            {contract.customer_name?.charAt(0) || 'C'}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {contract.customer_name || txt('고객 정보 없음', 'No customer')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={contractTypeLabel(contract.contract_type)}
                          sx={
                            (contract.contract_type || 'sales') === 'sales'
                              ? softChipSx('primary')
                              : softChipSx('secondary')
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          Rs. {contract.contract_value.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="caption">
                              {new Date(contract.start_date).toLocaleDateString(dateLocale)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="caption">
                              {new Date(contract.end_date).toLocaleDateString(dateLocale)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={contractStatus.text} size="small" sx={lifecycleChipSx(contractStatus.color)} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(contract.status)}
                          size="small"
                          sx={lifecycleChipSx(getStatusColor(contract.status))}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(contract.created_at).toLocaleDateString(dateLocale)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip
                            title={
                              !contractMenuFlags.canEdit && !menusLoading
                                ? txt('계약을 수정할 권한이 없습니다.', 'No permission to edit contracts.')
                                : txt('수정', 'Edit')
                            }
                            disableHoverListener={menusLoading || contractMenuFlags.canEdit}
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={menusLoading || !contractMenuFlags.canEdit}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEditContract(contract);
                                }}
                                sx={{
                                  color: 'text.secondary',
                                  borderRadius: '10px',
                                  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              !contractMenuFlags.canDelete && !menusLoading
                                ? txt('계약을 삭제할 권한이 없습니다.', 'No permission to delete contracts.')
                                : txt('삭제', 'Delete')
                            }
                            disableHoverListener={menusLoading || contractMenuFlags.canDelete}
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={menusLoading || !contractMenuFlags.canDelete}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteContract(contract);
                                }}
                                sx={{
                                  color: 'text.secondary',
                                  borderRadius: '10px',
                                  '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </TableContainer>
      </Box>

      {/* 계약 등록/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle
          sx={{
            pt: 2.5,
            px: 3,
            pb: 1.25,
            fontSize: '1.125rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          {dialogMode === 'create' && txt('새 계약 등록', 'New contract')}
          {dialogMode === 'edit' && txt('계약 수정', 'Edit contract')}
          {dialogMode === 'view' && txt('계약 보기', 'View contract')}
        </DialogTitle>
        <DialogContent
          sx={{
            px: 3,
            /* DialogTitle 다음 기본 paddingTop:0 을 덮어 라벨 노치 영역 확보 */
            pt: 2.5,
            pb: 2,
          }}
        >
          <Grid
            container
            spacing={{ xs: 2.25, sm: 2.75 }}
            sx={{ mt: 0, pt: 0.5, width: '100%', ...contractDialogFormSx }}
          >
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{txt('고객(선택)', 'Customer (optional)')}</InputLabel>
                <Select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  label={txt('고객(선택)', 'Customer (optional)')}
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="">
                    {txt('일반 임대 계약(고객 없음)', 'Lease without linked customer')}
                  </MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={txt('계약명', 'Title')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={txt('계약 가치 (INR)', 'Contract value (INR)')}
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{txt('계약 구분', 'Contract type')}</InputLabel>
                <Select
                  value={formData.contract_type}
                  onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                  label={txt('계약 구분', 'Contract type')}
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="sales">{txt('매출 계약', 'Sales contract')}</MenuItem>
                  <MenuItem value="purchase_lease">{txt('매입(구매/임대)', 'Purchase / lease')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label={txt('계약 시작일', 'Start date')}
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
                label={txt('계약 종료일', 'End date')}
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
                <InputLabel>{txt('상태', 'Status')}</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label={txt('상태', 'Status')}
                  disabled={dialogMode === 'view'}
                >
                  <MenuItem value="active">{txt('활성', 'Active')}</MenuItem>
                  <MenuItem value="inactive">{txt('비활성', 'Inactive')}</MenuItem>
                  <MenuItem value="expired">{txt('만료', 'Expired')}</MenuItem>
                  <MenuItem value="suspended">{txt('정지', 'Suspended')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={txt('계약 설명', 'Description')}
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
                color="inherit"
                component="label"
                startIcon={<AttachFileIcon sx={{ fontSize: 18 }} />}
                disabled={
                  dialogMode === 'view' ||
                  (dialogMode === 'create' && !contractMenuFlags.canCreate) ||
                  (dialogMode === 'edit' && !contractMenuFlags.canEdit)
                }
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderStyle: 'dashed',
                  borderColor: alpha(theme.palette.text.primary, 0.22),
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.04),
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.45),
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.06),
                  },
                }}
              >
                {txt('계약서 파일 첨부', 'Attach files')}
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
                <Typography variant="body2" sx={{ mt: 1.25, color: 'text.secondary', letterSpacing: '-0.01em' }}>
                  {txt('선택 파일:', 'Selected:')} {selectedFiles.map((file) => file.name).join(', ')}
                </Typography>
              )}
              {Array.isArray(formData.attachments) && formData.attachments.length > 0 && (
                <Box
                  sx={{
                    mt: 1.25,
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                    borderRadius: '8px',
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                    bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {txt('기존 첨부파일', 'Existing attachments')}
                  </Typography>
                  {formData.attachments.map((filePath) => (
                    <MuiLink
                      key={filePath}
                      href={`${uploadBaseUrl}/uploads/${filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      underline="hover"
                      sx={{ fontSize: '0.8125rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                    >
                      {filePath.split('/').pop()}
                    </MuiLink>
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
            gap: 1,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
          }}
        >
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => setDialogOpen(false)}
            sx={mvsBodyOutlinedBtnSx}
          >
            {dialogMode === 'view' ? txt('닫기', 'Close') : txt('취소', 'Cancel')}
          </Button>
          {dialogMode !== 'view' &&
            ((dialogMode === 'create' && contractMenuFlags.canCreate) ||
              (dialogMode === 'edit' && contractMenuFlags.canEdit)) && (
              <Button
                onClick={() => void handleSaveContract()}
                variant="contained"
                disableElevation
                sx={mvsBodyPrimaryBtnSx}
              >
                {dialogMode === 'create' ? txt('등록', 'Register') : txt('수정', 'Update')}
              </Button>
            )}
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