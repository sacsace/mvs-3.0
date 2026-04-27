import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getInvoices,
  getNextInvoiceNumber,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  sendInvoiceEmail,
  getAccountingStats,
  getProformaInvoices,
  createProformaInvoice,
  updateProformaInvoiceStatus,
  createEInvoiceFromProforma,
  getEInvoices,
  createEInvoice,
  updateEInvoiceStatus,
  generateEInvoiceIrn,
  createEWayBillFromEInvoice,
  getExpenseReports,
  getExpenseReportById,
  createExpenseReport,
  updateExpenseReport,
  deleteExpenseReport,
  updateExpenseReportStatus,
  uploadExpenseReceiptById,
  requestExpensePayment,
  rejectExpensePayment,
  approveExpensePayment,
  completeExpensePayment,
  retryExpenseTransfer,
  getReceiptUploadToken,
  uploadExpenseReceiptByToken,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getAccountingBasicInfo,
  updateAccountingBasicInfo,
  approveInvoice,
  rejectInvoice,
} from '../controllers/accountingController';
import {
  getEWayBills,
  getEWayBill,
  createEWayBill,
  updateEWayBill,
  generateEWayBill,
  cancelEWayBill,
  deleteEWayBill,
} from '../controllers/ewayBillController';
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// 영수증 업로드용 multer (인증 없이 토큰으로만 사용)
const uploadPath = process.env.UPLOAD_PATH || './uploads';
const expenseReceiptsPath = path.join(uploadPath, 'expense-receipts');
if (!fs.existsSync(expenseReceiptsPath)) {
  fs.mkdirSync(expenseReceiptsPath, { recursive: true });
}
const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, expenseReceiptsPath),
  filename: (_req, file, cb) => {
    const safeName = (file.originalname || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const finalName = `${Date.now()}_${safeName}`;
    cb(null, finalName);
  }
});
const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('이미지 또는 PDF만 업로드 가능합니다.'));
  }
});

// 토큰으로 영수증 업로드 (인증 미들웨어 없음 - 휴대폰에서 QR 스캔 후 호출)
router.post('/expenses/upload-receipt', receiptUpload.single('file'), uploadExpenseReceiptByToken);

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 인보이스 관련 라우트
router.get('/invoices/next-number', getNextInvoiceNumber);
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoice);
router.post('/invoices/:id/approve', restrictAuditToReadOnly, approveInvoice);
router.post('/invoices/:id/reject', restrictAuditToReadOnly, rejectInvoice);
router.post(
  '/invoices',
  restrictAuditToReadOnly,
  validateBody({
    customer_id: { type: 'number' },
    customer_name: { type: 'string', maxLength: 255 },
    invoice_date: { type: 'string', pattern: datePattern },
    due_date: { type: 'string', pattern: datePattern },
    subtotal: { type: 'number' },
    tax_amount: { type: 'number' },
    total_amount: { type: 'number' },
    status: { type: 'string', maxLength: 20 },
    payment_status: { type: 'string', maxLength: 20 },
    payment_method: { type: 'string', maxLength: 50 },
    payment_date: { type: 'string', pattern: datePattern },
    notes: { type: 'string' },
    approver_user_id: { required: true, type: 'number' }
  }),
  createInvoice
);
router.put(
  '/invoices/:id',
  restrictAuditToReadOnly,
  validateBody({
    customer_id: { type: 'number' },
    customer_name: { type: 'string', maxLength: 255 },
    invoice_date: { type: 'string', pattern: datePattern },
    due_date: { type: 'string', pattern: datePattern },
    subtotal: { type: 'number' },
    tax_amount: { type: 'number' },
    total_amount: { type: 'number' },
    status: { type: 'string', maxLength: 20 },
    payment_status: { type: 'string', maxLength: 20 },
    payment_method: { type: 'string', maxLength: 50 },
    payment_date: { type: 'string', pattern: datePattern },
    notes: { type: 'string' },
    approver_user_id: { type: 'number' }
  }),
  updateInvoice
);
router.put(
  '/invoices/:id/status',
  restrictAuditToReadOnly,
  validateBody({
    status: { type: 'string', maxLength: 20 },
    payment_status: { type: 'string', maxLength: 20 },
    payment_method: { type: 'string', maxLength: 50 },
    payment_date: { type: 'string', pattern: datePattern }
  }),
  updateInvoiceStatus
);
router.delete('/invoices/:id', restrictAuditToReadOnly, deleteInvoice);
router.post(
  '/invoices/:id/send-email',
  restrictAuditToReadOnly,
  validateBody({
    to: { required: true, type: 'string', minLength: 3, maxLength: 255 },
    subject: { type: 'string', maxLength: 200 },
    message: { type: 'string' },
    filename: { type: 'string', maxLength: 255 }
  }),
  sendInvoiceEmail
);

