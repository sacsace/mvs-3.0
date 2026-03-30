import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Company } from '../models';
import { AuthRequest } from '../types';

const maskToken = (tokenValue?: string) => {
  if (!tokenValue) return '없음';
  return `${tokenValue.substring(0, 6)}...${tokenValue.slice(-4)}`;
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  try {
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '액세스 토큰이 필요합니다.' 
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: '서버 JWT 설정이 누락되었습니다.'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // 사용자 정보 조회 - 존재하는 컬럼만 명시적으로 지정
    const user = await (User as any).findByPk(decoded.userId, {
      attributes: [
        'id', 'userid', 'username', 'email', 'role',
        'tenant_id', 'company_id', 'department', 'position', 'status', 'last_login', 'is_payment_officer'
      ]
    });
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({ 
        success: false, 
        message: '유효하지 않은 사용자입니다.' 
      });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('❌ 토큰 검증 오류:', {
      message: error.message,
      name: error.name,
      token: maskToken(token),
      authHeader: req.headers['authorization'] ? '있음' : '없음'
    });
    return res.status(403).json({ 
      success: false, 
      message: '유효하지 않은 토큰입니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '인증이 필요합니다.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: '권한이 부족합니다.' 
      });
    }

    next();
  };
};

// audit 권한은 GET 요청만 허용 (검색 및 view만 가능)
export const restrictAuditToReadOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: '인증이 필요합니다.' 
    });
  }

  // audit 권한이고 GET 요청이 아니면 차단
  if (req.user.role === 'audit' && req.method !== 'GET') {
    return res.status(403).json({ 
      success: false, 
      message: 'audit 권한은 조회만 가능합니다.' 
    });
  }

  next();
};

const isMinsubCompanyName = (name?: string): boolean => {
  if (!name) return false;
  return name.toLowerCase().includes('minsub ventures');
};

export const requireRootOrMinsubEmployee = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '인증이 필요합니다.'
    });
  }

  if (req.user.role === 'root') {
    return next();
  }

  try {
    const company = await (Company as any).findByPk(req.user.company_id, {
      attributes: ['id', 'name', 'tenant_id']
    });

    if (!company || !isMinsubCompanyName(company.name)) {
      return res.status(403).json({
        success: false,
        message: '접근 권한이 없습니다.'
      });
    }

    return next();
  } catch (error) {
    console.error('Minsub 권한 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '권한 확인 중 오류가 발생했습니다.'
    });
  }
};
