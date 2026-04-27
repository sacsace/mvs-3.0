import React from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { IconButton, Link, Tooltip, Typography } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { PayrollGridRow } from './payrollGridTypes';
import {
  computeTenureMonths,
  formatMaybeNumericString,
  numberEditProps
} from './payrollGridUtils';

/** `useTranslation().t` — 키 문자열만 쓰는 그리드용 */
type PayrollTranslate = (key: string) => string;

export type PayrollGridColumnsDeps = {
  t: PayrollTranslate;
  onOpenPayslip: (row: PayrollGridRow) => void;
  handleDeleteRow: (id: number) => void;
  lockedPeriods: Set<string>;
  isRoot: boolean;
  /** false면 그리드 셀 편집 비활성 */
  allowCellEdit?: boolean;
  allowDelete?: boolean;
  allowOpenPayslip?: boolean;
};

export function buildPayrollGridColumns({
  t,
  onOpenPayslip,
  handleDeleteRow,
  lockedPeriods,
  isRoot,
  allowCellEdit = true,
  allowDelete = true,
  allowOpenPayslip = true
}: PayrollGridColumnsDeps): GridColDef<PayrollGridRow>[] {
  return [
    {
      field: 'row_no',
      headerName: t('payrollManagement.gridColumns.rowNo'),
      width: 56,
      editable: false,
      sortable: false
    },
    {
      field: 'bank_account',
      headerName: t('payrollManagement.gridColumns.bankAccount'),
      minWidth: 110,
      flex: 0.5,
      editable: allowCellEdit
    },
    { field: 'ifsc', headerName: t('payrollManagement.gridColumns.ifsc'), minWidth: 100, flex: 0.5, editable: allowCellEdit },
    {
      field: 'bank_name',
      headerName: t('payrollManagement.gridColumns.bankName'),
      minWidth: 100,
      flex: 0.5,
      editable: allowCellEdit
    },
    {
      field: 'department',
      headerName: t('payrollManagement.gridColumns.department'),
      minWidth: 100,
      flex: 0.6,
      editable: allowCellEdit
    },
    {
      field: 'employee_name',
      headerName: t('payrollManagement.gridColumns.employeeName'),
      minWidth: 120,
      flex: 0.7,
      editable: allowCellEdit,
      renderCell: (params) =>
        allowOpenPayslip ? (
          <Link
            component="button"
            type="button"
            underline="hover"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onOpenPayslip(params.row as PayrollGridRow);
            }}
            sx={{
              cursor: 'pointer',
              font: 'inherit',
              textAlign: 'left',
              color: 'primary.main',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            {params.value}
          </Link>
        ) : (
          <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
            {params.value}
          </Typography>
        )
    },
    {
      field: 'position',
      headerName: t('payrollManagement.gridColumns.position'),
      minWidth: 100,
      flex: 0.5,
      editable: allowCellEdit
    },
    {
      field: 'joining_date',
      headerName: t('payrollManagement.gridColumns.joiningDate'),
      minWidth: 100,
      flex: 0.5,
      editable: allowCellEdit
    },
    {
      field: 'working_month',
      headerName: t('payrollManagement.gridWorkingMonth'),
      minWidth: 88,
      flex: 0.45,
      editable: false,
      sortable: true,
      align: 'right',
      headerAlign: 'center',
      valueGetter: (_value, row) => computeTenureMonths(row.joining_date, row.working_month),
      valueFormatter: (value: unknown) =>
        value === '' || value === null || value === undefined ? '' : String(value)
    },
    {
      field: 'basic_salary',
      headerName: t('payrollManagement.gridColumns.basicSalary'),
      minWidth: 100,
      flex: 0.5,
      editable: allowCellEdit,
      ...numberEditProps
    },
    {
      field: 'total_day_of_month',
      headerName: t('payrollManagement.gridColumns.totalDayOfMonth'),
      minWidth: 110,
      flex: 0.5,
      editable: allowCellEdit,
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'unpaid_leave',
      headerName: t('payrollManagement.gridColumns.unpaidLeave'),
      minWidth: 92,
      flex: 0.48,
      editable: allowCellEdit,
      headerClassName: 'payroll-col-unpaid',
      cellClassName: 'payroll-col-unpaid',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'days_worked',
      headerName: t('payrollManagement.gridColumns.daysWorked'),
      minWidth: 92,
      flex: 0.48,
      editable: false,
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'overtime',
      headerName: t('payrollManagement.gridColumns.overtime'),
      minWidth: 90,
      flex: 0.45,
      editable: allowCellEdit,
      ...numberEditProps
    },
    {
      field: 'sum_total',
      headerName: t('payrollManagement.gridColumns.sumTotal'),
      minWidth: 100,
      flex: 0.5,
      editable: false,
      headerClassName: 'payroll-col-sum',
      cellClassName: 'payroll-col-sum',
      ...numberEditProps
    },
    {
      field: 'pf_employee',
      headerName: t('payrollManagement.gridColumns.pfEmployee'),
      minWidth: 130,
      flex: 0.62,
      editable: allowCellEdit,
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'pf_employer',
      headerName: t('payrollManagement.gridColumns.pfEmployer'),
      minWidth: 130,
      flex: 0.62,
      editable: false,
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'esic_employee',
      headerName: t('payrollManagement.gridColumns.esicEmployee'),
      minWidth: 138,
      flex: 0.65,
      editable: allowCellEdit,
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'esic_employer',
      headerName: t('payrollManagement.gridColumns.esicEmployer'),
      minWidth: 138,
      flex: 0.65,
      editable: allowCellEdit,
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'tds',
      headerName: t('payrollManagement.gridColumns.tds'),
      minWidth: 90,
      flex: 0.45,
      editable: allowCellEdit,
      ...numberEditProps
    },
    {
      field: 'pt',
      headerName: t('payrollManagement.gridColumns.pt'),
      minWidth: 80,
      flex: 0.4,
      editable: allowCellEdit,
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    },
    {
      field: 'net_salary_payable',
      headerName: t('payrollManagement.gridColumns.netSalary'),
      minWidth: 110,
      flex: 0.52,
      editable: false,
      headerClassName: 'payroll-col-net',
      cellClassName: 'payroll-col-net',
      ...numberEditProps
    },
    {
      field: 'actions',
      headerName: t('payrollManagement.columns.actions'),
      width: 72,
      sortable: false,
      filterable: false,
      editable: false,
      renderCell: (params) => {
        const wm = String((params.row as PayrollGridRow).working_month || '').trim();
        const rowLocked = Boolean(!isRoot && wm && lockedPeriods.has(wm));
        const delDisabled = rowLocked || !allowDelete;
        return (
          <Tooltip
            title={
              !allowDelete ? t('common.menuNoDelete') : t('payrollManagement.actions.delete')
            }
          >
            <span style={{ display: 'inline-flex' }}>
              <IconButton
                size="small"
                color="error"
                disabled={delDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDeleteRow(params.row.id as number);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        );
      }
    }
  ];
}