// 프로포마 인보이스 관련 라우트
router.get('/proforma-invoices', getProformaInvoices);
router.post(
  '/proforma-invoices',
  restrictAuditToReadOnly,
  validateBody({
    customer_id: { type: 'number' },
    customer_name: { type: 'string', maxLength: 255 },
    invoice_date: { type: 'string', pattern: datePattern },
    due_date: { type: 'string', pattern: datePattern },
    subtotal: { type: 'number' },
    tax_amount: { type: 'number' },
    total_amount: { type: 'number' },
    status: { type: 'string', maxLength: 20 },
    notes: { type: 'string' }
  }),
  createProformaInvoice
);
router.put(
  '/proforma-invoices/:id/status',
  restrictAuditToReadOnly,
  validateBody({
    status: { required: true, type: 'string', maxLength: 20 }
  }),
  updateProformaInvoiceStatus
);
router.post('/proforma-invoices/:id/create-e-invoice', restrictAuditToReadOnly, createEInvoiceFromProforma);

// E-Invoice 관련 라우트
router.get('/e-invoices', getEInvoices);
router.post(
  '/e-invoices',
  restrictAuditToReadOnly,
  validateBody({
    customer_id: { type: 'number' },
    customer_name: { type: 'string', maxLength: 255 },
    invoice_date: { type: 'string', pattern: datePattern },
    due_date: { type: 'string', pattern: datePattern },
    subtotal: { type: 'number' },
    tax_amount: { type: 'number' },
    total_amount: { type: 'number' },
    status: { type: 'string', maxLength: 20 },
    notes: { type: 'string' },
    approver_user_id: { required: true, type: 'number' }
  }),
  createEInvoice
);
router.put(
  '/e-invoices/:id/status',
  restrictAuditToReadOnly,
  validateBody({
    status: { required: true, type: 'string', maxLength: 20 }
  }),
  updateEInvoiceStatus
);
router.post('/e-invoices/:id/generate-irn', restrictAuditToReadOnly, generateEInvoiceIrn);
router.post('/e-invoices/:id/create-eway-bill', restrictAuditToReadOnly, createEWayBillFromEInvoice);

// E-Way Bill 관련 라우트
router.get('/eway-bills', getEWayBills);
router.get('/eway-bills/:id', getEWayBill);
router.post(
  '/eway-bills',
  restrictAuditToReadOnly,
  validateBody({
    invoice_number: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    invoice_date: { required: true, type: 'string', pattern: datePattern },
    supply_type: { required: true, type: 'string', oneOf: ['outward', 'inward'] },
    document_type: { type: 'string', oneOf: ['invoice', 'credit_note', 'debit_note', 'bill_of_supply'] },
    document_number: { type: 'string', minLength: 1, maxLength: 100 },
    document_date: { type: 'string', pattern: datePattern },
    from_gstin: { required: true, type: 'string', minLength: 1, maxLength: 15 },
    from_name: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    from_address: { required: true, type: 'string', minLength: 1 },
    from_pincode: { required: true, type: 'string', minLength: 1, maxLength: 10 },
    from_state: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    from_state_code: { required: true, type: 'number' },
    to_name: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    to_address: { required: true, type: 'string', minLength: 1 },
    to_pincode: { required: true, type: 'string', minLength: 1, maxLength: 10 },
    to_state: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    to_state_code: { required: true, type: 'number' },
    transport_mode: { required: true, type: 'string', oneOf: ['road', 'rail', 'air', 'ship'] },
    vehicle_number: { type: 'string', maxLength: 50 },
    vehicle_type: { type: 'string', maxLength: 50 },
    transporter_id: { type: 'string', maxLength: 100 },
    transporter_name: { type: 'string', maxLength: 255 },
    transporter_gstin: { type: 'string', maxLength: 15 },
    transporter_doc_number: { type: 'string', maxLength: 100 },
    transporter_doc_date: { type: 'string', pattern: datePattern },
    distance: { type: 'number' },
    notes: { type: 'string' }
  }),
  createEWayBill
);
router.put(
  '/eway-bills/:id',
  restrictAuditToReadOnly,
  validateBody({
    invoice_number: { type: 'string', minLength: 1, maxLength: 100 },
    invoice_date: { type: 'string', pattern: datePattern },
    supply_type: { type: 'string', oneOf: ['outward', 'inward'] },
    document_type: { type: 'string', oneOf: ['invoice', 'credit_note', 'debit_note', 'bill_of_supply'] },
    document_number: { type: 'string', minLength: 1, maxLength: 100 },
    document_date: { type: 'string', pattern: datePattern },
    from_gstin: { type: 'string', minLength: 1, maxLength: 15 },
    from_name: { type: 'string', minLength: 1, maxLength: 255 },
    from_address: { type: 'string', minLength: 1 },
    from_pincode: { type: 'string', minLength: 1, maxLength: 10 },
    from_state: { type: 'string', minLength: 1, maxLength: 100 },
    from_state_code: { type: 'number' },
    to_name: { type: 'string', minLength: 1, maxLength: 255 },
    to_address: { type: 'string', minLength: 1 },
    to_pincode: { type: 'string', minLength: 1, maxLength: 10 },
    to_state: { type: 'string', minLength: 1, maxLength: 100 },
    to_state_code: { type: 'number' },
    transport_mode: { type: 'string', oneOf: ['road', 'rail', 'air', 'ship'] },
    vehicle_number: { type: 'string', maxLength: 50 },
    vehicle_type: { type: 'string', maxLength: 50 },
    transporter_id: { type: 'string', maxLength: 100 },
    transporter_name: { type: 'string', maxLength: 255 },
    transporter_gstin: { type: 'string', maxLength: 15 },
    transporter_doc_number: { type: 'string', maxLength: 100 },
    transporter_doc_date: { type: 'string', pattern: datePattern },
    distance: { type: 'number' },
    notes: { type: 'string' }
  }),
  updateEWayBill
);
router.post('/eway-bills/:id/generate', restrictAuditToReadOnly, generateEWayBill);
router.post(
  '/eway-bills/:id/cancel',
  restrictAuditToReadOnly,
  validateBody({
    cancellation_reason: { type: 'string' }
  }),
  cancelEWayBill
);
router.delete('/eway-bills/:id', restrictAuditToReadOnly, deleteEWayBill);

