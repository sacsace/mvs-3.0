import nodemailer from 'nodemailer';
import { Company, User } from '../models';
import { buildNodemailerTransportOptions, getSystemMailTransportOptions } from './mailConfig';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveAppBaseUrl(): string {
  const raw = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
  const first = raw.split(',')[0]?.trim();
  return first ? first.replace(/\/$/, '') : '';
}

export function resolveNotificationLink(data?: Record<string, unknown>): string {
  const base = resolveAppBaseUrl();
  if (!base || !data) return '';

  const feature = String(data.feature || '');
  switch (feature) {
    case 'work_report':
      return `${base}/work/reports`;
    case 'work_board':
    case 'work_board_comment':
      return data.board_id != null ? `${base}/work/boards/${data.board_id}` : `${base}/work/boards`;
    case 'expense_report':
      return `${base}/accounting/expense`;
    case 'approval':
      return `${base}/work/approval`;
    case 'vacation':
      return `${base}/hr/leave`;
    case 'quotation':
      return `${base}/work/quotation`;
    default:
      if (data.href) {
        const href = String(data.href);
        return href.startsWith('http') ? href : `${base}${href.startsWith('/') ? href : `/${href}`}`;
      }
      return base;
  }
}

/**
 * 사용자 알림(pushNotification)에 대응하는 이메일 발송.
 * 수신 주소는 User.email에서 조회한다.
 */
export async function sendUserNotificationEmail(params: {
  targetUserId: number;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  tenantId?: number;
  companyId?: number;
}): Promise<void> {
  const target = await User.findByPk(params.targetUserId, {
    attributes: ['id', 'email', 'username', 'tenant_id', 'company_id', 'status']
  });
  if (!target) return;

  const to = String((target as any).email || '').trim();
  if (!to) {
    console.warn(`[notifyMail] user ${params.targetUserId} has no email`);
    return;
  }

  const tenantId = params.tenantId ?? (target as any).tenant_id;
  const companyId = params.companyId ?? (target as any).company_id;

  const companyRow =
    companyId != null && tenantId != null
      ? await Company.findOne({ where: { id: companyId, tenant_id: tenantId } })
      : null;

  const mailOpts = getSystemMailTransportOptions(companyRow);
  if (!mailOpts) {
    console.warn('[notifyMail] mail transport not configured (system settings)');
    return;
  }

  const link = resolveNotificationLink(params.data);
  const subject = `[MVS] ${params.title}`;
  const text = [
    params.message,
    link ? `\n\n시스템에서 확인: ${link}` : '',
    '\n\n본 메일은 MVS 알림입니다.'
  ]
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');

  const html = `
    <div style="font-family:Segoe UI,Malgun Gothic,sans-serif;font-size:14px;color:#111827;line-height:1.55;max-width:640px;">
      <p style="margin:0 0 12px;">${escapeHtml(params.message).replace(/\n/g, '<br/>')}</p>
      ${link ? `<p><a href="${escapeHtml(link)}" style="color:#007a83;">시스템에서 확인</a></p>` : ''}
      <p style="margin-top:20px;font-size:12px;color:#9ca3af;">본 메일은 MVS 알림입니다.</p>
    </div>
  `.trim();

  const transporter = nodemailer.createTransport(buildNodemailerTransportOptions(mailOpts));
  await transporter.sendMail({
    from: mailOpts.from,
    to,
    subject,
    text,
    html
  });
}
