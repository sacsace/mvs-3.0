import React, { useCallback, useMemo } from 'react';
import { DataGrid, GridRowModel } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { payrollService } from '../../services/api';
import type { PayrollGridRow } from './payroll/payrollGridTypes';
import { gridRowToPayload, recalculatePayrollRow, type PayrollRecalcContext } from './payroll/payrollGridUtils';
import { buildPayrollGridColumns, PAYROLL_GRID_MIN_WIDTH } from './payroll/payrollGridColumns';
import { payrollDataGridSx } from './payroll/payrollGridStyles';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

export type { PayrollGridRow } from './payroll/payrollGridTypes';
export { computeTenureMonths, payrollRecordToGridRow } from './payroll';

type Props = {
  rows: PayrollGridRow[];
  loading: boolean;
  onReload: () => Promise<void>;
  onError: (msg: string | null) => void;
  onSuccess: (msg: string) => void;
  onOpenPayslip: (row: PayrollGridRow) => void;
  /** YYYY-MM — 확정된 근무월은 일반 사용자 편집 불가 */
  lockedPeriods?: Set<string>;
  isRoot?: boolean;
  /** 메뉴 권한 등 — false면 셀 편집·저장 비활성 */
  allowCellEdit?: boolean;
  allowDelete?: boolean;
  allowOpenPayslip?: boolean;
  /** 회사 등록 주 GST code — PT 자동 산출 */
  companyStateCode?: string | null;
  /** YYYY-MM — PT 월별 특례(예: Maharashtra 2월) */
  payrollMonth?: string | null;
};

const PayrollExcelGrid: React.FC<Props> = ({
  rows,
  loading,
  onReload,
  onError,
  onSuccess,
  onOpenPayslip,
  lockedPeriods = new Set(),
  isRoot = false,
  allowCellEdit = true,
  allowDelete = true,
  allowOpenPayslip = true,
  companyStateCode = null,
  payrollMonth = null
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  const recalcCtx = useMemo<PayrollRecalcContext>(
    () => ({ companyStateCode, payrollMonth }),
    [companyStateCode, payrollMonth]
  );

  const handleDeleteRow = useCallback(
    (id: number) => {
      showConfirm(
        t('payrollManagement.confirmDelete'),
        () => {
          void (async () => {
            try {
              onError(null);
              const res = await payrollService.deletePayroll(id);
              if (res.success) {
                onSuccess(t('payrollManagement.success.deleted'));
                await onReload();
              } else {
                onError((res as any).message || t('payrollManagement.errors.deleteFailed'));
              }
            } catch (e: any) {
              onError(e?.response?.data?.message || t('payrollManagement.errors.deleteError'));
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
    },
    [onError, onReload, onSuccess, showConfirm, t]
  );

  const processRowUpdate = useCallback(
    async (newRow: GridRowModel, oldRow: GridRowModel) => {
      if (!allowCellEdit) {
        return oldRow as PayrollGridRow;
      }
      const row = recalculatePayrollRow(newRow as PayrollGridRow, recalcCtx);
      try {
        onError(null);
        const payload = gridRowToPayload(row, recalcCtx);
        const res = await payrollService.updatePayroll(row.id, payload);
        if (!res.success) {
          throw new Error((res as any).message || t('payrollManagement.errors.saveFailed'));
        }
        onSuccess(t('payrollManagement.success.saved'));
        await onReload();
        return row;
      } catch (e: any) {
        const msg = e?.message || t('payrollManagement.errors.saveFailed');
        onError(msg);
        throw e;
      }
    },
    [allowCellEdit, onError, onReload, onSuccess, recalcCtx, t]
  );

  const columns = useMemo(
    () =>
      buildPayrollGridColumns({
        t,
        onOpenPayslip,
        handleDeleteRow,
        lockedPeriods,
        isRoot,
        allowCellEdit,
        allowDelete,
        allowOpenPayslip
      }),
    [allowCellEdit, allowDelete, allowOpenPayslip, handleDeleteRow, isRoot, lockedPeriods, onOpenPayslip, t]
  );

  const PAYROLL_ROW_HEIGHT = 36;
  const PAYROLL_HEADER_HEIGHT = 56;
  const PAYROLL_LIST_BOTTOM_GAP = PAYROLL_ROW_HEIGHT;
  const gridBodyHeight =
    PAYROLL_HEADER_HEIGHT + Math.max(rows.length, 1) * PAYROLL_ROW_HEIGHT + PAYROLL_LIST_BOTTOM_GAP;

  return (
    <>
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
      <Box sx={{ width: '100%', minWidth: 0 }}>
        <DataGrid
        key={i18n.language}
        rows={rows}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.id}
        isCellEditable={(params) => {
          if (!allowCellEdit) return false;
          if (
            params.field === 'pf_employer' ||
            params.field === 'days_worked' ||
            params.field === 'sum_total' ||
            params.field === 'net_salary_payable' ||
            params.field === 'pt' ||
            params.field === 'ot_rate' ||
            params.field === 'esic_employee' ||
            params.field === 'esic_employer' ||
            params.field === 'pf_employee' ||
            params.field === 'pf_employer' ||
            params.field === 'emp_id' ||
            params.field === 'employee_email' ||
            params.field === 'working_month'
          ) {
            return false;
          }
          const row = params.row as PayrollGridRow;
          if (isRoot) return true;
          const period = String(row.working_month || '').trim();
          if (!period) return true;
          return !lockedPeriods.has(period);
        }}
        processRowUpdate={processRowUpdate}
        editMode="cell"
        disableRowSelectionOnClick
        rowHeight={PAYROLL_ROW_HEIGHT}
        columnHeaderHeight={PAYROLL_HEADER_HEIGHT}
        paginationModel={{ page: 0, pageSize: Math.max(rows.length, 1) }}
        onPaginationModelChange={() => undefined}
        hideFooter
        sx={{
          ...(typeof payrollDataGridSx === 'function' ? payrollDataGridSx(theme) : payrollDataGridSx),
          width: '100%',
          minWidth: PAYROLL_GRID_MIN_WIDTH,
          height: gridBodyHeight,
          minHeight: gridBodyHeight,
          maxHeight: gridBodyHeight,
          border: 'none',
        }}
        />
      </Box>
    </>
  );
};

export default PayrollExcelGrid;
