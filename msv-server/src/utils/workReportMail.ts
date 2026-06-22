import nodemailer from 'nodemailer';
import { Company, User } from '../models';
import { buildNodemailerTransportOptions, getSystemMailTransportOptions } from './mailConfig';

export type WorkReportMailResult =
  | { sent: true; to: string; ccCount: number }
  | { sent: false; reason: string };

function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

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

function formatReportDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * 업무 보고서 제출 시 수신자(To)·참조(CC)에게 이메일 발송.
 * 메일 설정·수신 이메일 없으면 sent:false 반환(보고서 저장은 유지).
 */
export async function sendWorkReportSubmittedEmail(params: {
  tenantId?: number;
  companyId?: number;
  senderUserId?: number;
  report: {
    id: number;
    report_id: string;
    title: string;
    content?: string;
    summary?: string | null;
    report_date?: string | Date;
    type?: string;
  };
  authorName: string;
  recipientUserId: number;
  ccUserIds?: number[];
}): Promise<WorkReportMailResult> {
  const { tenantId, companyId, senderUserId, report, authorName, recipientUserId, ccUserIds = [] } = params;

  if (tenantId == null || companyId == null) {
    return { sent: false, reason: 'tenant/company 정보 없음' };
  }

  const recipientRow = await User.findOne({
    where: { id: recipientUserId, tenant_id: tenantId, company_id: companyId },
    attributes: ['id', 'email', 'username', 'status']
  });
  const to = String((recipientRow as any)?.email || '').trim();
  if (!to) {
    return { sent: false, reason: '수신자 이메일이 등록되어 있지 않습니다.' };
  }

  const companyRow = await Company.findOne({ where: { id: companyId, tenant_id: tenantId } });

  const mailOpts = getSystemMailTransportOptions(companyRow);
  if (!mailOpts) {
    return {
      sent: false,
      reason:
        '메일 서버가 설정되지 않았습니다. 시스템 설정 > 보내는 메일 서버(SMTP)를 확인하세요.'
    };
  }

  const ccIds = [...new Set(ccUserIds.filter((id) => Number.isInteger(id) && id > 0 && id !== recipientUserId))];
  let ccAddresses: string[] = [];
  if (ccIds.length > 0) {
    const ccUsers = await User.findAll({
      where: { id: ccIds, tenant_id: tenantId, company_id: companyId, status: 'active' },
      attributes: ['id', 'email']
    });
    ccAddresses = ccUsers
      .map((u: any) => String(u.email || '').trim())
      .filter((email) => email && email.toLowerCase() !== to.toLowerCase());
    ccAddresses = [...new Set(ccAddresses)];
  }

  const title = String(report.title || '').trim() || '업무 보고서';
  const reportId = String(report.report_id || report.id);
  const reportDate = formatReportDate(report.report_date);
  const summaryPlain = stripHtml(String(report.summary || ''));
  const contentPlain = stripHtml(String(report.content || ''));
  const contentExcerpt = contentPlain.length > 1200 ? `${contentPlain.slice(0, 1200)}…` : contentPlain;

  const baseUrl = resolveAppBaseUrl();
  const viewUrl = baseUrl ? `${baseUrl}/work/reports` : '';

  const subject = `[업무 보고서] ${title}`;
  const textLines = [
    `${authorName}님이 업무 보고서를 제출했습니다.`,
    '',
    `보고서 ID: ${reportId}`,
    reportDate ? `작성일: ${reportDate}` : '',
    `제목: ${title}`,
    summaryPlain ? `\n요약:\n${summaryPlain}` : '',
    contentExcerpt ? `\n내용:\n${contentExcerpt}` : '',
    viewUrl ? `\n시스템에서 확인: ${viewUrl}` : '',
    '',
    '본 메일은 MVS 업무 보고서 알림입니다.'
  ].filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''));

  const html = `
    <div style="font-family:Segoe UI,Malgun Gothic,sans-serif;font-size:14px;color:#111827;line-height:1.55;max-width:640px;">
      <p><strong>${escapeHtml(authorName)}</strong>님이 업무 보고서를 제출했습니다.</p>
      <table style="border-collapse:collapse;margin:12px 0 16px;width:100%;">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top;">보고서 ID</td><td>${escapeHtml(reportId)}</td></tr>
        ${reportDate ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top;">작성일</td><td>${escapeHtml(reportDate)}</td></tr>` : ''}
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top;">제목</td><td><strong>${escapeHtml(title)}</strong></td></tr>
      </table>
      ${summaryPlain ? `<p style="margin:0 0 8px;"><span style="color:#6b7280;">요약</span><br/>${escapeHtml(summaryPlain).replace(/\n/g, '<br/>')}</p>` : ''}
      ${contentExcerpt ? `<p style="margin:0 0 12px;"><span style="color:#6b7280;">내용</span><br/>${escapeHtml(contentExcerpt).replace(/\n/g, '<br/>')}</p>` : ''}
      ${viewUrl ? `<p><a href="${escapeHtml(viewUrl)}" style="color:#007a83;">시스템에서 보고서 확인</a></p>` : ''}
      <p style="margin-top:20px;font-size:12px;color:#9ca3af;">본 메일은 MVS 업무 보고서 알림입니다.</p>
    </div>
  `.trim();

  const transporter = nodemailer.createTransport(buildNodemailerTransportOptions(mailOpts));
  await transporter.sendMail({
    from: mailOpts.from,
    to,
    cc: ccAddresses.length > 0 ? ccAddresses : undefined,
    subject,
    text: textLines.join('\n'),
    html
  });

  return { sent: true, to, ccCount: ccAddresses.length };
}
