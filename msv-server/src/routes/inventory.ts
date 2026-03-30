import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventoryTransactions,
  stockIn,
  stockOut,
  adjustStock,
  getInventoryReport,
} from '../controllers/inventoryController';
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 제품 관련 라우트
router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.post(
  '/products',
  restrictAuditToReadOnly,
  validateBody({
    product_code: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
    category: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string' },
    unit_price: { type: 'number' },
    cost_price: { type: 'number' },
    stock_quantity: { type: 'number' },
    min_stock_level: { type: 'number' },
    max_stock_level: { type: 'number' },
    unit: { type: 'string', maxLength: 20 },
    tax_rate: { type: 'number' },
    status: { type: 'string', maxLength: 20 }
  }),
  createProduct
);
router.put(
  '/products/:id',
  restrictAuditToReadOnly,
  validateBody({
    product_code: { type: 'string', minLength: 1, maxLength: 50 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    category: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string' },
    unit_price: { type: 'number' },
    cost_price: { type: 'number' },
    stock_quantity: { type: 'number' },
    min_stock_level: { type: 'number' },
    max_stock_level: { type: 'number' },
    unit: { type: 'string', maxLength: 20 },
    tax_rate: { type: 'number' },
    status: { type: 'string', maxLength: 20 }
  }),
  updateProduct
);
router.delete('/products/:id', restrictAuditToReadOnly, deleteProduct);

// 재고 거래 관련 라우트
router.get('/transactions', getInventoryTransactions);
router.post(
  '/stock-in',
  restrictAuditToReadOnly,
  validateBody({
    product_id: { required: true, type: 'number' },
    quantity: { required: true, type: 'number' },
    notes: { type: 'string' }
  }),
  stockIn
);
router.post(
  '/stock-out',
  restrictAuditToReadOnly,
  validateBody({
    product_id: { required: true, type: 'number' },
    quantity: { required: true, type: 'number' },
    notes: { type: 'string' }
  }),
  stockOut
);
router.post(
  '/adjust-stock',
  restrictAuditToReadOnly,
  validateBody({
    product_id: { required: true, type: 'number' },
    new_quantity: { required: true, type: 'number' },
    notes: { type: 'string' }
  }),
  adjustStock
);

// 재고 보고서
router.get('/report', getInventoryReport);

export default router;
