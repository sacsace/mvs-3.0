import { Router } from 'express';
import {
  getNotices,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  publishNotice,
  archiveNotice,
} from '../controllers/noticeController';
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 공지사항 관련 라우트
router.get('/notices', getNotices);
router.get('/notices/:id', getNotice);
router.post(
  '/notices',
  restrictAuditToReadOnly,
  validateBody({
    title: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    content: { required: true, type: 'string', minLength: 1 },
    category: { type: 'string', oneOf: ['general', 'urgent', 'maintenance', 'policy', 'event'] },
    priority: { type: 'string', oneOf: ['low', 'medium', 'high', 'urgent'] },
    status: { type: 'string', oneOf: ['draft', 'published', 'archived'] },
    target_audience: { type: 'string', oneOf: ['all', 'employees', 'managers', 'specific'] },
    is_public: { type: 'boolean' },
    attachments: { type: 'array' }
  }),
  createNotice
);
router.put(
  '/notices/:id',
  restrictAuditToReadOnly,
  validateBody({
    title: { type: 'string', minLength: 1, maxLength: 255 },
    content: { type: 'string', minLength: 1 },
    category: { type: 'string', oneOf: ['general', 'urgent', 'maintenance', 'policy', 'event'] },
    priority: { type: 'string', oneOf: ['low', 'medium', 'high', 'urgent'] },
    status: { type: 'string', oneOf: ['draft', 'published', 'archived'] },
    target_audience: { type: 'string', oneOf: ['all', 'employees', 'managers', 'specific'] },
    is_public: { type: 'boolean' },
    attachments: { type: 'array' }
  }),
  updateNotice
);
router.delete('/notices/:id', restrictAuditToReadOnly, deleteNotice);
router.post('/notices/:id/publish', restrictAuditToReadOnly, publishNotice);
router.post('/notices/:id/archive', restrictAuditToReadOnly, archiveNotice);

export default router;



