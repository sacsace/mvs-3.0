import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  Typography,
  Box,
  LinearProgress,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { PayrollGridRow } from './payroll/payrollGridTypes';
import type { PayslipCompanyInfo } from './PayslipContent';
import { generatePayslipPdfBlob, payslipBlobToBase64 } from './payrollPayslipPdf';
import { companyService, payrollService } from '../../services/api';
import { useStore } from '../../store';

type Props = {
  open: boolean;
  rows: PayrollGridRow[];
  onClose: () => void;
  onSent: (message: string) => void;
  onError: (message: string) => void;
};

const PayrollSendPayslipsDialog: React.FC<Props> = ({ open, rows, onClose, onSent, onError }) => {
  const { t } = useTranslation();
  const user = useStore((s) => s.user);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [companyInfo, setCompanyInfo] = useState<PayslipCompanyInfo | null>(null);

  useEffect(() => {
    if (open && rows.length) {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }, [open, rows]);

  useEffect(() => {
    let mounted = true;
    const loadCompanyInfo = async () => {
      if (!open || !user?.company_id) {
        if (mounted) setCompanyInfo(null);
        return;
      }
      try {
        const res = await companyService.getCompany(user.company_id);
        const company = res?.data || {};
        if (!mounted) return;
        setCompanyInfo({
          name: company.name || '',
          address: company.address || '',
          phone: company.phone || company.phone_number || '',
          email: company.email || ''
        });
      } catch {
        if (mounted) setCompanyInfo(null);
      }
    };
    void loadCompanyInfo();
    return () => {
      mounted = false;
    };
  }, [open, user?.company_id]);

  const rowsWithEmail = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        hasEmail: !!String(r.employee_email || '').trim()
      })),
    [rows]
  );

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const allIds = rowsWithEmail.filter((x) => x.hasEmail).map((x) => x.row.id);
    if (selected.size === allIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }, [rowsWithEmail, selected.size]);

  const handleSend = async () => {
    const toSend = rowsWithEmail.filter((x) => x.hasEmail && selected.has(x.row.id));
    if (toSend.length === 0) {
      onError(t('payrollManagement.payslip.sendNoSelection'));
      return;
    }

    setSending(true);
    setProgress({ done: 0, total: toSend.length });
    let ok = 0;
    let fail = 0;

    try {
      for (let i = 0; i < toSend.length; i++) {
        const { row } = toSend[i];
        try {
          const blob = await generatePayslipPdfBlob(row, companyInfo);
          const b64 = await payslipBlobToBase64(blob);
          const res = await payrollService.sendPayrollPayslip(row.id, b64);
          if (res.success) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
        setProgress({ done: i + 1, total: toSend.length });
      }
      onSent(t('payrollManagement.payslip.sendResult', { ok, fail }));
      onClose();
    } catch (e: any) {
      onError(e?.message || t('payrollManagement.payslip.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('payrollManagement.payslip.sendTitle')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('payrollManagement.payslip.sendHint')}
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('payrollManagement.payslip.sendEmailNote')}
        </Alert>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selected.size > 0 && selected.size < rowsWithEmail.filter((x) => x.hasEmail).length
                  }
                  checked={
                    rowsWithEmail.filter((x) => x.hasEmail).length > 0 &&
                    selected.size === rowsWithEmail.filter((x) => x.hasEmail).length
                  }
                  onChange={toggleAll}
                  disabled={sending}
                />
              </TableCell>
              <TableCell>{t('payrollManagement.payslip.colName')}</TableCell>
              <TableCell>{t('payrollManagement.payslip.colEmail')}</TableCell>
              <TableCell>{t('payrollManagement.payslip.colPeriod')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rowsWithEmail.map(({ row, hasEmail }) => (
              <TableRow key={row.id} sx={{ opacity: hasEmail ? 1 : 0.5 }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    disabled={sending || !hasEmail}
                  />
                </TableCell>
                <TableCell>{row.employee_name}</TableCell>
                <TableCell>{hasEmail ? row.employee_email : t('payrollManagement.payslip.noEmail')}</TableCell>
                <TableCell>{row.working_month}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sending && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} />
            <Typography variant="caption" color="text.secondary">
              {progress.done} / {progress.total}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSend} disabled={sending || rows.length === 0}>
          {t('payrollManagement.payslip.sendAction')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayrollSendPayslipsDialog;
