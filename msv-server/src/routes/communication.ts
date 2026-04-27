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
import { requireMenuPermissionAny } from '../middleware/menuPermission';
import { validateBody } from '../middleware/validate';

const router = Router();

/**
 * DB별로 공지 메뉴 route가 다를 수 있음.
 * - 하위: `/communication/notice`, `/communication/notices`
 * - 일부 구 DB: 상위만 `/communication` 이고 이름만「공지사항」(20260125141000 rename) → 권한 행이 이 id에만 묶임
 */
const MENU_NOTICE_ROUTES = ['/communication/notice', '/communication/notices', '/communication'];

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 공지사항 관련 라우트 — 메뉴 권한과 동일하게 API에서 강제
router.get('/notices', requireMenuPermissionAny(MENU_NOTICE_ROUTES, 'can_view'), getNotices);
router.get('/notices/:id', requireMenuPermissionAny(MENU_NOTICE_ROUTES, 'can_view'), getNotice);
router.post(
  '/notices',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_NOTICE_ROUTES, 'can_create'),
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
  requireMenuPermissionAny(MENU_NOTICE_ROUTES, 'can_edit'),
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
router.delete(
  '/notices/:id',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_NOTICE_ROUTES, 'can_delete'),
  deleteNotice
);
router.post(
  '/notices/:id/publish',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_NOTICE_ROUTES, 'can_edit'),
  publishNotice
);
router.post(
  '/notices/:id/archive',
  restrictAuditToReadOnly,
  requireMenuPermissionAny(MENU_NOTICE_ROUTES, 'can_edit'),
  archiveNotice
);

export default router;



