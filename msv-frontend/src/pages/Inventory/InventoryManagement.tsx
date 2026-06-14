import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  Snackbar,
  Pagination,
  InputAdornment,
  TableSortLabel,
  Stack,
  Divider,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import MvsPageHeader from '../../components/Common/MvsPageHeader';
import { mvsPageRootSx, mvsFilterToolbarSx, mvsSearchFieldSx, mvsOutlinedLabelProps } from '../../theme/mvsLayout';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  UploadFile as UploadFileIcon,
  Warehouse as WarehouseIcon,
  Category as CategoryIcon,
  Print as PrintIcon,
  Scale as ScaleIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material/styles';
import { api, inventoryService, partnerService } from '../../services/api';
import { useReferenceDataStore } from '../../store/referenceDataStore';
import { resolveMediaUrl } from '../../utils/uploadUrl';
import { useMenuStore, useStore } from '../../store';
import { findMenuIdByPath } from '../../utils/findMenuByPath';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const resolveProductImageUrl = resolveMediaUrl;

/** 재고 목록 테이블 열 비율(상대 가중치) — 합계 대비 %로 너비 분배, 뷰포트에 맞춤 */
const INV_COL_DEFAULTS: Record<string, number> = {
  status: 132,
  name: 240,
  sku: 128,
  category: 144,
  currentStock: 120,
  unitPrice: 112,
  totalValue: 120,
  supplier: 200,
  location: 128,
  lastUpdated: 120,
  actions: 84
};

const INV_COL_TOTAL = Object.values(INV_COL_DEFAULTS).reduce((s, n) => s + n, 0);

/** DB `menus.route` — 기본재고 등록 (`App.tsx` `/inventory/basic`) */
const INVENTORY_BASIC_MENU_ROUTES = ['/inventory/basic', '/inventory'];

const FILTER_OUTLINED = mvsOutlinedLabelProps;
const FORM_OUTLINED = mvsOutlinedLabelProps;

const inventoryFilterFieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 40,
    '& .MuiOutlinedInput-input': { py: 0 },
  },
} as const;

function invColWidthPct(key: string): string {
  const w = INV_COL_DEFAULTS[key] ?? 80;
  return `${(w / INV_COL_TOTAL) * 100}%`;
}

/** 헤더·본문 동일 정렬 — 재고·단가·총액은 좌측, 날짜는 우측, 상태·작업은 중앙 */
const INV_COL_ALIGN: Record<string, 'left' | 'right' | 'center'> = {
  status: 'center',
  name: 'left',
  sku: 'left',
  category: 'left',
  currentStock: 'left',
  unitPrice: 'left',
  totalValue: 'left',
  supplier: 'left',
  location: 'left',
  lastUpdated: 'right',
  actions: 'center',
};

function invColTableAlign(key: string): 'left' | 'right' | 'center' {
  return INV_COL_ALIGN[key] ?? 'left';
}

