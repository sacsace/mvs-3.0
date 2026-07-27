/** 모든 시스템 메일의 한글·영문 병기 헬퍼 */

export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function bilingualSubject(ko: string, en: string): string {
  const k = String(ko || '').trim();
  const e = String(en || '').trim();
  if (!k) return e || '[MVS]';
  if (!e || k === e) return k;
  return `${k} / ${e}`;
}

export type BilingualMailContent = {
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** 이미 HTML인 본문(표 등). 있으면 bodyKo/bodyEn 대신 섹션에 삽입 */
  bodyHtmlKo?: string;
  bodyHtmlEn?: string;
  linkUrl?: string;
  linkLabelKo?: string;
  linkLabelEn?: string;
  footerKo?: string;
  footerEn?: string;
};

const DEFAULT_FOOTER_KO = '본 메일은 MVS 알림입니다.';
const DEFAULT_FOOTER_EN = 'This is an MVS notification.';
const DEFAULT_LINK_KO = '시스템에서 확인';
const DEFAULT_LINK_EN = 'View in system';

function nlToBr(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br/>');
}

/** plain text 본문 (한글 + 영문) */
export function buildBilingualText(content: BilingualMailContent): string {
  const linkKo = content.linkLabelKo || DEFAULT_LINK_KO;
  const linkEn = content.linkLabelEn || DEFAULT_LINK_EN;
  const footerKo = content.footerKo || DEFAULT_FOOTER_KO;
  const footerEn = content.footerEn || DEFAULT_FOOTER_EN;

  const lines = [
    '[KO]',
    content.titleKo,
    content.bodyKo,
    '',
    '[EN]',
    content.titleEn,
    content.bodyEn,
    content.linkUrl ? `\n${linkKo} / ${linkEn}: ${content.linkUrl}` : '',
    '',
    `${footerKo} / ${footerEn}`
  ];

  return lines
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');
}

/** HTML 본문 (한글 + 영문 섹션) */
export function buildBilingualHtml(content: BilingualMailContent): string {
  const linkKo = content.linkLabelKo || DEFAULT_LINK_KO;
  const linkEn = content.linkLabelEn || DEFAULT_LINK_EN;
  const footerKo = content.footerKo || DEFAULT_FOOTER_KO;
  const footerEn = content.footerEn || DEFAULT_FOOTER_EN;

  const bodyKo = content.bodyHtmlKo ?? `<p style="margin:0 0 16px;">${nlToBr(content.bodyKo)}</p>`;
  const bodyEn = content.bodyHtmlEn ?? `<p style="margin:0 0 16px;">${nlToBr(content.bodyEn)}</p>`;
  const linkHtml = content.linkUrl
    ? `<p><a href="${escapeHtml(content.linkUrl)}" style="color:#007a83;">${escapeHtml(linkKo)} / ${escapeHtml(linkEn)}</a></p>`
    : '';

  return `
    <div style="font-family:Segoe UI,Malgun Gothic,sans-serif;font-size:14px;color:#111827;line-height:1.55;max-width:640px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:0.02em;">한국어</p>
      <p style="margin:0 0 4px;font-weight:700;">${escapeHtml(content.titleKo)}</p>
      ${bodyKo}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6b7280;letter-spacing:0.02em;">English</p>
      <p style="margin:0 0 4px;font-weight:700;">${escapeHtml(content.titleEn)}</p>
      ${bodyEn}
      ${linkHtml}
      <p style="margin-top:20px;font-size:12px;color:#9ca3af;">${escapeHtml(footerKo)} / ${escapeHtml(footerEn)}</p>
    </div>
  `.trim();
}
