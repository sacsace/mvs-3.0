import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGrid, GridRowModel } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  Add as AddIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  DeleteOutline as DeleteOutlineIcon,
  Percent as PercentIcon,
  Reorder as ReorderIcon,
} from '@mui/icons-material';
import { payrollService } from '../../services/api';
import type { PayrollGridRow } from './payroll/payrollGridTypes';
import {
  applySalaryRatiosToRow,
  gridRowToPayload,
  recalculatePayrollRow,
  roundOtHour,
  shouldPreferTotalSplit,
  type PayrollRecalcContext,
} from './payroll/payrollGridUtils';
import { buildPayrollGridColumns, PAYROLL_GRID_MIN_WIDTH } from './payroll/payrollGridColumns';
import { payrollDataGridSx } from './payroll/payrollGridStyles';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { mvsBodyOutlinedBtnSx } from '../../theme/mvsLayout';
import {
  createCustomColumnId,
  customColumnField,
  loadPayrollColumnPrefs,
  mergeColumnOrder,
  PAYROLL_DEFAULT_COLUMN_ORDER,
  placeConstantPartsAfterOther,
  placeCustomColumnsAfterTransport,
  savePayrollColumnPrefs,
  type PayrollColumnPrefs,
  type PayrollCustomColumn,
} from './payroll/payrollColumnPrefs';
import {
  DEFAULT_SALARY_RATIOS,
  constantPartField,
  createConstantPartId,
  draftSalaryRatios,
  loadPayrollSalaryRatios,
  normalizeSalaryRatios,
  savePayrollSalaryRatios,
  type PayrollConstantPart,
  type PayrollSalaryRatios,
} from './payroll/payrollSalaryRatios';

export type { PayrollGridRow } from './payroll/payrollGridTypes';
export { computeTenureMonths, payrollRecordToGridRow } from './payroll';

