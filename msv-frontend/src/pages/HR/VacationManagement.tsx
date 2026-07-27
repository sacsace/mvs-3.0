import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Button,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  Grid,
  Tooltip,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableSortLabel,
  Pagination,
  useMediaQuery,
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsKpiCardSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsOutlinedLabelProps,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx,
  mvsBodyPaginationSx,
} from '../../theme/mvsLayout';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  RestartAlt as ResetIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  LocalHospital as SickIcon,
  School as StudyIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon,
  MoreHoriz as MoreHorizIcon,
  Groups as GroupsIcon,
} from '@mui/icons-material';
import { useStore, useMenuStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import { vacationService } from '../../services/api';
import { useTranslation } from 'react-i18next';
import DepartmentLeaveCalendar, { CALENDAR_DEPARTMENT_ALL_VALUE } from './DepartmentLeaveCalendar';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import PromptDialog from '../../components/Common/PromptDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { usePromptDialog } from '../../hooks/usePromptDialog';

interface VacationRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  position: string;
  avatar?: string;
  vacationType: 'annual' | 'sick' | 'personal' | 'study' | 'maternity' | 'paternity';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedDate: string;
  approvedBy?: string;
  /** 지정 결재자 user id (API approved_by) */
  approvedByUserId?: number | null;
  approvedDate?: string;
  rejectionReason?: string;
  attachments?: string[];
}

type LeaveBalanceTypeKey = 'annual' | 'sick' | 'personal' | 'study' | 'maternity' | 'paternity';

interface LeaveBalanceRow {
  userId: number;
  username: string;
  department: string;
  position: string;
  hireDate: string | null;
  leaveYearLabel: string | null;
  canUseAnnualLeave: boolean;
  balances: Record<string, { quota: number; used: number; remaining: number }>;
}

const LEAVE_BALANCE_TYPE_KEYS: LeaveBalanceTypeKey[] = [
  'annual',
  'sick',
  'personal',
  'study',
  'maternity',
  'paternity',
];

const VACATION_MENU_ROUTES = ['/hr/leave'];
const VACATIONS_PER_PAGE = 10;
const VACATION_FILTER_OUTLINED = mvsOutlinedLabelProps;
const vacationFilterFieldSx = { ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx } as const;

const DEFAULT_LEAVE_TYPE_DAYS: Record<string, number> = {
  sick: 6,
  personal: 6,
  study: 0,
  maternity: 182,
  paternity: 15,
};

type VacationPolicyState = {
  annualLeaveStartDays: number;
  annualLeaveEarnDays: number;
  availableTypes?: string[];
  leaveTypeDays?: Record<string, number>;
};

const vacationTableBodyRowSx: SxProps<Theme> = (theme) => {
  const base = typeof mvsTableBodyRowSx === 'function' ? mvsTableBodyRowSx(theme) : mvsTableBodyRowSx;
  const rowBg = theme.palette.mode === 'light' ? '#FFFFFF' : theme.palette.background.paper;
  const hoverBg = theme.palette.mode === 'light' ? '#EFF6FF' : theme.palette.action.hover;
  return {
    ...(base as object),
    '& .MuiTableRow-root:nth-of-type(odd)': { bgcolor: rowBg },
    '& .MuiTableRow-root:nth-of-type(even)': { bgcolor: rowBg },
    '& .MuiTableRow-root:hover': { bgcolor: hoverBg },
  };
};

