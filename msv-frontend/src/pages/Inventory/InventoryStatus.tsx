import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  InputAdornment,
  Chip,
  Alert,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { Search as SearchIcon, Warning as WarningIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material/styles';
import { inventoryService } from '../../services/api';
import { UTILS } from '../../constants';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';
import { mvsTableHeadHighlightSx } from '../../theme/mvsLayout';

const INVENTORY_STATUS_MENU_ROUTES = ['/inventory/status', '/inventory'] as const;

const inventoryFilterLabelSx = {
  color: 'text.secondary',
  fontWeight: 600,
  mb: 0.5,
  display: 'block',
  fontSize: '0.75rem',
  lineHeight: '18px',
  minHeight: 18,
} as const;

type StatusRow = {
  id: number;
  productCode: string;
  productName: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  lastUpdated: string;
};

type TxRow = {
  id: number;
  transaction_type?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total_amount?: number | string;
  notes?: string | null;
  created_at?: string;
  created_by?: number;
  creator?: { username?: string; email?: string } | null;
  product?: { name?: string; product_code?: string };
};

function formatTransactionCreator(tx: TxRow): string {
  const u = tx.creator;
  if (u?.username?.trim()) return u.username.trim();
  if (u?.email?.trim()) return u.email.trim();
  if (tx.created_by != null) return `#${tx.created_by}`;
  return '—';
}

/** 재고율(%) = (현재재고 ÷ 최대재고) × 100 — 최대재고를 100% 기준. 최대재고 미설정(≤0)이면 null */
function stockRatePercentVsMax(current: number, max: number): number | null {
  if (!(max > 0) || !Number.isFinite(max)) return null;
  const c = Number(current);
  if (!Number.isFinite(c)) return null;
  return (c / max) * 100;
}

type StatusSortKey =
  | 'productCode'
  | 'productName'
  | 'category'
  | 'currentStock'
  | 'minStock'
  | 'maxStock'
  | 'stockRate'
  | 'unitPrice'
  | 'totalValue'
  | 'status';

function getStatusSortRank(item: StatusRow): number {
  if (item.currentStock === 0) return 0;
  if (item.minStock > 0 && item.currentStock <= item.minStock) return 1;
  if (item.maxStock > 0 && item.currentStock >= item.maxStock * 0.9) return 2;
  return 3;
}

function compareStatusRows(a: StatusRow, b: StatusRow, orderBy: StatusSortKey): number {
  switch (orderBy) {
    case 'productCode':
      return a.productCode.localeCompare(b.productCode, undefined, { sensitivity: 'base' });
    case 'productName':
      return a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' });
    case 'category':
      return a.category.localeCompare(b.category, undefined, { sensitivity: 'base' });
    case 'currentStock':
      return a.currentStock - b.currentStock;
    case 'minStock':
      return a.minStock - b.minStock;
    case 'maxStock':
      return a.maxStock - b.maxStock;
    case 'stockRate': {
      const ra = stockRatePercentVsMax(a.currentStock, a.maxStock);
      const rb = stockRatePercentVsMax(b.currentStock, b.maxStock);
      const na = ra == null ? Number.NEGATIVE_INFINITY : ra;
      const nb = rb == null ? Number.NEGATIVE_INFINITY : rb;
      return na - nb;
    }
    case 'unitPrice':
      return a.unitPrice - b.unitPrice;
    case 'totalValue':
      return a.totalValue - b.totalValue;
    case 'status':
      return getStatusSortRank(a) - getStatusSortRank(b);
    default:
      return 0;
  }
}

const InventoryStatus: React.FC = () => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'ko-KR';
  const menuFlags = useMenuRoutePermissionFlags(INVENTORY_STATUS_MENU_ROUTES);

  const [inventoryItems, setInventoryItems] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState<StatusSortKey>('productCode');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StatusRow | null>(null);
  const [txRows, setTxRows] = useState<TxRow[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [txTotal, setTxTotal] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [productsRes, reportRes] = await Promise.all([
        inventoryService.getProducts({ page: 1, limit: 2000, search: '', category: '' }),
        inventoryService.getInventoryReport()
      ]);

      if (!productsRes?.success || !Array.isArray(productsRes.data)) {
        setInventoryItems([]);
        setLoadError(t('inventoryStatus.errors.loadListFailed'));
        return;
      }

      const rows: StatusRow[] = productsRes.data.map((product: Record<string, unknown>) => {
        const currentStock = Number(product.stock_quantity ?? product.current_stock ?? 0);
        const minStock = Number(product.min_stock_level ?? product.min_stock ?? 0);
        const maxStock = Number(product.max_stock_level ?? product.max_stock ?? 0);
        const unitPrice = parseFloat(String(product.unit_price ?? 0));
        return {
          id: Number(product.id),
          productCode: String(product.product_code ?? product.sku ?? ''),
          productName: String(product.name ?? ''),
          category: String(product.category ?? ''),
          currentStock,
          minStock,
          maxStock,
          unitPrice,
          totalValue: currentStock * unitPrice,
          lastUpdated: product.updated_at
            ? new Date(String(product.updated_at)).toISOString().split('T')[0]
            : ''
        };
      });
      setInventoryItems(rows);

      if (reportRes?.success && reportRes.data?.stats) {
        const s = reportRes.data.stats;
        setStats({
          totalProducts: Number(s.totalProducts ?? rows.length),
          totalValue: Number(s.totalValue ?? 0),
          lowStockItems: Number(s.lowStockItems ?? 0),
          outOfStockItems: Number(s.outOfStockItems ?? 0)
        });
      } else {
        let totalValue = 0;
        let low = 0;
        let out = 0;
        rows.forEach((r) => {
          totalValue += r.totalValue;
          if (r.currentStock === 0) out++;
          else if (r.minStock > 0 && r.currentStock <= r.minStock) low++;
        });
        setStats({
          totalProducts: rows.length,
          totalValue,
          lowStockItems: low,
          outOfStockItems: out
        });
      }
    } catch (e: unknown) {
      console.error(e);
      setLoadError(t('inventoryStatus.errors.loadDataError'));
      setInventoryItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (menuFlags.menusLoading || !menuFlags.canRead) return;
    loadData();
  }, [loadData, menuFlags.menusLoading, menuFlags.canRead]);

  const formatTxTypeChip = useCallback(
    (txType?: string) => {
      if (!txType) return { label: '—', color: 'default' as const };
      const map: Record<string, { key: 'in' | 'out' | 'adjustment' | 'transfer'; color: 'success' | 'error' | 'warning' | 'info' }> = {
        in: { key: 'in', color: 'success' },
        out: { key: 'out', color: 'error' },
        adjustment: { key: 'adjustment', color: 'warning' },
        transfer: { key: 'transfer', color: 'info' }
      };
      const m = map[txType];
      if (m) return { label: t(`inventoryStatus.txType.${m.key}`), color: m.color };
      return { label: txType, color: 'default' as const };
    },
    [t]
  );

  const getStatusInfo = (item: StatusRow) => {
    const is = { fontSize: '0.875rem' as const };
    if (item.currentStock === 0) {
      return {
        label: t('inventoryStatus.rowStatus.outOfStock'),
        chipTone: 'error' as const,
        icon: <ErrorIcon sx={{ ...is, color: alpha(theme.palette.error.main, 0.85) }} />
      };
    }
    if (item.minStock > 0 && item.currentStock <= item.minStock) {
      return {
        label: t('inventoryStatus.rowStatus.lowStock'),
        chipTone: 'error' as const,
        icon: <WarningIcon sx={{ ...is, color: alpha(theme.palette.error.main, 0.9) }} />
      };
    }
    if (item.maxStock > 0 && item.currentStock >= item.maxStock * 0.9) {
      return {
        label: t('inventoryStatus.rowStatus.overstock'),
        chipTone: 'info' as const,
        icon: <WarningIcon sx={{ ...is, color: alpha(theme.palette.info.main, 0.88) }} />
      };
    }
    return {
      label: t('inventoryStatus.rowStatus.normal'),
      chipTone: 'success' as const,
      icon: <CheckCircleIcon sx={{ ...is, color: alpha(theme.palette.success.main, 0.85) }} />
    };
  };

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return inventoryItems;
    return inventoryItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) || item.productCode.toLowerCase().includes(q)
    );
  }, [inventoryItems, searchTerm]);

  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    copy.sort((a, b) => {
      const c = compareStatusRows(a, b, orderBy);
      return order === 'asc' ? c : -c;
    });
    return copy;
  }, [filteredItems, orderBy, order]);

  const handleRequestSort = useCallback((property: StatusSortKey) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  }, [orderBy, order]);

  const formatCurrency = (amount: number) => UTILS.formatCurrency(amount);

  const openTxDialog = useCallback(async (row: StatusRow) => {
    if (!menuFlags.canRead) return;
    setSelectedRow(row);
    setTxDialogOpen(true);
    setTxRows([]);
    setTxError('');
    setTxLoading(true);
    setTxTotal(0);
    try {
      const res = await inventoryService.getInventoryTransactions({
        product_id: row.id,
        page: 1,
        limit: 1000
      });
      if (res?.success && Array.isArray(res.data)) {
        setTxRows(res.data as TxRow[]);
        setTxTotal(Number((res as { pagination?: { total?: number } }).pagination?.total ?? res.data.length));
      } else {
        setTxError(t('inventoryStatus.errors.txLoadFailed'));
      }
    } catch {
      setTxError(t('inventoryStatus.errors.txLoadError'));
    } finally {
      setTxLoading(false);
    }
  }, [t, menuFlags.canRead]);

  const closeTxDialog = useCallback(() => {
    setTxDialogOpen(false);
    setSelectedRow(null);
    setTxRows([]);
    setTxError('');
  }, []);

  const softChipSx = (tone: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary') => {
    const light = theme.palette.mode === 'light';
    if (tone === 'default') {
      return {
        height: 26,
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.6875rem',
        border: `1px solid ${light ? 'rgba(15, 23, 42, 0.12)' : theme.palette.divider}`,
        bgcolor: light ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.06),
        color: 'text.secondary',
      } as const;
    }
    const main =
      tone === 'primary'
        ? theme.palette.primary.main
        : tone === 'secondary'
          ? theme.palette.secondary.main
          : theme.palette[tone].main;
    const dark =
      tone === 'primary'
        ? theme.palette.primary.dark
        : tone === 'secondary'
          ? theme.palette.secondary.dark
          : theme.palette[tone].dark;
    return {
      height: 26,
      borderRadius: '8px',
      fontWeight: 600,
      fontSize: '0.6875rem',
      border: `1px solid ${alpha(main, light ? 0.3 : 0.42)}`,
      bgcolor: alpha(main, light ? 0.08 : 0.12),
      color: dark,
    } as const;
  };

  const txTypeChipSx = (c: 'default' | 'success' | 'error' | 'warning' | 'info') => {
    if (c === 'success') return softChipSx('success');
    if (c === 'error') return softChipSx('error');
    if (c === 'warning') return softChipSx('warning');
    if (c === 'info') return softChipSx('info');
    return softChipSx('default');
  };

  const kpiCardSx = {
    borderRadius: '16px',
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
    boxShadow:
      theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)',
    bgcolor: 'background.paper',
  } as const;

  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          component="h1"
          variant="pageTitle"
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1.125rem', sm: '1.3125rem' },
            letterSpacing: '-0.022em',
            lineHeight: 1.28,
            color: 'text.primary',
            mb: 0.75,
          }}
        >
          {t('inventoryStatus.pageTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.5, maxWidth: 720 }}>
          {t('inventoryStatus.pageSubtitle')}
        </Typography>
      </Box>

      {loadError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      {!menuFlags.menusLoading && !menuFlags.canRead ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('common.menuNoView')}
        </Alert>
      ) : null}

      {/* 요약 카드 — 재고 보고서 API 통계 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 3 }}>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('inventoryStatus.stats.totalValue')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
              {loading ? '…' : formatCurrency(stats.totalValue)}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('inventoryStatus.stats.lowStock')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'error.main' }}>
              {loading ? '…' : t('inventoryStatus.statsCountSuffix', { count: stats.lowStockItems })}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('inventoryStatus.stats.outOfStock')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'error.main' }}>
              {loading ? '…' : t('inventoryStatus.statsCountSuffix', { count: stats.outOfStockItems })}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={kpiCardSx}>
          <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('inventoryStatus.stats.totalProducts')}
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
              {loading ? '…' : t('inventoryStatus.statsCountSuffix', { count: stats.totalProducts })}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {!loading && (stats.lowStockItems > 0 || stats.outOfStockItems > 0) ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('inventoryStatus.alertLowOut', { low: stats.lowStockItems, out: stats.outOfStockItems })}
        </Alert>
      ) : null}

      {/* 검색 */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '18px',
          border: '1px solid #C5CED9',
          bgcolor: '#F0F4F8',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' },
              gap: 2,
              alignItems: 'flex-end',
              maxWidth: { sm: 640 },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={inventoryFilterLabelSx}>
                {t('inventoryStatus.searchLabel')}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={t('inventoryStatus.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={menuFlags.menusLoading || !menuFlags.canRead}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 40,
                    borderRadius: '12px',
                    bgcolor: '#FFFFFF',
                    '& .MuiOutlinedInput-input': { py: 0 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#C5CED9' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8C4D0' },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 재고 현황 테이블 */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          bgcolor: 'transparent',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: '-0.01em', color: 'text.primary' }}>
              {t('inventoryStatus.tableTitle')}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : filteredItems.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, px: 2.5, textAlign: 'center' }}>
              {t('inventoryStatus.emptyTable')}
            </Typography>
          ) : (
            <TableContainer sx={{ bgcolor: 'transparent' }}>
              <Table
                size="small"
                sx={{
                  borderCollapse: 'collapse',
                  '& .MuiTableCell-root': {
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                  },
                }}
              >
                <TableHead sx={mvsTableHeadHighlightSx}>
                  <TableRow>
                    <TableCell sortDirection={orderBy === 'productCode' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'productCode'}
                        direction={orderBy === 'productCode' ? order : 'asc'}
                        onClick={() => handleRequestSort('productCode')}
                      >
                        {t('inventoryStatus.columns.productCode')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'productName' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'productName'}
                        direction={orderBy === 'productName' ? order : 'asc'}
                        onClick={() => handleRequestSort('productName')}
                      >
                        {t('inventoryStatus.columns.productName')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'category' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'category'}
                        direction={orderBy === 'category' ? order : 'asc'}
                        onClick={() => handleRequestSort('category')}
                      >
                        {t('inventoryStatus.columns.category')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'currentStock' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'currentStock'}
                        direction={orderBy === 'currentStock' ? order : 'asc'}
                        onClick={() => handleRequestSort('currentStock')}
                      >
                        {t('inventoryStatus.columns.currentStock')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'minStock' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'minStock'}
                        direction={orderBy === 'minStock' ? order : 'asc'}
                        onClick={() => handleRequestSort('minStock')}
                      >
                        {t('inventoryStatus.columns.minStock')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'maxStock' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'maxStock'}
                        direction={orderBy === 'maxStock' ? order : 'asc'}
                        onClick={() => handleRequestSort('maxStock')}
                      >
                        {t('inventoryStatus.columns.maxStock')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'stockRate' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'stockRate'}
                        direction={orderBy === 'stockRate' ? order : 'asc'}
                        onClick={() => handleRequestSort('stockRate')}
                      >
                        {t('inventoryStatus.columns.stockRate')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'unitPrice' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'unitPrice'}
                        direction={orderBy === 'unitPrice' ? order : 'asc'}
                        onClick={() => handleRequestSort('unitPrice')}
                      >
                        {t('inventoryStatus.columns.unitPrice')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'totalValue' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'totalValue'}
                        direction={orderBy === 'totalValue' ? order : 'asc'}
                        onClick={() => handleRequestSort('totalValue')}
                      >
                        {t('inventoryStatus.columns.totalValue')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'status' ? order : false}>
                      <TableSortLabel
                        disabled={menuFlags.menusLoading || !menuFlags.canRead}
                        active={orderBy === 'status'}
                        direction={orderBy === 'status' ? order : 'asc'}
                        onClick={() => handleRequestSort('status')}
                      >
                        {t('inventoryStatus.columns.status')}
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody
                  sx={{
                    '& .MuiTableCell-body': {
                      py: 1.5,
                      px: 2,
                      fontSize: '0.875rem',
                      borderBottom: `1px solid ${
                        theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                      }`,
                    },
                    '& .MuiTableRow-root:last-of-type .MuiTableCell-body': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  {sortedItems.map((item) => {
                    const statusInfo = getStatusInfo(item);
                    const ratePct = stockRatePercentVsMax(item.currentStock, item.maxStock);
                    const barFill = ratePct == null ? 0 : Math.min(ratePct, 100);
                    const lowOrOut = item.currentStock === 0 || (item.minStock > 0 && item.currentStock <= item.minStock);
                    const highStock = item.maxStock > 0 && item.currentStock >= item.maxStock * 0.9 && !lowOrOut;

                    return (
                      <TableRow
                        key={item.id}
                        hover
                        onClick={menuFlags.canRead ? () => void openTxDialog(item) : undefined}
                        sx={{
                          cursor: menuFlags.canRead ? 'pointer' : 'default',
                          transition: 'background-color 0.15s ease',
                          '&:hover': { bgcolor: 'action.hover' },
                          '&:active': { bgcolor: menuFlags.canRead ? 'action.selected' : undefined },
                        }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {item.productCode}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 'bold',
                              color: lowOrOut ? 'error.main' : 'text.primary'
                            }}
                          >
                            {t('inventoryStatus.pieces', { n: item.currentStock })}
                          </Typography>
                        </TableCell>
                        <TableCell>{t('inventoryStatus.pieces', { n: item.minStock })}</TableCell>
                        <TableCell>{t('inventoryStatus.pieces', { n: item.maxStock })}</TableCell>
                        <TableCell>
                          <Box sx={{ width: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={barFill}
                              color={lowOrOut ? 'error' : highStock ? 'warning' : 'success'}
                              sx={{
                                mb: 0.5,
                                height: 6,
                                borderRadius: '4px',
                                bgcolor:
                                  theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : alpha(theme.palette.common.white, 0.08),
                                '& .MuiLinearProgress-bar': { borderRadius: '4px' },
                              }}
                            />
                            <Typography
                              variant="caption"
                              sx={{ color: lowOrOut ? 'error.main' : 'text.secondary' }}
                            >
                              {ratePct == null ? '—' : `${ratePct.toFixed(1)}%`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(item.totalValue)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={statusInfo.icon}
                            label={statusInfo.label}
                            size="small"
                            sx={{
                              ...softChipSx(statusInfo.chipTone),
                              '& .MuiChip-icon': { color: 'inherit', opacity: 0.92, ml: '6px' },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={txDialogOpen} onClose={closeTxDialog} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ pr: 6 }}>
          {t('inventoryStatus.txDialog.title')}
          {selectedRow ? (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 400 }}>
              {selectedRow.productName} · {selectedRow.productCode}
            </Typography>
          ) : null}
        </DialogTitle>
        <DialogContent dividers>
          {txLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : txError ? (
            <Alert severity="error">{txError}</Alert>
          ) : txRows.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {t('inventoryStatus.txDialog.noRecords')}
            </Typography>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {t('inventoryStatus.txDialog.totalShown', { total: txTotal })}
              </Typography>
              <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead
                    sx={{
                      '& .MuiTableCell-head': {
                        bgcolor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : alpha(theme.palette.common.white, 0.04),
                        color: theme.palette.mode === 'light' ? 'rgba(60, 60, 67, 0.6)' : theme.palette.grey[300],
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        letterSpacing: '0.01em',
                        borderBottom: `1px solid ${
                          theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.06)' : theme.palette.divider
                        }`,
                        py: 1.25,
                        px: 1.5,
                      },
                    }}
                  >
                    <TableRow>
                      <TableCell width={160}>{t('inventoryStatus.txColumns.datetime')}</TableCell>
                      <TableCell width={100}>{t('inventoryStatus.txColumns.type')}</TableCell>
                      <TableCell width={120}>{t('inventoryStatus.txColumns.handler')}</TableCell>
                      <TableCell align="right">{t('inventoryStatus.txColumns.quantity')}</TableCell>
                      <TableCell align="right">{t('inventoryStatus.txColumns.unitPrice')}</TableCell>
                      <TableCell align="right">{t('inventoryStatus.txColumns.amount')}</TableCell>
                      <TableCell>{t('inventoryStatus.txColumns.notes')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {txRows.map((tx) => {
                      const tinfo = formatTxTypeChip(tx.transaction_type);
                      const qty = Number(tx.quantity ?? 0);
                      const at = tx.created_at ? new Date(tx.created_at) : null;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {at && !Number.isNaN(at.getTime())
                              ? at.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'medium' })
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={tinfo.label} sx={txTypeChipSx(tinfo.color)} />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTransactionCreator(tx)}</TableCell>
                          <TableCell align="right">{qty.toLocaleString(locale)}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(tx.unit_price ?? 0))}</TableCell>
                          <TableCell align="right">{formatCurrency(Number(tx.total_amount ?? 0))}</TableCell>
                          <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>{tx.notes?.trim() || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={closeTxDialog}
            variant="contained"
            disableElevation
            sx={{ textTransform: 'none', borderRadius: '12px', px: 2.5 }}
          >
            {t('inventoryStatus.txDialog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryStatus;
