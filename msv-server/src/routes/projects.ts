import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController';
import { authenticateToken, restrictAuditToReadOnly } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 프로젝트 관련 라우트
router.get('/', getProjects);
router.get('/:id', getProject);
router.post(
  '/',
  restrictAuditToReadOnly,
  validateBody({
    project_code: { required: true, type: 'string', minLength: 2, maxLength: 50 },
    name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
    start_date: { required: true, type: 'string', pattern: datePattern },
    project_manager: { required: true, type: 'number' },
    status: { type: 'string', maxLength: 20 },
    priority: { type: 'string', maxLength: 20 }
  }),
  createProject
);
router.put(
  '/:id',
  restrictAuditToReadOnly,
  validateBody({
    project_code: { type: 'string', minLength: 2, maxLength: 50 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    start_date: { type: 'string', pattern: datePattern },
    project_manager: { type: 'number' },
    status: { type: 'string', maxLength: 20 },
    priority: { type: 'string', maxLength: 20 }
  }),
  updateProject
);
router.delete('/:id', restrictAuditToReadOnly, deleteProject);

export default router;
