import {
  DOCUMENT_PDF_BASE_TYPOGRAPHY_CSS,
  DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
  DOCUMENT_PDF_MARGINS_MM,
  downloadDocumentPdf,
  ensurePdfExtension,
  resolveCaptureRoot,
  sanitizeFilenamePart,
} from './pdf';

/** @deprecated 표준 여백은 DOCUMENT_PDF_MARGINS_MM */
export const EXPENSE_PDF_MARGINS_MM = DOCUMENT_PDF_MARGINS_MM;

/**
 * 지출결의서 PDF 스타일 — 견적서 PDF 표준 타이포(Segoe UI 8.55pt / 검정)
 */
export const EXPENSE_DOCUMENT_EXPORT_CSS = `
  .expense-pdf-root,
  .expense-pdf-root * {
    ${DOCUMENT_PDF_BASE_TYPOGRAPHY_CSS}
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .expense-pdf-root {
    background: #ffffff !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 4px 2px 8px 2px !important;
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
  .expense-pdf-root .MuiAlert-root {
    display: none !important;
  }
  .expense-pdf-root .MuiChip-root {
    height: auto !important;
    border-radius: 0 !important;
    border: 1px solid #000000 !important;
    background: #F0F0F0 !important;
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 8.55pt !important;
  }
  .expense-pdf-root .MuiChip-label {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 8.55pt !important;
    font-weight: 600 !important;
    padding: 2px 8px !important;
  }
  .expense-pdf-root .MuiChip-icon {
    display: none !important;
  }
  .expense-pdf-root table,
  .expense-pdf-root .MuiTable-root {
    border-collapse: collapse !important;
  }
  .expense-pdf-root .MuiTableCell-root {
    border-color: #E0E0E0 !important;
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 8.55pt !important;
    line-height: 1.45 !important;
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }
  .expense-pdf-root [class*="MuiTypography"],
  .expense-pdf-root .MuiTypography-root {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 8.55pt !important;
  }
  .expense-pdf-root .MuiTypography-subtitle2 {
    font-size: 8.55pt !important;
    font-weight: 700 !important;
  }
  .expense-pdf-root .MuiOutlinedInput-notchedOutline {
    border: none !important;
  }
  .expense-pdf-root .MuiInputBase-root,
  .expense-pdf-root .MuiInputBase-input {
    color: #000000 !important;
    -webkit-text-fill-color: #000000 !important;
    font-size: 8.55pt !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .expense-pdf-root .MuiCardContent-root {
    padding-left: 0 !important;
    padding-right: 0 !important;
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
      'display:block;width:100%;text-align:center;font-size:8.55pt;font-weight:600;line-height:1.3;color:#000000;'
    );
    el.replaceWith(span);
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
  const lineCount = element.querySelectorAll('table tbody tr').length;
  await downloadDocumentPdf({
    element,
    filename,
    margins: DOCUMENT_PDF_MARGINS_MM,
    purpose: 'download',
    itemCount: lineCount,
    captureRootAttr: DOCUMENT_PDF_CAPTURE_ROOT_ATTR,
    onClone: sanitizeExpenseCloneForPdf,
  });
}

export function buildExpenseApprovalPdfFilename(
  voucherNo?: string | null,
  title?: string | null
): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const no = sanitizeFilenamePart(String(voucherNo || 'expense'), {
    fallback: 'expense',
    maxLength: 40,
  });
  const name = sanitizeFilenamePart(String(title || ''), { fallback: '', maxLength: 40 });
  const detail = name || no;
  return ensurePdfExtension(`${ymd}_Expense (${no}) (${detail})`);
}
