import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  EditOutlined as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { api, projectService } from '../../services/api';
import { useReferenceDataStore, filterActiveCompanyUsers } from '../../store/referenceDataStore';
import { useMenuStore, useStore } from '../../store';
import { showErrorPopup, showSuccessPopup } from '../../utils/errorHandler';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';
import {
  getMvsDialogActionsSx,
  getMvsDialogPaperSx,
  getMvsDialogTitleRowSx,
} from '../../components/Common/mvsDialogShell';
import {
  mvsBodyCardSx,
  mvsBodyListTableSx,
  mvsBodyListZoneSx,
  mvsBodyOutlinedBtnSx,
  mvsBodyPrimaryBtnSx,
  mvsBodySectionHeaderSx,
  mvsFilterFieldHeightSx,
  mvsOutlinedLabelProps,
  mvsPageRootSx,
  mvsSearchFieldSx,
  mvsTableBodyRowSx,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';

const MENU_ROUTE = '/work/project-management';
const STATUS_KEYS = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;

function normalizeStatus(status: string): string {
  if (status === 'active') return 'in_progress';
  return status || 'planning';
}

type ProjectRow = {
  id: number;
  project_code: string;
  name: string;
  description: string;
  manager: string;
  manager_id: number | null;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  progress: number;
  budget: number;
};

type FormState = {
  name: string;
  description: string;
  manager_id: string;
  status: string;
  startDate: string;
  endDate: string;
  priority: string;
  budget: number;
  inviteUserIds: number[];
};

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  manager_id: '',
  status: 'planning',
  startDate: '',
  endDate: '',
  priority: 'medium',
  budget: 0,
  inviteUserIds: [],
});

function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function remainingDays(end: string): number | null {
  if (!end) return null;
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(e.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - today.getTime()) / 86400000);
}

