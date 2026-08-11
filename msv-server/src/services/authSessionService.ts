import jwt, { SignOptions } from 'jsonwebtoken';
import { MVS_NOTIFIER_CLIENT } from '../constants/authClients';

export type AuthTokenUser = {
  id: number;
  userid: string;
  role: string;
  tenant_id: number;
  company_id?: number | null;
  session_version?: number | null;
};

/**
 * 웹: session_version 을 +1 한 값으로 서명 (단일 동시 로그인).
 * 알람 앱: 현재 session_version 유지 + client claim (웹 세션과 공존).
 */
export function buildAuthTokenClaims(
  user: AuthTokenUser,
  options: { isNotifier: boolean; sessionVersion: number }
): Record<string, unknown> {
  const claims: Record<string, unknown> = {
    userId: user.id,
    userid: user.userid,
    role: user.role,
    tenantId: user.tenant_id,
    companyId: user.company_id,
    sv: options.sessionVersion,
  };
  if (options.isNotifier) {
    claims.client = MVS_NOTIFIER_CLIENT;
  }
  return claims;
}

export function signAuthToken(
  claims: Record<string, unknown>,
  jwtSecret: string,
  expiresInSeconds: number
): string {
  const signOptions: SignOptions = { expiresIn: expiresInSeconds };
  return jwt.sign(claims, jwtSecret, signOptions);
}

export function nextWebSessionVersion(current: number): number {
  const n = Number(current);
  return (Number.isFinite(n) ? Math.floor(n) : 0) + 1;
}
