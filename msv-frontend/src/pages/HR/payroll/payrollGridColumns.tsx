import React from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { IconButton, Link, Tooltip, Typography } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { PayrollGridRow } from './payrollGridTypes';
import {
  computeTenureMonths,
  formatMaybeNumericString,
  numberEditProps,
  otHourEditProps
} from './payrollGridUtils';

/** 엑셀 Salary Details 시트 기준 최소 가로 너비 */
export const PAYROLL_GRID_MIN_WIDTH = 3440;

const stretchCol = <T extends GridColDef<PayrollGridRow>>(col: T): T => ({ flex: 1, ...col });

type PayrollTranslate = (key: string) => string;

export type PayrollGridColumnsDeps = {
  t: PayrollTranslate;
  onOpenPayslip: (row: PayrollGridRow) => void;
  handleDeleteRow: (id: number) => void;
  lockedPeriods: Set<string>;
  isRoot: boolean;
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
      flex: 0,
      width: 56,
      minWidth: 56,
      maxWidth: 56,
      editable: false,
      sortable: false
    },
    stretchCol({
      field: 'emp_id',
      headerName: t('payrollManagement.gridColumns.empId'),
      minWidth: 88,
      editable: false
    }),
    stretchCol({
      field: 'bank_account',
      headerName: t('payrollManagement.gridColumns.bankAccount'),
      minWidth: 100,
      editable: allowCellEdit
    }),
    stretchCol({ field: 'ifsc', headerName: t('payrollManagement.gridColumns.ifsc'), minWidth: 96, editable: allowCellEdit }),
    stretchCol({
      field: 'bank_name',
      headerName: t('payrollManagement.gridColumns.bankName'),
      minWidth: 96,
      editable: allowCellEdit
    }),
    stretchCol({
      field: 'employee_email',
      headerName: t('payrollManagement.gridColumns.email'),
      minWidth: 140,
      editable: false
    }),
    stretchCol({
      field: 'department',
      headerName: t('payrollManagement.gridColumns.department'),
      minWidth: 100,
      editable: allowCellEdit
    }),
    stretchCol({
      field: 'employee_name',
      headerName: t('payrollManagement.gridColumns.employeeName'),
      minWidth: 120,
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
    }),
    stretchCol({
      field: 'joining_date',
      headerName: t('payrollManagement.gridColumns.joiningDate'),
      minWidth: 100,
      editable: allowCellEdit
    }),
    stretchCol({
      field: 'working_month',
      headerName: t('payrollManagement.gridColumns.workingMonth'),
      minWidth: 88,
      editable: false,
      sortable: true,
      align: 'right',
      headerAlign: 'center',
      valueGetter: (_value, row) => computeTenureMonths(row.joining_date, row.working_month),
      valueFormatter: (value: unknown) =>
        value === '' || value === null || value === undefined ? '' : String(value)
    }),
    stretchCol({
      field: 'basic_salary',
      headerName: t('payrollManagement.gridColumns.basicSalary'),
      minWidth: 100,
      editable: allowCellEdit,
      headerClassName: 'payroll-col-salary payroll-col-salary-start',
      cellClassName: 'payroll-col-salary payroll-col-salary-start',
      ...numberEditProps
    }),
    stretchCol({
      field: 'house_rent_allowance',
      headerName: t('payrollManagement.gridColumns.houseRentAllowance'),
      minWidth: 120,
      editable: allowCellEdit,
      headerClassName: 'payroll-col-salary',
      cellClassName: 'payroll-col-salary',
      ...numberEditProps
    }),
    stretchCol({
      field: 'other_allowance',
      headerName: t('payrollManagement.gridColumns.otherAllowance'),
      minWidth: 120,
      editable: allowCellEdit,
      headerClassName: 'payroll-col-salary',
      cellClassName: 'payroll-col-salary',
      ...numberEditProps
    }),
    stretchCol({
      field: 'total_salary',
      headerName: t('payrollManagement.gridColumns.totalSalary'),
      minWidth: 100,
      editable: allowCellEdit,
      headerClassName: 'payroll-col-salary-total',
      cellClassName: 'payroll-col-salary-total',
      ...numberEditProps
    }),
    stretchCol({
      field: 'total_day_of_month',
      headerName: t('payrollManagement.gridColumns.totalDayOfMonth'),
      minWidth: 96,
      editable: allowCellEdit,
      align: 'center',
      headerAlign: 'center',
      headerClassName: 'payroll-col-days payroll-col-days-start',
      cellClassName: 'payroll-col-days payroll-col-days-start',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'unpaid_leave',
      headerName: t('payrollManagement.gridColumns.unpaidLeave'),
      minWidth: 88,
      editable: allowCellEdit,
      align: 'center',
      headerAlign: 'center',
      headerClassName: 'payroll-col-days',
      cellClassName: 'payroll-col-days payroll-col-user-input',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'days_worked',
      headerName: t('payrollManagement.gridColumns.daysWorked'),
      minWidth: 88,
      editable: false,
      align: 'center',
      headerAlign: 'center',
      headerClassName: 'payroll-col-days',
      cellClassName: 'payroll-col-days',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'ot_rate',
      headerName: t('payrollManagement.gridColumns.otRate'),
      minWidth: 84,
      editable: false,
      headerClassName: 'payroll-col-attendance payroll-col-attendance-start',
      cellClassName: 'payroll-col-attendance payroll-col-attendance-start',
      ...numberEditProps
    }),
    stretchCol({
      field: 'day_ot_hour',
      headerName: t('payrollManagement.gridColumns.dayOtHour'),
      minWidth: 84,
      editable: allowCellEdit,
      align: 'center',
      headerAlign: 'center',
      headerClassName: 'payroll-col-attendance',
      cellClassName: 'payroll-col-attendance payroll-col-user-input',
      ...otHourEditProps
    }),
    stretchCol({
      field: 'transport_allowance',
      headerName: t('payrollManagement.gridColumns.extraAllowance'),
      minWidth: 120,
      editable: allowCellEdit,
      headerClassName: 'payroll-col-extra',
      cellClassName: 'payroll-col-extra payroll-col-user-input',
      ...numberEditProps
    }),
    stretchCol({
      field: 'sum_total',
      headerName: t('payrollManagement.gridColumns.sumTotal'),
      minWidth: 100,
      editable: false,
      headerClassName: 'payroll-col-sum payroll-col-sum-start',
      cellClassName: 'payroll-col-sum payroll-col-sum-start',
      ...numberEditProps
    }),
    stretchCol({
      field: 'esic_employer',
      headerName: t('payrollManagement.gridColumns.esicEmployer'),
      minWidth: 120,
      editable: false,
      headerClassName: 'payroll-col-employer payroll-col-employer-start',
      cellClassName: 'payroll-col-employer payroll-col-employer-start',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'pf_employer',
      headerName: t('payrollManagement.gridColumns.pfEmployer'),
      minWidth: 100,
      editable: false,
      headerClassName: 'payroll-col-employer',
      cellClassName: 'payroll-col-employer',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'esic_employee',
      headerName: t('payrollManagement.gridColumns.esicEmployee'),
      minWidth: 120,
      editable: false,
      headerClassName: 'payroll-col-employee payroll-col-employee-start',
      cellClassName: 'payroll-col-employee payroll-col-employee-start',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'pf_employee',
      headerName: t('payrollManagement.gridColumns.pfEmployee'),
      minWidth: 100,
      editable: false,
      headerClassName: 'payroll-col-employee',
      cellClassName: 'payroll-col-employee',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'tds',
      headerName: t('payrollManagement.gridColumns.tds'),
      minWidth: 80,
      editable: false,
      headerClassName: 'payroll-col-employee',
      cellClassName: 'payroll-col-employee',
      ...numberEditProps
    }),
    stretchCol({
      field: 'pt',
      headerName: t('payrollManagement.gridColumns.pt'),
      minWidth: 72,
      editable: false,
      headerClassName: 'payroll-col-employee',
      cellClassName: 'payroll-col-employee',
      valueFormatter: (value: unknown) => formatMaybeNumericString(value)
    }),
    stretchCol({
      field: 'net_salary_payable',
      headerName: t('payrollManagement.gridColumns.netSalary'),
      minWidth: 110,
      editable: false,
      headerClassName: 'payroll-col-net payroll-col-net-start',
      cellClassName: 'payroll-col-net payroll-col-net-start',
      ...numberEditProps
    }),
    {
      field: 'actions',
      headerName: t('payrollManagement.columns.actions'),
      flex: 0,
      width: 72,
      minWidth: 72,
      maxWidth: 72,
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
