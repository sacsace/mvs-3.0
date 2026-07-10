import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import { accountingService } from '../../services/api';
import { getBilingualName, getTdsDescription } from '../../utils/accountingMasterLabel';
import {
  mvsBodyCardSx,
  mvsBodyListTableSx,
  mvsBodyListZoneSx,
  mvsBodyPrimaryBtnSx,
  mvsBodyToolbarSx,
  mvsPageRootSx,
  mvsSearchFieldSx,
  mvsTableBodyRowSx,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';

type TabKey = 'voucherTypes' | 'transactionItems' | 'gstCodes' | 'tdsCodes' | 'bankAccounts';

const TAB_KEYS: TabKey[] = ['voucherTypes', 'transactionItems', 'gstCodes', 'tdsCodes', 'bankAccounts'];

const cellEllipsisSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 0,
} as const;

const tableSx = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
  bgcolor: 'transparent',
  '& .MuiTableCell-root': {
    borderLeft: 'none',
    borderRight: 'none',
    borderTop: 'none',
  },
} as const;

const AccountingMasters: React.FC = () => {
  const { t, i18n } = useTranslation();
  const {
    canSelectCompany,
    companies,
    selectedCompanyId,
    effectiveCompanyId,
    selectedCompanyName,
    companyQuery,
    changeCompany,
  } = useAccountingCompany();

  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    if (!effectiveCompanyId) return;
    setLoading(true);
    setError('');
    try {
      await accountingService.seedAccountingMasters(effectiveCompanyId);
      let res;
      switch (tab) {
        case 0:
          res = await accountingService.getVoucherTypes(effectiveCompanyId);
          break;
        case 1:
          res = await accountingService.getTransactionItems({ ...companyQuery });
          break;
        case 2:
          res = await accountingService.getGstCodes({ ...companyQuery });
          break;
        case 3:
          res = await accountingService.getTdsCodes(effectiveCompanyId);
          break;
        case 4:
          res = await accountingService.getBankAccounts(effectiveCompanyId);
          break;
        default:
          res = { data: [] };
      }
      setRows(res?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('accountingMasters.errors.load'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, effectiveCompanyId, companyQuery, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    try {
      switch (tab) {
        case 0:
          await accountingService.upsertVoucherType(form, effectiveCompanyId);
          break;
        case 1:
          await accountingService.upsertTransactionItem(form, effectiveCompanyId);
          break;
        case 2:
          await accountingService.upsertGstCode(form, effectiveCompanyId);
          break;
        case 3:
          await accountingService.upsertTdsCode(form, effectiveCompanyId);
          break;
        case 4:
          await accountingService.upsertBankAccount(form, effectiveCompanyId);
          break;
      }
      setSuccess(t('accountingMasters.saved'));
      setDialogOpen(false);
      setForm({});
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('accountingMasters.errors.save'));
    }
  };

  const openEdit = (row: Record<string, any>) => {
    setForm(row);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setForm({});
    setDialogOpen(true);
  };

  const displayNameLabel = i18n.language.startsWith('en')
    ? t('accountingMasters.columns.displayName')
    : t('accountingMasters.nameKo');

  const columns = useMemo(() => {
    switch (tab) {
      case 0:
        return [
          { key: 'code', label: t('accountingMasters.columns.code'), width: '18%' },
          { key: 'name', label: displayNameLabel, width: '34%', field: 'bilingual' as const },
          { key: 'prefix', label: t('accountingMasters.columns.prefix'), width: '18%' },
          { key: 'category', label: t('accountingMasters.columns.category'), width: '30%', field: 'category' as const },
        ];
      case 1:
        return [
          { key: 'code', label: t('accountingMasters.columns.code'), width: '22%' },
          { key: 'name', label: displayNameLabel, width: '38%', field: 'bilingual' as const },
          { key: 'keywords', label: t('accountingMasters.columns.keywords'), width: '40%' },
        ];
      case 2:
        return [
          { key: 'code', label: t('accountingMasters.columns.code'), width: '20%' },
          { key: 'name', label: t('accountingMasters.columns.name'), width: '34%' },
          { key: 'rate', label: t('accountingMasters.columns.rate'), width: '18%', format: (v: any) => `${v}%` },
          { key: 'io_type', label: t('accountingMasters.columns.type'), width: '28%', field: 'ioType' as const },
        ];
      case 3:
        return [
          { key: 'section', label: t('accountingMasters.columns.section'), width: '24%' },
          { key: 'description', label: t('accountingMasters.columns.description'), width: '46%', field: 'tdsDescription' as const },
          { key: 'company_rate', label: t('accountingMasters.columns.rate'), width: '30%', format: (v: any) => `${v}%` },
        ];
      default:
        return [
          { key: 'bank_name', label: t('accountingMasters.columns.bank'), width: '34%' },
          { key: 'account_name', label: t('accountingMasters.columns.account'), width: '38%' },
          { key: 'ifsc', label: t('accountingMasters.columns.ifsc'), width: '28%' },
        ];
    }
  }, [tab, t, displayNameLabel]);

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

  const renderCellValue = (
    row: any,
    col: { key: string; field?: 'bilingual' | 'tdsDescription' | 'category' | 'ioType'; format?: (v: any) => string }
  ) => {
    if (col.field === 'bilingual') return getBilingualName(row, i18n.language);
    if (col.field === 'tdsDescription') return getTdsDescription(row, i18n.language);
    if (col.field === 'category') return t(`voucherEntry.categories.${row.category}`, row.category);
    if (col.field === 'ioType') return t(`accountingMasters.ioTypes.${row.io_type}`, row.io_type);
    const raw = row[col.key];
    if (col.format) return col.format(raw);
    return raw ?? '-';
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader title={t('accountingMasters.title')} description={t('accountingMasters.subtitle')} />

      <AccountingCompanyBar
        canSelectCompany={canSelectCompany}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        selectedCompanyName={selectedCompanyName}
        onChangeCompany={changeCompany}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        {t('accountingMasters.hint')}
      </Alert>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 0 }}>
        <Box sx={mvsBodyToolbarSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
            {t(`accountingMasters.tabs.${TAB_KEYS[tab]}`)}
          </Typography>
          <Button
            variant="contained"
            disableElevation
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            sx={mvsBodyPrimaryBtnSx}
            onClick={openAdd}
          >
            {t('accountingMasters.add')}
          </Button>
        </Box>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            minHeight: 48,
            borderTop: '1px solid #C5CED9',
            '& .MuiTab-root': { py: 1.5, textTransform: 'none', fontWeight: 600 },
          }}
        >
          {TAB_KEYS.map((key) => (
            <Tab key={key} label={t(`accountingMasters.tabs.${key}`)} />
          ))}
        </Tabs>
      </Card>

      <Box sx={mvsBodyListZoneSx}>
        {loading ? (
          <Box sx={listStateBoxSx}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              {t('accountingMasters.empty.loading')}
            </Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={listStateBoxSx}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: 'text.primary' }}>
              {t('accountingMasters.empty.noItems')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              {t('accountingMasters.empty.noItemsHint')}
            </Typography>
            <Button variant="contained" disableElevation startIcon={<AddIcon fontSize="small" />} sx={mvsBodyPrimaryBtnSx} onClick={openAdd}>
              {t('accountingMasters.add')}
            </Button>
          </Box>
        ) : (
          <TableContainer sx={{ ...mvsBodyListTableSx, ...mvsTableScrollSx }}>
            <Table size="small" sx={tableSx}>
              <TableHead sx={mvsTableHeadHighlightSx}>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col.key} width={col.width}>
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody sx={mvsTableBodyRowSx}>
                {rows.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => openEdit(row)}>
                    {columns.map((col) => (
                      <TableCell key={col.key} sx={cellEllipsisSx}>
                        {renderCellValue(row, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          {t('accountingMasters.partnersNote')}
        </Typography>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? t('accountingMasters.edit') : t('accountingMasters.add')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {tab === 0 && (
            <>
              <TextField size="small" label={t('accountingMasters.columns.code')} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.nameKo')} value={form.name_ko || ''} onChange={(e) => setForm({ ...form, name_ko: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.nameEn')} value={form.name_en || ''} onChange={(e) => setForm({ ...form, name_en: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.columns.prefix')} value={form.prefix || ''} onChange={(e) => setForm({ ...form, prefix: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.columns.category')} value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} sx={mvsSearchFieldSx} />
            </>
          )}
          {tab === 1 && (
            <>
              <TextField size="small" label={t('accountingMasters.columns.code')} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.nameKo')} value={form.name_ko || ''} onChange={(e) => setForm({ ...form, name_ko: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.nameEn')} value={form.name_en || ''} onChange={(e) => setForm({ ...form, name_en: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.columns.keywords')} value={form.keywords || ''} onChange={(e) => setForm({ ...form, keywords: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" type="number" label={t('accountingMasters.columns.debitAccountId')} value={form.debit_account_id || ''} onChange={(e) => setForm({ ...form, debit_account_id: Number(e.target.value) })} sx={mvsSearchFieldSx} />
            </>
          )}
          {tab === 2 && (
            <>
              <TextField size="small" label={t('accountingMasters.columns.code')} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.columns.name')} value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" type="number" label={t('accountingMasters.columns.ratePercent')} value={form.rate || ''} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} sx={mvsSearchFieldSx} />
            </>
          )}
          {tab === 3 && (
            <>
              <TextField size="small" label={t('accountingMasters.columns.section')} value={form.section || ''} onChange={(e) => setForm({ ...form, section: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.descriptionKo')} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.descriptionEn')} value={form.description_en || ''} onChange={(e) => setForm({ ...form, description_en: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" type="number" label={t('accountingMasters.columns.ratePercent')} value={form.company_rate || ''} onChange={(e) => setForm({ ...form, company_rate: Number(e.target.value) })} sx={mvsSearchFieldSx} />
            </>
          )}
          {tab === 4 && (
            <>
              <TextField size="small" label={t('accountingMasters.columns.bank')} value={form.bank_name || ''} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.columns.account')} value={form.account_name || ''} onChange={(e) => setForm({ ...form, account_name: e.target.value })} sx={mvsSearchFieldSx} />
              <TextField size="small" label={t('accountingMasters.columns.ifsc')} value={form.ifsc || ''} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} sx={mvsSearchFieldSx} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" sx={mvsBodyPrimaryBtnSx} onClick={() => void handleSave()}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} message={error} />
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')} message={success} />
    </Box>
  );
};

export default AccountingMasters;