// 회계 통계 라우트
router.get('/stats', getAccountingStats);

// 지출결의서 라우트
router.get('/expenses', getExpenseReports);
router.get('/expenses/:id', getExpenseReportById);
router.get('/expenses/:id/receipt-upload-token', getReceiptUploadToken);
router.post('/expenses/:id/upload-receipt', restrictAuditToReadOnly, receiptUpload.array('files'), uploadExpenseReceiptById);
router.post(
  '/expenses',
  restrictAuditToReadOnly,
  validateBody({
    expense_id: { type: 'string', maxLength: 100 },
    title: { type: 'string', maxLength: 255 },
    requester_id: { type: 'number' },
    requester_name: { type: 'string', maxLength: 100 },
    requester_department: { type: 'string', maxLength: 100 },
    requester_position: { type: 'string', maxLength: 100 },
    total_amount: { type: 'number' },
    currency: { type: 'string', maxLength: 10 },
    purpose: { type: 'string' },
    status: { type: 'string', oneOf: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'paid'] },
    priority: { type: 'string', oneOf: ['low', 'medium', 'high', 'urgent'] },
    due_date: { type: 'string', pattern: datePattern },
    notes: { type: 'string' }
  }),
  createExpenseReport
);
router.put(
  '/expenses/:id',
  restrictAuditToReadOnly,
  validateBody({
    expense_id: { type: 'string', minLength: 1, maxLength: 100 },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    requester_id: { type: 'number' },
    requester_name: { type: 'string', minLength: 1, maxLength: 100 },
    requester_department: { type: 'string', maxLength: 100 },
    requester_position: { type: 'string', maxLength: 100 },
    total_amount: { type: 'number' },
    currency: { type: 'string', maxLength: 10 },
    purpose: { type: 'string', minLength: 1 },
    status: { type: 'string', oneOf: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'paid'] },
    priority: { type: 'string', oneOf: ['low', 'medium', 'high', 'urgent'] },
    due_date: { type: 'string', pattern: datePattern },
    notes: { type: 'string' }
  }),
  updateExpenseReport
);
router.delete('/expenses/:id', restrictAuditToReadOnly, deleteExpenseReport);
router.put(
  '/expenses/:id/status',
  restrictAuditToReadOnly,
  validateBody({
    status: { required: true, type: 'string', oneOf: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'paid'] }
  }),
  updateExpenseReportStatus
);
router.post('/expenses/:id/request-payment', restrictAuditToReadOnly, requestExpensePayment);
router.post(
  '/expenses/:id/reject-payment',
  restrictAuditToReadOnly,
  validateBody({
    reason: { type: 'string', maxLength: 1000 }
  }),
  rejectExpensePayment
);
router.post(
  '/expenses/:id/approve-payment',
  restrictAuditToReadOnly,
  validateBody({
    reason: { type: 'string', maxLength: 1000 }
  }),
  approveExpensePayment
);
router.post(
  '/expenses/:id/complete-payment',
  restrictAuditToReadOnly,
  validateBody({
    provider: { type: 'string', oneOf: ['icici', 'kotak'] }
  }),
  completeExpensePayment
);
router.post(
  '/expenses/:id/retry-transfer',
  restrictAuditToReadOnly,
  validateBody({
    provider: { type: 'string', oneOf: ['icici', 'kotak'] }
  }),
  retryExpenseTransfer
);