const INV_TD_ELLIPSIS_KEYS = new Set(['name', 'sku', 'category', 'supplier', 'location']);

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
  supplier: string;
  /** 협력업체(파트너) 연결 */
  partnerId?: number | '' | null;
  location: string;
  imageUrl?: string;
  /** 판매/재고 단위 */
  unit?: string;
}

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const InventoryManagement: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useStore();
  const { menus, hasMenuPermission, loading: menusLoading } = useMenuStore();
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  /** 목록 행 클릭 시 보기 → 하단 수정으로 편집 / 재고 추가는 바로 편집 */
  const [inventoryDialogMode, setInventoryDialogMode] = useState<'view' | 'edit'>('edit');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [orderBy, setOrderBy] = useState<keyof InventoryItem | ''>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [excelUploading, setExcelUploading] = useState(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [categoryManageOpen, setCategoryManageOpen] = useState(false);
  const [warehouseManageOpen, setWarehouseManageOpen] = useState(false);
  const [categoryManageList, setCategoryManageList] = useState<{ id: number; name: string }[]>([]);
  const [warehouseManageList, setWarehouseManageList] = useState<{ id: number; name: string }[]>([]);
  const [categoryManageLoading, setCategoryManageLoading] = useState(false);
  const [warehouseManageLoading, setWarehouseManageLoading] = useState(false);
  const [masterDialogSaving, setMasterDialogSaving] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newWarehouseInput, setNewWarehouseInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<{ id: number; name: string } | null>(null);
  const [unitManageOpen, setUnitManageOpen] = useState(false);
  const [unitManageList, setUnitManageList] = useState<{ id: number; name: string }[]>([]);
  const [unitManageLoading, setUnitManageLoading] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');
  const [editingUnit, setEditingUnit] = useState<{ id: number; name: string } | null>(null);

  const elevated = user?.role === 'root' || user?.role === 'admin';
  const basicMenuFlags = useMemo(() => {
    const check = (action: 'view' | 'create' | 'edit' | 'delete') => {
      if (elevated) return true;
      for (const route of INVENTORY_BASIC_MENU_ROUTES) {
        const mid = findMenuIdByPath(menus, route);
        if (mid != null && hasMenuPermission(mid, action)) return true;
      }
      return false;
    };
    return {
      canRead: check('view') || check('create'),
      canCreate: check('create'),
      canEdit: check('edit'),
      canDelete: check('delete'),
      canMutate: check('create') || check('edit')
    };
  }, [menus, hasMenuPermission, elevated]);

  useEffect(() => {
    if (menusLoading || !basicMenuFlags.canRead) return;
    loadInventoryData();
  }, [page, searchTerm, categoryFilter, warehouseFilter, menusLoading, basicMenuFlags.canRead]);

  useEffect(() => {
    if (menusLoading || !basicMenuFlags.canRead) return;
    void loadWarehouseManageList();
  }, [menusLoading, basicMenuFlags.canRead]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [productsResponse, reportResponse] = await Promise.all([
        inventoryService.getProducts({
          page,
          limit: itemsPerPage,
          search: searchTerm,
          category: categoryFilter,
          ...(warehouseFilter.trim() ? { location: warehouseFilter.trim() } : {})
        }),
        inventoryService.getInventoryReport()
      ]);
      
      if (productsResponse.success && productsResponse.data) {
        // 백엔드 데이터를 프론트엔드 형식으로 변환
        const transformedData = productsResponse.data.map((product: any) => {
          // 재고 상태 계산
          const currentStock = product.stock_quantity || product.current_stock || 0;
          const minStock = product.min_stock_level || product.min_stock || 0;
          const maxStock = product.max_stock_level || product.max_stock || 0;
          
          let status = 'in_stock';
          if (currentStock === 0) {
            status = 'out_of_stock';
          } else if (minStock && currentStock <= minStock) {
            status = 'low_stock';
          }
          
          return {
            id: product.id,
            name: product.name,
            sku: product.product_code || product.sku || '',
            category: product.category || '',
            currentStock: currentStock,
            minStock: minStock,
            maxStock: maxStock,
            unitPrice: parseFloat(product.unit_price || 0),
            totalValue: currentStock * parseFloat(product.unit_price || 0),
            status: status,
            lastUpdated: product.updated_at ? new Date(product.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            supplier: product.supplier || '',
            partnerId: product.partner_id != null ? Number(product.partner_id) : '',
            location: product.location || '',
            imageUrl: product.image_url || '',
            unit: product.unit || 'Piece'
          };
        });
        setInventoryItems(transformedData);
        
        // 페이지네이션 정보 업데이트
        if (productsResponse.pagination) {
          setTotalPages(productsResponse.pagination.totalPages || 1);
          setTotalItems(productsResponse.pagination.total || 0);
        }
      } else {
        setInventoryItems([]);
        setTotalPages(1);
        setTotalItems(0);
      }

      if (reportResponse?.success && reportResponse?.data?.stats) {
        setInventoryStats({
          totalProducts: Number(reportResponse.data.stats.totalProducts || 0),
          totalValue: Number(reportResponse.data.stats.totalValue || 0),
          lowStockItems: Number(reportResponse.data.stats.lowStockItems || 0),
          outOfStockItems: Number(reportResponse.data.stats.outOfStockItems || 0)
        });
      } else {
        setInventoryStats({
          totalProducts: 0,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0
        });
      }

      const categoryNames = (reportResponse?.data?.categoryDistribution || [])
        .map((category: any) => String(category?.name || '').trim())
        .filter((name: string) => name.length > 0);
      setCategories(Array.from(new Set(categoryNames)));
    } catch (error: any) {
      console.error('재고 데이터 로드 오류:', error);
      setError(error.response?.data?.message || t('inventoryManagement.messages.loadError'));
      setInventoryItems([]);
      setTotalPages(1);
      setTotalItems(0);
      setInventoryStats({
        totalProducts: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterItems();
  }, [inventoryItems, statusFilter]);

  const filterItems = () => {
    // 검색과 카테고리는 API에서 처리되므로, 상태 필터만 클라이언트에서 처리
    let filtered = inventoryItems;

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  };

  const getStatusIcon = (status: string) => {
    const sx = { fontSize: '1.125rem' as const };
    switch (status) {
      case 'in_stock':
        return <TrendingUpIcon sx={{ ...sx, color: alpha(theme.palette.success.main, 0.85) }} />;
      case 'low_stock':
        return <WarningIcon sx={{ ...sx, color: alpha(theme.palette.warning.main, 0.9) }} />;
      case 'out_of_stock':
        return <TrendingDownIcon sx={{ ...sx, color: alpha(theme.palette.error.main, 0.85) }} />;
      default:
        return <InventoryIcon sx={{ ...sx, color: 'text.disabled' }} />;
    }
  };

  const handleCloseInventoryDialog = () => {
    setOpenDialog(false);
    setInventoryDialogMode('edit');
  };

  const handleAddItem = () => {
    if (!basicMenuFlags.canCreate) {
      setError(t('inventoryManagement.messages.noPermissionCreate'));
      return;
    }
    setSelectedItem(null);
    setInventoryDialogMode('edit');
    setOpenDialog(true);
  };

  const handleOpenView = (item: InventoryItem) => {
    if (basicMenuFlags.canRead) {
      setSelectedItem(item);
      setInventoryDialogMode('view');
      setOpenDialog(true);
      return;
    }
    if (basicMenuFlags.canEdit) {
      setSelectedItem(item);
      setInventoryDialogMode('edit');
      setOpenDialog(true);
      return;
    }
    setError(t('inventoryManagement.messages.noPermissionView'));
  };

  const loadCategoryManageList = async () => {
    setCategoryManageLoading(true);
    try {
      const res = await inventoryService.getProductCategories();
      if (res?.success && Array.isArray(res.data)) {
        setCategoryManageList(
          res.data.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name }))
        );
      } else {
        setCategoryManageList([]);
      }
    } catch (e) {
      console.error(e);
      setCategoryManageList([]);
    } finally {
      setCategoryManageLoading(false);
    }
  };

  const loadWarehouseManageList = async () => {
    setWarehouseManageLoading(true);
    try {
      const res = await inventoryService.getInventoryLocations();
      if (res?.success && Array.isArray(res.data)) {
        setWarehouseManageList(
          res.data.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name }))
        );
      } else {
        setWarehouseManageList([]);
      }
    } catch (e) {
      console.error(e);
      setWarehouseManageList([]);
    } finally {
      setWarehouseManageLoading(false);
    }
  };

  const handleAddCategoryRow = async () => {
    const name = newCategoryInput.trim();
    if (!name) return;
    setMasterDialogSaving(true);
    setError('');
    try {
      const res = await inventoryService.createProductCategory(name);
      if (res?.success) {
        setNewCategoryInput('');
        setSuccess(t('inventoryManagement.messages.masterCategorySaved'));
        await loadCategoryManageList();
        loadInventoryData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterDialogSaving(false);
    }
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return;
    setMasterDialogSaving(true);
    setError('');
    try {
      const res = await inventoryService.updateProductCategory(editingCategory.id, name);
      if (res?.success) {
        setEditingCategory(null);
        setSuccess(t('inventoryManagement.messages.masterCategoryUpdated'));
        await loadCategoryManageList();
        loadInventoryData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterDialogSaving(false);
    }
  };

  const handleDeleteCategoryRow = (row: { id: number; name: string }) => {
    showConfirm(
      t('inventoryManagement.messages.deleteCategoryConfirm', { name: row.name }),
      () => {
        void (async () => {
          setMasterDialogSaving(true);
          setError('');
          try {
            const res = await inventoryService.deleteProductCategory(row.id);
            if (res?.success) {
              setSuccess(t('inventoryManagement.messages.masterCategoryDeleted'));
              await loadCategoryManageList();
              loadInventoryData();
            }
          } catch (err: any) {
            setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
          } finally {
            setMasterDialogSaving(false);
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
  };

  const handleAddWarehouseRow = async () => {
    const name = newWarehouseInput.trim();
    if (!name) return;
    setMasterDialogSaving(true);
    setError('');
    try {
      const res = await inventoryService.createInventoryLocation(name);
      if (res?.success) {
        setNewWarehouseInput('');
        setSuccess(t('inventoryManagement.messages.masterWarehouseSaved'));
        await loadWarehouseManageList();
        loadInventoryData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterDialogSaving(false);
    }
  };

  const handleSaveEditWarehouse = async () => {
    if (!editingWarehouse) return;
    const name = editingWarehouse.name.trim();
    if (!name) return;
    setMasterDialogSaving(true);
    setError('');
    try {
      const res = await inventoryService.updateInventoryLocation(editingWarehouse.id, name);
      if (res?.success) {
        setEditingWarehouse(null);
        setSuccess(t('inventoryManagement.messages.masterWarehouseUpdated'));
        await loadWarehouseManageList();
        loadInventoryData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterDialogSaving(false);
    }
  };

  const handleDeleteWarehouseRow = (row: { id: number; name: string }) => {
    showConfirm(
      t('inventoryManagement.messages.deleteWarehouseConfirm', { name: row.name }),
      () => {
        void (async () => {
          setMasterDialogSaving(true);
          setError('');
          try {
            const res = await inventoryService.deleteInventoryLocation(row.id);
            if (res?.success) {
              setSuccess(t('inventoryManagement.messages.masterWarehouseDeleted'));
              await loadWarehouseManageList();
              loadInventoryData();
            }
          } catch (err: any) {
            setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
          } finally {
            setMasterDialogSaving(false);
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
  };

  const loadUnitManageList = async () => {
    setUnitManageLoading(true);
    try {
      const res = await inventoryService.getProductUnits();
      if (res?.success && Array.isArray(res.data)) {
        setUnitManageList(res.data.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })));
      } else {
        setUnitManageList([]);
      }
    } catch (e) {
      console.error(e);
      setUnitManageList([]);
    } finally {
      setUnitManageLoading(false);
    }
  };

  const handleAddUnitRow = async () => {
    const name = newUnitInput.trim();
    if (!name) return;
    setMasterDialogSaving(true);
    setError('');
    try {
      const res = await inventoryService.createProductUnit(name);
      if (res?.success) {
        setNewUnitInput('');
        setSuccess(t('inventoryManagement.messages.masterUnitSaved'));
        await loadUnitManageList();
        loadInventoryData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterDialogSaving(false);
    }
  };

  const handleSaveEditUnit = async () => {
    if (!editingUnit) return;
    const name = editingUnit.name.trim();
    if (!name) return;
    setMasterDialogSaving(true);
    setError('');
    try {
      const res = await inventoryService.updateProductUnit(editingUnit.id, name);
      if (res?.success) {
        setEditingUnit(null);
        setSuccess(t('inventoryManagement.messages.masterUnitUpdated'));
        await loadUnitManageList();
        loadInventoryData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterDialogSaving(false);
    }
  };

  const handleDeleteUnitRow = (row: { id: number; name: string }) => {
    showConfirm(
      t('inventoryManagement.messages.deleteUnitConfirm', { name: row.name }),
      () => {
        void (async () => {
          setMasterDialogSaving(true);
          setError('');
          try {
            const res = await inventoryService.deleteProductUnit(row.id);
            if (res?.success) {
              setSuccess(t('inventoryManagement.messages.masterUnitDeleted'));
              await loadUnitManageList();
              loadInventoryData();
            }
          } catch (err: any) {
            setError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
          } finally {
            setMasterDialogSaving(false);
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
  };

  const handleDownloadInventoryExcelSample = async () => {
    if (!basicMenuFlags.canRead) {
      setError(t('inventoryManagement.messages.noPermissionReadPage'));
      return;
    }
    try {
      const blob = await inventoryService.downloadProductExcelSample();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${t('inventoryManagement.excelFilePrefix')}_${new Date().toISOString().split('T')[0]}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(t('inventoryManagement.messages.excelSampleError'));
    }
  };

  const handleInventoryExcelSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!basicMenuFlags.canMutate) {
      setError(t('inventoryManagement.messages.noPermissionExcel'));
      return;
    }
    setExcelUploading(true);
    setError('');
    try {
      const res = await inventoryService.bulkUpdateProductsFromExcel(file);
      if (res.success) {
        let msg = res.message || t('inventoryManagement.messages.excelApplyDone');
        const failed = res.data?.failed as { row: number; error: string }[] | undefined;
        if (failed?.length) {
          const detail = failed
            .slice(0, 8)
            .map((f) => t('inventoryManagement.messages.rowErrorLine', { row: f.row, error: f.error }))
            .join(' / ');
          msg += ` (${detail}${failed.length > 8 ? ' …' : ''})`;
        }
        setSuccess(msg);
        loadInventoryData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('inventoryManagement.messages.excelApplyError'));
    } finally {
      setExcelUploading(false);
    }
  };

  const handleDeleteItem = (id: number) => {
    if (!basicMenuFlags.canDelete) {
      setError(t('inventoryManagement.messages.noPermissionDelete'));
      return;
    }
    showConfirm(
      t('inventoryManagement.messages.deleteConfirm'),
      () => {
        void (async () => {
          try {
            await inventoryService.deleteProduct(id);
            setSuccess(t('inventoryManagement.messages.deleteSuccess'));
            loadInventoryData();
          } catch (error: any) {
            console.error('삭제 오류:', error);
            setError(error.response?.data?.message || t('inventoryManagement.messages.deleteError'));
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
  };

  const handleSaveItem = async (itemData: Partial<InventoryItem>) => {
    if (selectedItem && !basicMenuFlags.canEdit) {
      setError(t('inventoryManagement.messages.noPermissionEdit'));
      return;
    }
    if (!selectedItem && !basicMenuFlags.canCreate) {
      setError(t('inventoryManagement.messages.noPermissionCreate'));
      return;
    }
    try {
      const productData: Record<string, unknown> = {
        name: itemData.name,
        product_code: itemData.sku,
        category: itemData.category,
        stock_quantity: itemData.currentStock,
        min_stock_level: itemData.minStock,
        max_stock_level: itemData.maxStock,
        unit_price: itemData.unitPrice,
        supplier: itemData.supplier,
        location: itemData.location,
        image_url: itemData.imageUrl || undefined,
        cost_price: 0,
        unit: (itemData.unit && String(itemData.unit).trim()) || 'Piece',
        tax_rate: 0
      };
      if (itemData.partnerId !== '' && itemData.partnerId != null) {
        productData.partner_id = Number(itemData.partnerId);
      } else {
        productData.partner_id = null;
      }

      if (selectedItem) {
        // 수정
        const response = await inventoryService.updateProduct(selectedItem.id, productData);
        if (response.success) {
          setSuccess(t('inventoryManagement.messages.updateSuccess'));
          handleCloseInventoryDialog();
          loadInventoryData();
        }
      } else {
        // 추가
        const response = await inventoryService.createProduct(productData);
        if (response.success) {
          setSuccess(t('inventoryManagement.messages.addSuccess'));
          handleCloseInventoryDialog();
          loadInventoryData();
        }
      }
    } catch (error: any) {
      console.error('저장 오류:', error);
      setError(error.response?.data?.message || t('inventoryManagement.messages.saveError'));
    }
  };

  // 정렬 처리
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!orderBy) return 0;
    
    let aValue: any = a[orderBy as keyof InventoryItem];
    let bValue: any = b[orderBy as keyof InventoryItem];
    
    // 숫자 타입 처리
    if (orderBy === 'currentStock' || orderBy === 'unitPrice' || orderBy === 'totalValue' || orderBy === 'minStock' || orderBy === 'maxStock') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }
    
    // 문자열 타입 처리
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue || '').toLowerCase();
    }
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });

  // 상태 필터가 적용된 항목 사용 (API에서 이미 페이지네이션 처리됨)
  const paginatedItems = sortedItems;

  const handleSort = (property: keyof InventoryItem | '') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const thSx = (key: string) => {
    const align = invColTableAlign(key);
    const sortLabelLayout =
      align === 'right'
        ? { width: '100%', justifyContent: 'flex-end' as const }
        : align === 'center'
          ? { width: '100%', justifyContent: 'center' as const }
          : {};
    return {
      width: invColWidthPct(key),
      minWidth: 0,
      position: 'relative' as const,
      overflow: 'visible',
      verticalAlign: 'middle' as const,
      boxSizing: 'border-box' as const,
      '& .MuiTableSortLabel-root': { color: 'inherit', ...sortLabelLayout },
    };
  };

  const tdSx = (key: string) => ({
    width: invColWidthPct(key),
    minWidth: 0,
    overflow: INV_TD_ELLIPSIS_KEYS.has(key) ? ('hidden' as const) : ('visible' as const),
    textOverflow: INV_TD_ELLIPSIS_KEYS.has(key) ? ('ellipsis' as const) : undefined,
    verticalAlign: 'middle' as const,
    boxSizing: 'border-box' as const,
  });

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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Chip label={t('inventoryManagement.stockStatus.inStock')} size="small" sx={softChipSx('success')} />;
      case 'low_stock':
        return <Chip label={t('inventoryManagement.stockStatus.lowStock')} size="small" sx={softChipSx('warning')} />;
      case 'out_of_stock':
        return <Chip label={t('inventoryManagement.stockStatus.outOfStock')} size="small" sx={softChipSx('error')} />;
      default:
        return <Chip label={t('inventoryManagement.stockStatus.unknown')} size="small" sx={softChipSx('default')} />;
    }
  };

  const kpiCardSx = {
    borderRadius: '16px',
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
    boxShadow:
      theme.palette.mode === 'light' ? '0 2px 10px rgba(15, 23, 42, 0.04)' : '0 2px 12px rgba(0,0,0,0.25)',
    bgcolor: 'background.paper',
  } as const;

  const outlineToolbarBtnSx = {
    textTransform: 'none' as const,
    borderRadius: '12px',
    borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.14)' : 'divider',
    color: 'text.primary',
    '&:hover': {
      borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.22)' : theme.palette.grey[500],
      bgcolor: 'action.hover',
    },
  };

  return (
    <Box sx={{
      p: 0,
      backgroundColor: 'workArea.main',
      borderRadius: 2,
      minHeight: '100%',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box'
    }}>
      <MvsPageHeader
        title={t('inventoryManagement.pageTitle')}
        actions={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
          <input
            ref={excelFileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            hidden
            onChange={handleInventoryExcelSelected}
          />
          <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menusLoading || basicMenuFlags.canMutate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                startIcon={<WarehouseIcon fontSize="small" />}
                disabled={menusLoading || !basicMenuFlags.canMutate}
                onClick={() => {
                  setNewWarehouseInput('');
                  setWarehouseManageOpen(true);
                  loadWarehouseManageList();
                }}
                sx={outlineToolbarBtnSx}
              >
                {t('inventoryManagement.manageWarehouseButton')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menusLoading || basicMenuFlags.canMutate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                startIcon={<CategoryIcon fontSize="small" />}
                disabled={menusLoading || !basicMenuFlags.canMutate}
                onClick={() => {
                  setNewCategoryInput('');
                  setCategoryManageOpen(true);
                  loadCategoryManageList();
                }}
                sx={outlineToolbarBtnSx}
              >
                {t('inventoryManagement.manageCategoryButton')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menusLoading || basicMenuFlags.canMutate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                startIcon={<ScaleIcon fontSize="small" />}
                disabled={menusLoading || !basicMenuFlags.canMutate}
                onClick={() => {
                  setNewUnitInput('');
                  setUnitManageOpen(true);
                  loadUnitManageList();
                }}
                sx={outlineToolbarBtnSx}
              >
                {t('inventoryManagement.manageUnitButton')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoMutate')} disableHoverListener={menusLoading || basicMenuFlags.canMutate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon fontSize="small" />}
                disabled={excelUploading || menusLoading || !basicMenuFlags.canMutate}
                onClick={() => excelFileInputRef.current?.click()}
                sx={outlineToolbarBtnSx}
              >
                {t('inventoryManagement.excelBulkApply')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoView')} disableHoverListener={menusLoading || basicMenuFlags.canRead}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="outlined"
                disabled={menusLoading || !basicMenuFlags.canRead}
                onClick={handleDownloadInventoryExcelSample}
                sx={outlineToolbarBtnSx}
              >
                {t('inventoryManagement.downloadTemplate')}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={t('common.menuNoCreate')} disableHoverListener={menusLoading || basicMenuFlags.canCreate}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                disableElevation
                startIcon={<AddIcon fontSize="small" />}
                disabled={menusLoading || !basicMenuFlags.canCreate}
                onClick={handleAddItem}
                sx={{
                  textTransform: 'none',
                  borderRadius: '12px',
                  px: 2,
                }}
              >
                {t('inventoryManagement.addItem')}
              </Button>
            </span>
          </Tooltip>
          </Box>
        }
      />

      {!menusLoading && !basicMenuFlags.canRead ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('inventoryManagement.messages.noPermissionReadPage')}
        </Alert>
      ) : null}

      {/* 통계 카드 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={kpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('inventoryManagement.stats.totalItems')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
                {inventoryStats.totalProducts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={kpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('inventoryManagement.stats.totalValue')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>
                {t('inventoryManagement.currency')}{' '}
                {inventoryStats.totalValue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={kpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('inventoryManagement.stats.lowStock')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'warning.main' }}>
                {inventoryStats.lowStockItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={kpiCardSx}>
            <CardContent sx={{ py: 2.25, px: 2.5, '&:last-child': { pb: 2.25 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                {t('inventoryManagement.stats.outOfStock')}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.75, fontWeight: 600, letterSpacing: '-0.02em', color: 'error.main' }}>
                {inventoryStats.outOfStockItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 필터 및 검색 */}
      <Card elevation={0} sx={{ mb: 3, ...mvsFilterToolbarSx, ...mvsSearchFieldSx }}>
        <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto',
              },
              gap: 2,
              alignItems: 'flex-end',
              ...mvsSearchFieldSx,
            }}
          >
            <TextField
              fullWidth
              size="small"
              label={t('common.search')}
              {...FILTER_OUTLINED}
              placeholder={t('inventoryManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={inventoryFilterFieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: '1.125rem', color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              size="small"
              select
              label={t('inventoryManagement.category')}
              {...FILTER_OUTLINED}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) =>
                  selected === '' ? t('inventoryManagement.all') : String(selected),
              }}
              sx={inventoryFilterFieldSx}
            >
              <MenuItem value="">{t('inventoryManagement.all')}</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('inventoryManagement.warehouse')}
              {...FILTER_OUTLINED}
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) =>
                  selected === '' ? t('inventoryManagement.all') : String(selected),
              }}
              sx={inventoryFilterFieldSx}
            >
              <MenuItem value="">{t('inventoryManagement.all')}</MenuItem>
              {warehouseManageList.map((w) => (
                <MenuItem key={w.id} value={w.name}>
                  {w.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              select
              label={t('inventoryManagement.status')}
              {...FILTER_OUTLINED}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (selected === '') return t('inventoryManagement.all');
                  if (selected === 'in_stock') return t('inventoryManagement.stockStatus.inStock');
                  if (selected === 'low_stock') return t('inventoryManagement.stockStatus.lowStock');
                  if (selected === 'out_of_stock') return t('inventoryManagement.stockStatus.outOfStock');
                  return String(selected);
                },
              }}
              sx={inventoryFilterFieldSx}
            >
              <MenuItem value="">{t('inventoryManagement.all')}</MenuItem>
              <MenuItem value="in_stock">{t('inventoryManagement.stockStatus.inStock')}</MenuItem>
              <MenuItem value="low_stock">{t('inventoryManagement.stockStatus.lowStock')}</MenuItem>
              <MenuItem value="out_of_stock">{t('inventoryManagement.stockStatus.outOfStock')}</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              startIcon={<FilterIcon fontSize="small" />}
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('');
                setWarehouseFilter('');
                setStatusFilter('');
              }}
              sx={{
                ...outlineToolbarBtnSx,
                height: 40,
                whiteSpace: 'nowrap',
                gridColumn: { xs: '1 / -1', sm: '1 / -1', lg: 'auto' },
                justifySelf: { lg: 'stretch' },
              }}
            >
              {t('inventoryManagement.reset')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 재고 목록 테이블 — 열 너비는 뷰포트에 맞게 비율(%)로 자동 분배 */}
      <Card
        elevation={0}
        sx={{
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
          borderRadius: '20px',
          border: '1px solid',
          borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
          boxShadow:
            theme.palette.mode === 'light' ? '0 2px 14px rgba(15, 23, 42, 0.05)' : '0 4px 18px rgba(0,0,0,0.3)',
          bgcolor: 'background.paper',
        }}
      >
        <TableContainer sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', bgcolor: 'transparent' }}>
          <Table
            size="small"
            sx={{
              tableLayout: 'fixed',
              width: '100%',
              minWidth: 0,
              borderCollapse: 'collapse',
              '& .MuiTableCell-root': {
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
              },
            }}
          >
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
                  py: 1.5,
                  px: 2,
                },
              }}
            >
              <TableRow>
                <TableCell align={invColTableAlign('status')} sx={thSx('status')}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    {t('inventoryManagement.columns.status')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('name')} sx={thSx('name')}>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    {t('inventoryManagement.columns.productName')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('sku')} sx={thSx('sku')}>
                  <TableSortLabel
                    active={orderBy === 'sku'}
                    direction={orderBy === 'sku' ? order : 'asc'}
                    onClick={() => handleSort('sku')}
                  >
                    {t('inventoryManagement.columns.sku')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('category')} sx={thSx('category')}>
                  <TableSortLabel
                    active={orderBy === 'category'}
                    direction={orderBy === 'category' ? order : 'asc'}
                    onClick={() => handleSort('category')}
                  >
                    {t('inventoryManagement.columns.category')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('currentStock')} sx={thSx('currentStock')}>
                  <TableSortLabel
                    active={orderBy === 'currentStock'}
                    direction={orderBy === 'currentStock' ? order : 'asc'}
                    onClick={() => handleSort('currentStock')}
                  >
                    {t('inventoryManagement.columns.currentStock')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('unitPrice')} sx={thSx('unitPrice')}>
                  <TableSortLabel
                    active={orderBy === 'unitPrice'}
                    direction={orderBy === 'unitPrice' ? order : 'asc'}
                    onClick={() => handleSort('unitPrice')}
                  >
                    {t('inventoryManagement.columns.unitPrice')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('totalValue')} sx={thSx('totalValue')}>
                  <TableSortLabel
                    active={orderBy === 'totalValue'}
                    direction={orderBy === 'totalValue' ? order : 'asc'}
                    onClick={() => handleSort('totalValue')}
                  >
                    {t('inventoryManagement.columns.totalValue')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('supplier')} sx={thSx('supplier')}>
                  <TableSortLabel
                    active={orderBy === 'supplier'}
                    direction={orderBy === 'supplier' ? order : 'asc'}
                    onClick={() => handleSort('supplier')}
                  >
                    {t('inventoryManagement.columns.supplier')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('location')} sx={thSx('location')}>
                  <TableSortLabel
                    active={orderBy === 'location'}
                    direction={orderBy === 'location' ? order : 'asc'}
                    onClick={() => handleSort('location')}
                  >
                    {t('inventoryManagement.columns.location')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('lastUpdated')} sx={thSx('lastUpdated')}>
                  <TableSortLabel
                    active={orderBy === 'lastUpdated'}
                    direction={orderBy === 'lastUpdated' ? order : 'asc'}
                    onClick={() => handleSort('lastUpdated')}
                  >
                    {t('inventoryManagement.columns.lastUpdated')}
                  </TableSortLabel>
                </TableCell>
                <TableCell align={invColTableAlign('actions')} sx={thSx('actions')}>
                  {t('inventoryManagement.columns.actions')}
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
              {paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  onClick={basicMenuFlags.canRead || basicMenuFlags.canEdit ? () => handleOpenView(item) : undefined}
                  sx={{
                    cursor: basicMenuFlags.canRead || basicMenuFlags.canEdit ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell align={invColTableAlign('status')} sx={tdSx('status')}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        minWidth: 0,
                        width: '100%',
                      }}
                    >
                      {getStatusIcon(item.status)}
                      {getStatusChip(item.status)}
                    </Box>
                  </TableCell>
                  <TableCell align={invColTableAlign('name')} sx={{ ...tdSx('name'), whiteSpace: 'normal' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {item.imageUrl ? (
                        <Box
                          component="img"
                          src={resolveProductImageUrl(item.imageUrl)}
                          alt=""
                          sx={{
                            width: 36,
                            height: 36,
                            objectFit: 'cover',
                            borderRadius: '10px',
                            flexShrink: 0,
                            border: '1px solid',
                            borderColor: theme.palette.mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'divider',
                          }}
                        />
                      ) : null}
                      <Typography variant="subtitle2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                        {item.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align={invColTableAlign('sku')} sx={tdSx('sku')}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {item.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('category')} sx={tdSx('category')}>
                    <Typography variant="body2" noWrap title={item.category}>
                      {item.category}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('currentStock')} sx={tdSx('currentStock')}>
                    <Typography
                      variant="body2"
                      color={item.currentStock <= item.minStock ? 'error.main' : 'text.primary'}
                      fontWeight={item.currentStock <= item.minStock ? 600 : 500}
                      noWrap
                      sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                    >
                      {item.currentStock} / {item.maxStock}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('unitPrice')} sx={tdSx('unitPrice')}>
                    <Typography variant="body2" noWrap sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                      {t('inventoryManagement.currency')} {item.unitPrice.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('totalValue')} sx={tdSx('totalValue')}>
                    <Typography variant="body2" noWrap sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                      {t('inventoryManagement.currency')} {item.totalValue.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('supplier')} sx={tdSx('supplier')}>
                    <Typography variant="body2" noWrap title={item.supplier}>
                      {item.supplier}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('location')} sx={tdSx('location')}>
                    <Typography variant="body2" noWrap title={item.location}>
                      {item.location}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('lastUpdated')} sx={tdSx('lastUpdated')}>
                    <Typography variant="body2" noWrap sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                      {item.lastUpdated}
                    </Typography>
                  </TableCell>
                  <TableCell align={invColTableAlign('actions')} sx={tdSx('actions')} onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <Tooltip
                        title={
                          !basicMenuFlags.canDelete && !menusLoading
                            ? t('common.menuNoDelete')
                            : t('inventoryManagement.tooltips.delete')
                        }
                        disableHoverListener={menusLoading || basicMenuFlags.canDelete}
                      >
                        <span>
                          <IconButton
                            size="small"
                            disabled={menusLoading || !basicMenuFlags.canDelete}
                            onClick={() => handleDeleteItem(item.id)}
                            aria-label={t('inventoryManagement.tooltips.delete')}
                            sx={{
                              color: 'text.secondary',
                              borderRadius: '10px',
                              '&:hover': { color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 페이지네이션 */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '10px',
                fontWeight: 500,
              },
            }}
          />
        </Box>
      </Card>

      {/* 재고 보기 / 추가·수정 다이얼로그 */}
      <Dialog
        open={openDialog}
        onClose={handleCloseInventoryDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle
          sx={{
            pt: 2.5,
            px: 3,
            pb: 1.25,
            fontSize: '1.125rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          {inventoryDialogMode === 'view' && selectedItem
            ? t('inventoryManagement.dialog.viewTitle')
            : selectedItem
              ? t('inventoryManagement.dialog.editTitle')
              : t('inventoryManagement.dialog.addTitle')}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {inventoryDialogMode === 'view' && selectedItem ? (
            <InventoryDetailView item={selectedItem} getStatusChip={getStatusChip} />
          ) : (
            <InventoryForm
              key={selectedItem ? `edit-${selectedItem.id}` : 'add-new'}
              item={selectedItem}
              onSave={handleSaveItem}
              canCreate={basicMenuFlags.canCreate}
              canEdit={basicMenuFlags.canEdit}
              canMutate={basicMenuFlags.canMutate}
              onCancel={() => {
                if (selectedItem) {
                  setInventoryDialogMode('view');
                } else {
                  handleCloseInventoryDialog();
                }
              }}
            />
          )}
        </DialogContent>
        {inventoryDialogMode === 'view' && selectedItem ? (
          <DialogActions
            sx={{
              px: 3,
              py: 2.5,
              gap: 1,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
            }}
          >
            <Box sx={{ flex: 1 }} />
            <Button
              onClick={handleCloseInventoryDialog}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', px: 2 }}
            >
              {t('inventoryManagement.actions.close')}
            </Button>
            <Tooltip title={t('common.menuNoEdit')} disableHoverListener={basicMenuFlags.canEdit}>
              <span style={{ display: 'inline-flex' }}>
                <Button
                  variant="contained"
                  disableElevation
                  disabled={!basicMenuFlags.canEdit}
                  onClick={() => setInventoryDialogMode('edit')}
                  sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
                >
                  {t('inventoryManagement.actions.edit')}
                </Button>
              </span>
            </Tooltip>
          </DialogActions>
        ) : null}
      </Dialog>

      <Dialog
        open={categoryManageOpen}
        onClose={() => !masterDialogSaving && setCategoryManageOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('inventoryManagement.dialog.manageCategoryTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('inventoryManagement.masterRegister.categoryHint')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="flex-start">
            <TextField
              size="small"
              fullWidth
              label={t('inventoryManagement.form.categoryName')}
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategoryRow();
                }
              }}
            />
            <Button
              variant="contained"
              disabled={masterDialogSaving || !newCategoryInput.trim() || !basicMenuFlags.canMutate}
              onClick={handleAddCategoryRow}
            >
              {t('inventoryManagement.actions.add')}
            </Button>
          </Stack>
          {categoryManageLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiTableCell-head': {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      py: 1.25
                    }
                  }}
                >
                  <TableRow>
                    <TableCell>{t('inventoryManagement.masterManage.columnName')}</TableCell>
                    <TableCell align="right" width={120}>
                      {t('inventoryManagement.columns.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categoryManageList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography variant="body2" color="text.secondary">
                          {t('inventoryManagement.masterManage.emptyCategory')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoryManageList.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">
                          <Tooltip title={t('common.menuNoEdit')} disableHoverListener={basicMenuFlags.canEdit}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!basicMenuFlags.canEdit}
                                onClick={() => setEditingCategory({ id: row.id, name: row.name })}
                                aria-label="edit"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('common.menuNoDelete')} disableHoverListener={basicMenuFlags.canDelete}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteCategoryRow(row)}
                                disabled={masterDialogSaving || !basicMenuFlags.canDelete}
                                aria-label="delete"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryManageOpen(false)} disabled={masterDialogSaving}>
            {t('inventoryManagement.actions.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingCategory} onClose={() => !masterDialogSaving && setEditingCategory(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('inventoryManagement.dialog.editCategoryTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            label={t('inventoryManagement.form.categoryName')}
            value={editingCategory?.name ?? ''}
            onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCategory(null)} disabled={masterDialogSaving}>
            {t('inventoryManagement.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditCategory}
            disabled={masterDialogSaving || !editingCategory?.name?.trim() || !basicMenuFlags.canEdit}
          >
            {t('inventoryManagement.actions.update')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={warehouseManageOpen}
        onClose={() => !masterDialogSaving && setWarehouseManageOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('inventoryManagement.dialog.manageWarehouseTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('inventoryManagement.masterRegister.warehouseHint')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="flex-start">
            <TextField
              size="small"
              fullWidth
              label={t('inventoryManagement.form.warehouseName')}
              value={newWarehouseInput}
              onChange={(e) => setNewWarehouseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddWarehouseRow();
                }
              }}
            />
            <Button
              variant="contained"
              disabled={masterDialogSaving || !newWarehouseInput.trim() || !basicMenuFlags.canMutate}
              onClick={handleAddWarehouseRow}
            >
              {t('inventoryManagement.actions.add')}
            </Button>
          </Stack>
          {warehouseManageLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiTableCell-head': {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      py: 1.25
                    }
                  }}
                >
                  <TableRow>
                    <TableCell>{t('inventoryManagement.masterManage.columnName')}</TableCell>
                    <TableCell align="right" width={120}>
                      {t('inventoryManagement.columns.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {warehouseManageList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography variant="body2" color="text.secondary">
                          {t('inventoryManagement.masterManage.emptyWarehouse')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouseManageList.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">
                          <Tooltip title={t('common.menuNoEdit')} disableHoverListener={basicMenuFlags.canEdit}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!basicMenuFlags.canEdit}
                                onClick={() => setEditingWarehouse({ id: row.id, name: row.name })}
                                aria-label="edit"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('common.menuNoDelete')} disableHoverListener={basicMenuFlags.canDelete}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteWarehouseRow(row)}
                                disabled={masterDialogSaving || !basicMenuFlags.canDelete}
                                aria-label="delete"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarehouseManageOpen(false)} disabled={masterDialogSaving}>
            {t('inventoryManagement.actions.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingWarehouse} onClose={() => !masterDialogSaving && setEditingWarehouse(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('inventoryManagement.dialog.editWarehouseTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            label={t('inventoryManagement.form.warehouseName')}
            value={editingWarehouse?.name ?? ''}
            onChange={(e) => editingWarehouse && setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingWarehouse(null)} disabled={masterDialogSaving}>
            {t('inventoryManagement.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditWarehouse}
            disabled={masterDialogSaving || !editingWarehouse?.name?.trim() || !basicMenuFlags.canEdit}
          >
            {t('inventoryManagement.actions.update')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={unitManageOpen}
        onClose={() => !masterDialogSaving && setUnitManageOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('inventoryManagement.dialog.manageUnitTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('inventoryManagement.masterRegister.unitHint')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="flex-start">
            <TextField
              size="small"
              fullWidth
              label={t('inventoryManagement.form.unitName')}
              value={newUnitInput}
              onChange={(e) => setNewUnitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUnitRow();
                }
              }}
            />
            <Button
              variant="contained"
              disabled={masterDialogSaving || !newUnitInput.trim() || !basicMenuFlags.canMutate}
              onClick={handleAddUnitRow}
            >
              {t('inventoryManagement.actions.add')}
            </Button>
          </Stack>
          {unitManageLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiTableCell-head': {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      py: 1.25
                    }
                  }}
                >
                  <TableRow>
                    <TableCell>{t('inventoryManagement.masterManage.columnName')}</TableCell>
                    <TableCell align="right" width={120}>
                      {t('inventoryManagement.columns.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {unitManageList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Typography variant="body2" color="text.secondary">
                          {t('inventoryManagement.masterManage.emptyUnit')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    unitManageList.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">
                          <Tooltip title={t('common.menuNoEdit')} disableHoverListener={basicMenuFlags.canEdit}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!basicMenuFlags.canEdit}
                                onClick={() => setEditingUnit({ id: row.id, name: row.name })}
                                aria-label="edit"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('common.menuNoDelete')} disableHoverListener={basicMenuFlags.canDelete}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteUnitRow(row)}
                                disabled={masterDialogSaving || !basicMenuFlags.canDelete}
                                aria-label="delete"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnitManageOpen(false)} disabled={masterDialogSaving}>
            {t('inventoryManagement.actions.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingUnit} onClose={() => !masterDialogSaving && setEditingUnit(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('inventoryManagement.dialog.editUnitTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            label={t('inventoryManagement.form.unitName')}
            value={editingUnit?.name ?? ''}
            onChange={(e) => editingUnit && setEditingUnit({ ...editingUnit, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUnit(null)} disabled={masterDialogSaving}>
            {t('inventoryManagement.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEditUnit}
            disabled={masterDialogSaving || !editingUnit?.name?.trim() || !basicMenuFlags.canEdit}
          >
            {t('inventoryManagement.actions.update')}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* 스낵바 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

interface InventoryDetailViewProps {
  item: InventoryItem;
  getStatusChip: (status: string) => React.ReactNode;
}

const InventoryDetailView: React.FC<InventoryDetailViewProps> = ({ item, getStatusChip }) => {
  const { t } = useTranslation();
  const detailBarcodeRef = useRef<SVGSVGElement | null>(null);

  const skuTrim = String(item.sku || '').trim();

  useEffect(() => {
    if (!detailBarcodeRef.current) return;
    if (!skuTrim) {
      detailBarcodeRef.current.innerHTML = '';
      return;
    }
    try {
      detailBarcodeRef.current.innerHTML = '';
      JsBarcode(detailBarcodeRef.current, skuTrim, {
        format: 'CODE128',
        displayValue: true,
        width: 1.4,
        height: 40,
        margin: 8
      });
    } catch {
      detailBarcodeRef.current.innerHTML = '';
    }
  }, [skuTrim]);

  const handlePrintBarcode = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const svgHtml = detailBarcodeRef.current?.outerHTML || '';
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(item.name)}</title>
<style>
  body { font-family: system-ui, 'Malgun Gothic', sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
  .sku { font-size: 14px; margin-bottom: 16px; color: #333; }
  svg { max-width: 100%; height: auto; display: block; }
  @media print { body { padding: 12px; } }
</style></head><body>
  <h1>${escapeHtml(item.name)}</h1>
  <div class="sku">SKU: ${escapeHtml(item.sku)}</div>
  ${svgHtml || `<p>${escapeHtml(t('inventoryManagement.detail.noBarcodeForPrint'))}</p>`}
</body></html>`);
    w.document.close();
    const doPrint = () => {
      try {
        w.focus();
        w.print();
      } finally {
        w.close();
      }
    };
    if (w.document.readyState === 'complete') doPrint();
    else w.onload = doPrint;
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                width: 120,
                height: 120,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                flexShrink: 0,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {item.imageUrl ? (
                <Box
                  component="img"
                  src={resolveProductImageUrl(item.imageUrl)}
                  alt=""
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {t('inventoryManagement.form.noImage')}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('inventoryManagement.columns.status')}
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getStatusChip(item.status)}</Box>
            </Box>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={(theme) => ({
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`
            })}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              {t('inventoryManagement.form.productName')}
            </Typography>
            <Typography variant="body1" fontWeight={700} color="primary.main" sx={{ mt: 0.25 }}>
              {item.name}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={(theme) => ({
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`
            })}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              {t('inventoryManagement.form.sku')}
            </Typography>
            <Typography
              variant="body1"
              fontWeight={600}
              sx={{ mt: 0.25, fontFamily: 'ui-monospace, monospace', letterSpacing: 0.02 }}
            >
              {item.sku}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
            {t('inventoryManagement.form.barcodeQrSection')}
          </Typography>
          {!skuTrim ? (
            <Typography variant="body2" color="text.secondary">
              {t('inventoryManagement.detail.barcodeNeedSku')}
            </Typography>
          ) : (
            <Paper
              elevation={0}
              sx={(theme) => ({
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.06)
              })}
            >
              <Stack spacing={2} alignItems="stretch">
                <Box
                  sx={{
                    bgcolor: 'background.paper',
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'auto'
                  }}
                >
                  <svg ref={detailBarcodeRef} style={{ maxWidth: '100%', width: 320, display: 'block' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    type="button"
                    variant="outlined"
                    size="medium"
                    startIcon={<PrintIcon />}
                    onClick={handlePrintBarcode}
                    disabled={!skuTrim}
                    sx={{ minWidth: 200 }}
                  >
                    {t('inventoryManagement.detail.printBarcode')}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.form.category')}
          </Typography>
          <Typography variant="body1">{item.category || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.form.supplier')}
          </Typography>
          <Typography variant="body1">{item.supplier || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.form.unit')}
          </Typography>
          <Typography variant="body1">{item.unit || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.form.location')}
          </Typography>
          <Typography variant="body1">{item.location || '—'}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Box
            sx={(theme) => {
              const low = item.minStock > 0 && item.currentStock <= item.minStock;
              const c = low ? theme.palette.warning : theme.palette.primary;
              return {
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(c.main, 0.1),
                border: `1px solid ${alpha(c.main, 0.35)}`
              };
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              {t('inventoryManagement.form.currentStock')}
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{
                mt: 0.25,
                mb: 0,
                fontWeight: 800,
                color: item.minStock > 0 && item.currentStock <= item.minStock ? 'warning.dark' : 'primary.main'
              }}
            >
              {item.currentStock}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.form.minStock')}
          </Typography>
          <Typography variant="body1">{item.minStock}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.form.maxStock')}
          </Typography>
          <Typography variant="body1">{item.maxStock}</Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.form.unitPrice')}
          </Typography>
          <Typography variant="body1">
            {t('inventoryManagement.currency')} {item.unitPrice.toLocaleString()}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={(theme) => ({
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`
            })}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              {t('inventoryManagement.columns.totalValue')}
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ mt: 0.25 }} color="success.dark">
              {t('inventoryManagement.currency')} {item.totalValue.toLocaleString()}
            </Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="caption" color="text.secondary">
            {t('inventoryManagement.columns.lastUpdated')}
          </Typography>
          <Typography variant="body1">{item.lastUpdated || '—'}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

// 재고 폼 컴포넌트
interface InventoryFormProps {
  item: InventoryItem | null;
  onSave: (data: Partial<InventoryItem>) => void;
  onCancel: () => void;
  canCreate: boolean;
  canEdit: boolean;
  canMutate: boolean;
}

type MasterRow = { id: number; name: string };

const InventoryForm: React.FC<InventoryFormProps> = ({ item, onSave, onCancel, canCreate, canEdit, canMutate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const formFieldsDisabled = item ? !canEdit : !canCreate;
  const canSubmit = item ? canEdit : canCreate;
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [productCategories, setProductCategories] = useState<MasterRow[]>([]);
  const [productUnits, setProductUnits] = useState<MasterRow[]>([]);
  const [inventoryLocations, setInventoryLocations] = useState<MasterRow[]>([]);
  const [partners, setPartners] = useState<{ id: number; company_name: string }[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [masterSaving, setMasterSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const initialPartnerId =
    item?.partnerId !== undefined && item?.partnerId !== null && item?.partnerId !== ''
      ? Number(item.partnerId)
      : '';

  const [formData, setFormData] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category || '',
    unit: item?.unit || 'Piece',
    currentStock: item?.currentStock || 0,
    minStock: item?.minStock || 0,
    maxStock: item?.maxStock || 0,
    unitPrice: item?.unitPrice || 0,
    supplier: item?.supplier || '',
    partnerId: initialPartnerId as number | '',
    location: item?.location || '',
    imageUrl: item?.imageUrl || ''
  });

  const loadMasters = useCallback(async () => {
    try {
      const [catRes, unitRes, locRes, partRes] = await Promise.all([
        inventoryService.getProductCategories(),
        inventoryService.getProductUnits(),
        inventoryService.getInventoryLocations(),
        useReferenceDataStore.getState().fetchPartners().then((data) => ({ success: true, data })),
      ]);
      if (catRes?.success && Array.isArray(catRes.data)) {
        setProductCategories(catRes.data.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })));
      }
      if (unitRes?.success && Array.isArray(unitRes.data)) {
        setProductUnits(unitRes.data.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })));
      }
      if (locRes?.success && Array.isArray(locRes.data)) {
        setInventoryLocations(locRes.data.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })));
      }
      if (partRes?.success && Array.isArray(partRes.data)) {
        setPartners(
          partRes.data.map((p: { id: number; company_name: string }) => ({ id: p.id, company_name: p.company_name }))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    const pid =
      item?.partnerId !== undefined && item?.partnerId !== null && item?.partnerId !== ''
        ? Number(item.partnerId)
        : '';
    setFormData({
      name: item?.name || '',
      sku: item?.sku || '',
      category: item?.category || '',
      unit: item?.unit || 'Piece',
      currentStock: item?.currentStock || 0,
      minStock: item?.minStock || 0,
      maxStock: item?.maxStock || 0,
      unitPrice: item?.unitPrice || 0,
      supplier: item?.supplier || '',
      partnerId: pid as number | '',
      location: item?.location || '',
      imageUrl: item?.imageUrl || ''
    });
  }, [item]);

  const categoryOptions = useMemo(() => {
    const names = new Set(productCategories.map((c) => c.name));
    const opts = [...productCategories];
    if (formData.category && !names.has(formData.category)) {
      opts.unshift({ id: -1, name: formData.category });
    }
    return opts;
  }, [productCategories, formData.category]);

  const locationOptions = useMemo(() => {
    const names = new Set(inventoryLocations.map((c) => c.name));
    const opts = [...inventoryLocations];
    if (formData.location && !names.has(formData.location)) {
      opts.unshift({ id: -1, name: formData.location });
    }
    return opts;
  }, [inventoryLocations, formData.location]);

  const categoryNames = useMemo(() => categoryOptions.map((c) => c.name), [categoryOptions]);

  const unitOptions = useMemo(() => {
    const names = new Set(productUnits.map((c) => c.name));
    const opts = [...productUnits];
    if (formData.unit && !names.has(formData.unit)) {
      opts.unshift({ id: -1, name: formData.unit });
    }
    return opts;
  }, [productUnits, formData.unit]);

  const unitNames = useMemo(() => unitOptions.map((c) => c.name), [unitOptions]);

  const partnerValue = useMemo((): { id: number; company_name: string } | null => {
    if (formData.partnerId === '' || formData.partnerId == null) return null;
    const id = Number(formData.partnerId);
    const found = partners.find((p) => p.id === id);
    if (found) return found;
    if (formData.supplier) return { id, company_name: formData.supplier };
    return null;
  }, [partners, formData.partnerId, formData.supplier]);

  /** 목록에 없는 기존 파트너(삭제 등)도 입력란에 표시 */
  const partnerOptions = useMemo(() => {
    if (!partnerValue) return partners;
    if (partners.some((p) => p.id === partnerValue.id)) return partners;
    return [partnerValue, ...partners];
  }, [partners, partnerValue]);

  const skuTrim = String(formData.sku || '').trim();

  useEffect(() => {
    if (!barcodeRef.current) return;
    if (!skuTrim) {
      barcodeRef.current.innerHTML = '';
      return;
    }
    try {
      barcodeRef.current.innerHTML = '';
      JsBarcode(barcodeRef.current, skuTrim, {
        format: 'CODE128',
        displayValue: true,
        width: 1.25,
        height: 32,
        margin: 4
      });
    } catch {
      barcodeRef.current.innerHTML = '';
    }
  }, [skuTrim]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !canMutate) return;
    setImageUploading(true);
    try {
      const res = await inventoryService.uploadProductImage(file);
      if (res?.success && res.data?.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.data.url }));
      }
    } finally {
      setImageUploading(false);
    }
  };

  /** SKU 자동: 총 8자 이하 — base36 시간 꼬리 5자 + 랜덤 3자 (바코드·입력 부담 최소화) */
  const makeSku8 = () => {
    const timePart = Date.now()
      .toString(36)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(-5)
      .padStart(5, '0');
    const rand = Math.random()
      .toString(36)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(2, 5)
      .padEnd(3, 'X');
    return `${timePart}${rand}`.slice(0, 8);
  };
  const generateSku = () => {
    setFormData((prev) => ({ ...prev, sku: makeSku8() }));
  };

  /** 신규 추가 시: 제품명 입력 후 포커스가 나가면 SKU·바코드가 비어 있을 때만 자동 채움 */
  const handleProductNameBlur = () => {
    if (item || formFieldsDisabled) return;
    setFormData((prev) => {
      if (!prev.name.trim() || prev.sku.trim()) return prev;
      return { ...prev, sku: makeSku8() };
    });
  };

  const handleAddCategory = async () => {
    if (!canMutate) return;
    const name = newCategoryName.trim();
    if (!name) return;
    setMasterSaving(true);
    try {
      const res = await inventoryService.createProductCategory(name);
      if (res?.success && res.data) {
        await loadMasters();
        setFormData((prev) => ({ ...prev, category: (res.data as { name: string }).name }));
        setCategoryDialogOpen(false);
        setNewCategoryName('');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterSaving(false);
    }
  };

  const handleAddLocation = async () => {
    if (!canMutate) return;
    const name = newLocationName.trim();
    if (!name) return;
    setMasterSaving(true);
    try {
      const res = await inventoryService.createInventoryLocation(name);
      if (res?.success && res.data) {
        await loadMasters();
        setFormData((prev) => ({ ...prev, location: (res.data as { name: string }).name }));
        setLocationDialogOpen(false);
        setNewLocationName('');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterSaving(false);
    }
  };

  const handleAddUnit = async () => {
    if (!canMutate) return;
    const name = newUnitName.trim();
    if (!name) return;
    setMasterSaving(true);
    try {
      const res = await inventoryService.createProductUnit(name);
      if (res?.success && res.data) {
        await loadMasters();
        setFormData((prev) => ({ ...prev, unit: (res.data as { name: string }).name }));
        setUnitDialogOpen(false);
        setNewUnitName('');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || t('inventoryManagement.messages.saveError'));
    } finally {
      setMasterSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!formData.category?.trim()) {
      setFormError(t('inventoryManagement.validation.categoryRequired'));
      return;
    }
    if (!formData.unit?.trim()) {
      setFormError(t('inventoryManagement.validation.unitRequired'));
      return;
    }
    if (formData.partnerId === '' || formData.partnerId == null) {
      setFormError(t('inventoryManagement.validation.partnerRequired'));
      return;
    }
    if (!formData.location?.trim()) {
      setFormError(t('inventoryManagement.validation.locationRequired'));
      return;
    }
    setFormError('');
    onSave(formData);
  };

  const outlinedControlSx = {
    '& .MuiInputLabel-root': {
      fontSize: '0.8125rem',
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      minHeight: 40,
      bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.1 : 0.05),
      transition: theme.transitions.create(['background-color', 'box-shadow'], { duration: 150 }),
      '&:hover': {
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.14 : 0.08),
      },
      '&.Mui-focused': {
        bgcolor: 'background.paper',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
      },
      '& fieldset': {
        borderColor: alpha(theme.palette.divider, 0.9),
      },
      '&.Mui-disabled': {
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.04),
      },
    },
    '& .MuiOutlinedInput-input': { py: 1.15 },
  };
  const registerBtnSx = {
    minWidth: 88,
    height: 40,
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    borderRadius: '12px',
    textTransform: 'none' as const,
    fontWeight: 600,
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
      {formError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>
          {formError}
        </Alert>
      ) : null}
      <Grid container spacing={{ xs: 2.25, sm: 2.75 }}>
        <Grid size={{ xs: 12 }}>
          <Box
            component="fieldset"
            sx={{
              m: 0,
              p: 1.5,
              minWidth: 0,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              borderRadius: '14px',
              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
            }}
          >
            <Box
              component="legend"
              sx={{ px: 0.5, ml: 0.5, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}
            >
              {t('inventoryManagement.form.productImage')}
            </Box>
            <Stack direction="row" spacing={1.75} alignItems="center" flexWrap="wrap">
            <Box
              sx={{
                width: 104,
                height: 104,
                border: `1px dashed ${alpha(theme.palette.text.primary, 0.18)}`,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.1 : 0.06),
                flexShrink: 0,
              }}
            >
              {formData.imageUrl ? (
                <Box
                  component="img"
                  src={resolveProductImageUrl(formData.imageUrl)}
                  alt=""
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ px: 1.25, textAlign: 'center', lineHeight: 1.35 }}>
                  {t('inventoryManagement.form.noImage')}
                </Typography>
              )}
            </Box>
            <Stack spacing={1}>
              <Button
                variant="outlined"
                color="inherit"
                component="label"
                size="medium"
                sx={{
                  height: 40,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderStyle: 'dashed',
                  borderColor: alpha(theme.palette.text.primary, 0.22),
                  color: 'text.primary',
                  bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.04),
                  '&:hover': {
                    borderColor: alpha(theme.palette.primary.main, 0.45),
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.06),
                  },
                }}
                disabled={!canMutate || imageUploading}
                startIcon={imageUploading ? <CircularProgress size={16} /> : <UploadFileIcon sx={{ fontSize: 18 }} />}
              >
                {t('inventoryManagement.form.selectImage')}
                <input type="file" hidden accept="image/*" onChange={handleImageFile} />
              </Button>
              {formData.imageUrl ? (
                <Button
                  size="small"
                  type="button"
                  disabled={!canMutate}
                  onClick={() => setFormData((p) => ({ ...p, imageUrl: '' }))}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
                >
                  {t('inventoryManagement.form.removeImage')}
                </Button>
              ) : null}
            </Stack>
            </Stack>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Stack spacing={2.25}>
            <TextField
              size="small"
              fullWidth
              label={t('inventoryManagement.form.productName')}
              {...FORM_OUTLINED}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={handleProductNameBlur}
              required
              disabled={formFieldsDisabled}
              sx={outlinedControlSx}
            />
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="flex-start" useFlexGap flexWrap="wrap">
                <TextField
                  size="small"
                  fullWidth
                  label={t('inventoryManagement.form.sku')}
                  {...FORM_OUTLINED}
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                  disabled={formFieldsDisabled}
                  helperText={!skuTrim ? t('inventoryManagement.form.barcodeHint') : undefined}
                  sx={{ ...outlinedControlSx, flex: 1, minWidth: 0 }}
                />
                <Button
                  variant="outlined"
                  size="medium"
                  sx={registerBtnSx}
                  onClick={generateSku}
                  type="button"
                  disabled={formFieldsDisabled}
                >
                  {t('inventoryManagement.form.generateSku')}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box
            component="fieldset"
            sx={{
              m: 0,
              p: 0,
              minWidth: 0,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              borderRadius: '14px',
              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.08 : 0.04),
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.04 : 0.45)}`,
            }}
          >
            <Box
              component="legend"
              sx={{ px: 0.5, ml: 1.5, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary' }}
            >
              {t('inventoryManagement.form.barcodeQrSection')}
            </Box>
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: { xs: 2, sm: 2 },
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                overflowX: 'auto',
                overflowY: 'visible',
                minHeight: 56,
              }}
            >
              <svg ref={barcodeRef} style={{ maxWidth: 'min(100%, 360px)', width: 320, height: 'auto', display: 'block' }} />
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start" useFlexGap>
            <Autocomplete
              options={categoryNames}
              value={formData.category ? formData.category : null}
              onChange={(_, newValue) => setFormData({ ...formData, category: newValue || '' })}
              getOptionLabel={(o) => o}
              isOptionEqualToValue={(a, b) => a === b}
              disabled={formFieldsDisabled}
              filterOptions={(opts, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return opts;
                return opts.filter((name) => name.toLowerCase().includes(q));
              }}
              noOptionsText={t('inventoryManagement.form.autocompleteNoOptions')}
              clearOnEscape
              sx={{ flex: 1, minWidth: 0 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  required
                  label={t('inventoryManagement.form.category')}
                  {...FORM_OUTLINED}
                  placeholder={t('inventoryManagement.form.selectCategory')}
                  sx={outlinedControlSx}
                />
              )}
            />
            <Button
              type="button"
              variant="outlined"
              size="medium"
              sx={{ ...registerBtnSx, mt: 0 }}
              disabled={!canMutate}
              onClick={() => {
                setNewCategoryName('');
                setCategoryDialogOpen(true);
              }}
            >
              {t('inventoryManagement.form.registerCategory')}
            </Button>
          </Stack>
          {!categoryOptions.length ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', fontSize: '0.7rem', lineHeight: 1.35 }}>
              {t('inventoryManagement.form.noCategoriesHint')}
            </Typography>
          ) : null}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start" useFlexGap>
            <Autocomplete
              options={partnerOptions}
              value={partnerValue}
              onChange={(_, newValue) => {
                if (!newValue) {
                  setFormData({ ...formData, partnerId: '', supplier: '' });
                  return;
                }
                setFormData({
                  ...formData,
                  partnerId: newValue.id,
                  supplier: newValue.company_name
                });
              }}
              getOptionLabel={(o) => o.company_name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              disabled={formFieldsDisabled}
              filterOptions={(opts, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return opts;
                return opts.filter((p) => p.company_name.toLowerCase().includes(q));
              }}
              noOptionsText={t('inventoryManagement.form.autocompleteNoOptions')}
              clearOnEscape
              sx={{ flex: 1, minWidth: 0 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  required
                  label={t('inventoryManagement.form.supplier')}
                  {...FORM_OUTLINED}
                  placeholder={t('inventoryManagement.form.selectPartner')}
                  sx={outlinedControlSx}
                />
              )}
            />
            <Box sx={{ width: 88, flexShrink: 0 }} aria-hidden />
          </Stack>
          {!partners.length ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', fontSize: '0.7rem', lineHeight: 1.35 }}>
              {t('inventoryManagement.form.noPartnersHint')}
            </Typography>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            size="small"
            fullWidth
            label={t('inventoryManagement.form.currentStock')}
            {...FORM_OUTLINED}
            type="number"
            value={formData.currentStock}
            onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
            required
            disabled={formFieldsDisabled}
            sx={outlinedControlSx}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            size="small"
            fullWidth
            label={t('inventoryManagement.form.minStock')}
            {...FORM_OUTLINED}
            type="number"
            value={formData.minStock}
            onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
            required
            disabled={formFieldsDisabled}
            sx={outlinedControlSx}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            size="small"
            fullWidth
            label={t('inventoryManagement.form.maxStock')}
            {...FORM_OUTLINED}
            type="number"
            value={formData.maxStock}
            onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
            required
            disabled={formFieldsDisabled}
            sx={outlinedControlSx}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start" useFlexGap>
            <Autocomplete
              options={unitNames}
              value={formData.unit ? formData.unit : null}
              onChange={(_, newValue) => setFormData({ ...formData, unit: newValue || '' })}
              getOptionLabel={(o) => o}
              isOptionEqualToValue={(a, b) => a === b}
              disabled={formFieldsDisabled}
              filterOptions={(opts, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return opts;
                return opts.filter((name) => name.toLowerCase().includes(q));
              }}
              noOptionsText={t('inventoryManagement.form.autocompleteNoOptions')}
              clearOnEscape
              sx={{ flex: 1, minWidth: 0 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  required
                  label={t('inventoryManagement.form.unit')}
                  {...FORM_OUTLINED}
                  placeholder={t('inventoryManagement.form.selectUnit')}
                  sx={outlinedControlSx}
                />
              )}
            />
            <Button
              type="button"
              variant="outlined"
              size="medium"
              sx={{ ...registerBtnSx, mt: 0 }}
              disabled={!canMutate}
              onClick={() => {
                setNewUnitName('');
                setUnitDialogOpen(true);
              }}
            >
              {t('inventoryManagement.form.registerUnit')}
            </Button>
          </Stack>
          {!unitOptions.length ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', fontSize: '0.7rem', lineHeight: 1.35 }}>
              {t('inventoryManagement.form.noUnitsHint')}
            </Typography>
          ) : null}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            size="small"
            fullWidth
            label={t('inventoryManagement.form.unitPrice')}
            {...FORM_OUTLINED}
            type="number"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: parseInt(e.target.value) || 0 })}
            required
            disabled={formFieldsDisabled}
            sx={outlinedControlSx}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start" useFlexGap>
            <TextField
              select
              size="small"
              fullWidth
              required
              label={t('inventoryManagement.form.location')}
              {...FORM_OUTLINED}
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: String(e.target.value) })}
              disabled={formFieldsDisabled}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) =>
                  selected === '' ? t('inventoryManagement.form.selectLocation') : String(selected),
              }}
              sx={{ ...outlinedControlSx, flex: 1, minWidth: 0 }}
            >
              <MenuItem value="">
                <em>{t('inventoryManagement.form.selectLocation')}</em>
              </MenuItem>
              {locationOptions.map((c) => (
                <MenuItem key={`${c.id}-${c.name}`} value={c.name}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              type="button"
              variant="outlined"
              size="medium"
              sx={{ ...registerBtnSx, mt: 0 }}
              disabled={!canMutate}
              onClick={() => {
                setNewLocationName('');
                setLocationDialogOpen(true);
              }}
            >
              {t('inventoryManagement.form.registerLocation')}
            </Button>
          </Stack>
          {!locationOptions.length ? (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', fontSize: '0.7rem', lineHeight: 1.35 }}>
              {t('inventoryManagement.form.noLocationsHint')}
            </Typography>
          ) : null}
        </Grid>
      </Grid>

      <Dialog
        open={categoryDialogOpen}
        onClose={() => !masterSaving && setCategoryDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pt: 2.25, px: 2.5, pb: 1, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('inventoryManagement.dialog.registerCategoryTitle')}
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            size="small"
            label={t('inventoryManagement.form.categoryName')}
            {...FORM_OUTLINED}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={outlinedControlSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => setCategoryDialogOpen(false)}
            disabled={masterSaving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', px: 2 }}
          >
            {t('inventoryManagement.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleAddCategory}
            disabled={!canMutate || masterSaving || !newCategoryName.trim()}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
          >
            {t('inventoryManagement.actions.add')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={locationDialogOpen}
        onClose={() => !masterSaving && setLocationDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pt: 2.25, px: 2.5, pb: 1, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('inventoryManagement.dialog.registerLocationTitle')}
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            size="small"
            label={t('inventoryManagement.form.locationName')}
            {...FORM_OUTLINED}
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            sx={outlinedControlSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => setLocationDialogOpen(false)}
            disabled={masterSaving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', px: 2 }}
          >
            {t('inventoryManagement.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleAddLocation}
            disabled={!canMutate || masterSaving || !newLocationName.trim()}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
          >
            {t('inventoryManagement.actions.add')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={unitDialogOpen}
        onClose={() => !masterSaving && setUnitDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ pt: 2.25, px: 2.5, pb: 1, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('inventoryManagement.dialog.registerUnitTitle')}
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            size="small"
            label={t('inventoryManagement.form.unitName')}
            {...FORM_OUTLINED}
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            sx={outlinedControlSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => setUnitDialogOpen(false)}
            disabled={masterSaving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', px: 2 }}
          >
            {t('inventoryManagement.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleAddUnit}
            disabled={!canMutate || masterSaving || !newUnitName.trim()}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
          >
            {t('inventoryManagement.actions.add')}
          </Button>
        </DialogActions>
      </Dialog>

      <DialogActions
        sx={{
          mt: 2.5,
          pt: 2.5,
          mx: -3,
          px: 3,
          pb: 2,
          gap: 1,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
          bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.06 : 0.03),
        }}
      >
        <Box sx={{ flex: 1 }} />
        <Button onClick={onCancel} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '12px', px: 2 }}>
          {t('inventoryManagement.actions.cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disableElevation
          disabled={!canSubmit}
          sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
        >
          {item ? t('inventoryManagement.actions.update') : t('inventoryManagement.actions.add')}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default InventoryManagement;