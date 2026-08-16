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
import {
  customColumnField,
  type PayrollCustomColumn,
  mergeColumnOrder,
  PAYROLL_DEFAULT_COLUMN_ORDER,
  placeConstantPartsAfterOther,
  placeCustomColumnsAfterTransport,
} from './payrollColumnPrefs';
import {
  constantPartField,
  isSystemConstantId,
  type PayrollConstantPart,
} from './payrollSalaryRatios';

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
  /** 기본급·주거·기타 셀 직접 수정 허용 */
  allowConstantsEdit?: boolean;
  /** 상수 영역 구성 (없으면 기본 3항) */
  constantParts?: PayrollConstantPart[];
  customColumns?: PayrollCustomColumn[];
  columnOrder?: string[];
};

export function buildPayrollGridColumns({
  t,
  onOpenPayslip,
  handleDeleteRow,
  lockedPeriods,
  isRoot,
  allowCellEdit = true,
  allowDelete = true,
  allowOpenPayslip = true,
  allowConstantsEdit = false,
  constantParts,
  customColumns = [],
  columnOrder,
}: PayrollGridColumnsDeps): GridColDef<PayrollGridRow>[] {
  const parts: PayrollConstantPart[] =
    constantParts && constantParts.length > 0
      ? constantParts
      : [
          { id: 'basic_salary', label: t('payrollManagement.gridColumns.basicSalary'), pct: 50 },
          {
            id: 'house_rent_allowance',
            label: t('payrollManagement.gridColumns.houseRentAllowance'),
            pct: 30,
          },
          { id: 'other_allowance', label: t('payrollManagement.gridColumns.otherAllowance'), pct: 20 },
        ];

  const constantCols: GridColDef<PayrollGridRow>[] = parts.map((part, idx) => {
    const field = constantPartField(part.id);
    const isSystem = isSystemConstantId(part.id);
    return stretchCol({
      field,
      headerName: part.label,
      minWidth: 100,
      editable: allowCellEdit && allowConstantsEdit,
      headerClassName:
        idx === 0 ? 'payroll-col-salary payroll-col-salary-start' : 'payroll-col-salary',
      cellClassName:
        idx === 0 ? 'payroll-col-salary payroll-col-salary-start' : 'payroll-col-salary',
      ...numberEditProps,
      ...(isSystem
        ? {}
        : {
            valueGetter: (_value: unknown, row: PayrollGridRow) =>
              row.constant_parts?.[part.id] ?? 0,
            valueSetter: (value: unknown, row: PayrollGridRow) => {
              const n =
                typeof value === 'number'
                  ? value
                  : parseFloat(String(value ?? '').replace(/,/g, ''));
              return {
                ...row,
                constant_parts: {
                  ...(row.constant_parts || {}),
                  [part.id]: Number.isFinite(n) ? Math.max(0, n) : 0,
                },
              };
            },
          }),
    });
  });

  const customCols: GridColDef<PayrollGridRow>[] = customColumns.map((col) =>
    stretchCol({
      field: customColumnField(col.id),
      headerName: col.label,
      minWidth: 120,
      editable: allowCellEdit,
      headerClassName: 'payroll-col-extra',
      cellClassName: 'payroll-col-extra payroll-col-user-input',
      ...numberEditProps,
      valueGetter: (_value, row) => row.custom_allowances?.[col.id] ?? 0,
      valueSetter: (value, row) => {
        const n =
          typeof value === 'number'
            ? value
            : parseFloat(String(value ?? '').replace(/,/g, ''));
        return {
          ...row,
          custom_allowances: {
            ...(row.custom_allowances || {}),
            [col.id]: Number.isFinite(n) ? Math.max(0, n) : 0,
          },
        };
      },
    })
  );

  const base: GridColDef<PayrollGridRow>[] = [
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
    ...constantCols,
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

  // 커스텀 수당은 기본 위치: 추가 수당(transport_allowance) 다음 → 지급 합계에 합산
  const withCustom: GridColDef<PayrollGridRow>[] = [];
  for (const col of base) {
    withCustom.push(col);
    if (col.field === 'transport_allowance') {
      withCustom.push(...customCols);
    }
  }
  if (!base.some((c) => c.field === 'transport_allowance') && customCols.length) {
    const sumIdx = withCustom.findIndex((c) => c.field === 'sum_total');
    if (sumIdx >= 0) withCustom.splice(sumIdx, 0, ...customCols);
    else withCustom.push(...customCols);
  }

  const byField = new Map(withCustom.map((c) => [c.field, c]));
  const allFields = withCustom.map((c) => c.field);
  const constantFields = parts.map((p) => constantPartField(p.id));
  const customFields = customColumns.map((c) => customColumnField(c.id));
  let order = mergeColumnOrder(
    columnOrder?.length ? columnOrder : PAYROLL_DEFAULT_COLUMN_ORDER,
    allFields
  );
  // 상수 영역 → 기타 수당 옆(근속 다음 ~ 급여합계 앞), 추가 컬럼 → 추가 수당 옆
  order = placeConstantPartsAfterOther(order, constantFields);
  order = placeCustomColumnsAfterTransport(order, customFields);
  return order.map((f) => byField.get(f)!).filter(Boolean);
}
