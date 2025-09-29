import express from 'express';
import { sendNotification, getNotifications } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 알림 전송
router.post('/send', sendNotification);

// 알림 목록 조회
router.get('/', getNotifications);

export default router;
