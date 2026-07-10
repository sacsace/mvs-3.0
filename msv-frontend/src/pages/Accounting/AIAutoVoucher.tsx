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
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import VoucherLinesEditor, { VoucherLineRow } from '../../components/Accounting/VoucherLinesEditor';
import AccountingCompanyBar from '../../components/Accounting/AccountingCompanyBar';
import { useGlAccounts } from '../../hooks/useGlAccounts';
import { useAccountingCompany } from '../../hooks/useAccountingCompany';
import { mvsPageRootSx } from '../../theme/mvsLayout';
import { accountingService } from '../../services/api';
import { useStore } from '../../store';

type AutoVoucherStatus =
  | 'uploaded'
  | 'ocr_completed'
  | 'ai_classified'
  | 'draft'
  | 'review_required'
  | 'approved'
  | 'posted'
  | 'rejected'
  | 'cancelled';

type AutoVoucher = {
  id: number;
  voucher_code: string;
  source_doc_type: string;
  source_file_name: string;
  transaction_date?: string;
  invoice_number?: string;
  counterparty_name?: string;
  narration?: string;
  status: AutoVoucherStatus;
  confidence_score: number;
  total_debit: number;
  total_credit: number;
  duplicate_check?: { hasDuplicate?: boolean; matchedVoucherCodes?: string[] };
  ai_analysis?: { reason?: string; ruleName?: string; transactionType?: string };
  ocr_data?: { ocrAccuracy?: number };
  final_lines?: any[];
  auditLogs?: Array<{ id: number; action: string; created_at?: string; createdAt?: string }>;
};

const mapLines = (raw: any[] | undefined): VoucherLineRow[] =>
  (Array.isArray(raw) ? raw : []).map((line, index) => ({
    lineNo: Number(line?.lineNo || index + 1),
    accountName: String(line?.accountName || ''),
    debit: Number(line?.debit || 0),
    credit: Number(line?.credit || 0),
    narration: line?.narration ? String(line.narration) : '',
  }));

const DOC_TYPE_VALUES = [
  'purchase_invoice',
  'vendor_bill',
  'sales_invoice',
  'receipt',
  'card_slip',
  'bank_statement',
  'gst_challan',
  'tds_challan',
  'payroll_slip',
  'remittance',
  'credit_note',
  'debit_note',
  'other',
] as const;

const AUTO_VOUCHER_STATUSES: AutoVoucherStatus[] = [
  'uploaded',
  'ocr_completed',
  'ai_classified',
  'draft',
  'review_required',
  'approved',
  'posted',
  'rejected',
  'cancelled',
];

