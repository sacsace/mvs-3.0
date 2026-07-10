import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  Snackbar,
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
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useStore } from '../../store';
import { getGlAccountName } from '../../utils/glAccountLabel';
import {
  mvsBodyCardSx,
  mvsBodyListTableSx,
  mvsBodyPrimaryBtnSx,
  mvsPageRootSx,
  mvsSearchFieldSx,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';
import { accountingService } from '../../services/api';

type GlAccount = {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  account_type: 'group' | 'ledger';
  nature: string;
  current_balance: number;
  is_system?: boolean;
};

const emptyForm = () => ({
  code: '',
  name: '',
  nameEn: '',
  nature: 'expense',
});

const ChartOfAccounts: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useStore();
  const canManage = user?.role === 'root' || user?.role === 'admin';
  const {
    canSelectCompany,
    companies,
    selectedCompanyId,
    effectiveCompanyId,
    selectedCompanyName,
    changeCompany,
  } = useAccountingCompany();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [rows, setRows] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GlAccount | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const natureOptions = ['asset', 'liability', 'equity', 'income', 'expense'] as const;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      await accountingService.seedGlAccounts(effectiveCompanyId).catch(() => undefined);
      const response = await accountingService.getGlAccounts({
        ledgerOnly: true,
        company_id: effectiveCompanyId,
      });
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('chartOfAccounts.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        String(row.name_en || '')
          .toLowerCase()
          .includes(q)
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row: GlAccount) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      nameEn: row.name_en || '',
      nature: row.nature || 'expense',
    });
    setDialogOpen(true);
  };

  const handleSeed = async () => {
    try {
      const response = await accountingService.seedGlAccounts(effectiveCompanyId);
      setSuccess(response?.message || t('chartOfAccounts.success.seeded'));
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('chartOfAccounts.errors.seed'));
    }
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError(t('chartOfAccounts.errors.codeNameRequired'));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || undefined,
        nature: form.nature,
        accountType: 'ledger',
      };
      if (editing) {
        await accountingService.updateGlAccount(editing.id, payload, effectiveCompanyId);
        setSuccess(t('chartOfAccounts.success.updated'));
      } else {
        await accountingService.createGlAccount(payload, effectiveCompanyId);
        setSuccess(t('chartOfAccounts.success.created'));
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('chartOfAccounts.errors.save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: GlAccount) => {
    showConfirm(
      t('chartOfAccounts.deleteConfirm'),
      () => {
        void (async () => {
          try {
            await accountingService.deleteGlAccount(row.id, effectiveCompanyId);
            setSuccess(t('chartOfAccounts.success.deleted'));
            await load();
          } catch (err: any) {
            setError(err?.response?.data?.message || t('chartOfAccounts.errors.delete'));
          }
        })();
      },
      {
        title: t('common.delete'),
        confirmColor: 'error',
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
      }
    );
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title={t('chartOfAccounts.title')}
        description={t('chartOfAccounts.description')}
        actions={
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              navigate(
                effectiveCompanyId
                  ? `/accounting/books?tab=accounts&company_id=${effectiveCompanyId}`
                  : '/accounting/books?tab=accounts'
              )
            }
          >
            {t('chartOfAccounts.booksLink')}
          </Button>
        }
      />

      <AccountingCompanyBar
        canSelectCompany={canSelectCompany}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        selectedCompanyName={selectedCompanyName}
        onChangeCompany={changeCompany}
      />

      <Card elevation={0} sx={mvsBodyCardSx}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder={t('chartOfAccounts.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ ...mvsSearchFieldSx, minWidth: 240, flex: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            {canManage && (
              <>
                <Button variant="outlined" onClick={handleSeed}>
                  {t('chartOfAccounts.seed')}
                </Button>
                <Button variant="contained" startIcon={<AddIcon />} sx={mvsBodyPrimaryBtnSx} onClick={openCreate}>
                  {t('chartOfAccounts.add')}
                </Button>
              </>
            )}
          </Box>

          <TableContainer sx={{ ...mvsTableScrollSx, maxHeight: { xs: '50vh', md: 'min(65vh, 640px)' } }}>
            <Table size="small" sx={{ ...mvsBodyListTableSx, minWidth: 480 }}>
              <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  <TableCell width={120}>{t('chartOfAccounts.columns.code')}</TableCell>
                  <TableCell>{t('chartOfAccounts.columns.name')}</TableCell>
                  {canManage && <TableCell width={120} align="center">{t('chartOfAccounts.columns.actions')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.code}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2">{getGlAccountName(row, i18n.language)}</Typography>
                        {row.is_system && (
                          <Chip size="small" label={t('chartOfAccounts.system')} variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    {canManage && (
                      <TableCell align="center">
                        <Tooltip title={t('common.edit')}>
                          <span>
                            <IconButton size="small" onClick={() => openEdit(row)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={Boolean(row.is_system)}
                              onClick={() => handleDelete(row)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!loading && filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 3 : 2} align="center">
                      <Typography color="text.secondary" py={2}>
                        {loading ? t('chartOfAccounts.loading') : t('chartOfAccounts.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing ? t('chartOfAccounts.dialog.editTitle') : t('chartOfAccounts.dialog.createTitle')}
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: 1 }}>
          <TextField
            label={t('chartOfAccounts.dialog.code')}
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            disabled={Boolean(editing?.is_system)}
          />
          <TextField
            label={t('chartOfAccounts.dialog.name')}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <TextField
            label={t('chartOfAccounts.dialog.nameEn')}
            value={form.nameEn}
            onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
          />
          <FormControl fullWidth>
            <InputLabel>{t('chartOfAccounts.dialog.nature')}</InputLabel>
            <Select
              label={t('chartOfAccounts.dialog.nature')}
              value={form.nature}
              onChange={(e) => setForm((p) => ({ ...p, nature: e.target.value }))}
            >
              {natureOptions.map((n) => (
                <MenuItem key={n} value={n}>
                  {t(`generalLedger.nature.${n}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {t('common.save')}
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

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success">{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ChartOfAccounts;
