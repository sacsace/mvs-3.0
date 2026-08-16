import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  InputAdornment,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootFullBleedSx,
  mvsKpiCardSx,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsOutlinedLabelProps,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
} from '../../theme/mvsLayout';
import { useTranslation } from 'react-i18next';
import {
  Add as AddIcon,
  Search as SearchIcon,
  RestartAlt as ResetIcon,
  AttachMoney as MoneyIcon,
  Email as EmailIcon,
  TaskAlt as TaskAltIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { payrollService, companyService } from '../../services/api';
import { useStore } from '../../store';
import PayrollExcelGrid, { payrollRecordToGridRow, type PayrollGridRow } from './PayrollExcelGrid';
import PayrollPayslipDialog from './PayrollPayslipDialog';
import PayrollSendPayslipsDialog from './PayrollSendPayslipsDialog';
import { exportPayrollGridToExcel } from './payroll/exportPayrollGridToExcel';
import { resolveRegisteredStateCodeFromCompanyLike } from './payroll/indianProfessionalTax';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';
import { normalizePayMonth, isPayMonthAfterCurrent } from '../../utils/payMonth';

const PAYROLL_MENU_ROUTES = ['/hr/payroll', '/hr'] as const;
const PAYSLIP_SEND_MENU_ROUTES = ['/hr/payslip-send', '/hr'] as const;
const PAYROLL_FILTER_OUTLINED = mvsOutlinedLabelProps;
const payrollFilterFieldSx = { ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx } as const;

function parsePayrollMoney(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function formatPayrollSummaryRupee(amount: number): string {
  return Math.floor(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** 필드 테두리·라벨 영역 클릭 시에도 네이티브 월 선택기가 열리도록 */
function openMonthPickerFromFieldContainer(e: React.MouseEvent<HTMLElement>) {
  if ((e.target as HTMLElement).closest('input[type="month"]')) return;
  const input = e.currentTarget.querySelector('input[type="month"]') as HTMLInputElement | null;
  if (!input || input.disabled) return;
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  } catch {
    input.focus();
    input.click();
  }
}

type PayrollBulkPreviewAttendance = {
  with_attendance: number;
  without_attendance: number;
  without_attendance_usernames: string[];
  daily_without_records: { id: number; username: string }[];
};

type PayrollBulkPreviewPayload = {
  payroll_period: string;
  can_generate: boolean;
  block_reason?: string | null;
  existing_active_count?: number;
  employee_total: number;
  attendance: PayrollBulkPreviewAttendance | null;
};

type PayrollManagementProps = {
  /** 급여 생성·수정 없이 확정된 급여 목록에서 명세서를 메일 발송하는 전용 화면 */
  payslipSendOnly?: boolean;
};

const PayrollManagement: React.FC<PayrollManagementProps> = ({ payslipSendOnly = false }) => {
  const { t } = useTranslation();
  const user = useStore((s) => s.user);
  const isRoot = useStore((s) => s.user?.role === 'root');
  const menuFlags = useMenuRoutePermissionFlags(
    payslipSendOnly ? PAYSLIP_SEND_MENU_ROUTES : PAYROLL_MENU_ROUTES
  );
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [payrollPeriod, setPayrollPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [creating, setCreating] = useState(false);
  const [payslipOpen, setPayslipOpen] = useState(false);
  const [payslipRow, setPayslipRow] = useState<PayrollGridRow | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [lockedPeriods, setLockedPeriods] = useState<Set<string>>(new Set());
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [payrollPreviewOpen, setPayrollPreviewOpen] = useState(false);
  const [payrollPreviewPayload, setPayrollPreviewPayload] = useState<PayrollBulkPreviewPayload | null>(null);
  const [previewAttendanceLoading, setPreviewAttendanceLoading] = useState(false);
  const [companyRegisteredStateCode, setCompanyRegisteredStateCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCompanyState = async () => {
      const companyId = user?.company_id;
      if (!companyId) {
        if (!cancelled) setCompanyRegisteredStateCode(null);
        return;
      }
      try {
        const response = await companyService.getCompany(Number(companyId));
        if (!response.success || !response.data) {
          if (!cancelled) setCompanyRegisteredStateCode(null);
          return;
        }
        const data = response.data;
        let gstNumbers = data.gst_numbers ?? data.gstNumbers ?? [];
        try {
          const gstRes = await companyService.getCompanyGstNumbers(Number(companyId));
          if (gstRes?.success && Array.isArray(gstRes.data?.gst_numbers) && gstRes.data.gst_numbers.length > 0) {
            gstNumbers = gstRes.data.gst_numbers;
          }
        } catch {
          /* GST API 실패 시 회사 본문의 gst_numbers 사용 */
        }
        const code = resolveRegisteredStateCodeFromCompanyLike({
          settings: data.settings,
          address: data.address,
          business_number: data.business_number || data.businessNumber,
          gst_numbers: gstNumbers
        });
        if (!cancelled) setCompanyRegisteredStateCode(code);
      } catch {
        if (!cancelled) setCompanyRegisteredStateCode(null);
      }
    };
    void loadCompanyState();
    return () => {
      cancelled = true;
    };
  }, [user?.company_id]);

  const payrollRecalcContext = useMemo(
    () => ({
      companyStateCode: companyRegisteredStateCode,
      payrollMonth: normalizePayMonth(payrollPeriod.trim()) || payrollPeriod.trim()
    }),
    [companyRegisteredStateCode, payrollPeriod]
  );

  const loadLocks = useCallback(async () => {
    if (menuFlags.menusLoading || !menuFlags.canRead) {
      setLockedPeriods(new Set());
      return;
    }
    try {
      const res = await payrollService.getPayrollPeriodLocks();
      if (res.success && Array.isArray((res as any).data?.locked_periods)) {
        const keys = ((res as any).data.locked_periods as string[])
          .map((p) => normalizePayMonth(p) || String(p).trim())
          .filter(Boolean);
        setLockedPeriods(new Set(keys));
      }
    } catch {
      /* ignore */
    }
  }, [menuFlags.menusLoading, menuFlags.canRead]);

  const loadPayrollData = useCallback(async () => {
    if (menuFlags.menusLoading || !menuFlags.canRead) {
      setPayrollRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await payrollService.getPayrolls({ page: 1, limit: 10000 });
      if (response.success) {
        setPayrollRecords(response.data || []);
      } else {
        setError(response.message || t('payrollManagement.errors.loadFailed'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('payrollManagement.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t, menuFlags.menusLoading, menuFlags.canRead]);

  useEffect(() => {
    void loadPayrollData();
    void loadLocks();
  }, [loadPayrollData, loadLocks]);

  const periodTrim = payrollPeriod.trim();
  const periodKey = normalizePayMonth(periodTrim);
  const isFuturePayMonth = !!periodKey && isPayMonthAfterCurrent(periodKey);
  const maxSelectablePayMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  /** 목록·요약: 선택 급여월(정규화)과 일치하는 활성 급여만 */
  const payrollRecordsForSelectedMonth = useMemo(() => {
    if (!periodKey) return [];
    // 발송 전용 화면은 확정된 급여월의 명세서만 노출한다.
    if (payslipSendOnly && !lockedPeriods.has(periodKey)) return [];
    return payrollRecords.filter((p: any) => {
      const rowMonth = normalizePayMonth(String(p.payroll_period ?? '').trim());
      const active = p.is_active === undefined || p.is_active === true;
      return active && rowMonth === periodKey;
    });
  }, [payrollRecords, periodKey, payslipSendOnly, lockedPeriods]);

  const filteredRecords = useMemo(() => {
    let list = [...payrollRecordsForSelectedMonth];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((p: any) => {
        const emp = p.employee || {};
        return (
          String(emp.username || '')
            .toLowerCase()
            .includes(s) ||
          String(emp.department || '')
            .toLowerCase()
            .includes(s) ||
          String(emp.position || '')
            .toLowerCase()
            .includes(s)
        );
      });
    }
    if (departmentFilter) {
      list = list.filter((p: any) => (p.employee?.department || '') === departmentFilter);
    }
    return list;
  }, [payrollRecordsForSelectedMonth, searchTerm, departmentFilter]);

  const gridRows = useMemo(
    () => filteredRecords.map((p, i) => payrollRecordToGridRow(p, i, payrollRecalcContext)),
    [filteredRecords, payrollRecalcContext]
  );

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          payrollRecordsForSelectedMonth.map((p: any) => p.employee?.department).filter(Boolean) as string[]
        )
      ),
    [payrollRecordsForSelectedMonth]
  );

  /** 조회 급여월(`periodKey`)에 해당하는 활성 급여만 합산 — 상단 카드·그리드 데이터 범위와 동일 */
  const summaryStats = useMemo(() => {
    const rows = payrollRecordsForSelectedMonth;
    return {
      gross: rows.reduce((s, p: any) => s + parsePayrollMoney(p.gross_salary), 0),
      net: rows.reduce((s, p: any) => s + parsePayrollMoney(p.net_salary), 0),
      tax: rows.reduce((s, p: any) => s + parsePayrollMoney(p.tax_amount), 0),
      pending: rows.filter((p: any) => p.status === 'pending').length
    };
  }, [payrollRecordsForSelectedMonth]);

  /** 미리보기 API로 출퇴근·중복 여부 확인 후 확인 창 표시 */
  const handleRequestBulkPayrollPreview = async () => {
    if (menuFlags.menusLoading || !menuFlags.canCreate) return;
    const pk = normalizePayMonth(payrollPeriod.trim());
    if (!pk) {
      setError(t('payrollManagement.errors.periodRequired'));
      return;
    }
    if (isPayMonthAfterCurrent(pk)) {
      setError(t('payrollManagement.errors.futurePayMonthNotAllowed'));
      return;
    }
    if (lockedPeriods.has(pk)) {
      setError(t('payrollManagement.errors.periodLocked'));
      return;
    }
    setPreviewAttendanceLoading(true);
    setError('');
    try {
      const res = await payrollService.previewBulkPayrollGeneration(payrollPeriod.trim());
      if (!res.success) {
        setError((res as any).message || t('payrollManagement.errors.bulkCreateFailed'));
        return;
      }
      const data = (res as any).data as PayrollBulkPreviewPayload;
      if (!data.can_generate) {
        if (data.block_reason === 'already_exists') {
          setError(t('payrollManagement.preview.blockedAlreadyExists'));
        } else {
          setError(t('payrollManagement.errors.bulkCreateFailed'));
        }
        return;
      }
      setPayrollPreviewPayload(data);
      setOpenDialog(false);
      setPayrollPreviewOpen(true);
    } catch (err: any) {
      const st = err.response?.status;
      const msg = err.response?.data?.message;
      if (st === 403 && msg) setError(msg);
      else setError(msg || t('payrollManagement.errors.bulkCreateFailed'));
    } finally {
      setPreviewAttendanceLoading(false);
    }
  };

  const handleExecuteBulkPayrollAfterPreview = async () => {
    if (menuFlags.menusLoading || !menuFlags.canCreate) return;
    const pk = normalizePayMonth(payrollPeriod.trim());
    const period = pk || payrollPeriod.trim();
    if (!period) {
      setError(t('payrollManagement.errors.periodRequired'));
      return;
    }
    if (pk && isPayMonthAfterCurrent(pk)) {
      setError(t('payrollManagement.errors.futurePayMonthNotAllowed'));
      return;
    }
    if (pk && lockedPeriods.has(pk)) {
      setError(t('payrollManagement.errors.periodLocked'));
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await payrollService.bulkGeneratePayrolls(period);
      if (res.success) {
        setSuccess((res as any).message || t('payrollManagement.success.bulkCreated'));
        setOpenDialog(false);
        setPayrollPreviewOpen(false);
        setPayrollPreviewPayload(null);
        await loadPayrollData();
      } else {
        setError((res as any).message || t('payrollManagement.errors.bulkCreateFailed'));
      }
    } catch (err: any) {
      const st = err.response?.status;
      const msg = err.response?.data?.message;
      if (st === 403 && msg) setError(msg);
      else if (st === 409) setError(msg || t('payrollManagement.errors.alreadyGenerated'));
      else setError(msg || t('payrollManagement.errors.bulkCreateFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmCompletePeriod = async () => {
    if (menuFlags.menusLoading || !menuFlags.canMutate) return;
    const period = normalizePayMonth(payrollPeriod.trim()) || payrollPeriod.trim();
    if (!period) {
      setError(t('payrollManagement.errors.periodRequired'));
      return;
    }
    const pkComplete = normalizePayMonth(payrollPeriod.trim());
    if (pkComplete && isPayMonthAfterCurrent(pkComplete)) {
      setError(t('payrollManagement.errors.futurePayMonthNotAllowed'));
      return;
    }
    if (lockedPeriods.has(period)) {
      setCompleteDialogOpen(false);
      return;
    }
    setCompleting(true);
    setError('');
    try {
      const res = await payrollService.completePayrollPeriod(period);
      if (res.success) {
        setSuccess((res as any).message || t('payrollManagement.success.periodCompleted'));
        setCompleteDialogOpen(false);
        await loadLocks();
        await loadPayrollData();
      } else {
        setError((res as any).message || t('payrollManagement.errors.periodCompleteFailed'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('payrollManagement.errors.periodCompleteFailed'));
    } finally {
      setCompleting(false);
    }
  };

  const handleOpenPayslip = useCallback(
    (row: PayrollGridRow) => {
      if (menuFlags.menusLoading || !menuFlags.canRead) return;
      setPayslipRow(row);
      setPayslipOpen(true);
    },
    [menuFlags.menusLoading, menuFlags.canRead]
  );

  const handleExportExcel = useCallback(() => {
    if (menuFlags.menusLoading || !menuFlags.canRead || !gridRows.length) return;
    exportPayrollGridToExcel(gridRows, t);
    setSuccess(t('payrollManagement.success.exportedExcel'));
  }, [gridRows, menuFlags.canRead, menuFlags.menusLoading, t]);

  /** 급여 생성 완료(잠금)된 월 — 명세서 발송 허용·「급여 생성 완료」재실행 비활성 */
  const selectedPeriodPayrollComplete = !!periodKey && lockedPeriods.has(periodKey);
  /** 확정된 월만 상단·대화상자에서 일괄 생성 차단(미생성 월은 미리보기 후 생성) */
  const bulkCreateBlockedByLock = !!periodKey && lockedPeriods.has(periodKey);
  /** 그리드가 이미 선택 월만 표시하므로 동일 */
  const gridRowsForPayslipSend = gridRows;

  const payslipSendDisabled =
    menuFlags.menusLoading ||
    !menuFlags.canMutate ||
    loading ||
    !selectedPeriodPayrollComplete ||
    gridRowsForPayslipSend.length === 0;

  const payslipSendTooltip = payslipSendDisabled
    ? loading || menuFlags.menusLoading
      ? ''
      : !menuFlags.canMutate
        ? t('common.menuNoMutate')
        : !selectedPeriodPayrollComplete
          ? t('payrollManagement.payslip.sendRequiresComplete')
          : t('payrollManagement.payslip.sendNoRowsForPayMonth')
    : '';

  /** 상단 버튼: 월별 차단 없이 열기 — 대화상자에서 2·3월 등 다른 급여월 선택 가능 */
  const bulkCreateOpenDisabled =
    menuFlags.menusLoading || !menuFlags.canCreate || creating;
  /** 대화상자「생성」: 확정·미래 월 비활성(미생성 과거·당월은 미리보기로 판별) */
  const bulkCreateDisabled =
    bulkCreateOpenDisabled ||
    bulkCreateBlockedByLock ||
    previewAttendanceLoading ||
    isFuturePayMonth;
  const bulkCreateDialogTooltip = bulkCreateDisabled
    ? previewAttendanceLoading || creating || menuFlags.menusLoading
      ? ''
      : !menuFlags.canCreate
        ? t('common.menuNoCreate')
        : isFuturePayMonth
          ? t('payrollManagement.errors.futurePayMonthNotAllowed')
          : periodKey && lockedPeriods.has(periodKey)
            ? t('payrollManagement.errors.periodLocked')
            : ''
    : '';
  const bulkCreateHeaderTooltip = bulkCreateOpenDisabled
    ? bulkCreateDialogTooltip
    : bulkCreateBlockedByLock
      ? t('payrollManagement.hints.createChooseOtherMonth')
      : '';

  const completePayrollToolbarDisabled =
    menuFlags.menusLoading ||
    !menuFlags.canMutate ||
    completing ||
    !periodKey ||
    selectedPeriodPayrollComplete ||
    isFuturePayMonth;
  const completePayrollToolbarTooltip = completePayrollToolbarDisabled
    ? completing || menuFlags.menusLoading
      ? ''
      : !menuFlags.canMutate
        ? t('common.menuNoMutate')
        : !periodKey
          ? t('payrollManagement.errors.periodRequired')
          : isFuturePayMonth
            ? t('payrollManagement.errors.futurePayMonthNotAllowed')
            : selectedPeriodPayrollComplete
              ? t('payrollManagement.errors.periodAlreadyFinalized')
              : ''
    : '';

  const completeDialogConfirmDisabled =
    menuFlags.menusLoading ||
    !menuFlags.canMutate ||
    completing ||
    !periodKey ||
    lockedPeriods.has(periodKey) ||
    isFuturePayMonth;
  const completeDialogConfirmTooltip = completeDialogConfirmDisabled
    ? completing || menuFlags.menusLoading
      ? ''
      : !menuFlags.canMutate
        ? t('common.menuNoMutate')
        : !periodKey
          ? t('payrollManagement.errors.periodRequired')
          : isFuturePayMonth
            ? t('payrollManagement.errors.futurePayMonthNotAllowed')
            : lockedPeriods.has(periodKey)
              ? t('payrollManagement.errors.periodAlreadyFinalized')
              : ''
    : '';

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
    flex: 1,
    minHeight: 240,
  } as const;

  const hasActiveFilters = Boolean(searchTerm.trim() || departmentFilter);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
  };

  return (
    <Box sx={{ ...mvsPageRootFullBleedSx, flex: 1, minWidth: 0 }}>
      <MvsPageHeader
        title={t(payslipSendOnly ? 'payrollManagement.payslipSendSystem.title' : 'payrollManagement.title')}
        description={t(
          payslipSendOnly
            ? 'payrollManagement.payslipSendSystem.description'
            : 'payrollManagement.description'
        )}
      />

      {!menuFlags.menusLoading && !menuFlags.canRead && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('common.menuNoView')}
        </Alert>
      )}

      {payslipSendOnly ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('payrollManagement.payslipSendSystem.completeOnlyHint')}
        </Alert>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {periodKey
            ? t('payrollManagement.summary.scopeForPayMonth', { period: periodKey })
            : t('payrollManagement.summary.scopeNoMonth')}
        </Typography>
      )}

      {!payslipSendOnly && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          {[
            { key: 'gross', label: t('payrollManagement.summary.totalSalary'), value: `Rs. ${formatPayrollSummaryRupee(summaryStats.gross)}` },
            { key: 'net', label: t('payrollManagement.summary.netSalary'), value: `Rs. ${formatPayrollSummaryRupee(summaryStats.net)}` },
            { key: 'tax', label: t('payrollManagement.summary.totalTax'), value: `Rs. ${formatPayrollSummaryRupee(summaryStats.tax)}` },
            { key: 'pending', label: t('payrollManagement.summary.pendingPayroll'), value: String(summaryStats.pending), valueColor: 'warning.main' as const },
          ].map((item) => (
            <Card key={item.key} elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                  {item.label}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    mt: 0.75,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: item.valueColor ?? 'text.primary',
                  }}
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
            flexDirection: { xs: 'column', md: 'row' },
            flexWrap: 'wrap',
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: { md: 'space-between' },
            gap: { xs: 1.25, md: 1 },
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            bgcolor: '#FFFFFF',
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {!payslipSendOnly && (
              <Tooltip title={t('common.menuNoView')} disableHoverListener={menuFlags.menusLoading || menuFlags.canRead}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FileDownloadIcon fontSize="small" />}
                    onClick={handleExportExcel}
                    disabled={menuFlags.menusLoading || !menuFlags.canRead || loading || gridRows.length === 0}
                    sx={mvsBodyOutlinedBtnSx}
                  >
                    {t('payrollManagement.actions.exportExcel')}
                  </Button>
                </span>
              </Tooltip>
            )}
            <Tooltip title={payslipSendTooltip} disableHoverListener={!payslipSendTooltip}>
              <span style={{ display: 'inline-flex' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EmailIcon fontSize="small" />}
                  disabled={payslipSendDisabled}
                  onClick={() => setSendDialogOpen(true)}
                  sx={mvsBodyOutlinedBtnSx}
                >
                  {t('payrollManagement.payslip.sendTitle')}
                </Button>
              </span>
            </Tooltip>
            {!payslipSendOnly && (
              <Tooltip title={completePayrollToolbarTooltip} disableHoverListener={!completePayrollToolbarTooltip}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="contained"
                    color="error"
                    disableElevation
                    size="small"
                    startIcon={<TaskAltIcon fontSize="small" />}
                    onClick={() => setCompleteDialogOpen(true)}
                    disabled={completePayrollToolbarDisabled}
                    sx={{
                      textTransform: 'none',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      minHeight: 36,
                      px: 2,
                      boxShadow: 'none',
                    }}
                  >
                    {t('payrollManagement.actions.completePayroll')}
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
          {!payslipSendOnly && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 1,
                flexShrink: 0,
                width: { xs: '100%', md: 'auto' },
                ml: { md: 'auto' },
              }}
            >
              <Tooltip title={bulkCreateHeaderTooltip} disableHoverListener={!bulkCreateHeaderTooltip}>
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    disableElevation
                    size="small"
                    startIcon={<AddIcon fontSize="small" />}
                    disabled={bulkCreateOpenDisabled}
                    onClick={() => setOpenDialog(true)}
                    sx={mvsBodyPrimaryBtnSx}
                  >
                    {t('payrollManagement.actions.createPayroll')}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          )}
        </Box>

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
              lg: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr) auto',
            },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
          <TextField
            fullWidth
            size="small"
            type="month"
            label={t('payrollManagement.searchPayMonthLabel')}
            {...PAYROLL_FILTER_OUTLINED}
            value={payrollPeriod}
            onChange={(e) => setPayrollPeriod(e.target.value)}
            onClick={openMonthPickerFromFieldContainer}
            inputProps={{ max: maxSelectablePayMonth }}
            disabled={menuFlags.menusLoading || !menuFlags.canRead}
            sx={{ ...payrollFilterFieldSx, cursor: menuFlags.menusLoading || !menuFlags.canRead ? undefined : 'pointer' }}
          />
          <TextField
            fullWidth
            size="small"
            label={t('payrollManagement.searchFieldLabel')}
            {...PAYROLL_FILTER_OUTLINED}
            placeholder={t('payrollManagement.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={menuFlags.menusLoading || !menuFlags.canRead}
            sx={payrollFilterFieldSx}
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
            label={t('payrollManagement.department')}
            {...PAYROLL_FILTER_OUTLINED}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            disabled={menuFlags.menusLoading || !menuFlags.canRead}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) =>
                selected === '' || selected == null ? t('payrollManagement.all') : String(selected),
            }}
            sx={payrollFilterFieldSx}
          >
            <MenuItem value="">{t('payrollManagement.all')}</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ResetIcon fontSize="small" />}
            onClick={handleResetFilters}
            disabled={menuFlags.menusLoading || !menuFlags.canRead}
            sx={{ ...mvsBodyOutlinedBtnSx, height: 40, whiteSpace: 'nowrap' }}
          >
            {t('payrollManagement.actions.reset')}
          </Button>
        </Box>
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        {loading ? (
          <Box sx={listStateBoxSx}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              {t('payrollManagement.empty.loading')}
            </Typography>
          </Box>
        ) : gridRows.length === 0 ? (
          <Box sx={listStateBoxSx}>
            <MoneyIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
              {hasActiveFilters
                ? t('payrollManagement.empty.noResults')
                : t('payrollManagement.empty.noItems')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              {payslipSendOnly && periodKey && !selectedPeriodPayrollComplete
                ? t('payrollManagement.payslipSendSystem.unfinalizedMonthHint')
                : hasActiveFilters
                ? t('payrollManagement.empty.noResultsHint')
                : t('payrollManagement.empty.noItemsHint')}
            </Typography>
            {hasActiveFilters ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ResetIcon fontSize="small" />}
                onClick={handleResetFilters}
                sx={mvsBodyOutlinedBtnSx}
              >
                {t('payrollManagement.actions.reset')}
              </Button>
            ) : !payslipSendOnly ? (
              <Tooltip title={bulkCreateHeaderTooltip} disableHoverListener={!bulkCreateHeaderTooltip}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    variant="contained"
                    disableElevation
                    size="small"
                    startIcon={<AddIcon fontSize="small" />}
                    disabled={bulkCreateOpenDisabled}
                    onClick={() => setOpenDialog(true)}
                    sx={mvsBodyPrimaryBtnSx}
                  >
                    {t('payrollManagement.actions.createPayroll')}
                  </Button>
                </span>
              </Tooltip>
            ) : null}
          </Box>
        ) : (
          <Box sx={{ ...mvsBodyListTableSx, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: 1.5,
                borderBottom: '1px solid #CBD5E1',
                bgcolor: '#FFFFFF',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {periodKey
                  ? t('payrollManagement.listSummary', { period: periodKey, count: gridRows.length })
                  : t('payrollManagement.listSummaryNoMonth', { count: gridRows.length })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('payrollManagement.gridHint')}
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                minWidth: 0,
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                flex: '0 0 auto',
              }}
            >
              <PayrollExcelGrid
                rows={gridRows}
                loading={loading}
                onReload={loadPayrollData}
                onError={(msg) => setError(msg ?? '')}
                onSuccess={setSuccess}
                onOpenPayslip={handleOpenPayslip}
                lockedPeriods={lockedPeriods}
                isRoot={isRoot}
                allowCellEdit={!payslipSendOnly && !menuFlags.menusLoading && menuFlags.canMutate}
                allowDelete={!payslipSendOnly && !menuFlags.menusLoading && menuFlags.canDelete}
                allowOpenPayslip={!menuFlags.menusLoading && menuFlags.canRead}
                companyStateCode={companyRegisteredStateCode}
                payrollMonth={payrollRecalcContext.payrollMonth}
              />
            </Box>
          </Box>
        )}
      </Box>

      <PayrollPayslipDialog
        open={payslipOpen}
        row={payslipRow}
        onClose={() => {
          setPayslipOpen(false);
          setPayslipRow(null);
        }}
      />

      <PayrollSendPayslipsDialog
        open={sendDialogOpen}
        rows={gridRowsForPayslipSend}
        onClose={() => setSendDialogOpen(false)}
        onSent={(msg) => setSuccess(msg)}
        onError={(msg) => setError(msg)}
      />

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('payrollManagement.dialog.createTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('payrollManagement.dialog.enterInfo')}
            </Typography>
            <TextField
              fullWidth
              type="month"
              label={t('payrollManagement.dialog.payrollPeriodLabel')}
              value={payrollPeriod}
              onChange={(e) => setPayrollPeriod(e.target.value)}
              onClick={openMonthPickerFromFieldContainer}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: maxSelectablePayMonth }}
              disabled={menuFlags.menusLoading || !menuFlags.canCreate}
              sx={{ cursor: menuFlags.menusLoading || !menuFlags.canCreate ? undefined : 'pointer' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={creating || previewAttendanceLoading}>
            {t('common.cancel')}
          </Button>
          <Tooltip title={bulkCreateDialogTooltip} disableHoverListener={!bulkCreateDialogTooltip}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                onClick={() => void handleRequestBulkPayrollPreview()}
                disabled={bulkCreateDisabled}
              >
                {t('payrollManagement.actions.create')}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <Dialog
        open={payrollPreviewOpen}
        onClose={() => {
          if (!creating) {
            setPayrollPreviewOpen(false);
            setPayrollPreviewPayload(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('payrollManagement.preview.title')}</DialogTitle>
        <DialogContent>
          {payrollPreviewPayload?.attendance && (
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2">
                {t('payrollManagement.preview.summary', {
                  period: payrollPreviewPayload.payroll_period,
                  total: payrollPreviewPayload.employee_total
                })}
              </Typography>
              <Typography variant="body2" color="success.main">
                {t('payrollManagement.preview.withAttendance', {
                  count: payrollPreviewPayload.attendance.with_attendance
                })}
              </Typography>
              <Typography variant="body2" color={payrollPreviewPayload.attendance.without_attendance > 0 ? 'warning.main' : 'text.secondary'}>
                {t('payrollManagement.preview.withoutAttendance', {
                  count: payrollPreviewPayload.attendance.without_attendance
                })}
              </Typography>
              {payrollPreviewPayload.attendance.without_attendance_usernames.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                  {t('payrollManagement.preview.withoutNames', {
                    names: payrollPreviewPayload.attendance.without_attendance_usernames.join(', ')
                  })}
                </Typography>
              )}
              {payrollPreviewPayload.attendance.daily_without_records.length > 0 && (
                <Alert severity="info" sx={{ mt: 0.5 }}>
                  {t('payrollManagement.preview.dailyNote')}
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary">
                {t('payrollManagement.preview.footnote')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!creating) {
                setPayrollPreviewOpen(false);
                setPayrollPreviewPayload(null);
              }
            }}
            disabled={creating}
          >
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={() => void handleExecuteBulkPayrollAfterPreview()} disabled={creating}>
            {t('payrollManagement.preview.confirmRun')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={completeDialogOpen}
        onClose={() => !completing && setCompleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('payrollManagement.dialog.completeTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              type="month"
              label={t('payrollManagement.dialog.payrollPeriodLabel')}
              value={payrollPeriod}
              onChange={(e) => setPayrollPeriod(e.target.value)}
              onClick={openMonthPickerFromFieldContainer}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: maxSelectablePayMonth }}
              sx={{
                mb: 2,
                cursor: menuFlags.menusLoading || !menuFlags.canMutate ? undefined : 'pointer'
              }}
              disabled={menuFlags.menusLoading || !menuFlags.canMutate}
            />
            <Typography variant="body2" color="text.secondary">
              {t('payrollManagement.dialog.completeMessage', {
                period: payrollPeriod.trim() || '—'
              })}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)} disabled={completing}>
            {t('common.cancel')}
          </Button>
          <Tooltip title={completeDialogConfirmTooltip} disableHoverListener={!completeDialogConfirmTooltip}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                color="error"
                onClick={() => void handleConfirmCompletePeriod()}
                disabled={completeDialogConfirmDisabled}
              >
                {t('payrollManagement.actions.completePayroll')}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PayrollManagement;
