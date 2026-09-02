import {
  DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
  DOCUMENT_PDF_FIT_ONE_PAGE_ITEM_THRESHOLD,
  DOCUMENT_PDF_MARGINS_MM,
  downloadDocumentPdf,
  documentPdfToBase64,
  ensurePdfExtension,
  sanitizeFilenamePart,
} from './pdf';

/** 이 개수 미만이면 가급적 1페이지에 맞춤(축소). 이상이면 필요 시 여러 페이지 허용 */
const FIT_ONE_PAGE_ITEM_THRESHOLD = DOCUMENT_PDF_FIT_ONE_PAGE_ITEM_THRESHOLD;

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 긴 주소를 대략 절반에서 두 줄로 나눔 (쉼표 우선) */
function formatAddressTwoLines(address: string): string {
  const cleaned = String(address || '')
    .replace(/\r\n/g, '\n')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned === '-') return cleaned;

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    return `${parts.slice(0, mid).join(', ')}\n${parts.slice(mid).join(', ')}`;
  }

  if (cleaned.length < 36) return cleaned;
  const mid = Math.floor(cleaned.length / 2);
  const spaceAfter = cleaned.indexOf(' ', mid);
  const spaceBefore = cleaned.lastIndexOf(' ', mid);
  const breakAt =
    spaceAfter >= 0 && (spaceBefore < 0 || spaceAfter - mid <= mid - spaceBefore)
      ? spaceAfter
      : spaceBefore;
  if (breakAt > 0) {
    return `${cleaned.slice(0, breakAt).trim()}\n${cleaned.slice(breakAt).trim()}`;
  }
  return cleaned;
}

export { formatAddressTwoLines };

/**
 * html2canvas 클론에서 입력 UI 제거 + PDF 전용 모던 레이아웃.
 */
/** 캡처 전용 오프스크린 복제본 표시 */
const PDF_CAPTURE_ROOT_ATTR = 'data-quotation-pdf-root';

function resolvePdfCaptureRoot(doc: Document): HTMLElement | null {
  return (doc.querySelector(`[${PDF_CAPTURE_ROOT_ATTR}]`) ||
    doc.querySelector(`[${DOCUMENT_PDF_CAPTURE_ROOT_ATTR}]`) ||
    doc.querySelector('.quotation-print-area')) as HTMLElement | null;
}

