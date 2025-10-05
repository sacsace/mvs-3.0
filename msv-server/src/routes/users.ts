import express from 'express';
import { User } from '../models';
import { authenticateToken, requireRole } from '../middleware/auth';

// 간단한 비밀번호 해싱 함수 (개발용)
const hashPassword = async (password: string): Promise<string> => {
  return Buffer.from(password).toString('base64');
};

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 사용자 목록 조회
router.get('/', async (req, res) => {
  try {
    const users = await (User as any).findAll({
      where: { 
        tenant_id: (req as any).user.tenant_id,
        company_id: (req as any).user.company_id 
      },
      attributes: ['id', 'userid', 'username', 'email', 'role', 'department', 'position', 'status', 'last_login'],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 사용자 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await (User as any).findOne({
      where: { 
        id,
        tenant_id: (req as any).user.tenant_id,
        company_id: (req as any).user.company_id 
      },
      attributes: ['id', 'userid', 'username', 'email', 'role', 'department', 'position', 'status', 'last_login', 'created_at']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('사용자 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 사용자 생성 (관리자만)
router.post('/', requireRole(['admin', 'root']), async (req, res) => {
  try {
    const { userid, username, email, password, role, department, position } = req.body;

    if (!userid || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '필수 필드를 입력해주세요.'
      });
    }

    // 중복 확인
    const existingUser = await (User as any).findOne({
      where: { userid }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 존재하는 사용자 ID입니다.'
      });
    }

    // 비밀번호 해싱 (개발용)
    const password_hash = await hashPassword(password);

    const user = await (User as any).create({
      tenant_id: (req as any).user.tenant_id,
      company_id: (req as any).user.company_id,
      userid,
      username,
      email,
      password_hash,
      role: role || 'user',
      department,
      position,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        userid: user.userid,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        status: user.status
      },
      message: '사용자가 생성되었습니다.'
    });
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

export default router;
