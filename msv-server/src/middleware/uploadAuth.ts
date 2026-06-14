import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

/** /uploads 정적 파일 — JWT 필요 (쿼리 access_token 또는 Authorization 헤더) */
export const authenticateUploadAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  const headerToken = req.headers.authorization?.split(' ')[1];
  const queryToken = typeof req.query.access_token === 'string' ? req.query.access_token : undefined;
  const token = headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ success: false, message: '파일 접근에 인증이 필요합니다.' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ success: false, message: '서버 JWT 설정이 누락되었습니다.' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId?: number };
    if (!decoded?.userId) {
      return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }
    req.user = { id: decoded.userId } as AuthRequest['user'];
    return next();
  } catch {
    return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
};