function sanitizeQuotationCloneForPdf(clonedDoc: Document): void {
  const area = resolvePdfCaptureRoot(clonedDoc);
  if (!area) return;

  // Tax type 입력 UI 등 화면 전용 영역만 숨김 (합계의 세금 행은 유지)
  area.querySelectorAll('.quotation-pdf-hide').forEach((el) => el.remove());

  // CUSTOMER INFO 라벨의 필수 표시(*) 제거
  area.querySelectorAll('.quotation-pdf-section-body .MuiTypography-caption').forEach((cap) => {
    const el = cap as HTMLElement;
    el.textContent = (el.textContent || '').replace(/\s*\*/g, '').trim();
  });

  const plainStyle =
    'color:#000000 !important;-webkit-text-fill-color:#000000 !important;font-size:8.55pt;line-height:1.15;padding:0;margin:0;white-space:pre-wrap;word-break:break-word;';

  const style = clonedDoc.createElement('style');
  style.textContent = `
    .quotation-print-area, .quotation-print-area * {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
      font-size: 8.55pt !important;
      line-height: 1.45 !important;
      box-sizing: border-box !important;
    }
    .quotation-print-area {
      font-size: 8.55pt !important;
      background: #ffffff !important;
      color: #000000 !important;
      padding-bottom: 8px !important;
    }
    .quotation-print-area .quotation-pdf-title,
    .quotation-print-area .quotation-pdf-title * {
      font-size: 14.25pt !important;
      font-weight: 700 !important;
      letter-spacing: 0.02em !important;
      margin: 0 0 6px 0 !important;
      padding: 0 !important;
      color: #000000 !important;
      line-height: 1.15 !important;
    }

    .quotation-print-area > fieldset,
    .quotation-print-area fieldset {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      background: transparent !important;
    }

    .quotation-print-area .quotation-pdf-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: stretch !important;
      margin: 0 0 12px 0 !important;
      padding: 0 0 10px 0 !important;
      gap: 18px !important;
      border-bottom: none !important;
    }
    .quotation-print-area .quotation-pdf-company {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      max-width: 58% !important;
      padding-right: 4px !important;
      align-self: stretch !important;
    }
    .quotation-print-area .quotation-pdf-header-right {
      flex: 0 0 320px !important;
      width: 320px !important;
      max-width: 320px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      align-self: stretch !important;
      text-align: right !important;
      overflow: hidden !important;
    }
    .quotation-print-area .quotation-pdf-header-right .quotation-pdf-title {
      margin: 0 !important;
    }
    .quotation-print-area .quotation-pdf-company img {
      max-height: 36px !important;
      margin-bottom: 4px !important;
    }
    .quotation-print-area .quotation-pdf-company .MuiTypography-caption {
      font-size: 7.84pt !important;
      line-height: 1.35 !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
    .quotation-print-area .quotation-pdf-company-address {
      white-space: pre-line !important;
      max-width: 340px !important;
      display: block !important;
      margin: 0 0 2px 0 !important;
      line-height: 1.35 !important;
      font-size: 7.84pt !important;
    }
    .quotation-print-area .quotation-pdf-company .MuiTypography-subtitle2 {
      font-size: 10.97pt !important;
      font-weight: 700 !important;
      margin: 0 0 3px 0 !important;
      line-height: 1.3 !important;
      color: #000000 !important;
    }

    .quotation-print-area .quotation-pdf-meta {
      border: 1px solid #000000 !important;
      border-radius: 0 !important;
      margin-top: 6px !important;
      min-width: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      flex: 1 1 auto !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      background: #fff !important;
    }
    .quotation-print-area .quotation-pdf-meta > * {
      border-color: #000000 !important;
      display: grid !important;
      grid-template-columns: var(--quotation-meta-cols, minmax(0, 1fr) minmax(0, 1fr)) !important;
      min-width: 0 !important;
    }
    .quotation-print-area .quotation-pdf-meta > * > * {
      min-width: 0 !important;
    }
    .quotation-print-area .quotation-pdf-meta > *:nth-child(1),
    .quotation-print-area .quotation-pdf-meta > *:nth-child(3) {
      background: #F0F0F0 !important;
    }
    .quotation-print-area .quotation-pdf-meta > *:nth-child(2),
    .quotation-print-area .quotation-pdf-meta > *:nth-child(4) {
      background: #ffffff !important;
      flex: 1 1 auto !important;
    }
    .quotation-print-area .quotation-pdf-meta [class*="MuiBox-root"] {
      padding: 3px 8px !important;
      text-align: center !important;
      justify-content: center !important;
    }
    .quotation-print-area .quotation-pdf-meta .MuiTypography-caption {
      font-size: 6.18pt !important;
      font-weight: 600 !important;
      letter-spacing: 0.05em !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      text-transform: none !important;
      text-align: center !important;
      width: 100% !important;
      display: block !important;
    }
    .quotation-print-area .quotation-pdf-meta .MuiTypography-body2 {
      font-size: 7.6pt !important;
      font-weight: 600 !important;
      line-height: 1.25 !important;
      text-align: center !important;
      width: 100% !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .quotation-print-area .quotation-pdf-signature {
      margin: 12px 0 8px 0 !important;
      padding: 8px 0 4px 0 !important;
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 24px !important;
      border-top: none !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }
    .quotation-print-area .quotation-pdf-sign-line {
      margin-top: 28px !important;
      margin-bottom: 4px !important;
      width: 160px !important;
      height: 28px !important;
      border-bottom: 1px solid #000000 !important;
    }

    /* —— 본문 섹션·아이템 표·합계만 스크린샷 패턴 (헤더/메타는 유지) —— */
    .quotation-print-area .quotation-pdf-section {
      border: none !important;
      border-radius: 0 !important;
      margin: 0 0 8px 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      background: transparent !important;
    }
    /* Customer info / Description of work 외곽 테두리 */
    .quotation-print-area .quotation-pdf-section-customer,
    .quotation-print-area .quotation-pdf-section-notes {
      border: 1px solid #000000 !important;
      overflow: hidden !important;
      background: #fff !important;
    }
    .quotation-print-area .quotation-pdf-section-title {
      background: #F0F0F0 !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 4px 8px !important;
      margin: 0 0 0 0 !important;
    }
    .quotation-print-area .quotation-pdf-section-title * {
      font-weight: 700 !important;
      font-size: 7.6pt !important;
      letter-spacing: 0.05em !important;
      text-transform: none !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      line-height: 1.3 !important;
    }
    .quotation-print-area .quotation-pdf-section-body {
      border: none !important;
      border-radius: 0 !important;
      padding: 6px 8px 8px 8px !important;
      margin: 0 !important;
      gap: 4px 12px !important;
      min-height: 0 !important;
      background: #fff !important;
    }
    .quotation-print-area .quotation-pdf-section-body .MuiTypography-caption {
      display: block !important;
      font-size: 6.65pt !important;
      font-weight: 600 !important;
      letter-spacing: 0.02em !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      margin: 0 0 1px 0 !important;
      line-height: 1.2 !important;
    }

    .quotation-print-area .quotation-pdf-totals-wrap {
      margin: 8px 0 0 0 !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) max-content !important;
      gap: 12px !important;
      align-items: stretch !important;
      width: 100% !important;
    }
    .quotation-print-area .quotation-pdf-totals {
      width: auto !important;
      min-width: 264px !important;
      max-width: none !important;
      border: 1px solid #000000 !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      background: #fff !important;
      margin: 0 !important;
      flex-shrink: 0 !important;
    }
    .quotation-print-area .quotation-pdf-totals > * {
      border-color: #000000 !important;
      border-left: none !important;
      border-right: none !important;
      border-top: none !important;
      border-bottom: none !important;
      padding: 4px 10px !important;
      background: #fff !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 8px !important;
    }
    .quotation-print-area .quotation-pdf-totals > * > *:last-child {
      text-align: right !important;
      margin-left: auto !important;
      white-space: nowrap !important;
    }
    .quotation-print-area .quotation-pdf-totals > *:not(:last-child) {
      border-bottom: 1px solid #E0E0E0 !important;
    }
    .quotation-print-area .quotation-pdf-totals > *:last-child {
      background: #F0F0F0 !important;
      border-top: 1px solid #000000 !important;
      border-bottom: none !important;
    }
    .quotation-print-area .quotation-pdf-totals .MuiTypography-body2 {
      font-size: 7.84pt !important;
      line-height: 1.35 !important;
      color: #000000 !important;
    }
    .quotation-print-area .quotation-pdf-totals .MuiTypography-subtitle2 {
      font-size: 8.36pt !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
      color: #000000 !important;
    }

    .quotation-print-area .quotation-pdf-bank {
      margin: 0 !important;
      width: 100% !important;
      max-width: none !important;
      border: 1px solid #000000 !important;
      border-radius: 0 !important;
      padding: 6px 8px !important;
      background: #fff !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: flex-start !important;
      text-align: left !important;
    }
    .quotation-print-area .quotation-pdf-bank .MuiTypography-subtitle2 {
      font-size: 8.36pt !important;
      font-weight: 700 !important;
      margin: 0 0 3px 0 !important;
      color: #000000 !important;
      text-align: left !important;
      width: 100% !important;
    }
    .quotation-print-area .quotation-pdf-bank .MuiTypography-caption {
      font-size: 7.84pt !important;
      line-height: 1.35 !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      display: block !important;
      text-align: left !important;
      width: 100% !important;
    }

    .quotation-print-area .quotation-pdf-signature .MuiTypography-caption {
      font-size: 8.62pt !important;
      line-height: 1.35 !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
    .quotation-print-area .quotation-pdf-signature img,
    .quotation-print-area .quotation-pdf-stamp {
      width: 3.5cm !important;
      max-width: 3.5cm !important;
      height: auto !important;
      max-height: 1.8cm !important;
      margin: 6px 0 4px 0 !important;
      object-fit: contain !important;
      display: block !important;
    }

    /* 아이템: 단일 박스 + 내부 리스트 */
    .quotation-print-area .quotation-pdf-item-boxes {
      border: 1px solid #000000 !important;
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      width: 100% !important;
    }
    .quotation-print-area .quotation-pdf-item-box-head {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 52px 70px minmax(100px, max-content) !important;
      background: #F0F0F0 !important;
      padding: 4px 8px !important;
      font-size: 6.65pt !important;
      font-weight: 700 !important;
      letter-spacing: 0.04em !important;
      color: #000000 !important;
      line-height: 1.25 !important;
      text-transform: none !important;
      border-bottom: 1px solid #000000 !important;
      box-sizing: border-box !important;
    }
    .quotation-print-area .quotation-pdf-item-box-head span:nth-child(2),
    .quotation-print-area .quotation-pdf-item-box-head span:nth-child(3),
    .quotation-print-area .quotation-pdf-item-box-head span:nth-child(4) {
      text-align: right !important;
    }
    .quotation-print-area .quotation-pdf-item-box-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 52px 70px minmax(100px, max-content) !important;
      align-items: center !important;
      padding: 4px 8px !important;
      min-height: 18px !important;
      font-size: 8.55pt !important;
      line-height: 1.25 !important;
      color: #000000 !important;
      border-bottom: none !important;
      box-sizing: border-box !important;
    }
    .quotation-print-area .quotation-pdf-item-box-row:last-child {
      border-bottom: none !important;
    }
    .quotation-print-area .quotation-pdf-item-box-desc {
      font-weight: 500 !important;
      min-width: 0 !important;
      word-break: break-word !important;
      padding-right: 8px !important;
    }
    .quotation-print-area .quotation-pdf-item-box-meta {
      white-space: nowrap !important;
      font-size: 8.08pt !important;
      color: #000000 !important;
      text-align: right !important;
    }
    .quotation-print-area .quotation-pdf-item-box-amount {
      white-space: nowrap !important;
      font-size: 8.08pt !important;
      color: #000000 !important;
      text-align: right !important;
    }
    .quotation-print-area table.quotation-itemized-costs-table {
      display: none !important;
    }
    .quotation-print-area .quotation-pdf-section > div {
      overflow: visible !important;
    }
    .quotation-print-area .quotation-pdf-notes-body {
      padding: 6px 8px !important;
      overflow: visible !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }
    .quotation-print-area .quotation-pdf-notes-body div {
      white-space: pre-wrap !important;
      word-break: break-word !important;
      overflow: visible !important;
      line-height: 1.4 !important;
    }

    .quotation-print-area * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  `;
  clonedDoc.head.appendChild(style);

  area.querySelectorAll('fieldset').forEach((fs) => {
    const el = fs as HTMLElement;
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('outline', 'none', 'important');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
  });

  area.querySelectorAll<HTMLElement>('.quotation-pdf-section').forEach((el) => {
    const framed =
      el.classList.contains('quotation-pdf-section-customer') ||
      el.classList.contains('quotation-pdf-section-notes');
    if (framed) {
      el.style.setProperty('border', '1px solid #000000', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('background', '#ffffff', 'important');
    } else {
      el.style.setProperty('border', 'none', 'important');
    }
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('margin-bottom', '10px', 'important');
  });
  area.querySelectorAll<HTMLElement>('.quotation-pdf-section-title').forEach((el) => {
    el.style.setProperty('background', '#F0F0F0', 'important');
    el.style.setProperty('border', 'none', 'important');
    el.style.setProperty('border-radius', '0', 'important');
  });
  area.querySelectorAll<HTMLElement>('.quotation-pdf-section-body').forEach((el) => {
    el.style.setProperty('border', 'none', 'important');
  });
  area.querySelectorAll<HTMLElement>('.quotation-pdf-totals').forEach((el) => {
    el.style.setProperty('border-color', '#000000', 'important');
    el.style.setProperty('border-radius', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('width', 'auto', 'important');
    el.style.setProperty('min-width', '264px', 'important');
    el.style.setProperty('max-width', 'none', 'important');
  });

  area.querySelectorAll<HTMLElement>('.quotation-pdf-totals-wrap').forEach((el) => {
    el.style.setProperty('display', 'grid', 'important');
    el.style.setProperty('grid-template-columns', 'minmax(0, 1fr) max-content', 'important');
    el.style.setProperty('gap', '12px', 'important');
    el.style.setProperty('align-items', 'stretch', 'important');
    el.style.setProperty('width', '100%', 'important');
    el.style.setProperty('margin', '8px 0 0 0', 'important');
  });
  area.querySelectorAll<HTMLElement>('.quotation-pdf-bank').forEach((el) => {
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('max-width', 'none', 'important');
    el.style.setProperty('display', 'flex', 'important');
    el.style.setProperty('flex-direction', 'column', 'important');
    el.style.setProperty('justify-content', 'center', 'important');
    el.style.setProperty('align-items', 'flex-start', 'important');
    el.style.setProperty('text-align', 'left', 'important');
    if (getComputedStyle(el).visibility === 'hidden') {
      el.style.setProperty('visibility', 'hidden', 'important');
    }
  });

  area.querySelectorAll('.quotation-pdf-company .MuiTypography-caption').forEach((cap) => {
    const t = (cap.textContent || '').trim().toLowerCase();
    if (t === 'company name') (cap as HTMLElement).style.display = 'none';
  });

  area.querySelectorAll('.quotation-pdf-company-address').forEach((el) => {
    const node = el as HTMLElement;
    const twoLine = formatAddressTwoLines(node.textContent || '');
    node.textContent = twoLine;
    node.style.setProperty('white-space', 'pre-line', 'important');
  });

  area.querySelectorAll('.MuiFormHelperText-root').forEach((el) => el.remove());
  area.querySelectorAll('button').forEach((el) => el.remove());
  area.querySelectorAll('.MuiIconButton-root').forEach((el) => el.remove());
  area.querySelectorAll('.MuiAlert-root').forEach((el) => el.remove());

  const itemized = area.querySelector('table.quotation-itemized-costs-table');
  if (itemized) {
    const section = itemized.closest('.quotation-pdf-section') as HTMLElement | null;
    const wrap = itemized.parentElement as HTMLElement | null;
    const rows: Array<{ desc: string; qty: string; unit: string; amount: string }> = [];

    itemized.querySelectorAll('tbody tr').forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll('td'));
      if (cells.length < 4) return;
      const cellText = (td: Element) => {
        const inp = td.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
        if (inp) return (inp.value ?? '').trim();
        return (td.textContent || '').replace(/\s+/g, ' ').trim();
      };
      rows.push({
        desc: cellText(cells[0]),
        qty: cellText(cells[1]),
        unit: cellText(cells[2]),
        amount: cellText(cells[3])
      });
    });

    if (wrap && rows.length) {
      const boxes = clonedDoc.createElement('div');
      boxes.className = 'quotation-pdf-item-boxes';
      const head = clonedDoc.createElement('div');
      head.className = 'quotation-pdf-item-box-head';
      head.innerHTML =
        '<span>Description</span><span>Qty</span><span>Unit</span><span>Amount</span>';
      boxes.appendChild(head);
      rows.forEach((row) => {
        const rowEl = clonedDoc.createElement('div');
        rowEl.className = 'quotation-pdf-item-box-row';
        rowEl.innerHTML = `
          <div class="quotation-pdf-item-box-desc">${escapeHtmlText(row.desc || '-')}</div>
          <div class="quotation-pdf-item-box-meta">${escapeHtmlText(row.qty || '0')}</div>
          <div class="quotation-pdf-item-box-meta">${escapeHtmlText(row.unit || '0')}</div>
          <div class="quotation-pdf-item-box-amount">${escapeHtmlText(row.amount || '-')}</div>
        `;
        boxes.appendChild(rowEl);
      });
      wrap.insertBefore(boxes, itemized);
      if (section) {
        section.style.setProperty('border', 'none', 'important');
        section.style.setProperty('padding', '0', 'important');
        section.style.setProperty('background', 'transparent', 'important');
      }
      if (wrap) {
        wrap.style.setProperty('border', 'none', 'important');
        wrap.style.setProperty('overflow', 'visible', 'important');
        wrap.style.setProperty('padding', '0', 'important');
        wrap.style.setProperty('margin', '0', 'important');
      }
      boxes.style.setProperty('border', '1px solid #000000', 'important');
      boxes.style.setProperty('overflow', 'hidden', 'important');
      boxes.style.setProperty('background', '#ffffff', 'important');
      boxes.style.setProperty('padding', '0', 'important');
      boxes.style.setProperty('width', '100%', 'important');
      boxes.style.setProperty('box-sizing', 'border-box', 'important');
    }
    itemized.remove();
  }

  area.querySelectorAll('.MuiFormControl-root').forEach((fc) => {
    if (fc.closest('.quotation-pdf-item-boxes')) return;
    const combobox = fc.querySelector('[role="combobox"]') as HTMLElement | null;
    const ta = fc.querySelector('textarea') as HTMLTextAreaElement | null;
    const inp = fc.querySelector('input:not([type="hidden"])') as HTMLInputElement | null;
    let val = '';
    // Autocomplete: role=combobox 가 <input> 이라 innerText는 비고 value에 표시명이 있다.
    // Select: role=combobox 가 <div> 라 보이는 텍스트는 innerText에 있다.
    if (combobox instanceof HTMLInputElement || combobox instanceof HTMLTextAreaElement) {
      val = combobox.value;
    } else if (combobox) {
      val = combobox.innerText?.trim() ?? combobox.textContent?.trim() ?? '';
    } else if (ta) val = ta.value;
    else if (inp) val = inp.value;
    else return;
    const div = clonedDoc.createElement('div');
    div.setAttribute('style', plainStyle);
    div.textContent = val;
    fc.innerHTML = '';
    fc.appendChild(div);
  });

  area.querySelectorAll('.quotation-pdf-notes-body').forEach((body) => {
    const el = body as HTMLElement;
    el.style.setProperty('min-height', '0', 'important');
    el.style.setProperty('overflow', 'visible', 'important');
    el.style.setProperty('white-space', 'pre-wrap', 'important');
  });

  area.querySelectorAll('.quotation-pdf-section-body').forEach((body) => {
    (body as HTMLElement).style.setProperty('min-height', '0', 'important');
  });

  // 주소·필드 변환 후 헤더 좌·우 높이 맞춤 (둘 중 큰 높이에 맞춤)
  const HEADER_META_GAP_PX = 6;
  area.querySelectorAll<HTMLElement>('.quotation-pdf-header').forEach((header) => {
    header.style.setProperty('display', 'flex', 'important');
    header.style.setProperty('align-items', 'stretch', 'important');
    header.style.setProperty('border-bottom', 'none', 'important');
    const company = header.querySelector('.quotation-pdf-company') as HTMLElement | null;
    const right = header.querySelector('.quotation-pdf-header-right') as HTMLElement | null;
    const meta = header.querySelector('.quotation-pdf-meta') as HTMLElement | null;
    const title = header.querySelector('.quotation-pdf-title') as HTMLElement | null;
    if (!company || !right || !meta) return;

    right.style.setProperty('display', 'flex', 'important');
    right.style.setProperty('flex-direction', 'column', 'important');
    right.style.setProperty('overflow', 'hidden', 'important');
    meta.style.setProperty('display', 'flex', 'important');
    meta.style.setProperty('flex-direction', 'column', 'important');
    meta.style.setProperty('flex', '1 1 auto', 'important');
    meta.style.setProperty('margin-top', `${HEADER_META_GAP_PX}px`, 'important');
    meta.style.setProperty('width', '100%', 'important');
    meta.style.setProperty('max-width', '100%', 'important');
    // 타이틀 하단 margin이 남으면 메타 박스가 헤더 구분선을 넘어감
    if (title) title.style.setProperty('margin', '0', 'important');

    // 고객명 길이에 맞춰 전 행 동일 칸 비율 (화면과 동일 규칙)
    const customerCell = meta.querySelectorAll('.MuiTypography-body2')[2] as HTMLElement | undefined;
    const customerLen = (customerCell?.textContent || '').trim().length;
    let metaCols = 'minmax(0, 1fr) minmax(0, 1fr)';
    if (customerLen > 44) metaCols = 'minmax(0, 1.75fr) minmax(0, 0.65fr)';
    else if (customerLen > 32) metaCols = 'minmax(0, 1.6fr) minmax(0, 0.7fr)';
    else if (customerLen > 22) metaCols = 'minmax(0, 1.4fr) minmax(0, 0.8fr)';
    else if (customerLen > 14) metaCols = 'minmax(0, 1.2fr) minmax(0, 0.9fr)';
    meta.style.setProperty('--quotation-meta-cols', metaCols);
    meta.querySelectorAll<HTMLElement>(':scope > *').forEach((row) => {
      row.style.setProperty('display', 'grid', 'important');
      row.style.setProperty('grid-template-columns', metaCols, 'important');
      row.style.setProperty('min-width', '0', 'important');
    });

    // 자연 높이 측정을 위해 stretch 해제
    company.style.setProperty('align-self', 'flex-start', 'important');
    right.style.setProperty('align-self', 'flex-start', 'important');
    right.style.setProperty('height', 'auto', 'important');
    meta.style.setProperty('height', 'auto', 'important');

    const leftH = company.getBoundingClientRect().height;
    const rightH = right.getBoundingClientRect().height;
    const titleH = title ? title.getBoundingClientRect().height : 0;
    const target = Math.ceil(Math.max(leftH, rightH));

    company.style.setProperty('align-self', 'stretch', 'important');
    right.style.setProperty('align-self', 'stretch', 'important');
    if (target > 0) {
      company.style.setProperty('min-height', `${target}px`, 'important');
      right.style.setProperty('height', `${target}px`, 'important');
      meta.style.setProperty(
        'height',
        `${Math.max(60, target - Math.ceil(titleH) - HEADER_META_GAP_PX)}px`,
        'important'
      );
    }
  });

  // 텍스트 완전 검정
  area.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.setProperty('color', '#000000', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
  });
  area.querySelectorAll<HTMLElement>('.quotation-pdf-stamp, .quotation-pdf-signature img').forEach((el) => {
    el.style.setProperty('width', '3.5cm', 'important');
    el.style.setProperty('max-width', '3.5cm', 'important');
    el.style.setProperty('height', 'auto', 'important');
    el.style.setProperty('max-height', '1.8cm', 'important');
    el.style.setProperty('object-fit', 'contain', 'important');
  });
  area.querySelectorAll<HTMLElement>('.quotation-pdf-signature').forEach((el) => {
    el.style.setProperty('width', '100%', 'important');
    el.style.setProperty('height', 'auto', 'important');
    el.style.setProperty('display', 'grid', 'important');
    el.style.setProperty('grid-template-columns', '1fr 1fr', 'important');
    el.style.setProperty('border-bottom', 'none', 'important');
  });
}

