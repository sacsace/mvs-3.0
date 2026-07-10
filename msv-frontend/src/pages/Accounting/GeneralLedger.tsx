import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
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
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandLess,
  PostAdd as PostAddIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import VoucherLinesEditor, { VoucherLineRow } from '../../components/Accounting/VoucherLinesEditor';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import { useGlAccounts } from '../../hooks/useGlAccounts';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import {
  mvsBodyCardSx,
  mvsBodyListTableSx,
  mvsFilterFieldHeightSx,
  mvsKpiCardSx,
  mvsPageRootSx,
  mvsSearchFieldSx,
  mvsTableHeadHighlightSx,
  mvsTableScrollSx,
} from '../../theme/mvsLayout';
import { accountingService } from '../../services/api';
import { useStore } from '../../store';
import { getGlAccountLabel, getGlAccountName } from '../../utils/glAccountLabel';

type TabKey = 'vouchers' | 'ledger' | 'trial' | 'accounts';

const TAB_INDEX: Record<TabKey, number> = { vouchers: 0, ledger: 1, trial: 2, accounts: 3 };
const INDEX_TAB: TabKey[] = ['vouchers', 'ledger', 'trial', 'accounts'];

const STATUS_COLOR: Record<string, 'default' | 'success' | 'warning'> = {
  draft: 'warning',
  posted: 'success',
  cancelled: 'default',
};

const emptyLines = (): VoucherLineRow[] => [
  { lineNo: 1, accountName: '', debit: 0, credit: 0 },
  { lineNo: 2, accountName: '', debit: 0, credit: 0 },
];

