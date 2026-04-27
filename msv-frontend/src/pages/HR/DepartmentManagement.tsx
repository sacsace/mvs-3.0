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
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { departmentService } from '../../services/api';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

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

  return (
    <Box
      sx={
        embedded
          ? {}
          : {
              p: 3,
              backgroundColor: 'workArea.main',
              borderRadius: 2,
              minHeight: '100%'
            }
      }
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('departmentManagement.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!canCreate}>
          {t('departmentManagement.add')}
        </Button>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table
              size="small"
              sx={{
                '& .MuiTableBody-root .MuiTableRow:last-of-type .MuiTableCell-root': {
                  borderBottom: 'none'
                }
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>{t('departmentManagement.name')}</TableCell>
                  <TableCell width={100} align="right">
                    {t('departmentManagement.sortOrder')}
                  </TableCell>
                  <TableCell width={100}>{t('departmentManagement.active')}</TableCell>
                  <TableCell width={120} align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        …
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        {t('departmentManagement.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.name}</TableCell>
                      <TableCell align="right">{r.sort_order}</TableCell>
                      <TableCell>
                        {r.is_active ? t('departmentManagement.active') : t('departmentManagement.inactive')}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => openEdit(r)}
                          aria-label="edit"
                          disabled={!canEdit}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => void handleDelete(r)}
                          aria-label="delete"
                          disabled={!canDelete}
                        >
                          <DeleteIcon fontSize="small" />
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId != null ? t('departmentManagement.edit') : t('departmentManagement.add')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('departmentManagement.name')}
            fullWidth
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            type="number"
            label={t('departmentManagement.sortOrder')}
            fullWidth
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
            sx={{ mb: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
            }
            label={t('departmentManagement.active')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('departmentManagement.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={
              (editingId != null && !canEdit) || (editingId == null && !canCreate)
            }
          >
            {t('departmentManagement.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>
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