// 예산 라우트
router.get('/budgets', getBudgets);
router.post(
  '/budgets',
  restrictAuditToReadOnly,
  validateBody({
    budget_id: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    name: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    type: { required: true, type: 'string', oneOf: ['annual', 'quarterly', 'monthly', 'project'] },
    period: { required: true, type: 'string', minLength: 1, maxLength: 20 },
    start_date: { required: true, type: 'string', pattern: datePattern },
    end_date: { required: true, type: 'string', pattern: datePattern },
    total_planned: { type: 'number' },
    total_actual: { type: 'number' },
    total_variance: { type: 'number' },
    variance_percentage: { type: 'number' },
    status: { type: 'string', oneOf: ['draft', 'pending', 'approved', 'active', 'completed', 'cancelled'] },
    notes: { type: 'string' }
  }),
  createBudget
);
router.put(
  '/budgets/:id',
  restrictAuditToReadOnly,
  validateBody({
    budget_id: { type: 'string', minLength: 1, maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    type: { type: 'string', oneOf: ['annual', 'quarterly', 'monthly', 'project'] },
    period: { type: 'string', minLength: 1, maxLength: 20 },
    start_date: { type: 'string', pattern: datePattern },
    end_date: { type: 'string', pattern: datePattern },
    total_planned: { type: 'number' },
    total_actual: { type: 'number' },
    total_variance: { type: 'number' },
    variance_percentage: { type: 'number' },
    status: { type: 'string', oneOf: ['draft', 'pending', 'approved', 'active', 'completed', 'cancelled'] },
    notes: { type: 'string' }
  }),
  updateBudget
);
router.delete('/budgets/:id', restrictAuditToReadOnly, deleteBudget);

// 자산 라우트
router.get('/assets', getAssets);
router.post(
  '/assets',
  restrictAuditToReadOnly,
  validateBody({
    asset_code: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    name: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    category: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    subcategory: { type: 'string', maxLength: 100 },
    purchase_date: { type: 'string', pattern: datePattern },
    purchase_price: { type: 'number' },
    current_value: { type: 'number' },
    depreciation_rate: { type: 'number' },
    accumulated_depreciation: { type: 'number' },
    location: { type: 'string', maxLength: 255 },
    status: { type: 'string', oneOf: ['active', 'maintenance', 'disposed', 'lost', 'transferred'] },
    maintenance_date: { type: 'string', pattern: datePattern },
    next_maintenance: { type: 'string', pattern: datePattern },
    warranty_expiry: { type: 'string', pattern: datePattern },
    description: { type: 'string' },
    vendor: { type: 'string', maxLength: 100 },
    serial_number: { type: 'string', maxLength: 100 },
    assigned_to: { type: 'string', maxLength: 100 },
    department: { type: 'string', maxLength: 100 },
    useful_life: { type: 'number' },
    depreciation_method: { type: 'string', oneOf: ['straight_line', 'declining_balance', 'units_of_production'] }
  }),
  createAsset
);
router.put(
  '/assets/:id',
  restrictAuditToReadOnly,
  validateBody({
    asset_code: { type: 'string', minLength: 1, maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    category: { type: 'string', minLength: 1, maxLength: 100 },
    subcategory: { type: 'string', maxLength: 100 },
    purchase_date: { type: 'string', pattern: datePattern },
    purchase_price: { type: 'number' },
    current_value: { type: 'number' },
    depreciation_rate: { type: 'number' },
    accumulated_depreciation: { type: 'number' },
    location: { type: 'string', maxLength: 255 },
    status: { type: 'string', oneOf: ['active', 'maintenance', 'disposed', 'lost', 'transferred'] },
    maintenance_date: { type: 'string', pattern: datePattern },
    next_maintenance: { type: 'string', pattern: datePattern },
    warranty_expiry: { type: 'string', pattern: datePattern },
    description: { type: 'string' },
    vendor: { type: 'string', maxLength: 100 },
    serial_number: { type: 'string', maxLength: 100 },
    assigned_to: { type: 'string', maxLength: 100 },
    department: { type: 'string', maxLength: 100 },
    useful_life: { type: 'number' },
    depreciation_method: { type: 'string', oneOf: ['straight_line', 'declining_balance', 'units_of_production'] }
  }),
  updateAsset
);
router.delete('/assets/:id', restrictAuditToReadOnly, deleteAsset);

// 회계 기본정보 관리
router.get('/basic-info', getAccountingBasicInfo);
router.put('/basic-info', restrictAuditToReadOnly, updateAccountingBasicInfo);

export default router;
