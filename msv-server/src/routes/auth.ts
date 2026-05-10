import express from 'express';
import { login, getProfile, register, createSignupPaymentOrder, refreshToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = express.Router();

// 로그인
router.post('/login', validateBody({
  userid: { required: true, type: 'string', minLength: 2, maxLength: 50 },
  password: { required: true, type: 'string', minLength: 6, maxLength: 128 }
}), login);

// 회사+관리자 가입 (요금제/사용기간 포함)
router.post('/signup/payment-order', validateBody({
  planType: { required: true, type: 'string', oneOf: ['free_week_7', 'free_day_1', 'month_5000', 'year_50000'] },
  companyName: { type: 'string', maxLength: 200 },
  businessNumber: { type: 'string', maxLength: 50 },
  adminEmail: { type: 'string', maxLength: 255 }
}), createSignupPaymentOrder);

router.post('/register', validateBody({
  companyName: { required: true, type: 'string', minLength: 2, maxLength: 200 },
  businessNumber: { required: true, type: 'string', minLength: 3, maxLength: 50 },
  gstNumber: { required: true, type: 'string', minLength: 15, maxLength: 15 },
  adminName: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  adminUserid: { required: true, type: 'string', minLength: 2, maxLength: 50 },
  adminEmail: { required: true, type: 'string', minLength: 5, maxLength: 255 },
  adminPassword: { required: true, type: 'string', minLength: 6, maxLength: 128 },
  planType: { required: true, type: 'string', oneOf: ['free_week_7', 'free_day_1', 'month_5000', 'year_50000'] },
  startDate: { type: 'string', maxLength: 20 },
  phone: { type: 'string', maxLength: 50 },
  address: { type: 'string', maxLength: 500 },
  razorpayOrderId: { type: 'string', maxLength: 100 },
  razorpayPaymentId: { type: 'string', maxLength: 100 },
  razorpaySignature: { type: 'string', maxLength: 200 }
}), register);

// 프로필 조회 (인증 필요)
router.get('/profile', authenticateToken, getProfile);
router.post('/refresh', authenticateToken, refreshToken);

export default router;
