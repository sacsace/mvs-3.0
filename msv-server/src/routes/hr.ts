import { Router } from 'express';
import {
  getPayrolls,
  getPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
  approvePayroll,
  payPayroll,
} from '../controllers/hrController';
import {
  getAttendances,
  getAttendance,
  checkIn,
  checkOut,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getTodayAttendance,
} from '../controllers/attendanceController';
import {
  getVacations,
  getVacation,
  createVacation,
  updateVacation,
  deleteVacation,
  approveVacation,
  rejectVacation,
  getAnnualLeaveInfo,
  getVacationPolicy,
  updateVacationPolicy,
  exportVacationsToExcel,
} from '../controllers/vacationController';
import {
  getPerformances,
  getPerformance,
  createPerformance,
  updatePerformance,
  deletePerformance,
} from '../controllers/performanceController';
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 급여 관련 라우트
router.get('/payrolls', getPayrolls);
router.get('/payrolls/:id', getPayroll);
router.post(
  '/payrolls',
  restrictAuditToReadOnly,
  validateBody({
    employee_id: { required: true, type: 'number' },
    payroll_period: { required: true, type: 'string', minLength: 1, maxLength: 20 },
    basic_salary: { type: 'number' },
    overtime_pay: { type: 'number' },
    bonus: { type: 'number' },
    allowances: { type: 'number' },
    deductions: { type: 'number' },
    gross_salary: { type: 'number' },
    net_salary: { type: 'number' },
    tax_amount: { type: 'number' },
    status: { type: 'string', maxLength: 20 },
    payment_date: { type: 'string', pattern: datePattern }
  }),
  createPayroll
);
router.put(
  '/payrolls/:id',
  restrictAuditToReadOnly,
  validateBody({
    employee_id: { type: 'number' },
    payroll_period: { type: 'string', minLength: 1, maxLength: 20 },
    basic_salary: { type: 'number' },
    overtime_pay: { type: 'number' },
    bonus: { type: 'number' },
    allowances: { type: 'number' },
    deductions: { type: 'number' },
    gross_salary: { type: 'number' },
    net_salary: { type: 'number' },
    tax_amount: { type: 'number' },
    status: { type: 'string', maxLength: 20 },
    payment_date: { type: 'string', pattern: datePattern }
  }),
  updatePayroll
);
router.delete('/payrolls/:id', restrictAuditToReadOnly, deletePayroll);
router.post('/payrolls/:id/approve', restrictAuditToReadOnly, approvePayroll);
router.post('/payrolls/:id/pay', restrictAuditToReadOnly, payPayroll);

// 근태 관련 라우트
router.get('/attendances', getAttendances);
router.get('/attendances/today', getTodayAttendance);
router.get('/attendances/:id', getAttendance);
router.post('/attendances/check-in', restrictAuditToReadOnly, checkIn);
router.post('/attendances/check-out', restrictAuditToReadOnly, checkOut);
router.post(
  '/attendances',
  restrictAuditToReadOnly,
  validateBody({
    user_id: { required: true, type: 'number' },
    date: { required: true, type: 'string', pattern: datePattern },
    status: { type: 'string', oneOf: ['normal', 'late', 'early', 'overtime', 'absent'] },
    notes: { type: 'string' }
  }),
  createAttendance
);
router.put(
  '/attendances/:id',
  restrictAuditToReadOnly,
  validateBody({
    user_id: { type: 'number' },
    date: { type: 'string', pattern: datePattern },
    status: { type: 'string', oneOf: ['normal', 'late', 'early', 'overtime', 'absent'] },
    notes: { type: 'string' }
  }),
  updateAttendance
);
router.delete('/attendances/:id', restrictAuditToReadOnly, deleteAttendance);

// 휴가 관련 라우트
router.get('/vacations', getVacations);
router.get('/vacations/excel/export', exportVacationsToExcel);
router.get('/vacations/annual-leave', getAnnualLeaveInfo);
router.get('/vacations/policy', getVacationPolicy);
router.put(
  '/vacations/policy',
  restrictAuditToReadOnly,
  validateBody({
    annualLeaveStartDays: { required: true },
    annualLeaveEarnDays: { required: false }
  }),
  updateVacationPolicy
);
router.get('/vacations/:id', getVacation);
router.post(
  '/vacations',
  restrictAuditToReadOnly,
  validateBody({
    user_id: { required: false, type: 'number' }, // 미제공 시 본인(req.user.id)으로 처리
    vacation_type: { required: true, type: 'string', oneOf: ['annual', 'sick', 'personal', 'study', 'maternity', 'paternity'] },
    start_date: { required: true, type: 'string', pattern: datePattern },
    end_date: { required: true, type: 'string', pattern: datePattern },
    days: { required: true, type: 'number' },
    reason: { required: true, type: 'string', minLength: 1 },
    status: { type: 'string', oneOf: ['pending', 'approved', 'rejected', 'cancelled'] },
    applied_date: { type: 'string', pattern: datePattern },
    attachments: { type: 'string' }
  }),
  createVacation
);
router.put(
  '/vacations/:id',
  restrictAuditToReadOnly,
  validateBody({
    user_id: { type: 'number' },
    vacation_type: { type: 'string', oneOf: ['annual', 'sick', 'personal', 'study', 'maternity', 'paternity'] },
    start_date: { type: 'string', pattern: datePattern },
    end_date: { type: 'string', pattern: datePattern },
    days: { type: 'number' },
    reason: { type: 'string', minLength: 1 },
    status: { type: 'string', oneOf: ['pending', 'approved', 'rejected', 'cancelled'] },
    applied_date: { type: 'string', pattern: datePattern },
    attachments: { type: 'string' }
  }),
  updateVacation
);
router.delete('/vacations/:id', restrictAuditToReadOnly, deleteVacation);
router.post('/vacations/:id/approve', restrictAuditToReadOnly, approveVacation);
router.post('/vacations/:id/reject', restrictAuditToReadOnly, rejectVacation);

// 성과 관련 라우트
router.get('/performances', getPerformances);
router.get('/performances/:id', getPerformance);
router.post(
  '/performances',
  restrictAuditToReadOnly,
  validateBody({
    user_id: { required: true, type: 'number' },
    review_period: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    overall_rating: { type: 'number' },
    manager_comment: { required: true, type: 'string', minLength: 1 },
    employee_comment: { type: 'string' },
    status: { type: 'string', oneOf: ['draft', 'submitted', 'reviewed', 'approved', 'finalized'] },
    reviewed_by: { type: 'number' }
  }),
  createPerformance
);
router.put(
  '/performances/:id',
  restrictAuditToReadOnly,
  validateBody({
    user_id: { type: 'number' },
    review_period: { type: 'string', minLength: 1, maxLength: 50 },
    overall_rating: { type: 'number' },
    manager_comment: { type: 'string', minLength: 1 },
    employee_comment: { type: 'string' },
    status: { type: 'string', oneOf: ['draft', 'submitted', 'reviewed', 'approved', 'finalized'] },
    reviewed_by: { type: 'number' }
  }),
  updatePerformance
);
router.delete('/performances/:id', restrictAuditToReadOnly, deletePerformance);

export default router;