const AIAutoVoucher: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useStore();
  const {
    canSelectCompany,
    companies,
    selectedCompanyId,
    effectiveCompanyId,
    selectedCompanyName,
    companyQuery,
    changeCompany,
  } = useAccountingCompany();
  const [rows, setRows] = useState<AutoVoucher[]>([]);
  const [selected, setSelected] = useState<AutoVoucher | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [docType, setDocType] = useState('receipt');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const { ledgerAccounts, reload: reloadAccounts } = useGlAccounts(true, effectiveCompanyId);
  const [form, setForm] = useState({
    transactionDate: '',
    counterpartyName: '',
    narration: '',
    lines: [] as VoucherLineRow[],
  });

  const reviewAllowed = useMemo(
    () => user?.role === 'root' || user?.role === 'admin' || user?.role === 'audit',
    [user?.role]
  );

  const postAllowed = useMemo(() => user?.role === 'root' || user?.role === 'admin', [user?.role]);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountingService.getAutoVouchers({
        status: statusFilter || undefined,
        ...companyQuery,
      });
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('autoVoucher.errors.loadList'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companyQuery, t]);

  useEffect(() => {
    setAccounts(ledgerAccounts);
  }, [ledgerAccounts]);

  useEffect(() => {
    setSelected(null);
    loadList();
    reloadAccounts();
  }, [loadList, reloadAccounts, effectiveCompanyId]);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const response = await accountingService.getAutoVoucher(id, effectiveCompanyId);
      const data: AutoVoucher = response?.data;
      setSelected(data);
      setForm({
        transactionDate: data?.transaction_date || '',
        counterpartyName: data?.counterparty_name || '',
        narration: data?.narration || '',
        lines: mapLines(data?.final_lines),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || t('autoVoucher.errors.loadDetail'));
    }
  }, [effectiveCompanyId, t]);

  const statusLabel = (status: AutoVoucherStatus) => t(`autoVoucher.status.${status}`, status);

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(t('autoVoucher.errors.noFile'));
      return;
    }

    const normalizedName = selectedFile.name.trim().toLowerCase();
    const localDuplicate = rows.find(
      (row) =>
        row.source_file_name?.trim().toLowerCase() === normalizedName &&
        row.status !== 'rejected' &&
        row.status !== 'cancelled'
    );
    if (localDuplicate) {
      setError(
        t('autoVoucher.errors.duplicateFileName', {
          fileName: selectedFile.name,
          vouchers: localDuplicate.voucher_code,
        })
      );
      return;
    }

    try {
      setUploading(true);
      const response = await accountingService.uploadAutoVoucher(selectedFile, docType, effectiveCompanyId);
      const created = response?.data;
      setSuccess(t('autoVoucher.success.uploaded'));
      setSelectedFile(null);
      await loadList();
      if (created?.id) {
        await loadDetail(created.id);
      }
    } catch (err: any) {
      if (err?.response?.data?.code === 'DUPLICATE_FILE_NAME') {
        const vouchers = (err?.response?.data?.data?.matchedVoucherCodes || []).join(', ');
        setError(
          t('autoVoucher.errors.duplicateFileName', {
            fileName: selectedFile.name,
            vouchers,
          })
        );
      } else {
        setError(err?.response?.data?.message || t('autoVoucher.errors.uploadFailed'));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const parsedLines = form.lines;
      await accountingService.updateAutoVoucher(
        selected.id,
        {
          transactionDate: form.transactionDate || null,
          counterpartyName: form.counterpartyName || null,
          narration: form.narration || null,
          finalLines: parsedLines,
        },
        effectiveCompanyId
      );
      setSuccess(t('autoVoucher.success.saved'));
      await loadDetail(selected.id);
      await loadList();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('autoVoucher.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await accountingService.approveAutoVoucher(selected.id, effectiveCompanyId);
      setSuccess(t('autoVoucher.success.approved'));
      await loadDetail(selected.id);
      await loadList();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('autoVoucher.errors.approveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const response = await accountingService.postAutoVoucher(selected.id, effectiveCompanyId);
      setSuccess(response?.message || t('autoVoucher.success.posted'));
      await loadDetail(selected.id);
      await loadList();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('autoVoucher.errors.postFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      setError(t('autoVoucher.errors.rejectReasonRequired'));
      return;
    }
    try {
      setSaving(true);
      await accountingService.rejectAutoVoucher(selected.id, rejectReason, effectiveCompanyId);
      setRejectOpen(false);
      setRejectReason('');
      setSuccess(t('autoVoucher.success.rejected'));
      await loadDetail(selected.id);
      await loadList();
    } catch (err: any) {
      setError(err?.response?.data?.message || t('autoVoucher.errors.rejectFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={mvsPageRootSx}>
      <MvsPageHeader
        title={t('autoVoucher.title')}
        description={t('autoVoucher.description')}
        actions={
          <Button
            variant="outlined"
            size="small"
            onClick={() =>
              navigate(
                effectiveCompanyId
                  ? `/accounting/books?company_id=${effectiveCompanyId}`
                  : '/accounting/books'
              )
            }
          >
            {t('autoVoucher.booksLink')}
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

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
            {t('autoVoucher.upload.title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>{t('autoVoucher.upload.docType')}</InputLabel>
              <Select
                label={t('autoVoucher.upload.docType')}
                value={docType}
                onChange={(e) => setDocType(String(e.target.value))}
              >
                {DOC_TYPE_VALUES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`autoVoucher.docTypes.${value}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" component="label">
              {t('autoVoucher.upload.selectFile')}
              <input
                hidden
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt,.json,.xls,.xlsx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {selectedFile ? selectedFile.name : t('autoVoucher.upload.noFile')}
            </Typography>
            <Button variant="contained" onClick={handleUpload} disabled={uploading}>
              {uploading ? t('autoVoucher.upload.processing') : t('autoVoucher.upload.submit')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 1fr' }, gap: 2 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, gap: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('autoVoucher.list.title')}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>{t('autoVoucher.list.status')}</InputLabel>
                <Select
                  label={t('autoVoucher.list.status')}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(String(e.target.value))}
                >
                  <MenuItem value="">{t('autoVoucher.list.all')}</MenuItem>
                  {AUTO_VOUCHER_STATUSES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {statusLabel(value)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('autoVoucher.list.columns.no')}</TableCell>
                    <TableCell>{t('autoVoucher.list.columns.voucher')}</TableCell>
                    <TableCell>{t('autoVoucher.list.columns.status')}</TableCell>
                    <TableCell>{t('autoVoucher.list.columns.confidence')}</TableCell>
                    <TableCell align="right">{t('autoVoucher.list.columns.amount')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => loadDetail(row.id)}
                      sx={{ cursor: 'pointer' }}
                      selected={selected?.id === row.id}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {row.voucher_code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.source_file_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={statusLabel(row.status)} />
                      </TableCell>
                      <TableCell>{Number(row.confidence_score || 0).toFixed(1)}%</TableCell>
                      <TableCell align="right">{Number(row.total_debit || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        {loading ? t('autoVoucher.list.loading') : t('autoVoucher.list.empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              {t('autoVoucher.review.title')}
            </Typography>

            {!selected ? (
              <Typography color="text.secondary">{t('autoVoucher.review.selectHint')}</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={selected.voucher_code} size="small" />
                  <Chip label={statusLabel(selected.status)} size="small" color="primary" variant="outlined" />
                  <Chip
                    label={`${t('autoVoucher.list.columns.confidence')} ${Number(selected.confidence_score || 0).toFixed(1)}%`}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {t('autoVoucher.review.reason')}: {selected.ai_analysis?.reason || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('autoVoucher.review.rule')}: {selected.ai_analysis?.ruleName || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('autoVoucher.review.ocrAccuracy')}:{' '}
                  {selected.ocr_data?.ocrAccuracy ? `${Math.round(selected.ocr_data.ocrAccuracy * 100)}%` : '-'}
                </Typography>

                {selected.duplicate_check?.hasDuplicate && (
                  <Alert severity="warning">
                    {t('autoVoucher.review.duplicateWarning')}:{' '}
                    {(selected.duplicate_check?.matchedVoucherCodes || []).join(', ')}
                  </Alert>
                )}

                <TextField
                  size="small"
                  label={t('autoVoucher.review.transactionDate')}
                  value={form.transactionDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, transactionDate: e.target.value }))}
                />
                <TextField
                  size="small"
                  label={t('autoVoucher.review.counterparty')}
                  value={form.counterpartyName}
                  onChange={(e) => setForm((prev) => ({ ...prev, counterpartyName: e.target.value }))}
                />
                <TextField
                  size="small"
                  label={t('autoVoucher.review.narration')}
                  value={form.narration}
                  onChange={(e) => setForm((prev) => ({ ...prev, narration: e.target.value }))}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('autoVoucher.review.linesTitle')}
                </Typography>
                <VoucherLinesEditor
                  lines={form.lines}
                  accounts={accounts}
                  onChange={(lines) => setForm((prev) => ({ ...prev, lines }))}
                  readOnly={selected.status === 'posted'}
                />

                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.info.main, 0.06),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                  }}
                >
                  <Typography variant="body2">
                    {t('autoVoucher.review.debitCreditSummary', {
                      debit: Number(selected.total_debit || 0).toLocaleString(),
                      credit: Number(selected.total_credit || 0).toLocaleString(),
                    })}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={handleSave} disabled={saving}>
                    {t('autoVoucher.review.save')}
                  </Button>
                  {reviewAllowed && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleApprove}
                      disabled={saving || selected.status === 'approved' || selected.status === 'posted'}
                    >
                      {t('autoVoucher.review.approve')}
                    </Button>
                  )}
                  {postAllowed && (
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handlePost}
                      disabled={saving || selected.status !== 'approved'}
                    >
                      {t('autoVoucher.review.post')}
                    </Button>
                  )}
                  {selected.status === 'posted' && (
                    <Button variant="outlined" onClick={() => navigate(
                      effectiveCompanyId
                        ? `/accounting/books?tab=ledger&company_id=${effectiveCompanyId}`
                        : '/accounting/books?tab=ledger'
                    )}>
                      {t('autoVoucher.review.viewLedger')}
                    </Button>
                  )}
                  {reviewAllowed && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setRejectOpen(true)}
                      disabled={saving || selected.status === 'posted'}
                    >
                      {t('autoVoucher.review.reject')}
                    </Button>
                  )}
                </Box>

                <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
                  {t('autoVoucher.review.auditLog')}
                </Typography>
                <Box sx={{ maxHeight: 180, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1 }}>
                  {(selected.auditLogs || []).length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {t('autoVoucher.review.noLog')}
                    </Typography>
                  )}
                  {(selected.auditLogs || []).map((log) => {
                    const ts = log.created_at || log.createdAt;
                    const label = ts ? new Date(ts).toLocaleString() : '-';
                    return (
                    <Typography key={log.id} variant="caption" display="block" sx={{ py: 0.25 }}>
                      {log.action} - {label}
                    </Typography>
                    );
                  })}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('autoVoucher.rejectDialog.title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            label={t('autoVoucher.rejectDialog.reason')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={saving}>
            {t('autoVoucher.rejectDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(error)} autoHideDuration={3500} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(success)} autoHideDuration={2800} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AIAutoVoucher;