type Props = {
  rows: PayrollGridRow[];
  loading: boolean;
  onReload: () => Promise<void>;
  onError: (msg: string | null) => void;
  onSuccess: (msg: string) => void;
  onOpenPayslip: (row: PayrollGridRow) => void;
  lockedPeriods?: Set<string>;
  isRoot?: boolean;
  allowCellEdit?: boolean;
  allowDelete?: boolean;
  allowOpenPayslip?: boolean;
  /** 회사별 컬럼·상수 설정을 분리하는 회사 ID */
  companyId?: string | number | null;
  companyStateCode?: string | null;
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
  companyId = null,
  companyStateCode = null,
  payrollMonth = null
}) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [prefs, setPrefs] = useState<PayrollColumnPrefs>(() => {
    const loaded = loadPayrollColumnPrefs(companyId);
    const customFields = loaded.customColumns.map((c) => customColumnField(c.id));
    if (customFields.length === 0) return loaded;
    const totalIdx = loaded.order.indexOf('total_salary');
    const stuckInSalaryBlock = customFields.some((f) => {
      const i = loaded.order.indexOf(f);
      return i >= 0 && totalIdx >= 0 && i < totalIdx;
    });
    if (!stuckInSalaryBlock) return loaded;
    const order = placeCustomColumnsAfterTransport(loaded.order, customFields);
    const normalized = { ...loaded, order };
    savePayrollColumnPrefs(normalized, companyId);
    return normalized;
  });
  const [addOpen, setAddOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [salaryRatios, setSalaryRatios] = useState<PayrollSalaryRatios>(() =>
    loadPayrollSalaryRatios(companyId)
  );
  const [ratioDraft, setRatioDraft] = useState<PayrollSalaryRatios>(() =>
    loadPayrollSalaryRatios(companyId)
  );
  const [allowConstantsEdit, setAllowConstantsEdit] = useState(false);
  const [applyingRatios, setApplyingRatios] = useState(false);

  const recalcCtx = useMemo<PayrollRecalcContext>(
    () => ({
      companyStateCode,
      payrollMonth,
      companyId,
      salaryRatios,
    }),
    [companyId, companyStateCode, payrollMonth, salaryRatios]
  );

  useEffect(() => {
    setPrefs(loadPayrollColumnPrefs(companyId));
    const ratios = loadPayrollSalaryRatios(companyId);
    setSalaryRatios(ratios);
    setRatioDraft(ratios);
  }, [companyId]);

  const persistPrefs = useCallback((next: PayrollColumnPrefs) => {
    setPrefs(next);
    savePayrollColumnPrefs(next, companyId);
  }, [companyId]);

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
      const next = { ...(newRow as PayrollGridRow) };
      const prev = oldRow as PayrollGridRow;
      const prevOt = roundOtHour(Number(prev.day_ot_hour) || 0);
      const nextOt = roundOtHour(Number(next.day_ot_hour) || 0);
      if (prevOt !== nextOt) {
        // OT 미적용 직원이어도 그리드에서 시간을 바꾸면 수동 반영
        next.ot_manual = nextOt > 0;
      }
      const row = recalculatePayrollRow(next, recalcCtx, {
        preferTotalSplit: shouldPreferTotalSplit(prev, next),
        salaryRatios,
      });
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
    [allowCellEdit, onError, onReload, onSuccess, recalcCtx, salaryRatios, t]
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
        allowOpenPayslip,
        allowConstantsEdit,
        constantParts: salaryRatios.parts,
        customColumns: prefs.customColumns,
        columnOrder: prefs.order,
      }),
    [
      allowCellEdit,
      allowConstantsEdit,
      allowDelete,
      allowOpenPayslip,
      handleDeleteRow,
      isRoot,
      lockedPeriods,
      onOpenPayslip,
      prefs.customColumns,
      prefs.order,
      salaryRatios.parts,
      t,
    ]
  );

  const orderedFieldsForDialog = useMemo(() => {
    const fields = columns.map((c) => c.field);
    return mergeColumnOrder(prefs.order, fields);
  }, [columns, prefs.order]);

  const headerLabelByField = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) {
      map.set(col.field, String(col.headerName || col.field));
    }
    return map;
  }, [columns]);

  const handleAddColumn = () => {
    const label = newColumnLabel.trim();
    if (!label) return;
    const id = createCustomColumnId(label, prefs.customColumns);
    const field = customColumnField(id);
    const nextCustom: PayrollCustomColumn[] = [...prefs.customColumns, { id, label }];
    const baseOrder =
      prefs.order.length > 0 ? [...prefs.order] : [...PAYROLL_DEFAULT_COLUMN_ORDER];
    const customFields = nextCustom.map((c) => customColumnField(c.id));
    if (!baseOrder.includes(field)) baseOrder.push(field);
    const order = placeCustomColumnsAfterTransport(baseOrder, customFields);
    persistPrefs({ order, customColumns: nextCustom });
    setNewColumnLabel('');
    setAddOpen(false);
    onSuccess(t('payrollManagement.columnAdded', { name: label }));
  };

  const moveColumn = (field: string, dir: -1 | 1) => {
    const order = [...orderedFieldsForDialog];
    const idx = order.indexOf(field);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= order.length) return;
    if (field === 'actions' || order[next] === 'actions') return;
    if (field === 'row_no' || order[next] === 'row_no') return;
    [order[idx], order[next]] = [order[next], order[idx]];
    persistPrefs({ ...prefs, order });
  };

  const removeCustomColumn = (id: string) => {
    const field = customColumnField(id);
    persistPrefs({
      customColumns: prefs.customColumns.filter((c) => c.id !== id),
      order: prefs.order.filter((f) => f !== field),
    });
  };

  const resetColumnOrder = () => {
    const customFields = prefs.customColumns.map((c) => customColumnField(c.id));
    const order = placeCustomColumnsAfterTransport(
      [...PAYROLL_DEFAULT_COLUMN_ORDER],
      customFields
    );
    persistPrefs({
      ...prefs,
      order: mergeColumnOrder(order, [...PAYROLL_DEFAULT_COLUMN_ORDER, ...customFields]),
    });
  };

  const openRatiosDialog = () => {
    const current = loadPayrollSalaryRatios(companyId);
    setSalaryRatios(current);
    setRatioDraft(current);
    setRatiosOpen(true);
  };

  const setPartsDraft = (parts: PayrollConstantPart[]) => {
    setRatioDraft(draftSalaryRatios(parts));
  };

  const updatePartAt = (index: number, patch: Partial<PayrollConstantPart>) => {
    const next = ratioDraft.parts.map((p, i) => (i === index ? { ...p, ...patch } : p));
    setPartsDraft(next);
  };

  const addConstantPart = () => {
    const label = t('payrollManagement.dialog.newConstantPartLabel');
    const id = createConstantPartId(label, ratioDraft.parts);
    setPartsDraft([...ratioDraft.parts, { id, label, pct: 0 }]);
  };

  const removeConstantPart = (index: number) => {
    if (ratioDraft.parts.length <= 1) return;
    setPartsDraft(ratioDraft.parts.filter((_, i) => i !== index));
  };

  const saveRatioSettings = () => {
    void applyRatiosToList();
  };

  const syncConstantColumnsInOrder = (ratios: PayrollSalaryRatios) => {
    const constFields = ratios.parts.map((p) => constantPartField(p.id));
    const customFields = prefs.customColumns.map((c) => customColumnField(c.id));
    let order = placeConstantPartsAfterOther(
      prefs.order.length > 0 ? prefs.order : [...PAYROLL_DEFAULT_COLUMN_ORDER],
      constFields
    );
    order = placeCustomColumnsAfterTransport(order, customFields);
    persistPrefs({
      ...prefs,
      order: mergeColumnOrder(order, [
        ...PAYROLL_DEFAULT_COLUMN_ORDER,
        ...constFields,
        ...customFields,
      ]),
    });
  };

  const applyRatiosToList = async () => {
    const next = normalizeSalaryRatios(ratioDraft);
    savePayrollSalaryRatios(next, companyId);
    setSalaryRatios(next);
    setRatioDraft(next);
    syncConstantColumnsInOrder(next);

    if (!allowCellEdit || rows.length === 0) {
      onSuccess(t('payrollManagement.salaryRatiosSaved'));
      return;
    }

    setApplyingRatios(true);
    onError(null);
    const applyCtx: PayrollRecalcContext = {
      ...recalcCtx,
      salaryRatios: next,
    };
    let ok = 0;
    let fail = 0;
    try {
      for (const row of rows) {
        const period = String(row.working_month || '').trim();
        if (!isRoot && period && lockedPeriods.has(period)) {
          fail += 1;
          continue;
        }
        const updated = applySalaryRatiosToRow(row, next, applyCtx);
        try {
          const payload = gridRowToPayload(updated, applyCtx);
          const res = await payrollService.updatePayroll(updated.id, payload);
          if (res.success) ok += 1;
          else fail += 1;
        } catch {
          fail += 1;
        }
      }
      await onReload();
      if (fail === 0) {
        onSuccess(t('payrollManagement.salaryRatiosApplied', { count: ok }));
        setRatiosOpen(false);
      } else {
        onError(t('payrollManagement.salaryRatiosApplyPartial', { ok, fail }));
      }
    } finally {
      setApplyingRatios(false);
    }
  };

  const ratioSum = ratioDraft.parts.reduce((s, p) => s + p.pct, 0);
  const ratioSumOk = Math.abs(ratioSum - 100) < 0.05;

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

      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1,
          borderBottom: '1px solid #CBD5E1',
          bgcolor: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setAddOpen(true)}
          disabled={!allowCellEdit}
          sx={mvsBodyOutlinedBtnSx}
        >
          {t('payrollManagement.actions.addColumn')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ReorderIcon fontSize="small" />}
          onClick={() => setOrderOpen(true)}
          sx={mvsBodyOutlinedBtnSx}
        >
          {t('payrollManagement.actions.reorderColumns')}
        </Button>
        <Button
          size="small"
          variant={allowConstantsEdit ? 'contained' : 'outlined'}
          startIcon={<PercentIcon fontSize="small" />}
          onClick={openRatiosDialog}
          disabled={!allowCellEdit}
          sx={mvsBodyOutlinedBtnSx}
        >
          {t('payrollManagement.actions.editConstants')}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ ml: { sm: 0.5 } }}>
          {t('payrollManagement.columnToolbarHint')}
          {` · ${t('payrollManagement.salaryRatiosShort', {
            summary: salaryRatios.parts.map((p) => `${p.label} ${p.pct}%`).join(' / '),
          })}`}
        </Typography>
      </Box>

      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <DataGrid
          key={`${i18n.language}-${prefs.order.join('|')}-${prefs.customColumns.map((c) => c.id).join(',')}-${salaryRatios.parts.map((p) => `${p.id}:${p.label}`).join(',')}`}
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
              params.field === 'emp_id' ||
              params.field === 'employee_email' ||
              params.field === 'working_month' ||
              params.field === 'row_no' ||
              params.field === 'actions'
            ) {
              return false;
            }
            if (
              (params.field === 'basic_salary' ||
                params.field === 'house_rent_allowance' ||
                params.field === 'other_allowance' ||
                String(params.field).startsWith('const__')) &&
              !allowConstantsEdit
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
            minWidth: PAYROLL_GRID_MIN_WIDTH + prefs.customColumns.length * 120,
            height: gridBodyHeight,
            minHeight: gridBodyHeight,
            maxHeight: gridBodyHeight,
            border: 'none',
          }}
        />
      </Box>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="xs"
        fullWidth
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogTitle>{t('payrollManagement.dialog.addColumnTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={t('payrollManagement.dialog.columnNameLabel')}
            placeholder="Food Allowance"
            value={newColumnLabel}
            onChange={(e) => setNewColumnLabel(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddColumn();
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t('payrollManagement.dialog.addColumnHint')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleAddColumn} disabled={!newColumnLabel.trim()}>
            {t('payrollManagement.actions.addColumn')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('payrollManagement.dialog.reorderColumnsTitle')}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('payrollManagement.dialog.reorderColumnsHint')}
          </Typography>
          <List dense disablePadding>
            {orderedFieldsForDialog.map((field) => {
              const customId = field.startsWith('custom__') ? field.slice('custom__'.length) : null;
              const lockedEdge = field === 'row_no' || field === 'actions';
              return (
                <ListItem
                  key={field}
                  divider
                  secondaryAction={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                      <IconButton
                        size="small"
                        disabled={lockedEdge}
                        onClick={() => moveColumn(field, -1)}
                        aria-label="up"
                      >
                        <ArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={lockedEdge}
                        onClick={() => moveColumn(field, 1)}
                        aria-label="down"
                      >
                        <ArrowDownIcon fontSize="small" />
                      </IconButton>
                      {customId ? (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeCustomColumn(customId)}
                          aria-label="delete"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      ) : null}
                    </Box>
                  }
                  sx={{ pr: 14 }}
                >
                  <ListItemText
                    primary={headerLabelByField.get(field) || field}
                    secondary={customId ? t('payrollManagement.customColumnBadge') : undefined}
                  />
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetColumnOrder}>{t('payrollManagement.actions.resetColumnOrder')}</Button>
          <Button variant="contained" onClick={() => setOrderOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={ratiosOpen}
        onClose={() => !applyingRatios && setRatiosOpen(false)}
        maxWidth="sm"
        fullWidth
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogTitle>{t('payrollManagement.dialog.salaryRatiosTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('payrollManagement.dialog.salaryRatiosHint')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {ratioDraft.parts.map((part, index) => {
              const isLast = index === ratioDraft.parts.length - 1;
              return (
                <Box
                  key={part.id}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    gap: 1,
                    borderBottom: '1px solid #E2E8F0',
                    pb: 1,
                  }}
                >
                  <TextField
                    size="small"
                    label={t('payrollManagement.dialog.constantNameLabel')}
                    value={part.label}
                    onChange={(e) => updatePartAt(index, { label: e.target.value })}
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{ flex: '1 1 160px', minWidth: 140 }}
                  />
                  <TextField
                    type="number"
                    size="small"
                    label={t('payrollManagement.dialog.constantPctLabel')}
                    value={part.pct}
                    disabled={isLast && ratioDraft.parts.length > 1}
                    onChange={(e) => updatePartAt(index, { pct: Number(e.target.value) })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    helperText={
                      isLast && ratioDraft.parts.length > 1
                        ? t('payrollManagement.dialog.otherPctHelper')
                        : undefined
                    }
                    sx={{ width: 120 }}
                    InputProps={{ endAdornment: <Typography variant="body2">%</Typography> }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    disabled={ratioDraft.parts.length <= 1 || applyingRatios}
                    onClick={() => removeConstantPart(index)}
                    aria-label="delete"
                    sx={{ mt: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
            <Button
              size="small"
              startIcon={<AddIcon fontSize="small" />}
              onClick={addConstantPart}
              disabled={applyingRatios}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('payrollManagement.actions.addConstantPart')}
            </Button>
            <Typography
              variant="caption"
              color={ratioSumOk ? 'text.secondary' : 'error'}
              sx={{ fontWeight: ratioSumOk ? 400 : 700 }}
            >
              {t('payrollManagement.dialog.ratioSumLabel', { sum: Math.round(ratioSum * 100) / 100 })}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allowConstantsEdit}
                  onChange={(e) => setAllowConstantsEdit(e.target.checked)}
                  size="small"
                />
              }
              label={t('payrollManagement.dialog.allowConstantsCellEdit')}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
          <Button
            onClick={() => {
              setRatioDraft({
                parts: DEFAULT_SALARY_RATIOS.parts.map((p) => ({ ...p })),
              });
            }}
            disabled={applyingRatios}
          >
            {t('payrollManagement.actions.resetRatios')}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setRatiosOpen(false)} disabled={applyingRatios}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={saveRatioSettings}
            disabled={applyingRatios || !ratioSumOk || ratioDraft.parts.some((p) => !p.label.trim())}
            variant="outlined"
          >
            {t('payrollManagement.actions.saveRatios')}
          </Button>
          <Button
            onClick={() => void applyRatiosToList()}
            disabled={
              applyingRatios ||
              !ratioSumOk ||
              rows.length === 0 ||
              ratioDraft.parts.some((p) => !p.label.trim())
            }
            variant="contained"
          >
            {t('payrollManagement.actions.applyRatiosToList')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PayrollExcelGrid;
