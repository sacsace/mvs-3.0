import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models';

// 비밀번호 해싱 함수
const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

interface LoginRequest extends Request {
  body: {
    userid: string;
    password: string;
  };
}

export const login = async (req: LoginRequest, res: Response) => {
  try {
    const { userid, password } = req.body;

    if (!userid || !password) {
      return res.status(400).json({
        success: false,
        message: '사용자 ID와 비밀번호를 입력해주세요.'
      });
    }

    // 사용자 조회
    const user = await User.findOne({
      where: { userid, status: 'active' }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 비밀번호 확인
    console.log('🔍 디버깅 - 입력된 비밀번호:', password);
    console.log('🔍 디버깅 - 저장된 해시:', user.password_hash);
    const isValidPassword = await comparePassword(password, user.password_hash);
    console.log('🔍 디버깅 - 비밀번호 검증 결과:', isValidPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.id, 
        userid: user.userid, 
        role: user.role,
        tenantId: user.tenant_id,
        companyId: user.company_id
      },
      process.env.JWT_SECRET || 'mvs-secret-key',
      { expiresIn: '24h' }
    );

    // 마지막 로그인 시간 업데이트
    await user.update({ last_login: new Date() });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          userid: user.userid,
          username: user.username,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
          tenant_id: user.tenant_id,
          company_id: user.company_id
        }
      },
      message: '로그인 성공'
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    res.json({
      success: true,
      data: {
        id: user.id,
        userid: user.userid,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};
