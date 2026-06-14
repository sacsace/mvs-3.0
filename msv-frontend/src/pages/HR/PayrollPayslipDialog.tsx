import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PayslipContent, { type PayslipCompanyInfo } from './PayslipContent';
import type { PayrollGridRow } from './payroll/payrollGridTypes';
import { buildPayslipLabels, downloadPayslipPdf, generatePayslipPdfBlob } from './payrollPayslipPdf';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useStore } from '../../store';

type Props = {
  open: boolean;
  row: PayrollGridRow | null;
  onClose: () => void;
};

const PayrollPayslipDialog: React.FC<Props> = ({ open, row, onClose }) => {
  const { t } = useTranslation();
  const user = useStore((s) => s.user);
  const [downloading, setDownloading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<PayslipCompanyInfo | null>(null);
  const labels = buildPayslipLabels();

  useEffect(() => {
    let mounted = true;
    const loadCompanyInfo = async () => {
      if (!open || !user?.company_id) {
        if (mounted) setCompanyInfo(null);
        return;
      }
      try {
        const company = await useReferenceDataStore.getState().fetchCompanyById(Number(user.company_id));
        if (!mounted) return;
        setCompanyInfo({
          name: company?.name || '',
          address: company?.address || '',
          phone: company?.phone || company?.phone_number || '',
          email: company?.email || ''
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

  const handleDownload = useCallback(async () => {
    if (!row) return;
    setDownloading(true);
    try {
      const blob = await generatePayslipPdfBlob(row, companyInfo);
      const safe = `${row.working_month || 'payslip'}_${row.employee_name}`.replace(/[\\/:*?"<>|]/g, '_');
      downloadPayslipPdf(blob, `${safe}.pdf`);
    } finally {
      setDownloading(false);
    }
  }, [row, companyInfo]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
        {t('payrollManagement.payslip.title')}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2, bgcolor: 'grey.50', px: { xs: 2, sm: 3 } }}>
        {row ? (
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <PayslipContent row={row} labels={labels} companyInfo={companyInfo} showTitle={false} wide />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleDownload}
          disabled={!row || downloading}
          startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {t('payrollManagement.payslip.downloadPdf')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayrollPayslipDialog;