const ProjectManagement: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useStore();
  const { loading: menusLoading } = useMenuStore();
  const menuFlags = useMenuRoutePermissionFlags([MENU_ROUTE]);
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isRootOrAudit = user?.role === 'root' || user?.role === 'audit';

  const statusLabel = useCallback(
    (status: string) => {
      const key = normalizeStatus(status);
      return t(`projectManagement.status.${key}`, { defaultValue: key });
    },
    [t]
  );

  const priorityLabel = useCallback(
    (priority: string) => t(`projectManagement.priority.${priority}`, { defaultValue: priority }),
    [t]
  );

  const loadProjects = useCallback(async () => {
    if (!menuFlags.canRead) {
      setProjects([]);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 1000 };
      if (isRootOrAudit && selectedCompanyId) {
        params.company_id = selectedCompanyId;
      }
      if (statusFilter !== 'all') params.status = statusFilter;
      if (managerFilter !== 'all') params.manager_id = managerFilter;

      const response = await projectService.getProjects(params);
      if (response.success) {
        setProjects(
          (response.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            manager: p.manager?.username || '-',
            manager_id: p.project_manager ?? null,
            status: normalizeStatus(p.status),
            progress: Number(p.progress) || 0,
            startDate: p.start_date || '',
            endDate: p.end_date || '',
            priority: p.priority || 'medium',
            project_code: p.project_code || '',
            budget: parseFloat(String(p.budget || 0)) || 0,
          }))
        );
      } else {
        showErrorPopup(response.message || t('projectManagement.errors.loadList'), t('projectManagement.errors.loadListTitle'));
      }
    } catch (error: any) {
      showErrorPopup(error, t('projectManagement.errors.loadListTitle'));
    } finally {
      setLoading(false);
    }
  }, [isRootOrAudit, managerFilter, menuFlags.canRead, selectedCompanyId, statusFilter, t]);

  const loadCompanies = useCallback(async () => {
    try {
      const response = await api.get('/companies');
      if (response.data.success) {
        setCompanies(response.data.data || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const params: { company_id?: number } = {};
      if (user?.company_id) params.company_id = user.company_id;
      const usersData = await useReferenceDataStore.getState().fetchUsers(params);
      setUsers(
        filterActiveCompanyUsers(usersData, {
          companyId: user?.company_id,
          tenantId: user?.tenant_id,
        })
      );
    } catch {
      /* ignore */
    }
  }, [user?.company_id]);

  useEffect(() => {
    void loadUsers();
    if (isRootOrAudit) void loadCompanies();
  }, [isRootOrAudit, loadCompanies, loadUsers]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.project_code.toLowerCase().includes(q) ||
        p.manager.toLowerCase().includes(q)
    );
  }, [projects, searchTerm]);

  const handleOpenDialog = (project?: ProjectRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (project) {
      setSelectedProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        manager_id: project.manager_id != null ? String(project.manager_id) : '',
        status: normalizeStatus(project.status),
        startDate: project.startDate,
        endDate: project.endDate,
        priority: project.priority === 'normal' ? 'medium' : project.priority,
        budget: project.budget,
        inviteUserIds: [],
      });
    } else {
      setSelectedProject(null);
      const form = emptyForm();
      if (user?.id) form.manager_id = String(user.id);
      setFormData(form);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProject(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showErrorPopup(t('projectManagement.errors.nameRequired'), t('projectManagement.errors.saveTitle'));
      return;
    }
    if (!formData.startDate) {
      showErrorPopup(t('projectManagement.errors.startRequired'), t('projectManagement.errors.saveTitle'));
      return;
    }
    if (!formData.manager_id) {
      showErrorPopup(t('projectManagement.errors.managerRequired'), t('projectManagement.errors.saveTitle'));
      return;
    }
    if (formData.endDate && formData.endDate < formData.startDate) {
      showErrorPopup(t('projectManagement.errors.endBeforeStart'), t('projectManagement.errors.saveTitle'));
      return;
    }

    setSaving(true);
    try {
      const projectData: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        project_manager: parseInt(formData.manager_id, 10),
        status: formData.status,
        start_date: formData.startDate,
        end_date: formData.endDate || undefined,
        priority: formData.priority,
        budget: formData.budget || 0,
      };

      if (selectedProject) {
        if (!menuFlags.canEdit) return;
        const response = await projectService.updateProject(selectedProject.id, projectData);
        if (response.success) {
          showSuccessPopup(t('projectManagement.messages.updated'));
          handleCloseDialog();
          void loadProjects();
        } else {
          showErrorPopup(response.message || t('projectManagement.errors.updateFailed'), t('projectManagement.errors.saveTitle'));
        }
      } else {
        if (!menuFlags.canCreate) return;
        projectData.member_user_ids = formData.inviteUserIds;
        const response = await projectService.createProject(projectData);
        if (response.success) {
          showSuccessPopup(t('projectManagement.messages.created'));
          handleCloseDialog();
          void loadProjects();
          const newId = Number(response.data?.id);
          if (Number.isInteger(newId) && newId > 0) {
            navigate(`/work/project-management/${newId}`);
          }
        } else {
          showErrorPopup(response.message || t('projectManagement.errors.createFailed'), t('projectManagement.errors.saveTitle'));
        }
      }
    } catch (error: any) {
      showErrorPopup(error, t('projectManagement.errors.saveTitle'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!menuFlags.canDelete) return;
    showConfirm(
      t('projectManagement.confirm.deleteMessage'),
      async () => {
        try {
          const response = await projectService.deleteProject(id);
          if (response.success) {
            showSuccessPopup(t('projectManagement.messages.deleted'));
            void loadProjects();
          } else {
            showErrorPopup(response.message || t('projectManagement.errors.deleteFailed'), t('projectManagement.errors.deleteTitle'));
          }
        } catch (error: any) {
          showErrorPopup(error, t('projectManagement.errors.deleteTitle'));
        }
      },
      { confirmColor: 'error', title: t('projectManagement.confirm.deleteTitle') }
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setManagerFilter('all');
    setSelectedCompanyId('');
  };

  return (
    <Box sx={{ ...mvsPageRootSx }}>
      <MvsPageHeader
        title={t('projectManagement.title')}
        description={t('projectManagement.description')}
        iconPath={MENU_ROUTE}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
              onClick={() => void loadProjects()}
              disabled={loading || menusLoading || !menuFlags.canRead}
              sx={mvsBodyOutlinedBtnSx}
            >
              {t('projectManagement.actions.refresh')}
            </Button>
            <Tooltip title={!menuFlags.canCreate && !menusLoading ? t('projectManagement.noCreatePermission') : ''}>
              <span>
                <Button
                  variant="contained"
                  disableElevation
                  startIcon={<AddIcon sx={{ fontSize: 20 }} />}
                  onClick={() => handleOpenDialog()}
                  disabled={menusLoading || !menuFlags.canCreate}
                  sx={mvsBodyPrimaryBtnSx}
                >
                  {t('projectManagement.actions.create')}
                </Button>
              </span>
            </Tooltip>
          </>
        }
      />

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 0 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            bgcolor: '#FFFFFF',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: isRootOrAudit ? 'minmax(200px, 2fr) repeat(3, minmax(120px, 1fr)) auto' : 'minmax(200px, 2fr) repeat(2, minmax(120px, 1fr)) auto',
            },
            gap: 2,
            alignItems: 'flex-end',
          }}
        >
          <TextField
            fullWidth
            size="small"
            label={t('common.search')}
            placeholder={t('projectManagement.filters.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            {...mvsOutlinedLabelProps}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{ ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx }}
          />
          {isRootOrAudit && (
            <FormControl fullWidth size="small" sx={{ ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx }}>
              <InputLabel shrink>{t('projectManagement.filters.company')}</InputLabel>
              <Select
                value={selectedCompanyId === '' ? '' : String(selectedCompanyId)}
                label={t('projectManagement.filters.company')}
                displayEmpty
                onChange={(e) => {
                  const value = String(e.target.value);
                  setSelectedCompanyId(value === '' ? '' : Number(value));
                }}
              >
                <MenuItem value="">{t('projectManagement.filters.allCompanies')}</MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth size="small" sx={{ ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx }}>
            <InputLabel shrink>{t('projectManagement.filters.status')}</InputLabel>
            <Select
              value={statusFilter}
              label={t('projectManagement.filters.status')}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">{t('projectManagement.filters.allStatuses')}</MenuItem>
              {STATUS_KEYS.map((s) => (
                <MenuItem key={s} value={s}>
                  {statusLabel(s)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx }}>
            <InputLabel shrink>{t('projectManagement.filters.manager')}</InputLabel>
            <Select
              value={managerFilter}
              label={t('projectManagement.filters.manager')}
              onChange={(e) => setManagerFilter(e.target.value)}
            >
              <MenuItem value="all">{t('projectManagement.filters.allManagers')}</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>
                  {u.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={resetFilters} sx={mvsBodyOutlinedBtnSx}>
            {t('projectManagement.actions.reset')}
          </Button>
        </Box>
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        <Box sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
          <Box sx={mvsBodySectionHeaderSx}>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0F172A' }}>
              {t('projectManagement.listTitle', { count: filteredProjects.length })}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filteredProjects.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.secondary">
                {projects.length === 0 ? t('projectManagement.empty') : t('projectManagement.noResults')}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
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
                    <TableCell>{t('projectManagement.columns.code')}</TableCell>
                    <TableCell>{t('projectManagement.columns.name')}</TableCell>
                    <TableCell>{t('projectManagement.columns.manager')}</TableCell>
                    <TableCell>{t('projectManagement.columns.startDate')}</TableCell>
                    <TableCell>{t('projectManagement.columns.endDate')}</TableCell>
                    <TableCell>{t('projectManagement.columns.duration')}</TableCell>
                    <TableCell>{t('projectManagement.columns.remaining')}</TableCell>
                    <TableCell>{t('projectManagement.columns.status')}</TableCell>
                    <TableCell>{t('projectManagement.columns.priority')}</TableCell>
                    <TableCell>{t('projectManagement.columns.progress')}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{t('projectManagement.columns.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={mvsTableBodyRowSx}>
                  {filteredProjects.map((project) => {
                    const duration = daysBetween(project.startDate, project.endDate);
                    const remain = remainingDays(project.endDate);
                    const overdue =
                      remain != null &&
                      remain < 0 &&
                      project.status !== 'completed' &&
                      project.status !== 'cancelled';
                    return (
                      <TableRow
                        key={project.id}
                        hover
                        onClick={() => navigate(`/work/project-management/${project.id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{project.project_code}</TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: '#0F172A',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 220,
                            }}
                            title={project.name}
                          >
                            {project.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{project.manager}</TableCell>
                        <TableCell>{project.startDate || '-'}</TableCell>
                        <TableCell>{project.endDate || '-'}</TableCell>
                        <TableCell>
                          {duration != null ? t('projectManagement.days', { count: duration }) : '-'}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: overdue ? '#DC2626' : 'inherit',
                            fontWeight: overdue ? 600 : 400,
                          }}
                        >
                          {remain == null
                            ? '-'
                            : remain < 0
                              ? t('projectManagement.daysOverdue', { count: Math.abs(remain) })
                              : t('projectManagement.daysLeft', { count: remain })}
                        </TableCell>
                        <TableCell>{statusLabel(project.status)}</TableCell>
                        <TableCell>{priorityLabel(project.priority)}</TableCell>
                        <TableCell>{project.progress}%</TableCell>
                        <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <Tooltip title={!menuFlags.canEdit ? t('projectManagement.noEditPermission') : ''}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={(e) => handleOpenDialog(project, e)}
                                disabled={!menuFlags.canEdit}
                              >
                                <EditIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={!menuFlags.canDelete ? t('projectManagement.noDeletePermission') : ''}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => handleDelete(project.id, e)}
                                disabled={!menuFlags.canDelete}
                              >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: getMvsDialogPaperSx(theme) }}
      >
        <DialogTitle sx={getMvsDialogTitleRowSx(theme)}>
          {selectedProject ? t('projectManagement.dialog.editTitle') : t('projectManagement.dialog.createTitle')}
        </DialogTitle>
        <DialogContent
          sx={{
            px: 2.5,
            // MUI는 DialogTitle 다음에 pt를 0으로 덮어써서 아웃라인 라벨이 제목에 붙음
            pt: '28px !important',
            pb: 1.5,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2.5,
              mt: 0.5,
            }}
          >
            <Box sx={{ gridColumn: '1 / -1', pt: 0.5 }}>
              <TextField
                fullWidth
                size="small"
                label={`${t('projectManagement.fields.name')} *`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                {...mvsOutlinedLabelProps}
                sx={mvsSearchFieldSx}
              />
            </Box>
            <FormControl fullWidth size="small" sx={mvsSearchFieldSx}>
              <InputLabel shrink>{`${t('projectManagement.fields.manager')} *`}</InputLabel>
              <Select
                value={formData.manager_id}
                displayEmpty
                label={`${t('projectManagement.fields.manager')} *`}
                onChange={(e) => setFormData({ ...formData, manager_id: String(e.target.value) })}
              >
                <MenuItem value="">{t('projectManagement.fields.selectManager')}</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>
                    {u.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={mvsSearchFieldSx}>
              <InputLabel shrink>{t('projectManagement.fields.priority')}</InputLabel>
              <Select
                value={formData.priority}
                label={t('projectManagement.fields.priority')}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                {['urgent', 'high', 'medium', 'low'].map((p) => (
                  <MenuItem key={p} value={p}>
                    {priorityLabel(p)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ gridColumn: '1 / -1', pt: 0.25 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label={t('projectManagement.fields.description')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                {...mvsOutlinedLabelProps}
                sx={mvsSearchFieldSx}
              />
            </Box>
            <TextField
              fullWidth
              size="small"
              type="date"
              label={`${t('projectManagement.fields.startDate')} *`}
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              {...mvsOutlinedLabelProps}
              sx={mvsSearchFieldSx}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t('projectManagement.fields.endDate')}
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              {...mvsOutlinedLabelProps}
              sx={mvsSearchFieldSx}
            />
            <FormControl fullWidth size="small" sx={mvsSearchFieldSx}>
              <InputLabel shrink>{t('projectManagement.fields.status')}</InputLabel>
              <Select
                value={normalizeStatus(formData.status)}
                label={t('projectManagement.fields.status')}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {STATUS_KEYS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {statusLabel(s)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('projectManagement.fields.budget')}
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
              inputProps={{ min: 0 }}
              {...mvsOutlinedLabelProps}
              sx={mvsSearchFieldSx}
            />
            {!selectedProject && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Autocomplete
                  multiple
                  options={users.filter((u) => String(u.id) !== formData.manager_id)}
                  value={users.filter((u) => formData.inviteUserIds.includes(Number(u.id)))}
                  onChange={(_, selected) =>
                    setFormData({
                      ...formData,
                      inviteUserIds: selected.map((u) => Number(u.id)),
                    })
                  }
                  getOptionLabel={(o) => o.username || String(o.id)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label={t('projectManagement.fields.inviteMembers')}
                      {...mvsOutlinedLabelProps}
                      sx={mvsSearchFieldSx}
                    />
                  )}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={getMvsDialogActionsSx(theme)}>
          <Button onClick={handleCloseDialog} sx={mvsBodyOutlinedBtnSx}>
            {t('projectManagement.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => void handleSave()}
            disabled={saving}
            sx={mvsBodyPrimaryBtnSx}
          >
            {t('projectManagement.actions.save')}
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
    </Box>
  );
};

export default ProjectManagement;
