import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Download as DownloadIcon,
  FileDownload as FileDownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useStore, useMenuStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import { api, departmentService, userService } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { DepartmentManagementPanel } from '../HR/DepartmentManagement';
import { mvsPageDescriptionSx, mvsPageTitleSx } from '../../theme/mvsLayout';

const USER_MGMT_MENU_ROUTES = ['/hr/users', '/users'];

interface User {
  id: number;
  userid: string;
  username: string;
  email: string;
  role: string;
  department?: string;
  department_id?: number | null;
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
  employment_type?: 'fulltime' | 'contract' | 'parttime' | 'intern' | 'daily';
  salary?: number;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
}

interface Company {
  id: number;
  name: string;
}

/** 급여(INR): 소수 미표시, 천 단위 콤마 (예: ₹100,000) */
function formatSalaryInr(value: unknown): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
}

/** 계좌번호 저장값: 공백 제거 후 숫자만 */
function normalizeBankAccountDigits(raw: string): string {
  return String(raw ?? '')
    .replace(/\s/g, '')
    .replace(/\D/g, '');
}

/** 계좌번호 표시: 숫자 4자리마다 공백 */
function formatBankAccountDisplay(digitsOnly: string): string {
  const d = normalizeBankAccountDigits(digitsOnly);
  if (!d) return '';
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 4) {
    parts.push(d.slice(i, i + 4));
  }
  return parts.join(' ');
}

/** IFSC 저장값: 공백·특수문자 제거, 영숫자만, 대문자, 최대 11자(인도 표준) */
function normalizeIfsc(raw: string): string {
  return String(raw ?? '')
    .replace(/\s/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 11);
}

/** IFSC 표시: 4자리마다 공백 */
function formatIfscDisplay(stored: string): string {
  const s = normalizeIfsc(stored);
  if (!s) return '';
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += 4) {
    parts.push(s.slice(i, i + 4));
  }
  return parts.join(' ');
}

/** 전화번호 저장값: 공백 제거 후 숫자만, 최대 10자 */
function normalizePhoneDigits(raw: string): string {
  return String(raw ?? '')
    .replace(/\s/g, '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

/** 전화번호 표시: 10자리, 5+공백+5 (예: 12345 67890) */
function formatPhoneDisplay(digitsOnly: string): string {
  const d = normalizePhoneDigits(digitsOnly);
  if (!d) return '';
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

/** 생성/수정 폼 아코디언 — 구분선 최소화 */
function getAccordionFormSx(_theme: Theme) {
  return {
    '&:before': { display: 'none' },
    boxShadow: 'none',
    border: 'none',
    borderRadius: 0,
    mb: 0,
    bgcolor: 'transparent',
    overflow: 'visible' as const,
    '& .MuiAccordionSummary-root': {
      minHeight: 40,
      py: 0,
      px: 0,
      bgcolor: 'transparent',
      borderBottom: 'none',
      '&.Mui-expanded': { minHeight: 40 },
    },
    '& .MuiAccordionSummary-content': { my: 0.5 },
    '& .MuiAccordionDetails-root': {
      pt: 1.5,
      pb: 2.5,
      px: 0,
    },
    '&.MuiAccordion-root:not(:first-of-type)': {
      mt: 2.5,
    },
  };
}

const userFormSectionTitleSx = {
  fontSize: '0.9375rem',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: 'text.primary',
} as const;

const highlightPayrollFieldsSx = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 1.5,
  width: '100%',
  boxSizing: 'border-box' as const,
};

/** 부서·직책 행 */
const highlightDeptPositionRowSx = {
  width: '100%',
  boxSizing: 'border-box' as const,
};

/** 폼 필드 라벨 — 필터·검색 영역과 동일 토큰 */
const hrFieldLabelSx = {
  color: 'text.secondary',
  fontWeight: 600,
  mb: 0.5,
  display: 'block',
  fontSize: '0.75rem',
  lineHeight: '18px',
  minHeight: 18,
} as const;

const hrHintSx = {
  fontSize: '0.7rem',
  lineHeight: 1.35,
  display: 'block',
  mt: 0.375
} as const;

const highlightBankFieldsSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: 2,
  alignItems: 'flex-start',
  boxSizing: 'border-box' as const,
};

/** 폼 내 TextField·Select 공통 — 흰 배경·40px·#C5CED9 테두리 */
function getFormControlSurfaceSx(theme: Theme) {
  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: 'background.paper',
      transition: theme.transitions.create(['border-color', 'box-shadow'], { duration: 150 }),
      '&:not(.MuiInputBase-multiline)': { height: 40 },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#C5CED9',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#B8C4D0',
      },
      '& fieldset': {
        borderColor: '#C5CED9',
      },
      '&:hover fieldset': {
        borderColor: '#B8C4D0',
      },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
      },
    },
    '& .MuiInputBase-input:not(.MuiInputBase-inputMultiline)': { py: 0 },
    '& .MuiSelect-select': { display: 'flex', alignItems: 'center', py: '10px' },
    '& .MuiFormControl-root': { width: '100%' },
    '& .MuiFormHelperText-root': { mx: 0, mt: 0.5 },
  };
}

