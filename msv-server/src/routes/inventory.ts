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
} from '../controllers/inventoryController';

const router = Router();

// 제품 관련 라우트
router.get('/products', getProducts);
router.get('/products/:id', getProduct);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// 재고 거래 관련 라우트
router.get('/transactions', getInventoryTransactions);
router.post('/stock-in', stockIn);
router.post('/stock-out', stockOut);
router.post('/adjust-stock', adjustStock);

export default router;
