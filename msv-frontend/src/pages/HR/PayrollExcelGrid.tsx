import React, { useCallback, useMemo, useState } from 'react';
import { DataGrid, GridRowModel, GridPaginationModel } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { payrollService } from '../../services/api';
import type { PayrollGridRow } from './payroll/payrollGridTypes';
import { gridRowToPayload, recalculatePayrollRow, ESI_GROSS_CEILING_INR } from './payroll/payrollGridUtils';
import { buildPayrollGridColumns } from './payroll/payrollGridColumns';
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
  allowOpenPayslip = true
}) => {
  const { t, i18n } = useTranslation();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50
  });

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
      const row = recalculatePayrollRow(newRow as PayrollGridRow);
      try {
        onError(null);
        const payload = gridRowToPayload(row);
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
    [allowCellEdit, onError, onReload, onSuccess, t]
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

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 360,
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
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
      <DataGrid
        key={i18n.language}
        rows={rows}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.id}
        isCellEditable={(params) => {
          if (!allowCellEdit) return false;
          if (params.field === 'pf_employer' || params.field === 'days_worked') return false;
          const row = params.row as PayrollGridRow;
          const sum = typeof row.sum_total === 'number' ? row.sum_total : parseFloat(String(row.sum_total ?? '').replace(/,/g, ''));
          const sumOk = Number.isFinite(sum) ? sum : 0;
          if (
            (params.field === 'esic_employee' || params.field === 'esic_employer') &&
            sumOk <= ESI_GROSS_CEILING_INR
          ) {
            return false;
          }
          if (isRoot) return true;
          const period = String(row.working_month || '').trim();
          if (!period) return true;
          return !lockedPeriods.has(period);
        }}
        processRowUpdate={processRowUpdate}
        editMode="cell"
        disableRowSelectionOnClick
        rowHeight={36}
        columnHeaderHeight={56}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[25, 50, 100]}
        sx={{
          ...payrollDataGridSx,
          flex: 1,
          minHeight: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          '& .MuiDataGrid-main': { flex: 1, minHeight: 0 }
        }}
      />
    </Box>
  );
};

export default PayrollExcelGrid;