const VacationManagement: React.FC = () => {
  const theme = useTheme();
  const isCompactToolbar = useMediaQuery(theme.breakpoints.down('md'));
  const { t, i18n } = useTranslation();
  const { user } = useStore();
  const { menus, hasMenuPermission, loading: menusLoading } = useMenuStore();
  const { dialogState: confirmDialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const {
    dialogState: promptDialogState,
    showPrompt,
    handleConfirm: handlePromptConfirm,
    handleCancel: handlePromptCancel
  } = usePromptDialog();

  const hrElevated = user?.role === 'root' || user?.role === 'admin';
  const isRootUser = user?.role === 'root';
  /** admin/root 또는 해당 건의 지정 결재자만 승인·반려 (서버와 동일) */
  const canApproveVacationRequest = (request: VacationRequest) =>
    hrElevated ||
    (request.approvedByUserId != null &&
      Number(request.approvedByUserId) === Number(user?.id));
  const vacationMenuFlags = useMemo(() => {
    const check = (action: 'view' | 'create' | 'edit' | 'delete') => {
      if (hrElevated) return true;
      for (const route of VACATION_MENU_ROUTES) {
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

  const canExportVacations = hrElevated || vacationMenuFlags.canView || vacationMenuFlags.canEdit;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL 파라미터에서 탭 인덱스 가져오기
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam !== null 
    ? parseInt(tabParam, 10) 
    : (user?.role === 'admin' || user?.role === 'root' ? 0 : 1);
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // URL 파라미터가 변경되면 탭도 변경
  useEffect(() => {
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex)) {
        setActiveTab(tabIndex);
      }
    }
  }, [tabParam]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceRow[]>([]);
  const [leaveBalanceTypes, setLeaveBalanceTypes] = useState<LeaveBalanceTypeKey[]>([...LEAVE_BALANCE_TYPE_KEYS]);
  const [leaveBalancesLoading, setLeaveBalancesLoading] = useState(false);
  const [leaveBalanceSearch, setLeaveBalanceSearch] = useState('');
  const [vacationPolicy, setVacationPolicy] = useState<VacationPolicyState | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<VacationRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarDept, setCalendarDept] = useState<string>(CALENDAR_DEPARTMENT_ALL_VALUE);
  const [page, setPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);
  const [toolbarMenuAnchor, setToolbarMenuAnchor] = useState<null | HTMLElement>(null);
  const canEditPolicy = user?.role === 'admin' || user?.role === 'root';

  useEffect(() => {
    // admin/root만 휴가 현황 탭(0번) 접근 가능
    // 회사 휴가 현황 탭(0번)은 모든 휴가를 조회해야 함
    if ((user?.role === 'admin' || user?.role === 'root') && activeTab === 0) {
      loadAllVacations();
    } else if (!((user?.role === 'admin' || user?.role === 'root') && (activeTab === 3 || activeTab === 4))) {
      loadVacations();
    }
    
    // admin: 3=잔여일, 4=휴가 형태
    if ((user?.role === 'admin' || user?.role === 'root') && activeTab === 3) {
      void loadLeaveBalances();
    }
    if ((user?.role === 'admin' || user?.role === 'root') && activeTab === 4) {
      loadVacationPolicy();
    }
  }, [activeTab, user?.role]);

  const loadLeaveBalances = async () => {
    setLeaveBalancesLoading(true);
    setError(null);
    try {
      const params: { company_id?: number } = {};
      if (user?.company_id) params.company_id = user.company_id;
      const response = await vacationService.getLeaveBalances(params);
      if (response.success) {
        setLeaveBalances(Array.isArray(response.data) ? response.data : []);
        const metaTypes = Array.isArray(response.meta?.availableTypes)
          ? (response.meta.availableTypes as string[])
          : [];
        const filtered = LEAVE_BALANCE_TYPE_KEYS.filter((key) =>
          metaTypes.length === 0 ? true : metaTypes.includes(key)
        );
        setLeaveBalanceTypes(filtered.length > 0 ? filtered : [...LEAVE_BALANCE_TYPE_KEYS]);
      } else {
        setLeaveBalances([]);
        setError(response.message || t('vacationManagement.noLeaveBalances'));
      }
    } catch (e: any) {
      console.error('휴가 잔여일 로드 오류:', e);
      setLeaveBalances([]);
      setError(e?.response?.data?.message || t('vacationManagement.noLeaveBalances'));
    } finally {
      setLeaveBalancesLoading(false);
    }
  };
  const loadAllVacations = async () => {
    setLoading(true);
    setError(null);
    try {
      // 회사 전체 휴가 조회 (root/admin)
      const params: { company_id?: number } = {};
      if (user?.company_id) {
        params.company_id = user.company_id;
      }
      const response = await vacationService.getVacations(params);
      if (response.success) {
        const vacations: VacationRequest[] = (response.data || []).map((v: any) => ({
          id: v.id,
          employeeId: v.user_id,
          employeeName: v.user?.username || '알 수 없음',
          department: v.user?.department || '-',
          position: v.user?.position || '-',
          vacationType: v.vacation_type,
          startDate: v.start_date,
          endDate: v.end_date,
          days: v.days,
          reason: v.reason,
          status: v.status,
          appliedDate: v.applied_date,
          approvedBy: v.approver?.username,
          approvedByUserId: v.approved_by != null ? Number(v.approved_by) : null,
          approvedDate: v.approved_date,
          rejectionReason: v.rejection_reason,
          attachments: v.attachments ? JSON.parse(v.attachments) : []
        }));
        setVacationRequests(vacations);
        
        // URL 파라미터에서 id가 있으면 해당 휴가의 상세 다이얼로그 열기
        const idParam = searchParams.get('id');
        if (idParam) {
          const vacationId = parseInt(idParam, 10);
          const selectedVac = vacations.find(v => v.id === vacationId);
          if (selectedVac) {
            setSelectedVacation(selectedVac);
            setDetailDialogOpen(true);
            setRejectReason('');
            // URL에서 id 파라미터 제거
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('id');
            setSearchParams(newSearchParams, { replace: true });
          }
        }
      } else {
        setError(response.message || '휴가 목록을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('휴가 목록 조회 오류:', error);
      setError(error.response?.data?.message || '휴가 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadVacations = async () => {
    setLoading(true);
    setError(null);
    try {
      let params: any = {};
      
      // 탭에 따라 필터링
      // admin이 아닌 경우 탭 인덱스 조정
      const adjustedTab = (user?.role === 'admin' || user?.role === 'root') ? activeTab : activeTab + 1;
      
      if (adjustedTab === 0) {
        // 휴가 현황 (admin만)
        // 모든 휴가 조회는 loadAllVacations에서 처리
      } else if (adjustedTab === 1) {
        // 내가 신청한 휴가
        params.user_id = user?.id;
      } else if (adjustedTab === 2) {
        // 휴가 결재: root는 등록 회사 전체 조회, 그 외는 본인 결재 대상만
        if (isRootUser) {
          if (user?.company_id) {
            params.company_id = user.company_id;
          }
        } else {
          params.approved_by = user?.id;
        }
      }
      
      const response = await vacationService.getVacations(params);
      if (response.success) {
        const vacations: VacationRequest[] = (response.data || []).map((v: any) => ({
          id: v.id,
          employeeId: v.user_id,
          employeeName: v.user?.username || '알 수 없음',
          department: v.user?.department || '-',
          position: v.user?.position || '-',
          vacationType: v.vacation_type,
          startDate: v.start_date,
          endDate: v.end_date,
          days: v.days,
          reason: v.reason,
          status: v.status,
          appliedDate: v.applied_date,
          approvedBy: v.approver?.username,
          approvedByUserId: v.approved_by != null ? Number(v.approved_by) : null,
          approvedDate: v.approved_date,
          rejectionReason: v.rejection_reason,
          attachments: v.attachments ? JSON.parse(v.attachments) : []
        }));
        setVacationRequests(vacations);
        
        // URL 파라미터에서 id가 있으면 해당 휴가의 상세 다이얼로그 열기
        const idParam = searchParams.get('id');
        if (idParam) {
          const vacationId = parseInt(idParam, 10);
          const selectedVac = vacations.find(v => v.id === vacationId);
          if (selectedVac) {
            setSelectedVacation(selectedVac);
            setDetailDialogOpen(true);
            setRejectReason('');
            // URL에서 id 파라미터 제거
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('id');
            setSearchParams(newSearchParams, { replace: true });
          }
        }
      } else {
        setError(response.message || '휴가 목록을 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('휴가 목록 조회 오류:', error);
      setError(error.response?.data?.message || '휴가 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadVacationPolicy = async () => {
    try {
      const response = await vacationService.getVacationPolicy();
      if (response.success) {
        setVacationPolicy(response.data);
      }
    } catch (error: any) {
      console.error('휴가 정책 조회 오류:', error);
    }
  };

  const handleSavePolicy = async (startDays: number) => {
    if (!canEditPolicy) {
      setError('관리자만 휴가 형태를 수정할 수 있습니다.');
      return;
    }
    setSavingPolicy(true);
    setError(null);
    try {
      const response = await vacationService.updateVacationPolicy({
        annualLeaveStartDays: startDays,
        annualLeaveEarnDays: vacationPolicy?.annualLeaveEarnDays || 20,
        availableTypes: vacationPolicy?.availableTypes || ['annual', 'sick', 'personal', 'study', 'maternity', 'paternity'],
        leaveTypeDays: vacationPolicy?.leaveTypeDays || DEFAULT_LEAVE_TYPE_DAYS,
      });
      if (response.success) {
        setSuccess('휴가 정책이 저장되었습니다.');
        setVacationPolicy(response.data);
      } else {
        setError(response.message || '휴가 정책 저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('휴가 정책 저장 오류:', error);
      setError(error.response?.data?.message || '휴가 정책 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleToggleVacationType = async (vacationType: string) => {
    if (!canEditPolicy) {
      setError('관리자만 휴가 형태를 수정할 수 있습니다.');
      return;
    }

    const currentTypes = vacationPolicy?.availableTypes || ['annual', 'sick', 'personal', 'study', 'maternity', 'paternity'];
    const newTypes = currentTypes.includes(vacationType)
      ? currentTypes.filter(type => type !== vacationType)
      : [...currentTypes, vacationType];

    setSavingPolicy(true);
    setError(null);
    try {
      const response = await vacationService.updateVacationPolicy({
        annualLeaveStartDays: vacationPolicy?.annualLeaveStartDays || 240,
        annualLeaveEarnDays: vacationPolicy?.annualLeaveEarnDays || 20,
        availableTypes: newTypes,
        leaveTypeDays: vacationPolicy?.leaveTypeDays || DEFAULT_LEAVE_TYPE_DAYS,
      });
      if (response.success) {
        setSuccess('휴가 정책이 저장되었습니다.');
        setVacationPolicy(response.data);
      } else {
        setError(response.message || '휴가 정책 저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('휴가 정책 저장 오류:', error);
      setError(error.response?.data?.message || '휴가 정책 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSaveLeaveTypeDays = async (vacationType: string, days: number) => {
    if (!canEditPolicy) {
      setError('관리자만 휴가 형태를 수정할 수 있습니다.');
      return;
    }

    setSavingPolicy(true);
    setError(null);
    try {
      const response = await vacationService.updateVacationPolicy({
        annualLeaveStartDays: vacationPolicy?.annualLeaveStartDays ?? 240,
        annualLeaveEarnDays: vacationPolicy?.annualLeaveEarnDays ?? 20,
        availableTypes: vacationPolicy?.availableTypes || ['annual', 'sick', 'personal', 'study', 'maternity', 'paternity'],
        leaveTypeDays: {
          ...DEFAULT_LEAVE_TYPE_DAYS,
          ...(vacationPolicy?.leaveTypeDays || {}),
          [vacationType]: days,
        },
      });
      if (response.success) {
        setSuccess('휴가 정책이 저장되었습니다.');
        setVacationPolicy(response.data);
      } else {
        setError(response.message || '휴가 정책 저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('휴가 정책 저장 오류:', error);
      setError(error.response?.data?.message || '휴가 정책 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const renderLeaveDaysInput = (typeKey: string) => {
    const currentDays = vacationPolicy?.leaveTypeDays?.[typeKey] ?? DEFAULT_LEAVE_TYPE_DAYS[typeKey] ?? 0;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('vacationManagement.leaveTypeDaysLabel')}
        </Typography>
        <TextField
          type="number"
          size="small"
          sx={{ width: 120 }}
          defaultValue={currentDays}
          key={`${typeKey}-${currentDays}`}
          inputProps={{ min: 0, max: 365, step: 1 }}
          onBlur={(e) => {
            const next = Math.max(0, parseInt(e.target.value, 10) || 0);
            if (next !== currentDays) {
              void handleSaveLeaveTypeDays(typeKey, next);
            }
          }}
          disabled={savingPolicy || !canEditPolicy}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, lineHeight: 1.5 }}>
          {t('vacationManagement.leaveTypeDaysHint')}
        </Typography>
      </Box>
    );
  };

  const handleAdd = () => {
    if (!hrElevated && !vacationMenuFlags.canCreate) {
      setError(t('vacationManagement.noPermissionCreate'));
      return;
    }
    window.location.href = '/hr/leave/request';
  };

  const handleExportExcel = async () => {
    if (!canExportVacations) {
      setError(t('vacationManagement.noPermissionExport'));
      return;
    }
    try {
      // 현재 탭과 필터에 맞는 파라미터 구성
      const adjustedTab = (user?.role === 'admin' || user?.role === 'root') ? activeTab : activeTab + 1;
      
      let params: any = {};
      
      if (adjustedTab === 1) {
        // 내가 신청한 휴가
        params.user_id = user?.id;
      } else if (adjustedTab === 2) {
        if (isRootUser) {
          if (user?.company_id) {
            params.company_id = user.company_id;
          }
        } else {
          params.approved_by = user?.id;
        }
      }
      
      // 필터 적용
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.vacation_type = typeFilter;
      }

      const response = await vacationService.exportVacationsToExcel(params);
      // 백엔드에서 설정한 파일명 사용 (Content-Disposition 헤더에서 추출)
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `휴가_목록_${new Date().toISOString().split('T')[0]}.xlsx`; // 기본값
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(t('vacationManagement.excelDownloadSuccess'));
    } catch (error: any) {
      console.error('Excel 내보내기 오류:', error);
      setError(error.response?.data?.message || t('vacationManagement.excelExportError'));
    }
  };


  const handleApprove = async (id: number) => {
    try {
      const response = await vacationService.approveVacation(id);
      if (response.success) {
        setSuccess(t('vacationManagement.leaveApproved'));
        loadVacations();
      } else {
        setError(response.message || '휴가 승인에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('휴가 승인 오류:', error);
      setError(error.response?.data?.message || '휴가 승인 중 오류가 발생했습니다.');
    }
  };

  const handleReject = (id: number) => {
    showPrompt(
      t('vacationManagement.rejectReasonPlaceholder', { defaultValue: '거부 사유를 입력하세요.' }),
      (reason) => {
        void (async () => {
          try {
            const response = await vacationService.rejectVacation(id, reason);
            if (response.success) {
              setSuccess('휴가가 거부되었습니다.');
              loadVacations();
            } else {
              setError(response.message || '휴가 거부에 실패했습니다.');
            }
          } catch (error: any) {
            console.error('휴가 거부 오류:', error);
            setError(error.response?.data?.message || '휴가 거부 중 오류가 발생했습니다.');
          }
        })();
      },
      {
        title: t('vacationManagement.reject'),
        label: t('vacationManagement.rejectReason', { defaultValue: '거부 사유' }),
        multiline: true,
        minRows: 3,
        confirmText: t('vacationManagement.reject'),
        cancelText: t('common.cancel')
      }
    );
  };

  const handleDelete = (id: number) => {
    showConfirm(
      t('vacationManagement.deleteConfirm', { defaultValue: '정말 이 휴가 신청을 삭제하시겠습니까?' }),
      () => {
        void (async () => {
          try {
            const response = await vacationService.deleteVacation(id);
            if (response.success) {
              setSuccess('휴가 신청이 삭제되었습니다.');
              loadVacations();
            } else {
              setError(response.message || '휴가 삭제에 실패했습니다.');
            }
          } catch (error: any) {
            console.error('휴가 삭제 오류:', error);
            setError(error.response?.data?.message || '휴가 삭제 중 오류가 발생했습니다.');
          }
        })();
      },
      {
        title: t('common.confirm'),
        confirmColor: 'error',
        confirmText: t('common.delete'),
        cancelText: t('common.cancel')
      }
    );
  };


  const vacationTypes = [
    { key: 'annual', name: t('vacationManagement.annual'), icon: <HomeIcon />, color: 'primary' },
    { key: 'sick', name: t('vacationManagement.sick'), icon: <SickIcon />, color: 'error' },
    { key: 'personal', name: t('vacationManagement.personal'), icon: <PersonIcon />, color: 'default' },
    { key: 'study', name: t('vacationManagement.study'), icon: <StudyIcon />, color: 'info' },
    { key: 'maternity', name: t('vacationManagement.maternity'), icon: <EventIcon />, color: 'success' },
    { key: 'paternity', name: t('vacationManagement.paternity'), icon: <WorkIcon />, color: 'warning' }
  ];

  const getStatusChip = (status: string) => {
    const statusConfig = {
      pending: { label: t('vacationManagement.statusPending'), color: 'warning' as const },
      approved: { label: t('vacationManagement.statusApproved'), color: 'success' as const },
      rejected: { label: t('vacationManagement.statusRejected'), color: 'error' as const },
      cancelled: { label: t('vacationManagement.statusCancelled'), color: 'default' as const }
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const getTypeChip = (type: string) => {
    const typeConfig = vacationTypes.find(t => t.key === type);
    return (
      <Chip
        icon={typeConfig?.icon}
        label={typeConfig?.name}
        color={typeConfig?.color as any}
        size="small"
        variant="outlined"
      />
    );
  };

  const handleEdit = (request: VacationRequest) => {
    // 페이지 이동으로 변경
    window.location.href = `/hr/leave/request/${request.id}`;
  };

  const handleRowClick = (request: VacationRequest) => {
    setSelectedVacation(request);
    setDetailDialogOpen(true);
    setRejectReason('');
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedVacation(null);
    setRejectReason('');
  };

  const handleApproveFromDialog = async () => {
    if (!selectedVacation) return;
    try {
      const response = await vacationService.approveVacation(selectedVacation.id);
      if (response.success) {
        setSuccess(t('vacationManagement.leaveApproved'));
        handleCloseDetailDialog();
        loadVacations();
      } else {
        setError(response.message || '휴가 승인에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('휴가 승인 오류:', error);
      setError(error.response?.data?.message || '휴가 승인 중 오류가 발생했습니다.');
    }
  };

  const handleRejectFromDialog = async () => {
    if (!selectedVacation) return;
    if (!rejectReason.trim()) {
      setError(t('vacationManagement.enterRejectionReason'));
      return;
    }
    try {
      const response = await vacationService.rejectVacation(selectedVacation.id, rejectReason);
      if (response.success) {
        setSuccess('휴가가 거부되었습니다.');
        handleCloseDetailDialog();
        loadVacations();
      } else {
        setError(response.message || '휴가 거부에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('휴가 거부 오류:', error);
      setError(error.response?.data?.message || '휴가 거부 중 오류가 발생했습니다.');
    }
  };


  const filteredRequests = React.useMemo(() => {
    const filtered = vacationRequests.filter(request => {
      const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            request.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            request.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.vacationType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    // 정렬 처리
    if (orderBy) {
      return [...filtered].sort((a, b) => {
        let aValue: any = a[orderBy as keyof VacationRequest];
        let bValue: any = b[orderBy as keyof VacationRequest];
        
        // 날짜 타입 처리
        if (orderBy === 'appliedDate' || orderBy === 'startDate' || orderBy === 'endDate' || orderBy === 'processedDate') {
          aValue = new Date(aValue || 0).getTime();
          bValue = new Date(bValue || 0).getTime();
        }
        
        // 숫자 타입 처리
        if (orderBy === 'days') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }
        
        // 문자열 타입 처리 (직원명, 사유, 상태, 휴가 유형 등)
        if (orderBy === 'employeeName' || orderBy === 'reason' || orderBy === 'status' || orderBy === 'vacationType') {
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue || '').toLowerCase();
        }
        
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [vacationRequests, searchTerm, statusFilter, typeFilter, orderBy, order]);

  const deptOptionsForCalendar = React.useMemo(() => {
    if ((user?.role !== 'admin' && user?.role !== 'root') || activeTab !== 0) return [];
    const s = new Set<string>();
    vacationRequests.forEach((r) => {
      const d = r.department?.trim();
      if (d && d !== '-') s.add(d);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [vacationRequests, user?.role, activeTab]);

  const calendarVacationsFiltered = React.useMemo(() => {
    if ((user?.role !== 'admin' && user?.role !== 'root') || activeTab !== 0) return [];
    if (!calendarDept || calendarDept === CALENDAR_DEPARTMENT_ALL_VALUE) return vacationRequests;
    return vacationRequests.filter((r) => r.department === calendarDept);
  }, [vacationRequests, user?.role, activeTab, calendarDept]);

  useEffect(() => {
    if ((user?.role !== 'admin' && user?.role !== 'root') || activeTab !== 0) return;
    setCalendarDept((prev) => {
      if (prev === CALENDAR_DEPARTMENT_ALL_VALUE) return CALENDAR_DEPARTMENT_ALL_VALUE;
      if (prev && deptOptionsForCalendar.includes(prev)) return prev;
      return CALENDAR_DEPARTMENT_ALL_VALUE;
    });
  }, [activeTab, user?.role, deptOptionsForCalendar]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const adjustedTab = (user?.role === 'admin' || user?.role === 'root') ? activeTab : activeTab + 1;
  const vacationPolicyTab = (user?.role === 'admin' || user?.role === 'root') ? 4 : 2;
  const leaveBalanceTab = (user?.role === 'admin' || user?.role === 'root') ? 3 : -1;
  const showStatusKpi = (user?.role === 'admin' || user?.role === 'root') && activeTab === 0;
  const showMyRequestKpi = adjustedTab === 1;
  const showApprovalKpi = adjustedTab === 2;
  const showPolicyKpi = adjustedTab === vacationPolicyTab && canEditPolicy;
  const showListFilters =
    adjustedTab !== vacationPolicyTab && adjustedTab !== 0 && adjustedTab !== leaveBalanceTab;

  const filteredLeaveBalances = useMemo(() => {
    const q = leaveBalanceSearch.trim().toLowerCase();
    if (!q) return leaveBalances;
    return leaveBalances.filter((row) => {
      const blob = [row.username, row.department, row.position, row.leaveYearLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [leaveBalances, leaveBalanceSearch]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || statusFilter !== 'all' || typeFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  useEffect(() => {
    setPage(1);
    setPendingPage(1);
    setProcessedPage(1);
  }, [searchTerm, statusFilter, typeFilter, activeTab]);

  const statusKpiStats = useMemo(() => {
    const totalRequests = vacationRequests.length;
    const totalPending = vacationRequests.filter((req) => req.status === 'pending').length;
    const totalApproved = vacationRequests.filter((req) => req.status === 'approved').length;
    const totalDays = vacationRequests.reduce((sum, req) => sum + req.days, 0);
    return { totalRequests, totalPending, totalApproved, totalDays };
  }, [vacationRequests]);

  const approvalKpiStats = useMemo(() => {
    const total = vacationRequests.length;
    const pending = vacationRequests.filter((req) => req.status === 'pending').length;
    const approved = vacationRequests.filter((req) => req.status === 'approved').length;
    const rejected = vacationRequests.filter((req) => req.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [vacationRequests]);

  const policyKpiStats = useMemo(() => {
    const enabledTypes = vacationPolicy?.availableTypes?.length ?? 6;
    const startDays = vacationPolicy?.annualLeaveStartDays ?? 240;
    const sickDays = vacationPolicy?.leaveTypeDays?.sick ?? DEFAULT_LEAVE_TYPE_DAYS.sick;
    const personalDays = vacationPolicy?.leaveTypeDays?.personal ?? DEFAULT_LEAVE_TYPE_DAYS.personal;
    return { enabledTypes, startDays, sickDays, personalDays };
  }, [vacationPolicy]);

  const kpiItems = useMemo((): Array<{ key: string; label: string; value: string; valueColor?: string }> => {
    if (showStatusKpi || showMyRequestKpi) {
      return [
        { key: 'total', label: t('vacationManagement.totalRequests'), value: `${statusKpiStats.totalRequests}${t('vacationManagement.casesUnit')}` },
        { key: 'pending', label: t('vacationManagement.pendingRequests'), value: `${statusKpiStats.totalPending}${t('vacationManagement.casesUnit')}`, valueColor: 'warning.main' as const },
        { key: 'approved', label: t('vacationManagement.approvedRequests'), value: `${statusKpiStats.totalApproved}${t('vacationManagement.casesUnit')}`, valueColor: 'success.main' as const },
        { key: 'days', label: t('vacationManagement.totalDays'), value: `${statusKpiStats.totalDays}${t('vacationManagement.daysUnit')}`, valueColor: 'info.main' as const },
      ];
    }
    if (showApprovalKpi) {
      return [
        { key: 'total', label: t('vacationManagement.totalRequests'), value: `${approvalKpiStats.total}${t('vacationManagement.casesUnit')}` },
        { key: 'pending', label: t('vacationManagement.pendingRequests'), value: `${approvalKpiStats.pending}${t('vacationManagement.casesUnit')}`, valueColor: 'warning.main' as const },
        { key: 'approved', label: t('vacationManagement.approvedRequests'), value: `${approvalKpiStats.approved}${t('vacationManagement.casesUnit')}`, valueColor: 'success.main' as const },
        { key: 'rejected', label: t('vacationManagement.rejectedRequests'), value: `${approvalKpiStats.rejected}${t('vacationManagement.casesUnit')}`, valueColor: 'error.main' as const },
      ];
    }
    if (showPolicyKpi) {
      const startLabel =
        policyKpiStats.startDays === 0
          ? t('vacationManagement.annualStartImmediate')
          : t('vacationManagement.kpi.annualStartAfter', { days: policyKpiStats.startDays });
      return [
        { key: 'types', label: t('vacationManagement.kpi.providedTypes'), value: `${policyKpiStats.enabledTypes}${t('vacationManagement.kpi.typesUnit')}` },
        { key: 'annual', label: t('vacationManagement.kpi.annualStart'), value: startLabel },
        { key: 'sick', label: t('vacationManagement.kpi.sickDays'), value: `${policyKpiStats.sickDays}${t('vacationManagement.daysUnit')}` },
        { key: 'personal', label: t('vacationManagement.kpi.personalDays'), value: `${policyKpiStats.personalDays}${t('vacationManagement.daysUnit')}` },
      ];
    }
    return [];
  }, [
    showStatusKpi,
    showMyRequestKpi,
    showApprovalKpi,
    showPolicyKpi,
    statusKpiStats,
    approvalKpiStats,
    policyKpiStats,
    t,
  ]);

  const showKpi = kpiItems.length > 0;

  const listStateBoxSx = {
    ...mvsBodyListTableSx,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    py: { xs: 6, sm: 8 },
    px: 3,
    gap: 1.5,
  } as const;

  const vacationListCardSx = {
    ...mvsBodyListTableSx,
    overflow: 'hidden',
  } as const;

  const renderVacationTable = (
    requests: VacationRequest[],
    options: {
      showDelete?: boolean;
      showApproveReject?: boolean;
      showProcessedDate?: boolean;
      showApplyCta?: boolean;
      sectionTitle?: string;
      pageNum: number;
      onPageChange: (page: number) => void;
      emptyTitle: string;
      emptyHint?: string;
    }
  ) => {
    const totalPages = Math.max(1, Math.ceil(requests.length / VACATIONS_PER_PAGE));
    const paginated = requests.slice((options.pageNum - 1) * VACATIONS_PER_PAGE, options.pageNum * VACATIONS_PER_PAGE);

    if (loading) {
      return (
        <Box sx={listStateBoxSx}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            {t('vacationManagement.empty.loading')}
          </Typography>
        </Box>
      );
    }

    if (requests.length === 0) {
      return (
        <Box sx={listStateBoxSx}>
          <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
            {options.emptyTitle}
          </Typography>
          {options.emptyHint ? (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              {options.emptyHint}
            </Typography>
          ) : null}
          {hasActiveFilters ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ResetIcon fontSize="small" />}
              onClick={handleResetFilters}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('vacationManagement.reset')}
            </Button>
          ) : options.showApplyCta ? (
            <Tooltip
              title={!hrElevated && !vacationMenuFlags.canCreate ? t('vacationManagement.noPermissionCreate') : ''}
            >
              <span style={{ display: 'inline-flex' }}>
                <Button
                  variant="contained"
                  disableElevation
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={handleAdd}
                  disabled={!menusLoading && !hrElevated && !vacationMenuFlags.canCreate}
                  sx={mvsBodyPrimaryBtnSx}
                >
                  {t('vacationManagement.applyLeave')}
                </Button>
              </span>
            </Tooltip>
          ) : null}
        </Box>
      );
    }

    return (
      <Box sx={vacationListCardSx}>
        {options.sectionTitle ? (
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 1.5,
              borderBottom: '1px solid #C5CED9',
              bgcolor: '#FFFFFF',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
              {options.sectionTitle}
            </Typography>
          </Box>
        ) : null}
        <TableContainer sx={{ width: '100%', overflow: 'hidden', boxShadow: 'none', border: 'none' }}>
          <Table
            size="small"
            sx={{
              tableLayout: 'fixed',
              width: '100%',
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
                {[
                  ['employeeName', t('vacationManagement.employee')],
                  ['vacationType', t('vacationManagement.leaveTypeFilter')],
                  ['startDate', t('vacationManagement.period')],
                  ['days', t('vacationManagement.days')],
                  ['reason', t('vacationManagement.reason')],
                  ['status', t('vacationManagement.status')],
                  ['appliedDate', t('vacationManagement.applicationDate')],
                  ...(options.showProcessedDate ? [['processedDate', t('vacationManagement.processingDate')]] : []),
                ].map(([key, label]) => (
                  <TableCell key={key} sortDirection={orderBy === key ? order : false}>
                    <TableSortLabel
                      active={orderBy === key}
                      direction={orderBy === key ? order : 'asc'}
                      onClick={() => handleSort(key)}
                    >
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </Box>
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t('vacationManagement.actions')}
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={vacationTableBodyRowSx}>
              {paginated.map((request) => (
                <TableRow
                  key={request.id}
                  onClick={() => handleRowClick(request)}
                  sx={{ cursor: 'pointer', '&:hover .vacation-delete-btn:not(.Mui-disabled)': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) } }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <Avatar sx={{ mr: 1.5, bgcolor: 'primary.main', width: 32, height: 32, flexShrink: 0 }}>
                        {request.employeeName.charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight={600} noWrap title={request.employeeName}>
                          {request.employeeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {request.department} • {request.position}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{getTypeChip(request.vacationType)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap title={`${request.startDate} ~ ${request.endDate}`}>
                      {request.startDate} ~ {request.endDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`${request.days}${t('vacationManagement.daysUnit')}`} color="info" size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap title={request.reason}>
                      {request.reason}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(request.status)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {request.appliedDate}
                    </Typography>
                  </TableCell>
                  {options.showProcessedDate ? (
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {request.approvedDate || '-'}
                      </Typography>
                    </TableCell>
                  ) : null}
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    {options.showDelete && request.status === 'pending' && vacationMenuFlags.canDelete ? (
                      <Tooltip title={t('vacationManagement.delete')}>
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton
                            className="vacation-delete-btn"
                            size="small"
                            onClick={() => handleDelete(request.id)}
                            aria-label={t('vacationManagement.delete')}
                            sx={{
                              color: alpha(theme.palette.text.secondary, theme.palette.mode === 'light' ? 0.72 : 1),
                              borderRadius: '10px',
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                    {options.showApproveReject && canApproveVacationRequest(request) ? (
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={t('vacationManagement.approve')}>
                          <IconButton size="small" onClick={() => handleApprove(request.id)} sx={{ color: 'success.main' }}>
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('vacationManagement.reject')}>
                          <IconButton size="small" onClick={() => handleReject(request.id)} sx={{ color: alpha(theme.palette.text.secondary, 0.72) }}>
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={mvsBodyPaginationSx}>
          <Pagination
            count={totalPages}
            page={options.pageNum}
            onChange={(_, value) => options.onPageChange(value)}
            color="primary"
            shape="rounded"
            sx={{ '& .MuiPaginationItem-root': { borderRadius: '10px', fontWeight: 500 } }}
          />
        </Box>
      </Box>
    );
  };

  const getTabContent = () => {
    // admin이 아닌 경우 탭 인덱스 조정
    const adjustedTab = (user?.role === 'admin' || user?.role === 'root') ? activeTab : activeTab + 1;
    
    switch (adjustedTab) {
      case 0: {
        const totalPending = vacationRequests.filter(req => req.status === 'pending').length;
        const totalApproved = vacationRequests.filter(req => req.status === 'approved').length;
        const totalRejected = vacationRequests.filter(req => req.status === 'rejected').length;
        const totalCancelled = vacationRequests.filter(req => req.status === 'cancelled').length;
        
        // 부서별 통계
        const departmentStats: { [key: string]: { count: number; days: number } } = {};
        vacationRequests.forEach(req => {
          const dept = req.department || '미지정';
          if (!departmentStats[dept]) {
            departmentStats[dept] = { count: 0, days: 0 };
          }
          departmentStats[dept].count++;
          departmentStats[dept].days += req.days;
        });

        return (
          <Box>
            {/* 부서별 휴가 달력 (휴가 현황) */}
            <Card sx={{ mb: 2, borderRadius: '20px', border: '1px solid #C5CED9', boxShadow: '0 2px 14px rgba(15, 23, 42, 0.05)' }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CalendarIcon color="primary" />
                    {t('vacationManagement.departmentLeaveCalendar')}
                  </Typography>
                  {vacationRequests.length > 0 ? (
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel id="vacation-cal-dept-label">{t('vacationManagement.departmentFilter')}</InputLabel>
                      <Select
                        labelId="vacation-cal-dept-label"
                        label={t('vacationManagement.departmentFilter')}
                        value={calendarDept}
                        onChange={(e) => setCalendarDept(e.target.value as string)}
                      >
                        <MenuItem value={CALENDAR_DEPARTMENT_ALL_VALUE}>
                          {t('vacationManagement.allDepartments')}
                        </MenuItem>
                        {deptOptionsForCalendar.map((d) => (
                          <MenuItem key={d} value={d}>
                            {d}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : null}
                </Box>
                {vacationRequests.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('vacationManagement.departmentLeaveCalendarEmpty')}
                  </Typography>
                ) : (
                  <>
                    <DepartmentLeaveCalendar
                      vacations={calendarVacationsFiltered}
                      viewMonth={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      onSelectVacation={(v) => {
                        const full = vacationRequests.find((r) => r.id === v.id);
                        if (full) handleRowClick(full);
                      }}
                      language={i18n.language?.startsWith('en') ? 'en' : 'ko'}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                      {t('vacationManagement.calendarStatusLegend')}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 상태별 통계 - 심플한 파이 차트 */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  {t('vacationManagement.statusDistribution')}
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('vacationManagement.statusPending'), value: totalPending, color: '#ffb74d' },
                          { name: t('vacationManagement.statusApproved'), value: totalApproved, color: '#81c784' },
                          { name: t('vacationManagement.statusRejected'), value: totalRejected, color: '#e57373' },
                          { name: t('vacationManagement.statusCancelled'), value: totalCancelled, color: '#bdbdbd' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => `${name} ${value}${t('vacationManagement.casesUnit')} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: t('vacationManagement.statusPending'), value: totalPending, color: '#ffb74d' },
                          { name: t('vacationManagement.statusApproved'), value: totalApproved, color: '#81c784' },
                          { name: t('vacationManagement.statusRejected'), value: totalRejected, color: '#e57373' },
                          { name: t('vacationManagement.statusCancelled'), value: totalCancelled, color: '#bdbdbd' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => `${value}${t('vacationManagement.casesUnit')}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* 부서별 통계 - 심플한 바 차트 */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  {t('vacationManagement.departmentLeaveStats')}
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(departmentStats)
                        .sort((a, b) => b[1].days - a[1].days)
                        .map(([dept, stats]) => ({
                          name: dept || t('vacationManagement.unspecified'),
                          daysKey: stats.days,
                          countKey: stats.count
                        }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="daysKey" fill="#81c784" name={t('vacationManagement.leaveDaysLabel')} />
                      <Bar dataKey="countKey" fill="#64b5f6" name={t('vacationManagement.requestCountLabel')} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );
      }
      case 1:
        return (
          <Box sx={mvsBodyListZoneSx}>
            {renderVacationTable(filteredRequests, {
              showDelete: true,
              showApplyCta: true,
              pageNum: page,
              onPageChange: setPage,
              emptyTitle:
                vacationRequests.length === 0
                  ? t('vacationManagement.empty.noItems')
                  : t('vacationManagement.empty.noResults'),
              emptyHint:
                vacationRequests.length === 0
                  ? t('vacationManagement.empty.noItemsHint')
                  : t('vacationManagement.empty.noResultsHint'),
            })}
          </Box>
        );
      case 2: {
        const pendingRequests = filteredRequests.filter((req) => req.status === 'pending');
        const processedRequests = filteredRequests.filter(
          (req) => req.status === 'approved' || req.status === 'rejected'
        );

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={mvsBodyListZoneSx}>
              {renderVacationTable(pendingRequests, {
                showApproveReject: true,
                sectionTitle: `${t('vacationManagement.pending')} (${pendingRequests.length}${t('vacationManagement.casesUnit')})`,
                pageNum: pendingPage,
                onPageChange: setPendingPage,
                emptyTitle: t('vacationManagement.noPendingLeave'),
              })}
            </Box>
            <Box sx={{ ...mvsBodyListZoneSx, mt: 0 }}>
              {renderVacationTable(processedRequests, {
                showProcessedDate: true,
                sectionTitle: `${t('vacationManagement.completed')} (${processedRequests.length}${t('vacationManagement.casesUnit')})`,
                pageNum: processedPage,
                onPageChange: setProcessedPage,
                emptyTitle: t('vacationManagement.noProcessedLeave'),
              })}
            </Box>
          </Box>
        );
      }
      case 3:
        if (user?.role === 'admin' || user?.role === 'root') {
          const typeLabel = (key: LeaveBalanceTypeKey) => {
            switch (key) {
              case 'annual':
                return t('vacationManagement.annualRemainingDays');
              case 'sick':
                return t('vacationManagement.sick');
              case 'personal':
                return t('vacationManagement.personal');
              case 'study':
                return t('vacationManagement.study');
              case 'maternity':
                return t('vacationManagement.maternity');
              case 'paternity':
                return t('vacationManagement.paternity');
              default:
                return key;
            }
          };

          return (
            <Box sx={mvsBodyListZoneSx}>
              <Alert severity="info" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                {t('vacationManagement.leaveBalancesHint')}
              </Alert>
              <Box
                sx={{
                  mb: 1.5,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <TextField
                  size="small"
                  value={leaveBalanceSearch}
                  onChange={(e) => setLeaveBalanceSearch(e.target.value)}
                  placeholder={t('vacationManagement.leaveBalancesSearchPlaceholder')}
                  sx={{ ...vacationFilterFieldSx, minWidth: { xs: '100%', sm: 280 }, maxWidth: 420 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: '1.125rem', color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box sx={{ ...mvsBodyCardSx, overflow: 'hidden' }}>
                {leaveBalancesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : filteredLeaveBalances.length === 0 ? (
                  <Box sx={listStateBoxSx}>
                    <GroupsIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {leaveBalances.length === 0
                        ? t('vacationManagement.noLeaveBalances')
                        : t('vacationManagement.noSearchResults')}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer sx={{ width: '100%', overflow: 'auto', boxShadow: 'none', border: 'none' }}>
                    <Table
                      size="small"
                      sx={{
                        tableLayout: 'auto',
                        width: '100%',
                        '& .MuiTableCell-root': {
                          borderLeft: 'none',
                          borderRight: 'none',
                          borderTop: 'none',
                          whiteSpace: 'nowrap',
                        },
                      }}
                    >
                      <TableHead sx={mvsTableHeadHighlightSx}>
                        <TableRow>
                          <TableCell>{t('vacationManagement.employee')}</TableCell>
                          <TableCell>{t('vacationManagement.department')}</TableCell>
                          <TableCell>{t('vacationManagement.leaveYear')}</TableCell>
                          {leaveBalanceTypes.map((key) => (
                            <TableCell key={key} align="right">
                              {key === 'sick' ? (
                                <Tooltip title={t('vacationManagement.sickOptionalHint')}>
                                  <Box
                                    component="span"
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'flex-end',
                                      gap: 0.5,
                                    }}
                                  >
                                    <span>{typeLabel(key)}</span>
                                    <Chip
                                      size="small"
                                      label={t('vacationManagement.sickOptional')}
                                      variant="outlined"
                                      color="default"
                                      sx={{
                                        height: 20,
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        '& .MuiChip-label': { px: 0.75 },
                                      }}
                                    />
                                  </Box>
                                </Tooltip>
                              ) : (
                                typeLabel(key)
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody sx={vacationTableBodyRowSx}>
                        {filteredLeaveBalances.map((row) => (
                          <TableRow key={row.userId} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                                  {(row.username || '?').charAt(0)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                                    {row.username}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {row.position || '—'}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{row.department || '—'}</TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {row.leaveYearLabel || '—'}
                              </Typography>
                            </TableCell>
                            {leaveBalanceTypes.map((key) => {
                              const bal = row.balances?.[key] || { quota: 0, used: 0, remaining: 0 };
                              const annualLocked = key === 'annual' && !row.canUseAnnualLeave;
                              return (
                                <TableCell key={key} align="right">
                                  <Tooltip
                                    title={`${t('vacationManagement.quotaDays')}: ${bal.quota} / ${t('vacationManagement.usedDays', { days: bal.used })}`}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 600,
                                        color: annualLocked
                                          ? 'text.disabled'
                                          : bal.remaining <= 0
                                            ? 'text.secondary'
                                            : 'text.primary',
                                      }}
                                    >
                                      {annualLocked ? '—' : bal.remaining}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          );
        }
        return (
          <Box sx={mvsBodyListZoneSx}>
            <Box sx={listStateBoxSx}>
              <EventIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
                {t('vacationManagement.adminOnlyLeaveType')}
              </Typography>
            </Box>
          </Box>
        );
      case 4:
        if (!canEditPolicy) {
          return (
            <Box sx={mvsBodyListZoneSx}>
              <Box sx={listStateBoxSx}>
                <EventIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
                  {t('vacationManagement.adminOnlyLeaveType')}
                </Typography>
              </Box>
            </Box>
          );
        }
        return (
          <Box sx={mvsBodyListZoneSx}>
            <Box sx={{ ...mvsBodyCardSx, overflow: 'hidden' }}>
              <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: { xs: 2, sm: 2.5 } }}>
                <Alert severity="info" variant="outlined" sx={{ width: 'auto', borderRadius: 2 }}>
                  {t('vacationManagement.fiscalYearResetNote')}
                </Alert>
              </Box>
              <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: { xs: 2, sm: 2.5 } }}>
              <Grid container spacing={3}>
              {/* 연차 (Earned Leave) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ mb: 3, height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <HomeIcon sx={{ mr: 2, color: 'primary.main', fontSize: '2rem' }} />
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {t('vacationManagement.earnedLeave')}
                          </Typography>
                        </Box>
                        {(user?.role === 'admin' || user?.role === 'root') && (
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={vacationPolicy?.availableTypes?.includes('annual') ?? true}
                                onChange={() => handleToggleVacationType('annual')}
                                disabled={savingPolicy || !canEditPolicy}
                              />
                            }
                            label={t('vacationManagement.provide')}
                            sx={{ ml: 'auto' }}
                          />
                        )}
                      </Box>
                  <Box sx={{ pl: 6 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.earnedLeaveDesc1')}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                        {t('vacationManagement.annualLeaveStartPolicy')}
                      </Typography>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <Select
                          value={vacationPolicy?.annualLeaveStartDays ?? 240}
                          onChange={(e) => handleSavePolicy(Number(e.target.value))}
                          disabled={savingPolicy || !canEditPolicy}
                          sx={{ height: '40px' }}
                        >
                          <MenuItem value={240}>
                            {t('vacationManagement.annualStart240')}
                          </MenuItem>
                          <MenuItem value={30}>{t('vacationManagement.annualStart30')}</MenuItem>
                          <MenuItem value={60}>{t('vacationManagement.annualStart60')}</MenuItem>
                          <MenuItem value={90}>{t('vacationManagement.annualStart90')}</MenuItem>
                          <MenuItem value={0}>{t('vacationManagement.annualStartImmediate')}</MenuItem>
                        </Select>
                      </FormControl>
                      {vacationPolicy && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                          • {vacationPolicy.annualLeaveStartDays === 0
                            ? t('vacationManagement.currentSettingImmediate')
                            : t('vacationManagement.currentSettingDays', { days: vacationPolicy.annualLeaveStartDays })}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.earnedLeaveDesc2')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {t('vacationManagement.earnedLeaveDesc3')}
                    </Typography>
                  </Box>
                </CardContent>
                  </Card>
                </Grid>

                {/* 병가 (Sick Leave) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ mb: 3, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SickIcon sx={{ mr: 2, color: 'error.main', fontSize: '2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('vacationManagement.sickLeave')}
                      </Typography>
                    </Box>
                    {(user?.role === 'admin' || user?.role === 'root') && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={vacationPolicy?.availableTypes?.includes('sick') ?? true}
                            onChange={() => handleToggleVacationType('sick')}
                            disabled={savingPolicy || !canEditPolicy}
                          />
                        }
                        label={t('vacationManagement.provide')}
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>
                  <Box sx={{ pl: 6 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.sickLeaveDesc1')}
                    </Typography>
                    {renderLeaveDaysInput('sick')}
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.sickLeaveDesc2')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {t('vacationManagement.sickLeaveDesc3')}
                    </Typography>
                  </Box>
                </CardContent>
                  </Card>
                </Grid>

                {/* 개인사유 (Casual Leave) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ mb: 3, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 2, color: 'text.secondary', fontSize: '2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('vacationManagement.casualLeave')}
                      </Typography>
                    </Box>
                    {(user?.role === 'admin' || user?.role === 'root') && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={vacationPolicy?.availableTypes?.includes('personal') ?? true}
                            onChange={() => handleToggleVacationType('personal')}
                            disabled={savingPolicy || !canEditPolicy}
                          />
                        }
                        label={t('vacationManagement.provide')}
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>
                  <Box sx={{ pl: 6 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.casualLeaveDesc1')}
                    </Typography>
                    {renderLeaveDaysInput('personal')}
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.casualLeaveDesc2')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {t('vacationManagement.casualLeaveDesc3')}
                    </Typography>
                  </Box>
                </CardContent>
                  </Card>
                </Grid>

                {/* 교육 (Study Leave) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ mb: 3, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StudyIcon sx={{ mr: 2, color: 'info.main', fontSize: '2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('vacationManagement.studyLeave')}
                      </Typography>
                    </Box>
                    {(user?.role === 'admin' || user?.role === 'root') && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={vacationPolicy?.availableTypes?.includes('study') ?? true}
                            onChange={() => handleToggleVacationType('study')}
                            disabled={savingPolicy || !canEditPolicy}
                          />
                        }
                        label={t('vacationManagement.provide')}
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>
                  <Box sx={{ pl: 6 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.studyLeaveDesc1')}
                    </Typography>
                    {renderLeaveDaysInput('study')}
                    <Typography variant="body2" color="text.secondary">
                      • {t('vacationManagement.studyLeaveDesc2')}
                    </Typography>
                  </Box>
                </CardContent>
                  </Card>
                </Grid>

                {/* 출산 (Maternity Leave) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ mb: 3, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <EventIcon sx={{ mr: 2, color: 'success.main', fontSize: '2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('vacationManagement.maternityLeave')}
                      </Typography>
                    </Box>
                    {(user?.role === 'admin' || user?.role === 'root') && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={vacationPolicy?.availableTypes?.includes('maternity') ?? true}
                            onChange={() => handleToggleVacationType('maternity')}
                            disabled={savingPolicy || !canEditPolicy}
                          />
                        }
                        label={t('vacationManagement.provide')}
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>
                  <Box sx={{ pl: 6 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.maternityLeaveDesc1')}
                    </Typography>
                    {renderLeaveDaysInput('maternity')}
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.maternityLeaveDesc2')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {t('vacationManagement.maternityLeaveDesc3')}
                    </Typography>
                  </Box>
                </CardContent>
                  </Card>
                </Grid>

                {/* 육아 (Paternity Leave) */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" sx={{ mb: 3, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WorkIcon sx={{ mr: 2, color: 'warning.main', fontSize: '2rem' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('vacationManagement.paternityLeave')}
                      </Typography>
                    </Box>
                    {(user?.role === 'admin' || user?.role === 'root') && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={vacationPolicy?.availableTypes?.includes('paternity') ?? true}
                            onChange={() => handleToggleVacationType('paternity')}
                            disabled={savingPolicy || !canEditPolicy}
                          />
                        }
                        label={t('vacationManagement.provide')}
                        sx={{ ml: 'auto' }}
                      />
                    )}
                  </Box>
                  <Box sx={{ pl: 6 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.paternityLeaveDesc1')}
                    </Typography>
                    {renderLeaveDaysInput('paternity')}
                    <Typography variant="body2" color="text.secondary" paragraph>
                      • {t('vacationManagement.paternityLeaveDesc2')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {t('vacationManagement.paternityLeaveDesc3')}
                    </Typography>
                  </Box>
                </CardContent>
                  </Card>
                </Grid>
              </Grid>
              </Box>
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('vacationManagement.title')}
        description={t('vacationManagement.description')}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {showKpi && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          {kpiItems.map((item) => (
            <Card key={item.key} elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                  {item.label}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: item.valueColor ?? 'text.primary' }}
                >
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            px: { xs: 1.5, sm: 2 },
            py: 0.75,
            bgcolor: '#FFFFFF',
            borderBottom: showListFilters ? '1px solid #C5CED9' : 'none',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 44,
              flex: '1 1 auto',
              minWidth: 0,
              '& .MuiTabs-flexContainer': { gap: 0.25 },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8125rem',
                letterSpacing: '-0.01em',
                minHeight: 44,
                minWidth: 'auto',
                px: { xs: 1.25, sm: 1.75 },
                py: 0.75,
                color: 'text.secondary',
                '& .MuiTab-iconWrapper': {
                  marginRight: '6px',
                  marginBottom: '0 !important',
                  fontSize: '1.125rem',
                },
              },
              '& .MuiTab-root.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
              },
            }}
          >
            {(user?.role === 'admin' || user?.role === 'root') && (
              <Tab
                icon={<FilterIcon fontSize="small" />}
                label={t('vacationManagement.leaveStatus')}
                iconPosition="start"
              />
            )}
            <Tab
              icon={<ScheduleIcon fontSize="small" />}
              label={t('vacationManagement.myRequestedLeave')}
              iconPosition="start"
            />
            <Tab
              icon={<WorkIcon fontSize="small" />}
              label={t('vacationManagement.leaveApproval')}
              iconPosition="start"
            />
            {(user?.role === 'admin' || user?.role === 'root') && (
              <Tab
                icon={<GroupsIcon fontSize="small" />}
                label={t('vacationManagement.leaveBalances')}
                iconPosition="start"
              />
            )}
            {(user?.role === 'admin' || user?.role === 'root') && (
              <Tab
                icon={<EventIcon fontSize="small" />}
                label={t('vacationManagement.leaveType')}
                iconPosition="start"
              />
            )}
          </Tabs>

          <Tooltip
            title={!hrElevated && !vacationMenuFlags.canCreate ? t('vacationManagement.noPermissionCreate') : ''}
          >
            <span style={{ display: 'inline-flex', flexShrink: 0 }}>
              <Button
                variant="contained"
                disableElevation
                size="small"
                startIcon={<AddIcon fontSize="small" />}
                onClick={handleAdd}
                disabled={!menusLoading && !hrElevated && !vacationMenuFlags.canCreate}
                sx={mvsBodyPrimaryBtnSx}
              >
                {t('vacationManagement.applyLeave')}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {showListFilters ? (
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 2,
              bgcolor: '#FFFFFF',
              ...(mvsSearchFieldSx as Record<string, unknown>),
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: canExportVacations
                  ? 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto auto'
                  : 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) auto',
              },
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            <TextField
              fullWidth
              size="small"
              label={t('common.search')}
              {...VACATION_FILTER_OUTLINED}
              placeholder={t('vacationManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={vacationFilterFieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: '1.125rem', color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              size="small"
              select
              label={t('vacationManagement.status')}
              {...VACATION_FILTER_OUTLINED}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={vacationFilterFieldSx}
            >
              <MenuItem value="all">{t('vacationManagement.allStatus')}</MenuItem>
              <MenuItem value="pending">{t('vacationManagement.statusPending')}</MenuItem>
              <MenuItem value="approved">{t('vacationManagement.statusApproved')}</MenuItem>
              <MenuItem value="rejected">{t('vacationManagement.statusRejected')}</MenuItem>
              <MenuItem value="cancelled">{t('vacationManagement.statusCancelled')}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('vacationManagement.leaveTypeFilter')}
              {...VACATION_FILTER_OUTLINED}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              SelectProps={{ displayEmpty: true }}
              sx={vacationFilterFieldSx}
            >
              <MenuItem value="all">{t('vacationManagement.allTypes')}</MenuItem>
              {vacationTypes.map((type) => (
                <MenuItem key={type.key} value={type.key}>
                  {type.name}
                </MenuItem>
              ))}
            </TextField>
            {canExportVacations ? (
              isCompactToolbar ? (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<MoreHorizIcon fontSize="small" />}
                    onClick={(e) => setToolbarMenuAnchor(e.currentTarget)}
                    sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
                  >
                    {t('vacationManagement.moreTools')}
                  </Button>
                  <Menu
                    anchorEl={toolbarMenuAnchor}
                    open={Boolean(toolbarMenuAnchor)}
                    onClose={() => setToolbarMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 0.5,
                          minWidth: 220,
                          borderRadius: '12px',
                          border: '1px solid #C5CED9',
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
                        },
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setToolbarMenuAnchor(null);
                        handleExportExcel();
                      }}
                    >
                      <ListItemIcon>
                        <DownloadIcon fontSize="small" />
                      </ListItemIcon>
                      {t('vacationManagement.export')}
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon fontSize="small" />}
                  onClick={handleExportExcel}
                  sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
                >
                  {t('vacationManagement.export')}
                </Button>
              )
            ) : null}
            <Button
              variant="outlined"
              size="small"
              startIcon={<ResetIcon fontSize="small" />}
              onClick={handleResetFilters}
              sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
            >
              {t('vacationManagement.reset')}
            </Button>
          </Box>
        ) : null}
      </Card>

      {getTabContent()}

      {/* 휴가 세부사항 Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetailDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{t('vacationManagement.leaveDetail')}</Typography>
            {selectedVacation && getStatusChip(selectedVacation.status)}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedVacation && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('vacationManagement.employeeInfo')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 48, height: 48 }}>
                      {selectedVacation.employeeName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {selectedVacation.employeeName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedVacation.department} • {selectedVacation.position}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    휴가 유형
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {getTypeChip(selectedVacation.vacationType)}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    기간
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      {selectedVacation.startDate} ~ {selectedVacation.endDate}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('vacationManagement.days')}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Chip label={`${selectedVacation.days}${t('vacationManagement.daysUnit')}`} color="info" />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('vacationManagement.reason')}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                    {selectedVacation.reason}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t('vacationManagement.applicationDate')}
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedVacation.appliedDate}
                  </Typography>
                </Grid>
                {selectedVacation.approvedBy && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.approver')}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedVacation.approvedBy}
                    </Typography>
                  </Grid>
                )}
                {selectedVacation.approvedDate && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.approvedDate')}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedVacation.approvedDate}
                    </Typography>
                  </Grid>
                )}
                {selectedVacation.rejectionReason && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.rejectionReason')}
                    </Typography>
                    <Typography variant="body1" color="error" sx={{ mb: 2 }}>
                      {selectedVacation.rejectionReason}
                    </Typography>
                  </Grid>
                )}
                {selectedVacation.status === 'pending' && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.rejectionReasonRequired')}
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t('vacationManagement.rejectionReasonPlaceholder')}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDetailDialog}>
            {t('common.close')}
          </Button>
          {selectedVacation && selectedVacation.status === 'pending' && (() => {
            // 탭 2(받은 휴가 승인)일 때만 승인/반려 버튼 표시
            const adjustedTab = (user?.role === 'admin' || user?.role === 'root') ? activeTab : activeTab + 1;
            if (adjustedTab === 2 && canApproveVacationRequest(selectedVacation)) {
              return (
                <>
                  <Button 
                    onClick={handleRejectFromDialog} 
                    color="error"
                    variant="outlined"
                    disabled={!rejectReason.trim()}
                  >
                    {t('vacationManagement.reject')}
                  </Button>
                  <Button 
                    onClick={handleApproveFromDialog} 
                    color="success"
                    variant="contained"
                  >
                    {t('vacationManagement.approve')}
                  </Button>
                </>
              );
            }
            return null;
          })()}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDialogState.open}
        title={confirmDialogState.title}
        message={confirmDialogState.message}
        confirmText={confirmDialogState.confirmText}
        cancelText={confirmDialogState.cancelText}
        confirmColor={confirmDialogState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <PromptDialog
        open={promptDialogState.open}
        title={promptDialogState.title}
        message={promptDialogState.message}
        label={promptDialogState.label}
        defaultValue={promptDialogState.defaultValue}
        placeholder={promptDialogState.placeholder}
        multiline={promptDialogState.multiline}
        minRows={promptDialogState.minRows}
        confirmText={promptDialogState.confirmText}
        cancelText={promptDialogState.cancelText}
        required={promptDialogState.required}
        onConfirm={handlePromptConfirm}
        onCancel={handlePromptCancel}
      />
    </Box>
  );
};

export default VacationManagement;
