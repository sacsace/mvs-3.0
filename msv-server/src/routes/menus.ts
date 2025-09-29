import express from 'express';
import { getMenus, createMenu, updateMenu, deleteMenu } from '../controllers/menuController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 메뉴 목록 조회
router.get('/', getMenus);

// 메뉴 생성 (관리자만)
router.post('/', requireRole(['admin', 'root']), createMenu);

// 메뉴 수정 (관리자만)
router.put('/:id', requireRole(['admin', 'root']), updateMenu);

// 메뉴 삭제 (관리자만)
router.delete('/:id', requireRole(['admin', 'root']), deleteMenu);

export default router;
