import express from 'express';
import {
  getUserMenus,
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  setUserPermissions,
  getUserPermissions
} from '../controllers/menuController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 사용자별 메뉴 조회 (권한 기반)
router.get('/user/:userId/tenant/:tenantId', authenticateToken, getUserMenus);

// 모든 메뉴 조회 (관리자용)
router.get('/tenant/:tenantId', authenticateToken, getAllMenus);

// 메뉴 생성 (관리자용)
router.post('/tenant/:tenantId', authenticateToken, createMenu);

// 메뉴 수정 (관리자용)
router.put('/:menuId', authenticateToken, updateMenu);

// 메뉴 삭제 (관리자용)
router.delete('/:menuId', authenticateToken, deleteMenu);

// 사용자 권한 설정 (관리자용)
router.post('/permissions/user/:userId', authenticateToken, setUserPermissions);

// 사용자 권한 조회
router.get('/permissions/user/:userId', authenticateToken, getUserPermissions);

export default router;
