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
  Paper,
  Button,
  IconButton,
  Chip,
  Avatar,
  InputAdornment,
  Divider,
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
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableSortLabel
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as RejectIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  LocalHospital as SickIcon,
  School as StudyIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon
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
  approvedDate?: string;
  rejectionReason?: string;
  attachments?: string[];
}

const VACATION_MENU_ROUTES = ['/hr/leave'];

const VacationManagement: React.FC = () => {
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
  const [vacationPolicy, setVacationPolicy] = useState<{ annualLeaveStartDays: number; annualLeaveEarnDays: number; availableTypes?: string[] } | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<VacationRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarDept, setCalendarDept] = useState<string>('');
  const canEditPolicy = user?.role === 'admin' || user?.role === 'root';

  useEffect(() => {
    // admin/root만 휴가 현황 탭(0번) 접근 가능
    // 회사 휴가 현황 탭(0번)은 모든 휴가를 조회해야 함
    if ((user?.role === 'admin' || user?.role === 'root') && activeTab === 0) {
      loadAllVacations();
    } else {
      loadVacations();
    }
    
    // admin 이상이고 휴가 형태 탭이면 정책 로드
    if ((user?.role === 'admin' || user?.role === 'root') && activeTab === 3) {
      loadVacationPolicy();
    }
  }, [activeTab, user?.role]);

  const loadAllVacations = async () => {
    setLoading(true);
    setError(null);
    try {
      // 모든 휴가 조회 (필터 없이)
      const response = await vacationService.getVacations();
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
        // 휴가 결제 (승인 요청된 휴가)
        // approved_by가 현재 사용자이고 status가 pending인 휴가만 조회
        params.approved_by = user?.id;
        params.status = 'pending';
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
        availableTypes: vacationPolicy?.availableTypes || ['annual', 'sick', 'personal', 'study', 'maternity', 'paternity']
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
        availableTypes: newTypes
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
        // 휴가 결제 (승인 요청된 휴가)
        params.approved_by = user?.id;
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
    if ((user?.role !== 'admin' && user?.role !== 'root') || activeTab !== 0 || !calendarDept) return [];
    if (calendarDept === CALENDAR_DEPARTMENT_ALL_VALUE) return vacationRequests;
    return vacationRequests.filter((r) => r.department === calendarDept);
  }, [vacationRequests, user?.role, activeTab, calendarDept]);

  useEffect(() => {
    if ((user?.role !== 'admin' && user?.role !== 'root') || activeTab !== 0) return;
    if (deptOptionsForCalendar.length === 0) {
      if (vacationRequests.length > 0) {
        setCalendarDept(CALENDAR_DEPARTMENT_ALL_VALUE);
      } else {
        setCalendarDept('');
      }
      return;
    }
    setCalendarDept((prev) => {
      if (prev === CALENDAR_DEPARTMENT_ALL_VALUE) return CALENDAR_DEPARTMENT_ALL_VALUE;
      if (prev && deptOptionsForCalendar.includes(prev)) return prev;
      const u = user?.department?.trim();
      if (u && deptOptionsForCalendar.includes(u)) return u;
      return deptOptionsForCalendar[0];
    });
  }, [activeTab, user?.role, user?.department, deptOptionsForCalendar, vacationRequests.length]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getTabContent = () => {
    // admin이 아닌 경우 탭 인덱스 조정
    const adjustedTab = (user?.role === 'admin' || user?.role === 'root') ? activeTab : activeTab + 1;
    
    switch (adjustedTab) {
      case 0:
        // 회사 전체 휴가 통계 계산
        const totalRequests = vacationRequests.length;
        const totalPending = vacationRequests.filter(req => req.status === 'pending').length;
        const totalApproved = vacationRequests.filter(req => req.status === 'approved').length;
        const totalRejected = vacationRequests.filter(req => req.status === 'rejected').length;
        const totalCancelled = vacationRequests.filter(req => req.status === 'cancelled').length;
        const totalDays = vacationRequests.reduce((sum, req) => sum + req.days, 0);
        const approvedDays = vacationRequests
          .filter(req => req.status === 'approved')
          .reduce((sum, req) => sum + req.days, 0);
        
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
            {/* 전체 통계 카드 */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.totalRequests')}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {totalRequests}{t('vacationManagement.casesUnit')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.pendingRequests')}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {totalPending}{t('vacationManagement.casesUnit')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.approvedRequests')}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {totalApproved}{t('vacationManagement.casesUnit')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('vacationManagement.totalDays')}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      {totalDays}{t('vacationManagement.daysUnit')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* 부서별 휴가 달력 (휴가 현황) */}
            <Card sx={{ mb: 2 }}>
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
      case 1:
        // 내가 신청한 휴가 (admin이면 1번, 일반 사용자는 0번이지만 adjustedTab으로 1번)
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1 }} />
                {t('vacationManagement.myRequestedLeave')} ({filteredRequests.length}{t('common.count')})
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredRequests.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {vacationRequests.length === 0 ? t('vacationManagement.noLeaveRequests') : t('vacationManagement.noSearchResults')}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sortDirection={orderBy === 'employeeName' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'employeeName'}
                            direction={orderBy === 'employeeName' ? order : 'asc'}
                            onClick={() => handleSort('employeeName')}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t('vacationManagement.employee')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'vacationType' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'vacationType'}
                            direction={orderBy === 'vacationType' ? order : 'asc'}
                            onClick={() => handleSort('vacationType')}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t('vacationManagement.leaveTypeFilter')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'startDate' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'startDate'}
                            direction={orderBy === 'startDate' ? order : 'asc'}
                            onClick={() => handleSort('startDate')}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t('vacationManagement.period')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'days' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'days'}
                            direction={orderBy === 'days' ? order : 'asc'}
                            onClick={() => handleSort('days')}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t('vacationManagement.days')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'reason' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'reason'}
                            direction={orderBy === 'reason' ? order : 'asc'}
                            onClick={() => handleSort('reason')}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t('vacationManagement.reason')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'status' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'status'}
                            direction={orderBy === 'status' ? order : 'asc'}
                            onClick={() => handleSort('status')}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t('vacationManagement.status')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'appliedDate' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'appliedDate'}
                            direction={orderBy === 'appliedDate' ? order : 'asc'}
                            onClick={() => handleSort('appliedDate')}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t('vacationManagement.applicationDate')}
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>{t('vacationManagement.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRequests.map((request) => (
                      <TableRow 
                        key={request.id} 
                        hover
                        onClick={() => handleRowClick(request)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                              {request.employeeName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {request.employeeName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {request.department} • {request.position}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {getTypeChip(request.vacationType)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {request.startDate} ~ {request.endDate}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={`${request.days}${t('vacationManagement.daysUnit')}`} color="info" size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {request.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(request.status)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {request.appliedDate}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          {request.status === 'pending' && vacationMenuFlags.canDelete && (
                            <Tooltip title={t('vacationManagement.delete')}>
                              <IconButton size="small" onClick={() => handleDelete(request.id)} color="error">
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        );
      case 2:
        // 휴가 결제 (admin이면 2번, 일반 사용자는 1번이지만 adjustedTab으로 2번)
        // 미결제(대기)와 결제 완료/거부로 분리
        const pendingRequests = filteredRequests.filter(req => req.status === 'pending');
        const processedRequests = filteredRequests.filter(req => req.status === 'approved' || req.status === 'rejected');
        
        return (
          <Box>
            {/* 미결제 리스트 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <WorkIcon sx={{ mr: 1 }} />
                  {t('vacationManagement.pending')} ({pendingRequests.length}{t('common.count')})
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : pendingRequests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('vacationManagement.noPendingLeave')}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sortDirection={orderBy === 'employeeName' ? order : false}>
                            <TableSortLabel
                              active={orderBy === 'employeeName'}
                              direction={orderBy === 'employeeName' ? order : 'asc'}
                              onClick={() => handleSort('employeeName')}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('vacationManagement.employee')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={orderBy === 'vacationType' ? order : false}>
                            <TableSortLabel
                              active={orderBy === 'vacationType'}
                              direction={orderBy === 'vacationType' ? order : 'asc'}
                              onClick={() => handleSort('vacationType')}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('vacationManagement.leaveTypeFilter')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={orderBy === 'startDate' ? order : false}>
                            <TableSortLabel
                              active={orderBy === 'startDate'}
                              direction={orderBy === 'startDate' ? order : 'asc'}
                              onClick={() => handleSort('startDate')}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('vacationManagement.period')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={orderBy === 'days' ? order : false}>
                            <TableSortLabel
                              active={orderBy === 'days'}
                              direction={orderBy === 'days' ? order : 'asc'}
                              onClick={() => handleSort('days')}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('vacationManagement.days')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={orderBy === 'reason' ? order : false}>
                            <TableSortLabel
                              active={orderBy === 'reason'}
                              direction={orderBy === 'reason' ? order : 'asc'}
                              onClick={() => handleSort('reason')}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('vacationManagement.reason')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={orderBy === 'status' ? order : false}>
                            <TableSortLabel
                              active={orderBy === 'status'}
                              direction={orderBy === 'status' ? order : 'asc'}
                              onClick={() => handleSort('status')}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('vacationManagement.status')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sortDirection={orderBy === 'appliedDate' ? order : false}>
                            <TableSortLabel
                              active={orderBy === 'appliedDate'}
                              direction={orderBy === 'appliedDate' ? order : 'asc'}
                              onClick={() => handleSort('appliedDate')}
                              sx={{ fontWeight: 'bold' }}
                            >
                              {t('vacationManagement.applicationDate')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>{t('vacationManagement.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingRequests.map((request) => (
                        <TableRow 
                          key={request.id} 
                          hover 
                          onClick={() => handleRowClick(request)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                                {request.employeeName.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                  {request.employeeName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {request.department} • {request.position}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {getTypeChip(request.vacationType)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {request.startDate} ~ {request.endDate}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${request.days}${t('vacationManagement.daysUnit')}`} color="info" size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {request.reason}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(request.status)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {request.appliedDate}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title={t('vacationManagement.approve')}>
                                <IconButton size="small" onClick={() => handleApprove(request.id)} color="success">
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('vacationManagement.reject')}>
                                <IconButton size="small" onClick={() => handleReject(request.id)} color="error">
                                  <RejectIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>

            {/* 결제 완료/거부 리스트 */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ mr: 1 }} />
                  {t('vacationManagement.completed')} ({processedRequests.length}{t('common.count')})
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : processedRequests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('vacationManagement.noProcessedLeave')}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'employeeName'}
                              direction={orderBy === 'employeeName' ? order : 'asc'}
                              onClick={() => handleSort('employeeName')}
                            >
                              {t('vacationManagement.employee')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'vacationType'}
                              direction={orderBy === 'vacationType' ? order : 'asc'}
                              onClick={() => handleSort('vacationType')}
                            >
                              {t('vacationManagement.leaveTypeFilter')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'startDate'}
                              direction={orderBy === 'startDate' ? order : 'asc'}
                              onClick={() => handleSort('startDate')}
                            >
                              {t('vacationManagement.period')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'days'}
                              direction={orderBy === 'days' ? order : 'asc'}
                              onClick={() => handleSort('days')}
                            >
                              {t('vacationManagement.days')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'reason'}
                              direction={orderBy === 'reason' ? order : 'asc'}
                              onClick={() => handleSort('reason')}
                            >
                              {t('vacationManagement.reason')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'status'}
                              direction={orderBy === 'status' ? order : 'asc'}
                              onClick={() => handleSort('status')}
                            >
                              {t('vacationManagement.status')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'appliedDate'}
                              direction={orderBy === 'appliedDate' ? order : 'asc'}
                              onClick={() => handleSort('appliedDate')}
                            >
                              {t('vacationManagement.applicationDate')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            <TableSortLabel
                              active={orderBy === 'processedDate'}
                              direction={orderBy === 'processedDate' ? order : 'asc'}
                              onClick={() => handleSort('processedDate')}
                            >
                              {t('vacationManagement.processingDate')}
                            </TableSortLabel>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>{t('vacationManagement.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {processedRequests.map((request) => (
                        <TableRow 
                          key={request.id} 
                          hover 
                          onClick={() => handleRowClick(request)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                                {request.employeeName.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                  {request.employeeName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {request.department} • {request.position}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {getTypeChip(request.vacationType)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {request.startDate} ~ {request.endDate}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={`${request.days}${t('vacationManagement.daysUnit')}`} color="info" size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {request.reason}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getStatusChip(request.status)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {request.appliedDate}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {request.approvedDate || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {/* 작업 컬럼은 비워둠 - 행 클릭으로 상세보기 */}
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Box>
        );
      case 3:
        // 휴가 형태 (admin이면 3번, 일반 사용자는 2번이지만 adjustedTab으로 3번)
        if (!canEditPolicy) {
          return (
            <Card>
              <CardContent>
                <Alert severity="info">
                  {t('vacationManagement.adminOnlyLeaveType')}
                </Alert>
              </CardContent>
            </Card>
          );
        }
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                {t('vacationManagement.leavePolicy')}
              </Typography>
              
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
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', p: 0 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon sx={{ fontSize: '16px !important', color: 'primary.main' }} />
          <Typography component="h1" variant="pageTitle">
            {t('vacationManagement.title')}
          </Typography>
        </Box>
      </Box>

      {/* 탭 메뉴 */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            {(user?.role === 'admin' || user?.role === 'root') && (
              <Tab 
                icon={<FilterIcon />} 
                label={t('vacationManagement.leaveStatus')} 
                iconPosition="start"
              />
            )}
            <Tab 
              icon={<ScheduleIcon />} 
              label={t('vacationManagement.myRequestedLeave')} 
              iconPosition="start"
            />
            <Tab 
              icon={<WorkIcon />} 
              label={t('vacationManagement.leaveApproval')} 
              iconPosition="start"
            />
            {(user?.role === 'admin' || user?.role === 'root') && (
              <Tab 
                icon={<EventIcon />} 
                label={t('vacationManagement.leaveType')} 
                iconPosition="start"
              />
            )}
          </Tabs>
          <Tooltip
            title={
              !hrElevated && !vacationMenuFlags.canCreate
                ? t('vacationManagement.noPermissionCreate')
                : ''
            }
          >
            <span>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                sx={{ ml: 2 }}
                disabled={!menusLoading && !hrElevated && !vacationMenuFlags.canCreate}
              >
                {t('vacationManagement.applyLeave')}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Card>

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

      {/* 검색 및 필터 - 휴가 현황 및 휴가 형태 탭에서는 숨김 */}
      {(() => {
        const adjustedTab = (user?.role === 'admin' || user?.role === 'root') ? activeTab : activeTab + 1;
        const vacationPolicyTab = (user?.role === 'admin' || user?.role === 'root') ? 3 : 2;
        const vacationStatusTab = 0; // 휴가 현황 탭
        if (adjustedTab === vacationPolicyTab || adjustedTab === vacationStatusTab) {
          return null;
        }
        return (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <TextField
                  placeholder={t('vacationManagement.searchPlaceholder')}
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
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                    {t('vacationManagement.status')}
                  </Typography>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    displayEmpty
                    sx={{ height: '40px' }}
                  >
                    <MenuItem value="all">{t('vacationManagement.allStatus')}</MenuItem>
                    <MenuItem value="pending">{t('vacationManagement.statusPending')}</MenuItem>
                    <MenuItem value="approved">{t('vacationManagement.statusApproved')}</MenuItem>
                    <MenuItem value="rejected">{t('vacationManagement.statusRejected')}</MenuItem>
                    <MenuItem value="cancelled">{t('vacationManagement.statusCancelled')}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 120 }}>
                  <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                    {t('vacationManagement.leaveTypeFilter')}
                  </Typography>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    displayEmpty
                    sx={{ height: '40px' }}
                  >
                    <MenuItem value="all">{t('vacationManagement.allTypes')}</MenuItem>
                    {vacationTypes.map(type => (
                      <MenuItem key={type.key} value={type.key}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ flexGrow: 1 }} />
                {canExportVacations && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportExcel}
                  >
                    {t('vacationManagement.export')}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        );
      })()}

      {/* 탭 콘텐츠 */}
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
            if (adjustedTab === 2) {
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
