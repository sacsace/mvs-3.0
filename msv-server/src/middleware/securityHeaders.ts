import { Request, Response, NextFunction } from 'express';

const isProdLike = () =>
  process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === '1';

/**
 * Railway 등 리버스 프록시 뒤에서 HTTP 요청을 HTTPS로 301.
 * X-Forwarded-Proto 가 없을 때(내부 헬스체크)는 리다이렉트하지 않음.
 */
export const forceHttpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (!isProdLike()) return next();
  const forwarded = req.get('x-forwarded-proto');
  if (!forwarded) return next();
  const proto = forwarded.split(',')[0].trim().toLowerCase();
  if (proto === 'https') return next();
  const host = req.get('host') || 'localhost';
  return res.redirect(301, `https://${host}${req.originalUrl}`);
};

/** API 응답용 보수적 CSP (+ 클릭재킹 frame-ancestors) */
export const buildApiContentSecurityPolicy = () =>
  [
    "default-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
