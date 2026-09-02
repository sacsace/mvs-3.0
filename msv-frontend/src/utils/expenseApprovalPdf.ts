import {
  DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
  DOCUMENT_PDF_MARGINS_MM,
  buildDocumentDownloadFilename,
  downloadDocumentPdf,
  resolveCaptureRoot,
} from './pdf';

/** @deprecated 표준 여백은 DOCUMENT_PDF_MARGINS_MM */
export const EXPENSE_PDF_MARGINS_MM = DOCUMENT_PDF_MARGINS_MM;

/**
 * 지출결의서 PDF — 9pt / 조밀 레이아웃 / 한 페이지 기준
 */
export const EXPENSE_DOCUMENT_EXPORT_CSS = `
  .expense-pdf-root,
  .expense-pdf-root * {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif !important;
    font-size: 9pt !important;
    line-height: 1.25 !important;
    box-sizing: border-box !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .expense-pdf-root {
    background: #ffffff !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .expense-pdf-hide,
  .expense-no-print {
    display: none !important;
  }
  .expense-pdf-root .MuiButton-root,
  .expense-pdf-root .MuiIconButton-root,
  .expense-pdf-root .MuiAutocomplete-endAdornment,
  .expense-pdf-root .MuiAutocomplete-popupIndicator,
  .expense-pdf-root .MuiAutocomplete-clearIndicator,
  .expense-pdf-root button,
  .expense-pdf-root .MuiFormHelperText-root,
  .expense-pdf-root .MuiAlert-root,
  .expense-pdf-root .MuiSvgIcon-root {
    display: none !important;
  }
  .expense-pdf-root .MuiCardContent-root {
    padding: 4px 0 0 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
  }
  .expense-pdf-root img {
    max-height: 28px !important;
    max-width: 120px !important;
    width: auto !important;
    height: auto !important;
    object-fit: contain !important;
  }
  .expense-pdf-root .expense-flow-stamp {
    width: 108px !important;
    min-width: 108px !important;
    max-width: 108px !important;
  }
  .expense-pdf-root .expense-flow-stamp-wrap {
    width: 120px !important;
    height: auto !important;
    min-height: 0 !important;
    gap: 2px !important;
  }
  .expense-pdf-root .expense-flow-stamp > div:last-child {
    min-height: 26px !important;
    height: auto !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
  }
  .expense-pdf-root .expense-flow-stamp > * {
    padding-top: 1px !important;
    padding-bottom: 1px !important;
  }
  .expense-pdf-root .MuiChip-root {
    height: auto !important;
    min-height: 0 !important;
    border-radius: 0 !important;
    border: 1px solid #000000 !important;
    background: #F0F0F0 !important;
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 8pt !important;
    margin: 0 !important;
  }
  .expense-pdf-root .MuiChip-label {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 8pt !important;
    font-weight: 600 !important;
    padding: 1px 5px !important;
    line-height: 1.2 !important;
  }
  .expense-pdf-root .MuiChip-icon {
    display: none !important;
  }
  .expense-pdf-root table,
  .expense-pdf-root .MuiTable-root {
    border-collapse: collapse !important;
    width: 100% !important;
  }
  .expense-pdf-root .MuiTableCell-root {
    border-color: #CFCFCF !important;
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 9pt !important;
    line-height: 1.2 !important;
    padding: 2px 5px !important;
    height: auto !important;
    min-height: 0 !important;
    vertical-align: middle !important;
  }
  .expense-pdf-root .MuiTableHead-root .MuiTableCell-root {
    font-size: 8.5pt !important;
    font-weight: 700 !important;
    padding-top: 3px !important;
    padding-bottom: 3px !important;
  }
  .expense-pdf-root .MuiTableRow-root {
    height: auto !important;
  }
  .expense-pdf-root [class*="MuiTypography"],
  .expense-pdf-root .MuiTypography-root {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 9pt !important;
    line-height: 1.25 !important;
    margin: 0 !important;
  }
  .expense-pdf-root .MuiTypography-subtitle2 {
    font-size: 9pt !important;
    font-weight: 700 !important;
    margin-bottom: 2px !important;
  }
  .expense-pdf-root .MuiTypography-caption {
    font-size: 8pt !important;
  }
  .expense-pdf-root .MuiOutlinedInput-notchedOutline {
    border: none !important;
  }
  .expense-pdf-root .MuiInputBase-root,
  .expense-pdf-root .MuiInputBase-input {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 9pt !important;
    padding: 0 !important;
    margin: 0 !important;
    min-height: 0 !important;
    height: auto !important;
  }
  .expense-pdf-attachments {
    margin: 0 !important;
    padding: 0 0 0 14px !important;
    list-style: disc !important;
  }
  .expense-pdf-attachments li {
    font-size: 8.5pt !important;
    line-height: 1.25 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`;

