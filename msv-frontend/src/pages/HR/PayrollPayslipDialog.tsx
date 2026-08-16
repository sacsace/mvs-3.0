import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PayslipContent, { type PayslipCompanyInfo } from './PayslipContent';
import type { PayrollGridRow } from './payroll/payrollGridTypes';
import { buildPayslipLabels, buildPayslipPdfFilename, downloadPayslipPdf, generatePayslipPdfBlob } from './payrollPayslipPdf';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useStore } from '../../store';
import { mvsBodyOutlinedBtnSx, mvsBodyPrimaryBtnSx } from '../../theme/mvsLayout';

type Props = {
  open: boolean;
  row: PayrollGridRow | null;
  onClose: () => void;
  /** 급여발송 등 — UI 언어와 무관하게 영어 명세서 */
  forceEnglish?: boolean;
};

const PayrollPayslipDialog: React.FC<Props> = ({ open, row, onClose, forceEnglish = false }) => {
  const { t } = useTranslation();
  const user = useStore((s) => s.user);
  const [downloading, setDownloading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<PayslipCompanyInfo | null>(null);
  const labels = buildPayslipLabels(forceEnglish ? 'en' : undefined);

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
      const blob = await generatePayslipPdfBlob(row, companyInfo, {
        locale: forceEnglish ? 'en' : undefined
      });
      downloadPayslipPdf(blob, buildPayslipPdfFilename(row.working_month, row.employee_name));
    } finally {
      setDownloading(false);
    }
  }, [row, companyInfo, forceEnglish]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
        {forceEnglish ? labels.title : t('payrollManagement.payslip.title')}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2, bgcolor: 'bodyArea.main', px: { xs: 2, sm: 3 } }}>
        {row ? (
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <PayslipContent row={row} labels={labels} companyInfo={companyInfo} showTitle={false} wide />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={mvsBodyOutlinedBtnSx}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleDownload}
          disabled={!row || downloading}
          startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={mvsBodyPrimaryBtnSx}
        >
          {forceEnglish ? 'Download PDF' : t('payrollManagement.payslip.downloadPdf')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayrollPayslipDialog;
