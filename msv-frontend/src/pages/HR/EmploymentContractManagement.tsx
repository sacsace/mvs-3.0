import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
  FormControlLabel,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Link,
  Checkbox,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Pagination,
  Tooltip,
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import {
  mvsPageRootSx,
  mvsKpiCardSx,
  mvsSearchFieldSx,
  mvsFilterFieldHeightSx,
  mvsOutlinedLabelProps,
  mvsBodyCardSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyListZoneSx,
  mvsBodyListTableSx,
  mvsTableHeadHighlightSx,
  mvsTableBodyRowSx,
  mvsTableScrollSx,
  mvsBodyPaginationSx,
} from '../../theme/mvsLayout';
import { useTheme, alpha, type SxProps, type Theme } from '@mui/material/styles';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Draw as DrawIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  EventBusy as EventBusyIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { employmentContractService } from '../../services/api';
import { downloadEmploymentContractPdf } from '../../utils/employmentContractPdf';
import { getUploadUrl } from '../../utils/uploadUrl';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useStore, useMenuStore } from '../../store';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

const ITEMS_PER_PAGE = 10;
const CONTRACT_FILTER_OUTLINED = mvsOutlinedLabelProps;
const contractFilterFieldSx = { ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx } as const;

const contractTableBodyRowSx: SxProps<Theme> = (theme) => {
  const base = typeof mvsTableBodyRowSx === 'function' ? mvsTableBodyRowSx(theme) : mvsTableBodyRowSx;
  const rowBg = theme.palette.mode === 'light' ? '#FFFFFF' : theme.palette.background.paper;
  const hoverBg = theme.palette.mode === 'light' ? '#EFF6FF' : theme.palette.action.hover;
  return {
    ...(base as object),
    '& .MuiTableRow-root:nth-of-type(odd)': { bgcolor: rowBg },
    '& .MuiTableRow-root:nth-of-type(even)': { bgcolor: rowBg },
    '& .MuiTableRow-root:hover': { bgcolor: hoverBg },
    '& .MuiTableCell-body.action-cell': {
      overflow: 'visible',
    },
    '& .MuiTableCell-body.MuiTableCell-paddingCheckbox': {
      overflow: 'visible',
    },
  };
};

const thLabelEllipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
} as const;

type TabMode = 'templates' | 'contracts' | 'my';
type MyContractFilterMode = 'all' | 'in_progress' | 'completed';

interface CompanyOption {
  id: number;
  name: string;
}

interface UserOption {
  id: number;
  username: string;
  userid: string;
}