function injectExportCss(doc: Document, cssText: string): void {
  const style = doc.createElement('style');
  style.textContent = cssText;
  doc.head.appendChild(style);
}

function replaceAutocompleteWithPlainText(root: HTMLElement, doc: Document): void {
  root.querySelectorAll('.MuiAutocomplete-root').forEach((el) => {
    const input = el.querySelector('input') as HTMLInputElement | null;
    const text = (input?.value || '').trim() || '-';
    const span = doc.createElement('span');
    span.textContent = text;
    span.setAttribute(
      'style',
      'display:block;width:100%;text-align:center;font-size:9pt;font-weight:600;line-height:1.2;color:#000000;'
    );
    el.replaceWith(span);
  });
}

/** 썸네일 그리드를 파일명 목록으로 바꿔 세로 공간 절약 */
function compactAttachmentGrids(root: HTMLElement, doc: Document): void {
  const thumbs = Array.from(root.querySelectorAll('.receipt-thumb'));
  if (thumbs.length === 0) return;

  const processed = new Set<HTMLElement>();

  thumbs.forEach((thumb) => {
    const item = (thumb.closest('button') as HTMLElement | null) || (thumb.parentElement as HTMLElement | null);
    const grid = item?.parentElement as HTMLElement | null;
    if (!grid || processed.has(grid) || grid.getAttribute('data-expense-pdf-attachments') === '1') {
      return;
    }

    const names: string[] = [];
    grid.querySelectorAll('.receipt-thumb').forEach((node) => {
      const row = (node.closest('button') as HTMLElement | null) || (node.parentElement as HTMLElement | null);
      const caption =
        row?.querySelector('.MuiTypography-root, span, p')?.textContent?.trim() ||
        (node as HTMLElement).getAttribute('alt') ||
        '';
      if (caption) names.push(caption);
    });
    if (names.length === 0) return;

    processed.add(grid);
    const list = doc.createElement('ul');
    list.className = 'expense-pdf-attachments';
    list.setAttribute('data-expense-pdf-attachments', '1');
    names.forEach((name) => {
      const li = doc.createElement('li');
      li.textContent = name;
      list.appendChild(li);
    });
    grid.replaceWith(list);
  });
}

function forceBlackText(root: HTMLElement): void {
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (!el.style) return;
    el.style.setProperty('color', '#000000', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
  });
}

export function sanitizeExpenseCloneForPdf(clonedDoc: Document): void {
  const root =
    resolveCaptureRoot(clonedDoc, {
      captureRootAttr: DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
      liveRootSelector: '.expense-pdf-root',
    }) || (clonedDoc.querySelector('.expense-pdf-root') as HTMLElement | null);
  if (!root) return;

  root.querySelectorAll('.expense-pdf-hide, .expense-no-print').forEach((node) => {
    node.remove();
  });
  compactAttachmentGrids(root, clonedDoc);
  root.querySelectorAll('.MuiButton-root, .MuiIconButton-root, button').forEach((node) => {
    node.remove();
  });
  replaceAutocompleteWithPlainText(root, clonedDoc);
  injectExportCss(clonedDoc, EXPENSE_DOCUMENT_EXPORT_CSS);
  forceBlackText(root);
}

export async function downloadExpenseApprovalPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  await downloadDocumentPdf({
    element,
    filename,
    margins: DOCUMENT_PDF_MARGINS_MM,
    purpose: 'download',
    forceFitOnePage: true,
    captureRootAttr: DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
    onClone: sanitizeExpenseCloneForPdf,
  });
}

export function buildExpenseApprovalPdfFilename(opts: {
  companyName?: string | null;
  detail?: string | null;
  /** @deprecated detail 없을 때 보조 */
  voucherNo?: string | null;
  title?: string | null;
  date?: Date | string | null;
}): string {
  return buildDocumentDownloadFilename({
    code: 'PV',
    companyName: opts.companyName,
    detail: opts.detail || opts.title || opts.voucherNo,
    date: opts.date,
  });
}