function countItemizedRows(element: HTMLElement): number {
  const rows = element.querySelectorAll('.quotation-pdf-item-box-row');
  if (rows.length) return rows.length;
  const boxes = element.querySelectorAll('.quotation-pdf-item-box');
  if (boxes.length) return boxes.length;
  const table = element.querySelector('table.quotation-itemized-costs-table');
  if (!table) return 0;
  return table.querySelectorAll('tbody tr').length;
}

/**
 * 견적서 DOM 영역을 캡처해 A4 PDF로 저장합니다. (승인 후 저장 등)
 * 문서 PDF 표준 파이프라인(downloadDocumentPdf) 사용.
 */
export async function downloadQuotationPdf(element: HTMLElement, filename: string): Promise<void> {
  const itemCount = countItemizedRows(element);
  await downloadDocumentPdf({
    element,
    filename: ensurePdfExtension(filename),
    margins: DOCUMENT_PDF_MARGINS_MM,
    purpose: 'download',
    itemCount,
    fitOnePageItemThreshold: FIT_ONE_PAGE_ITEM_THRESHOLD,
    captureRootAttr: DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
    onClone: (clonedDoc) => {
      const area = resolvePdfCaptureRoot(clonedDoc);
      if (area) {
        const fs = area.querySelector('fieldset');
        if (fs) fs.removeAttribute('disabled');
      }
      sanitizeQuotationCloneForPdf(clonedDoc);
    },
  });
}