const UserManagement: React.FC = () => {
  const theme = useTheme();
  /** 사용자 상세 다이얼로그 — 필드 라벨·값 가독성 */
  const userDetailLabelSx = useMemo(
    () => ({
      mb: 0.5,
      fontWeight: 500 as const,
      color: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.85) : theme.palette.grey[800],
      fontSize: '0.8125rem'
    }),
    [theme]
  );
  const userDetailValueSx = useMemo(
    () => ({
      color: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.95) : alpha(theme.palette.text.primary, 0.92)
    }),
    [theme]
  );
  const userDetailSectionTitleSx = useMemo(
    () => ({
      fontWeight: 600 as const,
      fontSize: '1rem',
      color: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.92) : theme.palette.grey[900]
    }),
    [theme]
  );
  const { user } = useStore();
  const { menus, hasMenuPermission, loading: menusLoading } = useMenuStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const hrElevated = user?.role === 'root' || user?.role === 'admin';
  const userMgmtMenuFlags = useMemo(() => {
    const check = (action: 'view' | 'create' | 'edit' | 'delete') => {
      if (hrElevated) return true;
      for (const route of USER_MGMT_MENU_ROUTES) {
        const mid = findMenuIdByPath(menus, route);
        if (mid != null && hasMenuPermission(mid, action)) return true;
      }
      return false;
    };
    return {
      canView: check('view'),
      canCreate: check('create'),
      canEdit: check('edit'),
      canDelete: check('delete')
    };
  }, [menus, hasMenuPermission, user?.role]);
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';
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
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  /** 0: 사용자 목록, 1: 사용자 추가/수정 폼, 2: 부서 관리 */
  const [pageTab, setPageTab] = useState<0 | 1 | 2>(0);
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
    department_id: '' as number | '',
    position: '',
    employment_type: 'fulltime',
    salary: '',
    bank_name: '',
    bank_account: '',
    bank_ifsc: '',
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
    department_id: number | '';
    position: string;
    employment_type: string;
    salary: string;
    bank_name: string;
    bank_account: string;
    bank_ifsc: string;
    userid: string;
    password: string;
    role: string;
    status: string;
    is_payment_officer: boolean;
    company_id?: number;
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewEmployeeNumberLoading, setPreviewEmployeeNumberLoading] = useState(false);

  const fetchNextEmployeeNumber = useCallback(async (companyId?: number) => {
    if (user?.role === 'root' && !companyId) {
      setFormData((prev) => ({ ...prev, employee_number: '' }));
      return;
    }
    setPreviewEmployeeNumberLoading(true);
    try {
      const response = await userService.getNextEmployeeNumber(companyId);
      if (response?.success) {
        const nextNumber = response.data?.employee_number || '';
        setFormData((prev) => ({ ...prev, employee_number: nextNumber }));
      }
    } catch (err) {
      console.error('사원번호 미리보기 오류:', err);
    } finally {
      setPreviewEmployeeNumberLoading(false);
    }
  }, [user?.role]);

  const loginUserCompanyId = useMemo(() => {
    const id = user?.company_id;
    return id != null && id > 0 ? id : undefined;
  }, [user?.company_id]);

  const fetchCompanies = useCallback(async () => {
    try {
      const companiesData = await useReferenceDataStore.getState().fetchCompanies();
      setCompanies(companiesData.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('회사 목록 조회 오류:', error);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params: { search?: string; company_id?: number } = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      if ((user?.role === 'root' || user?.role === 'audit') && selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }

      const usersData = await useReferenceDataStore.getState().fetchUsers(params, true);
      setUsers(usersData);
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
          }
  }, [searchTerm, selectedCompanyId, user?.role]);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await departmentService.list(false);
      if (res.success && Array.isArray(res.data)) {
        setDepartments(
          (res.data as { id: number; name: string }[]).map((d) => ({ id: d.id, name: d.name }))
        );
      }
    } catch (e) {
      console.error('부서 목록:', e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    if (user?.role === 'root' || user?.role === 'audit') {
      fetchCompanies();
    }
  }, [fetchCompanies, fetchUsers, user?.role]);

  useEffect(() => {
    if (viewMode === 'create' || viewMode === 'edit') {
      void loadDepartments();
    }
  }, [viewMode, loadDepartments]);

  useEffect(() => {
    if (searchParams.get('tab') !== 'departments') return;
    if (menusLoading) return;
    if (!hrElevated && !userMgmtMenuFlags.canCreate) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('tab');
        return next;
      }, { replace: true });
      return;
    }
    setPageTab(2);
    setViewMode('list');
    setEditingUser(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('tab');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams, menusLoading, hrElevated, userMgmtMenuFlags.canCreate]);

  /** 메뉴 로드 후 권한 없는 탭에 머물러 있으면 목록으로 */
  useEffect(() => {
    if (menusLoading) return;
    if (pageTab === 1 && viewMode === 'create' && !hrElevated && !userMgmtMenuFlags.canCreate) {
      setPageTab(0);
      setViewMode('list');
      setEditingUser(null);
    }
    if (pageTab === 2 && !hrElevated && !userMgmtMenuFlags.canCreate) {
      setPageTab(0);
      setViewMode('list');
      setEditingUser(null);
    }
    if (pageTab === 0 && !hrElevated && !userMgmtMenuFlags.canView) {
      /* 목록 탭도 못 보면 API가 막히므로 안내만 — 다른 탭으로 보내지 않음 */
    }
  }, [menusLoading, pageTab, viewMode, hrElevated, userMgmtMenuFlags.canCreate, userMgmtMenuFlags.canView]);

  useEffect(() => {
    if (pageTab !== 1 || viewMode !== 'create' || editingUser) return;
    void fetchNextEmployeeNumber((formData as { company_id?: number }).company_id);
  }, [pageTab, viewMode, editingUser, (formData as { company_id?: number }).company_id, fetchNextEmployeeNumber]);

  useEffect(() => {
    // 검색어나 회사 필터가 변경되면 사용자 목록 다시 조회
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300); // 디바운싱

    return () => clearTimeout(timer);
  }, [fetchUsers, searchTerm, selectedCompanyId]);

  const handleCreateUser = () => {
    if (!hrElevated && !userMgmtMenuFlags.canCreate) {
      setError(t('userManagement.tabDisabledNoCreate'));
      return;
    }
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
      department_id: '' as number | '',
      position: '',
      employment_type: 'fulltime',
      salary: '',
      bank_name: '',
      bank_account: '',
      bank_ifsc: '',
      userid: '',
      password: '',
      role: 'user',
      status: 'active',
    is_payment_officer: false,
    company_id: loginUserCompanyId
    } as any);
    setPageTab(1);
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
      department_id:
        (user as any).department_id != null && (user as any).department_id !== ''
          ? Number((user as any).department_id)
          : ('' as number | ''),
      position: user.position || '',
      employment_type: (user as any).employment_type || 'fulltime',
      salary: (user as any).salary || '',
      bank_name: (user as any).bank_name || '',
      bank_account: normalizeBankAccountDigits((user as any).bank_account || ''),
      bank_ifsc: normalizeIfsc((user as any).bank_ifsc || ''),
      userid: user.userid,
      password: '',
      role: user.role,
      status: (user as any).status || 'active',
      is_payment_officer: (user as any).is_payment_officer || false,
      company_id: undefined
    } as any);
    setPageTab(1);
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
          setError(t('userManagement.deleteFailed'));
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
      t('userManagement.confirmDeleteSelectedBulk', { count: selectedUsers.length }),
      async () => {
        try {
          await Promise.all(selectedUsers.map(userId => api.delete(`/users/${userId}`)));
          setSuccess(t('userManagement.deleteSelectedSuccess', { count: selectedUsers.length }));
          setSelectedUsers([]);
          fetchUsers();
        } catch (error) {
          setError(t('userManagement.deleteFailed'));
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
      link.setAttribute('download', `${t('userManagement.excelSampleFilename')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel 샘플 다운로드 오류:', error);
      setError(t('userManagement.excelSampleDownloadError'));
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
      link.setAttribute('download', `${t('userManagement.excelExportFilename')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      setError(t('userManagement.excelExportError'));
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
      setError(t('userManagement.excelSelectFile'));
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
      setError(error.response?.data?.message || t('userManagement.excelImportError'));
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

      if (submitData.department_id === '' || submitData.department_id === undefined) {
        submitData.department_id = null;
      } else {
        submitData.department_id = Number(submitData.department_id);
      }

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
        submitData.employee_number = '';
        await api.post('/users', submitData);
        setSuccess(t('userManagement.userCreated'));
      }
      setPageTab(0);
      setViewMode('list');
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.message || t('userManagement.operationFailed'));
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('userManagement.statusActive');
      case 'inactive': return t('userManagement.statusInactive');
      case 'suspended': return t('userManagement.statusSuspended');
      default: return status;
    }
  };

  const getEmploymentTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'fulltime': return t('userManagement.empFulltime');
      case 'daily': return t('userManagement.empDaily');
      case 'contract': return t('userManagement.empContract');
      case 'parttime': return t('userManagement.empParttime');
      case 'intern': return t('userManagement.empIntern');
      default: return '-';
    }
  };

  const getGenderLabel = (g: string | undefined) => {
    switch (g) {
      case 'male': return t('userManagement.genderMale');
      case 'female': return t('userManagement.genderFemale');
      case 'other': return t('userManagement.genderOther');
      default: return '-';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'suspended': return 'warning';
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
      p: 0,
      backgroundColor: 'transparent',
      borderRadius: 0,
      minHeight: '100%',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    }}>
      {/* 상단 네비게이션 탭 */}
      {/* 헤더 */}
      <Box sx={{ mb: pageTab === 0 && viewMode === 'list' ? 3 : 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            mb: 2,
            minHeight: 40
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h1" sx={{ ...mvsPageTitleSx, mb: 0.75 }}>
              {t('userManagement.title')}
            </Typography>
            <Typography sx={mvsPageDescriptionSx}>
              {t('userManagement.description')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: 'flex-end',
              flexShrink: 0,
              maxWidth: { xs: '100%', sm: '55%' },
              visibility: pageTab === 0 && viewMode === 'list' ? 'visible' : 'hidden',
              pointerEvents: pageTab === 0 && viewMode === 'list' ? 'auto' : 'none'
            }}
          >
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadSample}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, borderColor: alpha(theme.palette.divider, 0.95) }}
            >
              {t('userManagement.excelSample')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportExcel}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, borderColor: alpha(theme.palette.divider, 0.95) }}
            >
              {t('userManagement.excelExport')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setImportDialogOpen(true)}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, borderColor: alpha(theme.palette.divider, 0.95) }}
            >
              {t('userManagement.excelImport')}
            </Button>
            {selectedUsers.length > 0 && (
              <Button
                variant="contained"
                color="error"
                disableElevation
                startIcon={<DeleteIcon />}
                onClick={handleDeleteSelected}
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
              >
                {t('userManagement.deleteSelected')} ({selectedUsers.length})
              </Button>
            )}
          </Box>
        </Box>

        {/* 탭 네비게이션 */}
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: '14px',
            border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.35 : 0.1)}`,
            boxShadow: '0 2px 14px rgba(15, 23, 42, 0.05)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={pageTab}
            sx={{
              minHeight: 48,
              px: 0.5,
              bgcolor: '#F0F4F8',
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: 'primary.main',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                minHeight: 48,
                letterSpacing: '-0.01em',
                color: 'text.secondary',
                transition: theme.transitions.create(['color', 'background-color'], { duration: 180 }),
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.common.white, 0.55),
                },
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
                bgcolor: '#FFFFFF',
              },
              '& .MuiTab-root.Mui-disabled': {
                color: 'text.disabled',
                fontWeight: 500,
              },
            }}
            onChange={(e, newValue) => {
              const v = newValue as 0 | 1 | 2;
              if (v === 0 && !menusLoading && !hrElevated && !userMgmtMenuFlags.canView) {
                return;
              }
              if (v === 1 && !menusLoading && !hrElevated && !userMgmtMenuFlags.canCreate) {
                return;
              }
              if (v === 2 && !menusLoading && !hrElevated && !userMgmtMenuFlags.canCreate) {
                return;
              }
              if (v === 1) {
                handleCreateUser();
                return;
              }
              setPageTab(v);
              if (v === 0) {
                setViewMode('list');
                setEditingUser(null);
              } else {
                setViewMode('list');
                setEditingUser(null);
              }
            }}
          >
            <Tab
              label={t('userManagement.userList')}
              disabled={!menusLoading && !hrElevated && !userMgmtMenuFlags.canView}
              title={
                !menusLoading && !hrElevated && !userMgmtMenuFlags.canView
                  ? t('userManagement.tabDisabledNoView')
                  : undefined
              }
            />
            <Tab
              label={t('userManagement.addUser')}
              disabled={!menusLoading && !hrElevated && !userMgmtMenuFlags.canCreate}
              title={
                !menusLoading && !hrElevated && !userMgmtMenuFlags.canCreate
                  ? t('userManagement.tabDisabledNoCreate')
                  : undefined
              }
            />
            <Tab
              label={t('userManagement.departmentTab')}
              disabled={!menusLoading && !hrElevated && !userMgmtMenuFlags.canCreate}
              title={
                !menusLoading && !hrElevated && !userMgmtMenuFlags.canCreate
                  ? t('userManagement.tabDisabledNoCreate')
                  : undefined
              }
            />
          </Tabs>
        </Card>
      </Box>

      {/* 검색 및 필터 */}
      {pageTab === 0 && viewMode === 'list' && (
      <Box sx={{ mb: 2, minHeight: 48 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md:
                user?.role === 'root'
                  ? 'minmax(0, 1fr) minmax(0, 1fr) auto'
                  : 'minmax(0, 1fr) auto',
            },
            gap: 2,
            alignItems: 'center',
          }}
        >
          <TextField
            placeholder={t('userManagement.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            sx={{
              minWidth: 0,
              '& .MuiOutlinedInput-root': { height: 40 },
            }}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  <PersonIcon fontSize="small" color="action" />
                </Box>
              ),
            }}
          />
          {user?.role === 'root' && (
            <FormControl fullWidth size="small" sx={{ minWidth: 0 }}>
              <Select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value as number | '')}
                displayEmpty
                sx={{
                  height: 40,
                  bgcolor: '#FFFFFF',
                  borderRadius: '12px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#C5CED9' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8C4D0' },
                }}
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
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, justifySelf: { xs: 'start', md: 'auto' } }}>
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
      {pageTab === 0 && viewMode === 'list' && (
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: 1,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Table
          size="small"
          sx={{
            fontSize: '0.8125rem',
            '& .MuiTableHead-root .MuiTableCell-root': {
              py: 1,
              px: 1,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.secondary',
              letterSpacing: '0.02em',
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.100'
            },
            '& .MuiTableBody-root .MuiTableCell-root': {
              py: 1.45,
              px: 1,
              fontSize: '0.8125rem',
              lineHeight: 1.45,
              verticalAlign: 'middle',
              borderBottom: '1px solid',
              borderColor: 'divider'
            },
            '& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root': {
              borderBottom: 'none'
            },
            '& .MuiTableSortLabel-root': { fontSize: 'inherit', fontWeight: 600 }
          }}
        >
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
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
                  {t('userManagement.createdAt')}
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
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Typography
                      component="div"
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0
                      }}
                    >
                      {user.username}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 220,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role) as any}
                      size="small"
                      sx={{
                        height: 22,
                        maxWidth: '100%',
                        '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' }
                      }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 120,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.secondary'
                    }}
                  >
                    {user.department || '—'}
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 120,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.secondary'
                    }}
                  >
                    {user.position || '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(user.status)}
                      color={getStatusColor(user.status) as any}
                      size="small"
                      sx={{
                        height: 22,
                        '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {new Date(user.created_at).toLocaleDateString(dateLocale)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* 부서 관리 (탭) */}
      {pageTab === 2 && (
        <DepartmentManagementPanel
          embedded
          canCreate={hrElevated || userMgmtMenuFlags.canCreate}
          canEdit={hrElevated || userMgmtMenuFlags.canEdit}
          canDelete={hrElevated || userMgmtMenuFlags.canDelete}
        />
      )}

      {/* 사용자 생성/편집 폼 (본문에 표시) */}
      {pageTab === 1 && (viewMode === 'create' || viewMode === 'edit') && (
        <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 2,
              mb: 2.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              component="h2"
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                lineHeight: 1.3,
              }}
            >
              {editingUser ? t('userManagement.editUserTitle') : t('userManagement.createUserTitle')}
            </Typography>
            <Button
              variant="text"
              onClick={() => {
                setPageTab(0);
                setViewMode('list');
                setEditingUser(null);
              }}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, color: 'primary.main', flexShrink: 0 }}
            >
              {t('userManagement.backToList')}
            </Button>
          </Box>
          <form onSubmit={handleSubmit}>
            <Box sx={getFormControlSurfaceSx(theme)}>
              {/* 기본 정보 섹션 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography component="h3" sx={userFormSectionTitleSx}>
                    {t('userManagement.sectionBasic')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2,
                  }}>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.employeeNumber')}
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={
                            previewEmployeeNumberLoading && !editingUser
                              ? t('common.loading')
                              : formData.employee_number
                          }
                          disabled
                          helperText={
                            !editingUser
                              ? user?.role === 'root' && !(formData as { company_id?: number }).company_id
                                ? t('userManagement.helperEmployeePending')
                                : t('userManagement.helperEmployeeAuto')
                              : ''
                          }
                          sx={{
                            '& .MuiInputBase-input.Mui-disabled': {
                              WebkitTextFillColor: theme.palette.text.primary,
                              color: 'text.primary',
                            },
                          }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.name')} <span style={{ color: 'red' }}>*</span>
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
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.dateOfBirth')}
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
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.gender')}
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value="">{t('userManagement.selectPlaceholder')}</MenuItem>
                            <MenuItem value="male">{t('userManagement.genderMale')}</MenuItem>
                            <MenuItem value="female">{t('userManagement.genderFemale')}</MenuItem>
                            <MenuItem value="other">{t('userManagement.genderOther')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.phoneNumber')}
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formatPhoneDisplay(formData.phone)}
                          onChange={(e) => setFormData({ ...formData, phone: normalizePhoneDigits(e.target.value) })}
                          placeholder={t('userManagement.phonePlaceholder')}
                          inputProps={{ inputMode: 'numeric', maxLength: 11, autoComplete: 'off' }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.email')} <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <TextField
                          fullWidth
                          type="email"
                          variant="outlined"
                          value={formData.email}
                          onChange={(e) => {
                            const email = e.target.value;
                            setFormData({
                              ...formData,
                              email,
                              ...(!editingUser ? { userid: email } : {})
                            });
                          }}
                          required
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.address')}
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.emergencyContactName')}
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formData.emergency_contact}
                          onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                          placeholder={t('userManagement.placeholderEmergencyName')}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.emergencyContactPhone')}
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={formatPhoneDisplay(formData.emergency_phone)}
                          onChange={(e) => setFormData({ ...formData, emergency_phone: normalizePhoneDigits(e.target.value) })}
                          placeholder={t('userManagement.phonePlaceholder')}
                          inputProps={{ inputMode: 'numeric', maxLength: 11, autoComplete: 'off' }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 인사 정보 섹션 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography component="h3" sx={userFormSectionTitleSx}>
                    {t('userManagement.sectionHr')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="caption" sx={hrFieldLabelSx}>{t('userManagement.hireDate')}</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        variant="outlined"
                        value={formData.hire_date}
                        onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box
                      sx={{
                        ...highlightPayrollFieldsSx,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* 1행: 근무형태 | 급여 */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                          gap: 1,
                          alignItems: 'start',
                          width: '100%'
                        }}
                      >
                        <Box sx={{ width: '100%', minWidth: 0 }}>
                          <Typography variant="caption" sx={hrFieldLabelSx}>{t('userManagement.employmentType')}</Typography>
                          <FormControl fullWidth size="small">
                            <Select
                              value={formData.employment_type}
                              onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                              displayEmpty
                              MenuProps={{
                                PaperProps: {
                                  sx: { maxHeight: 320, '& .MuiMenuItem-root': { fontSize: '0.8125rem' } }
                                },
                                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                                transformOrigin: { vertical: 'top', horizontal: 'left' }
                              }}
                            >
                              <MenuItem value="fulltime">{t('userManagement.empFulltime')}</MenuItem>
                              <MenuItem value="daily">{t('userManagement.empDaily')}</MenuItem>
                              <MenuItem value="contract">{t('userManagement.empContract')}</MenuItem>
                              <MenuItem value="parttime">{t('userManagement.empParttime')}</MenuItem>
                              <MenuItem value="intern">{t('userManagement.empIntern')}</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                        <Box sx={{ width: '100%', minWidth: 0 }}>
                          <Typography variant="caption" sx={hrFieldLabelSx}>{t('userManagement.salary')}</Typography>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            variant="outlined"
                            value={formData.salary}
                            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                            placeholder={t('userManagement.placeholderMonthlySalary')}
                            InputProps={{
                              endAdornment: (
                                <Typography sx={{ fontSize: '0.75rem', mr: 0.75 }}>INR</Typography>
                              )
                            }}
                          />
                        </Box>
                      </Box>
                      {/* 2행: 부서 | 직책 — 하이라이트 */}
                      <Box sx={{ ...highlightDeptPositionRowSx }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                            gap: 1,
                            alignItems: 'start',
                            width: '100%'
                          }}
                        >
                          <Box sx={{ width: '100%', minWidth: 0 }}>
                            <Typography variant="caption" sx={hrFieldLabelSx}>{t('userManagement.department')}</Typography>
                            <FormControl fullWidth size="small">
                              <Select
                                value={formData.department_id === '' ? '' : String(formData.department_id)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '') {
                                    setFormData({ ...formData, department_id: '', department: '' });
                                  } else {
                                    const id = Number(v);
                                    const d = departments.find((x) => x.id === id);
                                    setFormData({
                                      ...formData,
                                      department_id: id,
                                      department: d?.name || ''
                                    });
                                  }
                                }}
                                displayEmpty
                                renderValue={(selected) => {
                                  if (selected === '') {
                                    return (
                                      <Typography component="span" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.8125rem' }}>
                                        {t('departmentManagement.noDepartment')}
                                      </Typography>
                                    );
                                  }
                                  const d = departments.find((x) => String(x.id) === selected);
                                  return d?.name ?? '';
                                }}
                                MenuProps={{
                                  PaperProps: {
                                    sx: { maxHeight: 320, '& .MuiMenuItem-root': { fontSize: '0.8125rem' } }
                                  },
                                  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                                  transformOrigin: { vertical: 'top', horizontal: 'left' }
                                }}
                              >
                                <MenuItem value="">
                                  <em>{t('departmentManagement.noDepartment')}</em>
                                </MenuItem>
                                {departments.map((d) => (
                                  <MenuItem key={d.id} value={String(d.id)}>
                                    {d.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Typography color="text.secondary" sx={hrHintSx}>
                              {t('userManagement.deptFromMasterHint')}
                            </Typography>
                          </Box>
                          <Box sx={{ width: '100%', minWidth: 0 }}>
                            <Typography variant="caption" sx={hrFieldLabelSx}>{t('userManagement.positionTitle')}</Typography>
                            <TextField
                              fullWidth
                              size="small"
                              variant="outlined"
                              value={formData.position}
                              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                              placeholder={t('userManagement.positionPlaceholder')}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 개인 은행 계좌 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography component="h3" sx={userFormSectionTitleSx}>
                    {t('userManagement.sectionBank')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={highlightBankFieldsSx}>
                    <Box sx={{ width: '100%', minWidth: 0 }}>
                      <Typography variant="caption" sx={hrFieldLabelSx}>
                        {t('userManagement.bankName')}
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder={t('userManagement.bankNamePlaceholder')}
                      />
                    </Box>
                    <Box sx={{ width: '100%', minWidth: 0 }}>
                      <Typography variant="caption" sx={hrFieldLabelSx}>
                        {t('userManagement.accountNumber')}
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={formatBankAccountDisplay(formData.bank_account)}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bank_account: normalizeBankAccountDigits(e.target.value)
                          })
                        }
                        placeholder={t('userManagement.accountPlaceholder')}
                        inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
                      />
                    </Box>
                    <Box sx={{ width: '100%', minWidth: 0 }}>
                      <Typography variant="caption" sx={hrFieldLabelSx}>
                        {t('userManagement.ifscCode')}
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={formatIfscDisplay(formData.bank_ifsc)}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bank_ifsc: normalizeIfsc(e.target.value)
                          })
                        }
                        placeholder={t('userManagement.ifscPlaceholder')}
                        inputProps={{ maxLength: 14, autoComplete: 'off' }}
                      />
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 계정 정보 섹션 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography component="h3" sx={userFormSectionTitleSx}>
                    {t('userManagement.sectionAccount')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2,
                  }}>
                    {user?.role === 'root' && !editingUser && (
                      <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                        <Box>
                          <Typography variant="caption" sx={hrFieldLabelSx}>
                            {t('userManagement.companySelect')} <span style={{ color: 'red' }}>*</span>
                          </Typography>
                          <FormControl fullWidth>
                            <Select
                              value={(formData as any).company_id || ''}
                              onChange={(e) => {
                                const company_id = e.target.value as number;
                                setFormData({ ...formData, company_id });
                              }}
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
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.userId')} <span style={{ color: 'red' }}>*</span>
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
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.password')} {!editingUser && <span style={{ color: 'red' }}>*</span>}
                        </Typography>
                        <TextField
                          fullWidth
                          type="password"
                          variant="outlined"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={!editingUser}
                          placeholder={editingUser ? t('userManagement.passwordPlaceholderEdit') : t('userManagement.passwordPlaceholderNew')}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.roleLabel')} <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value="user">{t('userManagement.roleUser')}</MenuItem>
                            <MenuItem value="admin">{t('userManagement.roleAdmin')}</MenuItem>
                            <MenuItem value="audit">{t('userManagement.roleAudit')}</MenuItem>
                            {user?.role === 'root' && (
                              <MenuItem value="root">Root</MenuItem>
                            )}
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.statusLabel')}
                        </Typography>
                        <FormControl fullWidth>
                          <Select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            displayEmpty
                          >
                            <MenuItem value="active">{t('userManagement.statusActive')}</MenuItem>
                            <MenuItem value="inactive">{t('userManagement.statusInactive')}</MenuItem>
                            <MenuItem value="suspended">{t('userManagement.statusSuspended')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    <Box>
                      <Box>
                        <Typography variant="caption" sx={hrFieldLabelSx}>
                          {t('userManagement.paymentOfficer')}
                        </Typography>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean((formData as any).is_payment_officer)}
                              onChange={(e) => setFormData({ ...formData, is_payment_officer: e.target.checked })}
                            />
                          }
                          label={t('userManagement.paymentOfficerAssign')}
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3, pt: 1 }}>
                <Button
                  onClick={() => {
                    setPageTab(0);
                    setViewMode('list');
                    setEditingUser(null);
                  }}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.25 }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="contained" disableElevation size="large" sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 3 }}>
                  {editingUser ? t('userManagement.submitEdit') : t('userManagement.submitRegister')}
                </Button>
              </Box>
            </form>
        </Box>
      )}

      {/* 사용자 상세 보기 다이얼로그 */}
      <Dialog 
        open={openViewDialog} 
        onClose={() => setOpenViewDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh', borderRadius: '20px' }
        }}
      >
        <DialogTitle sx={{ pt: 2.5, px: 3, pb: 1.5 }}>
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: '1.125rem',
              letterSpacing: '-0.02em',
              color:
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.white, 0.95)
                  : theme.palette.grey[900],
            }}
          >
            {t('userManagement.userDetailTitle')}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box>
              {/* 기본 정보 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={userDetailSectionTitleSx}>
                    {t('userManagement.sectionBasic')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2.25,
                  }}>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.employeeNumber')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).employee_number || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.name')}
                      </Typography>
                      <Typography variant="body1" sx={{ ...userDetailValueSx, fontWeight: 600 }}>
                        {selectedUser.username}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.dateOfBirth')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).birth_date 
                          ? new Date((selectedUser as any).birth_date).toLocaleDateString(dateLocale)
                          : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.gender')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {getGenderLabel((selectedUser as any).gender)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.phoneNumber')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {formatPhoneDisplay((selectedUser as any).phone || '') || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.email')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {selectedUser.email}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.paymentOfficer')}
                      </Typography>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={Boolean((selectedUser as any).is_payment_officer)}
                            disabled
                          />
                        }
                        label={(selectedUser as any).is_payment_officer ? t('userManagement.paymentOfficerAssigned') : t('userManagement.paymentOfficerNotAssigned')}
                      />
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.address')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).address || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.emergencyContactName')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).emergency_contact || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.emergencyContactPhone')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {formatPhoneDisplay((selectedUser as any).emergency_phone || '') || '-'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 인사 정보 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={userDetailSectionTitleSx}>
                    {t('userManagement.sectionHr')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2.25,
                  }}>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.hireDate')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).hire_date 
                          ? new Date((selectedUser as any).hire_date).toLocaleDateString(dateLocale)
                          : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.employmentType')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {getEmploymentTypeLabel((selectedUser as any).employment_type)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.department')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {selectedUser.department || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.positionTitle')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {selectedUser.position || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.salary')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).salary != null && (selectedUser as any).salary !== ''
                          ? formatSalaryInr((selectedUser as any).salary)
                          : '-'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 개인 은행 계좌 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={userDetailSectionTitleSx}>
                    {t('userManagement.sectionBank')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 2.25,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.bankName')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>{(selectedUser as any).bank_name || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.accountNumber')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).bank_account
                          ? formatBankAccountDisplay(String((selectedUser as any).bank_account))
                          : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.ifscCode')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {(selectedUser as any).bank_ifsc
                          ? formatIfscDisplay(String((selectedUser as any).bank_ifsc))
                          : '—'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* 계정 정보 */}
              <Accordion defaultExpanded sx={getAccordionFormSx(theme)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={userDetailSectionTitleSx}>
                    {t('userManagement.sectionAccount')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2.25,
                  }}>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.userId')}
                      </Typography>
                      <Typography variant="body1" sx={{ ...userDetailValueSx, fontWeight: 600 }}>
                        {selectedUser.userid}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.roleLabel')}
                      </Typography>
                      <Chip 
                        label={getRoleLabel(selectedUser.role)} 
                        color={getRoleColor(selectedUser.role) as any}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.statusLabel')}
                      </Typography>
                      <Chip 
                        label={getStatusLabel(selectedUser.status)} 
                        color={getStatusColor(selectedUser.status) as any}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={userDetailLabelSx}>
                        {t('userManagement.createdAt')}
                      </Typography>
                      <Typography variant="body1" sx={userDetailValueSx}>
                        {new Date(selectedUser.created_at).toLocaleDateString(dateLocale)}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenViewDialog(false)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}>
            {t('common.close')}
          </Button>
          {selectedUser && (
            <Button 
              variant="contained"
              disableElevation
              startIcon={<EditIcon />}
              onClick={() => {
                setOpenViewDialog(false);
                handleEditUser(selectedUser);
              }}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}
            >
              {t('userManagement.edit')}
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
        <DialogTitle>{t('userManagement.excelImportTitle')}</DialogTitle>
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
                {t('userManagement.selectedFile')}: {importFile.name}
              </Alert>
            )}
            {importResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {t('userManagement.importResultTitle')}
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  {t('userManagement.importSuccessSummary', { total: importResult.total, success: importResult.success.length })}
                </Alert>
                {importResult.failed.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      {t('userManagement.importFailedCount', { count: importResult.failed.length })}
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
                      {importResult.failed.map((item: any, index: number) => (
                        <Alert key={index} severity="error" sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            {t('userManagement.importRowError', { row: item.row, error: item.error })}
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
            {t('common.close')}
          </Button>
          <Button
            variant="contained"
            onClick={handleImportExcel} 
            disabled={!importFile || importLoading}
            startIcon={importLoading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            {importLoading ? t('userManagement.importing') : t('userManagement.importButton')}
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
