import { Router } from 'express';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from '../controllers/accountingController';

const router = Router();

// 인보이스 관련 라우트
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoice);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.delete('/invoices/:id', deleteInvoice);

export default router;