const EmploymentContractManagement: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user } = useStore();
  const { language } = useMenuStore();
  const txt = useCallback((ko: string, en: string) => (language === 'en' ? en : ko), [language]);
  const contractStatusLabel = useCallback(
    (statusRaw: string) => {
      const s = String(statusRaw || 'draft').toLowerCase();
      const ko: Record<string, string> = {
        draft: '초안',
        in_review: '검토중',
        awaiting_company_sign: '회사 서명 대기',
        awaiting_employee_sign: '직원 서명 대기',
        signed: '서명완료',
        active: '활성',
        expired: '만료',
        terminated: '종료',
        cancelled: '취소',
      };
      const en: Record<string, string> = {
        draft: 'Draft',
        in_review: 'In review',
        awaiting_company_sign: 'Awaiting company signature',
        awaiting_employee_sign: 'Awaiting employee signature',
        signed: 'Signed',
        active: 'Active',
        expired: 'Expired',
        terminated: 'Terminated',
        cancelled: 'Cancelled',
      };
      return language === 'en' ? (en[s] || s.replace(/_/g, ' ')) : (ko[s] || s);
    },
    [language]
  );
  const isRoot = user?.role === 'root';
  const canDelete = isRoot;
  const [tab, setTab] = useState<TabMode>('contracts');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [myContracts, setMyContracts] = useState<any[]>([]);
  const [myContractFilter, setMyContractFilter] = useState<MyContractFilterMode>('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [contractDetailOpen, setContractDetailOpen] = useState(false);
  const [contractDetailLoading, setContractDetailLoading] = useState(false);
  const [selectedContractDetail, setSelectedContractDetail] = useState<any | null>(null);
  const [contractDetailPdfSaving, setContractDetailPdfSaving] = useState(false);
  const [detailSignForm, setDetailSignForm] = useState({
    aadhaar_consent: false,
    aadhaar_last4: '',
    aadhaar_auth_ref: '',
  });
  const contractDetailPdfRef = useRef<HTMLDivElement | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signTarget, setSignTarget] = useState<{ contractId: number; signerType: 'company' | 'employee' } | null>(null);
  const [signForm, setSignForm] = useState({
    sign_method: 'internal_ack' as 'internal_ack' | 'aadhaar_esign',
    aadhaar_consent: false,
    aadhaar_last4: '',
    aadhaar_auth_ref: ''
  });
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any | null>(null);
  const [editContract, setEditContract] = useState<any | null>(null);
  const [contractsPage, setContractsPage] = useState(1);
  const [templatesPage, setTemplatesPage] = useState(1);
  const [myContractsPage, setMyContractsPage] = useState(1);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    contract_type: 'regular',
    language: 'ko',
    content_html: ''
  });
  const [contractForm, setContractForm] = useState({
    employee_id: '',
    template_id: '',
    title: '',
    contract_type: 'regular',
    start_date: '',
    end_date: '',
    salary: '',
    bonus_type: '',
    bonus_value: '',
    work_location: '',
    working_days: '',
    working_hours: '',
    probation_months: '',
    status: 'draft'
  });
  const canManage = useMemo(() => ['root', 'admin'].includes(String(user?.role || '')), [user?.role]);

  useEffect(() => {
    if (!canManage) setTab('my');
  }, [canManage]);
  const completedContractStatuses = useMemo(
    () => new Set(['signed', 'active', 'expired', 'completed', 'terminated', 'cancelled']),
    []
  );
  const signedContractStatuses = useMemo(() => new Set(['signed', 'active', 'expired']), []);
  const canDownloadContractPdf = useMemo(() => {
    if (!selectedContractDetail) return false;
    const status = String(selectedContractDetail.status || '').toLowerCase();
    return signedContractStatuses.has(status) || Boolean(selectedContractDetail.pdf_url);
  }, [selectedContractDetail, signedContractStatuses]);
  const workingHourOptions = useMemo(
    () => [
      '09:00 ~ 18:00',
      '08:30 ~ 17:30',
      '10:00 ~ 19:00',
      'Mon-Fri / 8h per day',
      'Flexible (Core Time 10:00 ~ 16:00)',
      'Shift Schedule'
    ],
    []
  );
  const workingDayOptions = useMemo(
    () => [
      'Monday-Friday',
      'Monday-Saturday',
      'Rotational Week-Off',
      'Shift Roster',
      'Flexible 5 Days'
    ],
    []
  );
  const visibleMyContracts = useMemo(() => {
    if (myContractFilter === 'all') return myContracts;
    if (myContractFilter === 'completed') {
      return myContracts.filter((row) => completedContractStatuses.has(String(row?.status || '').toLowerCase()));
    }
    return myContracts.filter((row) => !completedContractStatuses.has(String(row?.status || '').toLowerCase()));
  }, [myContracts, myContractFilter, completedContractStatuses]);
  const contractPdfFiles = useMemo(
    () => contracts.filter((row) => Boolean(row?.pdf_url)),
    [contracts]
  );
  const myContractPdfFiles = useMemo(
    () => myContracts.filter((row) => Boolean(row?.pdf_url)),
    [myContracts]
  );
  const toPdfFileUrl = (pdfUrl: string) => getUploadUrl(pdfUrl);
  const detailSignContext = useMemo(() => {
    if (!selectedContractDetail || !user) return null;
    const status = String(selectedContractDetail.status || '').toLowerCase();
    const contractId = Number(selectedContractDetail.id);
    const isEmployee = Number(selectedContractDetail.employee_id) === Number(user.id);

    if (isEmployee && status === 'awaiting_employee_sign') {
      return { contractId, signerType: 'employee' as const };
    }
    return null;
  }, [selectedContractDetail, user]);
  const detailAadhaarSignReady =
    detailSignForm.aadhaar_consent &&
    detailSignForm.aadhaar_last4.length === 4 &&
    detailSignForm.aadhaar_auth_ref.trim().length > 0;
  const selectedTemplate = useMemo(
    () => templates.find((tpl: any) => String(tpl.id) === String(contractForm.template_id)),
    [templates, contractForm.template_id]
  );
  const isSalaryTemplateSelected = useMemo(() => {
    const templateType = String(selectedTemplate?.contract_type || '').toLowerCase();
    const templateName = String(selectedTemplate?.name || '').toLowerCase();
    return (
      templateType.includes('salary') ||
      templateName.includes('salary') ||
      templateName.includes('연봉')
    );
  }, [selectedTemplate]);
  const pendingContractStatuses = useMemo(
    () => new Set(['draft', 'in_review', 'awaiting_company_sign', 'awaiting_employee_sign']),
    []
  );
  const activeContractStatuses = useMemo(() => new Set(['signed', 'active']), []);

  const kpiItems = useMemo(() => {
    if (tab === 'contracts') {
      return [
        { key: 'total', label: t('employmentContractManagement.stats.totalContracts'), value: contracts.length },
        {
          key: 'active',
          label: t('employmentContractManagement.stats.activeContracts'),
          value: contracts.filter((row) => activeContractStatuses.has(String(row?.status || '').toLowerCase())).length,
        },
        {
          key: 'pending',
          label: t('employmentContractManagement.stats.pendingContracts'),
          value: contracts.filter((row) => pendingContractStatuses.has(String(row?.status || '').toLowerCase())).length,
        },
      ];
    }
    if (tab === 'templates') {
      return [{ key: 'total', label: t('employmentContractManagement.stats.totalTemplates'), value: templates.length }];
    }
    const inProgressCount = myContracts.filter(
      (row) => !completedContractStatuses.has(String(row?.status || '').toLowerCase())
    ).length;
    const completedCount = myContracts.filter((row) =>
      completedContractStatuses.has(String(row?.status || '').toLowerCase())
    ).length;
    return [
      { key: 'total', label: t('employmentContractManagement.stats.myTotal'), value: myContracts.length },
      { key: 'inProgress', label: t('employmentContractManagement.stats.myInProgress'), value: inProgressCount },
      { key: 'completed', label: t('employmentContractManagement.stats.myCompleted'), value: completedCount },
    ];
  }, [tab, contracts, templates, myContracts, t, activeContractStatuses, pendingContractStatuses, completedContractStatuses]);

  const paginatedContracts = useMemo(
    () => contracts.slice((contractsPage - 1) * ITEMS_PER_PAGE, contractsPage * ITEMS_PER_PAGE),
    [contracts, contractsPage]
  );
  const paginatedTemplates = useMemo(
    () => templates.slice((templatesPage - 1) * ITEMS_PER_PAGE, templatesPage * ITEMS_PER_PAGE),
    [templates, templatesPage]
  );
  const visibleTemplateIds = useMemo(
    () => paginatedTemplates.map((row) => Number(row.id)).filter((id) => Number.isFinite(id)),
    [paginatedTemplates]
  );
  const allVisibleTemplatesSelected =
    visibleTemplateIds.length > 0 && visibleTemplateIds.every((id) => selectedTemplateIds.includes(id));
  const someVisibleTemplatesSelected = visibleTemplateIds.some((id) => selectedTemplateIds.includes(id));
  const paginatedMyContracts = useMemo(
    () => visibleMyContracts.slice((myContractsPage - 1) * ITEMS_PER_PAGE, myContractsPage * ITEMS_PER_PAGE),
    [visibleMyContracts, myContractsPage]
  );

  const contractsTotalPages = Math.max(1, Math.ceil(contracts.length / ITEMS_PER_PAGE));
  const templatesTotalPages = Math.max(1, Math.ceil(templates.length / ITEMS_PER_PAGE));
  const myContractsTotalPages = Math.max(1, Math.ceil(visibleMyContracts.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setContractsPage(1);
    setTemplatesPage(1);
    setMyContractsPage(1);
    setSelectedTemplateIds([]);
  }, [tab, selectedCompanyId, myContractFilter]);

  useEffect(() => {
    setSelectedTemplateIds((prev) => prev.filter((id) => templates.some((row) => Number(row.id) === id)));
  }, [templates]);

  useEffect(() => {
    if (contractsPage > contractsTotalPages) setContractsPage(contractsTotalPages);
  }, [contractsPage, contractsTotalPages]);

  useEffect(() => {
    if (templatesPage > templatesTotalPages) setTemplatesPage(templatesTotalPages);
  }, [templatesPage, templatesTotalPages]);

  useEffect(() => {
    if (myContractsPage > myContractsTotalPages) setMyContractsPage(myContractsTotalPages);
  }, [myContractsPage, myContractsTotalPages]);

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

  const renderHeadCell = (label: string, width?: number | string, opts?: { action?: boolean }) => (
    <TableCell
      className={opts?.action ? 'action-cell' : undefined}
      align={opts?.action ? 'center' : 'left'}
      sx={{
        overflow: opts?.action ? 'visible' : 'hidden',
        verticalAlign: 'middle',
        textAlign: opts?.action ? 'center' : 'left',
        ...(opts?.action ? { px: 1 } : {}),
        ...(width != null
          ? { width, minWidth: width, maxWidth: width, boxSizing: 'border-box' }
          : {}),
      }}
    >
      {opts?.action ? (
        label
      ) : (
        <Box component="span" sx={thLabelEllipsisSx} title={label}>
          {label}
        </Box>
      )}
    </TableCell>
  );

  const iconBtnBaseSx = {
    borderRadius: '10px',
    color: theme.palette.text.secondary,
    transition: 'color 0.15s ease, background-color 0.15s ease',
  } as const;

  const renderActionIcon = (
    actionKey: string,
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    hoverColor: 'primary' | 'error' = 'primary'
  ) => (
    <Tooltip key={actionKey} title={label}>
      <span style={{ display: 'inline-flex' }}>
        <IconButton
          size="small"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          sx={{
            ...iconBtnBaseSx,
            '&:hover':
              hoverColor === 'error'
                ? { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.12) }
                : { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.1) },
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  const renderContractWorkflowActionIcons = (row: any) => {
    const status = String(row?.status || '').toLowerCase();
    const contractId = Number(row.id);
    const icons: React.ReactNode[] = [];

    if (['draft', 'in_review'].includes(status)) {
      icons.push(
        renderActionIcon(
          'send',
          txt('직원에게 보내기', 'Send to employee'),
          <SendIcon fontSize="small" />,
          () => sendContractToEmployee(contractId, String(row.title || ''))
        )
      );
    }
    if (status === 'signed') {
      icons.push(
        renderActionIcon(
          'activate',
          txt('활성화', 'Activate'),
          <CheckCircleOutlineIcon fontSize="small" />,
          () => void transitionContractStatus(contractId, 'active', txt('계약이 활성화되었습니다.', 'Contract activated.'))
        )
      );
    }
    if (status === 'active') {
      icons.push(
        renderActionIcon(
          'expire',
          txt('만료처리', 'Mark expired'),
          <EventBusyIcon fontSize="small" />,
          () => void transitionContractStatus(contractId, 'expired', txt('계약이 만료 처리되었습니다.', 'Contract marked as expired.'))
        )
      );
    }

    return icons;
  };

  const renderContractActions = (row: any) => {
    if (!canManage) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap', width: '100%' }}>
        {renderActionIcon(
          'edit',
          txt('수정', 'Edit'),
          <EditIcon fontSize="small" />,
          () => openEditContract(row)
        )}
        {renderContractWorkflowActionIcons(row)}
        {canDelete
          ? renderActionIcon(
              'delete',
              txt('삭제', 'Delete'),
              <DeleteIcon fontSize="small" />,
              () => deleteContract(Number(row.id), String(row.title || '')),
              'error'
            )
          : null}
      </Box>
    );
  };

  const renderEmptyState = (opts: {
    icon?: React.ReactNode;
    title: string;
    hint?: string;
    action?: React.ReactNode;
  }) => (
    <Box sx={listStateBoxSx}>
      {opts.icon}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
        {opts.title}
      </Typography>
      {opts.hint ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {opts.hint}
        </Typography>
      ) : null}
      {opts.action}
    </Box>
  );

  const renderPagination = (count: number, page: number, onChange: (value: number) => void) => (
    <Box sx={mvsBodyPaginationSx}>
      <Pagination
        count={count}
        page={page}
        onChange={(_, value) => onChange(value)}
        color="primary"
        shape="rounded"
        sx={{
          '& .MuiPaginationItem-root': {
            borderRadius: '10px',
            fontWeight: 500,
          },
        }}
      />
    </Box>
  );

  const loadCompanies = useCallback(async () => {
    if (!isRoot) return;
    try {
      const rows = await useReferenceDataStore.getState().fetchCompanies();
      const mapped = rows.map((c: any) => ({ id: Number(c.id), name: String(c.name || `Company ${c.id}`) }));
      setCompanies(mapped);
      if (!selectedCompanyId && mapped.length > 0) {
        const loginCompanyId = Number(user?.company_id || 0);
        const matchedCompany = mapped.find((company: CompanyOption) => company.id === loginCompanyId);
        setSelectedCompanyId(matchedCompany ? matchedCompany.id : mapped[0].id);
      }
    } catch {
      setMessage({ type: 'error', text: txt('회사 목록을 불러오지 못했습니다.', 'Failed to load companies.') });
    }
  }, [isRoot, selectedCompanyId, user?.company_id, txt]);

  const loadUsers = useCallback(async () => {
    try {
      const params = isRoot && selectedCompanyId ? { company_id: Number(selectedCompanyId) } : undefined;
      const rows = await useReferenceDataStore.getState().fetchUsers(params);
      const mapped = rows
        .filter((u: any) => String(u.status || 'active') === 'active')
        .map((u: any) => ({
          id: Number(u.id),
          username: String(u.username || ''),
          userid: String(u.userid || '')
        }));
      setUsers(mapped);
    } catch {
      setMessage({ type: 'error', text: txt('직원 목록을 불러오지 못했습니다.', 'Failed to load employees.') });
    }
  }, [isRoot, selectedCompanyId, txt]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const queryCompanyId = isRoot && selectedCompanyId ? Number(selectedCompanyId) : undefined;
      const myRes = await employmentContractService.getMyContracts();
      setMyContracts(Array.isArray(myRes?.data) ? myRes.data : []);

      if (canManage) {
        const [templateRes, contractRes] = await Promise.all([
          employmentContractService.getTemplates(queryCompanyId),
          employmentContractService.getContracts({ company_id: queryCompanyId }),
        ]);
        setTemplates(Array.isArray(templateRes?.data) ? templateRes.data : []);
        setContracts(Array.isArray(contractRes?.data) ? contractRes.data : []);
      } else {
        setTemplates([]);
        setContracts([]);
      }
    } catch {
      setMessage({
        type: 'error',
        text: txt('전자근로계약 데이터를 불러오지 못했습니다.', 'Failed to load employment contract data.'),
      });
    } finally {
      setLoading(false);
    }
  }, [canManage, isRoot, selectedCompanyId, txt]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    void loadUsers();
    void loadData();
  }, [loadData, loadUsers]);

  const openCreateTemplate = () => {
    setEditTemplate(null);
    setTemplateForm({
      name: '',
      contract_type: 'regular',
      language: 'ko',
      content_html: ''
    });
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (row: any) => {
    setEditTemplate(row);
    setTemplateForm({
      name: String(row.name || ''),
      contract_type: String(row.contract_type || 'regular'),
      language: String(row.language || 'ko'),
      content_html: String(row.content_html || '')
    });
    setTemplateDialogOpen(true);
  };

  const saveTemplate = async () => {
    try {
      const payload: any = { ...templateForm };
      if (isRoot && selectedCompanyId) payload.company_id = Number(selectedCompanyId);
      if (editTemplate) {
        const res = await employmentContractService.updateTemplate(Number(editTemplate.id), payload);
        if (!res?.success) throw new Error(res?.message || '템플릿 수정 실패');
      } else {
        const res = await employmentContractService.createTemplate(payload);
        if (!res?.success) throw new Error(res?.message || '템플릿 생성 실패');
      }
      setTemplateDialogOpen(false);
      setMessage({
        type: 'success',
        text: editTemplate
          ? txt('템플릿이 수정되었습니다.', 'Template updated.')
          : txt('템플릿이 생성되었습니다.', 'Template created.'),
      });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('템플릿 저장 중 오류가 발생했습니다.', 'An error occurred while saving the template.'),
      });
    }
  };

  const performDeleteTemplate = async (templateId: number) => {
    try {
      const res = await employmentContractService.deleteTemplate(templateId);
      if (!res?.success) throw new Error(res?.message || '템플릿 삭제 실패');
      setSelectedTemplateIds((prev) => prev.filter((id) => id !== templateId));
      setMessage({ type: 'success', text: txt('템플릿이 삭제되었습니다.', 'Template deleted.') });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('템플릿 삭제 중 오류가 발생했습니다.', 'An error occurred while deleting the template.'),
      });
    }
  };

  const performDeleteTemplates = async (templateIds: number[]) => {
    try {
      const results = await Promise.all(templateIds.map((id) => employmentContractService.deleteTemplate(id)));
      const failed = results.find((res) => !res?.success);
      if (failed) throw new Error(failed?.message || '템플릿 삭제 실패');
      setSelectedTemplateIds([]);
      setMessage({
        type: 'success',
        text: t('employmentContractManagement.deleteSelectedSuccess', { count: templateIds.length }),
      });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('템플릿 삭제 중 오류가 발생했습니다.', 'An error occurred while deleting the template.'),
      });
    }
  };

  const handleSelectAllTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedTemplateIds(visibleTemplateIds);
      return;
    }
    setSelectedTemplateIds([]);
  };

  const handleSelectTemplate = (templateId: number) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const deleteSelectedTemplates = () => {
    if (!canDelete || selectedTemplateIds.length === 0) return;
    showConfirm(
      t('employmentContractManagement.confirmDeleteSelectedBulk', { count: selectedTemplateIds.length }),
      () => {
        void performDeleteTemplates(selectedTemplateIds);
      },
      {
        title: txt('템플릿 삭제', 'Delete template'),
        confirmColor: 'error',
      }
    );
  };

  const deleteTemplate = (templateId: number, templateName: string) => {
    if (!canDelete) return;
    showConfirm(txt(`'${templateName}' 템플릿을 삭제하시겠습니까?`, `Delete template '${templateName}'?`), () => {
      void performDeleteTemplate(templateId);
    }, {
      title: txt('템플릿 삭제', 'Delete template'),
      confirmColor: 'error'
    });
  };

  const openCreateContract = () => {
    setEditContract(null);
    setContractForm({
      employee_id: '',
      template_id: '',
      title: '',
      contract_type: 'regular',
      start_date: '',
      end_date: '',
      salary: '',
      bonus_type: '',
      bonus_value: '',
      work_location: '',
      working_days: '',
      working_hours: '',
      probation_months: '',
      status: 'draft'
    });
    setContractDialogOpen(true);
  };

  const openEditContract = (row: any) => {
    setEditContract(row);
    setContractForm({
      employee_id: String(row.employee_id || ''),
      template_id: String(row.template_id || ''),
      title: String(row.title || ''),
      contract_type: String(row.contract_type || 'regular'),
      start_date: String(row.start_date || ''),
      end_date: String(row.end_date || ''),
      salary: row.salary !== null && row.salary !== undefined ? String(row.salary) : '',
      bonus_type: String(row.bonus_type || ''),
      bonus_value: row.bonus_value !== null && row.bonus_value !== undefined ? String(row.bonus_value) : '',
      work_location: String(row.work_location || ''),
      working_days: String(row.working_days || ''),
      working_hours: String(row.working_hours || ''),
      probation_months: row.probation_months !== null && row.probation_months !== undefined ? String(row.probation_months) : '',
      status: String(row.status || 'draft')
    });
    setContractDialogOpen(true);
  };

  const saveContract = async () => {
    try {
      if (!contractForm.employee_id) {
        throw new Error(txt('직원을 선택해 주세요.', 'Please select an employee.'));
      }
      if (!contractForm.template_id) {
        throw new Error(txt('템플릿을 선택해 주세요.', 'Please select a template.'));
      }
      if (!contractForm.title.trim() || !contractForm.start_date || !contractForm.end_date) {
        throw new Error(txt('제목과 계약 기간을 입력해 주세요.', 'Please enter title and contract period.'));
      }

      const payload: any = {
        employee_id: Number(contractForm.employee_id),
        title: contractForm.title,
        contract_type: contractForm.contract_type,
        start_date: contractForm.start_date,
        end_date: contractForm.end_date
      };
      if (contractForm.template_id) payload.template_id = Number(contractForm.template_id);
      if (contractForm.salary) payload.salary = Number(contractForm.salary);
      payload.bonus_type = contractForm.bonus_type || null;
      payload.bonus_value = contractForm.bonus_value ? Number(contractForm.bonus_value) : null;
      if (contractForm.work_location) payload.work_location = contractForm.work_location;
      payload.working_days = contractForm.working_days || null;
      if (contractForm.working_hours) payload.working_hours = contractForm.working_hours;
      if (contractForm.probation_months) payload.probation_months = Number(contractForm.probation_months);
      if (isRoot && selectedCompanyId) payload.company_id = Number(selectedCompanyId);

      if (editContract) {
        if (String(contractForm.status || '').toLowerCase() !== String(editContract.status || '').toLowerCase()) {
          payload.status = contractForm.status;
        }
        const res = await employmentContractService.updateContract(Number(editContract.id), payload);
        if (!res?.success) throw new Error(res?.message || '계약 수정 실패');
      } else {
        const res = await employmentContractService.createContract(payload);
        if (!res?.success) throw new Error(res?.message || '계약 생성 실패');
      }
      setContractDialogOpen(false);
      setMessage({
        type: 'success',
        text: editContract
          ? txt('계약이 수정되었습니다.', 'Contract updated.')
          : txt('계약이 생성되었습니다.', 'Contract created.'),
      });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('계약 저장 중 오류가 발생했습니다.', 'An error occurred while saving the contract.'),
      });
    }
  };

  const transitionContractStatus = async (contractId: number, nextStatus: string, successMessage: string) => {
    try {
      const res = await employmentContractService.updateContract(contractId, { status: nextStatus });
      if (!res?.success) throw new Error(res?.message || '상태 변경 실패');
      setMessage({ type: 'success', text: successMessage });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('상태 변경 중 오류가 발생했습니다.', 'An error occurred while updating status.'),
      });
    }
  };

  const performSendContractToEmployee = async (contractId: number) => {
    try {
      const res = await employmentContractService.sendContractToEmployee(contractId);
      if (!res?.success) throw new Error(res?.message || '계약 발송 실패');
      setMessage({
        type: 'success',
        text: txt('직원에게 계약서가 발송되었습니다.', 'Contract sent to employee.'),
      });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('계약 발송 중 오류가 발생했습니다.', 'An error occurred while sending the contract.'),
      });
    }
  };

  const sendContractToEmployee = (contractId: number, contractTitle: string) => {
    showConfirm(
      txt(`'${contractTitle}' 계약서를 직원에게 보내시겠습니까?`, `Send contract '${contractTitle}' to the employee?`),
      () => {
        void performSendContractToEmployee(contractId);
      },
      {
        title: txt('계약 발송', 'Send contract'),
        confirmColor: 'primary',
      }
    );
  };

  const performDeleteContract = async (contractId: number) => {
    try {
      const res = await employmentContractService.deleteContract(contractId);
      if (!res?.success) throw new Error(res?.message || '계약 삭제 실패');
      setMessage({ type: 'success', text: txt('계약이 삭제되었습니다.', 'Contract deleted.') });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('계약 삭제 중 오류가 발생했습니다.', 'An error occurred while deleting the contract.'),
      });
    }
  };

  const deleteContract = (contractId: number, contractTitle: string) => {
    if (!canDelete) return;
    showConfirm(txt(`'${contractTitle}' 계약을 삭제하시겠습니까?`, `Delete contract '${contractTitle}'?`), () => {
      void performDeleteContract(contractId);
    }, {
      title: txt('계약 삭제', 'Delete contract'),
      confirmColor: 'error'
    });
  };

  const openSignDialog = (contractId: number, signerType: 'company' | 'employee') => {
    setSignTarget({ contractId, signerType });
    setSignForm({
      sign_method: 'internal_ack',
      aadhaar_consent: false,
      aadhaar_last4: '',
      aadhaar_auth_ref: ''
    });
    setSignDialogOpen(true);
  };

  const signContract = async () => {
    if (!signTarget) return;
    try {
      const payload =
        signForm.sign_method === 'aadhaar_esign'
          ? {
              aadhaar_consent: signForm.aadhaar_consent,
              aadhaar_last4: signForm.aadhaar_last4.trim(),
              aadhaar_auth_ref: signForm.aadhaar_auth_ref.trim()
            }
          : undefined;

      const res = await employmentContractService.signContract(
        signTarget.contractId,
        signTarget.signerType,
        signForm.sign_method,
        payload
      );
      if (!res?.success) throw new Error(res?.message || '서명 실패');
      setMessage({ type: 'success', text: txt('서명 처리되었습니다.', 'Signature completed.') });
      setSignDialogOpen(false);
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('서명 처리 중 오류가 발생했습니다.', 'An error occurred while signing.'),
      });
    }
  };

  const resetDetailSignForm = () => {
    setDetailSignForm({
      aadhaar_consent: false,
      aadhaar_last4: '',
      aadhaar_auth_ref: '',
    });
  };

  const openMyContractDetail = async (contractId: number) => {
    setContractDetailOpen(true);
    setContractDetailLoading(true);
    resetDetailSignForm();
    try {
      const res = await employmentContractService.getContract(contractId);
      if (!res?.success) throw new Error(res?.message || '계약 상세 조회 실패');
      setSelectedContractDetail(res.data || null);
    } catch (error: any) {
      setSelectedContractDetail(null);
      setMessage({
        type: 'error',
        text: error?.message || txt('계약 상세를 불러오지 못했습니다.', 'Failed to load contract details.'),
      });
    } finally {
      setContractDetailLoading(false);
    }
  };

  const refreshContractDetail = async (contractId: number) => {
    const res = await employmentContractService.getContract(contractId);
    if (res?.success) {
      setSelectedContractDetail(res.data || null);
    }
  };

  const handleDownloadContractPdf = async () => {
    if (!selectedContractDetail) return;

    const status = String(selectedContractDetail.status || '').toLowerCase();
    const isSigned = signedContractStatuses.has(status) || Boolean(selectedContractDetail.pdf_url);
    if (!isSigned) {
      setMessage({
        type: 'error',
        text: txt('서명이 완료된 후에 PDF를 저장할 수 있습니다.', 'PDF can be saved only after signing is completed.'),
      });
      return;
    }

    const serverPdfUrl = String(selectedContractDetail.pdf_url || '').trim();
    if (serverPdfUrl) {
      window.open(toPdfFileUrl(serverPdfUrl), '_blank', 'noopener,noreferrer');
      return;
    }

    const root = contractDetailPdfRef.current;
    if (!root) {
      setMessage({
        type: 'error',
        text: txt('PDF 생성 대상을 찾지 못했습니다.', 'Could not find content to export as PDF.'),
      });
      return;
    }

    setContractDetailPdfSaving(true);
    try {
      const safeTitle = String(selectedContractDetail.title || `contract-${selectedContractDetail.id}`)
        .replace(/[^\w.\-()가-힣\s]+/g, '_')
        .trim();
      await downloadEmploymentContractPdf(root, `${safeTitle || 'employment-contract'}.pdf`);
      setMessage({
        type: 'success',
        text: txt('PDF 파일로 저장했습니다.', 'Contract saved as PDF.'),
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('PDF 저장에 실패했습니다.', 'Failed to save PDF.'),
      });
    } finally {
      setContractDetailPdfSaving(false);
    }
  };

  const handleDetailAadhaarSign = async () => {
    if (!detailSignContext || !detailAadhaarSignReady) return;
    try {
      const res = await employmentContractService.signContract(
        detailSignContext.contractId,
        detailSignContext.signerType,
        'aadhaar_esign',
        {
          aadhaar_consent: detailSignForm.aadhaar_consent,
          aadhaar_last4: detailSignForm.aadhaar_last4.trim(),
          aadhaar_auth_ref: detailSignForm.aadhaar_auth_ref.trim(),
        }
      );
      if (!res?.success) throw new Error(res?.message || '서명 실패');
      setMessage({
        type: 'success',
        text: txt('Aadhaar e-Verify 서명이 완료되었습니다.', 'Aadhaar e-Verify signature completed.'),
      });
      resetDetailSignForm();
      await refreshContractDetail(detailSignContext.contractId);
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('Aadhaar e-Verify 처리 중 오류가 발생했습니다.', 'An error occurred during Aadhaar e-Verify.'),
      });
    }
  };

  const handleDetailInternalSign = async () => {
    if (!detailSignContext) return;
    try {
      const res = await employmentContractService.signContract(
        detailSignContext.contractId,
        detailSignContext.signerType,
        'internal_ack'
      );
      if (!res?.success) throw new Error(res?.message || '서명 실패');
      setMessage({
        type: 'success',
        text: txt('서명이 완료되었습니다. PDF로 저장할 수 있습니다.', 'Signature completed. You can save it as PDF.'),
      });
      resetDetailSignForm();
      await refreshContractDetail(detailSignContext.contractId);
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('서명 처리 중 오류가 발생했습니다.', 'An error occurred while signing.'),
      });
    }
  };

  const statusChip = useCallback(
    (status: string) => {
      const s = String(status || 'draft').toLowerCase();
      const colorType =
        s === 'signed' || s === 'active'
          ? 'success'
          : s.includes('awaiting')
            ? 'warning'
            : s === 'expired'
              ? 'error'
              : 'default';
      const main =
        colorType === 'success'
          ? theme.palette.success.main
          : colorType === 'warning'
            ? theme.palette.warning.main
            : colorType === 'error'
              ? theme.palette.error.main
              : theme.palette.grey[500];
      const fg =
        colorType === 'success'
          ? theme.palette.success.dark
          : colorType === 'warning'
            ? theme.palette.warning.dark
            : colorType === 'error'
              ? theme.palette.error.dark
              : theme.palette.text.secondary;
      return (
        <Chip
          size="small"
          label={contractStatusLabel(status)}
          variant="outlined"
          sx={{
            height: 26,
            fontWeight: 600,
            fontSize: '0.75rem',
            borderColor: alpha(main, 0.35),
            bgcolor: alpha(main, 0.1),
            color: fg,
          }}
        />
      );
    },
    [theme, contractStatusLabel]
  );

  const tableBaseSx = {
    tableLayout: 'fixed' as const,
    width: '100%',
    minWidth: 720,
    borderCollapse: 'collapse' as const,
    bgcolor: 'transparent',
    '& .MuiTableCell-root': {
      borderLeft: 'none',
      borderRight: 'none',
      borderTop: 'none',
    },
    '& .MuiTableCell-head.action-cell, & .MuiTableCell-body.action-cell': {
      overflow: 'visible',
      textAlign: 'center',
      px: 1,
    },
  };

  const actionTableContainerSx = {
    ...mvsBodyListTableSx,
    ...mvsTableScrollSx,
    '& .MuiTableCell-head.action-cell, & .MuiTableCell-body.action-cell': {
      overflow: 'visible',
      textAlign: 'center',
      px: 1,
    },
  } as const;

  const CONTRACT_ACTION_COL_WIDTH = 180;
  const TEMPLATE_ACTION_COL_WIDTH = 72;

  const cellEllipsisSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    verticalAlign: 'middle' as const,
  };

  const actionCellSx = {
    width: CONTRACT_ACTION_COL_WIDTH,
    minWidth: CONTRACT_ACTION_COL_WIDTH,
    maxWidth: CONTRACT_ACTION_COL_WIDTH,
    overflow: 'visible',
    verticalAlign: 'middle' as const,
    textAlign: 'center' as const,
    px: 1,
    whiteSpace: 'nowrap' as const,
    boxSizing: 'border-box' as const,
  };

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('employmentContractManagement.pageTitle')}
        description={t('employmentContractManagement.description')}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: kpiItems.length >= 3 ? 'repeat(3, 1fr)' : kpiItems.length === 2 ? 'repeat(2, 1fr)' : '1fr',
          },
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
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card elevation={0} sx={mvsBodyCardSx}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: { xs: 2, sm: 2.5 },
            py: 1,
            bgcolor: '#FFFFFF',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                minHeight: 40,
                py: 0.75,
                color: 'text.secondary',
              },
              '& .Mui-selected': { color: 'primary.main', fontWeight: 700 },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            <Tab value="my" label={t('employmentContractManagement.tabs.my')} />
            {canManage ? <Tab value="contracts" label={t('employmentContractManagement.tabs.contracts')} /> : null}
            {canManage ? <Tab value="templates" label={t('employmentContractManagement.tabs.templates')} /> : null}
          </Tabs>
          {tab === 'contracts' && canManage ? (
            <Button
              variant="contained"
              disableElevation
              size="small"
              startIcon={<AddIcon fontSize="small" />}
              onClick={openCreateContract}
              sx={mvsBodyPrimaryBtnSx}
            >
              {t('employmentContractManagement.createContract')}
            </Button>
          ) : null}
          {tab === 'templates' && canManage ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              {canDelete && selectedTemplateIds.length > 0 ? (
                <Button
                  variant="contained"
                  color="error"
                  disableElevation
                  size="small"
                  startIcon={<DeleteIcon fontSize="small" />}
                  onClick={deleteSelectedTemplates}
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
                  {t('employmentContractManagement.deleteSelected')} ({selectedTemplateIds.length})
                </Button>
              ) : null}
              <Button
                variant="contained"
                disableElevation
                size="small"
                startIcon={<AddIcon fontSize="small" />}
                onClick={openCreateTemplate}
                sx={mvsBodyPrimaryBtnSx}
              >
                {t('employmentContractManagement.createTemplate')}
              </Button>
            </Box>
          ) : null}
        </Box>

        {(isRoot && tab !== 'my') || tab === 'my' ? (
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 2,
              bgcolor: '#FFFFFF',
              ...(mvsSearchFieldSx as Record<string, unknown>),
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: tab === 'my' ? '1fr' : 'minmax(280px, 360px)' },
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            {isRoot && tab !== 'my' ? (
              <TextField
                select
                size="small"
                fullWidth
                label={t('employmentContractManagement.company')}
                {...CONTRACT_FILTER_OUTLINED}
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                SelectProps={{ displayEmpty: true }}
                sx={contractFilterFieldSx}
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {tab === 'my' ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {(['all', 'in_progress', 'completed'] as MyContractFilterMode[]).map((mode) => (
                  <Button
                    key={mode}
                    size="small"
                    variant={myContractFilter === mode ? 'contained' : 'outlined'}
                    onClick={() => setMyContractFilter(mode)}
                    sx={myContractFilter === mode ? mvsBodyPrimaryBtnSx : mvsBodyOutlinedBtnSx}
                  >
                    {mode === 'all'
                      ? t('employmentContractManagement.filterAll')
                      : mode === 'in_progress'
                        ? t('employmentContractManagement.filterInProgress')
                        : t('employmentContractManagement.filterCompleted')}
                  </Button>
                ))}
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        {loading ? (
          renderEmptyState({
            icon: <CircularProgress size={36} />,
            title: t('employmentContractManagement.empty.loading'),
          })
        ) : tab === 'contracts' ? (
          contracts.length === 0 ? (
            renderEmptyState({
              icon: <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />,
              title: t('employmentContractManagement.empty.noContracts'),
              hint: t('employmentContractManagement.empty.noContractsHint'),
              action: canManage ? (
                <Button variant="contained" disableElevation size="small" startIcon={<AddIcon fontSize="small" />} onClick={openCreateContract} sx={mvsBodyPrimaryBtnSx}>
                  {t('employmentContractManagement.createContract')}
                </Button>
              ) : undefined,
            })
          ) : (
            <>
              <TableContainer sx={actionTableContainerSx}>
                <Table size="small" sx={tableBaseSx}>
                  <TableHead sx={mvsTableHeadHighlightSx}>
                    <TableRow>
                      {renderHeadCell('ID', 56)}
                      {renderHeadCell(txt('제목', 'Title'))}
                      {renderHeadCell(txt('직원', 'Employee'), '18%')}
                      {renderHeadCell(txt('기간', 'Period'), '22%')}
                      {renderHeadCell(txt('상태', 'Status'), 140)}
                      {renderHeadCell(txt('작업', 'Actions'), CONTRACT_ACTION_COL_WIDTH, { action: true })}
                    </TableRow>
                  </TableHead>
                  <TableBody sx={contractTableBodyRowSx}>
                    {paginatedContracts.map((row) => (
                      <TableRow
                        key={row.id}
                        onClick={() => openMyContractDetail(Number(row.id))}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell sx={cellEllipsisSx}>{row.id}</TableCell>
                        <TableCell sx={cellEllipsisSx}>
                          <Typography variant="body2" fontWeight={500} noWrap title={String(row.title || '')}>
                            {row.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={cellEllipsisSx}>
                          <Typography variant="body2" noWrap title={String(row.employee?.username || row.employee_id || '')}>
                            {row.employee?.username || row.employee_id}
                          </Typography>
                        </TableCell>
                        <TableCell sx={cellEllipsisSx}>
                          <Typography variant="body2" noWrap title={`${row.start_date} ~ ${row.end_date}`}>
                            {row.start_date} ~ {row.end_date}
                          </Typography>
                        </TableCell>
                        <TableCell>{statusChip(String(row.status || 'draft'))}</TableCell>
                        <TableCell align="center" className="action-cell" sx={actionCellSx} onClick={(e) => e.stopPropagation()}>
                          {renderContractActions(row)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {renderPagination(contractsTotalPages, contractsPage, setContractsPage)}
              <Box sx={{ ...mvsBodyListTableSx, mt: 2.5, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{t('employmentContractManagement.pdfFiles')}</Typography>
                <Stack spacing={1}>
                  {contractPdfFiles.map((row) => (
                    <Box key={`pdf-contract-${row.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PictureAsPdfIcon fontSize="small" sx={{ color: 'error.main', opacity: 0.85 }} />
                      <Link href={toPdfFileUrl(String(row.pdf_url || ''))} target="_blank" rel="noopener noreferrer" underline="hover">{String(row.title || `Contract ${row.id}`)}.pdf</Link>
                    </Box>
                  ))}
                  {contractPdfFiles.length === 0 && <Typography variant="body2" color="text.secondary">{t('employmentContractManagement.noPdfFiles')}</Typography>}
                </Stack>
              </Box>
            </>
          )
        ) : tab === 'templates' ? (
          templates.length === 0 ? (
            renderEmptyState({
              icon: <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />,
              title: t('employmentContractManagement.empty.noTemplates'),
              hint: t('employmentContractManagement.empty.noTemplatesHint'),
              action: canManage ? (
                <Button variant="contained" disableElevation size="small" startIcon={<AddIcon fontSize="small" />} onClick={openCreateTemplate} sx={mvsBodyPrimaryBtnSx}>
                  {t('employmentContractManagement.createTemplate')}
                </Button>
              ) : undefined,
            })
          ) : (
            <>
              <TableContainer sx={actionTableContainerSx}>
                <Table size="small" sx={tableBaseSx}>
                  <TableHead sx={mvsTableHeadHighlightSx}>
                    <TableRow>
                      {canDelete ? (
                        <TableCell padding="checkbox" align="center">
                          <Checkbox
                            size="small"
                            disabled={paginatedTemplates.length === 0}
                            indeterminate={someVisibleTemplatesSelected && !allVisibleTemplatesSelected}
                            checked={allVisibleTemplatesSelected}
                            onChange={handleSelectAllTemplates}
                          />
                        </TableCell>
                      ) : null}
                      {renderHeadCell('ID', 56)}
                      {renderHeadCell(txt('템플릿명', 'Template name'))}
                      {renderHeadCell(txt('유형', 'Type'), '18%')}
                      {renderHeadCell(txt('언어', 'Language'), 96)}
                      {renderHeadCell(txt('버전', 'Version'), 80)}
                      {canDelete ? renderHeadCell(txt('작업', 'Actions'), TEMPLATE_ACTION_COL_WIDTH, { action: true }) : null}
                    </TableRow>
                  </TableHead>
                  <TableBody sx={contractTableBodyRowSx}>
                    {paginatedTemplates.map((row) => (
                      <TableRow
                        key={row.id}
                        onClick={() => {
                          if (canManage) openEditTemplate(row);
                        }}
                        sx={{ cursor: canManage ? 'pointer' : 'default' }}
                      >
                        {canDelete ? (
                          <TableCell padding="checkbox" align="center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              size="small"
                              checked={selectedTemplateIds.includes(Number(row.id))}
                              onChange={() => handleSelectTemplate(Number(row.id))}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell sx={cellEllipsisSx}>{row.id}</TableCell>
                        <TableCell sx={cellEllipsisSx}>
                          <Typography variant="body2" fontWeight={500} noWrap title={String(row.name || '')}>
                            {row.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={cellEllipsisSx}>{row.contract_type}</TableCell>
                        <TableCell sx={cellEllipsisSx}>{row.language}</TableCell>
                        <TableCell sx={cellEllipsisSx}>{row.version}</TableCell>
                        {canDelete ? (
                          <TableCell
                            align="center"
                            className="action-cell"
                            sx={{ ...actionCellSx, width: TEMPLATE_ACTION_COL_WIDTH, minWidth: TEMPLATE_ACTION_COL_WIDTH, maxWidth: TEMPLATE_ACTION_COL_WIDTH }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <Tooltip title={txt('삭제', 'Delete')}>
                                <span style={{ display: 'inline-flex' }}>
                                  <IconButton
                                    size="small"
                                    aria-label={txt('삭제', 'Delete')}
                                    onClick={() => deleteTemplate(Number(row.id), String(row.name || ''))}
                                    sx={{
                                      ...iconBtnBaseSx,
                                      '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.12) },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {renderPagination(templatesTotalPages, templatesPage, setTemplatesPage)}
            </>
          )
        ) : visibleMyContracts.length === 0 ? (
          renderEmptyState({
            icon: <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />,
            title: myContractFilter === 'completed' ? t('employmentContractManagement.empty.noCompletedContracts') : t('employmentContractManagement.empty.noMyContracts'),
            hint: t('employmentContractManagement.empty.noMyContractsHint'),
          })
        ) : (
          <>
            <TableContainer sx={actionTableContainerSx}>
              <Table size="small" sx={tableBaseSx}>
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    {renderHeadCell('ID')}
                    {renderHeadCell(txt('제목', 'Title'))}
                    {renderHeadCell(txt('기간', 'Period'))}
                    {renderHeadCell(txt('상태', 'Status'))}
                    {renderHeadCell(txt('작업', 'Actions'))}
                  </TableRow>
                </TableHead>
                <TableBody sx={contractTableBodyRowSx}>
                  {paginatedMyContracts.map((row) => (
                    <TableRow key={row.id} onClick={() => openMyContractDetail(Number(row.id))} sx={{ cursor: 'pointer' }}>
                      <TableCell sx={cellEllipsisSx}>{row.id}</TableCell>
                      <TableCell sx={cellEllipsisSx}><Typography variant="body2" fontWeight={500} noWrap title={String(row.title || '')}>{row.title}</Typography></TableCell>
                      <TableCell sx={cellEllipsisSx}>{row.start_date} ~ {row.end_date}</TableCell>
                      <TableCell>{statusChip(String(row.status || 'draft'))}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {String(row.status || '').toLowerCase() === 'awaiting_employee_sign' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DrawIcon fontSize="small" />}
                            onClick={() => openSignDialog(Number(row.id), 'employee')}
                            sx={mvsBodyOutlinedBtnSx}
                          >
                            {txt('직원 서명', 'Sign as employee')}
                          </Button>
                        ) : completedContractStatuses.has(String(row.status || '').toLowerCase()) ? (
                          signedContractStatuses.has(String(row.status || '').toLowerCase()) && row.pdf_url ? (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PictureAsPdfIcon fontSize="small" />}
                              onClick={() => window.open(toPdfFileUrl(String(row.pdf_url || '')), '_blank', 'noopener,noreferrer')}
                              sx={mvsBodyOutlinedBtnSx}
                            >
                              {txt('PDF', 'PDF')}
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.secondary">{txt('완료', 'Done')}</Typography>
                          )
                        ) : (
                          <Typography variant="body2" color="text.secondary">{txt('대기', 'Pending')}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {renderPagination(myContractsTotalPages, myContractsPage, setMyContractsPage)}
            <Box sx={{ ...mvsBodyListTableSx, mt: 2.5, p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{t('employmentContractManagement.myPdfFiles')}</Typography>
              <Stack spacing={1}>
                {myContractPdfFiles.map((row) => (
                  <Box key={`pdf-my-contract-${row.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PictureAsPdfIcon fontSize="small" sx={{ color: 'error.main', opacity: 0.85 }} />
                    <Link href={toPdfFileUrl(String(row.pdf_url || ''))} target="_blank" rel="noopener noreferrer" underline="hover">{String(row.title || `Contract ${row.id}`)}.pdf</Link>
                  </Box>
                ))}
                {myContractPdfFiles.length === 0 && <Typography variant="body2" color="text.secondary">{t('employmentContractManagement.noPdfFiles')}</Typography>}
              </Stack>
            </Box>
          </>
        )}
      </Box>

      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          {editTemplate ? txt('템플릿 상세', 'Template details') : txt('템플릿 생성', 'Create template')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={txt('템플릿명', 'Template name')}
              value={templateForm.name}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label={txt('유형', 'Type')}
                value={templateForm.contract_type}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, contract_type: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>{txt('언어', 'Language')}</InputLabel>
                <Select
                  value={templateForm.language}
                  label={txt('언어', 'Language')}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, language: e.target.value }))}
                >
                  <MenuItem value="ko">ko</MenuItem>
                  <MenuItem value="en">en</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label={txt('본문(HTML)', 'Body (HTML)')}
              multiline
              minRows={8}
              value={templateForm.content_html}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, content_html: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>{txt('취소', 'Cancel')}</Button>
          <Button variant="contained" onClick={saveTemplate}>
            {txt('저장', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contractDialogOpen} onClose={() => setContractDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editContract ? txt('계약 수정', 'Edit contract') : txt('계약 생성', 'Create contract')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{txt('직원', 'Employee')}</InputLabel>
              <Select
                value={contractForm.employee_id}
                label={txt('직원', 'Employee')}
                onChange={(e) => setContractForm((prev) => ({ ...prev, employee_id: e.target.value }))}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>{u.username} ({u.userid})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{txt('템플릿', 'Template')}</InputLabel>
              <Select
                value={contractForm.template_id}
                label={txt('템플릿', 'Template')}
                onChange={(e) => {
                  const nextTemplateId = String(e.target.value);
                  const nextTemplate = templates.find((tpl: any) => String(tpl.id) === nextTemplateId);
                  const nextTemplateType = String(nextTemplate?.contract_type || '').toLowerCase();
                  const nextTemplateName = String(nextTemplate?.name || '').toLowerCase();
                  const nextIsSalaryTemplate =
                    nextTemplateType.includes('salary') ||
                    nextTemplateName.includes('salary') ||
                    nextTemplateName.includes('연봉');
                  setContractForm((prev) => ({
                    ...prev,
                    template_id: e.target.value,
                    contract_type: String(nextTemplate?.contract_type || prev.contract_type || 'regular'),
                    bonus_type: nextIsSalaryTemplate ? prev.bonus_type : '',
                    bonus_value: nextIsSalaryTemplate ? prev.bonus_value : ''
                  }));
                }}
              >
                <MenuItem value="">{txt('(없음)', '(None)')}</MenuItem>
                {templates.map((tpl) => (
                  <MenuItem key={tpl.id} value={String(tpl.id)}>{tpl.name} v{tpl.version}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={txt('제목', 'Title')}
              value={contractForm.title}
              onChange={(e) => setContractForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                type="date"
                label={txt('시작일', 'Start date')}
                value={contractForm.start_date}
                onChange={(e) => setContractForm((prev) => ({ ...prev, start_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                type="date"
                label={txt('종료일', 'End date')}
                value={contractForm.end_date}
                onChange={(e) => setContractForm((prev) => ({ ...prev, end_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label={txt('연봉/급여', 'Salary')}
                type="number"
                value={contractForm.salary}
                onChange={(e) => setContractForm((prev) => ({ ...prev, salary: e.target.value }))}
                sx={{ flex: 1 }}
              />
              <TextField
                label={txt('수습(개월)', 'Probation (months)')}
                type="number"
                value={contractForm.probation_months}
                onChange={(e) => setContractForm((prev) => ({ ...prev, probation_months: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Stack>
            {isSalaryTemplateSelected && (
              <Stack direction="row" spacing={2}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>{txt('보너스 방식', 'Bonus type')}</InputLabel>
                  <Select
                    value={contractForm.bonus_type}
                    label={txt('보너스 방식', 'Bonus type')}
                    onChange={(e) => setContractForm((prev) => ({ ...prev, bonus_type: String(e.target.value) }))}
                  >
                    <MenuItem value="percent">{txt('연 %', 'Annual %')}</MenuItem>
                    <MenuItem value="fixed">{txt('금액', 'Fixed amount')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label={
                    contractForm.bonus_type === 'percent'
                      ? txt('보너스 비율(%)', 'Bonus rate (%)')
                      : txt('보너스 금액', 'Bonus amount')
                  }
                  type="number"
                  value={contractForm.bonus_value}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, bonus_value: e.target.value }))}
                  sx={{ flex: 1 }}
                  disabled={!contractForm.bonus_type}
                />
              </Stack>
            )}
            <TextField
              label={txt('근무지', 'Work location')}
              value={contractForm.work_location}
              onChange={(e) => setContractForm((prev) => ({ ...prev, work_location: e.target.value }))}
            />
            <Autocomplete
              freeSolo
              options={workingDayOptions}
              value={contractForm.working_days || ''}
              onChange={(_, newValue) =>
                setContractForm((prev) => ({ ...prev, working_days: String(newValue || '') }))
              }
              onInputChange={(_, newInputValue) =>
                setContractForm((prev) => ({ ...prev, working_days: newInputValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={txt('근무일', 'Working days')}
                  placeholder={txt('예: Monday-Friday', 'e.g. Monday–Friday')}
                />
              )}
            />
            <Autocomplete
              freeSolo
              options={workingHourOptions}
              value={contractForm.working_hours || ''}
              onChange={(_, newValue) =>
                setContractForm((prev) => ({ ...prev, working_hours: String(newValue || '') }))
              }
              onInputChange={(_, newInputValue) =>
                setContractForm((prev) => ({ ...prev, working_hours: newInputValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={txt('근무시간', 'Working hours')}
                  placeholder={txt('선택 또는 직접 입력', 'Select or type')}
                />
              )}
            />
            {editContract && (
              <FormControl fullWidth>
                <InputLabel>{txt('상태', 'Status')}</InputLabel>
                <Select
                  value={contractForm.status}
                  label={txt('상태', 'Status')}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={['awaiting_company_sign', 'awaiting_employee_sign', 'signed'].includes(
                    String(editContract?.status || '').toLowerCase()
                  )}
                >
                  {[
                    'draft',
                    'in_review',
                    'active',
                    'expired',
                    'terminated',
                    ...(
                      ['awaiting_company_sign', 'awaiting_employee_sign', 'signed'].includes(
                        String(editContract?.status || '').toLowerCase()
                      )
                        ? [String(editContract?.status || '').toLowerCase()]
                        : []
                    )
                  ].map((s) => (
                    <MenuItem key={s} value={s}>
                      {contractStatusLabel(s)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {editContract && ['awaiting_company_sign', 'awaiting_employee_sign', 'signed'].includes(String(editContract?.status || '').toLowerCase()) && (
              <Typography variant="caption" color="text.secondary">
                {txt(
                  '서명 관련 상태는 서명 버튼/워크플로우 버튼으로만 변경됩니다.',
                  'Signing-related statuses can only be changed via the sign or workflow actions.'
                )}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractDialogOpen(false)}>{txt('취소', 'Cancel')}</Button>
          <Button variant="contained" onClick={saveContract}>
            {txt('저장', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={signDialogOpen} onClose={() => setSignDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{txt('계약서 서명', 'Sign contract')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{txt('서명 방식', 'Signing method')}</InputLabel>
              <Select
                value={signForm.sign_method}
                label={txt('서명 방식', 'Signing method')}
                onChange={(e) =>
                  setSignForm((prev) => ({
                    ...prev,
                    sign_method: e.target.value as 'internal_ack' | 'aadhaar_esign'
                  }))
                }
              >
                <MenuItem value="internal_ack">Internal Acknowledgement</MenuItem>
                <MenuItem value="aadhaar_esign">Aadhaar eSign</MenuItem>
              </Select>
            </FormControl>

            {signForm.sign_method === 'aadhaar_esign' && (
              <>
                <TextField
                  label={txt('Aadhaar 마지막 4자리', 'Aadhaar last 4 digits')}
                  value={signForm.aadhaar_last4}
                  onChange={(e) =>
                    setSignForm((prev) => ({
                      ...prev,
                      aadhaar_last4: e.target.value.replace(/\D/g, '').slice(0, 4)
                    }))
                  }
                  inputProps={{ maxLength: 4 }}
                />
                <TextField
                  label={txt('Aadhaar 인증 참조값', 'Aadhaar auth reference')}
                  value={signForm.aadhaar_auth_ref}
                  onChange={(e) => setSignForm((prev) => ({ ...prev, aadhaar_auth_ref: e.target.value }))}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={signForm.aadhaar_consent}
                      onChange={(e) => setSignForm((prev) => ({ ...prev, aadhaar_consent: e.target.checked }))}
                    />
                  }
                  label={txt(
                    'Aadhaar eSign 본인 인증 및 전자서명 처리에 동의합니다.',
                    'I consent to Aadhaar eSign identity verification and electronic signature processing.'
                  )}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignDialogOpen(false)}>{txt('취소', 'Cancel')}</Button>
          <Button
            variant="contained"
            onClick={signContract}
            disabled={
              signForm.sign_method === 'aadhaar_esign' &&
              (!signForm.aadhaar_consent || signForm.aadhaar_last4.length !== 4 || !signForm.aadhaar_auth_ref.trim())
            }
          >
            {txt('서명 실행', 'Sign')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={contractDetailOpen}
        onClose={() => {
          setContractDetailOpen(false);
          resetDetailSignForm();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{txt('내 계약 상세', 'Contract details')}</DialogTitle>
        <DialogContent>
          {contractDetailLoading ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {txt('계약 내용을 불러오는 중입니다...', 'Loading contract...')}
            </Typography>
          ) : selectedContractDetail ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box
                ref={contractDetailPdfRef}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1.25}>
                  <Typography variant="body2">
                    <strong>{txt('제목:', 'Title:')}</strong> {String(selectedContractDetail.title || '-')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{txt('기간:', 'Period:')}</strong> {String(selectedContractDetail.start_date || '-')} ~{' '}
                    {String(selectedContractDetail.end_date || '-')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{txt('상태:', 'Status:')}</strong>{' '}
                    {contractStatusLabel(String(selectedContractDetail.status || 'draft'))}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{txt('연봉/급여:', 'Salary:')}</strong> {String(selectedContractDetail.salary ?? '-')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{txt('보너스:', 'Bonus:')}</strong>{' '}
                    {selectedContractDetail.bonus_type
                      ? `${String(selectedContractDetail.bonus_type)} ${String(selectedContractDetail.bonus_value ?? '-')}`
                      : '-'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{txt('근무일:', 'Working days:')}</strong> {String(selectedContractDetail.working_days || '-')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{txt('근무시간:', 'Working hours:')}</strong> {String(selectedContractDetail.working_hours || '-')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{txt('근무지:', 'Work location:')}</strong> {String(selectedContractDetail.work_location || '-')}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {txt('계약 본문', 'Contract body')}
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        maxHeight: 300,
                        overflowY: 'auto',
                        bgcolor: '#FFFFFF',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: String(
                          selectedContractDetail.rendered_content_html ||
                            selectedContractDetail.template?.content_html ||
                            `<p>${txt('등록된 계약 본문이 없습니다.', 'No contract body is registered.')}</p>`
                        ),
                      }}
                    />
                  </Box>
                </Stack>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid #CBD5E1',
                  bgcolor: '#F8FAFC',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <VerifiedUserIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {txt('Aadhaar e-Verify', 'Aadhaar e-Verify')}
                  </Typography>
                </Stack>

                {detailSignContext ? (
                  <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">
                      {txt(
                        'Aadhaar 인증 또는 간편 서명으로 계약서에 전자서명할 수 있습니다.',
                        'You can sign the contract with Aadhaar verification or quick sign.'
                      )}
                    </Typography>
                    <TextField
                      size="small"
                      label={txt('Aadhaar 마지막 4자리', 'Aadhaar last 4 digits')}
                      value={detailSignForm.aadhaar_last4}
                      onChange={(e) =>
                        setDetailSignForm((prev) => ({
                          ...prev,
                          aadhaar_last4: e.target.value.replace(/\D/g, '').slice(0, 4),
                        }))
                      }
                      inputProps={{ maxLength: 4 }}
                    />
                    <TextField
                      size="small"
                      label={txt('Aadhaar 인증 참조값', 'Aadhaar auth reference')}
                      value={detailSignForm.aadhaar_auth_ref}
                      onChange={(e) => setDetailSignForm((prev) => ({ ...prev, aadhaar_auth_ref: e.target.value }))}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={detailSignForm.aadhaar_consent}
                          onChange={(e) => setDetailSignForm((prev) => ({ ...prev, aadhaar_consent: e.target.checked }))}
                        />
                      }
                      label={txt(
                        'Aadhaar eSign 본인 인증 및 전자서명 처리에 동의합니다.',
                        'I consent to Aadhaar eSign identity verification and electronic signature processing.'
                      )}
                    />
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {txt(
                      '관리자가 계약서를내면 여기에서 서명할 수 있습니다.',
                      'You can sign here once HR sends the contract.'
                    )}
                  </Typography>
                )}
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {txt('계약 상세 정보가 없습니다.', 'No contract details available.')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => {
            setContractDetailOpen(false);
            resetDetailSignForm();
          }}>
            {txt('닫기', 'Close')}
          </Button>
          {selectedContractDetail && canDownloadContractPdf ? (
            <Button
              variant="outlined"
              startIcon={contractDetailPdfSaving ? <CircularProgress size={16} /> : <PictureAsPdfIcon fontSize="small" />}
              onClick={() => void handleDownloadContractPdf()}
              disabled={contractDetailPdfSaving}
              sx={mvsBodyOutlinedBtnSx}
            >
              {txt('PDF 저장', 'Save PDF')}
            </Button>
          ) : null}
          {detailSignContext ? (
            <>
              <Button
                variant="outlined"
                startIcon={<DrawIcon fontSize="small" />}
                onClick={() => void handleDetailInternalSign()}
                sx={mvsBodyOutlinedBtnSx}
              >
                {txt('서명 완료', 'Complete sign')}
              </Button>
              <Button
                variant="contained"
                disableElevation
                startIcon={<VerifiedUserIcon fontSize="small" />}
                onClick={() => void handleDetailAadhaarSign()}
                disabled={!detailAadhaarSignReady}
                sx={mvsBodyPrimaryBtnSx}
              >
                {txt('Aadhaar e-Verify', 'Aadhaar e-Verify')}
              </Button>
            </>
          ) : null}
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

      <Snackbar open={Boolean(message)} autoHideDuration={5000} onClose={() => setMessage(null)}>
        <Alert severity={message?.type || 'success'} onClose={() => setMessage(null)}>
          {message?.text || ''}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmploymentContractManagement;

