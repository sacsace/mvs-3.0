import { env } from '../config/env';
import SMTPTransport = require('nodemailer/lib/smtp-transport');

export type MailTransportResolved = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  /** nodemailer sendMail `from` — 문자열 또는 "Name <email>" */
  from: string;
};

/** nodemailer `createTransport` 옵션 — Gmail(587 STARTTLS) 등에 맞춤 */
export function buildNodemailerTransportOptions(mailOpts: MailTransportResolved): SMTPTransport.Options {
  const opt: SMTPTransport.Options = {
    host: mailOpts.host,
    port: mailOpts.port,
    secure: mailOpts.secure,
    auth: mailOpts.auth
  };

  // 587·2525: STARTTLS — requireTLS로 업그레이드 유도(Gmail 포함)
  if (!mailOpts.secure && (mailOpts.port === 587 || mailOpts.port === 2525)) {
    opt.requireTLS = true;
  }

  const hostLower = mailOpts.host.toLowerCase();
  if (hostLower.includes('gmail.com')) {
    opt.tls = { minVersion: 'TLSv1.2' };
  }

  return opt;
}

/** DB JSON / 일부 드라이버에서 문자열로 올 때 대비 */
function parseCompanySettings(settings: unknown): Record<string, unknown> | undefined {
  if (settings == null) return undefined;
  if (typeof settings === 'string') {
    try {
      const o = JSON.parse(settings) as unknown;
      return typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof settings === 'object') return settings as Record<string, unknown>;
  return undefined;
}

/**
 * 포트와 implicit TLS(`secure`) 일치.
 * - 465: 처음부터 TLS → secure true
 * - 587·25·2525: 평문 후 STARTTLS → secure false (여기서 secure true 쓰면 OpenSSL `wrong version number` 발생 가능)
 */
export function resolveSmtpSecure(port: number, rawSecure?: boolean): boolean {
  if (port === 465) return true;
  if (port === 587 || port === 25 || port === 2525) return false;
  return rawSecure === true;
}

type MailServerRaw = {
  host?: string;
  port?: number | string;
  secure?: boolean;
  authUser?: string;
  authPass?: string;
  fromEmail?: string;
  fromName?: string;
};

/**
 * `settings.mailServer` 한 덩어리에서 SMTP 연결 정보 해석.
 * 비밀번호가 비어 있으면 호스트·계정이 서버 환경변수(EMAIL_*)와 같을 때만 env 비밀번호 사용.
 */
function resolveMailServerRecord(raw: MailServerRaw | undefined): MailTransportResolved | null {
  if (!raw?.host || !raw.authUser) return null;
  const host = String(raw.host).trim();
  const authUser = String(raw.authUser).trim();
  if (!host || !authUser) return null;

  let pass = raw.authPass != null ? String(raw.authPass).trim() : '';
  if (
    !pass &&
    env.EMAIL_HOST &&
    env.EMAIL_USER &&
    env.EMAIL_PASS &&
    authUser === String(env.EMAIL_USER).trim() &&
    host === String(env.EMAIL_HOST).trim()
  ) {
    pass = env.EMAIL_PASS;
  }
  if (!pass) return null;

  const port = Math.max(1, Number(raw.port) || env.EMAIL_PORT || 587);
  const secure = resolveSmtpSecure(port, raw.secure);
  const addr = (raw.fromEmail || authUser).trim();
  const name = (raw.fromName || '').trim();
  const from = name ? `${name} <${addr}>` : addr;
  return {
    host,
    port,
    secure,
    auth: { user: authUser, pass },
    from
  };
}

function mailServerFromSettingsBlob(settings: unknown): MailTransportResolved | null {
  const parsed = parseCompanySettings(settings);
  const raw = parsed?.mailServer as MailServerRaw | undefined;
  return resolveMailServerRecord(raw);
}

/** 사용자 SMTP에 비어 있는 계정·발신 필드를 로그인 정보로 보강한 뒤 해석 */
function mailServerFromUserWithLoginFallback(
  user: { settings?: unknown; email?: string | null; username?: string | null } | null | undefined
): MailTransportResolved | null {
  if (!user) return null;
  const parsed = parseCompanySettings(user.settings);
  const raw = ((parsed?.mailServer || {}) as MailServerRaw) || {};
  const loginEmail = user.email != null ? String(user.email).trim() : '';
  const loginName = user.username != null ? String(user.username).trim() : '';
  const authUser = String(raw.authUser || '').trim() || loginEmail;
  const fromEmail = String(raw.fromEmail || '').trim() || loginEmail;
  const fromName = String(raw.fromName || '').trim() || loginName;
  return resolveMailServerRecord({
    ...raw,
    authUser: authUser || undefined,
    fromEmail: fromEmail || undefined,
    fromName: fromName || undefined
  });
}

/**
 * SMTP 우선순위: 사용자 `settings.mailServer`(계정·발신은 로그인 이메일·이름으로 보강) → 회사 `settings.mailServer` → 환경변수 EMAIL_*.
 */
export function getResolvedMailTransportOptions(
  company: { settings?: unknown } | null | undefined,
  user?: { settings?: unknown; email?: string | null; username?: string | null } | null | undefined
): MailTransportResolved | null {
  const fromUser = mailServerFromUserWithLoginFallback(user);
  if (fromUser) return fromUser;

  const fromCompany = mailServerFromSettingsBlob(company?.settings);
  if (fromCompany) return fromCompany;

  if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
    const port = env.EMAIL_PORT || 587;
    return {
      host: env.EMAIL_HOST,
      port,
      secure: resolveSmtpSecure(port, undefined),
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
      from: env.EMAIL_USER
    };
  }

  return null;
}
