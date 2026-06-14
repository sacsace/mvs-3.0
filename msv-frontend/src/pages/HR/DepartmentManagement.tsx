import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { departmentService } from '../../services/api';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { mvsTableHeadHighlightSx } from '../../theme/mvsLayout';

type DeptRow = {
  id: number;
  name: string;
  code?: string | null;
  sort_order: number;
  is_active: boolean;
};

type DeptFormState = {
  name: string;
  sort_order: number;
  is_active: boolean;
};

/** embedded: 사용자 관리 페이지 탭 안에 넣을 때 true (외곽 패딩·배경 중복 방지) */
export const DepartmentManagementPanel: React.FC<{
  embedded?: boolean;
  /** 미전달 시 전부 true (단독 부서 관리 페이지) */
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}> = ({
  embedded = false,
  canCreate = true,
  canEdit = true,
  canDelete = true
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [rows, setRows] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeptFormState>({
    name: '',
    sort_order: 0,
    is_active: true
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await departmentService.list(true);
      if (res.success && Array.isArray(res.data)) {
        setRows(res.data as DeptRow[]);
      } else {
        setError(t('departmentManagement.loadFailed'));
        setRows([]);
      }
    } catch {
      setError(t('departmentManagement.loadFailed'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (!canCreate) return;
    setEditingId(null);
    setForm({ name: '', sort_order: 0, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (row: DeptRow) => {
    if (!canEdit) return;
    setEditingId(row.id);
    setForm({
      name: row.name,
      sort_order: row.sort_order ?? 0,
      is_active: row.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setError(t('departmentManagement.nameRequired'));
      return;
    }
    if (editingId != null && !canEdit) return;
    if (editingId == null && !canCreate) return;
    setError('');
    try {
      if (editingId != null) {
        const res = await departmentService.update(editingId, {
          name,
          sort_order: form.sort_order,
          is_active: form.is_active
        });
        if (!res.success) throw new Error();
      } else {
        const res = await departmentService.create({
          name,
          sort_order: form.sort_order,
          is_active: form.is_active
        });
        if (!res.success) throw new Error();
      }
      setSuccess(t('departmentManagement.saved'));
      setDialogOpen(false);
      await load();
    } catch {
      setError(t('departmentManagement.saveFailed'));
    }
  };

  const handleDelete = (row: DeptRow) => {
    if (!canDelete) return;
    showConfirm(
      t('departmentManagement.deleteConfirm'),
      () => {
        void (async () => {
          try {
            const res = await departmentService.delete(row.id);
            if (!res.success) throw new Error();
            setSuccess(t('departmentManagement.deleted'));
            await load();
          } catch (e: any) {
            const msg = e?.response?.data?.message;
            setError(msg || t('departmentManagement.deleteFailed'));
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

  const outlinedFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.07),
      transition: theme.transitions.create(['background-color', 'box-shadow'], { duration: 150 }),
      '&:hover': { bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.16 : 0.1) },
      '&.Mui-focused': {
        bgcolor: theme.palette.background.paper,
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
      },
      '& fieldset': { borderColor: alpha(theme.palette.divider, 0.9) },
    },
  };

  return (
    <Box
      sx={
        embedded
          ? { width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }
          : {
              p: 0,
              backgroundColor: 'transparent',
              borderRadius: 0,
              minHeight: '100%',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }
      }
    >
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
          component={embedded ? 'h2' : 'h1'}
          sx={{
            fontSize: embedded ? '1.125rem' : '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'text.primary',
            lineHeight: 1.3,
          }}
        >
          {t('departmentManagement.title')}
        </Typography>
        <Button
          variant="contained"
          disableElevation
          startIcon={<AddIcon />}
          onClick={openCreate}
          disabled={!canCreate}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 2.25,
            flexShrink: 0,
          }}
        >
          {t('departmentManagement.add')}
        </Button>
      </Box>

      <Card
        elevation={0}
        sx={{
          borderRadius: 0,
          border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.35 : 0.1)}`,
          boxShadow: '0 4px 22px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer sx={{ overflow: 'auto', pr: { xs: 1, sm: 1.5 } }}>
            <Table
              size="medium"
              sx={{
                '& .MuiTableBody-root .MuiTableRow:last-of-type .MuiTableCell-root': {
                  borderBottom: 'none',
                },
                '& .MuiTableCell-root': {
                  py: 1.75,
                  px: 2,
                  fontSize: '0.875rem',
                  borderColor: alpha(theme.palette.divider, 0.75),
                },
              }}
            >
              <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {t('departmentManagement.name')}
                  </TableCell>
                  <TableCell width={108} align="right" sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {t('departmentManagement.sortOrder')}
                  </TableCell>
                  <TableCell width={112} sx={{ fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {t('departmentManagement.active')}
                  </TableCell>
                  <TableCell width={128} align="right" sx={{ pr: { xs: 1, sm: 2 } }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3, px: 1 }}>
                        …
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3, px: 1 }}>
                        {t('departmentManagement.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
                      <TableCell sx={{ fontWeight: 600, letterSpacing: '-0.01em', color: 'text.primary' }}>{r.name}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                        {r.sort_order}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {r.is_active ? t('departmentManagement.active') : t('departmentManagement.inactive')}
                      </TableCell>
                      <TableCell align="right" sx={{ pr: { xs: 0.5, sm: 1 } }}>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(r)}
                          aria-label="edit"
                          disabled={!canEdit}
                          sx={{
                            borderRadius: '10px',
                            mr: 0.5,
                            color: 'text.secondary',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' },
                          }}
                        >
                          <EditIcon sx={{ fontSize: '1.125rem' }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => void handleDelete(r)}
                          aria-label="delete"
                          disabled={!canDelete}
                          sx={{
                            borderRadius: '10px',
                            color: 'text.secondary',
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08), color: 'error.main' },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: '1.125rem' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ pt: 2.5, px: 3, pb: 1, fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {editingId != null ? t('departmentManagement.edit') : t('departmentManagement.add')}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label={t('departmentManagement.name')}
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ mb: 2.5, mt: 0.5, ...outlinedFieldSx }}
          />
          <TextField
            margin="dense"
            type="number"
            label={t('departmentManagement.sortOrder')}
            fullWidth
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
            sx={{ mb: 2, ...outlinedFieldSx }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            }
            label={t('departmentManagement.active')}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem', fontWeight: 500 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600 }}>
            {t('departmentManagement.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => void handleSave()}
            disabled={
              (editingId != null && !canEdit) || (editingId == null && !canCreate)
            }
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
          >
            {t('departmentManagement.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '14px' }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ borderRadius: '14px' }}>
          {success}
        </Alert>
      </Snackbar>

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

const DepartmentManagement: React.FC = () => <DepartmentManagementPanel />;

export default DepartmentManagement;
