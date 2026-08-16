import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PayslipContent, { type PayslipCompanyInfo, type PayslipHeaderLayout } from './PayslipContent';
import type { PayrollGridRow } from './payroll/payrollGridTypes';
import { buildPayslipLabels, buildPayslipPdfFilename, downloadPayslipPdf, generatePayslipPdfBlob } from './payrollPayslipPdf';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { useStore } from '../../store';
import { mvsBodyOutlinedBtnSx, mvsBodyPrimaryBtnSx } from '../../theme/mvsLayout';

type Props = {
  open: boolean;
  row: PayrollGridRow | null;
  onClose: () => void;
  /** @deprecated 명세서는 항상 영어. 호환용으로 남겨 둠 */
  forceEnglish?: boolean;
  headerLayout?: PayslipHeaderLayout;
};

const PayrollPayslipDialog: React.FC<Props> = ({
  open,
  row,
  onClose,
  headerLayout = 'standard'
}) => {
  const { t } = useTranslation();
  const user = useStore((s) => s.user);
  const [downloading, setDownloading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<PayslipCompanyInfo | null>(null);
  const labels = buildPayslipLabels('en');

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
        locale: 'en',
        headerLayout,
        companyId: user?.company_id ?? null
      });
      downloadPayslipPdf(blob, buildPayslipPdfFilename(row.working_month, row.employee_name));
    } finally {
      setDownloading(false);
    }
  }, [row, companyInfo, headerLayout, user?.company_id]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
        {labels.title}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2, bgcolor: 'bodyArea.main', px: { xs: 2, sm: 3 } }}>
        {row ? (
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <PayslipContent
              row={row}
              labels={labels}
              companyInfo={companyInfo}
              companyId={user?.company_id ?? null}
              showTitle={false}
              wide
              headerLayout={headerLayout}
            />
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
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayrollPayslipDialog;
