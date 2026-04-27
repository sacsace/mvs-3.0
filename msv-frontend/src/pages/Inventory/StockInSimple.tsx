import React, { useCallback, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Snackbar,
  TextField,
  Typography,
  Alert,
  Stack,
  InputAdornment,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { PostAdd as PostAddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { api, inventoryService } from '../../services/api';
import { useMenuStore } from '../../store';
import { useMenuRoutePermissionFlags } from '../../hooks/useMenuRoutePermissionFlags';

const STOCK_IN_MENU_ROUTES = ['/inventory/stock-in', '/inventory'] as const;

type ProductLookup = {
  id: number;
  product_code?: string;
  name?: string;
  category?: string;
  unit?: string;
  stock_quantity?: number;
  image_url?: string;
};

const resolveProductImageUrl = (p: string | undefined) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${base}${path}`;
};

/** 품목코드와 정확히 일치하는 제품만 조회 (바코드 스캔용) */
async function findProductByExactCode(code: string): Promise<ProductLookup | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const res = await inventoryService.getProducts({ search: trimmed, limit: 100 });
  const rows = (res as any)?.data ?? [];
  const upper = trimmed.toUpperCase();
  return (
    rows.find((p: { product_code?: string }) => (p.product_code || '').trim().toUpperCase() === upper) ?? null
  );
}

/** 입고 관리 — 이미 등록된 품목에 대한 추가 입고만 처리 */
const StockInSimple: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useMenuStore();
  const perm = useMenuRoutePermissionFlags(STOCK_IN_MENU_ROUTES);
  const txt = useCallback((ko: string, en: string) => (language === 'en' ? en : ko), [language]);
  const codeRef = useRef<HTMLInputElement | null>(null);
  const [productCode, setProductCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [stockQuantity, setStockQuantity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [matchedProductId, setMatchedProductId] = useState<number | null>(null);
  const [matchedCurrentStock, setMatchedCurrentStock] = useState<number | null>(null);
  /** 조회 완료 후 해당 코드의 등록 품목 없음 */
  const [lookupNotFound, setLookupNotFound] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [snack, setSnack] = useState<{ open: boolean; msg: string; ok: boolean }>({
    open: false,
    msg: '',
    ok: true
  });

  const [nameSearchOptions, setNameSearchOptions] = useState<ProductLookup[]>([]);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  /** 제품명 검색에서 선택된 값(코드 조회 성공 시에도 동기화) */
  const [namePick, setNamePick] = useState<ProductLookup | null>(null);
  const nameSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProductFields = useCallback(() => {
    setMatchedProductId(null);
    setMatchedCurrentStock(null);
    setName('');
    setCategory('');
    setUnit('');
    setPreviewImageUrl('');
    setNamePick(null);
    setStockQuantity(0);
  }, []);

  const applyProductFromLookup = useCallback((product: ProductLookup) => {
    if (!product?.id) return;
    setMatchedProductId(product.id);
    setProductCode(String(product.product_code ?? '').trim());
    setName(String(product.name ?? ''));
    setCategory(String(product.category ?? '').trim() || '—');
    setUnit(String(product.unit ?? '').trim() || '—');
    setMatchedCurrentStock(
      typeof product.stock_quantity === 'number' ? product.stock_quantity : Number(product.stock_quantity) || 0
    );
    setStockQuantity(0);
    setPreviewImageUrl(resolveProductImageUrl(product.image_url));
    setLookupNotFound(false);
    setNamePick(product);
  }, []);

  const runLookup = useCallback(async () => {
    const code = productCode.trim();
    if (!code) {
      setLookupNotFound(false);
      clearProductFields();
      return;
    }
    setLookupLoading(true);
    setLookupNotFound(false);
    try {
      const product = await findProductByExactCode(code);
      if (product?.id) {
        applyProductFromLookup(product);
      } else {
        setMatchedProductId(null);
        setMatchedCurrentStock(null);
        setName('');
        setCategory('');
        setUnit('');
        setPreviewImageUrl('');
        setNamePick(null);
        setLookupNotFound(true);
      }
    } catch {
      setMatchedProductId(null);
      setMatchedCurrentStock(null);
      setLookupNotFound(false);
      setName('');
      setCategory('');
      setUnit('');
      setPreviewImageUrl('');
      setNamePick(null);
      setSnack({ open: true, msg: txt('품목 조회에 실패했습니다.', 'Product lookup failed.'), ok: false });
    } finally {
      setLookupLoading(false);
    }
  }, [productCode, applyProductFromLookup, clearProductFields, txt]);

  const resetForm = useCallback(() => {
    setProductCode('');
    setName('');
    setCategory('');
    setUnit('');
    setStockQuantity(0);
    setMatchedProductId(null);
    setMatchedCurrentStock(null);
    setLookupNotFound(false);
    setPreviewImageUrl('');
    setNamePick(null);
    setNameSearchOptions([]);
    codeRef.current?.focus();
  }, []);

  const onNameSearchInput = useCallback((_e: unknown, value: string, reason: string) => {
    if (reason === 'reset') return;
    if (nameSearchDebounceRef.current) clearTimeout(nameSearchDebounceRef.current);
    nameSearchDebounceRef.current = setTimeout(async () => {
      const q = value.trim();
      if (!q) {
        setNameSearchOptions([]);
        return;
      }
      setNameSearchLoading(true);
      try {
        const res = await inventoryService.getProducts({ search: q, limit: 40 });
        setNameSearchOptions(((res as any)?.data ?? []) as ProductLookup[]);
      } catch {
        setNameSearchOptions([]);
      } finally {
        setNameSearchLoading(false);
      }
    }, 300);
  }, []);

  const submit = useCallback(async () => {
    if (!perm.canMutate) {
      setSnack({ open: true, msg: t('common.menuNoMutate'), ok: false });
      return;
    }
    const nm = name.trim();
    if (matchedProductId == null) {
      setSnack({
        open: true,
        msg: txt(
          '등록된 품목코드로 조회된 품목이 있어야 입고할 수 있습니다.',
          'Select a registered product (lookup by code) before receiving stock.'
        ),
        ok: false
      });
      return;
    }
    if (!nm) {
      setSnack({
        open: true,
        msg: txt('품목 정보를 불러올 수 없습니다. 다시 조회하세요.', 'Could not load product. Look up again.'),
        ok: false
      });
      return;
    }
    if (stockQuantity < 1) {
      setSnack({
        open: true,
        msg: txt('입고 수량은 1 이상 입력하세요.', 'Enter a quantity of at least 1.'),
        ok: false
      });
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryService.stockIn({
        product_id: matchedProductId,
        quantity: stockQuantity,
        notes: txt('입고(입고 관리)', 'Stock in (Receiving)')
      });
      if (!(res as any)?.success) {
        setSnack({
          open: true,
          msg: (res as any)?.message || txt('입고 처리에 실패했습니다.', 'Stock-in failed.'),
          ok: false
        });
        return;
      }
      setSnack({
        open: true,
        msg:
          language === 'en'
            ? `Received · ${nm} (+${stockQuantity})`
            : `입고 완료 · ${nm} (+${stockQuantity})`,
        ok: true
      });
      resetForm();
    } catch (e: any) {
      setSnack({
        open: true,
        msg: e?.response?.data?.message || e?.message || txt('처리에 실패했습니다.', 'Request failed.'),
        ok: false
      });
    } finally {
      setLoading(false);
    }
  }, [name, stockQuantity, matchedProductId, resetForm, txt, language, perm.canMutate, t]);

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      bgcolor: 'background.paper'
    }
  };

  /** 기존 품목 조회 후 수정 불가 필드 — 배경·테두리로 입력 가능 필드와 구분 */
  const readOnlyHighlightSx = (theme: Theme) => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      '& fieldset': {
        borderColor: alpha(theme.palette.primary.main, 0.38)
      },
      '&:hover fieldset': {
        borderColor: alpha(theme.palette.primary.main, 0.55)
      },
      '&.Mui-focused': {
        bgcolor: alpha(theme.palette.primary.main, 0.12)
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 1
      }
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: theme.palette.primary.dark
    }
  });

  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: 'workArea.main',
        borderRadius: 2,
        minHeight: '100%'
      }}
    >
      <Box sx={{ maxWidth: { xs: '100%', sm: 720, md: 880 }, width: '100%', mx: 'auto', px: { xs: 0, sm: 0 } }}>
        <Stack spacing={1.25} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <PostAddIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography
              component="h1"
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.4
              }}
            >
              {txt('입고 관리', 'Receiving')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, pl: { xs: 0, sm: 0.25 } }}>
            {txt(
              '이미 시스템에 등록된 품목만 입고할 수 있습니다. 아래에서 제품명을 검색해 선택하거나, 품목코드를 입력·스캔한 뒤 Enter 또는 포커스를 옮기면 품목 정보·이미지를 불러옵니다. 신규 제품은 재고(제품) 관리에서 먼저 등록하세요. 출고는 "출고 관리"에서 바코드로 처리합니다.',
              'Only items already in the system can be received. Search and pick a product name below, or enter/scan an item code and press Enter or move focus to load details and image. Register new products first in Inventory (Products). Outbound stock uses barcodes in Outbound management.'
            )}
          </Typography>
        </Stack>

        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
          }}
        >
          <CardContent
            sx={{
              p: { xs: 2.5, sm: 3 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5
            }}
          >
            <Autocomplete<ProductLookup, false, false, false>
              value={namePick}
              disabled={perm.menusLoading || !perm.canMutate}
              onChange={(_e, v) => {
                if (v && typeof v === 'object' && v.id) {
                  applyProductFromLookup(v);
                } else {
                  setProductCode('');
                  setLookupNotFound(false);
                  clearProductFields();
                }
              }}
              onInputChange={onNameSearchInput}
              options={nameSearchOptions}
              loading={nameSearchLoading}
              filterOptions={(x) => x}
              getOptionLabel={(p) => {
                const code = (p.product_code || '').trim();
                const nm = (p.name || '').trim() || '—';
                return code ? `${nm} · ${code}` : nm;
              }}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              fullWidth
              size="medium"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={txt('제품명 검색', 'Product name search')}
                  placeholder={txt('이름 일부 입력 후 목록에서 선택', 'Type part of the name, then pick from the list')}
                  helperText={txt('등록된 제품명·코드로 검색됩니다.', 'Searches registered product names and codes.')}
                  FormHelperTextProps={{ sx: { mx: 0, mt: 0.75 } }}
                  sx={fieldSx}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {nameSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />

            <TextField
              inputRef={codeRef}
              label={txt('품목코드 / 바코드', 'Item code / barcode')}
              disabled={perm.menusLoading || !perm.canMutate}
              value={productCode}
              onChange={(e) => {
                setProductCode(e.target.value);
                setNamePick(null);
                setMatchedProductId(null);
                setMatchedCurrentStock(null);
                setLookupNotFound(false);
                setPreviewImageUrl('');
              }}
              onBlur={() => {
                void runLookup();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runLookup();
                }
              }}
              autoFocus
              fullWidth
              size="medium"
              required
              variant="outlined"
              helperText={
                lookupLoading
                  ? txt('조회 중…', 'Looking up…')
                  : matchedProductId
                    ? txt(
                        `조회됨 · 현재 재고 ${matchedCurrentStock ?? 0}`,
                        `Found · current stock ${matchedCurrentStock ?? 0}`
                      )
                    : lookupNotFound
                      ? txt(
                          '등록된 품목이 없습니다. 제품 등록 후 다시 시도하세요.',
                          'No matching product. Register the product first, then try again.'
                        )
                      : txt(
                          '입력 후 Enter 또는 다음 칸으로 이동 시 조회',
                          'Press Enter or move focus to look up'
                        )
              }
              FormHelperTextProps={{ sx: { mx: 0, mt: 0.75 } }}
              InputProps={{
                endAdornment: lookupLoading ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : undefined
              }}
              sx={fieldSx}
            />

            {lookupNotFound && (
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 1.5 }}>
                {txt(
                  '이 품목코드로 등록된 제품이 없습니다. 재고(제품) 관리에서 제품을 먼저 등록한 뒤 입고하세요.',
                  'No product is registered for this code. Add the product in Inventory (Products), then receive stock here.'
                )}
              </Alert>
            )}

            {matchedProductId != null && (
              <>
                <Box
                  sx={(theme) => ({
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.28),
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    p: 1.5,
                    minHeight: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  })}
                >
                  {previewImageUrl ? (
                    <Box
                      component="img"
                      src={previewImageUrl}
                      alt=""
                      sx={{
                        maxHeight: 220,
                        maxWidth: '100%',
                        width: 'auto',
                        objectFit: 'contain',
                        borderRadius: 1,
                        bgcolor: 'background.paper'
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {txt('등록된 제품 이미지가 없습니다.', 'No product image on file.')}
                    </Typography>
                  )}
                </Box>

            <TextField
              label={txt('품명', 'Product name')}
              value={name}
              fullWidth
              size="medium"
              required
              variant="outlined"
              InputProps={{ readOnly: true }}
              helperText={txt('조회된 품목 정보입니다. 수정할 수 없습니다.', 'Looked-up product (read-only).')}
              FormHelperTextProps={{ sx: { mx: 0, mt: 0.75 } }}
              sx={readOnlyHighlightSx}
            />
            <TextField
              label={txt('카테고리', 'Category')}
              value={category}
              fullWidth
              size="medium"
              variant="outlined"
              InputProps={{ readOnly: true }}
              sx={readOnlyHighlightSx}
            />
            <TextField
              label={txt('단위', 'Unit')}
              value={unit}
              fullWidth
              size="medium"
              variant="outlined"
              InputProps={{ readOnly: true }}
              sx={readOnlyHighlightSx}
            />
            <TextField
              label={txt('입고 수량', 'Quantity to receive')}
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(Math.max(0, Number(e.target.value) || 0))}
              inputProps={{ min: 0 }}
              fullWidth
              size="medium"
              variant="outlined"
              disabled={perm.menusLoading || !perm.canMutate}
              helperText={txt(
                `현재 재고 ${matchedCurrentStock ?? 0}에 더해질 수량입니다.`,
                `Amount to add to current stock (${matchedCurrentStock ?? 0}).`
              )}
              FormHelperTextProps={{ sx: { mx: 0, mt: 0.75 } }}
              sx={fieldSx}
            />
            <Tooltip title={t('common.menuNoMutate')} disableHoverListener={perm.menusLoading || perm.canMutate}>
              <span style={{ display: 'block' }}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={loading || lookupLoading || perm.menusLoading || !perm.canMutate}
                  onClick={submit}
                  fullWidth
                  sx={{
                    mt: 0.5,
                    py: 1.35,
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: '0 2px 8px rgba(25, 118, 210, 0.35)' }
                  }}
                >
                  {txt('입고 처리', 'Receive stock')}
                </Button>
              </span>
            </Tooltip>
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.ok ? 'success' : 'error'} variant="filled" sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockInSimple;