const GeneralLedger: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useStore();
  const postAllowed = user?.role === 'root' || user?.role === 'admin';
  const {
    canSelectCompany,
    companies,
    selectedCompanyId,
    effectiveCompanyId,
    selectedCompanyName,
    companyQuery,
    changeCompany,
  } = useAccountingCompany();
  const { accounts, ledgerAccounts, reload: reloadAccounts } = useGlAccounts(false, effectiveCompanyId);

  const initialTab = TAB_INDEX[(searchParams.get('tab') as TabKey) || 'vouchers'] ?? 0;
  const [tab, setTab] = useState(initialTab);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 전표
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entry, setEntry] = useState({
    voucherDate: new Date().toISOString().slice(0, 10),
    narration: '',
    lines: emptyLines(),
  });

  // 장부
  const [ledgerAccountId, setLedgerAccountId] = useState<number | ''>('');
  const [ledgerFrom, setLedgerFrom] = useState('');
  const [ledgerTo, setLedgerTo] = useState('');
  const [ledgerData, setLedgerData] = useState<any>(null);

  // 시산표
  const [trialFrom, setTrialFrom] = useState('');
  const [trialTo, setTrialTo] = useState('');
  const [trialData, setTrialData] = useState<any>(null);

  // 계정
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    nameEn: '',
    nature: 'expense',
  });

  const kpis = useMemo(() => {
    const posted = vouchers.filter((v) => v.status === 'posted').length;
    const draft = vouchers.filter((v) => v.status === 'draft').length;
    const amount = vouchers.reduce((s, v) => s + Number(v.total_debit || 0), 0);
    return { total: vouchers.length, posted, draft, amount };
  }, [vouchers]);

  const loadVouchers = useCallback(async () => {
    const res = await accountingService.getGlVouchers(companyQuery);
    setVouchers(Array.isArray(res?.data) ? res.data : []);
  }, [companyQuery]);

  const loadVoucherDetail = useCallback(async (id: number) => {
    const res = await accountingService.getGlVoucher(id, effectiveCompanyId);
    setSelectedVoucher(res?.data || null);
  }, [effectiveCompanyId]);

  const loadLedger = useCallback(async (accountId?: number) => {
    const id = accountId ?? ledgerAccountId;
    if (!id) return;
    const res = await accountingService.getAccountLedger({
      accountId: Number(id),
      from: ledgerFrom || undefined,
      to: ledgerTo || undefined,
      company_id: effectiveCompanyId,
    });
    setLedgerData(res?.data || null);
  }, [ledgerAccountId, ledgerFrom, ledgerTo, effectiveCompanyId]);

  const loadTrial = useCallback(async () => {
    const res = await accountingService.getTrialBalance({
      from: trialFrom || undefined,
      to: trialTo || undefined,
      company_id: effectiveCompanyId,
    });
    setTrialData(res?.data || null);
  }, [trialFrom, trialTo, effectiveCompanyId]);

  useEffect(() => {
    setSelectedVoucher(null);
    setLedgerData(null);
    setTrialData(null);
    setLedgerAccountId('');
    loadVouchers();
    reloadAccounts();
  }, [effectiveCompanyId, loadVouchers, reloadAccounts]);

  useEffect(() => {
    if (ledgerAccounts.length && !ledgerAccountId) {
      setLedgerAccountId(ledgerAccounts[0].id);
    }
  }, [ledgerAccounts, ledgerAccountId]);

  useEffect(() => {
    if (tab === 1 && ledgerAccountId) loadLedger();
    if (tab === 2) loadTrial();
  }, [tab, ledgerAccountId, loadLedger, loadTrial]);

  const handleTab = (_: React.SyntheticEvent, idx: number) => {
    setTab(idx);
    const next = new URLSearchParams(searchParams);
    next.set('tab', INDEX_TAB[idx]);
    if (effectiveCompanyId) next.set('company_id', String(effectiveCompanyId));
    setSearchParams(next, { replace: true });
  };

  const statusLabel = (status: string) => t(`generalLedger.status.${status}`, status);

  const resolveAccountName = (accountId: number, fallback?: string) => {
    const found = accounts.find((a) => a.id === accountId);
    if (found) return getGlAccountName(found, i18n.language);
    return fallback || '-';
  };

  const submitVoucher = async (postNow: boolean) => {
    try {
      await accountingService.createGlVoucher(
        {
          voucherDate: entry.voucherDate,
          voucherType: 'journal',
          narration: entry.narration,
          lines: entry.lines,
          postImmediately: postNow,
        },
        effectiveCompanyId
      );
      setSuccess(postNow ? t('generalLedger.success.posted') : t('generalLedger.success.saved'));
      setEntry({ voucherDate: new Date().toISOString().slice(0, 10), narration: '', lines: emptyLines() });
      setEntryOpen(false);
      await loadVouchers();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('generalLedger.errors.saveVoucher'));
    }
  };

  const postSelected = async () => {
    if (!selectedVoucher) return;
    try {
      await accountingService.postGlVoucher(selectedVoucher.id, effectiveCompanyId);
      setSuccess(t('generalLedger.success.posted'));
      await loadVoucherDetail(selectedVoucher.id);
      await loadVouchers();
      reloadAccounts();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('generalLedger.errors.postVoucher'));
    }
  };

  const addAccount = async () => {
    try {
      await accountingService.createGlAccount(
        {
          code: accountForm.code,
          name: accountForm.name,
          nameEn: accountForm.nameEn || undefined,
          nature: accountForm.nature,
          accountType: 'ledger',
        },
        effectiveCompanyId
      );
      setSuccess(t('generalLedger.success.accountCreated'));
      setAccountForm({ code: '', name: '', nameEn: '', nature: 'expense' });
      reloadAccounts();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('generalLedger.errors.createAccount'));
    }
  };

  const openLedgerForAccount = (accountId: number) => {
    setLedgerAccountId(accountId);
    setTab(1);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'ledger');
    if (effectiveCompanyId) next.set('company_id', String(effectiveCompanyId));
    setSearchParams(next, { replace: true });
    loadLedger(accountId);
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title={t('generalLedger.title')}
        description={t('generalLedger.description')}
        actions={
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              navigate(
                effectiveCompanyId
                  ? `/accounting/auto-voucher?company_id=${effectiveCompanyId}`
                  : '/accounting/auto-voucher'
              )
            }
          >
            {t('generalLedger.voucherEntryLink')}
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

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {(
          [
            { key: 'total', value: kpis.total },
            { key: 'draft', value: kpis.draft },
            { key: 'posted', value: kpis.posted },
            { key: 'totalDebit', value: kpis.amount.toLocaleString() },
          ] as const
        ).map((kpi) => (
          <Grid size={{ xs: 6, md: 3 }} key={kpi.key}>
            <Card elevation={0} sx={mvsKpiCardSx}>
              <CardContent sx={{ py: '12px !important' }}>
                <Typography variant="caption" color="text.secondary">
                  {t(`generalLedger.kpi.${kpi.key}`)}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card elevation={0} sx={{ ...mvsBodyCardSx, mb: 2 }}>
        <Tabs value={tab} onChange={handleTab} variant="scrollable" scrollButtons="auto" sx={{ px: 1, minHeight: 48, '& .MuiTab-root': { py: 1.5 } }}>
          <Tab label={t('generalLedger.tabs.vouchers')} />
          <Tab label={t('generalLedger.tabs.ledger')} />
          <Tab label={t('generalLedger.tabs.trial')} />
          <Tab label={t('generalLedger.tabs.accounts')} />
        </Tabs>
      </Card>

      {tab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
          <Card elevation={0} sx={mvsBodyCardSx}>
            <CardContent>
              <Button
                fullWidth
                variant={entryOpen ? 'outlined' : 'contained'}
                startIcon={entryOpen ? <ExpandLess /> : <AddIcon />}
                onClick={() => setEntryOpen((v) => !v)}
                sx={{ mb: entryOpen ? 2 : 0 }}
              >
                {entryOpen ? t('generalLedger.vouchers.closeEntry') : t('generalLedger.vouchers.quickEntry')}
              </Button>
              <Collapse in={entryOpen}>
                <Box sx={{ display: 'grid', gap: 1.5, mb: 2 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 1 }}>
                    <TextField
                      label={t('generalLedger.vouchers.date')}
                      type="date"
                      size="small"
                      {...{ InputLabelProps: { shrink: true } }}
                      value={entry.voucherDate}
                      onChange={(e) => setEntry((p) => ({ ...p, voucherDate: e.target.value }))}
                      sx={mvsSearchFieldSx}
                    />
                    <TextField
                      label={t('generalLedger.vouchers.narration')}
                      size="small"
                      value={entry.narration}
                      onChange={(e) => setEntry((p) => ({ ...p, narration: e.target.value }))}
                      sx={mvsSearchFieldSx}
                    />
                  </Box>
                  <VoucherLinesEditor
                    lines={entry.lines}
                    accounts={accounts}
                    onChange={(lines) => setEntry((p) => ({ ...p, lines }))}
                    compact
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" onClick={() => submitVoucher(false)}>
                      {t('generalLedger.vouchers.saveDraft')}
                    </Button>
                    <Button variant="contained" startIcon={<PostAddIcon />} onClick={() => submitVoucher(true)}>
                      {t('generalLedger.vouchers.saveAndPost')}
                    </Button>
                  </Box>
                </Box>
              </Collapse>

              {!entryOpen && (
                <TableContainer sx={{ ...mvsTableScrollSx, mt: 2 }}>
                  <Table size="small" sx={{ ...mvsBodyListTableSx, minWidth: 360 }}>
                    <TableHead sx={mvsTableHeadHighlightSx}>
                      <TableRow>
                        <TableCell>{t('generalLedger.vouchers.columns.no')}</TableCell>
                        <TableCell>{t('generalLedger.vouchers.columns.date')}</TableCell>
                        <TableCell>{t('generalLedger.vouchers.columns.status')}</TableCell>
                        <TableCell align="right">{t('generalLedger.vouchers.columns.debit')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {vouchers.map((v) => (
                        <TableRow
                          key={v.id}
                          hover
                          selected={selectedVoucher?.id === v.id}
                          onClick={() => loadVoucherDetail(v.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{v.voucher_no}</TableCell>
                          <TableCell>{v.voucher_date}</TableCell>
                          <TableCell>
                            <Chip size="small" label={statusLabel(v.status)} color={STATUS_COLOR[v.status] || 'default'} />
                          </TableCell>
                          <TableCell align="right">{Number(v.total_debit || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {vouchers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            {t('generalLedger.vouchers.empty')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card elevation={0} sx={mvsBodyCardSx}>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                {t('generalLedger.vouchers.detailTitle')}
              </Typography>
              {!selectedVoucher ? (
                <Typography color="text.secondary">{t('generalLedger.vouchers.selectHint')}</Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={selectedVoucher.voucher_no} size="small" />
                    <Chip label={selectedVoucher.voucher_date} size="small" variant="outlined" />
                    <Chip label={statusLabel(selectedVoucher.status)} size="small" color={STATUS_COLOR[selectedVoucher.status]} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {selectedVoucher.narration || '-'}
                  </Typography>
                  <VoucherLinesEditor
                    readOnly
                    lines={(selectedVoucher.lines || []).map((l: any) => ({
                      lineNo: l.line_no,
                      accountName: l.account_name,
                      debit: Number(l.debit),
                      credit: Number(l.credit),
                    }))}
                    accounts={accounts}
                    onChange={() => undefined}
                  />
                  {postAllowed && selectedVoucher.status === 'draft' && (
                    <Button variant="contained" onClick={postSelected}>
                      {t('generalLedger.vouchers.postToLedger')}
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {tab === 1 && (
        <Card elevation={0} sx={mvsBodyCardSx}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2, alignItems: 'flex-end' }}>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 240 }, flex: { sm: '1 1 240px' }, ...mvsSearchFieldSx, ...mvsFilterFieldHeightSx }}>
                <InputLabel>{t('generalLedger.ledger.account')}</InputLabel>
                <Select
                  label={t('generalLedger.ledger.account')}
                  value={ledgerAccountId}
                  onChange={(e) => setLedgerAccountId(Number(e.target.value))}
                >
                  {ledgerAccounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {getGlAccountLabel(a, i18n.language)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField size="small" type="date" label={t('generalLedger.ledger.from')} InputLabelProps={{ shrink: true }} value={ledgerFrom} onChange={(e) => setLedgerFrom(e.target.value)} sx={mvsSearchFieldSx} />
              <TextField size="small" type="date" label={t('generalLedger.ledger.to')} InputLabelProps={{ shrink: true }} value={ledgerTo} onChange={(e) => setLedgerTo(e.target.value)} sx={mvsSearchFieldSx} />
              <Button variant="contained" onClick={() => loadLedger()}>
                {t('generalLedger.ledger.search')}
              </Button>
            </Box>
            {ledgerData?.account && (
              <>
                <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                  {ledgerData.account.code}{' '}
                  {getGlAccountName(ledgerData.account, i18n.language)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('generalLedger.ledger.balance')}{' '}
                  {Number(ledgerData.currentBalance || 0).toLocaleString()}
                </Typography>
                <TableContainer sx={mvsTableScrollSx}>
                  <Table size="small" sx={{ ...mvsBodyListTableSx, minWidth: 640 }}>
                    <TableHead sx={mvsTableHeadHighlightSx}>
                      <TableRow>
                        <TableCell>{t('generalLedger.ledger.columns.date')}</TableCell>
                        <TableCell>{t('generalLedger.ledger.columns.voucher')}</TableCell>
                        <TableCell>{t('generalLedger.ledger.columns.narration')}</TableCell>
                        <TableCell align="right">{t('generalLedger.ledger.columns.debit')}</TableCell>
                        <TableCell align="right">{t('generalLedger.ledger.columns.credit')}</TableCell>
                        <TableCell align="right">{t('generalLedger.ledger.columns.balance')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(ledgerData.entries || []).map((e: any) => (
                        <TableRow key={e.id}>
                          <TableCell>{e.voucherDate}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{e.voucherNo}</TableCell>
                          <TableCell>{e.narration || '-'}</TableCell>
                          <TableCell align="right">{Number(e.debit || 0).toLocaleString()}</TableCell>
                          <TableCell align="right">{Number(e.credit || 0).toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {Number(e.runningBalance || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card elevation={0} sx={mvsBodyCardSx}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <TextField size="small" type="date" label={t('generalLedger.ledger.from')} InputLabelProps={{ shrink: true }} value={trialFrom} onChange={(e) => setTrialFrom(e.target.value)} sx={mvsSearchFieldSx} />
              <TextField size="small" type="date" label={t('generalLedger.ledger.to')} InputLabelProps={{ shrink: true }} value={trialTo} onChange={(e) => setTrialTo(e.target.value)} sx={mvsSearchFieldSx} />
              <Button variant="contained" onClick={loadTrial}>
                {t('generalLedger.ledger.search')}
              </Button>
            </Box>
            <TableContainer sx={mvsTableScrollSx}>
              <Table size="small" sx={{ ...mvsBodyListTableSx, minWidth: 520 }}>
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    <TableCell>{t('generalLedger.trial.columns.code')}</TableCell>
                    <TableCell>{t('generalLedger.trial.columns.account')}</TableCell>
                    <TableCell align="right">{t('generalLedger.trial.columns.debit')}</TableCell>
                    <TableCell align="right">{t('generalLedger.trial.columns.credit')}</TableCell>
                    <TableCell align="right">{t('generalLedger.trial.columns.balance')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(trialData?.rows || []).map((r: any) => (
                    <TableRow
                      key={r.accountId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => openLedgerForAccount(r.accountId)}
                    >
                      <TableCell>{r.code}</TableCell>
                      <TableCell>{resolveAccountName(r.accountId, r.name)}</TableCell>
                      <TableCell align="right">{Number(r.debit || 0).toLocaleString()}</TableCell>
                      <TableCell align="right">{Number(r.credit || 0).toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {Number(r.balance || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {trialData && (
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell colSpan={2} align="right" sx={{ fontWeight: 700 }}>
                        {t('generalLedger.trial.total')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {Number(trialData.totalDebit || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {Number(trialData.totalCredit || 0).toLocaleString()}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {tab === 3 && (
        <Card elevation={0} sx={mvsBodyCardSx}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: { xs: 2, lg: 3 },
                alignItems: 'stretch',
              }}
            >
              <Box
                sx={{
                  flex: { xs: '1 1 auto', lg: '0 0 300px' },
                  width: { xs: '100%', lg: 'auto' },
                  maxWidth: { lg: 360 },
                }}
              >
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  {t('generalLedger.accounts.addTitle')}
                </Typography>
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <TextField fullWidth size="small" label={t('generalLedger.accounts.code')} value={accountForm.code} onChange={(e) => setAccountForm((p) => ({ ...p, code: e.target.value }))} sx={mvsSearchFieldSx} />
                  <TextField fullWidth size="small" label={t('generalLedger.accounts.name')} value={accountForm.name} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} sx={mvsSearchFieldSx} />
                  <TextField fullWidth size="small" label={t('generalLedger.accounts.nameEn')} value={accountForm.nameEn} onChange={(e) => setAccountForm((p) => ({ ...p, nameEn: e.target.value }))} sx={mvsSearchFieldSx} />
                  <FormControl fullWidth size="small" sx={mvsSearchFieldSx}>
                    <InputLabel>{t('generalLedger.accounts.nature')}</InputLabel>
                    <Select label={t('generalLedger.accounts.nature')} value={accountForm.nature} onChange={(e) => setAccountForm((p) => ({ ...p, nature: e.target.value }))}>
                      {(['asset', 'liability', 'equity', 'income', 'expense'] as const).map((k) => (
                        <MenuItem key={k} value={k}>
                          {t(`generalLedger.nature.${k}`)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="contained" fullWidth onClick={addAccount}>
                    {t('generalLedger.accounts.register')}
                  </Button>
                </Box>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  {t('generalLedger.accounts.listTitle')} (
                  {t('generalLedger.accounts.ledgerCount', {
                    count: accounts.filter((a) => a.account_type === 'ledger').length,
                  })}
                  )
                </Typography>
                <TableContainer
                  sx={{
                    ...mvsTableScrollSx,
                    maxHeight: { xs: '45vh', md: 'min(58vh, 560px)' },
                  }}
                >
                  <Table size="small" stickyHeader sx={{ ...mvsBodyListTableSx, minWidth: 320 }}>
                    <TableHead sx={mvsTableHeadHighlightSx}>
                      <TableRow>
                        <TableCell>{t('generalLedger.trial.columns.code')}</TableCell>
                        <TableCell>{t('generalLedger.trial.columns.account')}</TableCell>
                        <TableCell align="right">{t('generalLedger.trial.columns.balance')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {accounts
                        .filter((a) => a.account_type === 'ledger')
                        .map((a) => (
                          <TableRow key={a.id} hover sx={{ cursor: 'pointer' }} onClick={() => openLedgerForAccount(a.id)}>
                            <TableCell>{a.code}</TableCell>
                            <TableCell>{getGlAccountName(a, i18n.language)}</TableCell>
                            <TableCell align="right">{Number(a.current_balance || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')}>
        <Alert severity="error">{error}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success">{success}</Alert>
      </Snackbar>
    </Box>
  );
};

export default GeneralLedger;
