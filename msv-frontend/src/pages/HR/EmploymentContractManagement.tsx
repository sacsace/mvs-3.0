import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormControl,
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
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Assignment as AssignmentIcon, Add as AddIcon, Edit as EditIcon, Draw as DrawIcon, PictureAsPdf as PictureAsPdfIcon } from '@mui/icons-material';
import { API_BASE_URL, companyService, employmentContractService, userService } from '../../services/api';
import { useStore, useMenuStore } from '../../store';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';

const employmentContractTableHeadRowSx = {
  '& > .MuiTableCell-root': {
    bgcolor: 'primary.100',
    fontWeight: 600,
    color: 'text.primary',
    borderBottom: '2px solid',
    borderColor: 'primary.main',
    py: 1.25
  }
} as const;

type TabMode = 'templates' | 'contracts' | 'my';
type MyContractFilterMode = 'all' | 'in_progress' | 'completed';
type ContractAuditFilter = {
  action: string;
  actor: string;
  startDate: string;
  endDate: string;
};

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
  const [contractAuditLogs, setContractAuditLogs] = useState<any[]>([]);
  const [contractAuditLoading, setContractAuditLoading] = useState(false);
  const [contractAuditFilter, setContractAuditFilter] = useState<ContractAuditFilter>({
    action: '',
    actor: '',
    startDate: '',
    endDate: ''
  });
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
  const completedContractStatuses = useMemo(
    () => new Set(['signed', 'active', 'expired', 'completed', 'terminated', 'cancelled']),
    []
  );
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
  const toPdfFileUrl = (pdfUrl: string) => {
    if (!pdfUrl) return '#';
    if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) return pdfUrl;
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${apiRoot}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
  };
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
  const contractAuditActionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          contractAuditLogs
            .map((row) => String(row?.action || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [contractAuditLogs]
  );
  const contractAuditActorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          contractAuditLogs
            .map((row) => String(row?.actor?.username || row?.actor_role || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [contractAuditLogs]
  );
  const filteredContractAuditLogs = useMemo(() => {
    return contractAuditLogs.filter((row) => {
      const action = String(row?.action || '');
      const actor = String(row?.actor?.username || row?.actor_role || '');
      const createdAt = String(row?.created_at || '');
      const dateOnly = createdAt.slice(0, 10);
      if (contractAuditFilter.action && action !== contractAuditFilter.action) return false;
      if (contractAuditFilter.actor && actor !== contractAuditFilter.actor) return false;
      if (contractAuditFilter.startDate && dateOnly < contractAuditFilter.startDate) return false;
      if (contractAuditFilter.endDate && dateOnly > contractAuditFilter.endDate) return false;
      return true;
    });
  }, [contractAuditLogs, contractAuditFilter]);

  const loadCompanies = async () => {
    if (!isRoot) return;
    try {
      const res = await companyService.getCompanies();
      const rows = Array.isArray(res?.data) ? res.data : [];
      const mapped = rows.map((c: any) => ({ id: Number(c.id), name: String(c.name || `Company ${c.id}`) }));
      setCompanies(mapped);
      if (!selectedCompanyId && mapped.length > 0) {
        const loginCompanyId = Number(user?.company_id || 0);
        const matchedCompany = mapped.find((company: CompanyOption) => company.id === loginCompanyId);
        setSelectedCompanyId(matchedCompany ? matchedCompany.id : mapped[0].id);
      }
    } catch (error) {
      console.error('회사 목록 조회 오류:', error);
      setMessage({ type: 'error', text: txt('회사 목록을 불러오지 못했습니다.', 'Failed to load companies.') });
    }
  };

  const loadUsers = async () => {
    try {
      const params = isRoot && selectedCompanyId ? { company_id: Number(selectedCompanyId) } : undefined;
      const res = await userService.getUsers(params);
      const rows = Array.isArray(res?.data) ? res.data : [];
      const mapped = rows
        .filter((u: any) => String(u.status || 'active') === 'active')
        .map((u: any) => ({
          id: Number(u.id),
          username: String(u.username || ''),
          userid: String(u.userid || '')
        }));
      setUsers(mapped);
    } catch (error) {
      console.error('직원 목록 조회 오류:', error);
      setMessage({ type: 'error', text: txt('직원 목록을 불러오지 못했습니다.', 'Failed to load employees.') });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const queryCompanyId = isRoot && selectedCompanyId ? Number(selectedCompanyId) : undefined;
      const [templateRes, contractRes, myRes] = await Promise.all([
        employmentContractService.getTemplates(queryCompanyId),
        employmentContractService.getContracts({ company_id: queryCompanyId }),
        employmentContractService.getMyContracts()
      ]);
      setTemplates(Array.isArray(templateRes?.data) ? templateRes.data : []);
      setContracts(Array.isArray(contractRes?.data) ? contractRes.data : []);
      setMyContracts(Array.isArray(myRes?.data) ? myRes.data : []);
    } catch (error) {
      console.error('전자근로계약 데이터 조회 오류:', error);
      setMessage({
        type: 'error',
        text: txt('전자근로계약 데이터를 불러오지 못했습니다.', 'Failed to load employment contract data.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, [isRoot, user?.company_id]);

  useEffect(() => {
    void loadUsers();
    void loadData();
  }, [selectedCompanyId, isRoot]);

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
      setMessage({ type: 'success', text: txt('템플릿이 삭제되었습니다.', 'Template deleted.') });
      void loadData();
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error?.message || txt('템플릿 삭제 중 오류가 발생했습니다.', 'An error occurred while deleting the template.'),
      });
    }
  };

  const deleteTemplate = (templateId: number, templateName: string) => {
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

  const openMyContractDetail = async (contractId: number) => {
    setContractDetailOpen(true);
    setContractDetailLoading(true);
    setContractAuditLoading(true);
    setContractAuditFilter({
      action: '',
      actor: '',
      startDate: '',
      endDate: ''
    });
    try {
      const [res, auditRes] = await Promise.all([
        employmentContractService.getContract(contractId),
        employmentContractService.getContractAuditLogs(contractId, { limit: 200 })
      ]);
      if (!res?.success) throw new Error(res?.message || '계약 상세 조회 실패');
      setSelectedContractDetail(res.data || null);
      setContractAuditLogs(Array.isArray(auditRes?.data) ? auditRes.data : []);
    } catch (error: any) {
      setSelectedContractDetail(null);
      setContractAuditLogs([]);
      setMessage({
        type: 'error',
        text: error?.message || txt('계약 상세를 불러오지 못했습니다.', 'Failed to load contract details.'),
      });
    } finally {
      setContractDetailLoading(false);
      setContractAuditLoading(false);
    }
  };

  const statusChip = (status: string) => {
    const color: any =
      status === 'signed' || status === 'active'
        ? 'success'
        : status.includes('awaiting')
          ? 'warning'
          : status === 'expired'
            ? 'error'
            : 'default';
    return <Chip size="small" label={contractStatusLabel(status)} color={color} />;
  };

  return (
    <Box sx={{ p: 3, backgroundColor: 'workArea.main', borderRadius: 2, minHeight: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            {txt('전자근로계약 관리', 'Employment contract management')}
          </Typography>
        </Box>
        {isRoot && (
          <Box sx={{ minWidth: 260, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1, mb: 0.25, lineHeight: 1 }}>
              {txt('회사', 'Company')}
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                displayEmpty
              >
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      <Card>
        <CardContent>
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            sx={{ mb: 2 }}
          >
            <Tab value="contracts" label={txt('계약 목록', 'Contracts')} />
            <Tab value="templates" label={txt('템플릿', 'Templates')} />
            <Tab value="my" label={txt('내 계약서', 'My contracts')} />
          </Tabs>

          {tab === 'contracts' && (
            <Stack spacing={1.5}>
              {canManage && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateContract}>
                    {txt('계약 생성', 'Create contract')}
                  </Button>
                </Box>
              )}
              <Table size="small">
                <TableHead>
                  <TableRow sx={employmentContractTableHeadRowSx}>
                    <TableCell>ID</TableCell>
                    <TableCell>{txt('제목', 'Title')}</TableCell>
                    <TableCell>{txt('직원', 'Employee')}</TableCell>
                    <TableCell>{txt('기간', 'Period')}</TableCell>
                    <TableCell>{txt('상태', 'Status')}</TableCell>
                    <TableCell>{txt('작업', 'Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.employee?.username || row.employee_id}</TableCell>
                      <TableCell>{row.start_date} ~ {row.end_date}</TableCell>
                      <TableCell>{statusChip(String(row.status || 'draft'))}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={() => openMyContractDetail(Number(row.id))}>
                            {txt('상세', 'Details')}
                          </Button>
                          {canManage && (
                            <Button size="small" startIcon={<EditIcon />} onClick={() => openEditContract(row)}>
                              {txt('수정', 'Edit')}
                            </Button>
                          )}
                          {canManage && String(row.status || '').toLowerCase() === 'draft' && (
                            <Button
                              size="small"
                              onClick={() =>
                                transitionContractStatus(
                                  Number(row.id),
                                  'in_review',
                                  txt('검토 상태로 전환되었습니다.', 'Moved to in review.')
                                )
                              }
                            >
                              {txt('검토요청', 'Request review')}
                            </Button>
                          )}
                          {canManage && String(row.status || '').toLowerCase() === 'in_review' && (
                            <Button
                              size="small"
                              onClick={() =>
                                transitionContractStatus(
                                  Number(row.id),
                                  'awaiting_company_sign',
                                  txt('회사 서명 대기 상태로 전환되었습니다.', 'Moved to awaiting company signature.')
                                )
                              }
                            >
                              {txt('서명요청단계', 'Signing step')}
                            </Button>
                          )}
                          {canManage && String(row.status || '').toLowerCase() === 'signed' && (
                            <Button
                              size="small"
                              color="success"
                              onClick={() =>
                                transitionContractStatus(
                                  Number(row.id),
                                  'active',
                                  txt('계약이 활성화되었습니다.', 'Contract activated.')
                                )
                              }
                            >
                              {txt('활성화', 'Activate')}
                            </Button>
                          )}
                          {canManage && String(row.status || '').toLowerCase() === 'active' && (
                            <Button
                              size="small"
                              color="warning"
                              onClick={() =>
                                transitionContractStatus(
                                  Number(row.id),
                                  'expired',
                                  txt('계약이 만료 처리되었습니다.', 'Contract marked as expired.')
                                )
                              }
                            >
                              {txt('만료처리', 'Mark expired')}
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => deleteContract(Number(row.id), String(row.title || ''))}
                            >
                              {txt('삭제', 'Delete')}
                            </Button>
                          )}
                          {canManage && ['in_review', 'awaiting_company_sign'].includes(String(row.status || '').toLowerCase()) && (
                            <Button
                              size="small"
                              startIcon={<DrawIcon />}
                              onClick={() => openSignDialog(Number(row.id), 'company')}
                            >
                              {txt('회사 서명', 'Company sign')}
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!loading && contracts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {txt('등록된 계약이 없습니다.', 'No contracts yet.')}
                </Typography>
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {txt('PDF 파일 목록', 'PDF files')}
                </Typography>
                <Stack spacing={0.75}>
                  {contractPdfFiles.map((row) => (
                    <Box key={`pdf-contract-${row.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PictureAsPdfIcon fontSize="small" color="error" />
                      <Link href={toPdfFileUrl(String(row.pdf_url || ''))} target="_blank" rel="noopener noreferrer" underline="hover">
                        {String(row.title || `Contract ${row.id}`)}.pdf
                      </Link>
                    </Box>
                  ))}
                  {!loading && contractPdfFiles.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {txt('생성된 PDF 파일이 없습니다.', 'No PDF files have been generated.')}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}

          {tab === 'templates' && (
            <Stack spacing={1.5}>
              {canManage && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateTemplate}>
                    {txt('템플릿 생성', 'Create template')}
                  </Button>
                </Box>
              )}
              <Table size="small">
                <TableHead>
                  <TableRow sx={employmentContractTableHeadRowSx}>
                    <TableCell>ID</TableCell>
                    <TableCell>{txt('템플릿명', 'Template name')}</TableCell>
                    <TableCell>{txt('유형', 'Type')}</TableCell>
                    <TableCell>{txt('언어', 'Language')}</TableCell>
                    <TableCell>{txt('버전', 'Version')}</TableCell>
                    <TableCell>{txt('작업', 'Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.contract_type}</TableCell>
                      <TableCell>{row.language}</TableCell>
                      <TableCell>{row.version}</TableCell>
                      <TableCell>
                        {canManage && (
                          <Stack direction="row" spacing={1}>
                            <Button size="small" startIcon={<EditIcon />} onClick={() => openEditTemplate(row)}>
                              {txt('수정', 'Edit')}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() => deleteTemplate(Number(row.id), String(row.name || ''))}
                            >
                              {txt('삭제', 'Delete')}
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!loading && templates.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {txt('등록된 템플릿이 없습니다.', 'No templates yet.')}
                </Typography>
              )}
            </Stack>
          )}

          {tab === 'my' && (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant={myContractFilter === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setMyContractFilter('all')}
                >
                  {txt('전체', 'All')}
                </Button>
                <Button
                  size="small"
                  variant={myContractFilter === 'in_progress' ? 'contained' : 'outlined'}
                  onClick={() => setMyContractFilter('in_progress')}
                >
                  {txt('진행중', 'In progress')}
                </Button>
                <Button
                  size="small"
                  variant={myContractFilter === 'completed' ? 'contained' : 'outlined'}
                  onClick={() => setMyContractFilter('completed')}
                >
                  {txt('완료', 'Completed')}
                </Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={employmentContractTableHeadRowSx}>
                    <TableCell>ID</TableCell>
                    <TableCell>{txt('제목', 'Title')}</TableCell>
                    <TableCell>{txt('기간', 'Period')}</TableCell>
                    <TableCell>{txt('상태', 'Status')}</TableCell>
                    <TableCell>{txt('작업', 'Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleMyContracts.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => openMyContractDetail(Number(row.id))}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.start_date} ~ {row.end_date}</TableCell>
                      <TableCell>{statusChip(String(row.status || 'draft'))}</TableCell>
                      <TableCell>
                        {String(row.status || '').toLowerCase() === 'awaiting_employee_sign' ? (
                          <Button
                            size="small"
                            startIcon={<DrawIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openSignDialog(Number(row.id), 'employee');
                            }}
                          >
                            {txt('직원 서명', 'Sign as employee')}
                          </Button>
                        ) : completedContractStatuses.has(String(row.status || '').toLowerCase()) ? (
                          <Typography variant="body2" color="text.secondary">
                            {txt('완료', 'Done')}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {txt('대기', 'Pending')}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!loading && visibleMyContracts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {myContractFilter === 'completed'
                    ? txt('완료된 계약서가 없습니다.', 'No completed contracts.')
                    : txt('내 계약서가 없습니다.', 'You have no contracts yet.')}
                </Typography>
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {txt('내 PDF 파일 목록', 'My PDF files')}
                </Typography>
                <Stack spacing={0.75}>
                  {myContractPdfFiles.map((row) => (
                    <Box key={`pdf-my-contract-${row.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PictureAsPdfIcon fontSize="small" color="error" />
                      <Link href={toPdfFileUrl(String(row.pdf_url || ''))} target="_blank" rel="noopener noreferrer" underline="hover">
                        {String(row.title || `Contract ${row.id}`)}.pdf
                      </Link>
                    </Box>
                  ))}
                  {!loading && myContractPdfFiles.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      {txt('생성된 PDF 파일이 없습니다.', 'No PDF files have been generated.')}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editTemplate ? txt('템플릿 수정', 'Edit template') : txt('템플릿 생성', 'Create template')}</DialogTitle>
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
        onClose={() => setContractDetailOpen(false)}
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
            <Stack spacing={1.25} sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>{txt('제목:', 'Title:')}</strong> {String(selectedContractDetail.title || '-')}
              </Typography>
              <Typography variant="body2">
                <strong>{txt('기간:', 'Period:')}</strong> {String(selectedContractDetail.start_date || '-')} ~{' '}
                {String(selectedContractDetail.end_date || '-')}
              </Typography>
              <Typography variant="body2">
                <strong>{txt('상태:', 'Status:')}</strong> {contractStatusLabel(String(selectedContractDetail.status || 'draft'))}
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
              <Box sx={{ mt: 1.5 }}>
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
                    bgcolor: 'background.paper'
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
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {txt('감사로그', 'Audit log')}
                </Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1.5 }}>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{txt('액션', 'Action')}</InputLabel>
                    <Select
                      value={contractAuditFilter.action}
                      label={txt('액션', 'Action')}
                      onChange={(e) => setContractAuditFilter((prev) => ({ ...prev, action: String(e.target.value) }))}
                    >
                      <MenuItem value="">{txt('전체', 'All')}</MenuItem>
                      {contractAuditActionOptions.map((action) => (
                        <MenuItem key={action} value={action}>{action}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{txt('행위자', 'Actor')}</InputLabel>
                    <Select
                      value={contractAuditFilter.actor}
                      label={txt('행위자', 'Actor')}
                      onChange={(e) => setContractAuditFilter((prev) => ({ ...prev, actor: String(e.target.value) }))}
                    >
                      <MenuItem value="">{txt('전체', 'All')}</MenuItem>
                      {contractAuditActorOptions.map((actor) => (
                        <MenuItem key={actor} value={actor}>{actor}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    type="date"
                    label={txt('시작일', 'Start date')}
                    value={contractAuditFilter.startDate}
                    onChange={(e) => setContractAuditFilter((prev) => ({ ...prev, startDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label={txt('종료일', 'End date')}
                    value={contractAuditFilter.endDate}
                    onChange={(e) => setContractAuditFilter((prev) => ({ ...prev, endDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                {contractAuditLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    {txt('감사로그를 불러오는 중입니다...', 'Loading audit log...')}
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={employmentContractTableHeadRowSx}>
                        <TableCell>{txt('일시', 'Time')}</TableCell>
                        <TableCell>{txt('액션', 'Action')}</TableCell>
                        <TableCell>{txt('행위자', 'Actor')}</TableCell>
                        <TableCell>{txt('상세', 'Details')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredContractAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{String(log.created_at || '').replace('T', ' ').slice(0, 19)}</TableCell>
                          <TableCell>{String(log.action || '-')}</TableCell>
                          <TableCell>{String(log.actor?.username || log.actor_role || '-')}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {JSON.stringify(log.details || {})}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredContractAuditLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary">
                              {txt('조건에 맞는 감사로그가 없습니다.', 'No audit entries match the filters.')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {txt('계약 상세 정보가 없습니다.', 'No contract details available.')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractDetailOpen(false)}>{txt('닫기', 'Close')}</Button>
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