/** 메일 첨부용 — 용량을 줄인 PDF를 base64(순수 페이로드)로 반환 (Gmail 등 메일 크기 제한 대응) */
export async function quotationPdfToBase64(element: HTMLElement): Promise<string> {
  const itemCount = countItemizedRows(element);
  return documentPdfToBase64({
    element,
    margins: DOCUMENT_PDF_MARGINS_MM,
    purpose: 'email',
    itemCount,
    fitOnePageItemThreshold: FIT_ONE_PAGE_ITEM_THRESHOLD,
    captureRootAttr: DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
    onClone: (clonedDoc) => {
      const area = resolvePdfCaptureRoot(clonedDoc);
      if (area) {
        const fs = area.querySelector('fieldset');
        if (fs) fs.removeAttribute('disabled');
      }
      sanitizeQuotationCloneForPdf(clonedDoc);
    },
  });
}

function sanitizePdfFilenamePart(value: string, maxLen = 80): string {
  return sanitizeFilenamePart(String(value || ''), { fallback: '', maxLength: maxLen });
}

const PDF_FILENAME_DETAIL_MAX = 15;

function buildFilenameDetailFromItems(
  items?: Array<{ productName?: string | null; description?: string | null }> | null
): string {
  if (!items?.length) return '';
  const parts = items
    .map((it) => String(it.productName || it.description || '').trim())
    .filter(Boolean);
  if (!parts.length) return '';
  return sanitizePdfFilenamePart(parts.join(', '), PDF_FILENAME_DETAIL_MAX);
}

/**
 * 예: 20260816_Quot (Test Corporation) (computer, mou).pdf
 * 설명(detail)은 품목명으로 구성하며 최대 15자.
 */
export function buildQuotationPdfFilename(opts: {
  companyName?: string | null;
  items?: Array<{ productName?: string | null; description?: string | null }> | null;
  /** @deprecated 품목 기반 detail 우선. 없을 때만 사용 */
  detail?: string | null;
  quotationNumber?: string | null;
  date?: Date;
}): string {
  const d = opts.date ?? new Date();
  const yyyymmdd = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('');
  const company = sanitizePdfFilenamePart(opts.companyName || '') || 'Customer';
  const detail =
    buildFilenameDetailFromItems(opts.items) ||
    sanitizePdfFilenamePart(opts.detail || '', PDF_FILENAME_DETAIL_MAX) ||
    sanitizePdfFilenamePart(opts.quotationNumber || '', PDF_FILENAME_DETAIL_MAX) ||
    'Quotation';
  return `${yyyymmdd}_Quot (${company}) (${detail}).pdf`;
}
