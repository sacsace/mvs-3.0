import nodemailer from 'nodemailer';
import { Company, User } from '../models';
import { buildNodemailerTransportOptions, getResolvedMailTransportOptions } from './mailConfig';
import { bilingualSubject, buildBilingualHtml, buildBilingualText } from './mailBilingual';
import { parseSettingsBlob } from './settingsBlob';

function resolveAppBaseUrl(): string {
  const raw = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
  const first = raw.split(',')[0]?.trim();
  return first ? first.replace(/\/$/, '') : '';
}

const parseUserSettings = parseSettingsBlob;

/** 수신자 알림 메일 수신 허용 여부 */
function shouldSendEmailForNotification(
  settings: Record<string, unknown>,
  feature?: string
): boolean {
  const ui = (settings.ui || {}) as Record<string, unknown>;
  const prefs = (ui.notificationSettings || {}) as Record<string, unknown>;
  // email 스위치가 명시적으로 false일 때만 차단 (미설정·true는 발송)
  if (prefs.email === false) return false;

  const f = String(feature || '');
  if (f === 'work_board' || f === 'work_board_comment' || f === 'work_board_comment_reply') {
    if (prefs.workBoard === false) return false;
  }
  if (f === 'work_report' && prefs.workReport === false) return false;
  if (f === 'vacation' && prefs.vacation === false) return false;
  if ((f === 'approval' || f === 'quotation') && prefs.approval === false) return false;
  if (f === 'expense_report' && prefs.expense === false) return false;
  if (f === 'system' && prefs.system === false) return false;
  return true;
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
    case 'work_board_comment_reply': {
      if (typeof data.href === 'string' && data.href.startsWith('/') && !data.href.startsWith('//')) {
        return `${base}${data.href}`;
      }
      if (data.board_id != null) {
        const cardQs =
          data.card_id != null && Number(data.card_id) > 0 ? `?card=${data.card_id}` : '';
        return `${base}/work/projects/${data.board_id}${cardQs}`;
      }
      return `${base}/work/projects`;
    }
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
        if (href.startsWith('http://') || href.startsWith('https://')) return href;
        if (href.startsWith('/') && !href.startsWith('//')) return `${base}${href}`;
      }
      return base;
  }
}

const TITLE_EN_BY_KO: Record<string, string> = {
  '업무 등록': 'Work Task Created',
  '업무 담당자 지정': 'Work Assignee Assignment',
  '댓글 멘션': 'Comment Mention',
  '휴가 승인 요청': 'Leave Approval Request',
  '견적서 승인 요청': 'Quotation Approval Request',
  '인보이스 삭제 승인 요청': 'Invoice Delete Approval Request',
  '업무 보고서 제출': 'Work Report Submitted',
  '업무 보고서': 'Work Report',
  '업무 보고서 승인': 'Work Report Approved',
  '업무 보고서 피드백': 'Work Report Feedback',
  '결제 요청': 'Payment Request',
  '결제 승인': 'Payment Approved',
  '결제 반려': 'Payment Rejected',
  '지출 승인 요청': 'Expense Approval Request',
  '지출 승인': 'Expense Approved',
  '지출 반려': 'Expense Rejected'
};

function resolveEnglishTitle(title: string, data?: Record<string, unknown>): string {
  const fromData = String(data?.title_en || '').trim();
  if (fromData) return fromData;
  const exact = TITLE_EN_BY_KO[title];
  if (exact) return exact;
  for (const [ko, en] of Object.entries(TITLE_EN_BY_KO)) {
    if (title.startsWith(ko)) {
      return title.replace(ko, en);
    }
  }
  return title;
}

function resolveEnglishMessage(
  message: string,
  data?: Record<string, unknown>
): string {
  const fromData = String(data?.message_en || '').trim();
  if (fromData) return fromData;

  const feature = String(data?.feature || '');
  const actor = String(data?.actor_name || '').trim();
  const cardTitle = String(data?.card_title || '').trim();

  if (feature === 'work_board' && actor && cardTitle) {
    return `${actor} assigned you as the assignee of the "${cardTitle}" card.`;
  }
  if (feature === 'work_board_comment' && actor && cardTitle) {
    return `${actor} mentioned you in a comment on the "${cardTitle}" card.`;
  }
  if (feature === 'vacation') {
    return message
      .replace(/님이 휴가를 신청했습니다\./g, ' submitted a leave request.')
      .replace(/님이/g, '')
      .trim();
  }
  if (feature === 'quotation') {
    const qn = String(data?.quotation_number || '').trim();
    if (qn && message.includes('승인을 요청')) {
      const name = message.split('님이')[0]?.trim() || 'Someone';
      return `${name} requested approval for quotation ${qn}.`;
    }
  }
  if (feature === 'expense_report') {
    if (message.includes('결제 요청을 보냈습니다')) {
      const name = message.split('님이')[0]?.trim() || 'Someone';
      return `${name} sent a payment request.`;
    }
    if (message.includes('삭제 승인 요청')) {
      return message.replace('삭제 승인 요청이 등록되었습니다.', 'delete approval request has been registered.');
    }
  }

  return message;
}

/**
 * 사용자 알림(pushNotification)에 대응하는 이메일 발송.
 * 수신 주소는 User.email에서 조회한다. 본문은 한글·영문 병기.
 * SMTP: 회사 → 발신자(sender) 개인 SMTP → 환경변수.
 */
export async function sendUserNotificationEmail(params: {
  targetUserId: number;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  tenantId?: number;
  companyId?: number;
  /** 회사 SMTP 없을 때 폴백용 발신자(업무 등록자 등) */
  senderUserId?: number;
}): Promise<void> {
  const target = await User.findByPk(params.targetUserId, {
    attributes: ['id', 'email', 'username', 'tenant_id', 'company_id', 'status', 'settings']
  });
  if (!target) return;

  const to = String((target as any).email || '').trim();
  if (!to) {
    console.warn(`[notifyMail] user ${params.targetUserId} has no email`);
    return;
  }

  const targetSettings = parseUserSettings((target as any).settings);
  const feature = params.data ? String(params.data.feature || '') : '';
  if (!shouldSendEmailForNotification(targetSettings, feature)) {
    return;
  }

  const tenantId = params.tenantId ?? (target as any).tenant_id;
  const companyId = params.companyId ?? (target as any).company_id;

  const companyRow =
    companyId != null && tenantId != null
      ? await Company.findOne({ where: { id: companyId, tenant_id: tenantId } })
      : null;

  let senderUser: { settings?: unknown } | null = null;
  if (params.senderUserId) {
    senderUser = await User.findByPk(params.senderUserId, {
      attributes: ['id', 'settings'],
    });
  }

  const mailOpts = getResolvedMailTransportOptions(companyRow, senderUser);
  if (!mailOpts) {
    console.warn('[notifyMail] mail transport not configured (company or personal SMTP)');
    return;
  }

  const link = resolveNotificationLink(params.data);
  const titleEn = resolveEnglishTitle(params.title, params.data);
  const messageEn = resolveEnglishMessage(params.message, params.data);
  const content = {
    titleKo: params.title,
    titleEn,
    bodyKo: params.message,
    bodyEn: messageEn,
    linkUrl: link || undefined
  };

  const transporter = nodemailer.createTransport(buildNodemailerTransportOptions(mailOpts));
  await transporter.sendMail({
    from: mailOpts.from,
    to,
    subject: bilingualSubject(`[MVS] ${params.title}`, `[MVS] ${titleEn}`),
    text: buildBilingualText(content),
    html: buildBilingualHtml(content)
  });
}
