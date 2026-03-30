import { Router } from 'express';
import {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
} from '../controllers/quotationController';
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 견적서 관련 라우트
router.get('/', getQuotations);
router.get('/:id', getQuotation);
router.post(
  '/',
  restrictAuditToReadOnly,
  validateBody({
    quotation_number: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    customer_name: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    customer_id: { type: 'number' },
    customer_email: { type: 'string', maxLength: 255 },
    customer_phone: { type: 'string', maxLength: 50 },
    customer_address: { type: 'string' },
    items: { required: true },
    subtotal: { type: 'number' },
    tax_rate: { type: 'number' },
    tax_amount: { type: 'number' },
    discount: { type: 'number' },
    total_amount: { required: true, type: 'number' },
    currency: { type: 'string', maxLength: 10 },
    valid_until: { type: 'string', pattern: datePattern },
    status: { type: 'string', oneOf: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'] },
    notes: { type: 'string' },
    terms: { type: 'string' }
  }),
  createQuotation
);
router.put(
  '/:id',
  restrictAuditToReadOnly,
  validateBody({
    customer_name: { type: 'string', minLength: 1, maxLength: 255 },
    customer_id: { type: 'number' },
    customer_email: { type: 'string', maxLength: 255 },
    customer_phone: { type: 'string', maxLength: 50 },
    customer_address: { type: 'string' },
    items: { required: false },
    subtotal: { type: 'number' },
    tax_rate: { type: 'number' },
    tax_amount: { type: 'number' },
    discount: { type: 'number' },
    total_amount: { type: 'number' },
    currency: { type: 'string', maxLength: 10 },
    valid_until: { type: 'string', pattern: datePattern },
    status: { type: 'string', oneOf: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled'] },
    notes: { type: 'string' },
    terms: { type: 'string' }
  }),
  updateQuotation
);
router.delete('/:id', restrictAuditToReadOnly, deleteQuotation);
router.post('/:id/send', restrictAuditToReadOnly, sendQuotation);

export default router;


